// SPDX-License-Identifier: Apache-2.0

export interface FargoWebhookPayload {
  readonly eventId: string;
  readonly eventType: "fargo.order.verified" | "fargo.order.settled";
  readonly issuedAt: string;
  readonly merchantSlug: string;
  readonly orderNumber: string;
  readonly midnightProof: {
    readonly contractAddress: string;
    readonly commitmentHex: string;
    readonly nullifierHex: string;
    readonly buyerPseudonymHex: string;
  };
  readonly redactedComplianceSummary: {
    readonly ageRequirementMet: true;
    readonly kycTierRequirementMet: true;
    readonly creditSolvencyMet: true;
    readonly rawPiiDisclosed: false;
  };
}

export interface SignedFargoWebhook {
  readonly payload: FargoWebhookPayload;
  readonly bodyJson: string;
  readonly signatureHeader: string;
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

async function computeHmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(message),
  );
  return bufferToHex(sig);
}

/**
 * Generates an HMAC-SHA256 signed webhook envelope that merchants can verify
 * in Shopify, WooCommerce, or custom ERP backends before fulfilling an order.
 */
export async function createSignedFargoWebhook(
  payload: FargoWebhookPayload,
  webhookSecret: string,
): Promise<SignedFargoWebhook> {
  const bodyJson = JSON.stringify(payload);
  const digest = await computeHmacHex(webhookSecret, bodyJson);
  return {
    payload,
    bodyJson,
    signatureHeader: `sha256=${digest}`,
  };
}

/**
 * Constant-time verification of a FARGO webhook signature header.
 */
export async function verifyFargoWebhookSignature(
  rawBodyJson: string,
  signatureHeader: string,
  webhookSecret: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const provided = signatureHeader.slice("sha256=".length);
  const expected = await computeHmacHex(webhookSecret, rawBodyJson);
  if (provided.length !== expected.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
