// SPDX-License-Identifier: Apache-2.0

import {
  FargoContract,
  type FargoPrivateState,
  type VerifiedOrderReceipt,
  createFargoPrivateState,
  fargoWitnesses,
} from "@fargo/contract";
import {
  type ChargedState,
  type CircuitContext,
  type EncodedZswapLocalState,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";

export type KycTierLevel = 0 | 1 | 2;

export interface MerchantPolicyInput {
  readonly merchantSecretKey: Uint8Array;
  readonly merchantSlug: string;
  readonly displayName?: string;
  readonly minAge: number;
  readonly requiredKycTier: KycTierLevel;
  readonly minCreditLimit: number | bigint;
}

export interface CheckoutVerificationRequest {
  readonly buyerSecretKey: Uint8Array;
  readonly merchantSlug: string;
  readonly orderNumber: string;
  readonly buyerAge: number;
  readonly kycTier: KycTierLevel;
  readonly creditLimit: number | bigint;
  readonly orderAmount: number | bigint;
  readonly orderSalt?: Uint8Array;
}

export interface PublicPolicyView {
  readonly merchantSlug: string;
  readonly merchantIdHex: string;
  readonly ownerPublicKeyHex: string;
  readonly displayName: string;
  readonly minAge: number;
  readonly requiredKycTier: number;
  readonly minCreditLimit: bigint;
  readonly active: boolean;
}

export interface PublicAttestationView {
  readonly orderNumber: string;
  readonly orderIdHex: string;
  readonly merchantSlug: string;
  readonly merchantIdHex: string;
  readonly buyerPseudonymHex: string;
  readonly commitmentHex: string;
  readonly nullifierHex: string;
  readonly status: "unverified" | "verified" | "settled" | "revoked";
  readonly verifiedAtIso: string;
}

export interface DualLedgerSnapshot {
  readonly contractAddress: string;
  readonly totalMerchants: number;
  readonly totalVerifiedOrders: number;
  readonly totalSettledOrders: number;
  readonly activeNullifierCount: number;
  readonly policies: readonly PublicPolicyView[];
  readonly attestations: readonly PublicAttestationView[];
}

export interface FargoVerificationOutcome {
  readonly verified: boolean;
  readonly orderNumber: string;
  readonly orderIdHex: string;
  readonly merchantSlug: string;
  readonly commitmentHex?: string;
  readonly nullifierHex?: string;
  readonly buyerPseudonymHex?: string;
  readonly executionTimeMs: number;
  readonly errorMessage?: string;
  readonly privateDataKeptOffChain: {
    readonly exactAgeHidden: true;
    readonly identityDocumentHidden: true;
    readonly creditFacilityHidden: true;
    readonly invoiceAmountHidden: true;
  };
}

export function encodeIdentifier32(value: string): Uint8Array {
  const raw = new TextEncoder().encode(value.trim());
  const padded = new Uint8Array(32);
  padded.set(raw.slice(0, 32));
  return padded;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function deriveSecretKeyFromSeed(seedPhrase: string): Uint8Array {
  const seedBytes = encodeIdentifier32(`seed:${seedPhrase}`);
  return FargoContract.pureCircuits.derive_public_key(seedBytes);
}

function mapStatusLabel(
  status: FargoContract.OrderStatus,
): PublicAttestationView["status"] {
  switch (status) {
    case FargoContract.OrderStatus.verified:
      return "verified";
    case FargoContract.OrderStatus.settled:
      return "settled";
    case FargoContract.OrderStatus.revoked:
      return "revoked";
    default:
      return "unverified";
  }
}

interface InternalSession {
  privateState: FargoPrivateState;
  zswapState: EncodedZswapLocalState;
}

/**
 * FARGO Commerce Client — Drop-in Privacy & Verification Layer powered by Midnight Compact.
 * Connects e-commerce checkouts and B2B portals to the compiled FARGO zero-knowledge contract.
 */
export class FargoCommerceClient {
  private readonly contract: FargoContract.Contract<FargoPrivateState>;
  private sharedState: ChargedState;
  private readonly sessions = new Map<string, InternalSession>();
  private readonly merchantLabels = new Map<
    string,
    { slug: string; displayName: string }
  >();
  private readonly orderLabels = new Map<
    string,
    { orderNumber: string; merchantSlug: string; timestampIso: string }
  >();
  public readonly contractAddress = sampleContractAddress();

  constructor() {
    this.contract = new FargoContract.Contract<FargoPrivateState>(
      fargoWitnesses as unknown as FargoContract.Witnesses<FargoPrivateState>,
    );
    const bootstrapState = createFargoPrivateState({
      secretKey: new Uint8Array(32).fill(0x07),
    });
    const init = this.contract.initialState(
      createConstructorContext(bootstrapState, "0".repeat(64)),
    );
    this.sharedState = init.currentContractState.data;
  }

  private getOrCreateSession(
    actorKeyHex: string,
    nextPrivateState: FargoPrivateState,
  ): CircuitContext<FargoPrivateState> {
    const existing = this.sessions.get(actorKeyHex);
    const mergedState: FargoPrivateState = existing
      ? {
          ...nextPrivateState,
          receipts: existing.privateState.receipts,
        }
      : nextPrivateState;

    const zswapState = existing
      ? existing.zswapState
      : this.contract.initialState(
          createConstructorContext(mergedState, "0".repeat(64)),
        ).currentZswapLocalState;

    return createCircuitContext(
      this.contractAddress,
      zswapState,
      this.sharedState,
      mergedState,
    );
  }

  private commitSession(
    actorKeyHex: string,
    context: {
      currentPrivateState: FargoPrivateState;
      currentZswapLocalState: EncodedZswapLocalState;
      currentQueryContext: { state: ChargedState };
    },
  ): void {
    this.sessions.set(actorKeyHex, {
      privateState: context.currentPrivateState,
      zswapState: context.currentZswapLocalState,
    });
    this.sharedState = context.currentQueryContext.state;
  }

  public registerOrUpdatePolicy(input: MerchantPolicyInput): PublicPolicyView {
    const merchantId = encodeIdentifier32(input.merchantSlug);
    const merchantIdHex = toHex(merchantId);
    const actorHex = toHex(input.merchantSecretKey);

    const ps = createFargoPrivateState({ secretKey: input.merchantSecretKey });
    const ctx = this.getOrCreateSession(actorHex, ps);

    const res = this.contract.impureCircuits.register_merchant_policy(
      ctx,
      merchantId,
      BigInt(input.minAge),
      BigInt(input.requiredKycTier),
      BigInt(input.minCreditLimit),
    );
    this.commitSession(actorHex, res.context);

    const displayName = input.displayName ?? input.merchantSlug;
    this.merchantLabels.set(merchantIdHex, {
      slug: input.merchantSlug,
      displayName,
    });

    const l = FargoContract.ledger(this.sharedState);
    const stored = l.merchant_policies.lookup(merchantId);
    return {
      merchantSlug: input.merchantSlug,
      merchantIdHex,
      ownerPublicKeyHex: toHex(stored.owner_pk),
      displayName,
      minAge: Number(stored.min_age),
      requiredKycTier: Number(stored.required_kyc_tier),
      minCreditLimit: stored.min_credit_limit,
      active: stored.active,
    };
  }

  public deactivatePolicy(params: {
    merchantSecretKey: Uint8Array;
    merchantSlug: string;
  }): void {
    const merchantId = encodeIdentifier32(params.merchantSlug);
    const actorHex = toHex(params.merchantSecretKey);
    const ps = createFargoPrivateState({
      secretKey: params.merchantSecretKey,
    });
    const ctx = this.getOrCreateSession(actorHex, ps);
    const res = this.contract.impureCircuits.deactivate_merchant_policy(
      ctx,
      merchantId,
    );
    this.commitSession(actorHex, res.context);
  }

  public verifyCheckoutOrder(
    req: CheckoutVerificationRequest,
  ): FargoVerificationOutcome {
    const started = performance.now();
    const merchantId = encodeIdentifier32(req.merchantSlug);
    const orderId = encodeIdentifier32(req.orderNumber);
    const orderIdHex = toHex(orderId);
    const actorHex = toHex(req.buyerSecretKey);

    const salt =
      req.orderSalt ?? deriveSecretKeyFromSeed(`salt:${req.orderNumber}:${Date.now()}`);

    const ps = createFargoPrivateState({
      secretKey: req.buyerSecretKey,
      buyerAge: req.buyerAge,
      kycTier: req.kycTier,
      creditLimit: req.creditLimit,
      orderAmount: req.orderAmount,
      orderSalt: salt,
    });

    try {
      const ctx = this.getOrCreateSession(actorHex, ps);
      const res = this.contract.impureCircuits.verify_commerce_order(
        ctx,
        merchantId,
        orderId,
      );
      this.commitSession(actorHex, res.context);

      this.orderLabels.set(orderIdHex, {
        orderNumber: req.orderNumber,
        merchantSlug: req.merchantSlug,
        timestampIso: new Date().toISOString(),
      });

      const l = FargoContract.ledger(this.sharedState);
      const att = l.order_attestations.lookup(orderId);
      const elapsed = Math.max(1, Math.round(performance.now() - started));

      return {
        verified: true,
        orderNumber: req.orderNumber,
        orderIdHex,
        merchantSlug: req.merchantSlug,
        commitmentHex: toHex(res.result),
        nullifierHex: toHex(att.nullifier),
        buyerPseudonymHex: toHex(att.buyer_pseudonym),
        executionTimeMs: elapsed,
        privateDataKeptOffChain: {
          exactAgeHidden: true,
          identityDocumentHidden: true,
          creditFacilityHidden: true,
          invoiceAmountHidden: true,
        },
      };
    } catch (err) {
      const elapsed = Math.max(1, Math.round(performance.now() - started));
      const rawMsg = err instanceof Error ? err.message : String(err);
      const cleanMsg = rawMsg.replace(/^failed assert:\s*/i, "");
      return {
        verified: false,
        orderNumber: req.orderNumber,
        orderIdHex,
        merchantSlug: req.merchantSlug,
        executionTimeMs: elapsed,
        errorMessage: cleanMsg,
        privateDataKeptOffChain: {
          exactAgeHidden: true,
          identityDocumentHidden: true,
          creditFacilityHidden: true,
          invoiceAmountHidden: true,
        },
      };
    }
  }

  public settleOrder(params: {
    merchantSecretKey: Uint8Array;
    orderNumber: string;
  }): PublicAttestationView {
    const orderId = encodeIdentifier32(params.orderNumber);
    const orderIdHex = toHex(orderId);
    const actorHex = toHex(params.merchantSecretKey);
    const ps = createFargoPrivateState({
      secretKey: params.merchantSecretKey,
    });
    const ctx = this.getOrCreateSession(actorHex, ps);
    const res = this.contract.impureCircuits.settle_verified_order(
      ctx,
      orderId,
    );
    this.commitSession(actorHex, res.context);

    const l = FargoContract.ledger(this.sharedState);
    const att = l.order_attestations.lookup(orderId);
    const meta = this.orderLabels.get(orderIdHex);
    const merchantMeta = this.merchantLabels.get(toHex(att.merchant_id));

    return {
      orderNumber: meta?.orderNumber ?? params.orderNumber,
      orderIdHex,
      merchantSlug: merchantMeta?.slug ?? meta?.merchantSlug ?? "unknown",
      merchantIdHex: toHex(att.merchant_id),
      buyerPseudonymHex: toHex(att.buyer_pseudonym),
      commitmentHex: toHex(att.commitment),
      nullifierHex: toHex(att.nullifier),
      status: mapStatusLabel(att.status),
      verifiedAtIso: meta?.timestampIso ?? new Date().toISOString(),
    };
  }

  public getBuyerLocalReceipts(
    buyerSecretKey: Uint8Array,
  ): readonly VerifiedOrderReceipt[] {
    const session = this.sessions.get(toHex(buyerSecretKey));
    return session?.privateState.receipts ?? [];
  }

  public inspectDualLedger(): DualLedgerSnapshot {
    const l = FargoContract.ledger(this.sharedState);

    const policies: PublicPolicyView[] = [];
    for (const [mId, pol] of l.merchant_policies) {
      const hex = toHex(mId);
      const meta = this.merchantLabels.get(hex);
      policies.push({
        merchantSlug: meta?.slug ?? hex.slice(0, 12),
        merchantIdHex: hex,
        ownerPublicKeyHex: toHex(pol.owner_pk),
        displayName: meta?.displayName ?? hex.slice(0, 12),
        minAge: Number(pol.min_age),
        requiredKycTier: Number(pol.required_kyc_tier),
        minCreditLimit: pol.min_credit_limit,
        active: pol.active,
      });
    }

    const attestations: PublicAttestationView[] = [];
    for (const [oId, att] of l.order_attestations) {
      const hex = toHex(oId);
      const oMeta = this.orderLabels.get(hex);
      const mMeta = this.merchantLabels.get(toHex(att.merchant_id));
      attestations.push({
        orderNumber: oMeta?.orderNumber ?? hex.slice(0, 12),
        orderIdHex: hex,
        merchantSlug: mMeta?.slug ?? oMeta?.merchantSlug ?? hex.slice(0, 12),
        merchantIdHex: toHex(att.merchant_id),
        buyerPseudonymHex: toHex(att.buyer_pseudonym),
        commitmentHex: toHex(att.commitment),
        nullifierHex: toHex(att.nullifier),
        status: mapStatusLabel(att.status),
        verifiedAtIso: oMeta?.timestampIso ?? new Date().toISOString(),
      });
    }

    return {
      contractAddress: String(this.contractAddress),
      totalMerchants: Number(l.total_merchants),
      totalVerifiedOrders: Number(l.total_verified_orders),
      totalSettledOrders: Number(l.total_settled_orders),
      activeNullifierCount: Number(l.used_nullifiers.size()),
      policies,
      attestations: attestations.reverse(),
    };
  }

  public generatePluginSnippet(merchantSlug: string): string {
    return `import { FargoCommerceClient, deriveSecretKeyFromSeed } from "@fargo/sdk";

const fargo = new FargoCommerceClient();
const proof = fargo.verifyCheckoutOrder({
  merchantSlug: "${merchantSlug}",
  orderNumber: checkout.orderId,
  buyerSecretKey: deriveSecretKeyFromSeed(wallet.sessionSeed),
  // Confidential witness inputs — never transmitted to merchant or public ledger:
  buyerAge: verifiedIdentity.age,
  kycTier: verifiedIdentity.tier,
  creditLimit: creditLine.availableUsd,
  orderAmount: checkout.totalUsd,
});

if (proof.verified) {
  await merchantApi.confirmOrder({
    orderId: checkout.orderId,
    midnightCommitment: proof.commitmentHex,
    nullifier: proof.nullifierHex,
  });
}`;
  }
}
