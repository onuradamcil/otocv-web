# Site Çatısı ve Sayfa İskeleti — Tasarım Dokümanı

**Tarih:** 10 Ağustos 2026
**Durum:** Onaylandı, uygulamaya hazır
**Dal:** `feature/routing`
**Önkoşul:** Yönlendirme geçişi tamamlandı (bkz. `2026-08-10-routing-design.md`)

---

## 1. Problem

Yönlendirme geçişi 18 route üretti ama sayfaların **ortak bir çatısı yok**. Somut hâli:
şifre sıfırlama ekranı açıldığında ortada bir form duruyor ve kullanıcı hangi sitede
olduğunu anlamıyor. Altı sayfa (`/login`, `/register`, `/reset-password`,
`/details/[pin]`, `/karne/[pin]`, `/add-vehicle/[step]`) hiçbir layout altında değil.

Kod tabanı taranarak çıkarılan eksik listesi:

| Parça | Durum |
|---|---|
| Üst şerit (top bar) | yok |
| Header | yalnızca bir route grubunda |
| Mobil menü | **yok** — `md` altında ana menü tamamen kayboluyor, hamburger de yok |
| Breadcrumb | yok |
| `<main>` etiketi | 1 dosyada |
| **Footer** | **hiçbir sayfada yok** |
| Yasal şerit | yok |
| 404 · hata sınırı · yüklenme | yok |
| robots · sitemap · manifest · OG görseli | yok |
| Skip link | yok |
| `aria-label` / `role` | kod tabanında **hiç** kullanılmamış |

Next.js'in dokuz özel dosyasının dokuzu da eksik. Metadata yalnızca kök layout'ta iki
satır; sayfa başına başlık yok, dolayısıyla `/garage` ile `/verify` tarayıcı sekmesinde
ve arama sonuçlarında aynı isimle görünüyor.

Ek olarak navbar'daki logo ve menü öğeleri `<span onClick>` — `<span>` klavyeyle
odaklanamaz ve Enter'a cevap vermez, yani **klavye kullanan biri menüyü hiç
kullanamıyor.** Bu desen mevcut koddan devralındı ve navbar çıkarılırken korunmuştu.

## 2. Hedef

Her sayfanın belirli bir çatı altında, tek tasarım diliyle görünmesi. Başarı ölçütleri:

1. Hiçbir sayfa "çıplak" değil; kullanıcı her ekranda hangi sitede olduğunu görüyor.
2. Mobilde ana menüye erişilebiliyor.
3. Menü ve butonlar klavyeyle kullanılabiliyor.
4. Her sayfanın kendi başlığı ve açıklaması var; paylaşıldığında önizleme kartı çıkıyor.
5. 404, hata ve yüklenme durumları tasarım diline uygun.
6. Karne yazdırıldığında belgede site menüsü çıkmıyor.

## 3. Kapsam dışı

- **Yasal metinlerin içeriği.** KVKK aydınlatma, gizlilik, kullanım şartları metinleri
  kullanıcı tarafından yazılacak. Bu çalışma yalnızca linkleri ve yer tutucu sayfaları kurar.
- **Gerçek footer bilgileri.** Şirket adı, iletişim, sosyal medya hesapları henüz yok;
  yapı doğru kurulur, içerik "yakında" yer tutucusu olur. **Sahte link konmaz.**
- **Çerez onay banner'ı.** Gerekçe 9. bölümde.
- **Renk ve tipografi kimliğinin değişmesi.** Mevcut tasarım dili korunur.
- Veritabanı: tablo, kolon, RLS, storage — hiçbirine dokunulmaz.

## 4. Çatı katmanları

Üç çatı. Route grubu adları ne olduklarını anlatacak şekilde yenilenir
(`(shell)`/`(full)` yerine `(site)`/`(auth)`/`(wizard)`).

### `(site)` — Tam çatı

Üst şerit + Header + Breadcrumb + `<main>` + Footer.

`/` · `/garage` · `/my-listings` · `/verify` · `/verify/[pin]` · `/details/[pin]` ·
`/karne/[pin]` · `/dashboard` · `/query-history` · `/packages` · `/account` ·
`/insurance-offer` · `/maintenance-planner`

`/details` ve `/karne` bu gruba **taşınıyor** — şu an çatısız.

### `(auth)` — Sade çatı

Logo + "Anasayfaya dön" + `<main>` + yasal şerit. Ana menü **yok**: giriş ekranında
menü dikkat dağıtır, sektör standardı da menüsüz sade başlıktır.

`/login` · `/register` · `/reset-password`

### `(wizard)` — Sihirbaz çatısı

Logo + adım göstergesi + "Çıkış". Ana menü **yok**: kullanıcı akıştan çıkmamalı.

`/add-vehicle/[step]`

## 5. Dosya yapısı

```
src/app/
├── layout.js               kök: <html lang="tr">, font, NotificationProvider, metadata temeli
├── not-found.js            404
├── error.js                hata sınırı
├── loading.js              yüklenme iskeleti
├── robots.js               arama motoru talimatı
├── sitemap.js              sayfa haritası
├── manifest.js             PWA manifest
├── opengraph-image.js      paylaşım kartı görseli
├── (site)/layout.js        + mevcut (shell) sayfaları + details/[pin] + karne/[pin]
├── (auth)/layout.js        + login, register, reset-password
└── (wizard)/layout.js      + add-vehicle/[step]

src/components/layout/
├── TopBar.jsx              PIN sorgulama girişi + Kurumsal Çözümler
├── Header.jsx              mevcut Navbar.jsx'in evrimi
├── MobileDrawer.jsx        yandan açılan çekmece
├── Breadcrumb.jsx          kırıntı yol
├── Footer.jsx              4 sütun + yasal şerit
├── AuthHeader.jsx          sade çatı başlığı
└── WizardHeader.jsx        adım göstergeli başlık
```

`Navbar.jsx` → `Header.jsx` olarak yeniden adlandırılır; `TopBar` ve `MobileDrawer`
sorumlulukları ondan ayrılır. Gerekçe: tek dosyada üst şerit + masaüstü menü + mobil
çekmece + hesap menüsü toplanırsa dosya yine şişer ve üzerinde çalışmak zorlaşır.

## 6. Üst şerit: uygulanmadı, kaldırıldı

**Karar tersine döndü.** Üst şerit ilk tasarımda vardı (solda "Karne PIN'i ile araç
sorgula", sağda "Kurumsal Çözümler") ve Görev 1'de uygulandı. Kullanıcı canlı gördükten
sonra beğenmedi ve kaldırılmasını istedi: **logonun üstünde hiçbir katman olmayacak.**

Kaldırıldı (`TopBar.jsx` silindi). Gerekçe kullanıcı tercihi; sektör tarafında da
dayanağı var — sahibinden.com üst şerit kullanmıyor, her şeyi tek header'da topluyor.

**Kazanım hunisi korundu.** Üst şeridin varlık sebebi PIN sorgulama kapısıydı; o kapı
iki yerde ayakta:
- Header'daki **"Karne Sorgula"** ana menü öğesi (Görev 1'de eklendi)
- Mobil çekmecedeki **"Karne PIN Sorgula"** satırı

Yani şerit gitti, işlev gitmedi.

Sektör karşılaştırması: arabam.com üst şerit kullanır, sahibinden.com kullanmaz.
İkisi de geçerli desen; burada kazanım kanalı belirleyici oldu.

## 7. Header davranışı

- Sticky; sayfa kaydırıldığında gölge kazanır.
- `md` ve üzeri: üst şerit + tam header (logo, ana menü, İlan Ver, bildirim, hesap).
- `md` altı: logo + bildirim + hamburger. Ana menü çekmeceye taşınır.

### Mobil çekmece

Sağdan kayarak açılır, arkada karartma. Profesyonel davranış şartları:

- Dışına basınca kapanır
- **Esc** ile kapanır
- Açıkken sayfa kaydırması kilitlenir
- **Odak tuzağı**: klavye odağı çekmecenin içinde kalır
- `role="dialog"` + `aria-modal="true"` + `aria-label`
- Kapanınca odak hamburger butonuna döner

## 8. Erişilebilirlik

| Sorun | Çözüm |
|---|---|
| `<span onClick>` menü öğeleri | `<button>` (aksiyon) veya `next/link` (gezinme) |
| Görünür odak yok | `focus-visible` ring, tasarım diline uygun renkte |
| `<main>` yok | Her çatıda `<main id="icerik">` |
| Skip link yok | Sayfa başında "İçeriğe geç" bağlantısı |
| İkon butonlarında etiket yok | `aria-label` (bildirim zili, hamburger, kapat) |
| Çekmece semantiği yok | 7. bölümdeki dialog kuralları |

`prefers-reduced-motion` desteklenir: çekmece animasyonu bu ayarda kapanır.

## 9. Çerez bildirimi: eklenmiyor

Kod tabanı tarandı: **hiçbir analitik veya takip kodu yok** (Google Analytics, Meta
Pixel, Hotjar, Clarity, PostHog — hiçbiri). `localStorage`/`sessionStorage` kullanımları
yalnızca Supabase oturum yönetimi için, yani **zorunlu çerez** kategorisinde.

KVKK ve GDPR zorunlu çerezler için açık onay istemez. Bu nedenle onay banner'ı
eklenmez — eklenmesi kullanıcıyı gereksiz bir tıklamaya zorlar. Footer'da gizlilik ve
KVKK bağlantıları yeterlidir.

**Tetikleyici:** analitik veya reklam kodu eklendiği gün banner zorunlu hâle gelir.

## 10. SEO ve indeksleme politikası

- `metadataBase` tanımlanır; başlık şablonu `%s | Oto.CV`.
- Her sayfa kendi `title` ve `description`'ını verir.
- `/details/[pin]` ve `/karne/[pin]` için dinamik metadata (marka, model, yıl).
- `opengraph-image` ile paylaşım kartı.

### İndeksleme ayrımı

| Route | Politika | Gerekçe |
|---|---|---|
| `/` · `/verify` | **index** | Kamuya açık, organik trafik hedefi |
| `/details/[pin]` | **index** | Bakım geçmişi ürünün kamuya açık değeri; plaka gizli. Organik kazanım kanalı. |
| `/karne/[pin]` | **noindex** | Sahibinin belge üretme aracı; arama sonucunda çıkmasının işlevi yok |
| 6 yer tutucu sayfa | **noindex** | Yalnızca "Yapım Aşamasında" kartı içeriyorlar. İçeriksiz sayfaların indekslenmesi sitenin genel kalite sinyalini düşürür. İçerik geldiğinde index'e alınırlar. |
| `/garage` · `/my-listings` · `/add-vehicle` · auth sayfaları | **noindex** | Oturum gerektiren özel alan |

`sitemap.js` yalnızca index politikasındaki route'ları listeler — yani ilk aşamada
`/` ve `/verify`. `/details/[pin]` dinamik ve sayısı artacak; ilk aşamada sitemap'e
eklenmez, gerekirse ikinci aşamada veritabanından üretilir.

## 11. Footer yapısı

Dört sütun + yasal şerit. İçerik olmadığı için linkler yer tutucu sayfalara gider;
**sahte veya çalışmayan link konmaz.**

```
OTO.CV              KURUMSAL            YASAL                  DESTEK
kısa tanım          Hakkımızda*         KVKK Aydınlatma*       Sık Sorulanlar*
                    İletişim*           Gizlilik Politikası*   Nasıl Çalışır*
                    Kurumsal Çözümler*  Kullanım Şartları*     PIN ile Sorgula
─────────────────────────────────────────────────────────────────────────────
© 2026 Oto.CV · Tüm hakları saklıdır            (* = "yakında" sayfası)
```

**Mobilde** dört sütun alt alta dizilir (akordeon yapılmaz — dört sütunun toplam içeriği
az, akordeon gereksiz tıklama üretir). Yasal şerit en altta tek satır kalır.

Yer tutucu sayfalar mevcut `ComingSoon` bileşenini kullanır — yeni desen icat edilmez.

## 12. Sistem sayfaları

| Dosya | İçerik |
|---|---|
| `not-found.js` | "Aradığınız sayfa bulunamadı" + PIN sorgulama ve anasayfa yolları |
| `error.js` | "Bir şeyler ters gitti" + "Tekrar dene" butonu. Teknik hata metni kullanıcıya gösterilmez, konsola yazılır. |
| `loading.js` | Yerleşimi koruyan iskelet; sayfa zıplaması (layout shift) olmaz |

## 13. Yazdırma

Karne sayfası PDF olarak basılıyor. `TopBar`, `Header`, `Breadcrumb`, `Footer` ve
skip link `print:hidden` alır. `OtoKarneScreen` kendi başlığında zaten `print:hidden`
kullanıyor; desen korunur.

## 14. Riskler

| Risk | Azaltma |
|---|---|
| `/details` ve `/karne` navbar kazanınca görünüm değişir | Adım adım yapılır, her adımda ekran görüntüsü sunulur |
| İki sticky başlık çakışması (site header + `OtoKarneScreen`'in kendi başlığı) | Karne sayfasında site header'ının sticky davranışı gözden geçirilir; gerekirse karne kendi başlığını sticky'den çıkarır |
| Navbar'ın üç bileşene bölünmesi regresyon üretebilir | 35 maddelik mevcut regresyon paketi her adımda çalıştırılır |
| Route grubu yeniden adlandırma sunucu önbelleğini bozar | Yönlendirme geçişinde yaşandı: klasör adı değişince `.next` silinip sunucu yeniden başlatılır |

Veritabanına dokunulmadığı için veri kaybı riski yoktur.

## 15. Kararlar ve gerekçeleri

| Karar | Seçim | Gerekçe |
|---|---|---|
| Çatı sayısı | Üç | Sektör standardı: auth'ta menü dikkat dağıtır, sihirbazda kullanıcı akıştan çıkmamalı |
| Üst şerit | ~~PIN sorgulama vurgusu~~ → **kaldırıldı** | Canlı görüldükten sonra kullanıcı tercihiyle iptal. PIN kapısı header ve çekmecede duruyor (bkz. 6. bölüm) |
| Dokunma alanı | En az 44×44px | `ui-ux-pro-max` veritabanında yüksek önemli kural. İlk uygulamada hamburger ve kapat butonu 36px'ti, düzeltildi. |
| Animasyon tanımları | `globals.css`'e eklendi | `animate-fadeIn` 58 yerde kullanılıyordu ama keyframes tanımı yoktu; Tailwind v4 bu sınıfı üretmiyor, 60 animasyon sessizce çalışmıyordu |
| Mobil menü | Yandan çekmece | 2026 baskın deseni; sahibinden ve arabam ikisi de kullanıyor |
| Footer içeriği | Yapı kurulur, içerik yer tutucu | Gerçek bilgi yok; sahte link koymak profesyonellik değil |
| Çerez banner'ı | Eklenmiyor | Takip kodu yok, zorunlu çerezler onay gerektirmez |
| `/karne` indeksleme | noindex | Sahibinin aracı, arama sonucunda işlevi yok |
| `Navbar.jsx` bölünmesi | Üç bileşene | Tek dosyada toplanırsa şişer; küçük dosyalarda çalışmak daha güvenilir |

## 16. Doğrulama

Her adım sonunda:

- Mevcut 35 maddelik Playwright regresyon paketi çalıştırılır
- `npm run build` hatasız tamamlanır
- Ekran görüntüsü ile görsel kontrol (masaüstü + mobil genişlik)

Çalışmaya özel yeni kontroller:

- Üç çatının her birinde doğru başlık/footer basılıyor
- Mobil genişlikte hamburger görünüyor, çekmece açılıyor, Esc ile kapanıyor
- Klavyeyle Tab ile menü gezilebiliyor, odak halkası görünüyor
- Skip link ilk Tab'da çıkıyor ve içeriğe atlıyor
- 404 ve hata sayfaları tasarım diline uygun
- Karne yazdırma önizlemesinde site çatısı görünmüyor
- Her sayfanın sekme başlığı farklı
