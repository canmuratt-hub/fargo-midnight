# FARGO — Akindo (Midnight Buildathon Wave 3) Başvuru & Video Rehberi

Bu rehber, **30 Kasım 2026 saat 18:00 (TSİ)** son teslim tarihinden önce Akindo başvurusunu eksiksiz tamamlaman için tüm yeni özelliklerle güncellendi.

---

## 1. Önemli Linklerimiz
* **Canlı Web Uygulaması (GitHub Pages):** `https://canmuratt-hub.github.io/fargo-midnight/`
* **GitHub Reposu:** `https://github.com/canmuratt-hub/fargo-midnight`

---

## 2. Sunum Dosyasını (Slide Deck PDF) Tek Tıkla Alma
1. Bilgisayarında `docs/pitch-deck.html` dosyasına çift tıkla (Chrome'da açılır).
2. Sağ üstteki kırmızı **"Export / Save as PDF (Ctrl+P)"** butonuna bas.
3. Yazıcı hedefini **PDF olarak kaydet (Save as PDF)** seç, Kenar Boşlukları: **Yok (None)**, **Arka plan grafikleri (Background graphics): Açık** yapıp kaydet.

---

## 3. 2 Dakikalık Sessiz Ekran Kaydı + Hazır İngilizce Seslendirme (Clipchamp)

### Adım A: Ekran Kaydında Sırasıyla Tıklayacakların (`EN` modunda)
1. **0:00 – 0:35 (Gerçek Mağaza Deneyimi):**
   * Üstten **`Live Storefront Demo`** sekmesine tıkla.
   * Sağdaki **Wholesale Combed Cotton Fabric ($60,000)** kartındaki kırmızı **"Prove Bank Solvency with FARGO & Place Order"** butonuna bas → Açılan iyzico/3D Secure tarzı pencerede **"Approve & Send ZK Proof to Merchant"** butonuna bas → Ardından **"Open Official ZK Certificate"** butonuna basıp resmi sertifikayı göster ve kapat.
2. **0:35 – 1:25 (Çift-Defter Denetimi & Hile Yakalama):**
   * **`Checkout & Ledger Audit`** sekmesine geç.
   * Önce **`1. Marketplace Laptop ($1,500)`** seçiliyken kırmızı doğrulama butonuna bas, sağdaki `REDACTED` gizli alanları, **"Inspect Signed Webhook"** imzasını ve **"Settle Order"** onayını göster.
   * Ardından en sağdaki **`6. Tamper Bank Seal (Fraud Reject)`** butonuna bas ve tekrar kırmızı doğrulama butonuna bas → Müşteri `$30,000` olan banka mührünü elle `$100,000` yapınca Compact sözleşmesinin sahtekarlığı nasıl anında reddettiğini göster!
3. **1:25 – 1:55 (Poliçe & Eklenti SDK):**
   * **`Merchant Policy Rules`** ve **`Plugin & REST Gateway`** sekmelerine tıklayıp Shopify, WooCommerce ve B2B ERP REST API kodlarını gösterip kaydı bitir.

### Adım B: Clipchamp / ElevenLabs'e Kopyala-Yapıştır Yapacağın İngilizce Seslendirme Metni
Windows'taki **Clipchamp** programında *Record & Create -> Text to Speech* (Metinden Sese - English US) açıp şu metni direkt yapıştırabilirsin:

> "Meet FARGO — a privacy-preserving commerce infrastructure built on the Midnight Network using Compact smart contracts.
> Today, proving statutory buyer eligibility or B2B trade credit solvency forces customers and enterprises to expose raw identity documents, bank balances, and confidential invoice totals.
> With FARGO's drop-in checkout modal, a buyer or manufacturer proves their bank-sealed credit line and identity tier locally in zero knowledge. Zero bytes of personal or financial data are shared with the seller, yet an official cryptographic compliance certificate is generated instantly.
> Under the hood, our Dual-Ledger console shows how sensitive witness attributes stay completely redacted while Midnight records an unlinkable buyer pseudonym, order commitment, and anti-replay nullifier, emitting an HMAC-signed webhook to the merchant.
> Even better, FARGO prevents client-side fraud: if a buyer attempts to tamper with their bank-approved credit limit, our compiled Compact circuit detects the broken authority seal and rejects the transaction immediately.
> With 6 compiled Compact circuits, 25 automated tests, and turnkey adapters for Shopify, WooCommerce, and B2B ERPs, FARGO brings real-world commercial privacy to Midnight."

---

## 4. Akindo Başvuru Formuna Kopyala-Yapıştır Metinleri (İngilizce)

### Project Name
`FARGO — Privacy-Preserving Commerce Infrastructure`

### Tagline / Short Description
`Drop-in zero-knowledge compliance, Bank/KYC seal verification, and B2B credit solvency layer for e-commerce and enterprise trade on Midnight.`

### GitHub Repository URL
`https://github.com/canmuratt-hub/fargo-midnight`

### Demo / Application URL
`https://canmuratt-hub.github.io/fargo-midnight/`

### Full Description / Progress Completed in Wave 3
```markdown
## Overview
FARGO is a non-intrusive privacy and verification infrastructure designed for e-commerce platforms and B2B supply chains on the Midnight Network. Today, proving statutory buyer eligibility (age/KYC) or corporate Net-30/60 credit solvency forces buyers and businesses to expose raw identity documents, credit facility balances, and confidential invoice totals to counterparties or public ledgers.

FARGO solves this over-disclosure problem through a drop-in SDK (`@fargo/sdk`), interactive checkout modal, and HTTP REST Gateway (`/v1/orders/verify`) backed by compiled Midnight Compact smart contracts.

**Live Interactive Demo:** https://canmuratt-hub.github.io/fargo-midnight/

## What We Built During Wave 3
1. **6-Circuit Midnight Compact Smart Contract (`packages/contract/src/fargo.compact`):**
   - Compiled 6 zero-knowledge circuits (`register_trusted_issuer`, `issue_buyer_credential`, `register_merchant_policy`, `deactivate_merchant_policy`, `verify_commerce_order`, `settle_verified_order`) using `compactc 0.30.0`.
   - **Cryptographic Bank & KYC Seal Anti-Tamper Protection:** Verifies salted authority credential seals inside the ZK circuit so buyers cannot falsify local age, KYC, or credit limit witnesses.
   - **Midnight Dual-Ledger Separation:** Keeps sensitive inputs strictly inside local witnesses while disclosing only merchant-scoped unlinkable pseudonyms, salted commitments, and anti-replay nullifiers on-chain.
2. **Commerce Plugin SDK, Certificates & REST Gateway (`packages/sdk`):**
   - Built `FargoCommerceClient`, GDPR/KVKK cryptographic compliance certificates, HMAC-SHA256 signed merchant webhooks (`X-Fargo-Signature`), a standalone Node HTTP REST Gateway, and integration templates for Shopify, WooCommerce, and B2B ERP systems.
3. **Comprehensive QA & Stress Test Suite (25/25 Passing Tests):**
   - 19 Compact smart contract unit, Bank-seal fraud detection, boundary, lifecycle, privacy-leakage audit, and 15-order multi-merchant stress simulation specs + 6 end-to-end HTTP gateway, certificate, and webhook security specs.
4. **Live Storefront Experience & Dual-Ledger Audit Console (`apps/web`):**
   - Deployed live on GitHub Pages, executing real compiled Midnight WASM circuits directly in the browser with an iyzico/3D-Secure style checkout popup, fraud-tamper simulator, downloadable ZK audit certificates, and EN/TR bilingual support.
```
