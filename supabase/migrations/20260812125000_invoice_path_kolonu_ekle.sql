-- =========================================================================
-- A4 ADIMI · invoice_path KOLONU
--
-- -------------------------------------------------------------------------
-- NEDEN TAM URL SAKLAMAK YANLIŞTI
-- -------------------------------------------------------------------------
-- `invoice_url` tam bir public URL tutuyordu:
--
--   https://<proje>.supabase.co/storage/v1/object/public/vehicle-images/41IHH434/invoice_1234.jpg
--
-- Üç sorun:
--   1. URL'nin KENDİSİ sızıntıdır. Değeri döndüren her sorgu, dosyaya
--      kalıcı erişim dağıtır — bucket public olduğu için URL'yi bilen
--      görseli açar. Fatura görselleri araç sahibinin adını, adresini ve
--      plakasını taşır.
--   2. Bucket adı ve erişim biçimi veriye gömülü. Bucket'ı özel yapmak ya
--      da taşımak, saklanan her satırı geçersiz kılar.
--   3. İmzalı bağlantıya geçilemez. İmzalı bağlantı istemek için yola
--      ihtiyaç var; elde tam URL varsa yol her seferinde ayrıştırılmalı.
--
-- Doğrusu yalnızca bucket İÇİ YOLU saklamak. Erişim kararı her istekte
-- yeniden verilir ve bağlantı 60 saniyede ölür.
--
-- -------------------------------------------------------------------------
-- NEDEN BU MIGRATION KOLONU DOLDURMUYOR
-- -------------------------------------------------------------------------
-- Yeni yol şeması `<user_id>/<plaka>/<dosya>`. Dosyalar şu an public
-- bucket'ta `<plaka>/<dosya>` altında. Yani dönüşüm saf metin işlemi değil:
-- dosyanın FİZİKSEL OLARAK yeni bucket'a ve yeni yola taşınması gerekiyor.
-- Bu bir Storage API işlemi, SQL'in yapabileceği bir şey değil.
--
-- Bu yüzden iş üçe bölündü:
--   1. (bu migration)  invoice_path kolonu eklenir, invoice_url DURUR
--   2. scripts/faturalari-tasi.mjs   dosyaları taşır ve invoice_path'i doldurur
--   3. (ayrı migration) doğrulamadan SONRA invoice_url düşürülür
--
-- Eski kolonu hemen düşürmemek kasıtlı: taşıma yarım kalırsa geri dönüş
-- yolu açık kalsın. Tek bir migration'da yapıp "oldu" demek, doğrulanmamış
-- bir veri dönüşümüne güvenmek olurdu.
-- =========================================================================

alter table public.maintenance_records
  add column if not exists invoice_path text;

comment on column public.maintenance_records.invoice_path is
  'Fatura görselinin vehicle-invoices bucket''ı içindeki yolu: <user_id>/<plaka>/<dosya>. Tam URL SAKLANMAZ; erişim her istekte imzalı bağlantıyla verilir. Ziyaretçiye sicil_getir() tarafından döndürülmez.';

-- Sicil fonksiyonu bu kolonu her araç için okuyor; kayıt sayısı büyüdükçe
-- fatura varlığı sorgusu tam tablo taraması olmasın.
create index if not exists bakim_fatura_yolu_idx
  on public.maintenance_records (vehicle_plate)
  where invoice_path is not null;
