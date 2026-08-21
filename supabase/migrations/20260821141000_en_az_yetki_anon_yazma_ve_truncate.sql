-- =========================================================================
-- EN AZ YETKİ: anon'un YAZMA ve TRUNCATE yetkileri geri alındı
--
-- -------------------------------------------------------------------------
-- SORUN — VE NEDEN "SUPABASE HATASI" DEĞİL
-- -------------------------------------------------------------------------
-- Ölçüldü: `anon` ve `authenticated` rolleri public şemadaki 17 tabloda
-- `INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT` yetkisine
-- sahipti. Kaynağı `pg_default_acl`: Supabase her yeni tabloya bu rollere
-- `arwdDxtm` (tüm yetkiler) veriyor.
--
-- Bu Supabase'in bilinçli modeli: "GRANT katmanı açık, RLS süzer". Kimsenin
-- yaptığı bir hata değil. Ama modelin BİR DELİĞİ var:
--
-- ⚠ `TRUNCATE` RLS'E TABİ DEĞİLDİR.
-- RLS satır süzer; `TRUNCATE` tabloyu satır satır değil TOPTAN boşaltır ve
-- politikalara hiç bakmaz. Yani `anon` anahtarı — ki her tarayıcıda açıkta
-- duruyor — teorik olarak tabloları boşaltabilecek bir yetki taşıyordu.
--
-- ⚠ BUGÜN SÖMÜRÜLEBİLİR DEĞİLDİ, BU DA ÖLÇÜLDÜ: PostgREST'in TRUNCATE uç
-- noktası yok ve `prosrc ~* 'truncate'` taraması hiçbir fonksiyon
-- döndürmedi. Yani dolu bir silahtı, ateşlenmemişti. Bu migration silahı
-- boşaltıyor: yarın biri TRUNCATE kullanan bir fonksiyon yazdığında ya da
-- bir uç nokta eklendiğinde geriye tek bir yanlış politika kalmasın.
--
-- -------------------------------------------------------------------------
-- NİYE ANON'DAN YAZMA DA ALINIYOR
-- -------------------------------------------------------------------------
-- Ölçüldü: `auth.uid()`e bağlı OLMAYAN, anon'a açık tek bir yazma politikası
-- YOK. Yani anon yazma denemeleri bugün zaten RLS'te düşüyor. Bu değişiklik
-- davranışı değiştirmiyor; yalnızca reddin GRANT katmanında, yani RLS'e hiç
-- gelmeden olmasını sağlıyor. İki bağımsız kapı, tek kapı yerine.
--
-- -------------------------------------------------------------------------
-- ⚠ BİLEREK YAPILMAYANLAR
-- -------------------------------------------------------------------------
-- 1. `FORCE ROW LEVEL SECURITY` AÇILMADI. "Daha güvenli" görünür ama bu
--    projedeki 41 SECURITY DEFINER fonksiyonunun HEPSİNİ kırardı: onlar
--    tablo sahibi olarak çalışıp RLS'i bilerek atlıyor, mimarinin temeli bu.
--
-- 2. `authenticated` ROLÜNDEN YAZMA ALINMADI. İstemci `vehicles`,
--    `profiles`, `maintenance_records` gibi tablolara doğrudan yazıyor ve
--    RLS bunları sahibine kilitliyor. Almak ürünü durdururdu.
--
-- 3. anon'un SELECT'İ GENEL OLARAK ALINMADI. Hangi tabloların oturumsuz
--    okunduğu ölçülmeden daraltmak sessiz kırılma riski taşıyor. RLS zaten
--    süzüyor. Ayrı ve ölçülmüş bir adım olarak ele alınacak.
--
-- 4. `supabase_admin` ÖNTANIMLI YETKİ KURALINA DOKUNULMADI — platform
--    yönetiyor, değiştirmek güncellemelerde geri gelir ya da iç servisleri
--    kırar. Yalnızca `postgres` sahipli kural düzeltildi.
--
-- -------------------------------------------------------------------------
-- UYGULAMA SONRASI ÖLÇÜM
-- -------------------------------------------------------------------------
--   rol             TRUNCATE  REFERENCES  TRIGGER  INSERT  UPDATE  DELETE  SELECT
--   anon                   0           0        0       0       0       0      16
--   authenticated          0           0        0      16      16      16      17
-- =========================================================================

-- --- 1. Mevcut tablolar --------------------------------------------------
-- API üzerinden hiçbir zaman gerekmeyen üç yetki, her iki rolden de alınıyor.
revoke truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

-- anon hiçbir tabloya yazmıyor (ölçüldü). Yazma yetkisi tamamen alınıyor.
revoke insert, update, delete
  on all tables in schema public
  from anon;

-- --- 2. Artık yedek tablosu ---------------------------------------------
-- 11 satır gerçek araç/sahip verisi tutuyor ve hiçbir politikası yok.
-- Düşürmek ayrı bir karar; şimdilik erişimi tamamen kapatılıyor.
revoke all on public.vehicles_yedek_20260819 from anon, authenticated;

-- --- 3. Tekrarı önle -----------------------------------------------------
-- ⚠ BU SATIR OLMAZSA SONRAKİ HER YENİ TABLO AYNI DELİĞİ AÇAR. Öntanımlı
-- yetki kuralı `postgres` sahipli nesneler için düzeltiliyor.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

alter default privileges in schema public
  revoke insert, update, delete on tables from anon;
