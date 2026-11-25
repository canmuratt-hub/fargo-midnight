# FARGO — Akindo (Midnight Buildathon Wave 3) Başvuru & Video Rehberi

Bu rehber, **30 Kasım 2026 saat 18:00 (TSİ)** son teslim tarihinden önce Akindo başvurusunu eksiksiz tamamlaman için hazırlandı.

---

## 1. Sunum Dosyasını (Slide Deck PDF) Tek Tıkla Alma
1. Bilgisayarında `docs/pitch-deck.html` dosyasına çift tıkla (Chrome'da açılır).
2. Sağ üstteki kırmızı **"Export / Save as PDF (Ctrl+P)"** butonuna bas.
3. Yazıcı hedefini **PDF olarak kaydet (Save as PDF)** seç, Kenar Boşlukları: **Yok (None)**, **Arka plan grafikleri (Background graphics): Açık** yapıp kaydet.
4. İşte Akindo'ya yükleyeceğin 8 sayfalık kurumsal krem-bordo sunum dosyan hazır!

---

## 2. 2 Dakikalık Demo Videosu Çekim Senaryosu (Adım Adım)
Ekran kaydı programını (OBS, Windows `Win + G` veya Loom) açıp `http://localhost:5173` ekranında sırasıyla şunları göster (toplam ~2 dakika):

1. **0:00 – 0:25 (Giriş & Problem):**
   * `docs/pitch-deck.html` ilk slaytını veya doğrudan `http://localhost:5173` ana ekranını göster.
   * *Ne anlatacaksın:* "Merhaba, bu FARGO. E-ticaret ve B2B vadeli ticarette şirketler sipariş uygunluğunu ve kredi limitlerini kanıtlamak için hassas finansal ve kimlik verilerini karşı tarafa açmak zorunda kalıyor. FARGO, Midnight ağının Compact akıllı sözleşmelerini kullanarak bu verileri hiç ifşa etmeden doğrulayan bir eklenti ve API altyapısıdır."
2. **0:25 – 1:10 (Canlı Başarılı ZK Doğrulama & Webhook):**
   * Üstten **`B2B Net-30 ($72,000)`** test senaryosuna tıkla.
   * Soldaki gizli verileri göster (Yaş: 34, KYB Tier 2, Kredi Limiti: $240,000, Fatura: $72,000) ve kırmızı **"Verify Compliance & Issue Midnight ZK Attestation"** butonuna tıkla.
   * Sağda çıkan yeşil **"Attestation Recorded"** kutusunu, `REDACTED` (gizlenen alanları) ve **"Inspect Signed Webhook"** butonuna tıklayarak e-ticaret sitesine giden HMAC imzalı kanıtı göster. Ardından listedeki **"Settle Order"** butonuna basıp satıcı onayını göster.
3. **1:10 – 1:35 (Limit Aşımı Reddi — Negatif Test):**
   * Üstten **`Over Credit Limit (Decline)`** butonuna bas (Kredi limiti $40,000 ama sipariş $95,000).
   * Tekrar kırmızı doğrulama butonuna bas ve Compact akıllı sözleşmesinin işlemi kriptografik olarak nasıl reddettiğini göster.
4. **1:35 – 2:00 (Poliçe & Eklenti SDK Sekmeleri + Kapanış):**
   * **Merchant Policy Rules** ve **Plugin & REST Gateway** sekmelerine tıklayıp Shopify, WooCommerce ve B2B ERP REST API kod şablonlarını gösterip videoyu bitir.

---

## 3. Akindo Başvuru Formuna Kopyala-Yapıştır Metinleri (İngilizce)

### Project Name
`FARGO — Privacy-Preserving Commerce Infrastructure`

### Tagline / Short Description
`Drop-in zero-knowledge compliance and B2B credit solvency verification layer for e-commerce and enterprise trade, built with Midnight Compact.`

### GitHub Repository URL
`https://github.com/canmuratt-hub/fargo-midnight`

### Full Description / Progress Completed in Wave 3
```markdown
## Overview
FARGO is a non-intrusive privacy and verification infrastructure designed for e-commerce platforms and B2B supply chains on the Midnight Network. Today, proving statutory buyer eligibility (age/KYC) or corporate Net-30 credit solvency forces buyers and businesses to expose raw identity documents, credit facility balances, and confidential invoice totals to counterparties or public ledgers.

FARGO solves this over-disclosure problem through a drop-in SDK (`@fargo/sdk`) and HTTP REST Gateway (`/v1/orders/verify`) backed by compiled Midnight Compact smart contracts.

## What We Built During Wave 3
1. **Compiled Midnight Compact Smart Contract (`packages/contract/src/fargo.compact`):**
   - Implemented and compiled 4 zero-knowledge circuits (`register_merchant_policy`, `deactivate_merchant_policy`, `verify_commerce_order`, `settle_verified_order`) using `compactc 0.30.0`.
   - Leverages Midnight's Dual-Ledger architecture: sensitive inputs (`buyer_age`, `kyc_tier`, `credit_limit`, `order_amount`, `secret_key`, `salt`) stay strictly inside local witnesses, while only merchant-scoped unlinkable pseudonyms, salted commitments, and anti-replay nullifiers are disclosed on-chain.
2. **Commerce Plugin SDK & REST Gateway (`packages/sdk`):**
   - Built `FargoCommerceClient`, HMAC-SHA256 signed merchant webhooks (`X-Fargo-Signature`), a standalone Node HTTP REST Gateway, and integration templates for Shopify, WooCommerce, and B2B ERP systems.
3. **Comprehensive QA & Stress Test Suite (22/22 Passing Tests):**
   - 17 Compact smart contract unit, boundary, lifecycle, privacy-leakage audit, and 15-order multi-merchant stress simulation specs + 5 end-to-end HTTP gateway and webhook verification specs.
4. **Interactive Storefront & Dual-Ledger Audit Console (`apps/web`):**
   - Built an end-to-end web interface connected directly to the compiled Midnight WASM runtime so judges can execute real ZK attestations, test constraint rejections, inspect signed webhooks, and settle orders out-of-the-box.
```
