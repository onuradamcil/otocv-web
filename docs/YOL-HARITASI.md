# OTO.CV — Yol Haritası

Bu dosya, konuşulmuş ama henüz yapılmamış işleri tutar. Depoda duruyor ki
oturum değişse de kaybolmasın.

Kural: bir madde bitince buradan silinmez — **Tamamlananlar**'a taşınır ve
hangi commit'te bittiği yazılır. Neyin neden yapıldığı kadar, neyin
yapılmadığı da bilgidir.

İşaretlenebilir madde listesi ayrı dosyada: [../TODO.md](../TODO.md) (VSCode
kenar çubuğundaki TODOS ağacında görünüyor). Burası gerekçeleri, ölçümleri ve
tarihçeyi tutuyor; orası neyin sırada olduğunu.

---

## Sırada

### 1. Alıcı diyaloğu tarayıcıda doğrulanmadı  ⚠ bilinen boşluk

`AracDevralDialog` (kod girişi → ön izleme → onay → yeni PIN, ve talep yolu)
**hiç render edilmedi.** Doğrulanan ne, doğrulanmayan ne:

| Katman | Durum |
|---|---|
| RPC katmanı (`devir_onizleme`, `devir_tamamla`, `devir_talep_et`) | ✅ 9 test |
| Satıcı diyaloğu | ✅ tarayıcıda görsel doğrulama |
| Modalın üç durumu (`plaka_durumu`) | ✅ RPC seviyesinde |
| **Alıcı diyaloğunun kendisi** | ❌ derleniyor, lint temiz, **render edilmedi** |

Sebep: diyaloğa ulaşmak için ilan sihirbazının 1. adımının **tamamı**
doldurulmalı. Ölçüldü: 5 metin alanı, **2 dosya yükleme**, 4 kademeli
marka→seri→model→paket zinciri, iki tarih ve onay kutusu; "Devam" düğmesi
hepsi dolmadan etkinleşmiyor.

Bu, `Step2ListingDetails` bölme işi için de gereken aynı yatırım
([aşağıya](#2-bekleyen-küçük-işler) bakın): **sihirbaz için Playwright
yardımcısı** — 1. adımı programatik dolduran, sabit bir test görseli yükleyen
bir fonksiyon. Bir kez yazılınca hem devir arayüzünü hem Step2 bölmesini
açıyor.

### 2. Gerçek QR okuma

Şu an "QR Kod Tarat" düğmesi dürüstçe "hazır değil" diyor. Önceki hâli
veritabanına **en son eklenen aracı** çekip "tescilli araç bulundu" diye
gösteriyordu — yani bir yabancının aracını (`2e4ec6f` ile kaldırıldı).

İstenen kapsam:

- **QR'ın içeriği aracın PIN'i olacak.** Başka bir şey değil: PIN zaten
  paylaşılmak üzere üretilen kamuya açık anahtar, plaka ise kişisel veri ve
  QR'a girmemeli.
- **Kameradan canlı okuma** — hem web hem mobil.
- **Galeriden görüntü okuma** — kullanıcı ekran görüntüsü ya da fotoğraf
  seçtiğinde de okunmalı. Mobilde asıl kullanım bu: karneyi WhatsApp'tan
  alan kişi ekranda duran QR'ı kamerayla okuyamaz.
- **QR üretimi** karne/ilan kartında zaten var mı, yoksa eklenmeli — okuma
  tarafı üretim tarafıyla aynı biçimi kullanmalı.

Dikkat edilecekler:

- Kamera izni reddedilirse akış kırılmamalı; galeriden okuma ve elle PIN
  girişi yedek yol olarak kalmalı.
- Okunan değer doğrudan sorguya gönderilmemeli. `pinNormalize` üzerinden
  geçmeli — QR'dan tam URL de gelebilir (`https://.../details/CV-...`),
  yalnızca PIN de.
- Kütüphane seçimi CSP ve paket boyutu açısından değerlendirilmeli.

### 3. Bekleyen küçük işler

- `Step2ListingDetails.jsx` bölme işi **beklemede, gerekçesi değişti.** Dosya
  2.000 satır ama panel panel başlıklandırılmış ve çalışıyor; satır sayısı tek
  başına bölme gerekçesi değil. Asıl sorun olan **katalog tekrarı düzeltildi**
  (aşağıya bakın). Panelleri ayırmak için önce sihirbazın test kapsamı
  gerekiyor: şu an Step 2'yi hiçbir test kapsamıyor ve oraya ulaşmak için
  Step 1'in tamamının (fotoğraf yükleme + marka/seri/model/paket zinciri + iki
  tarih) doldurulması şart. Ayrıca dosya plaka girişini içeriyor — dokunulmaz
  bölge.
- Sızmış şifre koruması (Supabase panelinden tek tık, denetleyici uyarısı).
- Sigorta iş ortağı akışı.
- **Araç devri Faz 2:** `uuid` kimlik. Yalnızca **plaka değişikliği** için
  gerekli (şehir değişimi vb.); satışta plaka araçta kaldığı için Faz 1 asıl
  senaryoyu çözdü. Birincil anahtar değişimi demek: iki tablonun FK'si ve
  ~20 kod noktası. Canlı veride yedeksiz, dikkatli planlanmalı.
- **Sahipsiz aracın devralınması yarım.** Zincir: başvuru ✅ → **elle onay ⛔**
  → **ödeme ⛔** → geri yükleme ✅. Kullanıcı bugün ruhsatını yükleyip başvuru
  gönderebiliyor; başvuru bekliyor durumunda kalıyor çünkü (a) onay verecek bir
  yönetim ekranı yok, onay `sahipsiz_talepleri` tablosuna elle yazılıyor, (b)
  tahsilat altyapısı yok. `sahipsiz_geri_yukle` ikisi de tamamlanmadan
  çalışmayı reddediyor — kapı bilerek kapalı bırakıldı ki sonradan açılırken
  şema değişmesin.
- **Ödeme altyapısı sıfır.** `iyzico`/`stripe`/`paytr`/webhook/`api` rotası:
  kod tabanında hiç yok. `PublishListingModal` içindeki ₺250 açıkça "DEMO
  ÖDEME" yazıyor ve yalnızca bir boolean çeviriyor. `profiles.is_premium` bir
  üyelik bayrağı, işlem başına tahsilat değil. Sahipsiz araç geri yüklemesi ve
  devir ücreti bunun üstüne kurulacak.
- **KVKK metnine girmesi ZORUNLU cümle.** Ürün kararı gereği fatura belgeleri
  hesap kapatılsa da araç siciliyle kalıyor. Bunun tutulabilmesi için
  aydınlatma metni şunu açıkça söylemeli: *"Yüklediğiniz servis belgeleri araç
  sicilinin parçasıdır; araç el değiştirse veya hesabınızı kapatsanız da araç
  kaydıyla kalır."* Yazılmazsa tutulamayacak bir silme sözü verilmiş olur.
  Açık talep için kaçış kapısı var: `fatura_belgelerini_sil`.
- **Yeni şema kayması bulundu.** `profiles` tablosunun tanımı ve `is_premium`
  kolonu hiçbir migration'da yok — panelden elle eklenmişler. `6fd41f9` ile
  düzeltilen kaymanın aynı sınıfı: depodan kurulan bir veritabanında
  `profiles` hiç oluşmaz. `supabase db pull` ile temel migration üretilmeli;
  CI 2. aşaması zaten buna bağlı.
- **`tests/07-devir.spec.js` temizlenemeyen artık bırakıyor.** Devir testleri
  canlı veride gerçek devir yapıyor; `afterAll` aracı geri devrediyor ama
  sahiplik geçmişi, devir kodları ve bildirimler kalıyor — o tablolar bilerek
  istemciye kapalı (RLS açık, politika yok), test onları silemiyor. Koşumdan
  sonra elle temizlik gerekiyor (SQL spec'in başlığında). CI'da koşmuyor.
  Bu, aşağıdaki CI 2. aşaması için en güçlü gerekçe.
- CI 2. aşama (yerel Supabase): **Docker gerekiyor, kurulu değil — en alta
  alındı.** Aciliyeti kalmadı: testler kendi çöpünü benzersiz işaretle
  temizliyor ve yıkıcı işlemler yalnızca testin kendi oluşturduğu kayda `id`
  üzerinden yapılıyor. Yani asıl risk kapandı; bu madde "bir daha asla olmasın"
  garantisi.

---

## Tamamlananlar

| İş | Commit |
|---|---|
| İkon kütüphanesi, 27 çizim, tek boyut ölçeği | — |
| Karne dürüstlüğü: uydurma beyan, yeşil tik, hayali VIN kaldırıldı | `602e2d3`…`f43cfcc` |
| 48 test + CI, testler kendi çöpünü temizliyor | `8f8db69` |
| Şema: tramer sayısal, tarihler `date`, indeksler | — |
| Fatura özel bucket + imzalı bağlantı, `maintenance_records` RLS | `ed2bbcf` |
| `invoice_url` düşürüldü, PIN araması indekse bağlandı | `93a5b1a` |
| PIN üretimi kriptografik, `ilike` joker açığı kapatıldı | `f9024f9` |
| Tüm PIN'ler güçlü biçime geçirildi, testler PIN'den koparıldı | `b821130` |
| `vehicles` kilitlendi: plaka + PIN sızıntısı, sahte ekleme açığı | `2e4ec6f` |
| Sicil puanı kanıta bağlandı (sabit 92 ve "+5" numarası kaldırıldı) | `35bd9a7` |
| PIN sorgusuna istek hızı sınırı (IP başına, veritabanı içinde) | `ab63d1f` |
| Next.js 16.3.0 + React 19.2.8; npm audit 6 yüksek → 0 | `8de5da2` |
| Hasar kataloğu tek kaynağa alındı (3 dosyada kaymıştı) | `de3d35a` |
| Araç devri Faz 1: sahiplik geçmişi + devir kodları + rıza kaydı | `c4a4f80` |
| Araç devri Faz 1.5: fatura dosyaları araca bağlandı (devirde geçiyor) | `d1ff6fa` |
| Şema kayması giderildi: 8 fonksiyonun gövdesi depoya alındı | `6fd41f9` |
| Devir: talep yolu, ön izleme, satıcı durum ekranı, yetki temizliği | `b0b0756` |
| Devir arayüzü: iki taraflı akış, bildirimler, 9 test | `967d537` |
| Hesap kapatınca sicil artık silinmiyor: sahipsiz araç havuzu | — |
