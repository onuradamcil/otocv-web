-- =========================================================================
-- ARAÇ GÖRSELLERİNDE SAHİPLİK — "kimse kimsenin görselini silemesin"
--
-- -------------------------------------------------------------------------
-- ÖNCEKİ ADIM YETMİYORDU
-- -------------------------------------------------------------------------
-- Bir önceki migration rolü PUBLIC'ten `authenticated`e daraltmıştı; anon
-- saldırısı kesilmişti ama OTURUM AÇMIŞ herhangi biri hâlâ BAŞKASININ
-- görselini silebiliyordu. Bu onu kapatıyor.
--
-- -------------------------------------------------------------------------
-- NİYE SAHİPLİK `vehicles` ÜZERİNDEN DENETLENEMİYOR
-- -------------------------------------------------------------------------
-- İlk akla gelen çözüm "klasör adı = plaka, plakanın sahibi mi?" idi.
-- Kodu okuyunca ÜÇ ayrı sebeple çalışmayacağı görüldü:
--
--  1. Fotoğraflar ARAÇ KAYDI OLUŞMADAN yükleniyor. Yükleme Adım 1 -> 2
--     geçişinde, araç ise ancak yayında yaratılıyor. Yani yükleme anında
--     "bu plakanın sahibi mi" sorusunun cevabı YOK — koşul her yüklemeyi
--     reddederdi ve yeni araç kaydı tamamen kırılırdı.
--
--  2. Silme, TASLAK İPTALİNDE çağrılıyor (`handleDiscardDraft`). Orada da
--     araç yok; kullanıcı kendi taslak fotoğraflarını temizleyemezdi.
--
--  3. Klasör adı canlıda ÜÇ farklı biçimde birikmiş:
--        34SDF4567    (boşluksuz)
--        41_IHH_434   (alt çizgili)
--        34 FB 1907   (boşluklu)
--     Plakayla düz karşılaştıran bir koşul bu dosyalarda sessizce
--     başarısız olurdu. Aynı tuzak FATURA kovasında da yaşandı ve orada
--     klasör kullanıcı kimliğine taşınarak çözülmüştü.
--
-- -------------------------------------------------------------------------
-- ÇÖZÜM: KLASÖRÜN İLK PARÇASI KULLANICI KİMLİĞİ
-- -------------------------------------------------------------------------
-- Yeni yol düzeni: <user_id>/<plaka>/<dosya>  (plaka yoksa 'taslak')
-- İstemci tarafı `CreateListingWizard.jsx` içindeki `aracGorseliKlasoru`
-- ile üretiliyor ve BU MIGRATION'DAN ÖNCE yayına alındı — sıra önemliydi:
-- politika önce sıkılsaydı eski istemci yükleyemezdi.
--
-- Kullanıcı kimliği biçimlendirmeye bağlı değil ve yükleme anında zaten
-- biliniyor. Politika tek satırla denetliyor.
--
-- -------------------------------------------------------------------------
-- ESKİ DOSYALAR: İKİNCİ DAL
-- -------------------------------------------------------------------------
-- Kovada 23 eski klasör var. Silme politikasındaki ikinci dal, plaka adlı
-- klasörü YALNIZCA o plakanın sahibine açıyor; klasör adı alfanümerik dışı
-- karakterlerden arındırılarak karşılaştırılıyor, böylece üç biçim de
-- eşleşiyor.
--
-- Canlıda ölçüldü:
--    12 klasör gerçek sahibine çözülüyor ("34 FB 1907" dahil)
--    11 klasör SAHİPSİZ — hiçbir araca ait değil
--
-- ⚠ O 11 klasördeki dosyaları artık KİMSE silemiyor. Bunlar silinmiş ya da
-- hiç oluşturulmamış araçlardan kalma artıklar. Silinmezlik güvenli taraf;
-- temizlikleri ayrı bir iş ve `service_role` ile yapılmalı.
--
-- -------------------------------------------------------------------------
-- OKUMA AÇIK KALIYOR
-- -------------------------------------------------------------------------
-- Vitrin kamuya açık ve araç görselleri ziyaretçinin görmesi gereken tek
-- dosya türü. Fatura görselleri ayrı kovada, imzalı URL ile korunuyor.
--
-- -------------------------------------------------------------------------
-- DOĞRULAMA — GERÇEK İSTEMCİLERLE
-- -------------------------------------------------------------------------
--   sahip kendi klasörüne yükledi        : EVET
--   başkası o klasöre yükleyebildi       : HAYIR (reddedildi)
--   başkası sildi mi                     : HAYIR — dosya duruyor
--   anon sildi mi                        : HAYIR — dosya duruyor
--   sahip kendi dosyasını sildi          : EVET
--   anon okuma (vitrin için şart)        : AÇIK
--
-- ⚠ Supabase `remove()` RLS engellediğinde HATA DÖNDÜRMÜYOR, sessizce
-- hiçbir şey silmiyor. Bu yüzden her denemede dosyanın hâlâ durduğu ayrıca
-- kontrol edildi — "hata yok" başarı kanıtı değil.
-- =========================================================================

drop policy if exists "arac_gorseli_sil_oturumlu" on storage.objects;
drop policy if exists "arac_gorseli_yukle_oturumlu" on storage.objects;

create policy "arac_gorseli_yukle_kendi_klasoru"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "arac_gorseli_sil_kendi_klasoru"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (
      -- yeni düzen
      (storage.foldername(name))[1] = auth.uid()::text
      -- eski düzen: plaka adlı klasör, yalnızca o plakanın sahibine
      or exists (
        select 1 from public.vehicles v
        where v.user_id = auth.uid()
          and upper(regexp_replace((storage.foldername(objects.name))[1], '[^A-Za-z0-9]', '', 'g'))
              = upper(v.plate_number)
      )
    )
  );

create policy "arac_gorseli_guncelle_kendi_klasoru"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
