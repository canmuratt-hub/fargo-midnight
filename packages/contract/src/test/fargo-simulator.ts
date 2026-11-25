// SPDX-License-Identifier: Apache-2.0

import {
  type ChargedState,
  type CircuitContext,
  type EncodedZswapLocalState,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  type MerchantPolicy,
  type OrderAttestation,
  OrderStatus,
  type Witnesses,
  ledger,
  pureCircuits,
} from "../managed/fargo/contract/index.js";
import {
  type FargoPrivateState,
  createFargoPrivateState,
  fargoWitnesses,
} from "../witnesses.js";

export { OrderStatus, pureCircuits, type Ledger, type MerchantPolicy, type OrderAttestation };

export function idFromLabel(label: string): Uint8Array {
  const encoded = new TextEncoder().encode(label);
  const out = new Uint8Array(32);
  out.set(encoded.slice(0, 32));
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface ActorSession {
  privateState: FargoPrivateState;
  zswapState: EncodedZswapLocalState;
}

/**
 * Multi-party Midnight Dual-Ledger simulator for FARGO.
 * Maintains isolated private states (witnesses + Zswap local state) per actor
 * while sharing the public on-chain ChargedState ledger.
 */
export class FargoSimulator {
  private readonly contract: Contract<FargoPrivateState>;
  private readonly actors = new Map<string, ActorSession>();
  private sharedLedgerState: ChargedState;
  public readonly contractAddress = sampleContractAddress();

  constructor() {
    this.contract = new Contract<FargoPrivateState>(
      fargoWitnesses as unknown as Witnesses<FargoPrivateState>,
    );
    const bootstrapPs = createFargoPrivateState({
      secretKey: new Uint8Array(32).fill(0x01),
    });
    const init = this.contract.initialState(
      createConstructorContext(bootstrapPs, "0".repeat(64)),
    );
    this.sharedLedgerState = init.currentContractState.data;
  }

  public upsertActor(actorName: string, state: FargoPrivateState): void {
    const existing = this.actors.get(actorName);
    if (existing) {
      this.actors.set(actorName, {
        ...existing,
        privateState: state,
      });
      return;
    }
    const init = this.contract.initialState(
      createConstructorContext(state, "0".repeat(64)),
    );
    this.actors.set(actorName, {
      privateState: state,
      zswapState: init.currentZswapLocalState,
    });
  }

  public getActorPrivateState(actorName: string): FargoPrivateState {
    const actor = this.actors.get(actorName);
    if (!actor) {
      throw new Error(`Actor "${actorName}" is not registered in simulator`);
    }
    return actor.privateState;
  }

  private buildCtx(actorName: string): CircuitContext<FargoPrivateState> {
    const actor = this.actors.get(actorName);
    if (!actor) {
      throw new Error(`Actor "${actorName}" is not registered in simulator`);
    }
    return createCircuitContext(
      this.contractAddress,
      actor.zswapState,
      this.sharedLedgerState,
      actor.privateState,
    );
  }

  private applyResult<T>(
    actorName: string,
    res: {
      result: T;
      context: {
        currentPrivateState: FargoPrivateState;
        currentZswapLocalState: EncodedZswapLocalState;
        currentQueryContext: { state: ChargedState };
      };
    },
  ): T {
    this.actors.set(actorName, {
      privateState: res.context.currentPrivateState,
      zswapState: res.context.currentZswapLocalState,
    });
    this.sharedLedgerState = res.context.currentQueryContext.state;
    return res.result;
  }

  public getLedger(): Ledger {
    return ledger(this.sharedLedgerState);
  }

  public registerMerchantPolicy(
    actorName: string,
    merchantId: Uint8Array,
    minAge: number | bigint,
    requiredKycTier: number | bigint,
    minCreditLimit: number | bigint,
  ): Ledger {
    const ctx = this.buildCtx(actorName);
    const res = this.contract.impureCircuits.register_merchant_policy(
      ctx,
      merchantId,
      BigInt(minAge),
      BigInt(requiredKycTier),
      BigInt(minCreditLimit),
    );
    this.applyResult(actorName, res);
    return this.getLedger();
  }

  public deactivateMerchantPolicy(
    actorName: string,
    merchantId: Uint8Array,
  ): Ledger {
    const ctx = this.buildCtx(actorName);
    const res = this.contract.impureCircuits.deactivate_merchant_policy(
      ctx,
      merchantId,
    );
    this.applyResult(actorName, res);
    return this.getLedger();
  }

  public verifyCommerceOrder(
    buyerActorName: string,
    merchantId: Uint8Array,
    orderId: Uint8Array,
  ): { commitment: Uint8Array; ledger: Ledger } {
    const ctx = this.buildCtx(buyerActorName);
    const res = this.contract.impureCircuits.verify_commerce_order(
      ctx,
      merchantId,
      orderId,
    );
    const commitment = this.applyResult(buyerActorName, res);
    return { commitment, ledger: this.getLedger() };
  }

  public settleVerifiedOrder(
    merchantActorName: string,
    orderId: Uint8Array,
  ): Ledger {
    const ctx = this.buildCtx(merchantActorName);
    const res = this.contract.impureCircuits.settle_verified_order(
      ctx,
      orderId,
    );
    this.applyResult(merchantActorName, res);
    return this.getLedger();
  }
}
