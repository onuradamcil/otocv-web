# OTO.CV — Yol Haritası

Bu dosya, konuşulmuş ama henüz yapılmamış işleri tutar. Depoda duruyor ki
oturum değişse de kaybolmasın.

Kural: bir madde bitince buradan silinmez — **Tamamlananlar**'a taşınır ve
hangi commit'te bittiği yazılır. Neyin neden yapıldığı kadar, neyin
yapılmadığı da bilgidir.

---

## Sırada

### 1. Gerçek QR okuma

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

### 2. Bekleyen küçük işler

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
- **Araç devri Faz 1.5:** fatura dosyalarını araca bağlamak. Uçtan uca test
  kanıtladı: devir sonrası alıcı `invoice_path`'i görüyor ama **dosyayı
  açamıyor** — storage politikası `klasör = benim kimliğim` ve dosyalar
  `<user_id>/<plaka>/` yolunda, yani satıcının klasöründe kalıyor. Çözüm:
  yolu `<plaka>/<dosya>` yapmak ve politikayı "bu aracın şu anki sahibiyim"
  kontrolüne çevirmek. O zaman devir hiçbir dosyaya dokunmaz. Bir kerelik
  taşıma gerekiyor (`scripts/faturalari-tasi.mjs` aynı kalıp).
- **Araç devri Faz 2:** `uuid` kimlik. Yalnızca **plaka değişikliği** için
  gerekli (şehir değişimi vb.); satışta plaka araçta kaldığı için Faz 1 asıl
  senaryoyu çözdü. Birincil anahtar değişimi demek: iki tablonun FK'si ve
  ~20 kod noktası. Canlı veride yedeksiz, dikkatli planlanmalı.
- **Araç devri arayüzü:** sihirbazdaki "Bu Araç Zaten Kayıtlı" modalına
  "Bu aracı devraldım" yolu (şu an çıkışsız), satıcı tarafında devir ekranı +
  açık rıza onayı, ve Playwright testleri.
- **Karar gerekiyor — hesap silinince sicil de siliniyor.** `vehicles.user_id`
  FK'si `on delete cascade`: kullanıcı hesabını silerse araçları, bakım
  kayıtları ve sahiplik geçmişi de silinir. İkinci el alıcı için bu muhtemelen
  yanlış — aracın sicili sahibinin hesabından bağımsız yaşamalı. Test
  hesaplarını temizlerken fark edildi.
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
| Araç devri Faz 1: sahiplik geçmişi + devir kodları + rıza kaydı | bu commit |
