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
  /**
   * Optional: if set to a different amount than `creditLimit`, simulates a buyer
   * receiving an official Bank seal for `bankSealedCreditLimit` and then locally
   * tampering their `creditLimit` witness to cheat the merchant policy.
   */
  readonly bankSealedCreditLimit?: number | bigint;
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
  readonly merchantDisplayName: string;
  readonly merchantIdHex: string;
  readonly buyerPseudonymHex: string;
  readonly commitmentHex: string;
  readonly nullifierHex: string;
  readonly credentialSealHex: string;
  readonly status: "unverified" | "verified" | "settled" | "revoked";
  readonly verifiedAtIso: string;
}

export interface ComplianceCertificate {
  readonly certificateId: string;
  readonly protocol: "FARGO Midnight Compact v0.22";
  readonly contractAddress: string;
  readonly orderNumber: string;
  readonly merchantSlug: string;
  readonly merchantDisplayName: string;
  readonly status: "VERIFIED" | "SETTLED";
  readonly issuedAtIso: string;
  readonly cryptographicProofs: {
    readonly orderCommitmentHex: string;
    readonly antiReplayNullifierHex: string;
    readonly buyerPseudonymHex: string;
    readonly bankCredentialSealHex: string;
  };
  readonly privacyAttestation: {
    readonly gdprKvkkCompliant: true;
    readonly zeroPiiStoredOnChain: true;
    readonly zeroInvoiceAmountExposed: true;
    readonly issuerBankSignatureVerified: true;
  };
}

export interface DualLedgerSnapshot {
  readonly contractAddress: string;
  readonly trustedIssuerPublicKeyHex: string;
  readonly totalMerchants: number;
  readonly totalCredentialsIssued: number;
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
  readonly credentialSealHex?: string;
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
 * Includes Trusted Bank / KYC Authority credential sealing and zero-knowledge order proofs.
 */
export class FargoCommerceClient {
  private readonly contract: FargoContract.Contract<FargoPrivateState>;
  private sharedState: ChargedState;
  private readonly sessions = new Map<string, InternalSession>();
  private readonly bankAuthoritySecretKey: Uint8Array;
  public readonly trustedIssuerPublicKeyHex: string;
  private readonly merchantLabels = new Map<
    string,
    { slug: string; displayName: string }
  >();
  private readonly orderLabels = new Map<
    string,
    {
      orderNumber: string;
      merchantSlug: string;
      timestampIso: string;
      credentialSealHex: string;
    }
  >();
  public readonly contractAddress = sampleContractAddress();

  constructor() {
    this.contract = new FargoContract.Contract<FargoPrivateState>(
      fargoWitnesses as unknown as FargoContract.Witnesses<FargoPrivateState>,
    );
    this.bankAuthoritySecretKey = deriveSecretKeyFromSeed(
      "issuer:fargo-national-banking-kyc-authority-v1",
    );
    const bootstrapState = createFargoPrivateState({
      secretKey: this.bankAuthoritySecretKey,
    });
    const init = this.contract.initialState(
      createConstructorContext(bootstrapState, "0".repeat(64)),
    );
    this.sharedState = init.currentContractState.data;

    // Register the Trusted Bank & Identity Authority on Midnight ledger
    const issuerHex = toHex(this.bankAuthoritySecretKey);
    const ctx = this.getOrCreateSession(issuerHex, bootstrapState);
    const regRes = this.contract.impureCircuits.register_trusted_issuer(ctx);
    this.commitSession(issuerHex, regRes.context);
    this.trustedIssuerPublicKeyHex = toHex(regRes.result);
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

  private issueBankSealForBuyer(params: {
    buyerSecretKey: Uint8Array;
    buyerAge: number;
    kycTier: KycTierLevel;
    sealedCreditLimit: number | bigint;
    credentialSalt: Uint8Array;
  }): Uint8Array {
    const buyerPk = FargoContract.pureCircuits.derive_public_key(
      params.buyerSecretKey,
    );
    const seal = FargoContract.pureCircuits.compute_credential_seal(
      buyerPk,
      BigInt(params.buyerAge),
      BigInt(params.kycTier),
      BigInt(params.sealedCreditLimit),
      params.credentialSalt,
    );

    const issuerHex = toHex(this.bankAuthoritySecretKey);
    const issuerPs = createFargoPrivateState({
      secretKey: this.bankAuthoritySecretKey,
    });
    const ctx = this.getOrCreateSession(issuerHex, issuerPs);
    const res = this.contract.impureCircuits.issue_buyer_credential(ctx, seal);
    this.commitSession(issuerHex, res.context);
    return seal;
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
      req.orderSalt ??
      deriveSecretKeyFromSeed(`salt:${req.orderNumber}:${Date.now()}`);
    const credSalt = deriveSecretKeyFromSeed(
      `cred-salt:${req.orderNumber}:${actorHex.slice(0, 16)}`,
    );

    // Bank seals the TRUE bank-approved credit limit (unless tampered, equals req.creditLimit)
    const officialBankLimit = req.bankSealedCreditLimit ?? req.creditLimit;
    const issuedSeal = this.issueBankSealForBuyer({
      buyerSecretKey: req.buyerSecretKey,
      buyerAge: req.buyerAge,
      kycTier: req.kycTier,
      sealedCreditLimit: officialBankLimit,
      credentialSalt: credSalt,
    });
    const credentialSealHex = toHex(issuedSeal);

    const ps = createFargoPrivateState({
      secretKey: req.buyerSecretKey,
      buyerAge: req.buyerAge,
      kycTier: req.kycTier,
      creditLimit: req.creditLimit,
      orderAmount: req.orderAmount,
      orderSalt: salt,
      credentialSalt: credSalt,
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
        credentialSealHex,
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
        credentialSealHex,
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
        credentialSealHex,
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
      merchantDisplayName:
        merchantMeta?.displayName ?? merchantMeta?.slug ?? "Merchant",
      merchantIdHex: toHex(att.merchant_id),
      buyerPseudonymHex: toHex(att.buyer_pseudonym),
      commitmentHex: toHex(att.commitment),
      nullifierHex: toHex(att.nullifier),
      credentialSealHex: meta?.credentialSealHex ?? "0".repeat(64),
      status: mapStatusLabel(att.status),
      verifiedAtIso: meta?.timestampIso ?? new Date().toISOString(),
    };
  }

  public generateComplianceCertificate(
    orderNumber: string,
  ): ComplianceCertificate | null {
    const snapshot = this.inspectDualLedger();
    const att = snapshot.attestations.find(
      (a) => a.orderNumber === orderNumber,
    );
    if (!att || (att.status !== "verified" && att.status !== "settled")) {
      return null;
    }
    return {
      certificateId: `CERT-MDN-${att.commitmentHex.slice(0, 10).toUpperCase()}`,
      protocol: "FARGO Midnight Compact v0.22",
      contractAddress: snapshot.contractAddress,
      orderNumber: att.orderNumber,
      merchantSlug: att.merchantSlug,
      merchantDisplayName: att.merchantDisplayName,
      status: att.status === "settled" ? "SETTLED" : "VERIFIED",
      issuedAtIso: att.verifiedAtIso,
      cryptographicProofs: {
        orderCommitmentHex: att.commitmentHex,
        antiReplayNullifierHex: att.nullifierHex,
        buyerPseudonymHex: att.buyerPseudonymHex,
        bankCredentialSealHex: att.credentialSealHex,
      },
      privacyAttestation: {
        gdprKvkkCompliant: true,
        zeroPiiStoredOnChain: true,
        zeroInvoiceAmountExposed: true,
        issuerBankSignatureVerified: true,
      },
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
        merchantDisplayName:
          mMeta?.displayName ?? mMeta?.slug ?? hex.slice(0, 12),
        merchantIdHex: toHex(att.merchant_id),
        buyerPseudonymHex: toHex(att.buyer_pseudonym),
        commitmentHex: toHex(att.commitment),
        nullifierHex: toHex(att.nullifier),
        credentialSealHex: oMeta?.credentialSealHex ?? "0".repeat(64),
        status: mapStatusLabel(att.status),
        verifiedAtIso: oMeta?.timestampIso ?? new Date().toISOString(),
      });
    }

    return {
      contractAddress: String(this.contractAddress),
      trustedIssuerPublicKeyHex: this.trustedIssuerPublicKeyHex,
      totalMerchants: Number(l.total_merchants),
      totalCredentialsIssued: Number(l.total_credentials_issued),
      totalVerifiedOrders: Number(l.total_verified_orders),
      totalSettledOrders: Number(l.total_settled_orders),
      activeNullifierCount: Number(l.used_nullifiers.size()),
      policies,
      attestations: attestations.reverse(),
    };
  }

  public generatePluginSnippet(
    merchantSlug: string,
    platform: "shopify" | "woocommerce" | "erp-rest" = "shopify",
  ): string {
    if (platform === "woocommerce") {
      return `// WooCommerce Checkout Hook + FARGO REST Gateway Verification
add_action('woocommerce_checkout_process', function () {
  $proof_payload = json_decode(wp_unslash($_POST['fargo_zk_proof'] ?? '{}'), true);
  $signature     = sanitize_text_field($_SERVER['HTTP_X_FARGO_SIGNATURE'] ?? '');

  // Verify HMAC-SHA256 webhook envelope from FARGO Midnight Gateway
  $expected = 'sha256=' . hash_hmac('sha256', wp_json_encode($proof_payload), FARGO_WEBHOOK_SECRET);
  if (!hash_equals($expected, $signature)) {
    wc_add_notice('FARGO zero-knowledge compliance proof could not be verified.', 'error');
  }
  // Merchant never receives customer DOB, KYC ID file, or corporate credit balance
});`;
    }

    if (platform === "erp-rest") {
      return `# Enterprise B2B ERP / Net-30 Invoice Verification via FARGO REST Gateway
curl -X POST http://localhost:8787/v1/orders/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchantSlug": "${merchantSlug}",
    "orderNumber": "PO-2026-9040",
    "buyerSeed": "buyer:bosporus-trade-corp",
    "buyerAge": 34,
    "kycTier": 2,
    "creditLimit": 220000,
    "orderAmount": 68500
  }'

# Returns Midnight commitment + Bank seal proof + HMAC-signed webhook`;
    }

    return `// Shopify Checkout UI Extension / Storefront SDK (@fargo/sdk)
import { FargoCommerceClient, deriveSecretKeyFromSeed } from "@fargo/sdk";

const fargo = new FargoCommerceClient();
const proof = fargo.verifyCheckoutOrder({
  merchantSlug: "${merchantSlug}",
  orderNumber: checkout.orderId,
  buyerSecretKey: deriveSecretKeyFromSeed(wallet.sessionSeed),
  // Confidential Bank/KYC sealed witness inputs — never transmitted to merchant:
  buyerAge: verifiedIdentity.age,
  kycTier: verifiedIdentity.tier,
  creditLimit: bankAttestation.approvedUsd,
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

export {
  createSignedFargoWebhook,
  verifyFargoWebhookSignature,
  type FargoWebhookPayload,
  type SignedFargoWebhook,
} from "./webhooks.js";
