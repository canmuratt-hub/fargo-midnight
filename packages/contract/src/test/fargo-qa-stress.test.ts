// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createFargoPrivateState } from "../witnesses.js";
import {
  FargoSimulator,
  OrderStatus,
  bytesToHex,
  idFromLabel,
} from "./fargo-simulator.js";

function makeKey(seedByte: number): Uint8Array {
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = (seedByte * 31 + i * 17) & 0xff;
  }
  return key;
}

describe("FARGO QA Suite — Boundary Conditions, Lifecycle & Stress Simulation", () => {
  it("accepts exact threshold boundaries (age == min_age, tier == required, credit == limit == amount)", () => {
    const sim = new FargoSimulator();
    const merchantId = idFromLabel("merchant:exact-boundary");

    sim.upsertActor(
      "merchant",
      createFargoPrivateState({ secretKey: makeKey(1) }),
    );
    sim.registerMerchantPolicy("merchant", merchantId, 21, 2, 50_000n);

    sim.upsertActor(
      "exactBuyer",
      createFargoPrivateState({
        secretKey: makeKey(2),
        buyerAge: 21, // Exact min_age
        kycTier: 2, // Exact required_kyc_tier
        creditLimit: 50_000n, // Exact min_credit_limit
        orderAmount: 50_000n, // Exact credit_limit
        orderSalt: makeKey(90),
      }),
    );

    const orderId = idFromLabel("order:exact-pass");
    const { ledger } = sim.verifyCommerceOrder(
      "exactBuyer",
      merchantId,
      orderId,
    );

    expect(ledger.total_verified_orders).toBe(1n);
    expect(ledger.order_attestations.lookup(orderId).status).toBe(
      OrderStatus.verified,
    );
  });

  it("rejects off-by-one boundary violations across age, credit floor, and order amount", () => {
    const sim = new FargoSimulator();
    const merchantId = idFromLabel("merchant:off-by-one");

    sim.upsertActor(
      "merchant",
      createFargoPrivateState({ secretKey: makeKey(3) }),
    );
    sim.registerMerchantPolicy("merchant", merchantId, 21, 2, 50_000n);

    // 1. Age off by 1 (20 < 21)
    sim.upsertActor(
      "ageFail",
      createFargoPrivateState({
        secretKey: makeKey(4),
        buyerAge: 20,
        kycTier: 2,
        creditLimit: 50_000n,
        orderAmount: 10_000n,
      }),
    );
    expect(() =>
      sim.verifyCommerceOrder("ageFail", merchantId, idFromLabel("ord:ob1-age")),
    ).toThrow();

    // 2. Credit floor off by 1 (49_999 < 50_000)
    sim.upsertActor(
      "floorFail",
      createFargoPrivateState({
        secretKey: makeKey(5),
        buyerAge: 21,
        kycTier: 2,
        creditLimit: 49_999n,
        orderAmount: 10_000n,
      }),
    );
    expect(() =>
      sim.verifyCommerceOrder(
        "floorFail",
        merchantId,
        idFromLabel("ord:ob1-floor"),
      ),
    ).toThrow();

    // 3. Order amount exceeds credit limit by 1 (50_001 > 50_000)
    sim.upsertActor(
      "amountFail",
      createFargoPrivateState({
        secretKey: makeKey(6),
        buyerAge: 21,
        kycTier: 2,
        creditLimit: 50_000n,
        orderAmount: 50_001n,
      }),
    );
    expect(() =>
      sim.verifyCommerceOrder(
        "amountFail",
        merchantId,
        idFromLabel("ord:ob1-amt"),
      ),
    ).toThrow();
  });

  it("supports full policy deactivation and owner re-activation lifecycle", () => {
    const sim = new FargoSimulator();
    const merchantId = idFromLabel("merchant:seasonal-b2b");

    sim.upsertActor(
      "merchant",
      createFargoPrivateState({ secretKey: makeKey(10) }),
    );
    sim.upsertActor(
      "buyer",
      createFargoPrivateState({
        secretKey: makeKey(11),
        buyerAge: 30,
        kycTier: 2,
        creditLimit: 100_000n,
        orderAmount: 25_000n,
      }),
    );

    // Active -> Order 1 passes
    sim.registerMerchantPolicy("merchant", merchantId, 18, 1, 10_000n);
    sim.verifyCommerceOrder("buyer", merchantId, idFromLabel("ord:phase-1"));

    // Deactivated -> Order 2 blocked
    sim.deactivateMerchantPolicy("merchant", merchantId);
    expect(sim.getLedger().merchant_policies.lookup(merchantId).active).toBe(
      false,
    );
    expect(() =>
      sim.verifyCommerceOrder("buyer", merchantId, idFromLabel("ord:phase-2")),
    ).toThrow();

    // Re-activated with stricter KYB Tier 2 -> Order 3 passes
    sim.registerMerchantPolicy("merchant", merchantId, 21, 2, 20_000n);
    expect(sim.getLedger().merchant_policies.lookup(merchantId).active).toBe(
      true,
    );
    const { ledger } = sim.verifyCommerceOrder(
      "buyer",
      merchantId,
      idFromLabel("ord:phase-3"),
    );

    expect(ledger.total_merchants).toBe(1n);
    expect(ledger.total_verified_orders).toBe(2n);
  });

  it("maintains ledger invariants and unique nullifiers across multi-merchant batch stress test (15 orders)", () => {
    const sim = new FargoSimulator();
    const merchants = [
      { actor: "m0", id: idFromLabel("m:textile-export"), key: makeKey(21) },
      { actor: "m1", id: idFromLabel("m:medical-supply"), key: makeKey(22) },
      { actor: "m2", id: idFromLabel("m:electronics-hub"), key: makeKey(23) },
    ];

    for (const m of merchants) {
      sim.upsertActor(m.actor, createFargoPrivateState({ secretKey: m.key }));
      sim.registerMerchantPolicy(m.actor, m.id, 18, 1, 5_000n);
    }

    const recordedNullifiers = new Set<string>();

    for (let i = 0; i < 15; i++) {
      const targetMerchant = merchants[i % merchants.length]!;
      const buyerActor = `buyer_${i}`;
      sim.upsertActor(
        buyerActor,
        createFargoPrivateState({
          secretKey: makeKey(40 + i),
          buyerAge: 22 + (i % 25),
          kycTier: 2,
          creditLimit: BigInt(20_000 + i * 5_000),
          orderAmount: BigInt(6_000 + i * 1_000),
          orderSalt: makeKey(100 + i),
        }),
      );

      const orderId = idFromLabel(`order:stress-${i}`);
      const { ledger } = sim.verifyCommerceOrder(
        buyerActor,
        targetMerchant.id,
        orderId,
      );
      const att = ledger.order_attestations.lookup(orderId);
      recordedNullifiers.add(bytesToHex(att.nullifier));

      // Settle every even-indexed order
      if (i % 2 === 0) {
        sim.settleVerifiedOrder(targetMerchant.actor, orderId);
      }
    }

    const finalLedger = sim.getLedger();
    expect(finalLedger.total_merchants).toBe(3n);
    expect(finalLedger.total_verified_orders).toBe(15n);
    expect(finalLedger.total_settled_orders).toBe(8n);
    expect(finalLedger.used_nullifiers.size()).toBe(15n);
    expect(recordedNullifiers.size).toBe(15);
  });

  it("guarantees zero raw private witness leakage inside public OrderAttestation records", () => {
    const sim = new FargoSimulator();
    const merchantId = idFromLabel("merchant:privacy-audit");
    const secretBuyerKey = makeKey(77);
    const secretSalt = makeKey(88);

    sim.upsertActor(
      "merchant",
      createFargoPrivateState({ secretKey: makeKey(76) }),
    );
    sim.registerMerchantPolicy("merchant", merchantId, 18, 2, 10_000n);

    sim.upsertActor(
      "auditedBuyer",
      createFargoPrivateState({
        secretKey: secretBuyerKey,
        buyerAge: 43,
        kycTier: 2,
        creditLimit: 987_654n,
        orderAmount: 123_456n,
        orderSalt: secretSalt,
      }),
    );

    const orderId = idFromLabel("order:audit-001");
    sim.verifyCommerceOrder("auditedBuyer", merchantId, orderId);

    const att = sim.getLedger().order_attestations.lookup(orderId);
    const exposedKeys = Object.keys(att).sort();
    expect(exposedKeys).toEqual([
      "buyer_pseudonym",
      "commitment",
      "merchant_id",
      "nullifier",
      "status",
    ]);

    // Neither secretKey nor salt equals any disclosed 32-byte field
    const skHex = bytesToHex(secretBuyerKey);
    const saltHex = bytesToHex(secretSalt);
    expect(bytesToHex(att.buyer_pseudonym)).not.toBe(skHex);
    expect(bytesToHex(att.commitment)).not.toBe(saltHex);
    expect(bytesToHex(att.nullifier)).not.toBe(skHex);
  });
});
