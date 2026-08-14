-- =========================================================================
-- PROFİL GÖRSELİ
--
-- -------------------------------------------------------------------------
-- KOVA NİYE ÖZEL (public: false)
-- -------------------------------------------------------------------------
-- Profil görseli bir kişinin YÜZÜ olabiliyor — biyometrik olmasa da açık
-- kişisel veri. Genel bir kovada dosya adını tahmin eden herkes ona
-- ulaşabilir; üstelik klasör adı kullanıcı kimliği olduğu için genel kova
-- aynı zamanda "bu kimliğin görseli var mı" sorusunu da cevaplar.
--
-- `vehicle-images` genel çünkü onlar aracın fotoğrafı ve vitrinde zaten
-- herkese gösteriliyor. Profil görseli öyle değil: yalnızca sahibine ve
-- ileride —istenirse— sınırlı bağlamlara gösterilecek. Okuma imzalı URL
-- ile yapılıyor (`belgeler` kovasındaki kalıbın aynısı).
--
-- -------------------------------------------------------------------------
-- BOYUT VE TÜR SINIRI
-- -------------------------------------------------------------------------
-- 2 MB ve yalnızca görüntü. Fatura kovası 10 MB çünkü orada PDF de var;
-- profil görselinde 2 MB fazlasıyla yeter ve yüklenen dev dosyaların
-- listelerde yavaşlık yaratmasını engelliyor. Sınır KOVADA: istemci
-- doğrulaması atlanabilir, kova sınırı atlanamaz.
-- =========================================================================

alter table public.profiles
  add column if not exists avatar_yolu text;

comment on column public.profiles.avatar_yolu is
  'avatarlar kovasındaki dosya yolu (kullanici_id/dosya). Genel URL DEĞİL: kova özel, okuma imzalı URL ile yapılıyor.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatarlar', 'avatarlar', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- -------------------------------------------------------------------------
-- POLİTİKALAR — HERKES YALNIZCA KENDİ KLASÖRÜNDE
--
-- Klasör adı kullanıcı kimliği. `storage.foldername(name)[1]` yolun ilk
-- parçasını veriyor; onu `auth.uid()` ile karşılaştırmak, başkasının
-- klasörüne yazmayı ve okumayı engelliyor.
-- -------------------------------------------------------------------------
drop policy if exists avatar_oku_kendi on storage.objects;
create policy avatar_oku_kendi on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatarlar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatar_yaz_kendi on storage.objects;
create policy avatar_yaz_kendi on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatarlar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatar_guncelle_kendi on storage.objects;
create policy avatar_guncelle_kendi on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatarlar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SİLME AÇIK — fatura kovasından farklı olarak.
--
-- `belgeler` ve `vehicle-invoices` kovalarında silme YOK: oradaki dosyalar
-- aracın sicilinin parçası ve sicilin bütünlüğü silinebilir olmamalarına
-- bağlı. Profil görseli öyle değil; kişinin kendi görselini kaldırabilmesi
-- KVKK açısından da beklenen davranış.
drop policy if exists avatar_sil_kendi on storage.objects;
create policy avatar_sil_kendi on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatarlar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
