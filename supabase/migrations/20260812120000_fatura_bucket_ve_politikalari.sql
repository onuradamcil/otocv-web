-- =========================================================================
-- A ADIMI · FATURALAR İÇİN AYRI VE ÖZEL (PRIVATE) BUCKET
--
-- -------------------------------------------------------------------------
-- SORUN
-- -------------------------------------------------------------------------
-- Fatura görselleri ve araç fotoğrafları AYNI bucket'ta (`vehicle-images`)
-- ve ikisi de `getPublicUrl` ile servis ediliyor — yani bucket public.
--
-- Sonuç: fatura görselleri, URL'yi bilen herkese KALICI olarak açık.
-- Veritabanı tablosunu tamamen kilitlemek bunu çözmez; tabloyu kilitlemek
-- yalnızca URL'nin keşfini zorlaştırır, bir kez URL'yi görmüş olan
-- erişimini asla kaybetmez.
--
-- Fatura görselleri araç sahibinin ADINI, ADRESİNİ ve PLAKASINI taşır.
-- Plakayı URL'lerden ve ziyaretçi arayüzünden KVKK gerekçesiyle kaldırdık;
-- public bucket o çabayı boşa çıkarıyordu.
--
-- Ayrıca (e) gelir kanalı ("fatura görselleri premium") şu an HİÇ
-- uygulanmıyor: VehicleDetailsScreen invoice_url'i koşulsuz okuyor,
-- karnedeki "TRAMER VE USTA FATURALARI KİLİTLİ" yazısı görselin üstüne
-- çizilmiş bir etiket — kontrol değil.
--
-- -------------------------------------------------------------------------
-- NEDEN YOL ŞEMASI KULLANICI KİMLİĞİNE DAYANIYOR (plakaya değil)
-- -------------------------------------------------------------------------
-- İki yükleme yolu aynı araç için FARKLI klasör adı üretiyordu:
--
--   CreateListingWizard : rawPlate.replace(/[^a-zA-Z0-9]/g,'_')  ->  34_ABC_123
--   MaintenanceDialog   : activePlate ham kullanılıyor           ->  34 ABC 123
--
-- Bugünkü plakalarda boşluk olmadığı için tesadüfen çakışıyorlar, ama
-- MaintenanceDialog'un varsayılanı '34 ABC 123' (boşluklu). Klasör adını
-- plakayla karşılaştıran bir politika bu yüzden öngörülemez biçimde ya
-- açık ya kapalı kalırdı — güvenlik kararı asla tesadüfe bırakılmaz.
--
-- Bu yüzden yol şeması:   <user_id>/<plaka>/<dosya>
-- Politika tek satır ve kırılmaz: ilk klasör auth.uid() mi?
-- Plaka biçimine, temizlemeye ve vehicles tablosuna hiç bağımlı değil.
-- Araç kaydı henüz oluşmamışken bile çalışır.
--
-- -------------------------------------------------------------------------
-- AŞAMA 1 · SAHİP ODAKLI (bu migration)
-- -------------------------------------------------------------------------
-- Yalnızca araç sahibi kendi faturasını okur. Ziyaretçi fatura yolunu hiç
-- görmez (sicil_getir fonksiyonu döndürmez).
--
-- Premium ziyaretçinin fatura görmesi BİLEREK bu aşamada yok. Politikaya
-- "premium okuyabilir" eklemek, premium kullanıcıya bucket'taki HER
-- faturayı açma hakkı verirdi — sorguladığı aracın değil, hepsinin. En az
-- yetki ilkesine aykırı.
--
-- AŞAMA 2 (premium gerçekten satılmaya başlayınca): bir Edge Function
-- çağıranın premium olduğunu VE istediği yolun sorguladığı PIN'e ait
-- olduğunu doğrulayıp 60 saniyelik imzalı bağlantı üretir. Postgres
-- fonksiyonu Storage API'sini çağıramadığı için o iş oraya ait.
-- =========================================================================

-- 1) ÖZEL BUCKET
-- public = false: getPublicUrl artık işe yaramaz, yalnızca imzalı bağlantı
-- ya da politikadan geçen doğrudan istek dosyaya ulaşır.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-invoices',
  'vehicle-invoices',
  false,
  10485760,                                     -- 10 MB: fatura fotoğrafı için bol
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do update
  set public = false,                           -- yeniden çalıştırılırsa yine özel kalsın
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) OKUMA — yalnızca dosyanın sahibi
--
-- (storage.foldername(name))[1] yolun ilk klasörünü verir. Şema
-- <user_id>/<plaka>/<dosya> olduğu için bu doğrudan sahibin kimliği.
drop policy if exists "fatura_oku_sahip" on storage.objects;
create policy "fatura_oku_sahip"
on storage.objects for select
to authenticated
using (
  bucket_id = 'vehicle-invoices'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) YÜKLEME — yalnızca kendi klasörüne
drop policy if exists "fatura_yukle_sahip" on storage.objects;
create policy "fatura_yukle_sahip"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vehicle-invoices'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) GÜNCELLEME — yalnızca kendi dosyası
-- upsert:true ile yüklenen dosyalar için gerekli; onsuz aynı adla ikinci
-- yükleme sessizce başarısız olur.
drop policy if exists "fatura_guncelle_sahip" on storage.objects;
create policy "fatura_guncelle_sahip"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vehicle-invoices'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'vehicle-invoices'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 5) SİLME — yalnızca kendi dosyası
-- Sihirbaz taslak iptalinde klasör temizliği yapıyor; o iş bu politikadan
-- geçecek.
drop policy if exists "fatura_sil_sahip" on storage.objects;
create policy "fatura_sil_sahip"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vehicle-invoices'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================================
-- NOT: `vehicle-images` bucket'ı PUBLIC KALIYOR ve bu kasıtlı.
-- Orada araç fotoğrafları var; vitrinde, ilan kartlarında ve karne
-- görselinde herkese görünmeleri gerekiyor. Hassas olan faturaydı ve
-- ayrıldı. Hassas ve genel dosyaların aynı bucket'ta durması kusurun
-- kendisiydi.
-- =========================================================================
