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

const DEFAULT_BANK_ISSUER_SK = new Uint8Array(32).fill(0xfe);

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
  public static readonly DEFAULT_ISSUER_ACTOR = "__defaultBankAuthority";

  constructor(registerDefaultBankIssuer = true) {
    this.contract = new Contract<FargoPrivateState>(
      fargoWitnesses as unknown as Witnesses<FargoPrivateState>,
    );
    const bootstrapPs = createFargoPrivateState({
      secretKey: DEFAULT_BANK_ISSUER_SK,
    });
    const init = this.contract.initialState(
      createConstructorContext(bootstrapPs, "0".repeat(64)),
    );
    this.sharedLedgerState = init.currentContractState.data;

    if (registerDefaultBankIssuer) {
      this.upsertActor(FargoSimulator.DEFAULT_ISSUER_ACTOR, bootstrapPs, {
        autoSealCredential: false,
      });
      this.registerTrustedIssuer(FargoSimulator.DEFAULT_ISSUER_ACTOR);
    }
  }

  public upsertActor(
    actorName: string,
    state: FargoPrivateState,
    options: { autoSealCredential?: boolean } = {},
  ): void {
    const existing = this.actors.get(actorName);
    if (existing) {
      this.actors.set(actorName, {
        ...existing,
        privateState: state,
      });
    } else {
      const init = this.contract.initialState(
        createConstructorContext(state, "0".repeat(64)),
      );
      this.actors.set(actorName, {
        privateState: state,
        zswapState: init.currentZswapLocalState,
      });
    }

    if (options.autoSealCredential !== false && actorName !== FargoSimulator.DEFAULT_ISSUER_ACTOR) {
      const buyerPk = pureCircuits.derive_public_key(state.secretKey);
      const seal = pureCircuits.compute_credential_seal(
        buyerPk,
        state.buyerAge,
        state.kycTier,
        state.creditLimit,
        state.credentialSalt,
      );
      this.issueBuyerCredential(FargoSimulator.DEFAULT_ISSUER_ACTOR, seal);
    }
  }

  /**
   * Simulates a malicious buyer modifying their local private state in memory
   * WITHOUT obtaining a matching Bank / KYC Issuer seal on-chain.
   */
  public tamperActorPrivateState(
    actorName: string,
    overrides: Partial<
      Pick<
        FargoPrivateState,
        "buyerAge" | "kycTier" | "creditLimit" | "orderAmount"
      >
    >,
  ): void {
    const existing = this.actors.get(actorName);
    if (!existing) {
      throw new Error(`Actor "${actorName}" is not registered`);
    }
    this.actors.set(actorName, {
      ...existing,
      privateState: {
        ...existing.privateState,
        ...overrides,
      },
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

  public registerTrustedIssuer(issuerActorName: string): Uint8Array {
    const ctx = this.buildCtx(issuerActorName);
    const res = this.contract.impureCircuits.register_trusted_issuer(ctx);
    return this.applyResult(issuerActorName, res);
  }

  public issueBuyerCredential(
    issuerActorName: string,
    credentialSeal: Uint8Array,
  ): Ledger {
    const ctx = this.buildCtx(issuerActorName);
    const res = this.contract.impureCircuits.issue_buyer_credential(
      ctx,
      credentialSeal,
    );
    this.applyResult(issuerActorName, res);
    return this.getLedger();
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
