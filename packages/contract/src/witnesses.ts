// SPDX-License-Identifier: Apache-2.0

export const FargoPrivateStateId = "fargoPrivateState" as const;

export interface VerifiedOrderReceipt {
  readonly orderIdHex: string;
  readonly commitmentHex: string;
}

export interface FargoPrivateState {
  readonly secretKey: Uint8Array;
  readonly buyerAge: bigint;
  readonly kycTier: bigint;
  readonly creditLimit: bigint;
  readonly orderAmount: bigint;
  readonly orderSalt: Uint8Array;
  readonly credentialSalt: Uint8Array;
  readonly receipts: readonly VerifiedOrderReceipt[];
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createFargoPrivateState(params: {
  secretKey: Uint8Array;
  buyerAge?: number | bigint;
  kycTier?: number | bigint;
  creditLimit?: number | bigint;
  orderAmount?: number | bigint;
  orderSalt?: Uint8Array;
  credentialSalt?: Uint8Array;
  receipts?: readonly VerifiedOrderReceipt[];
}): FargoPrivateState {
  if (params.secretKey.length !== 32) {
    throw new Error("secretKey must be exactly 32 bytes");
  }
  const salt = params.orderSalt ?? new Uint8Array(32).fill(0x42);
  if (salt.length !== 32) {
    throw new Error("orderSalt must be exactly 32 bytes");
  }
  const credSalt = params.credentialSalt ?? new Uint8Array(32).fill(0x7c);
  if (credSalt.length !== 32) {
    throw new Error("credentialSalt must be exactly 32 bytes");
  }
  return {
    secretKey: params.secretKey,
    buyerAge: BigInt(params.buyerAge ?? 25),
    kycTier: BigInt(params.kycTier ?? 1),
    creditLimit: BigInt(params.creditLimit ?? 50_000n),
    orderAmount: BigInt(params.orderAmount ?? 1_000n),
    orderSalt: salt,
    credentialSalt: credSalt,
    receipts: params.receipts ?? [],
  };
}

type WitnessCtx = { readonly privateState: FargoPrivateState };

export const fargoWitnesses = {
  local_secret_key: (ctx: WitnessCtx): [FargoPrivateState, Uint8Array] => [
    ctx.privateState,
    ctx.privateState.secretKey,
  ],
  private_buyer_age: (ctx: WitnessCtx): [FargoPrivateState, bigint] => [
    ctx.privateState,
    ctx.privateState.buyerAge,
  ],
  private_kyc_tier: (ctx: WitnessCtx): [FargoPrivateState, bigint] => [
    ctx.privateState,
    ctx.privateState.kycTier,
  ],
  private_credit_limit: (ctx: WitnessCtx): [FargoPrivateState, bigint] => [
    ctx.privateState,
    ctx.privateState.creditLimit,
  ],
  private_order_amount: (ctx: WitnessCtx): [FargoPrivateState, bigint] => [
    ctx.privateState,
    ctx.privateState.orderAmount,
  ],
  private_order_salt: (ctx: WitnessCtx): [FargoPrivateState, Uint8Array] => [
    ctx.privateState,
    ctx.privateState.orderSalt,
  ],
  private_credential_salt: (ctx: WitnessCtx): [FargoPrivateState, Uint8Array] => [
    ctx.privateState,
    ctx.privateState.credentialSalt,
  ],
  record_verified_receipt: (
    ctx: WitnessCtx,
    orderId: Uint8Array,
    commitment: Uint8Array,
  ): [FargoPrivateState, []] => [
    {
      ...ctx.privateState,
      receipts: [
        ...ctx.privateState.receipts,
        {
          orderIdHex: bytesToHex(orderId),
          commitmentHex: bytesToHex(commitment),
        },
      ],
    },
    [],
  ],
};
