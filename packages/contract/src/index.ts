// SPDX-License-Identifier: Apache-2.0

export * as FargoContract from "./managed/fargo/contract/index.js";
export {
  FargoPrivateStateId,
  createFargoPrivateState,
  fargoWitnesses,
  type FargoPrivateState,
  type VerifiedOrderReceipt,
} from "./witnesses.js";
