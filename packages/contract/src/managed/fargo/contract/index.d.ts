import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum OrderStatus { unverified = 0, verified = 1, settled = 2, revoked = 3
}

export type MerchantPolicy = { owner_pk: Uint8Array;
                               min_age: bigint;
                               required_kyc_tier: bigint;
                               min_credit_limit: bigint;
                               active: boolean
                             };

export type OrderAttestation = { merchant_id: Uint8Array;
                                 buyer_pseudonym: Uint8Array;
                                 commitment: Uint8Array;
                                 nullifier: Uint8Array;
                                 status: OrderStatus
                               };

export type Witnesses<PS> = {
  local_secret_key(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  private_buyer_age(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  private_kyc_tier(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  private_credit_limit(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  private_order_amount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  private_order_salt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  record_verified_receipt(context: __compactRuntime.WitnessContext<Ledger, PS>,
                          order_id_0: Uint8Array,
                          commitment_0: Uint8Array): [PS, []];
}

export type ImpureCircuits<PS> = {
  register_merchant_policy(context: __compactRuntime.CircuitContext<PS>,
                           merchant_id_0: Uint8Array,
                           min_age_0: bigint,
                           required_kyc_tier_0: bigint,
                           min_credit_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deactivate_merchant_policy(context: __compactRuntime.CircuitContext<PS>,
                             merchant_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verify_commerce_order(context: __compactRuntime.CircuitContext<PS>,
                        merchant_id_0: Uint8Array,
                        order_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  settle_verified_order(context: __compactRuntime.CircuitContext<PS>,
                        order_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  register_merchant_policy(context: __compactRuntime.CircuitContext<PS>,
                           merchant_id_0: Uint8Array,
                           min_age_0: bigint,
                           required_kyc_tier_0: bigint,
                           min_credit_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deactivate_merchant_policy(context: __compactRuntime.CircuitContext<PS>,
                             merchant_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verify_commerce_order(context: __compactRuntime.CircuitContext<PS>,
                        merchant_id_0: Uint8Array,
                        order_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  settle_verified_order(context: __compactRuntime.CircuitContext<PS>,
                        order_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  derive_public_key(sk_0: Uint8Array): Uint8Array;
  derive_buyer_pseudonym(sk_0: Uint8Array, merchant_id_0: Uint8Array): Uint8Array;
  compute_order_commitment(merchant_id_0: Uint8Array,
                           order_id_0: Uint8Array,
                           amount_0: bigint,
                           kyc_tier_0: bigint,
                           salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  derive_public_key(context: __compactRuntime.CircuitContext<PS>,
                    sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  derive_buyer_pseudonym(context: __compactRuntime.CircuitContext<PS>,
                         sk_0: Uint8Array,
                         merchant_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  compute_order_commitment(context: __compactRuntime.CircuitContext<PS>,
                           merchant_id_0: Uint8Array,
                           order_id_0: Uint8Array,
                           amount_0: bigint,
                           kyc_tier_0: bigint,
                           salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  register_merchant_policy(context: __compactRuntime.CircuitContext<PS>,
                           merchant_id_0: Uint8Array,
                           min_age_0: bigint,
                           required_kyc_tier_0: bigint,
                           min_credit_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deactivate_merchant_policy(context: __compactRuntime.CircuitContext<PS>,
                             merchant_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verify_commerce_order(context: __compactRuntime.CircuitContext<PS>,
                        merchant_id_0: Uint8Array,
                        order_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  settle_verified_order(context: __compactRuntime.CircuitContext<PS>,
                        order_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  merchant_policies: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): MerchantPolicy;
    [Symbol.iterator](): Iterator<[Uint8Array, MerchantPolicy]>
  };
  order_attestations: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): OrderAttestation;
    [Symbol.iterator](): Iterator<[Uint8Array, OrderAttestation]>
  };
  used_nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly total_merchants: bigint;
  readonly total_verified_orders: bigint;
  readonly total_settled_orders: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
