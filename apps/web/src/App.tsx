import {
  FargoCommerceClient,
  type DualLedgerSnapshot,
  type FargoVerificationOutcome,
  type KycTierLevel,
  type SignedFargoWebhook,
  createSignedFargoWebhook,
  deriveSecretKeyFromSeed,
} from "@fargo/sdk";
import {
  ArrowRight,
  Building2,
  Check,
  Code2,
  Copy,
  EyeOff,
  FileCheck2,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

type ActiveTab = "checkout" | "policies" | "sdk";
type SdkPlatform = "shopify" | "woocommerce" | "erp-rest";

interface MerchantAccount {
  readonly slug: string;
  readonly displayName: string;
  readonly secretSeed: string;
  readonly sampleItem: string;
  readonly sampleTerms: string;
}

const DEFAULT_MERCHANTS: readonly MerchantAccount[] = [
  {
    slug: "anatolia-b2b-supply",
    displayName: "Anatolia Industrial Supply Co.",
    secretSeed: "merchant:anatolia-b2b-supply-v1",
    sampleItem: "Batch #408 — Precision CNC Titanium Fasteners (400 Units)",
    sampleTerms: "Net-30 Enterprise Trade Credit · KYB Tier 2 Required",
  },
  {
    slug: "aura-regulated-retail",
    displayName: "Aura Reserve & Regulated Goods",
    secretSeed: "merchant:aura-regulated-retail-v1",
    sampleItem: "Collector Cellar Allocation — Vintage Reserve Case",
    sampleTerms: "Direct Retail Checkout · Statutory Age 21+ & KYC Tier 1",
  },
];

function shortHex(hex?: string): string {
  if (!hex) return "—";
  return `0x${hex.slice(0, 8)}…${hex.slice(-6)}`;
}

function createSeededClient(): FargoCommerceClient {
  const client = new FargoCommerceClient();

  for (const m of DEFAULT_MERCHANTS) {
    client.registerOrUpdatePolicy({
      merchantSecretKey: deriveSecretKeyFromSeed(m.secretSeed),
      merchantSlug: m.slug,
      displayName: m.displayName,
      minAge: 21,
      requiredKycTier: m.slug.includes("b2b") ? 2 : 1,
      minCreditLimit: m.slug.includes("b2b") ? 50_000 : 1_000,
    });
  }

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
  const [sdkPlatform, setSdkPlatform] = useState<SdkPlatform>("shopify");
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [walletStatus, setWalletStatus] = useState<string>(
    "Midnight Compact Runtime · Active",
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
  const [lastWebhook, setLastWebhook] = useState<SignedFargoWebhook | null>(
    null,
  );
  const [showWebhookModal, setShowWebhookModal] = useState<boolean>(false);

  // Merchant Policy Console State
  const [newMerchantSlug, setNewMerchantSlug] = useState<string>(
    "aegean-medical-logistics",
  );
  const [newMerchantName, setNewMerchantName] = useState<string>(
    "Aegean Cold-Chain Pharma Supply",
  );
  const [newMerchantSeed, setNewMerchantSeed] = useState<string>(
    "merchant:aegean-pharma-v1",
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
  const merchantMeta = DEFAULT_MERCHANTS.find((m) => m.slug === merchantSlug);

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
        setWalletStatus("Lace Midnight Wallet · Connected");
        return;
      } catch {
        setWalletStatus("Local Compact WASM Prover · Active");
        return;
      }
    }
    setWalletStatus("Local Compact v0.22 Engine · Verified");
  }

  function applyPreset(preset: "b2b-valid" | "retail-valid" | "credit-fail") {
    setActiveTab("checkout");
    setShowWebhookModal(false);
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
      setBuyerSeed("buyer:istanbul-private-client");
      setBuyerAge(28);
      setKycTier(1);
      setCreditLimit(12_000);
      setOrderAmount(1_450);
    } else {
      setMerchantSlug("anatolia-b2b-supply");
      setOrderNumber(`PO-DECLINE-${suffix}`);
      setBuyerSeed("buyer:under-limit-account");
      setBuyerAge(29);
      setKycTier(2);
      setCreditLimit(40_000);
      setOrderAmount(95_000);
    }
  }

  async function handleVerifyOrder(e: React.FormEvent): Promise<void> {
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

    if (outcome.verified && outcome.commitmentHex && outcome.nullifierHex && outcome.buyerPseudonymHex) {
      const signed = await createSignedFargoWebhook(
        {
          eventId: `evt_${outcome.orderIdHex.slice(0, 14)}`,
          eventType: "fargo.order.verified",
          issuedAt: new Date().toISOString(),
          merchantSlug,
          orderNumber: outcome.orderNumber,
          midnightProof: {
            contractAddress: String(client.contractAddress),
            commitmentHex: outcome.commitmentHex,
            nullifierHex: outcome.nullifierHex,
            buyerPseudonymHex: outcome.buyerPseudonymHex,
          },
          redactedComplianceSummary: {
            ageRequirementMet: true,
            kycTierRequirementMet: true,
            creditSolvencyMet: true,
            rawPiiDisclosed: false,
          },
        },
        "whsec_fargo_enterprise_2026",
      );
      setLastWebhook(signed);

      const nextNum = Math.floor(1000 + Math.random() * 8999);
      setOrderNumber(
        merchantSlug.includes("b2b") ? `PO-2026-${nextNum}` : `ORD-2026-${nextNum}`,
      );
    } else {
      setLastWebhook(null);
      setShowWebhookModal(false);
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

  async function handleCopyCode(): Promise<void> {
    const text = client.generatePluginSnippet(merchantSlug, sdkPlatform);
    await navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 1800);
  }

  return (
    <div className="app-shell">
      {/* Editorial Header */}
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-title-row">
              <span className="brand-wordmark">FARGO</span>
              <span className="brand-edition">
                MIDNIGHT COMPACT · DUAL-LEDGER PROTOCOL
              </span>
            </div>
            <p className="brand-tagline">
              Privacy-Preserving Commerce Infrastructure — Verify transactions.
              Protect business data.
            </p>
          </div>
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className="runtime-btn"
            onClick={handleConnectLace}
          >
            <span className="status-indicator" />
            <Wallet size={14} />
            {walletStatus}
          </button>
        </div>
      </header>

      {/* Ledger Summary Strip */}
      <section className="metrics-strip">
        <div className="metric-cell">
          <div className="metric-label">Active Merchant Policies</div>
          <div className="metric-value">{ledgerView.totalMerchants}</div>
          <div className="metric-sub">Registered on Midnight ledger</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">ZK-Attested Orders</div>
          <div className="metric-value">{ledgerView.totalVerifiedOrders}</div>
          <div className="metric-sub">Zero PII or invoice values exposed</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Settled Transactions</div>
          <div className="metric-value">{ledgerView.totalSettledOrders}</div>
          <div className="metric-sub">Authenticated via owner ZK key</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">Spent Replay Nullifiers</div>
          <div className="metric-value">{ledgerView.activeNullifierCount}</div>
          <div className="metric-sub">
            Contract {shortHex(ledgerView.contractAddress)}
          </div>
        </div>
      </section>

      {/* Navigation & Quick Presets */}
      <div className="toolbar-row">
        <nav className="nav-tabs" aria-label="Workspace Sections">
          <button
            type="button"
            className={`nav-tab ${activeTab === "checkout" ? "active" : ""}`}
            onClick={() => setActiveTab("checkout")}
          >
            <ShieldCheck size={15} /> Checkout & Ledger Audit
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "policies" ? "active" : ""}`}
            onClick={() => setActiveTab("policies")}
          >
            <SlidersHorizontal size={15} /> Merchant Policy Rules
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "sdk" ? "active" : ""}`}
            onClick={() => setActiveTab("sdk")}
          >
            <Code2 size={15} /> Plugin & REST Gateway
          </button>
        </nav>

        <div className="scenario-group">
          <span className="scenario-label">Test Presets:</span>
          <button
            type="button"
            className="scenario-chip"
            onClick={() => applyPreset("b2b-valid")}
          >
            B2B Net-30 ($72,000)
          </button>
          <button
            type="button"
            className="scenario-chip"
            onClick={() => applyPreset("retail-valid")}
          >
            Regulated Retail (21+)
          </button>
          <button
            type="button"
            className="scenario-chip danger-chip"
            onClick={() => applyPreset("credit-fail")}
          >
            Over Credit Limit (Decline)
          </button>
        </div>
      </div>

      {/* TAB 1: Live Checkout + Dual-Ledger Audit */}
      {activeTab === "checkout" && (
        <main className="workspace-grid">
          {/* Left Column: Buyer Checkout Module */}
          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">01 · Buyer Session</div>
                <h2 className="card-title">
                  Storefront Checkout — FARGO Compliance Plugin
                </h2>
                <p className="card-desc">
                  Proves buyer eligibility and credit solvency inside a local
                  Compact circuit before transmitting only a sealed commitment.
                </p>
              </div>
              <span className="tag tag-witness">
                <EyeOff size={12} /> Local Witness
              </span>
            </div>

            <div className="invoice-preview">
              <div>
                <div className="invoice-item-title">
                  {merchantMeta?.sampleItem ??
                    "Enterprise Commercial Purchase Order"}
                </div>
                <div className="invoice-item-meta">
                  {merchantMeta?.sampleTerms ??
                    "Verified via Midnight Selective Disclosure"}
                </div>
              </div>
              <Building2 size={20} color="#9e2323" />
            </div>

            <form onSubmit={handleVerifyOrder}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="merchant-select">
                    Counterparty Merchant / Platform
                  </label>
                  <select
                    id="merchant-select"
                    value={merchantSlug}
                    onChange={(e) => setMerchantSlug(e.target.value)}
                  >
                    {ledgerView.policies.map((pol) => (
                      <option key={pol.merchantSlug} value={pol.merchantSlug}>
                        {pol.displayName} ({pol.active ? "Active Policy" : "Paused"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="order-number">Order / Invoice Reference</label>
                  <input
                    id="order-number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="buyer-seed">
                    Buyer Signing Key Seed
                    <span className="mono" style={{ color: "var(--ochre)" }}>
                      private
                    </span>
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
                <div className="policy-bar">
                  <span>
                    <strong>Required Policy:</strong>
                  </span>
                  <span>Age {selectedPolicy.minAge}+</span>
                  <span>KYC/KYB Tier {selectedPolicy.requiredKycTier}</span>
                  <span>
                    Credit Floor $
                    {Number(selectedPolicy.minCreditLimit).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="witness-vault">
                <div className="witness-vault-head">
                  <span>
                    Confidential Buyer Credentials (Never Sent to Merchant)
                  </span>
                  <KeyRound size={14} />
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="buyer-age">
                      Verified Age
                      <span className="mono">Uint&lt;16&gt;</span>
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
                      Hybrid Identity Credential
                      <span className="mono">Uint&lt;8&gt;</span>
                    </label>
                    <select
                      id="kyc-tier"
                      value={kycTier}
                      onChange={(e) =>
                        setKycTier(Number(e.target.value) as KycTierLevel)
                      }
                    >
                      <option value={0}>Tier 0 — Unverified Guest</option>
                      <option value={1}>Tier 1 — Individual KYC</option>
                      <option value={2}>Tier 2 — Corporate KYB</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="credit-limit">
                      Approved Credit Line (USD)
                      <span className="mono">Uint&lt;64&gt;</span>
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
                      Order / Invoice Total (USD)
                      <span className="mono">Uint&lt;64&gt;</span>
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

              <button type="submit" className="btn-crimson">
                <Lock size={16} />
                Verify Compliance & Issue Midnight ZK Attestation
                <ArrowRight size={16} />
              </button>
            </form>
          </section>

          {/* Right Column: Merchant & Public Ledger Inspector */}
          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">02 · Counterparty & Ledger View</div>
                <h2 className="card-title">
                  Midnight Dual-Ledger Audit & Settlement
                </h2>
                <p className="card-desc">
                  Demonstrates selective disclosure: the merchant confirms
                  compliance mathematically while sensitive figures stay masked.
                </p>
              </div>
              {lastWebhook && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowWebhookModal((v) => !v)}
                >
                  {showWebhookModal ? "Hide Webhook" : "Inspect Signed Webhook"}
                </button>
              )}
            </div>

            {lastOutcome && (
              <div
                className={`result-banner ${lastOutcome.verified ? "ok" : "err"}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontWeight: 700,
                    fontSize: "0.87rem",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {lastOutcome.verified ? (
                      <>
                        <ShieldCheck size={17} />
                        Attestation Recorded — {lastOutcome.orderNumber}
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={17} />
                        Verification Declined — {lastOutcome.orderNumber}
                      </>
                    )}
                  </span>
                  <span className="mono">{lastOutcome.executionTimeMs} ms</span>
                </div>
                {lastOutcome.verified ? (
                  <div className="mono" style={{ marginTop: 5, fontSize: "0.73rem" }}>
                    Commitment: {shortHex(lastOutcome.commitmentHex)} · Nullifier:{" "}
                    {shortHex(lastOutcome.nullifierHex)}
                  </div>
                ) : (
                  <div style={{ marginTop: 5, fontSize: "0.8rem" }}>
                    Compact Assertion: {lastOutcome.errorMessage}
                  </div>
                )}
              </div>
            )}

            {showWebhookModal && lastWebhook && (
              <div style={{ marginBottom: 16 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--crimson)",
                    marginBottom: 5,
                    fontWeight: 600,
                  }}
                >
                  X-Fargo-Signature: {lastWebhook.signatureHeader.slice(0, 42)}…
                </div>
                <pre className="code-surface" style={{ maxHeight: 190 }}>
                  {JSON.stringify(lastWebhook.payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Side-by-Side State Separation */}
            <div className="ledger-matrix">
              <div className="matrix-box">
                <h4>Private Witness (Withheld)</h4>
                <div className="kv-line">
                  <span>Buyer Birthdate / Age</span>
                  <span className="masked-pill">REDACTED</span>
                </div>
                <div className="kv-line">
                  <span>KYC / KYB Dossier</span>
                  <span className="masked-pill">REDACTED</span>
                </div>
                <div className="kv-line">
                  <span>Credit Facility Limit</span>
                  <span className="masked-pill">REDACTED</span>
                </div>
                <div className="kv-line">
                  <span>Invoice Dollar Amount</span>
                  <span className="masked-pill">REDACTED</span>
                </div>
              </div>

              <div className="matrix-box">
                <h4>Public Ledger (Disclosed)</h4>
                <div className="kv-line">
                  <span>Policy Proof</span>
                  <strong style={{ color: "var(--forest)", fontSize: "0.77rem" }}>
                    VALIDATED
                  </strong>
                </div>
                <div className="kv-line">
                  <span>Pseudonym</span>
                  <span className="mono">
                    {shortHex(ledgerView.attestations[0]?.buyerPseudonymHex)}
                  </span>
                </div>
                <div className="kv-line">
                  <span>Commitment</span>
                  <span className="mono">
                    {shortHex(ledgerView.attestations[0]?.commitmentHex)}
                  </span>
                </div>
                <div className="kv-line">
                  <span>Nullifier</span>
                  <span className="mono">
                    {shortHex(ledgerView.attestations[0]?.nullifierHex)}
                  </span>
                </div>
              </div>
            </div>

            <div className="records-header">
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--ink-primary)",
                }}
              >
                Verified Ledger Attestations ({ledgerView.attestations.length})
              </span>
              <span className="mono" style={{ color: "var(--ink-muted)" }}>
                ledger.order_attestations
              </span>
            </div>

            <div className="records-list">
              {ledgerView.attestations.map((att) => (
                <div key={att.orderIdHex} className="record-item">
                  <div className="record-top">
                    <div>
                      <strong style={{ fontSize: "0.88rem" }}>
                        {att.orderNumber}
                      </strong>{" "}
                      <span
                        style={{
                          fontSize: "0.77rem",
                          color: "var(--ink-secondary)",
                        }}
                      >
                        · {att.merchantSlug}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className={`tag ${
                          att.status === "settled"
                            ? "tag-settled"
                            : "tag-verified"
                        }`}
                      >
                        <FileCheck2 size={11} /> {att.status.toUpperCase()}
                      </span>
                      {att.status === "verified" &&
                        merchantSeedsBySlug[att.merchantSlug] && (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() =>
                              handleSettleOrder(
                                att.orderNumber,
                                att.merchantSlug,
                              )
                            }
                          >
                            Settle Order
                          </button>
                        )}
                    </div>
                  </div>
                  <div className="mono" style={{ color: "var(--ink-muted)" }}>
                    Commit {shortHex(att.commitmentHex)} · Buyer{" "}
                    {shortHex(att.buyerPseudonymHex)} · Nullifier{" "}
                    {shortHex(att.nullifierHex)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* TAB 2: Merchant Policy Rules */}
      {activeTab === "policies" && (
        <main className="workspace-grid">
          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">Governance & Compliance</div>
                <h2 className="card-title">Register or Update Merchant Policy</h2>
                <p className="card-desc">
                  Executes <code className="mono">register_merchant_policy</code>{" "}
                  on Midnight. Only the holder of the merchant secret key can
                  modify rules.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterPolicy}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="m-slug">Merchant Slug</label>
                  <input
                    id="m-slug"
                    value={newMerchantSlug}
                    onChange={(e) => setNewMerchantSlug(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="m-name">Business Legal / Display Name</label>
                  <input
                    id="m-name"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                    required
                  />
                </div>
                <div className="field full">
                  <label htmlFor="m-seed">
                    Merchant Owner Secret Seed (ZK Witness)
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
                  <label htmlFor="m-kyc">Required Identity Tier</label>
                  <select
                    id="m-kyc"
                    value={newKycTier}
                    onChange={(e) =>
                      setNewKycTier(Number(e.target.value) as KycTierLevel)
                    }
                  >
                    <option value={0}>Tier 0 — Open Access</option>
                    <option value={1}>Tier 1 — Individual KYC</option>
                    <option value={2}>Tier 2 — Corporate KYB</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="m-credit">
                    Minimum Credit Line Requirement (USD)
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

              <button type="submit" className="btn-crimson">
                Publish Policy to Midnight Ledger
              </button>
            </form>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">On-Chain Registry</div>
                <h2 className="card-title">Registered Merchant Policies</h2>
                <p className="card-desc">
                  Queried directly from{" "}
                  <code className="mono">ledger.merchant_policies</code>.
                </p>
              </div>
            </div>

            <div className="records-list">
              {ledgerView.policies.map((pol) => (
                <div key={pol.merchantIdHex} className="record-item">
                  <div className="record-top">
                    <strong>{pol.displayName}</strong>
                    <span
                      className={`tag ${
                        pol.active ? "tag-verified" : "tag-rejected"
                      }`}
                    >
                      {pol.active ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--ink-secondary)",
                      marginBottom: 6,
                    }}
                  >
                    Slug: <code className="mono">{pol.merchantSlug}</code> · Age{" "}
                    {pol.minAge}+ · Tier {pol.requiredKycTier} · Floor $
                    {Number(pol.minCreditLimit).toLocaleString()}
                  </div>
                  <div className="mono" style={{ color: "var(--ink-muted)" }}>
                    Owner PK: {shortHex(pol.ownerPublicKeyHex)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* TAB 3: Plugin & REST Gateway Integration */}
      {activeTab === "sdk" && (
        <main className="workspace-grid">
          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">Developer & Platform Integration</div>
                <h2 className="card-title">
                  Non-Intrusive E-Commerce Plugin & REST Gateway
                </h2>
                <p className="card-desc">
                  Connect existing storefronts and ERP systems to FARGO without
                  altering legacy databases.
                </p>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={handleCopyCode}
              >
                {copiedSnippet ? (
                  <>
                    <Check size={13} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy Snippet
                  </>
                )}
              </button>
            </div>

            <div className="platform-pills">
              <button
                type="button"
                className={`scenario-chip ${
                  sdkPlatform === "shopify" ? "danger-chip" : ""
                }`}
                style={
                  sdkPlatform === "shopify"
                    ? { borderColor: "var(--crimson)", color: "var(--crimson)" }
                    : undefined
                }
                onClick={() => setSdkPlatform("shopify")}
              >
                Shopify SDK (@fargo/sdk)
              </button>
              <button
                type="button"
                className={`scenario-chip ${
                  sdkPlatform === "woocommerce" ? "danger-chip" : ""
                }`}
                style={
                  sdkPlatform === "woocommerce"
                    ? { borderColor: "var(--crimson)", color: "var(--crimson)" }
                    : undefined
                }
                onClick={() => setSdkPlatform("woocommerce")}
              >
                WooCommerce Webhook Hook
              </button>
              <button
                type="button"
                className={`scenario-chip ${
                  sdkPlatform === "erp-rest" ? "danger-chip" : ""
                }`}
                style={
                  sdkPlatform === "erp-rest"
                    ? { borderColor: "var(--crimson)", color: "var(--crimson)" }
                    : undefined
                }
                onClick={() => setSdkPlatform("erp-rest")}
              >
                B2B ERP REST API (/v1/orders/verify)
              </button>
            </div>

            <pre className="code-surface">
              {client.generatePluginSnippet(merchantSlug, sdkPlatform)}
            </pre>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">System Architecture</div>
                <h2 className="card-title">Three-Layer Privacy Guarantee</h2>
                <p className="card-desc">
                  Built specifically for Midnight Wave 3 commercial viability.
                </p>
              </div>
            </div>

            <div className="records-list">
              <div className="record-item">
                <strong>1. Drop-In Storefront & REST Gateway</strong>
                <p
                  style={{
                    fontSize: "0.81rem",
                    color: "var(--ink-secondary)",
                    marginTop: 4,
                  }}
                >
                  Exposes both a TypeScript SDK (<code className="mono">@fargo/sdk</code>)
                  and a standalone HTTP Gateway (<code className="mono">POST /v1/orders/verify</code>)
                  returning HMAC-SHA256 signed compliance webhooks.
                </p>
              </div>
              <div className="record-item">
                <strong>2. Hybrid Identity & Credit Solvency Witnesses</strong>
                <p
                  style={{
                    fontSize: "0.81rem",
                    color: "var(--ink-secondary)",
                    marginTop: 4,
                  }}
                >
                  Bridges off-chain KYC/KYB credentials and corporate credit
                  lines into private Compact witnesses — proving policy
                  compliance with zero raw data exposure.
                </p>
              </div>
              <div className="record-item">
                <strong>3. Unlinkable Pseudonyms & Replay Protection</strong>
                <p
                  style={{
                    fontSize: "0.81rem",
                    color: "var(--ink-secondary)",
                    marginTop: 4,
                  }}
                >
                  Derives merchant-scoped pseudonyms so buyers cannot be tracked
                  across platforms, while deterministic nullifiers block order
                  replay attacks on-chain.
                </p>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
