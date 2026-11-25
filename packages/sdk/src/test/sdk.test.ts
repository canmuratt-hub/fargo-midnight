// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { FargoCommerceClient, deriveSecretKeyFromSeed } from "../index.js";

describe("@fargo/sdk Commerce Integration Layer", () => {
  it("executes full e-commerce & B2B privacy-preserving verification lifecycle", () => {
    const client = new FargoCommerceClient();
    const merchantSk = deriveSecretKeyFromSeed("merchant:anatolia-industrial");
    const buyerSk = deriveSecretKeyFromSeed("buyer:bosporus-logistics-ltd");

    const policy = client.registerOrUpdatePolicy({
      merchantSecretKey: merchantSk,
      merchantSlug: "anatolia-industrial",
      displayName: "Anatolia Industrial Supply (B2B)",
      minAge: 21,
      requiredKycTier: 2,
      minCreditLimit: 50_000,
    });

    expect(policy.active).toBe(true);
    expect(policy.requiredKycTier).toBe(2);

    const outcome = client.verifyCheckoutOrder({
      buyerSecretKey: buyerSk,
      merchantSlug: "anatolia-industrial",
      orderNumber: "PO-2026-8841",
      buyerAge: 38,
      kycTier: 2,
      creditLimit: 180_000,
      orderAmount: 64_500,
    });

    expect(outcome.verified).toBe(true);
    expect(outcome.commitmentHex).toMatch(/^[0-9a-f]{64}$/);
    expect(outcome.nullifierHex).toMatch(/^[0-9a-f]{64}$/);
    expect(outcome.privateDataKeptOffChain.invoiceAmountHidden).toBe(true);

    const settled = client.settleOrder({
      merchantSecretKey: merchantSk,
      orderNumber: "PO-2026-8841",
    });
    expect(settled.status).toBe("settled");

    const snapshot = client.inspectDualLedger();
    expect(snapshot.totalMerchants).toBe(1);
    expect(snapshot.totalVerifiedOrders).toBe(1);
    expect(snapshot.totalSettledOrders).toBe(1);
    expect(snapshot.activeNullifierCount).toBe(1);
    expect(client.getBuyerLocalReceipts(buyerSk)).toHaveLength(1);
  });

  it("returns structured failure reason without throwing when ZK policy check fails", () => {
    const client = new FargoCommerceClient();
    const merchantSk = deriveSecretKeyFromSeed("merchant:tech-retail");
    const buyerSk = deriveSecretKeyFromSeed("buyer:under-limit");

    client.registerOrUpdatePolicy({
      merchantSecretKey: merchantSk,
      merchantSlug: "tech-retail",
      displayName: "Tech Retail Store",
      minAge: 18,
      requiredKycTier: 1,
      minCreditLimit: 5_000,
    });

    const rejected = client.verifyCheckoutOrder({
      buyerSecretKey: buyerSk,
      merchantSlug: "tech-retail",
      orderNumber: "ORD-991",
      buyerAge: 24,
      kycTier: 1,
      creditLimit: 3_000,
      orderAmount: 4_200,
    });

    expect(rejected.verified).toBe(false);
    expect(rejected.errorMessage).toBeTruthy();
    expect(client.inspectDualLedger().totalVerifiedOrders).toBe(0);
  });
});
