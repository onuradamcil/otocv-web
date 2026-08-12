# OTO.CV — Yol Haritası

Bu dosya, konuşulmuş ama henüz yapılmamış işleri tutar. Depoda duruyor ki
oturum değişse de kaybolmasın.

Kural: bir madde bitince buradan silinmez — **Tamamlananlar**'a taşınır ve
hangi commit'te bittiği yazılır. Neyin neden yapıldığı kadar, neyin
yapılmadığı da bilgidir.

---

## Sırada

### 1. Güven puanı kanıta bağlanacak  ⏳ devam ediyor

Mevcut durum (tespit edildi):

- İlan sihirbazı her yeni araca **sabit 92** yazıyor. Kod
  `formData.otocv_score || 92` diyor ama `otocv_score` **hiçbir yerde set
  edilmiyor** — yani her zaman 92.
- Bakım kaydı eklenince **+5**, tavan 98
  ([MaintenanceDialog.jsx](../src/components/garage/MaintenanceDialog.jsx)).
- Puanı **düşüren hiçbir şey yok**. Hasarlı, muayenesi dolmuş, kilometresi
  tutarsız bir araç kayıt ekleyerek 98'e çıkıyor.
- Arayüzde varsayılan **üç farklı**: bazı ekranda 60, bazısında 92, ilan
  kartında 94. Aynı araç için üç ayrı iddia.
- Puan istemciden yazılıyordu; anon anahtarıyla 98 verilebildiği kanıtlandı
  (o açık `2e4ec6f` ile kapandı).

### 2. İstek hızı sınırı (rate limit)

Entropi her denemenin şansını düşürür, rate limit **kaç deneme
yapılabileceğini** sınırlar. İkisi çarpım halinde çalışır. PIN entropisi
50 bite çıkarıldı ama deneme sınırı yok.

Supabase'in hazır rate limit'i **yalnızca kimlik doğrulama uçlarına**
uygulanıyor (IP başına token bucket, kapasite 30). `sicil_getir` Data API
üzerinde ve orada hazır sınır yok; Supabase'in kendi dokümanı "IP başına
rate limit" maddesini *kendiniz kurmanız gerekenler* listesinde sayıyor.

**Mimari karar gerekiyor:** sınırı yalnızca web tarafına koymak yetmez —
mobil uygulama doğrudan Supabase'e bağlandığında o kapı açık kalır. Doğru
kurgu `sicil_getir`'i herkese açık olmaktan çıkarıp tek bir sunucu kapısının
arkasına almak; web de mobil de aynı kapıdan geçer. Yan etkisi: Supabase
denetleyicisinin iki `security definer` uyarısı da kapanır.

### 3. Gerçek QR okuma

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

### 4. Bekleyen küçük işler

- `Step2ListingDetails.jsx` 2.006 satır — bölünecek.
- Sızmış şifre koruması (Supabase panelinden tek tık, denetleyici uyarısı).
- Sigorta iş ortağı akışı.
- `uuid` + `vehicle_ownerships`: araç el değiştirdiğinde sicilin devri.
- Next.js 16.3.0 yükseltmesi.
- CI 2. aşama: yerel Supabase, böylece testler canlı veriye hiç yazmaz.
  Ön koşulu `supabase db pull` ile temel migration üretmek.

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
