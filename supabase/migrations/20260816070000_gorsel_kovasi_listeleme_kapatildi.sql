-- =========================================================================
-- ARAÇ GÖRSELİ KOVASI ZİYARETÇİYE LİSTELENİYORDU
--
-- -------------------------------------------------------------------------
-- SÖMÜRÜLDÜ, SONRA KAPATILDI
-- -------------------------------------------------------------------------
-- `vehicle-images` kovasında şu politika duruyordu:
--
--   "Herkes araç resmini görebilsin"  SELECT  to public
--   using (bucket_id = 'vehicle-images')
--
-- Koşul yalnızca kovayı denetliyordu, satırı değil. Sonuç: anon anahtarla
-- tek bir `list` çağrısı kovadaki TÜM klasör adlarını döküyordu ve klasör
-- adları PLAKAYDI.
--
-- Kanıtlandı (16 Ağustos 2026, anon anahtarla):
--   POST /storage/v1/object/list/vehicle-images  ->  16 klasör adı
--   01 ABC 01 · 01_DNM_0012 · 01_ONR_0001 · 06 ONR 06 · 06_ONR_997 · …
--
-- Yani ürünün plakayı gizlemek için yaptığı her şey — karnede basmamak,
-- RPC'de `plate_number: null` döndürmek, ekranda "ziyaretçiler plakanızı
-- göremez" yazmak — tek bir liste çağrısıyla boşa çıkıyordu.
--
-- -------------------------------------------------------------------------
-- ⚠ NİYE GENEL OKUMA KAYBOLMUYOR
-- -------------------------------------------------------------------------
-- Kova PUBLIC ve genel adres `/object/public/<kova>/<yol>` RLS'ten
-- GEÇMİYOR. Politika yalnızca API yolunu ve `list` çağrısını denetliyor.
-- Bu yüzden politika daraltılınca listeleme kapanıyor ama vitrindeki ve
-- karnedeki görseller aynen açılmaya devam ediyor.
--
-- ÖLÇÜLDÜ, VARSAYILMADI (değişiklikten hemen sonra):
--   anon list                -> boş liste
--   /object/public/... (GET) -> HTTP 200
--   sahip kendi klasörü      -> 10 alt klasör (temizlik çalışıyor)
--   35 görsel adresi         -> 35 açıldı, 0 kırık
--
-- -------------------------------------------------------------------------
-- ⚠ SAHİBİN LİSTELEME HAKKI ŞART — SİLİNİRSE TEMİZLİK BOZULUR
-- -------------------------------------------------------------------------
-- `CreateListingWizard.deleteStorageFolder` taslak görsellerini silmeden
-- önce klasörü `list` ediyor. Sahibe SELECT verilmezse liste boş dönüyor,
-- hiçbir dosya silinmiyor ve taslak görselleri kovada birikiyor —
-- sessizce, hata vermeden.
--
-- İkinci dal (plaka adlı klasör) eski düzen için: klasör kimliği
-- taslakla saklanmaya yeni başladı, daha önce kaydedilmiş taslakların
-- görselleri hâlâ plaka adlı klasörde. O dal düşerse eski taslaklar
-- temizlenemez hâle gelir.
-- =========================================================================

drop policy if exists "Herkes araç resmini görebilsin" on storage.objects;

create policy "arac_gorseli_oku_kendi_klasoru"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      -- eski düzen: plaka adlı klasör, yalnızca o plakanın sahibine
      or exists (
        select 1 from public.vehicles v
        where v.user_id = auth.uid()
          and upper(regexp_replace((storage.foldername(objects.name))[1], '[^A-Za-z0-9]', '', 'g'))
              = upper(regexp_replace(v.plate_number, '[^A-Za-z0-9]', '', 'g'))
      )
    )
  );
