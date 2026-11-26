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
import { type Locale, UI_COPY } from "./i18n";

type ActiveTab = "checkout" | "policies" | "sdk";
type SdkPlatform = "shopify" | "woocommerce" | "erp-rest";
type WalletStateKey =
  | "walletDefault"
  | "walletLaceConnected"
  | "walletLocalProver"
  | "walletVerified";

interface MerchantAccount {
  readonly slug: string;
  readonly displayName: string;
  readonly secretSeed: string;
  readonly sampleItemEn: string;
  readonly sampleItemTr: string;
  readonly sampleTermsEn: string;
  readonly sampleTermsTr: string;
}

const DEFAULT_MERCHANTS: readonly MerchantAccount[] = [
  {
    slug: "anatolia-b2b-supply",
    displayName: "Anatolia Industrial Supply Co.",
    secretSeed: "merchant:anatolia-b2b-supply-v1",
    sampleItemEn: "Batch #408 — Precision CNC Titanium Fasteners (400 Units)",
    sampleItemTr: "Parti #408 — Hassas CNC Titanyum Bağlantı Parçası (400 Adet)",
    sampleTermsEn: "Net-30 Enterprise Trade Credit · KYB Tier 2 Required",
    sampleTermsTr: "30 Gün Vadeli Kurumsal Ticari Alım · KYB Seviye 2 Şartlı",
  },
  {
    slug: "aura-regulated-retail",
    displayName: "Aura Reserve & Regulated Goods",
    secretSeed: "merchant:aura-regulated-retail-v1",
    sampleItemEn: "Collector Cellar Allocation — Vintage Reserve Case",
    sampleItemTr: "Özel Koleksiyon Ürün Paketi — Yaş Sınırlı Satış",
    sampleTermsEn: "Direct Retail Checkout · Statutory Age 21+ & KYC Tier 1",
    sampleTermsTr: "Bireysel Perakende Ödeme · Yasal Yaş 21+ & KYC Seviye 1",
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
  const [locale, setLocale] = useState<Locale>("en");
  const t = UI_COPY[locale];

  const [ledgerView, setLedgerView] = useState<DualLedgerSnapshot>(() =>
    client.inspectDualLedger(),
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("checkout");
  const [sdkPlatform, setSdkPlatform] = useState<SdkPlatform>("shopify");
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [walletStateKey, setWalletStateKey] =
    useState<WalletStateKey>("walletDefault");

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
        setWalletStateKey("walletLaceConnected");
        return;
      } catch {
        setWalletStateKey("walletLocalProver");
        return;
      }
    }
    setWalletStateKey("walletVerified");
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

    if (
      outcome.verified &&
      outcome.commitmentHex &&
      outcome.nullifierHex &&
      outcome.buyerPseudonymHex
    ) {
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
        merchantSlug.includes("b2b")
          ? `PO-2026-${nextNum}`
          : `ORD-2026-${nextNum}`,
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
              <span className="brand-edition">{t.editionBadge}</span>
            </div>
            <p className="brand-tagline">{t.tagline}</p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="lang-switch" role="group" aria-label="Language Switch">
            <button
              type="button"
              className={`lang-btn ${locale === "en" ? "active" : ""}`}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={`lang-btn ${locale === "tr" ? "active" : ""}`}
              onClick={() => setLocale("tr")}
            >
              TR
            </button>
          </div>

          <button
            type="button"
            className="runtime-btn"
            onClick={handleConnectLace}
          >
            <span className="status-indicator" />
            <Wallet size={14} />
            {t[walletStateKey]}
          </button>
        </div>
      </header>

      {/* Ledger Summary Strip */}
      <section className="metrics-strip">
        <div className="metric-cell">
          <div className="metric-label">{t.metricMerchantsLabel}</div>
          <div className="metric-value">{ledgerView.totalMerchants}</div>
          <div className="metric-sub">{t.metricMerchantsSub}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">{t.metricVerifiedLabel}</div>
          <div className="metric-value">{ledgerView.totalVerifiedOrders}</div>
          <div className="metric-sub">{t.metricVerifiedSub}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">{t.metricSettledLabel}</div>
          <div className="metric-value">{ledgerView.totalSettledOrders}</div>
          <div className="metric-sub">{t.metricSettledSub}</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">{t.metricNullifiersLabel}</div>
          <div className="metric-value">{ledgerView.activeNullifierCount}</div>
          <div className="metric-sub">
            {t.metricNullifiersSubPrefix} {shortHex(ledgerView.contractAddress)}
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
            <ShieldCheck size={15} /> {t.tabCheckout}
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "policies" ? "active" : ""}`}
            onClick={() => setActiveTab("policies")}
          >
            <SlidersHorizontal size={15} /> {t.tabPolicies}
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "sdk" ? "active" : ""}`}
            onClick={() => setActiveTab("sdk")}
          >
            <Code2 size={15} /> {t.tabSdk}
          </button>
        </nav>

        <div className="scenario-group">
          <span className="scenario-label">{t.presetsLabel}</span>
          <button
            type="button"
            className="scenario-chip"
            onClick={() => applyPreset("b2b-valid")}
          >
            {t.presetB2B}
          </button>
          <button
            type="button"
            className="scenario-chip"
            onClick={() => applyPreset("retail-valid")}
          >
            {t.presetRetail}
          </button>
          <button
            type="button"
            className="scenario-chip danger-chip"
            onClick={() => applyPreset("credit-fail")}
          >
            {t.presetDecline}
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
                <div className="eyebrow">{t.buyerEyebrow}</div>
                <h2 className="card-title">{t.buyerTitle}</h2>
                <p className="card-desc">{t.buyerDesc}</p>
              </div>
              <span className="tag tag-witness">
                <EyeOff size={12} /> {t.localWitnessTag}
              </span>
            </div>

            <div className="invoice-preview">
              <div>
                <div className="invoice-item-title">
                  {merchantMeta
                    ? locale === "tr"
                      ? merchantMeta.sampleItemTr
                      : merchantMeta.sampleItemEn
                    : t.defaultSampleItem}
                </div>
                <div className="invoice-item-meta">
                  {merchantMeta
                    ? locale === "tr"
                      ? merchantMeta.sampleTermsTr
                      : merchantMeta.sampleTermsEn
                    : t.defaultSampleTerms}
                </div>
              </div>
              <Building2 size={20} color="#9e2323" />
            </div>

            <form onSubmit={handleVerifyOrder}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="merchant-select">{t.merchantSelectLabel}</label>
                  <select
                    id="merchant-select"
                    value={merchantSlug}
                    onChange={(e) => setMerchantSlug(e.target.value)}
                  >
                    {ledgerView.policies.map((pol) => (
                      <option key={pol.merchantSlug} value={pol.merchantSlug}>
                        {pol.displayName} (
                        {pol.active
                          ? t.activePolicySuffix
                          : t.pausedPolicySuffix}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="order-number">{t.orderRefLabel}</label>
                  <input
                    id="order-number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="buyer-seed">
                    {t.buyerSeedLabel}
                    <span className="mono" style={{ color: "var(--ochre)" }}>
                      {t.privateWord}
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
                    <strong>{t.requiredPolicyTitle}</strong>
                  </span>
                  <span>
                    {t.agePrefix} {selectedPolicy.minAge}+
                  </span>
                  <span>
                    {t.tierPrefix} {selectedPolicy.requiredKycTier}
                  </span>
                  <span>
                    {t.creditFloorPrefix} $
                    {Number(selectedPolicy.minCreditLimit).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="witness-vault">
                <div className="witness-vault-head">
                  <span>{t.vaultHeader}</span>
                  <KeyRound size={14} />
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="buyer-age">
                      {t.verifiedAgeLabel}
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
                      {t.kycCredentialLabel}
                      <span className="mono">Uint&lt;8&gt;</span>
                    </label>
                    <select
                      id="kyc-tier"
                      value={kycTier}
                      onChange={(e) =>
                        setKycTier(Number(e.target.value) as KycTierLevel)
                      }
                    >
                      <option value={0}>{t.tier0Option}</option>
                      <option value={1}>{t.tier1Option}</option>
                      <option value={2}>{t.tier2Option}</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="credit-limit">
                      {t.approvedCreditLabel}
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
                      {t.invoiceTotalLabel}
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
                {t.verifyBtn}
                <ArrowRight size={16} />
              </button>
            </form>
          </section>

          {/* Right Column: Merchant & Public Ledger Inspector */}
          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">{t.merchantEyebrow}</div>
                <h2 className="card-title">{t.merchantTitle}</h2>
                <p className="card-desc">{t.merchantDesc}</p>
              </div>
              {lastWebhook && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowWebhookModal((v) => !v)}
                >
                  {showWebhookModal ? t.hideWebhookBtn : t.inspectWebhookBtn}
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
                        {t.attRecordedPrefix} — {lastOutcome.orderNumber}
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={17} />
                        {t.attDeclinedPrefix} — {lastOutcome.orderNumber}
                      </>
                    )}
                  </span>
                  <span className="mono">{lastOutcome.executionTimeMs} ms</span>
                </div>
                {lastOutcome.verified ? (
                  <div
                    className="mono"
                    style={{ marginTop: 5, fontSize: "0.73rem" }}
                  >
                    Commitment: {shortHex(lastOutcome.commitmentHex)} · Nullifier:{" "}
                    {shortHex(lastOutcome.nullifierHex)}
                  </div>
                ) : (
                  <div style={{ marginTop: 5, fontSize: "0.8rem" }}>
                    {t.assertionPrefix} {lastOutcome.errorMessage}
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
                <h4>{t.privateBoxTitle}</h4>
                <div className="kv-line">
                  <span>{t.rowBirthdate}</span>
                  <span className="masked-pill">{t.redactedWord}</span>
                </div>
                <div className="kv-line">
                  <span>{t.rowKycDossier}</span>
                  <span className="masked-pill">{t.redactedWord}</span>
                </div>
                <div className="kv-line">
                  <span>{t.rowCreditLimit}</span>
                  <span className="masked-pill">{t.redactedWord}</span>
                </div>
                <div className="kv-line">
                  <span>{t.rowInvoiceAmount}</span>
                  <span className="masked-pill">{t.redactedWord}</span>
                </div>
              </div>

              <div className="matrix-box">
                <h4>{t.publicBoxTitle}</h4>
                <div className="kv-line">
                  <span>{t.rowPolicyProof}</span>
                  <strong style={{ color: "var(--forest)", fontSize: "0.77rem" }}>
                    {t.validatedWord}
                  </strong>
                </div>
                <div className="kv-line">
                  <span>{t.rowPseudonym}</span>
                  <span className="mono">
                    {shortHex(ledgerView.attestations[0]?.buyerPseudonymHex)}
                  </span>
                </div>
                <div className="kv-line">
                  <span>{t.rowCommitment}</span>
                  <span className="mono">
                    {shortHex(ledgerView.attestations[0]?.commitmentHex)}
                  </span>
                </div>
                <div className="kv-line">
                  <span>{t.rowNullifier}</span>
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
                {t.recordsListTitle} ({ledgerView.attestations.length})
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
                        <FileCheck2 size={11} />{" "}
                        {att.status === "settled"
                          ? t.statusSettled
                          : t.statusVerified}
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
                            {t.settleOrderBtn}
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
                <div className="eyebrow">{t.govEyebrow}</div>
                <h2 className="card-title">{t.govTitle}</h2>
                <p className="card-desc">{t.govDesc}</p>
              </div>
            </div>

            <form onSubmit={handleRegisterPolicy}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="m-slug">{t.slugLabel}</label>
                  <input
                    id="m-slug"
                    value={newMerchantSlug}
                    onChange={(e) => setNewMerchantSlug(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="m-name">{t.businessNameLabel}</label>
                  <input
                    id="m-name"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                    required
                  />
                </div>
                <div className="field full">
                  <label htmlFor="m-seed">{t.merchantSeedLabel}</label>
                  <input
                    id="m-seed"
                    value={newMerchantSeed}
                    onChange={(e) => setNewMerchantSeed(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="m-age">{t.minAgeInputLabel}</label>
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
                  <label htmlFor="m-kyc">{t.reqTierInputLabel}</label>
                  <select
                    id="m-kyc"
                    value={newKycTier}
                    onChange={(e) =>
                      setNewKycTier(Number(e.target.value) as KycTierLevel)
                    }
                  >
                    <option value={0}>{t.tier0OpenOption}</option>
                    <option value={1}>{t.tier1Option}</option>
                    <option value={2}>{t.tier2Option}</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="m-credit">{t.minCreditInputLabel}</label>
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
                {t.publishPolicyBtn}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <div className="eyebrow">{t.registryEyebrow}</div>
                <h2 className="card-title">{t.registryTitle}</h2>
                <p className="card-desc">{t.registryDesc}</p>
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
                      {pol.active ? t.statusActive : t.statusPaused}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--ink-secondary)",
                      marginBottom: 6,
                    }}
                  >
                    Slug: <code className="mono">{pol.merchantSlug}</code> ·{" "}
                    {t.agePrefix} {pol.minAge}+ · {t.tierPrefix}{" "}
                    {pol.requiredKycTier} · {t.creditFloorPrefix} $
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
                <div className="eyebrow">{t.devEyebrow}</div>
                <h2 className="card-title">{t.devTitle}</h2>
                <p className="card-desc">{t.devDesc}</p>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={handleCopyCode}
              >
                {copiedSnippet ? (
                  <>
                    <Check size={13} /> {t.copiedWord}
                  </>
                ) : (
                  <>
                    <Copy size={13} /> {t.copySnippetBtn}
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
                <div className="eyebrow">{t.archEyebrow}</div>
                <h2 className="card-title">{t.archTitle}</h2>
                <p className="card-desc">{t.archDesc}</p>
              </div>
            </div>

            <div className="records-list">
              <div className="record-item">
                <strong>{t.arch1Title}</strong>
                <p
                  style={{
                    fontSize: "0.81rem",
                    color: "var(--ink-secondary)",
                    marginTop: 4,
                  }}
                >
                  {t.arch1Body}
                </p>
              </div>
              <div className="record-item">
                <strong>{t.arch2Title}</strong>
                <p
                  style={{
                    fontSize: "0.81rem",
                    color: "var(--ink-secondary)",
                    marginTop: 4,
                  }}
                >
                  {t.arch2Body}
                </p>
              </div>
              <div className="record-item">
                <strong>{t.arch3Title}</strong>
                <p
                  style={{
                    fontSize: "0.81rem",
                    color: "var(--ink-secondary)",
                    marginTop: 4,
                  }}
                >
                  {t.arch3Body}
                </p>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
