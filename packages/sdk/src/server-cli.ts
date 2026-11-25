// SPDX-License-Identifier: Apache-2.0

import http from "node:http";
import { createFargoNodeListener } from "./gateway.js";
import { FargoCommerceClient, deriveSecretKeyFromSeed } from "./index.js";

const port = Number(process.env.FARGO_PORT ?? 8787);
const client = new FargoCommerceClient();

// Seed default enterprise policy for instant REST testing
client.registerOrUpdatePolicy({
  merchantSecretKey: deriveSecretKeyFromSeed("merchant:anatolia-b2b-supply-v1"),
  merchantSlug: "anatolia-b2b-supply",
  displayName: "Anatolia Industrial Supply (B2B Net-30)",
  minAge: 21,
  requiredKycTier: 2,
  minCreditLimit: 50_000,
});

const server = http.createServer(
  createFargoNodeListener(client, {
    webhookSecret: process.env.FARGO_WEBHOOK_SECRET ?? "whsec_fargo_live_demo",
  }),
);

server.listen(port, () => {
  console.log(
    `[FARGO Gateway] Midnight Compact REST API listening on http://localhost:${port}/v1/health`,
  );
});
