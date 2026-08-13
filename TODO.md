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

- [x] 1 · `/devir` rotası açıldı — iki taraflı: satıcı aracını seçip kod
      üretiyor, alıcı plaka yazıyor ve `plaka_durumu` doğru diyaloğa
      yönlendiriyor (kod / talep / sahipsiz). Filo için arama ve kapaklı liste
- [x] 2 · Üst menüde "Karne Sorgula" → **"Araç Devir"**. Karne sorgulama
      anasayfa kartında, footer'da, `/devir` altında ve mobil menüde duruyor
- [x] 3 · Garaj araç kartları **beş katmandan üçe** indi
  - [x] Katman 1: fotoğraf · plaka · marka/model · skor (+ satıştaysa çip)
  - [x] Katman 2: üç poliçe çipi — tek bileşen (`PoliceCipi`); üçü ayrı
        kopyaydı ve üçüncüsünün dolgusu farklıydı, hiza bozuluyordu
  - [x] Katman 3: Detay · Karne · Bakım + `⋯` menüsü
  - [x] Poliçe çipleri `div` değil `button` — tıklanabilirdi ama klavyeyle
        erişilemiyordu
  - [x] İlan şeridi kalktı, satış durumu ince çipe indi (fiyat korundu)
- [x] 4 · Profil kartı kaldırıldı, yerine **Araç Merkezi** geldi
  - [x] Özet: kayıtlı araç · satışta · süresi kritik
  - [x] Üç eylem: satışa çıkar · aracı devret · bakım işle — her biri ikon,
        başlık ve tek satır açıklamayla; kapalıysa SEBEBİ yazıyor
  - [x] `AracSeciciDialog` — ortak "hangi araç?" adımı; 6 aracın üstünde
        arama beliriyor, satıştaki araç gizlenmiyor sebebiyle gösteriliyor
  - [x] "Filo" kelimesi kurumsal ürüne ayrıldı: bölüm adı Araç Merkezi,
        başlık "Garajım", şerit "Süre Uyarısı"
  - [x] Kart "Standart **Kurumsal** Üyelik" yazıyordu — sistemde kurumsal
        üyelik yok, herkes bireysel. Bu tutarsızlık da kalktı
- [x] ⚠ **Bulunan mevcut hata: modallar ekrana göre konumlanmıyordu.**
      `.animate-fadeIn` sınıfı `animation-fill-mode: both` taşıyordu;
      animasyon bitince bile `transform: matrix(1,0,0,1,0,0)` kalıyor ve
      `none` dışındaki her transform, içindeki `position: fixed` öğeler
      için kapsayıcı blok yaratıyor. Ölçüm: bakım modalı örtüsü
      `0,0,1440x1000` olması gerekirken `0,65,1440x1320` çıkıyordu —
      formun Kaydet düğmesi ekran dışında kalıyordu. Sınıf 58 yerde
      kullanılıyor. `both` kaldırıldı; garajdaki dört modalın dördü de
      ölçülerek doğrulandı
- [x] 5 · Hesap menüsü başlığı: baş harfler + ad soyad + üyelik rozeti,
      e-posta ikincil satırda. Garaj profil kartından taşınan bilgi burada
- [ ] 6 · **Hesabım ekranı** sektör standardında kurulacak (şu an `ComingSoon`)
  - [ ] ⚠ Ön koşul: `profiles` UPDATE politikası yok — yazılmadan düzenleme
        çalışmaz (yukarıdaki güvenlik bölümüne bakın)
- [x] 7 · Menü dışarı tıklayınca **ve Esc ile** kapanıyor. `aria-controls` +
      `aria-haspopup` eklendi (ekran okuyucu ve kararlı test bağlanma noktası)
- [x] 8 · "Ücretsiz İlan Ver" → **"Araç Kaydet"**. "Ücretsiz" kaldırıldı —
      ilk araç ücretsiz ama ikinci ve sonrası Ek Araç Kaydı gerektiriyor,
      yani yanlış olurdu
  - [x] Açılır panel **tamamen kaldırıldı**, tek düğme kaldı. Panel iki
        kart gösteriyordu ama ikincisi ("Aracımı Satışa Çıkar") yalnızca
        /garage'a gidiyordu — bir seçim değil, bir yönlendirmeydi. Üstelik
        yalnızca `onMouseEnter` ile açıldığı için klavye ve dokunmatik
        kullanıcı o karta hiç ulaşamıyordu. Masaüstü artık mobil çekmeceyle
        aynı davranıyor

---

## Sırada — bilinen boşluklar

- [ ] **Üyelik tipi: bireysel / kurumsal ayrımı** — acelesi yok, kurumsal
      fiyatlandırmayla birlikte yapılacak
  - [ ] Ayrım **KAYIT** ekranında olacak, giriş ekranında değil. Gerekçe:
        giriş yalnızca kimlik doğrular ve sistem tipi `profiles`'tan zaten
        okuyor. İki ayrı giriş kapısı olursa kullanıcı hangisinden kayıt
        olduğunu hatırlamak zorunda kalır; yanlış kapıdan girince ya
        "kullanıcı yok" der (oysa hesabı var) ya da sessizce çalışır ve iki
        kapı anlamsızlaşır. Şifre sıfırlama da bulanıklaşır. sahibinden ve
        arabam.com da tek giriş kapısı kullanıyor
  - [ ] `profiles.uye_tipi` ('bireysel' | 'kurumsal') — şu an veritabanında
        böyle bir kavram HİÇ YOK, sıfırdan kurulacak
  - [ ] Kurumsal kayıtta ek alanlar: firma unvanı, vergi no, yetkili kişi
  - [ ] Kurumsalın ön yüzü = "Kurumsal Çözümler". Şu an üç yerde yazıyor ve
        üçü de ölü: `Header.jsx`, `MobileDrawer.jsx`, `Footer.jsx`
  - [ ] Fiyatlandırma bireyselden ayrı liste (`paketler.js` bunu bekliyor)
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

**Devralma artık iki yollu ve hızlı yol insansız çalışıyor:**

| | Hızlı (otomatik) | Ruhsatlı (belgeli) |
|---|---|---|
| Koşul | beyan + 7 gün + ödeme | ruhsat + elle inceleme |
| Bakım kayıtları | açılır | açılır |
| Fatura görselleri | **kapalı kalır** | açılır |
| İnsan gücü | **sıfır** | yalnızca bu yolda |

Gerekçe: otomatik onayın riski ödeme değil **veri** — plakayı bilen biri ödeyip
eski sahibin adı-adresi yazılı faturalarını alabilirdi. Zararı onayı
zorlaştırarak değil veriyi ayırarak kaldırdık. Belge kısıtını kaldırmak
**ücretsiz** (kısıt paywall değil, gizlilik önlemi).

- [x] `yol` ve `beyan_metni` kolonları, tutarlılık kısıtı
- [x] `vehicles.belge_erisimi_kisitli` + storage politikasında zorlanıyor
- [x] `sahipsiz_otomatik_tamamla` — bekleme + ödeme kapıları, kullanıcıya açık
- [x] `belge_kisiti_talep_et` / `belge_kisiti_kaldir` — sonradan ruhsat doğrulama
- [x] Karne kilitli belgeleri saklamıyor (`belgeler_kisitli` işareti)
- [x] Diyalog iki yolu da sunuyor, farkı seçim anında yazıyor
- [ ] Yönetim ekranı — ruhsat inceleme (şu an SQL ile onaylanıyor)
- [ ] Hesap kapatma akışına "araçlarınızı devretmek ister misiniz?" adımı —
      **sahipsiz araç oluşmasını engelleyen asıl önlem**

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

- [x] `/kvkk`, `/gizlilik`, `/kullanim-sartlari` rotaları açıldı
- [x] Sayfalar sistemin **fiilen ne yaptığını** anlatıyor (şemadan ve RLS'ten
      okunmuş olgular) ve nihai metnin hazırlandığını üstte açıkça söylüyor
- [x] Belge cümlesi KVKK sayfasında yer alıyor: "Yüklediğiniz servis belgeleri
      araç sicilinin parçasıdır; araç el değiştirse veya hesabınızı kapatsanız
      da araç kaydıyla birlikte kalır."
- [x] `Footer.jsx` üç bağlantı da canlı; alt şeritteki "Yasal metinler
      hazırlanıyor" uyarısı kaldırıldı (artık yanlış olurdu)
- [x] `VehicleAuthScreen` içindeki ölü `<span>`'ler gerçek bağlantı oldu
- [x] Yasal sayfalar `sitemap.xml`'e ve rota testine eklendi
- [ ] **Nihai metinleri siz yazacaksınız** — hukuk danışmanı onayıyla

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
