-- =========================================================================
-- ⚠ GÜVENLİK: vehicle-images KOVASI ANON'A AÇIKTI
--
-- -------------------------------------------------------------------------
-- BULUNAN
-- -------------------------------------------------------------------------
-- `pg_policy` üzerinden ölçüldü:
--
--   "Allow Delete Images"              DELETE  rol PUBLIC  bucket_id='vehicle-images'
--   "Herkes araç resmi yükleyebilsin"  INSERT  rol PUBLIC  bucket_id='vehicle-images'
--
-- Rol sütunu boş, yani PUBLIC — anon dahil herkes. Anon anahtarı istemci
-- paketinin içinde ve herkese açık. Sonuç: internetteki herkes üründeki
-- TÜM araç görsellerini silebiliyordu ve kovaya keyfî dosya yükleyebiliyordu
-- (MIME ve boyut süzgeci de yok).
--
-- Canlı veritabanının yedeği yok. Yani bu, geri alınamaz bir veri kaybı
-- kapısıydı.
--
-- -------------------------------------------------------------------------
-- BU MIGRATION NE YAPIYOR: ROLÜ DARALTIYOR
-- -------------------------------------------------------------------------
-- PUBLIC -> authenticated. Kırılma riski yok: silme ve yükleme yalnızca araç
-- kayıt sihirbazından, oturum açıkken yapılıyor
-- (CreateListingWizard.jsx:180-199).
--
-- OKUMA bilerek açık bırakıldı. Vitrin kamuya açık ve araç görselleri
-- ziyaretçinin görmesi gereken tek dosya türü. Fatura görselleri ayrı
-- kovada, imzalı URL ile korunuyor.
--
-- -------------------------------------------------------------------------
-- ⚠ EKSİK KALAN: SAHİPLİK KONTROLÜ
-- -------------------------------------------------------------------------
-- Oturum açmış bir kullanıcı hâlâ BAŞKASININ görselini silebiliyor. Bunu
-- kapatmak için klasör adını araç sahipliğiyle eşleştiren bir koşul gerekiyor
-- ve o koşul DİKKAT İSTİYOR:
--
--   klasör adı : plakanın [^a-zA-Z0-9] -> '_' ile temizlenmiş hâli
--                ('41_IHH_434')
--   plaka      : veritabanında boşluksuz ('41IHH434')
--
-- Aynı uyumsuzluk fatura kovasında yaşandı; orada klasör adı `user_id`ye
-- taşınarak çözüldü (CreateListingWizard.jsx:293'teki not). Geçmiş dosyalar
-- iki biçimde birden bulunabileceği için koşul önce ölçülüp test edilerek
-- eklenmeli: yanlış yazılan bir koşul, sahibin KENDİ görselini silememesine
-- yol açar ve bu sessizce olur.
--
-- -------------------------------------------------------------------------
-- DOĞRULAMA — TARAYICI DEĞİL, GERÇEK İSTEMCİ İLE
-- -------------------------------------------------------------------------
--   anon yükleme : REDDEDİLDİ ("new row violates row-level security policy")
--   anon silme   : sahibin yüklediği dosya HAYATTA KALDI
--   anon okuma   : AÇIK (vitrin için doğru)
--   sahip yükleme/silme : ÇALIŞIYOR
--
-- ⚠ Supabase `remove()` RLS engellediğinde HATA DÖNDÜRMÜYOR, sessizce
-- hiçbir şey silmiyor. Yani "hata yok" başarı kanıtı değil — kilidi
-- doğrulamak için dosyanın hâlâ durduğu ayrıca kontrol edildi.
-- =========================================================================

drop policy if exists "Allow Delete Images" on storage.objects;
create policy "arac_gorseli_sil_oturumlu"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vehicle-images');

drop policy if exists "Herkes araç resmi yükleyebilsin" on storage.objects;
create policy "arac_gorseli_yukle_oturumlu"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vehicle-images');
