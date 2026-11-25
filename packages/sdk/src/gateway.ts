// SPDX-License-Identifier: Apache-2.0

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  type FargoCommerceClient,
  type KycTierLevel,
  deriveSecretKeyFromSeed,
} from "./index.js";
import { createSignedFargoWebhook } from "./webhooks.js";

export interface FargoGatewayOptions {
  readonly webhookSecret?: string;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-fargo-signature",
  });
  res.end(payload);
}

/**
 * Node.js HTTP request listener exposing FARGO's Midnight Compact verification
 * engine as a drop-in REST API gateway for e-commerce & B2B backends.
 */
export function createFargoNodeListener(
  client: FargoCommerceClient,
  options: FargoGatewayOptions = {},
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const webhookSecret = options.webhookSecret ?? "whsec_fargo_default_dev_key";

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");

    if (method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    try {
      if (method === "GET" && url.pathname === "/v1/health") {
        const snapshot = client.inspectDualLedger();
        sendJson(res, 200, {
          status: "ok",
          service: "fargo-midnight-gateway",
          compactLanguageVersion: "0.22",
          contractAddress: snapshot.contractAddress,
          metrics: {
            totalMerchants: snapshot.totalMerchants,
            totalVerifiedOrders: snapshot.totalVerifiedOrders,
            totalSettledOrders: snapshot.totalSettledOrders,
          },
        });
        return;
      }

      if (method === "GET" && url.pathname === "/v1/ledger") {
        const snapshot = client.inspectDualLedger();
        sendJson(res, 200, {
          ...snapshot,
          policies: snapshot.policies.map((p) => ({
            ...p,
            minCreditLimit: p.minCreditLimit.toString(),
          })),
        });
        return;
      }

      if (method === "POST" && url.pathname === "/v1/policies") {
        const body = await readJsonBody(req);
        const merchantSeed = String(body.merchantSeed ?? "");
        const merchantSlug = String(body.merchantSlug ?? "");
        if (!merchantSeed || !merchantSlug) {
          sendJson(res, 400, { error: "merchantSeed and merchantSlug are required" });
          return;
        }

        const policy = client.registerOrUpdatePolicy({
          merchantSecretKey: deriveSecretKeyFromSeed(merchantSeed),
          merchantSlug,
          displayName: body.displayName ? String(body.displayName) : merchantSlug,
          minAge: Number(body.minAge ?? 18),
          requiredKycTier: Number(body.requiredKycTier ?? 1) as KycTierLevel,
          minCreditLimit: BigInt(String(body.minCreditLimit ?? 0)),
        });

        sendJson(res, 201, {
          policy: {
            ...policy,
            minCreditLimit: policy.minCreditLimit.toString(),
          },
        });
        return;
      }

      if (method === "POST" && url.pathname === "/v1/orders/verify") {
        const body = await readJsonBody(req);
        const buyerSeed = String(body.buyerSeed ?? "");
        const merchantSlug = String(body.merchantSlug ?? "");
        const orderNumber = String(body.orderNumber ?? "");
        if (!buyerSeed || !merchantSlug || !orderNumber) {
          sendJson(res, 400, {
            error: "buyerSeed, merchantSlug, and orderNumber are required",
          });
          return;
        }

        const outcome = client.verifyCheckoutOrder({
          buyerSecretKey: deriveSecretKeyFromSeed(buyerSeed),
          merchantSlug,
          orderNumber,
          buyerAge: Number(body.buyerAge ?? 0),
          kycTier: Number(body.kycTier ?? 0) as KycTierLevel,
          creditLimit: BigInt(String(body.creditLimit ?? 0)),
          orderAmount: BigInt(String(body.orderAmount ?? 0)),
        });

        if (!outcome.verified) {
          sendJson(res, 422, { outcome });
          return;
        }

        const webhook = await createSignedFargoWebhook(
          {
            eventId: `evt_${outcome.orderIdHex.slice(0, 16)}`,
            eventType: "fargo.order.verified",
            issuedAt: new Date().toISOString(),
            merchantSlug,
            orderNumber,
            midnightProof: {
              contractAddress: String(client.contractAddress),
              commitmentHex: outcome.commitmentHex!,
              nullifierHex: outcome.nullifierHex!,
              buyerPseudonymHex: outcome.buyerPseudonymHex!,
            },
            redactedComplianceSummary: {
              ageRequirementMet: true,
              kycTierRequirementMet: true,
              creditSolvencyMet: true,
              rawPiiDisclosed: false,
            },
          },
          webhookSecret,
        );

        sendJson(res, 200, {
          outcome,
          webhook: {
            signatureHeader: webhook.signatureHeader,
            payload: webhook.payload,
          },
        });
        return;
      }

      if (method === "POST" && url.pathname === "/v1/orders/settle") {
        const body = await readJsonBody(req);
        const merchantSeed = String(body.merchantSeed ?? "");
        const orderNumber = String(body.orderNumber ?? "");
        if (!merchantSeed || !orderNumber) {
          sendJson(res, 400, {
            error: "merchantSeed and orderNumber are required",
          });
          return;
        }

        const settled = client.settleOrder({
          merchantSecretKey: deriveSecretKeyFromSeed(merchantSeed),
          orderNumber,
        });
        sendJson(res, 200, { attestation: settled });
        return;
      }

      sendJson(res, 404, { error: `Route not found: ${method} ${url.pathname}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sendJson(res, 400, { error: msg });
    }
  };
}
