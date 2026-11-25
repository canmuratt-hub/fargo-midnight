// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createFargoPrivateState } from "../witnesses.js";
import {
  FargoSimulator,
  OrderStatus,
  bytesToHex,
  idFromLabel,
  pureCircuits,
} from "./fargo-simulator.js";

const MERCHANT_A_SK = new Uint8Array(32).fill(0x11);
const MERCHANT_B_SK = new Uint8Array(32).fill(0x22);
const BUYER_ALICE_SK = new Uint8Array(32).fill(0x33);
const BUYER_BOB_SK = new Uint8Array(32).fill(0x44);
const ATTACKER_SK = new Uint8Array(32).fill(0x99);

const SALT_1 = new Uint8Array(32).fill(0xa1);
const SALT_2 = new Uint8Array(32).fill(0xb2);

const MERCHANT_RETAIL = idFromLabel("merchant:istanbul-luxury-retail");
const MERCHANT_B2B = idFromLabel("merchant:anatolia-b2b-supply");

describe("FARGO Privacy-Preserving Commerce Smart Contract", () => {
  describe("Merchant Policy Management & ZK Ownership", () => {
    it("registers a new merchant policy and increments total_merchants", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );

      const state = sim.registerMerchantPolicy(
        "merchantA",
        MERCHANT_RETAIL,
        18,
        1,
        0,
      );

      expect(state.total_merchants).toBe(1n);
      expect(state.merchant_policies.member(MERCHANT_RETAIL)).toBe(true);

      const policy = state.merchant_policies.lookup(MERCHANT_RETAIL);
      expect(policy.min_age).toBe(18n);
      expect(policy.required_kyc_tier).toBe(1n);
      expect(policy.min_credit_limit).toBe(0n);
      expect(policy.active).toBe(true);
      expect(bytesToHex(policy.owner_pk)).toBe(
        bytesToHex(pureCircuits.derive_public_key(MERCHANT_A_SK)),
      );
    });

    it("allows the legitimate merchant owner to update policy without duplicating merchant count", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );

      sim.registerMerchantPolicy("merchantA", MERCHANT_B2B, 18, 1, 10_000n);
      const updated = sim.registerMerchantPolicy(
        "merchantA",
        MERCHANT_B2B,
        21,
        2,
        25_000n,
      );

      expect(updated.total_merchants).toBe(1n);
      const policy = updated.merchant_policies.lookup(MERCHANT_B2B);
      expect(policy.min_age).toBe(21n);
      expect(policy.required_kyc_tier).toBe(2n);
      expect(policy.min_credit_limit).toBe(25_000n);
    });

    it("rejects unauthorized policy hijack or deactivation by non-owners", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );
      sim.upsertActor(
        "attacker",
        createFargoPrivateState({ secretKey: ATTACKER_SK }),
      );

      sim.registerMerchantPolicy("merchantA", MERCHANT_RETAIL, 18, 1, 1_000n);

      expect(() =>
        sim.registerMerchantPolicy("attacker", MERCHANT_RETAIL, 0, 0, 0),
      ).toThrow();
      expect(() =>
        sim.deactivateMerchantPolicy("attacker", MERCHANT_RETAIL),
      ).toThrow();
    });
  });

  describe("Zero-Knowledge Order Verification & Selective Disclosure", () => {
    it("verifies a compliant B2B order while keeping private age, KYC, credit limit, and invoice amount off-ledger", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantB2B",
        createFargoPrivateState({ secretKey: MERCHANT_B2B_SK_HELPER() }),
      );
      sim.upsertActor(
        "buyerAlice",
        createFargoPrivateState({
          secretKey: BUYER_ALICE_SK,
          buyerAge: 34,
          kycTier: 2, // Enterprise KYB
          creditLimit: 250_000n,
          orderAmount: 85_000n,
          orderSalt: SALT_1,
        }),
      );

      sim.registerMerchantPolicy(
        "merchantB2B",
        MERCHANT_B2B,
        21,
        2,
        50_000n,
      );

      const orderId = idFromLabel("order:PO-2026-9001");
      const { commitment, ledger: pubLedger } = sim.verifyCommerceOrder(
        "buyerAlice",
        MERCHANT_B2B,
        orderId,
      );

      expect(pubLedger.total_verified_orders).toBe(1n);
      expect(pubLedger.order_attestations.member(orderId)).toBe(true);

      const attestation = pubLedger.order_attestations.lookup(orderId);
      expect(attestation.status).toBe(OrderStatus.verified);
      expect(bytesToHex(attestation.commitment)).toBe(bytesToHex(commitment));
      expect(pubLedger.used_nullifiers.member(attestation.nullifier)).toBe(true);

      // Buyer private receipt recorded locally via witness
      const alicePrivate = sim.getActorPrivateState("buyerAlice");
      expect(alicePrivate.receipts).toHaveLength(1);
      expect(alicePrivate.receipts[0]?.commitmentHex).toBe(
        bytesToHex(commitment),
      );
    });

    it("produces unlinkable buyer pseudonyms across different merchants", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );
      sim.upsertActor(
        "merchantB",
        createFargoPrivateState({ secretKey: MERCHANT_B_SK }),
      );
      sim.upsertActor(
        "buyerAlice",
        createFargoPrivateState({
          secretKey: BUYER_ALICE_SK,
          buyerAge: 29,
          kycTier: 2,
          creditLimit: 100_000n,
          orderAmount: 5_000n,
          orderSalt: SALT_1,
        }),
      );

      sim.registerMerchantPolicy("merchantA", MERCHANT_RETAIL, 18, 1, 0);
      sim.registerMerchantPolicy("merchantB", MERCHANT_B2B, 18, 2, 10_000n);

      const order1 = idFromLabel("order:retail-101");
      const order2 = idFromLabel("order:b2b-202");

      sim.verifyCommerceOrder("buyerAlice", MERCHANT_RETAIL, order1);
      sim.verifyCommerceOrder("buyerAlice", MERCHANT_B2B, order2);

      const l = sim.getLedger();
      const att1 = l.order_attestations.lookup(order1);
      const att2 = l.order_attestations.lookup(order2);

      // Same buyer secret key yields distinct unlinkable pseudonyms per merchant!
      expect(bytesToHex(att1.buyer_pseudonym)).not.toBe(
        bytesToHex(att2.buyer_pseudonym),
      );
    });

    it("commitment hiding: distinct salts produce completely different commitments for identical order amounts", () => {
      const orderId = idFromLabel("order:same-payload");
      const c1 = pureCircuits.compute_order_commitment(
        MERCHANT_RETAIL,
        orderId,
        15_000n,
        2n,
        SALT_1,
      );
      const c2 = pureCircuits.compute_order_commitment(
        MERCHANT_RETAIL,
        orderId,
        15_000n,
        2n,
        SALT_2,
      );
      expect(bytesToHex(c1)).not.toBe(bytesToHex(c2));
    });
  });

  describe("Compliance & Solvency Constraint Enforcement (Negative Cases)", () => {
    it("rejects underage buyer in ZK circuit", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );
      sim.upsertActor(
        "underageBuyer",
        createFargoPrivateState({
          secretKey: BUYER_BOB_SK,
          buyerAge: 16,
          kycTier: 2,
          creditLimit: 20_000n,
          orderAmount: 500n,
        }),
      );

      sim.registerMerchantPolicy("merchantA", MERCHANT_RETAIL, 18, 1, 0);
      expect(() =>
        sim.verifyCommerceOrder(
          "underageBuyer",
          MERCHANT_RETAIL,
          idFromLabel("order:fail-age"),
        ),
      ).toThrow();
    });

    it("rejects buyer with insufficient Hybrid Identity KYC/KYB tier", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantB",
        createFargoPrivateState({ secretKey: MERCHANT_B_SK }),
      );
      sim.upsertActor(
        "unverifiedBuyer",
        createFargoPrivateState({
          secretKey: BUYER_BOB_SK,
          buyerAge: 30,
          kycTier: 1, // Individual KYC, but policy requires Tier 2 Enterprise KYB
          creditLimit: 100_000n,
          orderAmount: 10_000n,
        }),
      );

      sim.registerMerchantPolicy("merchantB", MERCHANT_B2B, 18, 2, 20_000n);
      expect(() =>
        sim.verifyCommerceOrder(
          "unverifiedBuyer",
          MERCHANT_B2B,
          idFromLabel("order:fail-kyc"),
        ),
      ).toThrow();
    });

    it("rejects order when amount exceeds buyer private credit limit or policy floor", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantB",
        createFargoPrivateState({ secretKey: MERCHANT_B_SK }),
      );
      sim.upsertActor(
        "overleveragedBuyer",
        createFargoPrivateState({
          secretKey: BUYER_BOB_SK,
          buyerAge: 40,
          kycTier: 2,
          creditLimit: 40_000n,
          orderAmount: 55_000n, // Exceeds 40,000 credit limit
        }),
      );

      sim.registerMerchantPolicy("merchantB", MERCHANT_B2B, 18, 2, 25_000n);
      expect(() =>
        sim.verifyCommerceOrder(
          "overleveragedBuyer",
          MERCHANT_B2B,
          idFromLabel("order:fail-credit"),
        ),
      ).toThrow();
    });

    it("rejects zero-amount orders and orders against deactivated merchant policies", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );
      sim.upsertActor(
        "zeroBuyer",
        createFargoPrivateState({
          secretKey: BUYER_ALICE_SK,
          buyerAge: 28,
          kycTier: 2,
          creditLimit: 50_000n,
          orderAmount: 0n,
        }),
      );

      sim.registerMerchantPolicy("merchantA", MERCHANT_RETAIL, 18, 1, 0);
      expect(() =>
        sim.verifyCommerceOrder(
          "zeroBuyer",
          MERCHANT_RETAIL,
          idFromLabel("order:zero"),
        ),
      ).toThrow();

      sim.upsertActor(
        "validBuyer",
        createFargoPrivateState({
          secretKey: BUYER_ALICE_SK,
          buyerAge: 28,
          kycTier: 2,
          creditLimit: 50_000n,
          orderAmount: 1_200n,
        }),
      );
      sim.deactivateMerchantPolicy("merchantA", MERCHANT_RETAIL);

      expect(() =>
        sim.verifyCommerceOrder(
          "validBuyer",
          MERCHANT_RETAIL,
          idFromLabel("order:inactive-policy"),
        ),
      ).toThrow();
    });

    it("prevents replay attacks on already-verified order IDs", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );
      sim.upsertActor(
        "buyerAlice",
        createFargoPrivateState({
          secretKey: BUYER_ALICE_SK,
          buyerAge: 26,
          kycTier: 1,
          creditLimit: 10_000n,
          orderAmount: 450n,
        }),
      );

      sim.registerMerchantPolicy("merchantA", MERCHANT_RETAIL, 18, 1, 0);
      const orderId = idFromLabel("order:replay-target");
      sim.verifyCommerceOrder("buyerAlice", MERCHANT_RETAIL, orderId);

      expect(() =>
        sim.verifyCommerceOrder("buyerAlice", MERCHANT_RETAIL, orderId),
      ).toThrow();
    });
  });

  describe("Merchant Settlement Lifecycle", () => {
    it("allows only the merchant owner to settle a verified order and blocks double-settlement", () => {
      const sim = new FargoSimulator();
      sim.upsertActor(
        "merchantA",
        createFargoPrivateState({ secretKey: MERCHANT_A_SK }),
      );
      sim.upsertActor(
        "attacker",
        createFargoPrivateState({ secretKey: ATTACKER_SK }),
      );
      sim.upsertActor(
        "buyerAlice",
        createFargoPrivateState({
          secretKey: BUYER_ALICE_SK,
          buyerAge: 31,
          kycTier: 2,
          creditLimit: 25_000n,
          orderAmount: 2_400n,
        }),
      );

      sim.registerMerchantPolicy("merchantA", MERCHANT_RETAIL, 18, 1, 1_000n);
      const orderId = idFromLabel("order:settle-001");
      sim.verifyCommerceOrder("buyerAlice", MERCHANT_RETAIL, orderId);

      // Attacker cannot settle
      expect(() => sim.settleVerifiedOrder("attacker", orderId)).toThrow();

      // Merchant owner settles in ZK
      const afterSettle = sim.settleVerifiedOrder("merchantA", orderId);
      expect(afterSettle.total_settled_orders).toBe(1n);
      expect(afterSettle.order_attestations.lookup(orderId).status).toBe(
        OrderStatus.settled,
      );

      // Cannot settle twice
      expect(() => sim.settleVerifiedOrder("merchantA", orderId)).toThrow();
    });
  });
});

function MERCHANT_B2B_SK_HELPER(): Uint8Array {
  return MERCHANT_B_SK;
}
