-- =========================================================================
-- ÇAKIŞAN POLİTİKALARIN BİRLEŞTİRİLMESİ + YİNELENEN KISITIN DÜŞÜRÜLMESİ
--
-- -------------------------------------------------------------------------
-- 1. ÇAKIŞAN İZİN VERİCİ POLİTİKALAR
-- -------------------------------------------------------------------------
-- İzin verici (permissive) politikalar OR ile birleşir ve PostgreSQL
-- HEPSİNİ her sorgu için çalıştırır. `vehicles` ve `listings` üzerinde aynı
-- işi yapan iki politika vardı; ikisi de birebir aynı yüklemi taşıyordu.
--
-- ⚠ ERİŞİM GENİŞLEMİYOR, DARALMIYOR. Ölçüldü — kalan ve düşürülen
-- politikaların yüklemi aynı:
--
--   vehicles
--     KALAN    "Kullanıcılar sadece kendi aracını yönetebilir"
--              ALL / {public} / USING (auth.uid() = user_id)
--     DÜŞEN    "Kullanıcılar sadece kendi garajına araç ekleyebilir"
--              INSERT / {public} / WITH CHECK (auth.uid() = user_id)
--     DÜŞEN    "vehicles_oku_sahip"
--              SELECT / {authenticated} / USING (auth.uid() = user_id)
--
--   listings
--     KALAN    "Kullanıcılar kendi ilanlarını yönetebilir"
--              ALL / {public} / USING (auth.uid() = user_id)
--     DÜŞEN    "vitrin_kaydi_sahibine_gorunur"
--              SELECT / {authenticated} / USING (auth.uid() = user_id)
--
-- ⚠ `ALL` POLİTİKASI INSERT'İ DE KAPSIYOR — BU DAVRANIŞ BELGELENMİŞTİR.
-- PostgreSQL: bir politikada `WITH CHECK` yazılmamışsa, `USING` ifadesi
-- hem görünürlüğü hem de EKLENECEK YENİ SATIRIN denetimini belirler. Yani
-- düşürülen INSERT politikası gereksiz bir tekrardı.
--
-- ⚠ ROL FARKI DA ERİŞİMİ GENİŞLETMİYOR. Kalan politikanın rolü `{public}`,
-- düşenlerinki `{authenticated}`. `public` üst küme; ama yüklem `auth.uid()`
-- eşitliği olduğu için anon oturumda `NULL = user_id` -> NULL -> yanlış.
-- Yani `{public}` pratikte "oturum açmış ve sahibi olan" demek.
--
-- -------------------------------------------------------------------------
-- 2. YİNELENEN BENZERSİZLİK KISITI
-- -------------------------------------------------------------------------
-- ⚠ PLAKA BENZERSİZLİĞİ ZAYIFLAMIYOR. Ölçüldü:
--
--   vehicles_pkey                     UNIQUE (plate_number)  <- BİRİNCİL ANAHTAR
--   vehicles_plate_number_unique_key  UNIQUE (plate_number)  <- ikinci kopya
--
-- Aynı sütunda iki özdeş benzersiz indeks; her araç yazmasında ikisi birden
-- güncelleniyordu. Birincil anahtar benzersizliği zaten uyguluyor ve diğer
-- tablolardan gelen 11 yabancı anahtarın HEPSİ `vehicles_pkey`'e bağlı
-- (`pg_constraint.conindid` ile doğrulandı). Düşürülen kısıt hiçbir
-- bağlantı taşımıyor.
--
-- ⚠ UYGULAMADAN SONRA DENEYEREK KANITLANDI: aynı plakadan ikinci kayıt
-- açılmaya çalışıldı ve `unique_violation` ile reddedildi. Araç sayısı
-- değişmedi.
-- =========================================================================

drop policy if exists "Kullanıcılar sadece kendi garajına araç ekleyebilir" on public.vehicles;
drop policy if exists "vehicles_oku_sahip" on public.vehicles;
drop policy if exists "vitrin_kaydi_sahibine_gorunur" on public.listings;

alter table public.vehicles
  drop constraint if exists vehicles_plate_number_unique_key;
