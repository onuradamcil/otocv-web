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

## Arayüz turu — 13 Ağustos'ta belirlenen dokuz madde

Ekran görüntüleri üzerinden tespit edildi. **Önce yukarıdaki güvenlik/kilit
maddeleri bitecek, sonra bunlara geçilecek.**

- [ ] 1 · Devir **alma** ekranı yok. Kullanıcı aracını devredebiliyor ama
      devralma yalnızca ilan sihirbazının içinden erişilebiliyor — bağımsız
      bir giriş noktası gerekiyor
- [ ] 2 · Anasayfada künye/karne sorgulama **iki yerde**: üst menüdeki
      "Karne Sorgula" → **"Araç Devir"** olacak, devir işlemleri oradan
- [ ] 3 · Garaj araç kartları kalabalık (plaka+skor, 3 poliçe kutusu, ilan
      şeridi, devret şeridi, 3'lü aksiyon satırı = beş katman)
- [ ] 4 · Profil kartı kaldırılacak; yerine vitrin + devir için gerçek bir
      **eylem merkezi** gelecek. Sadece düğme koymak değil — kartları
      ferahlatacak şekilde tasarlanacak
- [ ] 5 · Hesap açılır menüsünde e-posta yerine daha iyi bir başlık tasarımı
- [ ] 6 · **Hesabım ekranı** sektör standardında kurulacak (şu an `ComingSoon`)
  - [ ] ⚠ Ön koşul: `profiles` UPDATE politikası yok — yazılmadan düzenleme
        çalışmaz (yukarıdaki güvenlik bölümüne bakın)
- [ ] 7 · Açılır menü dışarı tıklanınca kapanmıyor
- [ ] 8 · "Ücretsiz İlan Ver" paneli revize — eski ilan sitesi kalıntısı;
      "ilan/ücretsiz" dili ürüne uymuyor, sicil diline çevrilecek

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

- [x] Ürün kararı: bireysel tarafta **işlem başına**, abonelik yok
- [x] Ücret listesi tek kaynakta — `src/data/paketler.js` (RevenueCat'e hazır alanlar)
- [x] `PaywallDialog` — demo paywall, dört ürünü de gösteriyor
- [x] `/packages` yer tutucudan gerçek **Ücretler** ekranına çevrildi
- [x] Vitrin dopingi paywall'dan geçiyor (tek gerçek fiyat: ₺250)
- [ ] Ödeme altyapısı (şu an **sıfır**)
  - [ ] Sağlayıcı seçimi (TR'de iyzico standart) ve üye işyeri sözleşmesi
  - [ ] 3D Secure akışı
  - [ ] Webhook rotası — projede `src/app/api/` klasörü hiç yok
  - [ ] Ödeme kayıt tablosu + fatura yükümlülüğü
  - [ ] `paketler.js` içindeki `DEMO_MOD` kapatılacak — **kilitlerle aynı turda**
- [ ] Elle onay ekranı — ruhsat inceleme, onay/ret (projede hiç yönetim ekranı yok)
- [ ] Kurumsal/galeri fiyatlandırması — ayrı liste, `paketler.js` içine eklenecek

### ✅ Paywall kilitleri kuruldu — artık atlanamıyor

Kilitler **politika değil tetikleyici** ile kuruldu: `vehicles` üzerinde
INSERT'e izin veren iki permissive politika var ve Postgres onları OR'luyor,
yani politikaya koşul eklemek işe yaramazdı.

- [x] `listings.is_featured` istemciden yazılamıyor (`listings_vitrin_denetle`)
- [x] Araç kotası uygulanıyor (`vehicles_kota_denetle`) — ilk araç ücretsiz,
      sonrası "ek_arac" satın alması istiyor. **Mevcut araçlar etkilenmedi**
- [x] `profiles` INSERT `auth.uid() = id` — başkasının profili oluşturulamıyor
- [x] `profiles` UPDATE politikası yazıldı — Hesabım ekranının ön koşulu hazır
- [x] `is_premium` istemciden yazılamıyor (`profiles_premium_koru`)
- [x] Ayrıcalık `satin_almalar` kaydından türüyor; tablo istemciye salt okunur
- [x] `tests/09-yetki-kilitleri.spec.js` — 9 test, CI'da koşuyor
- [ ] Gerçek tahsilat bağlanınca `demo_satin_alma` yetkisi geri alınacak

> ⚠ **Sizin hesabınız için not:** kota artık işliyor. 10 aracınız olduğu için
> 11. araç "Ek Araç Kaydı" isteyecek. Test sırasında engel olursa premium
> vermek yeterli:
> `update public.profiles set is_premium = true where id = '<user_id>';`
> (bu komut yalnızca SQL panelinden çalışır — istemciden yazılamıyor)
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
