import {
  FargoCommerceClient,
  type DualLedgerSnapshot,
  type FargoVerificationOutcome,
  type KycTierLevel,
  deriveSecretKeyFromSeed,
} from "@fargo/sdk";
import {
  CheckCircle2,
  Code2,
  EyeOff,
  FileCheck2,
  KeyRound,
  Layers,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

type ActiveTab = "checkout" | "policies" | "sdk";

interface MerchantAccount {
  readonly slug: string;
  readonly displayName: string;
  readonly secretSeed: string;
}

const DEFAULT_MERCHANTS: readonly MerchantAccount[] = [
  {
    slug: "anatolia-b2b-supply",
    displayName: "Anatolia Industrial Supply (B2B Net-30)",
    secretSeed: "merchant:anatolia-b2b-supply-v1",
  },
  {
    slug: "aura-regulated-retail",
    displayName: "Aura Regulated E-Commerce (Age 21+)",
    secretSeed: "merchant:aura-regulated-retail-v1",
  },
];

function shortHex(hex?: string): string {
  if (!hex) return "—";
  return `0x${hex.slice(0, 10)}…${hex.slice(-8)}`;
}

function createSeededClient(): FargoCommerceClient {
  const client = new FargoCommerceClient();

  client.registerOrUpdatePolicy({
    merchantSecretKey: deriveSecretKeyFromSeed(
      DEFAULT_MERCHANTS[0]!.secretSeed,
    ),
    merchantSlug: DEFAULT_MERCHANTS[0]!.slug,
    displayName: DEFAULT_MERCHANTS[0]!.displayName,
    minAge: 21,
    requiredKycTier: 2,
    minCreditLimit: 50_000,
  });

  client.registerOrUpdatePolicy({
    merchantSecretKey: deriveSecretKeyFromSeed(
      DEFAULT_MERCHANTS[1]!.secretSeed,
    ),
    merchantSlug: DEFAULT_MERCHANTS[1]!.slug,
    displayName: DEFAULT_MERCHANTS[1]!.displayName,
    minAge: 21,
    requiredKycTier: 1,
    minCreditLimit: 1_000,
  });

  // Seed one initial verified order so judges see live ledger state immediately
  client.verifyCheckoutOrder({
    buyerSecretKey: deriveSecretKeyFromSeed("buyer:marmara-manufacturing"),
    merchantSlug: "anatolia-b2b-supply",
    orderNumber: "PO-2026-4010",
    buyerAge: 36,
    kycTier: 2,
    creditLimit: 200_000,
    orderAmount: 58_000,
  });

  return client;
}

export function App() {
  const client = useMemo(() => createSeededClient(), []);
  const [ledgerView, setLedgerView] = useState<DualLedgerSnapshot>(() =>
    client.inspectDualLedger(),
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("checkout");
  const [walletStatus, setWalletStatus] = useState<string>(
    "Embedded Midnight Compact Runtime",
  );

  // Checkout Witness Form State
  const [merchantSlug, setMerchantSlug] = useState<string>(
    "anatolia-b2b-supply",
  );
  const [orderNumber, setOrderNumber] = useState<string>("PO-2026-7742");
  const [buyerSeed, setBuyerSeed] = useState<string>(
    "buyer:bosporus-trade-corp",
  );
  const [buyerAge, setBuyerAge] = useState<number>(34);
  const [kycTier, setKycTier] = useState<KycTierLevel>(2);
  const [creditLimit, setCreditLimit] = useState<number>(220_000);
  const [orderAmount, setOrderAmount] = useState<number>(68_500);
  const [lastOutcome, setLastOutcome] =
    useState<FargoVerificationOutcome | null>(null);

  // Merchant Policy Console State
  const [newMerchantSlug, setNewMerchantSlug] = useState<string>(
    "global-pharma-logistics",
  );
  const [newMerchantName, setNewMerchantName] = useState<string>(
    "Global Pharma Cold-Chain (Enterprise)",
  );
  const [newMerchantSeed, setNewMerchantSeed] = useState<string>(
    "merchant:global-pharma-v1",
  );
  const [newMinAge, setNewMinAge] = useState<number>(21);
  const [newKycTier, setNewKycTier] = useState<KycTierLevel>(2);
  const [newMinCredit, setNewMinCredit] = useState<number>(75_000);
  const [merchantSeedsBySlug, setMerchantSeedsBySlug] = useState<
    Record<string, string>
  >({
    "anatolia-b2b-supply": DEFAULT_MERCHANTS[0]!.secretSeed,
    "aura-regulated-retail": DEFAULT_MERCHANTS[1]!.secretSeed,
  });

  const selectedPolicy = ledgerView.policies.find(
    (p) => p.merchantSlug === merchantSlug,
  );

  function refreshLedger(): void {
    setLedgerView(client.inspectDualLedger());
  }

  async function handleConnectLace(): Promise<void> {
    const anyWin = window as unknown as {
      midnight?: { mnLace?: { enable?: () => Promise<unknown> } };
    };
    if (anyWin.midnight?.mnLace?.enable) {
      try {
        await anyWin.midnight.mnLace.enable();
        setWalletStatus("Lace Midnight Wallet Connected");
        return;
      } catch {
        setWalletStatus("Lace Prompt Declined — Local ZK Runtime Active");
        return;
      }
    }
    setWalletStatus("Local Midnight Compact v0.22 Runtime Active");
  }

  function applyPreset(preset: "b2b-valid" | "retail-valid" | "credit-fail") {
    setActiveTab("checkout");
    const suffix = Math.floor(1000 + Math.random() * 8999);
    if (preset === "b2b-valid") {
      setMerchantSlug("anatolia-b2b-supply");
      setOrderNumber(`PO-2026-${suffix}`);
      setBuyerSeed("buyer:bosporus-trade-corp");
      setBuyerAge(34);
      setKycTier(2);
      setCreditLimit(240_000);
      setOrderAmount(72_000);
    } else if (preset === "retail-valid") {
      setMerchantSlug("aura-regulated-retail");
      setOrderNumber(`ORD-2026-${suffix}`);
      setBuyerSeed("buyer:retail-shopper-ist");
      setBuyerAge(27);
      setKycTier(1);
      setCreditLimit(8_000);
      setOrderAmount(1_450);
    } else {
      setMerchantSlug("anatolia-b2b-supply");
      setOrderNumber(`PO-FAIL-${suffix}`);
      setBuyerSeed("buyer:under-collateralized-llc");
      setBuyerAge(29);
      setKycTier(2);
      setCreditLimit(40_000);
      setOrderAmount(95_000);
    }
  }

  function handleVerifyOrder(e: React.FormEvent): void {
    e.preventDefault();
    const outcome = client.verifyCheckoutOrder({
      buyerSecretKey: deriveSecretKeyFromSeed(buyerSeed),
      merchantSlug,
      orderNumber,
      buyerAge,
      kycTier,
      creditLimit,
      orderAmount,
    });
    setLastOutcome(outcome);
    refreshLedger();

    if (outcome.verified) {
      const nextNum = Math.floor(1000 + Math.random() * 8999);
      setOrderNumber(
        merchantSlug.includes("b2b") ? `PO-2026-${nextNum}` : `ORD-2026-${nextNum}`,
      );
    }
  }

  function handleSettleOrder(targetOrderNumber: string, slug: string): void {
    const seed = merchantSeedsBySlug[slug];
    if (!seed) return;
    client.settleOrder({
      merchantSecretKey: deriveSecretKeyFromSeed(seed),
      orderNumber: targetOrderNumber,
    });
    refreshLedger();
  }

  function handleRegisterPolicy(e: React.FormEvent): void {
    e.preventDefault();
    const cleanSlug = newMerchantSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleanSlug) return;

    client.registerOrUpdatePolicy({
      merchantSecretKey: deriveSecretKeyFromSeed(newMerchantSeed),
      merchantSlug: cleanSlug,
      displayName: newMerchantName.trim() || cleanSlug,
      minAge: newMinAge,
      requiredKycTier: newKycTier,
      minCreditLimit: newMinCredit,
    });

    setMerchantSeedsBySlug((prev) => ({
      ...prev,
      [cleanSlug]: newMerchantSeed,
    }));
    setMerchantSlug(cleanSlug);
    refreshLedger();
    setActiveTab("checkout");
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-mark">
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">
              FARGO
              <span className="badge badge-midnight">
                <Sparkles size={12} /> Midnight Compact v0.22
              </span>
            </div>
            <div className="brand-subtitle">
              Privacy-Preserving Commerce Infrastructure — Verify transactions.
              Protect business data.
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className="wallet-pill"
            onClick={handleConnectLace}
          >
            <span className="status-dot" />
            <Wallet size={15} />
            {walletStatus}
          </button>
        </div>
      </header>

      {/* Live Midnight Ledger Telemetry */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Registered Merchants</div>
          <div className="metric-value">{ledgerView.totalMerchants}</div>
          <div className="metric-foot">On-chain Compact policies</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">ZK-Verified Orders</div>
          <div className="metric-value">{ledgerView.totalVerifiedOrders}</div>
          <div className="metric-foot">0 bytes of PII or amounts leaked</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Merchant Settled</div>
          <div className="metric-value">{ledgerView.totalSettledOrders}</div>
          <div className="metric-foot">ZK owner-key authenticated</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Anti-Replay Nullifiers</div>
          <div className="metric-value">{ledgerView.activeNullifierCount}</div>
          <div className="metric-foot">
            Contract {shortHex(ledgerView.contractAddress)}
          </div>
        </div>
      </section>

      {/* Navigation & One-Click Judge Scenarios */}
      <div className="nav-row">
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "checkout" ? "active" : ""}`}
            onClick={() => setActiveTab("checkout")}
          >
            <ShoppingBag size={16} /> Checkout & Dual-Ledger
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "policies" ? "active" : ""}`}
            onClick={() => setActiveTab("policies")}
          >
            <Store size={16} /> Merchant Policy Console
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "sdk" ? "active" : ""}`}
            onClick={() => setActiveTab("sdk")}
          >
            <Code2 size={16} /> Plugin & API SDK
          </button>
        </div>

        <div className="preset-bar">
          <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
            Quick Test Scenarios:
          </span>
          <button
            type="button"
            className="preset-btn"
            onClick={() => applyPreset("b2b-valid")}
          >
            1. Valid B2B Net-30 ($72k)
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => applyPreset("retail-valid")}
          >
            2. Valid Age-Gated Retail
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => applyPreset("credit-fail")}
          >
            3. Exceed Credit Limit (Reject)
          </button>
        </div>
      </div>

      {/* TAB 1: Live Checkout + Dual-Ledger Inspector */}
      {activeTab === "checkout" && (
        <main className="workspace-grid">
          {/* Left: Buyer Checkout Plugin */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Lock size={18} color="#818cf8" /> FARGO Checkout Plugin
                  (Buyer Side)
                </h2>
                <p className="panel-desc">
                  Generates a Midnight Compact ZK proof locally. Sensitive
                  identity and credit figures never leave the buyer session.
                </p>
              </div>
              <span className="badge badge-private">
                <EyeOff size={12} /> Witness Protected
              </span>
            </div>

            <form onSubmit={handleVerifyOrder}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="merchant-select">
                    Target E-Commerce / B2B Merchant
                  </label>
                  <select
                    id="merchant-select"
                    value={merchantSlug}
                    onChange={(e) => setMerchantSlug(e.target.value)}
                  >
                    {ledgerView.policies.map((pol) => (
                      <option key={pol.merchantSlug} value={pol.merchantSlug}>
                        {pol.displayName} ({pol.active ? "Active" : "Inactive"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="order-number">Public Order Reference</label>
                  <input
                    id="order-number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="buyer-seed">
                    Buyer Wallet Secret Seed
                    <span className="badge badge-private">Private</span>
                  </label>
                  <input
                    id="buyer-seed"
                    value={buyerSeed}
                    onChange={(e) => setBuyerSeed(e.target.value)}
                    required
                  />
                </div>
              </div>

              {selectedPolicy && (
                <div className="policy-hint">
                  <span>
                    <strong>Merchant Policy Rules:</strong>
                  </span>
                  <span>Min Age: {selectedPolicy.minAge}+</span>
                  <span>Required KYC/KYB Tier: {selectedPolicy.requiredKycTier}</span>
                  <span>
                    Credit Floor: $
                    {Number(selectedPolicy.minCreditLimit).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="vault-box">
                <div className="vault-header">
                  <span>
                    Hybrid Identity & B2B Solvency Vault (Local ZK Witnesses)
                  </span>
                  <KeyRound size={15} />
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="buyer-age">
                      Verified Buyer Age
                      <span className="mono">witness</span>
                    </label>
                    <input
                      id="buyer-age"
                      type="number"
                      min={1}
                      max={120}
                      value={buyerAge}
                      onChange={(e) => setBuyerAge(Number(e.target.value))}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="kyc-tier">
                      Hybrid Identity Tier
                      <span className="mono">witness</span>
                    </label>
                    <select
                      id="kyc-tier"
                      value={kycTier}
                      onChange={(e) =>
                        setKycTier(Number(e.target.value) as KycTierLevel)
                      }
                    >
                      <option value={0}>Tier 0 — Unverified Guest</option>
                      <option value={1}>Tier 1 — Individual KYC Verified</option>
                      <option value={2}>Tier 2 — Enterprise KYB Verified</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="credit-limit">
                      Approved Credit Facility (USD)
                      <span className="mono">witness</span>
                    </label>
                    <input
                      id="credit-limit"
                      type="number"
                      min={0}
                      step={500}
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="order-amount">
                      Confidential Invoice Total (USD)
                      <span className="mono">witness</span>
                    </label>
                    <input
                      id="order-amount"
                      type="number"
                      min={0}
                      step={100}
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="primary-btn">
                <ShieldCheck size={18} />
                Execute Compact ZK Circuit & Verify Order
              </button>
            </form>
          </section>

          {/* Right: Midnight Dual-Ledger & Merchant View */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Layers size={18} color="#22d3ee" /> Midnight Dual-Ledger
                  Inspector (Merchant View)
                </h2>
                <p className="panel-desc">
                  Merchants receive mathematical certainty of compliance and
                  solvency without storing toxic customer PII or competitor
                  pricing.
                </p>
              </div>
            </div>

            {lastOutcome && (
              <div
                className={`outcome-banner ${lastOutcome.verified ? "ok" : "err"}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {lastOutcome.verified ? (
                      <>
                        <CheckCircle2 size={17} color="#34d399" />
                        ZK Proof Accepted — Order {lastOutcome.orderNumber} Attested
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={17} color="#fb7185" />
                        Compact Circuit Rejected Order {lastOutcome.orderNumber}
                      </>
                    )}
                  </span>
                  <span className="mono">{lastOutcome.executionTimeMs} ms</span>
                </div>
                {lastOutcome.verified ? (
                  <div
                    className="mono"
                    style={{
                      marginTop: 6,
                      fontSize: "0.75rem",
                      color: "#a7f3d0",
                    }}
                  >
                    Commitment: {shortHex(lastOutcome.commitmentHex)} | Nullifier:{" "}
                    {shortHex(lastOutcome.nullifierHex)}
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: "0.8rem",
                      color: "#fda4af",
                    }}
                  >
                    Circuit Constraint Failed: {lastOutcome.errorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Dual-State Side-by-Side Comparison */}
            <div className="dual-compare">
              <div className="compare-col">
                <h4>Private State (Hidden from Merchant)</h4>
                <div className="kv-row">
                  <span>Customer Exact Age</span>
                  <span className="redacted">████████ (ZK Hidden)</span>
                </div>
                <div className="kv-row">
                  <span>KYC / KYB Identity File</span>
                  <span className="redacted">████████ (ZK Hidden)</span>
                </div>
                <div className="kv-row">
                  <span>B2B Credit Line Balance</span>
                  <span className="redacted">████████ (ZK Hidden)</span>
                </div>
                <div className="kv-row">
                  <span>Confidential Invoice Amount</span>
                  <span className="redacted">████████ (ZK Hidden)</span>
                </div>
              </div>

              <div className="compare-col">
                <h4>Midnight Public Ledger (Disclosed)</h4>
                <div className="kv-row">
                  <span>Policy Rules Met</span>
                  <span style={{ color: "#34d399", fontWeight: 600 }}>
                    Cryptographically Proven
                  </span>
                </div>
                <div className="kv-row">
                  <span>Buyer Pseudonym</span>
                  <span className="mono">
                    {shortHex(
                      ledgerView.attestations[0]?.buyerPseudonymHex,
                    )}
                  </span>
                </div>
                <div className="kv-row">
                  <span>Order Commitment</span>
                  <span className="mono">
                    {shortHex(ledgerView.attestations[0]?.commitmentHex)}
                  </span>
                </div>
                <div className="kv-row">
                  <span>Anti-Replay Nullifier</span>
                  <span className="mono">
                    {shortHex(ledgerView.attestations[0]?.nullifierHex)}
                  </span>
                </div>
              </div>
            </div>

            <h3
              style={{
                fontSize: "0.86rem",
                fontWeight: 700,
                marginBottom: 10,
                color: "var(--text-secondary)",
              }}
            >
              On-Chain Order Attestations ({ledgerView.attestations.length})
            </h3>

            <div className="attestation-list">
              {ledgerView.attestations.map((att) => (
                <div key={att.orderIdHex} className="attestation-card">
                  <div className="att-top">
                    <div>
                      <strong>{att.orderNumber}</strong>{" "}
                      <span
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        → {att.merchantSlug}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className={`badge ${
                          att.status === "settled"
                            ? "badge-settled"
                            : "badge-verified"
                        }`}
                      >
                        <FileCheck2 size={12} /> {att.status.toUpperCase()}
                      </span>
                      {att.status === "verified" &&
                        merchantSeedsBySlug[att.merchantSlug] && (
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() =>
                              handleSettleOrder(
                                att.orderNumber,
                                att.merchantSlug,
                              )
                            }
                          >
                            Settle Order (ZK Auth)
                          </button>
                        )}
                    </div>
                  </div>
                  <div
                    className="mono"
                    style={{ color: "var(--text-muted)", fontSize: "0.73rem" }}
                  >
                    Commitment: {shortHex(att.commitmentHex)} · Pseudonym:{" "}
                    {shortHex(att.buyerPseudonymHex)} · Nullifier:{" "}
                    {shortHex(att.nullifierHex)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* TAB 2: Merchant Policy Console */}
      {activeTab === "policies" && (
        <main className="workspace-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Store size={18} color="#818cf8" /> Register / Update Merchant
                  Policy
                </h2>
                <p className="panel-desc">
                  Calls the compiled{" "}
                  <code className="mono">register_merchant_policy</code> Compact
                  circuit. Ownership is bound to your derived ZK public key.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterPolicy}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="m-slug">Merchant Identifier Slug</label>
                  <input
                    id="m-slug"
                    value={newMerchantSlug}
                    onChange={(e) => setNewMerchantSlug(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="m-name">Storefront / Enterprise Name</label>
                  <input
                    id="m-name"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                    required
                  />
                </div>
                <div className="field full">
                  <label htmlFor="m-seed">
                    Merchant Owner Secret Key Seed (ZK Witness)
                  </label>
                  <input
                    id="m-seed"
                    value={newMerchantSeed}
                    onChange={(e) => setNewMerchantSeed(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="m-age">Minimum Buyer Age</label>
                  <input
                    id="m-age"
                    type="number"
                    min={0}
                    max={100}
                    value={newMinAge}
                    onChange={(e) => setNewMinAge(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="m-kyc">Required KYC/KYB Tier</label>
                  <select
                    id="m-kyc"
                    value={newKycTier}
                    onChange={(e) =>
                      setNewKycTier(Number(e.target.value) as KycTierLevel)
                    }
                  >
                    <option value={0}>Tier 0 — Open</option>
                    <option value={1}>Tier 1 — Individual KYC</option>
                    <option value={2}>Tier 2 — Enterprise KYB</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="m-credit">
                    Minimum Credit Facility Floor (USD)
                  </label>
                  <input
                    id="m-credit"
                    type="number"
                    min={0}
                    step={1000}
                    value={newMinCredit}
                    onChange={(e) => setNewMinCredit(Number(e.target.value))}
                  />
                </div>
              </div>

              <button type="submit" className="primary-btn">
                <Sparkles size={17} /> Publish Policy to Midnight Ledger
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Active On-Chain Policies</h2>
                <p className="panel-desc">
                  Live state read directly from{" "}
                  <code className="mono">ledger.merchant_policies</code>.
                </p>
              </div>
            </div>

            <div className="attestation-list">
              {ledgerView.policies.map((pol) => (
                <div key={pol.merchantIdHex} className="attestation-card">
                  <div className="att-top">
                    <strong>{pol.displayName}</strong>
                    <span
                      className={`badge ${
                        pol.active ? "badge-verified" : "badge-rejected"
                      }`}
                    >
                      {pol.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      marginBottom: 6,
                    }}
                  >
                    Slug: <code className="mono">{pol.merchantSlug}</code> · Min
                    Age: {pol.minAge}+ · Tier: {pol.requiredKycTier} · Credit
                    Floor: ${Number(pol.minCreditLimit).toLocaleString()}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}
                  >
                    Owner PK: {shortHex(pol.ownerPublicKeyHex)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* TAB 3: Plugin & SDK Integration Hub */}
      {activeTab === "sdk" && (
        <main className="workspace-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Code2 size={18} color="#22d3ee" /> Drop-In E-Commerce Plugin
                  SDK
                </h2>
                <p className="panel-desc">
                  Integrate Midnight zero-knowledge verification into Shopify,
                  WooCommerce, Magento, or custom B2B ERPs without migrating
                  existing databases.
                </p>
              </div>
            </div>

            <pre className="code-block">
              {client.generatePluginSnippet(merchantSlug)}
            </pre>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">FARGO Three-Pillar Architecture</h2>
                <p className="panel-desc">
                  How FARGO bridges Web2 commerce platforms with Midnight
                  programmable data protection.
                </p>
              </div>
            </div>

            <div className="attestation-list">
              <div className="attestation-card">
                <strong>1. Non-Intrusive Plugin & API Layer</strong>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Merchants keep their existing checkout, ERP, and payment rails.
                  FARGO attaches cryptographic order commitments via{" "}
                  <code className="mono">@fargo/sdk</code>.
                </p>
              </div>
              <div className="attestation-card">
                <strong>2. Hybrid Identity & B2B Credit Witnesses</strong>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Off-chain KYC/KYB attestations and corporate credit lines feed
                  into private Compact witnesses — proving eligibility without
                  exposing identity documents or invoice totals.
                </p>
              </div>
              <div className="attestation-card">
                <strong>3. Midnight Dual-Ledger & Replay Nullifiers</strong>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Public state stores only merchant rules, unlinkable buyer
                  pseudonyms, Pedersen/persistent commitments, and spent
                  nullifiers to prevent double-use.
                </p>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
