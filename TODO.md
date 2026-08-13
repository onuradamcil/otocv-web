# OTO.CV — Yapılacaklar

Bu dosya VSCode kenar çubuğundaki **TODOS** ağacında görünür (Todo Tree
eklentisi). Kutucuklar `- [ ]` biçiminde; işaretlemek için `x` yazmak yeterli.

**Neden ayrı dosya:** [docs/YOL-HARITASI.md](docs/YOL-HARITASI.md) *neyin niye
yapıldığını* anlatan tarihçe — gerekçeler, ölçümler, kapanmış commit'ler.
Burası ise *işaretlenebilir madde listesi*. İkisi birbirine referans veriyor;
bir madde bitince burada işaretlenir, gerekçesi yol haritasına yazılır.

---

## Şu an çalışılan — Hesap kapatma ve sahipsiz araç havuzu

Plan: hesap silinince araç sicili yok olmasın. Ölçüldü — bugün tek hesabın
silinmesi 10 aracın 9'unu, 12 bakım kaydının 11'ini ve 8 fatura dosyasını
götürüyor.

- [x] A0 · Yıkıcı işlem öncesi JSON dökümü (5 tablo, md5 ile doğrulandı)
- [x] A1 · Migration: `20260813120000_hesap_kapatma_ve_sahipsiz_havuz.sql`
  - [x] `vehicles.user_id` FK: `cascade` → `set null`
  - [x] `vehicle_ownerships.user_id` FK: `cascade` → `set null`, `not null` düştü
  - [x] `devir_kodlari.veren_user_id` FK: `cascade` → `set null` (rıza kanıtı korunuyor)
  - [x] `profiles` · `notifications` · `listings` · `devir_istekleri` cascade **kaldı**
  - [x] `vehicles.sahipsiz_kaldi_at` kolonu (null = sahibi var)
  - [x] Trigger `vehicles_sahipsizlik_izle` — PIN yenile, sahiplik kapat, ilan kapat
  - [x] `sahipsiz_talepleri` tablosu (ödeme kapısı `odendi_at` ile, bugün boş)
  - [x] `hesap_kapatma_log` tablosu (KVKK ispatı)
  - [x] `hesap_kapat()` — yalnızca service_role
  - [x] `fatura_belgelerini_sil()` — KVKK kaçış kapısı, yalnızca service_role
  - [x] `plaka_durumu` → 4. durum `sahipsiz`
  - [x] `sahipsiz_onizleme` · `sahipsiz_talep_et` · `sahipsiz_geri_yukle`
  - [x] `belgeler` kovası (özel) — ruhsat yüklemesi, kendi klasörü, silme yetkisi yok
  - [x] Yetkiler: `public`, `anon`, `authenticated` — **üçü de ayrı ayrı** revoke
  - [x] Elle yıkım testi: tek kullanımlık hesap silindi, araç + sicil yaşadı
  - [x] Dosya = canlı doğrulaması: 10 fonksiyon gövdesi md5 ile birebir
- [x] A2 · `sicil_getir` — sahipsiz araçta karne kapanır, özet döner
- [x] A3 · Arayüz (hiçbir forma dokunulmadı)
  - [x] `src/hooks/useSicil.js` — `sahipsizOzet` döndürüyor
  - [x] `SahipsizSicilEkrani` — karne ve detay rotalarının paylaştığı ekran
  - [x] `CreateListingWizard` modalı — 4. durum (Step 1 plaka girişine dokunulmadı)
  - [x] `SahipsizGeriYukleDialog` — özet + ruhsat yükleme + başvuru
  - [x] `src/services/devirService.js` — yeni RPC'ler + hata metinleri
- [x] A4 · `scripts/hesap-kapat.mjs` — kuru koşum varsayılan, `--uygula` ile uygular
- [x] A5 · `tests/08-hesap-kapatma.spec.js` — 18 test, hiçbiri gerçek hesap silmiyor
- [x] Doğrulama: lint 0 hata · build temiz · 106 test geçti · FK karşılaştırması
- [ ] `docs/YOL-HARITASI.md` güncelle + commit

---

## Sırada — bilinen boşluklar

- [ ] Alıcı diyaloğu (`AracDevralDialog`) **tarayıcıda hiç render edilmedi**
  - [ ] Sihirbaz için Playwright yardımcısı yaz (1. adımı programatik doldursun)
  - [ ] Kod yolunu iki hesapla uçtan uca yürüt
  - [ ] Talep yolunu iki hesapla uçtan uca yürüt
- [ ] Gerçek QR okuma
  - [ ] QR içeriği aracın PIN'i olacak (plaka **değil** — plaka kişisel veri)
  - [ ] Kameradan canlı okuma (web + mobil)
  - [ ] Galeriden görüntü okuma (mobilde asıl kullanım bu)
  - [ ] Okunan değer `pinNormalize`'dan geçsin (QR'dan tam URL de gelebilir)
  - [ ] Kamera izni reddedilirse akış kırılmasın — elle giriş yedek yol
  - [ ] Kütüphane seçimi CSP ve paket boyutu açısından değerlendirilsin
- [ ] Sızmış şifre koruması — **Supabase panelinden tek tık, sizin yapmanız gerekiyor**

---

## Ödeme ve hesap yönetimi — sahipsiz havuzun devamı

**Zincirin durumu:** başvuru → ✅ çalışıyor · elle onay → ⛔ ekran yok, SQL ile
veriliyor · ödeme → ⛔ altyapı yok · geri yükleme → ✅ çalışıyor (iki kapı da
kapalıyken reddediyor).

Yani kullanıcı bugün başvuru gönderebiliyor ama başvuru sizin onayınızı
bekliyor ve onaydan sonra ödeme adımı yok. `odendi_at` alanı şimdiden duruyor;
tahsilat geldiğinde yalnızca o alan dolacak, şema değişmeyecek.

- [ ] Ödeme altyapısı (şu an **sıfır** — `PublishListingModal` içindeki ₺250 "DEMO ÖDEME")
  - [ ] Sağlayıcı seçimi (TR'de iyzico standart) ve üye işyeri sözleşmesi
  - [ ] 3D Secure akışı
  - [ ] Webhook rotası — projede `src/app/api/` klasörü hiç yok
  - [ ] Ödeme kayıt tablosu + fatura yükümlülüğü
  - [ ] Devir ücreti ve sahipsiz geri yükleme ücreti tanımı
- [ ] Elle onay ekranı — ruhsat inceleme, onay/ret (projede hiç yönetim ekranı yok)
- [ ] `/account` ekranı — şu an `ComingSoon` yer tutucusu, 17 satır
  - [ ] Profil düzenleme (ad, soyad, telefon)
  - [ ] Şifre değiştirme
  - [ ] Hesap kapatma talebi (silme **düğmesi** değil — KVKK 30 gün içinde cevap istiyor)

---

## Yasal metinler — yazılmadı, bağlantılar ölü

`Footer.jsx:73-75` üç bağlantı da tıklanamaz "Yakında" öğesi; alt şeritte
"Yasal metinler hazırlanıyor" yazıyor.

- [ ] KVKK aydınlatma metni
  - [ ] **Şu cümle mutlaka girecek:** yüklenen servis belgeleri araç sicilinin
        parçasıdır; araç el değiştirse veya hesap kapatılsa da araç kaydıyla
        kalır. Bu yazılmazsa tutulamayacak bir silme sözü verilmiş olur.
- [ ] Gizlilik politikası
- [ ] Kullanım şartları
- [ ] `Footer.jsx` — metinler yazılınca `YakindaOge` yerine gerçek bağlantı
- [ ] `VehicleAuthScreen.jsx:405-410` — "Bireysel Hesap Sözleşmesi" ve "KVKK
      Aydınlatma Metni" `<span>` olarak duruyor, `hover` sınıfı var ama `href`
      yok: kullanıcıya link gibi görünen ölü metin

---

## Şema kayması — depodan kurulan veritabanı eksik çıkıyor

`6fd41f9` ile 8 fonksiyon gövdesi düzeltildi, ama aynı sınıftan kalanlar var.

- [ ] `profiles` tablosunun tanımı hiçbir migration'da yok (panelden eklenmiş)
- [ ] `profiles.is_premium` kolonu hiçbir migration'da yok
- [ ] `vehicles`, `maintenance_records`, `listings` temel tanımları da eksik —
      `supabase db pull` ile temel migration üretilmeli
- [ ] CI 2. aşama (yerel Supabase) buna bağlı — Docker gerekiyor, kurulu değil

---

## Bekleyen küçük işler

- [ ] `Step2ListingDetails.jsx` bölme — sihirbaz test yardımcısı gelince
      (⚠ dosya plaka girişi içeriyor, dokunulmaz bölge)
- [ ] Sigorta iş ortağı akışı — ürün kararları gerekiyor
- [ ] Araç devri Faz 2 (`uuid` kimlik) — yalnızca **plaka değişikliği** için
      gerekli; satışta plaka araçta kaldığı için Faz 1 asıl senaryoyu çözdü
- [ ] `tests/07-devir.spec.js` temizlenemeyen artık bırakıyor — sahiplik
      geçmişi, devir kodları ve bildirimler kalıyor, o tablolar bilerek
      istemciye kapalı. Koşumdan sonra elle temizlik gerekiyor, CI'da koşmuyor
