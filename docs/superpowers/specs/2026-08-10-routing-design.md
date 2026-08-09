# Gerçek URL Yönlendirmesine Geçiş — Tasarım Dokümanı

**Tarih:** 10 Ağustos 2026
**Durum:** Onaylandı, uygulamaya hazır
**Dal:** `feature/routing`

---

## 1. Problem

Uygulamanın tamamı tek bir Next.js route'unda (`src/app/page.js`) çalışıyor. 16 farklı ekran,
`viewState` adlı bir React state'i ile değiştiriliyor. Bunun sonuçları:

- **Tarayıcının ileri/geri tuşları çalışmıyor.** Geri tuşuna basan kullanıcı siteden çıkıyor.
- **Hiçbir ekranın adresi yok.** Araç, karne veya ilan linki paylaşılamıyor.
- **Sayfa yenilenince (F5) her zaman anasayfaya düşülüyor.**
- **Karne doğrulama linki ölü.** `OtoKarneScreen` panoya `/?verify=true&pin=…` kopyalıyor ama
  `page.js` URL'den yalnızca `type=recovery` okuyor; `verify` ve `pin` parametreleri kod tabanında
  hiçbir yerde okunmuyor. Ürünün tek kazanım kanalı bu link.
- **SEO yok.** Karne ve araç sayfaları Google'a görünmüyor, WhatsApp'ta önizleme kartı çıkmıyor.

## 2. Hedef

Gerçek, dosya bazlı Next.js route'larına geçmek. Başarı ölçütleri:

1. İleri/geri tuşları her ekranda doğru çalışır.
2. F5 ile yenilemede kullanıcı aynı ekranda kalır.
3. Her ekranın paylaşılabilir bir adresi olur.
4. Karne doğrulama linki çalışır ve PIN'i dolu olarak sorgulama ekranını açar.
5. Sihirbaz adımları arasında geri tuşu adım adım geri gider.

## 3. Kapsam dışı

Bu çalışma **yalnızca yönlendirme** ile ilgilidir. Aşağıdakilere dokunulmaz:

- Veritabanı: tablo, kolon, RLS politikası, storage yapılandırması — **tek satır SQL yok**
- İş mantığı: araç kaydı, bakım kaydı, karne üretimi, bildirim motoru
- Görsel tasarım: renk, tipografi, yerleşim
- Bilinen diğer hatalar (`mockVehicles` çökmesi, `trust_score`, bakım özeti tekrarı) — ayrı iş kalemleri
- Font çakışması (Geist boşuna yükleniyor, `font-display` çalışmıyor) — ayrı iş kalemi

## 4. URL haritası

Adlandırma İngilizce, mevcut `viewState` ve bileşen adlarıyla tutarlı.

### Navbar'lı sayfalar — `(shell)` grubu

| URL | Bileşen | Not |
|---|---|---|
| `/` | `MarketplaceView` | Pazaryeri vitrini |
| `/garage` | `GarageScreen` | Giriş gerekli |
| `/my-listings` | `MyListingsScreen` | Giriş gerekli |
| `/verify` | `VehicleVerificationScreen` | PIN sorgulama formu |
| `/verify/[pin]` | `VehicleVerificationScreen` | PIN dolu, otomatik sorgu — **karne linki buraya** |
| `/dashboard` | Yer tutucu | "Bana Özel Özet" |
| `/query-history` | Yer tutucu | "Sorgulama Geçmişim" |
| `/packages` | Yer tutucu | "Paketlerim & Ödemeler" |
| `/account` | Yer tutucu | "Hesabım" |
| `/insurance-offer` | Yer tutucu | Sigorta teklifi |
| `/maintenance-planner` | Yer tutucu | Bakım planlayıcı |

### Navbar'sız tam sayfalar — `(full)` grubu

| URL | Bileşen | Not |
|---|---|---|
| `/login` | `VehicleAuthScreen` | `initialMode="login"` |
| `/register` | `VehicleAuthScreen` | `initialMode="register_step1"` |
| `/reset-password` | `ResetPasswordScreen` | Mevcut `route.js` yönlendirme hilesi kaldırılıyor |
| `/details/[plate]` | `VehicleDetailsScreen` | Sahip ve ziyaretçi aynı adres, içerik role göre |
| `/karne/[plate]` | `OtoKarneScreen` | |
| `/add-vehicle/step1` … `step4` | `CreateListingWizard` | `currentStep` ↔ URL |

Navbar'ın hangi sayfada görüneceği **mevcut davranışın aynısı**: `page.js`'te erken dönüş yapan
ekranlar bugün de navbar'sız çalışıyor.

## 5. Dosya yapısı

```
src/app/
├── layout.js                      # mevcut — NotificationProvider, dokunulmuyor
├── (shell)/
│   ├── layout.js                  # YENİ — Navbar + NotificationDropdown
│   ├── page.js                    # / (MarketplaceView'i sarar)
│   ├── garage/page.js
│   ├── my-listings/page.js
│   ├── verify/page.js
│   ├── verify/[pin]/page.js
│   ├── dashboard/page.js
│   ├── query-history/page.js
│   ├── packages/page.js
│   ├── account/page.js
│   ├── insurance-offer/page.js
│   └── maintenance-planner/page.js
└── (full)/
    ├── login/page.js
    ├── register/page.js
    ├── reset-password/page.js     # route.js'in yerini alır
    ├── details/[plate]/page.js
    ├── karne/[plate]/page.js
    └── add-vehicle/[step]/page.js

src/components/
├── layout/Navbar.jsx              # YENİ — page.js'ten çıkarılan navbar
└── common/ComingSoon.jsx          # YENİ — yer tutucu sayfalar için
```

Parantezli klasörler (`(shell)`, `(full)`) Next.js **route grubu**dur; URL'de görünmezler.
Tek işlevleri farklı layout uygulamaktır.

## 6. Temel tasarım ilkesi: bileşenlere dokunmamak

Yeni dosyalar yalnızca **route katmanı**. Mevcut ekran bileşenleri bugünkü prop arayüzleriyle kalır.
Route dosyası köprü görevi yapar:

```jsx
// örnek: (shell)/garage/page.js
'use client';
import { useRouter } from 'next/navigation';
import GarageScreen from '@/components/GarageScreen';

export default function GaragePage() {
  const router = useRouter();
  return (
    <GarageScreen
      onViewDetails={(car) => router.push(`/details/${car.plate_number}`)}
      onViewKarne={(car) => router.push(`/karne/${car.plate_number}`)}
      onNavigateToAdd={() => router.push('/add-vehicle/step1')}
      onOpenMaintenance={/* sayfa içi state olarak kalır */}
    />
  );
}
```

Bunun değeri: `GarageScreen`, `VehicleDetailsScreen`, `OtoKarneScreen`, `CreateListingWizard` gibi
uzun ve olgun dosyalar açılmıyor bile. Regresyon yüzeyi route katmanıyla sınırlı kalıyor.

**İstisna:** `CreateListingWizard`'ın `currentStep` state'i URL ile eşlenmeli. Bu tek bileşende
kontrollü bir değişiklik gerekir (Adım 6).

## 7. Çözülmesi gereken teknik noktalar

### 7.1 Plaka URL'de nasıl taşınacak

Plakalar boşluk içeriyor (`34 ABC 123`). URL'de `encodeURIComponent` ile kodlanacak, okurken
`decodeURIComponent` ile çözülecek. Bileşenler bugün de `plate_number`'ı olduğu gibi bekliyor,
davranış değişmiyor.

### 7.2 Araç verisi nereden gelecek

Bugün `page.js` seçilen aracın **tüm nesnesini** state'te tutup bileşene prop olarak geçiyor.
Route'a geçtiğimizde sayfa yalnızca plakayı biliyor; aracı kendisi çekmesi gerekir.

Karar: `details` ve `karne` sayfaları plakayla Supabase'den aracı çeker. Bu zaten yapılması
gereken şeydi — F5 sonrası ekranın ayakta kalması bunu zorunlu kılıyor.

### 7.3 `isPublicMode` nasıl belirlenecek

Bugün `page.js` "sahip görünümü mü, ziyaretçi görünümü mü" ayrımını `isPublicMode` state'i ile
taşıyor ve `VehicleDetailsScreen`'e prop olarak geçiyor. Route'a geçtiğimizde bu state kaybolur —
üstelik bugün de F5 sonrası kayboluyor.

Karar: **rol, state ile taşınmayacak; sahiplikten türetilecek.** `/details/[plate]` sayfası aracı
çektikten sonra `vehicle.user_id` ile oturumdaki kullanıcının kimliğini karşılaştırır:

- eşleşiyorsa → sahip görünümü (`isPublicView={false}`)
- eşleşmiyorsa veya oturum yoksa → ziyaretçi görünümü (`isPublicView={true}`)

Bu, mevcut davranıştan **daha doğru**: bugün kullanıcı kendi aracına pazaryerinden tıklarsa
ziyaretçi modunda açılıyor. Bileşenin prop arayüzü değişmiyor, yalnızca değerin kaynağı değişiyor.

### 7.4 `/verify/[pin]` sorgu sonrası nereye gider

Mevcut akış: PIN bulunur → `onVehicleFound(vehicle, 'public')` → detay ekranı açılır.

Route karşılığı: `/verify/[pin]` aracı bulur ve `/details/[plate]` adresine yönlendirir
(`router.replace`, geri tuşunda sorgulama ekranına dönmemek için). Rol artık 7.3'teki
sahiplik karşılaştırmasından geliyor.

PIN bulunamazsa `/verify` formunda hata mesajı gösterilir — bugünkü sessiz çökme yerine.

### 7.5 Giriş gerektiren sayfalar

Bugün `page.js` her yönlendirmede `if (user)` kontrolü yapıp `auth` ekranına atıyor. Route'larda
bu kontrol ilgili sayfanın içinde yapılacak: oturum yoksa `/login`'e yönlendirme.

### 7.6 `reset-password` çakışması

Next.js'te aynı klasörde hem `route.js` hem `page.js` bulunamaz. Mevcut `route.js` gelen e-posta
linkini `/?type=recovery`'ye yönlendiren bir hileydi. Kullanıcı onayıyla kaldırılıyor;
`/reset-password` gerçek bir sayfa olacak ve token'ı doğrudan kendisi okuyacak.

**Bu değişiklik canlıda test edilmelidir** — şifre sıfırlama akışı auth'a dokunan tek kalem.

## 8. Uygulama adımları

Her adım tek commit. Her adım sonunda site tam çalışır durumda. Her adımda kullanıcıya diff
gösterilip onay alınacak.

| # | İş | Adım sonunda kazanım |
|---|---|---|
| 0 | `feature/routing` dalını aç, bu spec'i commit et | `main` dokunulmadan kalır |
| 1 | Navbar'ı `components/layout/Navbar.jsx`'e çıkar, `(shell)/layout.js` oluştur | Yapı kurulur, görünüm birebir aynı |
| 2 | `/verify` + `/verify/[pin]` | **Karne linki çalışır** — kazanım kanalı açılır |
| 3 | `/garage` + `/my-listings` | Üye alanı adreslenebilir |
| 4 | `/details/[plate]` + `/karne/[plate]` | Araç ve karne paylaşılabilir |
| 5 | `/login` + `/register` + `/reset-password` | Auth adreslenebilir, yönlendirme hilesi kalkar |
| 6 | `/add-vehicle/[step]` | Sihirbaz içinde geri tuşu çalışır |
| 7 | 6 yer tutucu route + `ComingSoon` bileşeni | Menüden sessizce pazaryerine düşme hatası biter |
| 8 | `page.js`'teki artık `viewState` mantığını temizle | 436 satır → ~40 satır |

## 9. Risk ve geri dönüş

| Risk | Azaltma |
|---|---|
| Veri kaybı | **Yok.** Veritabanına hiç dokunulmuyor, tek satır SQL yazılmıyor. |
| Ekranın bozulması | Her adım ayrı commit; `git revert <commit>` ile yalnızca o adım geri alınır. |
| Toptan başarısızlık | `main` dalı hiç değişmiyor; dalı silmek yeterli. |
| Bileşen regresyonu | Bileşen dosyaları büyük ölçüde açılmıyor (bkz. Bölüm 6). |
| Şifre sıfırlamanın bozulması | Adım 5'te canlı test şartı. Onaylanmazsa `route.js` yerinde bırakılıp ekran `/reset-password/form`'a alınabilir. |

## 10. Kararlar ve gerekçeleri

| Karar | Seçim | Gerekçe |
|---|---|---|
| Geçiş stratejisi | Kademeli (route'lar tek tek) | Her adımda çalışan site; geri alma birimi küçük |
| Sihirbaz URL'i | `/add-vehicle/step1` | İşlevi anlatıyor; eski `add-vehicle` klasörü kalkacağı için çakışma yok |
| Şifre sıfırlama | Yönlendirme hilesi kaldırılıyor | Daha temiz; token düşme riskini de bitirir |
| URL dili | İngilizce (tamamı) | Kullanıcının açık tercihleri (`/garage`, `/add-vehicle/step1`) şemayı çiviliyor; tutarlılık karışıklıktan iyidir |
| SEO istisnası | `/verify/[pin]` için ileride Türkçe takma ad eklenebilir | Next.js rewrite ile tek satır; şemayı bozmaz |

## 11. Doğrulama

Her adım sonunda elle kontrol edilecekler:

- İlgili ekran açılıyor, görünüm bozulmamış
- Geri ve ileri tuşları doğru ekranlara gidiyor
- F5 sonrası aynı ekranda kalınıyor
- Konsolda yeni hata yok

Adım 2 sonunda ek olarak: karne ekranından "Linki Kopyala" → yeni sekmede aç → PIN dolu
sorgulama ekranı açılıyor ve araç bulunuyor.

Adım 5 sonunda ek olarak: gerçek e-posta ile şifre sıfırlama akışı baştan sona test edilecek.
