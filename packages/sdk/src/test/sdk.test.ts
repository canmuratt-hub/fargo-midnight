// SPDX-License-Identifier: Apache-2.0

import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createFargoNodeListener } from "../gateway.js";
import {
  FargoCommerceClient,
  createSignedFargoWebhook,
  deriveSecretKeyFromSeed,
  verifyFargoWebhookSignature,
} from "../index.js";

let activeServer: http.Server | null = null;

afterEach(async () => {
  if (activeServer) {
    const srv = activeServer;
    activeServer = null;
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  }
});

async function startTestGateway(
  client: FargoCommerceClient,
  webhookSecret = "whsec_test_secret_2026",
): Promise<string> {
  const server = http.createServer(
    createFargoNodeListener(client, { webhookSecret }),
  );
  activeServer = server;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  return `http://127.0.0.1:${addr.port}`;
}

describe("@fargo/sdk Commerce Integration, Webhooks & REST Gateway", () => {
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

  it("signs and verifies HMAC-SHA256 merchant webhooks and rejects tampered payloads", async () => {
    const secret = "whsec_merchant_prod_key";
    const signed = await createSignedFargoWebhook(
      {
        eventId: "evt_001",
        eventType: "fargo.order.verified",
        issuedAt: "2026-11-25T18:00:00.000Z",
        merchantSlug: "anatolia-industrial",
        orderNumber: "PO-2026-5001",
        midnightProof: {
          contractAddress: "0".repeat(64),
          commitmentHex: "a".repeat(64),
          nullifierHex: "b".repeat(64),
          buyerPseudonymHex: "c".repeat(64),
        },
        redactedComplianceSummary: {
          ageRequirementMet: true,
          kycTierRequirementMet: true,
          creditSolvencyMet: true,
          rawPiiDisclosed: false,
        },
      },
      secret,
    );

    expect(
      await verifyFargoWebhookSignature(
        signed.bodyJson,
        signed.signatureHeader,
        secret,
      ),
    ).toBe(true);

    // Wrong secret fails
    expect(
      await verifyFargoWebhookSignature(
        signed.bodyJson,
        signed.signatureHeader,
        "whsec_wrong",
      ),
    ).toBe(false);

    // Tampered order number fails
    const tampered = signed.bodyJson.replace("PO-2026-5001", "PO-2026-9999");
    expect(
      await verifyFargoWebhookSignature(
        tampered,
        signed.signatureHeader,
        secret,
      ),
    ).toBe(false);
  });

  it("serves end-to-end REST API endpoints (/v1/health, /v1/policies, /v1/orders/verify, /v1/orders/settle, /v1/ledger)", async () => {
    const client = new FargoCommerceClient();
    const webhookSecret = "whsec_gateway_e2e";
    const baseUrl = await startTestGateway(client, webhookSecret);

    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/v1/health`);
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as { status: string };
    expect(healthJson.status).toBe("ok");

    // 2. Register merchant policy via HTTP POST
    const polRes = await fetch(`${baseUrl}/v1/policies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantSeed: "merchant:e2e-gateway",
        merchantSlug: "e2e-b2b-hub",
        displayName: "E2E B2B Hub",
        minAge: 21,
        requiredKycTier: 2,
        minCreditLimit: 30_000,
      }),
    });
    expect(polRes.status).toBe(201);

    // 3. Verify compliant order via HTTP POST & validate returned HMAC webhook
    const verifyRes = await fetch(`${baseUrl}/v1/orders/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        buyerSeed: "buyer:e2e-enterprise",
        merchantSlug: "e2e-b2b-hub",
        orderNumber: "PO-HTTP-100",
        buyerAge: 35,
        kycTier: 2,
        creditLimit: 90_000,
        orderAmount: 42_000,
      }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyJson = (await verifyRes.json()) as {
      outcome: { verified: boolean; commitmentHex: string };
      webhook: { signatureHeader: string; payload: unknown };
    };
    expect(verifyJson.outcome.verified).toBe(true);
    expect(
      await verifyFargoWebhookSignature(
        JSON.stringify(verifyJson.webhook.payload),
        verifyJson.webhook.signatureHeader,
        webhookSecret,
      ),
    ).toBe(true);

    // 4. Reject non-compliant order with HTTP 422
    const rejectRes = await fetch(`${baseUrl}/v1/orders/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        buyerSeed: "buyer:e2e-underage",
        merchantSlug: "e2e-b2b-hub",
        orderNumber: "PO-HTTP-101",
        buyerAge: 17,
        kycTier: 2,
        creditLimit: 90_000,
        orderAmount: 10_000,
      }),
    });
    expect(rejectRes.status).toBe(422);

    // 5. Settle verified order via HTTP POST
    const settleRes = await fetch(`${baseUrl}/v1/orders/settle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantSeed: "merchant:e2e-gateway",
        orderNumber: "PO-HTTP-100",
      }),
    });
    expect(settleRes.status).toBe(200);

    // 6. Inspect Dual-Ledger state via HTTP GET
    const ledgerRes = await fetch(`${baseUrl}/v1/ledger`);
    expect(ledgerRes.status).toBe(200);
    const ledgerJson = (await ledgerRes.json()) as {
      totalMerchants: number;
      totalVerifiedOrders: number;
      totalSettledOrders: number;
    };
    expect(ledgerJson.totalMerchants).toBe(1);
    expect(ledgerJson.totalVerifiedOrders).toBe(1);
    expect(ledgerJson.totalSettledOrders).toBe(1);
  });

  it("generates platform-specific plugin snippets for Shopify, WooCommerce, and B2B ERP", () => {
    const client = new FargoCommerceClient();
    expect(client.generatePluginSnippet("demo", "shopify")).toContain(
      "@fargo/sdk",
    );
    expect(client.generatePluginSnippet("demo", "woocommerce")).toContain(
      "woocommerce_checkout_process",
    );
    expect(client.generatePluginSnippet("demo", "erp-rest")).toContain(
      "/v1/orders/verify",
    );
  });
});
