// SPDX-License-Identifier: Apache-2.0

export type Locale = "en" | "tr";

export const UI_COPY = {
  en: {
    editionBadge: "MIDNIGHT COMPACT · DUAL-LEDGER PROTOCOL",
    tagline:
      "Privacy-Preserving Commerce Infrastructure — Verify transactions. Protect business data.",
    walletDefault: "Midnight Compact Runtime · Active",
    walletLaceConnected: "Lace Midnight Wallet · Connected",
    walletLocalProver: "Local Compact WASM Prover · Active",
    walletVerified: "Local Compact v0.22 Engine · Verified",

    // Top 4 Metrics
    metricMerchantsLabel: "Active Merchant Policies",
    metricMerchantsSub: "Registered on Midnight ledger",
    metricVerifiedLabel: "ZK-Attested Orders",
    metricVerifiedSub: "Zero PII or invoice values exposed",
    metricSettledLabel: "Settled Transactions",
    metricSettledSub: "Authenticated via owner ZK key",
    metricNullifiersLabel: "Bank Seals / Nullifiers",
    metricNullifiersSubPrefix: "Contract",

    // Navigation & Presets
    tabStorefront: "Live Storefront Demo",
    tabCheckout: "Checkout & Ledger Audit",
    tabPolicies: "Merchant Policy Rules",
    tabSdk: "Plugin & REST Gateway",
    presetsLabel: "Test Presets:",
    presetMarketplace: "1. Marketplace Laptop ($1,500)",
    presetFactory: "2. Textile Mill Credit ($60,000)",
    presetB2B: "3. B2B Net-30 ($72,000)",
    presetRetail: "4. Regulated Retail (21+)",
    presetDecline: "5. Over Credit Limit (Decline)",
    presetTamper: "6. Tamper Bank Seal (Fraud Reject)",

    // Storefront Live Demo Tab
    sfRetailEyebrow: "Customer Checkout Experience · B2C",
    sfRetailStore: "TrendPazar Electronics",
    sfRetailTitle: '16" ProBook Studio Laptop — M4 Pro / 32GB RAM',
    sfRetailDesc:
      "Experience how an everyday shopper uses Installment Shopping Credit without sharing their national ID, birthdate, or bank balance with the seller.",
    sfRetailPriceLabel: "Installment Total",
    sfRetailRuleBadge: "Requires: Age 18+ · Verified ID · $2,000 Credit",
    sfRetailPayBtn: "Verify Privately with FARGO & Complete Order",

    sfB2bEyebrow: "Wholesale Procurement Experience · B2B",
    sfB2bStore: "Bursa Organized Textile Mill",
    sfB2bTitle: "Wholesale Combed Cotton Fabric — 12 Metric Tons",
    sfB2bDesc:
      "Experience how a garment manufacturer orders on 60-day open account by proving their $50,000+ bank guarantee without revealing corporate bank balances.",
    sfB2bPriceLabel: "60-Day Open Account Invoice",
    sfB2bRuleBadge: "Requires: Corporate Tax ID (Tier 2) · $50k Bank Seal",
    sfB2bPayBtn: "Prove Bank Solvency with FARGO & Place Order",

    // 3D-Secure / iyzico Style Popup Modal
    modalHeaderBadge: "FARGO SECURE ZK CHECKOUT",
    modalStep1Title: "1. Bank & Official Identity Seal Loaded",
    modalStep1Sub:
      "Cryptographic authority signature verified locally on your device.",
    modalStep2Title: "2. Zero-Knowledge Compact Proof Generated",
    modalStep2Sub:
      "Exact age, identity number, and bank balance stripped — 0 bytes sent to seller.",
    modalStep3Title: "3. Midnight Public Ledger Attestation",
    modalStep3Sub: "Unforgeable commitment & anti-replay nullifier recorded.",
    modalConfirmBtn: "Approve & Send ZK Proof to Merchant",
    modalProcessing: "Generating Midnight ZK Proof…",
    modalSuccessTitle: "Order Approved Without Data Exposure!",
    modalViewCertBtn: "Open Official ZK Certificate",
    modalInspectLedgerBtn: "Inspect in Dual-Ledger Console",
    modalCloseBtn: "Close Window",

    // Tab 1 Left: Buyer Checkout
    buyerEyebrow: "01 · Buyer Session",
    buyerTitle: "Storefront Checkout — FARGO Compliance Plugin",
    buyerDesc:
      "Proves Bank/KYC seal authenticity, buyer eligibility, and credit solvency inside a local Compact circuit.",
    localWitnessTag: "Local Witness",
    defaultSampleItem: "Enterprise Commercial Purchase Order",
    defaultSampleTerms: "Verified via Midnight Selective Disclosure",
    merchantSelectLabel: "Counterparty Merchant / Platform",
    activePolicySuffix: "Active Policy",
    pausedPolicySuffix: "Paused",
    orderRefLabel: "Order / Invoice Reference",
    buyerSeedLabel: "Buyer Signing Key Seed",
    privateWord: "private",
    requiredPolicyTitle: "Required Policy:",
    agePrefix: "Age",
    tierPrefix: "KYC/KYB Tier",
    creditFloorPrefix: "Credit Floor",
    tamperWarningBanner:
      "FRAUD SIMULATION ACTIVE: Official Bank Seal is $30,000, but buyer edited input to $100,000. Compact circuit will detect seal mismatch!",
    vaultHeader: "Confidential Buyer Credentials (Never Sent to Merchant)",
    verifiedAgeLabel: "Verified Age",
    kycCredentialLabel: "Hybrid Identity Credential",
    tier0Option: "Tier 0 — Unverified Guest",
    tier1Option: "Tier 1 — Individual KYC",
    tier2Option: "Tier 2 — Corporate KYB",
    approvedCreditLabel: "Approved Credit Line (USD)",
    invoiceTotalLabel: "Order / Invoice Total (USD)",
    verifyBtn: "Verify Compliance & Issue Midnight ZK Attestation",

    // Tab 1 Right: Merchant & Ledger
    merchantEyebrow: "02 · Counterparty & Ledger View",
    merchantTitle: "Midnight Dual-Ledger Audit & Settlement",
    merchantDesc:
      "Demonstrates selective disclosure: the merchant confirms compliance mathematically while sensitive figures stay masked.",
    hideWebhookBtn: "Hide Webhook",
    inspectWebhookBtn: "Inspect Signed Webhook",
    attRecordedPrefix: "Attestation Recorded",
    attDeclinedPrefix: "Verification Declined",
    assertionPrefix: "Compact Assertion:",
    privateBoxTitle: "Private Witness (Withheld)",
    rowBirthdate: "Buyer Birthdate / Age",
    rowKycDossier: "KYC / KYB Dossier",
    rowCreditLimit: "Credit Facility Limit",
    rowInvoiceAmount: "Invoice Dollar Amount",
    redactedWord: "REDACTED",
    publicBoxTitle: "Public Ledger (Disclosed)",
    rowPolicyProof: "Policy & Bank Seal",
    validatedWord: "VALIDATED",
    rowPseudonym: "Pseudonym",
    rowCommitment: "Commitment",
    rowNullifier: "Nullifier",
    recordsListTitle: "Verified Ledger Attestations",
    certBtn: "Certificate",
    settleOrderBtn: "Settle Order",
    statusVerified: "VERIFIED",
    statusSettled: "SETTLED",
    statusActive: "ACTIVE",
    statusPaused: "PAUSED",

    // Certificate Modal
    certModalEyebrow: "OFFICIAL CRYPTOGRAPHIC AUDIT RECEIPT",
    certModalTitle: "Midnight Zero-Knowledge Compliance Certificate",
    certIdLabel: "Certificate ID",
    certOrderLabel: "Order Reference",
    certMerchantLabel: "Counterparty",
    certStatusLabel: "Ledger Status",
    certCommitmentLabel: "Order Commitment Hash",
    certNullifierLabel: "Anti-Replay Nullifier",
    certPseudonymLabel: "Unlinkable Buyer Pseudonym",
    certBankSealLabel: "Bank / KYC Authority Seal",
    certGuaranteeText:
      "This document certifies that the above commercial transaction satisfied all age, identity, and credit solvency constraints inside a compiled Midnight Compact v0.22 zero-knowledge circuit with zero personal or financial raw data disclosed (GDPR & KVKK compliant).",
    certDownloadJsonBtn: "Download JSON Receipt",
    certPrintBtn: "Print / Save PDF",

    // Tab 2: Policies
    govEyebrow: "Governance & Compliance",
    govTitle: "Register or Update Merchant Policy",
    govDesc:
      "Executes register_merchant_policy on Midnight. Only the holder of the merchant secret key can modify rules.",
    slugLabel: "Merchant Slug",
    businessNameLabel: "Business Legal / Display Name",
    merchantSeedLabel: "Merchant Owner Secret Seed (ZK Witness)",
    minAgeInputLabel: "Minimum Buyer Age",
    reqTierInputLabel: "Required Identity Tier",
    tier0OpenOption: "Tier 0 — Open Access",
    minCreditInputLabel: "Minimum Credit Line Requirement (USD)",
    publishPolicyBtn: "Publish Policy to Midnight Ledger",
    registryEyebrow: "On-Chain Registry",
    registryTitle: "Registered Merchant Policies",
    registryDesc: "Queried directly from ledger.merchant_policies.",

    // Tab 3: SDK & Gateway
    devEyebrow: "Developer & Platform Integration",
    devTitle: "Non-Intrusive E-Commerce Plugin & REST Gateway",
    devDesc:
      "Connect existing storefronts and ERP systems to FARGO without altering legacy databases.",
    copiedWord: "Copied",
    copySnippetBtn: "Copy Snippet",
    archEyebrow: "System Architecture",
    archTitle: "Three-Layer Privacy Guarantee",
    archDesc: "Built specifically for Midnight Wave 3 commercial viability.",
    arch1Title: "1. Drop-In Storefront & REST Gateway",
    arch1Body:
      "Exposes both a TypeScript SDK (@fargo/sdk) and a standalone HTTP Gateway (POST /v1/orders/verify) returning HMAC-SHA256 signed compliance webhooks.",
    arch2Title: "2. Bank-Sealed Hybrid Identity & Solvency",
    arch2Body:
      "Verifies cryptographic Bank and KYC authority seals inside Compact circuits — preventing buyer input tampering with zero raw data exposure.",
    arch3Title: "3. Unlinkable Pseudonyms & Replay Protection",
    arch3Body:
      "Derives merchant-scoped pseudonyms so buyers cannot be tracked across platforms, while deterministic nullifiers block order replay attacks on-chain.",
  },
  tr: {
    editionBadge: "MIDNIGHT COMPACT · ÇİFT DEFTER PROTOKOLÜ",
    tagline:
      "Gizlilik Odaklı Ticaret Altyapısı — İşlemleri doğrulayın, ticari verilerinizi koruyun.",
    walletDefault: "Midnight Compact Motoru · Aktif",
    walletLaceConnected: "Lace Midnight Cüzdanı · Bağlandı",
    walletLocalProver: "Yerel Compact WASM Kanıtlayıcı · Aktif",
    walletVerified: "Yerel Compact v0.22 Motoru · Doğrulandı",

    // Top 4 Metrics
    metricMerchantsLabel: "Kayıtlı Mağaza Kuralları",
    metricMerchantsSub: "Midnight defterindeki aktif mağaza sayısı",
    metricVerifiedLabel: "ZK İle Doğrulanan Sipariş",
    metricVerifiedSub: "0 bayt kimlik veya fatura tutarı sızdırıldı",
    metricSettledLabel: "Onaylanıp Kapatılan İşlem",
    metricSettledSub: "Satıcı özel ZK anahtarıyla mühürlendi",
    metricNullifiersLabel: "Banka Mührü / Koruma Damgası",
    metricNullifiersSubPrefix: "Sözleşme",

    // Navigation & Presets
    tabStorefront: "Canlı Mağaza Deneyimi",
    tabCheckout: "Ödeme & Blokzincir Denetimi",
    tabPolicies: "Mağaza Kural Yönetimi",
    tabSdk: "Eklenti & REST API Kapısı",
    presetsLabel: "Hazır Senaryolar:",
    presetMarketplace: "1. Alışveriş Kredisiyle Laptop ($1,500)",
    presetFactory: "2. Fabrika Açık Hesap Kumaş ($60,000)",
    presetB2B: "3. B2B Vadeli Alım ($72,000)",
    presetRetail: "4. Yaş Sınırlı Perakende (21+)",
    presetDecline: "5. Kredi Limiti Aşımı (Reddet)",
    presetTamper: "6. Hile Dene: Sahte Banka Limiti (Reddet)",

    // Storefront Live Demo Tab
    sfRetailEyebrow: "Bireysel Müşteri Sepet Deneyimi · B2C",
    sfRetailStore: "TrendPazar Elektronik",
    sfRetailTitle: '16" ProBook Studio Laptop — M4 Pro / 32GB RAM',
    sfRetailDesc:
      "Müşterinin TC kimlik numarasını, yaşını veya banka hesabını satıcıyla paylaşmadan 'Alışveriş Kredisi' ile nasıl saniyeler içinde sipariş verdiğini canlı deneyin.",
    sfRetailPriceLabel: "Alışveriş Kredili Tutar",
    sfRetailRuleBadge: "Şartlar: 18+ Yaş · e-Devlet Kimlik · $2,000 Limit",
    sfRetailPayBtn: "FARGO ile Gizli Doğrula & Siparişi Tamamla",

    sfB2bEyebrow: "Toptan Fabrika Alım Deneyimi · B2B",
    sfB2bStore: "Bursa Organize Kumaş Fabrikası",
    sfB2bTitle: "Toptan Penye Pamuk Kumaş — 12 Ton Sevkiyat",
    sfB2bDesc:
      "Bir tekstil atölyesinin kasasındaki parayı fabrikaya göstermeden, $50.000 üstü banka teminatına sahip olduğunu kanıtlayarak 60 gün vadeli mal alışını deneyin.",
    sfB2bPriceLabel: "60 Gün Açık Hesap Fatura",
    sfB2bRuleBadge: "Şartlar: Vergi Levhalı Şirket · $50,000 Banka Mührü",
    sfB2bPayBtn: "FARGO ile Banka Teminatını Kanıtla & Sipariş Ver",

    // 3D-Secure / iyzico Style Popup Modal
    modalHeaderBadge: "FARGO GÜVENLİ ZK DOĞRULAMA PENCERESİ",
    modalStep1Title: "1. e-Devlet ve Banka Dijital Mührü Okundu",
    modalStep1Sub:
      "Resmi kurum imzası telefonunuzda/tarayıcınızda yerel olarak doğrulandı.",
    modalStep2Title: "2. Sıfır-Bilgi (ZK) Compact Kanıtı Hazırlandı",
    modalStep2Sub:
      "Yaşınız, TC kimliğiniz ve banka bakiyeniz gizlendi — satıcıya 0 bayt gönderilir.",
    modalStep3Title: "3. Midnight Blokzincir Onay Mührü",
    modalStep3Sub: "Taklit edilemez sipariş mührü ve kopya önleyici damga üretilir.",
    modalConfirmBtn: "Onayla ve ZK Mührünü Satıcıya Gönder",
    modalProcessing: "Midnight ZK Kanıtı Üretiliyor…",
    modalSuccessTitle: "Verileriniz Paylaşılmadan Sipariş Onaylandı!",
    modalViewCertBtn: "Resmi ZK Sertifikasını Gör",
    modalInspectLedgerBtn: "Blokzincir Kaydını İncele",
    modalCloseBtn: "Pencereyi Kapat",

    // Tab 1 Left: Buyer Checkout
    buyerEyebrow: "01 · Alıcı (Müşteri) Ekranı",
    buyerTitle: "Mağaza Ödeme Adımı — FARGO Uyumluluk Eklentisi",
    buyerDesc:
      "Banka/e-Devlet dijital mührünü, yaş ve kredi uygunluğunu cihaz içindeki Compact devresinde doğrular; karşı tarafa yalnızca şifreli mühür gönderir.",
    localWitnessTag: "Yerel Gizli Tanık",
    defaultSampleItem: "Kurumsal Ticari Satın Alma Siparişi",
    defaultSampleTerms: "Midnight Seçici Bilgi Paylaşımı ile Doğrulanır",
    merchantSelectLabel: "Alışveriş Yapılan Mağaza / Fabrika",
    activePolicySuffix: "Aktif Kural",
    pausedPolicySuffix: "Durduruldu",
    orderRefLabel: "Sipariş / Fatura Numarası",
    buyerSeedLabel: "Alıcı Gizli İmza Anahtarı",
    privateWord: "gizli",
    requiredPolicyTitle: "Mağazanın Aradığı Şartlar:",
    agePrefix: "En Az Yaş",
    tierPrefix: "Kimlik Seviyesi",
    creditFloorPrefix: "Min. Kredi Limiti",
    tamperWarningBanner:
      "HİLE SİMÜLASYONU AKTİF: Bankanın gerçek mührü $30,000 iken alıcı kutuya yalandan $100,000 yazdı! Compact sözleşmesi sahte veriyi yakalayacak.",
    vaultHeader: "Alıcının Gizli Bilgileri (Satıcıya Asla Gönderilmez)",
    verifiedAgeLabel: "Müşterinin Gerçek Yaşı",
    kycCredentialLabel: "Hibrit Kimlik (KYC/KYB) Seviyesi",
    tier0Option: "Seviye 0 — Doğrulanmamış Misafir",
    tier1Option: "Seviye 1 — Bireysel Kimlik (KYC)",
    tier2Option: "Seviye 2 — Kurumsal Şirket (KYB)",
    approvedCreditLabel: "Bankadaki Kredi Limiti (USD)",
    invoiceTotalLabel: "Gizli Fatura / Sipariş Tutarı (USD)",
    verifyBtn: "Uygunluğu Kanıtla ve Midnight ZK Mührü Üret",

    // Tab 1 Right: Merchant & Ledger
    merchantEyebrow: "02 · Satıcı & Blokzincir Ekranı",
    merchantTitle: "Midnight Çift-Defter Denetimi & Satıcı Onayı",
    merchantDesc:
      "Satıcı müşterinin özel rakamlarını görmez (GİZLENDİ); ancak tüm kuralların ve banka mührünün gerçek olduğunu doğrulayıp siparişi onaylar.",
    hideWebhookBtn: "Webhook Gizle",
    inspectWebhookBtn: "İmzalı Webhook'u Gör",
    attRecordedPrefix: "ZK Kanıtı Onaylandı",
    attDeclinedPrefix: "İşlem Reddedildi",
    assertionPrefix: "Sözleşme Red Sebebi:",
    privateBoxTitle: "Gizli Tutulan Veriler (Satıcı Göremez)",
    rowBirthdate: "Müşteri Doğum Tarihi / Yaşı",
    rowKycDossier: "Kimlik / Şirket Evrakları",
    rowCreditLimit: "Toplam Kredi Limiti",
    rowInvoiceAmount: "Fatura Dolar Tutarı",
    redactedWord: "GİZLENDİ",
    publicBoxTitle: "Blokzincire Yazılan (Açık Kanıt)",
    rowPolicyProof: "Kural & Banka Mührü",
    validatedWord: "DOĞRULANDI",
    rowPseudonym: "Anonim Alıcı Kodu",
    rowCommitment: "Şifreli Sipariş Mührü",
    rowNullifier: "Kopya Önleyici Damga",
    recordsListTitle: "Doğrulanmış Blokzincir Kayıtları",
    certBtn: "Sertifika",
    settleOrderBtn: "Siparişi Onayla (Satıcı)",
    statusVerified: "DOĞRULANDI",
    statusSettled: "KAPATILDI",
    statusActive: "AKTİF",
    statusPaused: "DURAKLATILDI",

    // Certificate Modal
    certModalEyebrow: "RESMİ KRİPTOGRAFİK DENETİM BELGESİ",
    certModalTitle: "Midnight Sıfır-Bilgi (ZK) Uyumluluk Sertifikası",
    certIdLabel: "Sertifika No",
    certOrderLabel: "Sipariş Referansı",
    certMerchantLabel: "Satıcı Kurum",
    certStatusLabel: "Blokzincir Durumu",
    certCommitmentLabel: "Sipariş Mühür Özeti (Commitment)",
    certNullifierLabel: "Tekrar Önleyici Damga (Nullifier)",
    certPseudonymLabel: "Takip Edilemez Alıcı Kodu",
    certBankSealLabel: "Banka / e-Devlet Otorite Mührü",
    certGuaranteeText:
      "Bu belge; yukarıdaki ticari işlemin yaş, kimlik ve banka kredi yeterliliği şartlarının Midnight Compact v0.22 sıfır-bilgi devresi içinde eksiksiz doğrulandığını ve satıcıya hiçbir kişisel/finansal ham veri aktarılmadığını (KVKK & GDPR uyumlu) teyit eder.",
    certDownloadJsonBtn: "JSON Dekont İndir",
    certPrintBtn: "Yazdır / PDF Kaydet",

    // Tab 2: Policies
    govEyebrow: "Mağaza Yönetimi & Uyumluluk",
    govTitle: "Yeni Mağaza Kuralı Ekle veya Güncelle",
    govDesc:
      "Midnight üzerindeki register_merchant_policy devresini çalıştırır. Kuralları yalnızca mağaza gizli anahtarının sahibi değiştirebilir.",
    slugLabel: "Mağaza Kısa Kodu (Slug)",
    businessNameLabel: "Şirket / Mağaza Görünen Adı",
    merchantSeedLabel: "Mağaza Sahibi Gizli Anahtarı (ZK Witness)",
    minAgeInputLabel: "Minimum Müşteri Yaşı",
    reqTierInputLabel: "Zorunlu Kimlik Seviyesi",
    tier0OpenOption: "Seviye 0 — Herkese Açık",
    minCreditInputLabel: "Minimum Kredi Limiti Şartı (USD)",
    publishPolicyBtn: "Kuralı Midnight Blokzincirine Kaydet",
    registryEyebrow: "Zincir Üstü Kayıtlar",
    registryTitle: "Kayıtlı Mağaza Kuralları",
    registryDesc: "Doğrudan ledger.merchant_policies tablosundan okunur.",

    // Tab 3: SDK & Gateway
    devEyebrow: "Geliştirici & Platform Entegrasyonu",
    devTitle: "Tak-Çalıştır E-Ticaret Eklentisi & REST API Kapısı",
    devDesc:
      "Mevcut e-ticaret sitelerini ve ERP yazılımlarını veritabanını değiştirmeden birkaç satır kodla FARGO'ya bağlayın.",
    copiedWord: "Kopyalandı",
    copySnippetBtn: "Kodu Kopyala",
    archEyebrow: "Sistem Mimarisi",
    archTitle: "Üç Katmanlı Gizlilik Garantisi",
    archDesc: "Midnight Wave 3 ticari kullanım senaryoları için tasarlandı.",
    arch1Title: "1. Tak-Çalıştır Mağaza SDK & REST API",
    arch1Body:
      "Hem TypeScript SDK (@fargo/sdk) hem de HMAC-SHA256 imzalı bildirim (Webhook) üreten bağımsız HTTP sunucusu (POST /v1/orders/verify) sunar.",
    arch2Title: "2. Banka Mühürlü Hibrit Kimlik & Kredi Kanıtı",
    arch2Body:
      "Banka ve resmi kurum mühürlerini doğrudan Compact ZK devresi içinde doğrular; müşterinin sahte veri girmesini matematiksel olarak engeller.",
    arch3Title: "3. Takip Edilemez Kimlik & Kopya Koruması",
    arch3Body:
      "Her mağaza için farklı anonim alıcı kodu üreterek fişlenmeyi önler; tek kullanımlık Nullifier damgasıyla aynı siparişin tekrar kullanılmasını engeller.",
  },
} as const;
