-- =========================================================================
-- ARAÇ DEVRİ · FAZ 1.5 — FATURA DOSYALARI ARACA BAĞLANDI
--
-- -------------------------------------------------------------------------
-- ÇÖZÜLEN SORUN (ÖLÇÜLDÜ, VARSAYILMADI)
-- -------------------------------------------------------------------------
-- Faz 1'in uçtan uca testi şunu kanıtladı:
--
--   devir sonrası, alıcı  ->  kayıtta invoice_path DOLU
--                        ->  dosyayı AÇAMIYOR
--
-- Sebep: dosyalar `<user_id>/<plaka>/<dosya>` yolundaydı ve storage
-- politikası `(storage.foldername(name))[1] = auth.uid()::text` diyordu —
-- yani "klasör = benim kimliğim". Devirden sonra dosya hâlâ SATICININ
-- klasöründe kalıyordu. Devir yarım kalıyordu: kayıt geçiyor, belge geçmiyor.
--
-- -------------------------------------------------------------------------
-- NEDEN <plaka>/ DEĞİL, <storage_key>/
-- -------------------------------------------------------------------------
-- İlk akla gelen çözüm yolu plakaya bağlamaktı. İki sebeple yapılmadı:
--
--   1. Plaka KİŞİSEL VERİ ve imzalı URL'nin içinde görünüyor. Plakayı
--      URL'lerden ve ziyaretçi arayüzünden KVKK gerekçesiyle kaldırdık;
--      dosya yolunda tutmak o çabayla çelişir.
--   2. Plaka DEĞİŞEBİLİR (şehir değişimi, devir). Değiştiği anda yol kırılır.
--
-- `vehicles.storage_key` kimlik taşımayan bir uuid. Birincil anahtar DEĞİL —
-- plaka PK olarak kalıyor; bu yalnızca depo anahtarı. Yan fayda: Faz 2'de
-- (uuid kimlik) zemin hazır olacak.
--
-- -------------------------------------------------------------------------
-- POLİTİKANIN ZARİF KISMI: SAHİPLİK KONTROLÜNÜ RLS YAPIYOR
-- -------------------------------------------------------------------------
-- Yeni politika şunu soruyor: "bu klasör, benim GÖREBİLDİĞİM bir aracın
-- storage_key'i mi?"
--
--   exists (select 1 from public.vehicles v
--           where v.storage_key::text = (storage.foldername(name))[1])
--
-- Politika içindeki alt sorgu da RLS'e tabi. `vehicles` üzerindeki SELECT
-- politikası `auth.uid() = user_id` olduğu için, aracı GÖREBİLİYORSAM
-- sahibiyim demektir. Yani ayrı bir sahiplik kontrolü yazmıyoruz — RLS'in
-- kendisi yapıyor.
--
-- SONUÇ: devir `vehicles.user_id`'yi güncellediği için erişim kendiliğinden
-- yeni sahibe geçiyor. SONRAKİ DEVİRLERDE HİÇBİR DOSYA TAŞINMIYOR — devir
-- tek bir veritabanı işlemi olarak kalıyor, yarıda kalabilecek bir dosya
-- kopyalama adımı yok. Alternatif tasarım (devirde dosyaları taşımak) her
-- devri kırılgan hale getirirdi.
--
-- -------------------------------------------------------------------------
-- SIRA HATASI YAPTIM: KİLİDİ KAPIYI AÇMADAN ÇEVİRDİM
-- -------------------------------------------------------------------------
-- Yeni politikaları taşımadan ÖNCE uyguladım. Sonuç: eski yoldaki 8 dosya
-- hiç kimse tarafından okunamaz hale geldi ve taşıma betiği 8 kez
-- "Object not found" verdi.
--
-- Bu, RLS için kendi yazdığım dersin aynısı: "Bir tabloyu kilitlemek,
-- kilidin arkasındaki kapıyı açmadan yapılmaz." Aynı hatayı storage
-- tarafında tekrarladım.
--
-- Dosyalar YERİNDEYDİ (storage.objects'te 8 satır duruyordu), yalnızca
-- erişim kapanmıştı — veri kaybı olmadı. Çözüm: taşıma süresince eski şemayı
-- da açan GEÇİCİ bir politika (yalnızca SELECT + DELETE, yalnızca kendi
-- kimliğiyle başlayan klasör), taşıma, sonra o politikanın KALDIRILMASI.
--
-- Doğru sıra şuydu ve bir dahakine böyle yapılacak:
--   1. Yeni kolonu ekle          (storage_key)
--   2. Dosyaları taşı            (eski politika hâlâ yürürlükte)
--   3. Yeni politikaları uygula
--   4. Eski politikaları kaldır
--
-- -------------------------------------------------------------------------
-- İSTEMCİ DEĞİŞİKLİKLERİ
-- -------------------------------------------------------------------------
--   · MaintenanceDialog ve ilan sihirbazı artık `<storage_key>/<dosya>`
--     yoluna yüklüyor.
--   · Sihirbazda sıra elverişliydi: araç ÖNCE ekleniyor ve `.select()` ile
--     dönüyor, dolayısıyla `storage_key` fatura yüklemesinden önce elde.
--   · İki yükleme yolu da `yukleyen_user_id` yazıyor (KVKK silme hakkı).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) ARACIN DEPO ANAHTARI
-- -------------------------------------------------------------------------
alter table public.vehicles
  add column if not exists storage_key uuid not null default gen_random_uuid();

create unique index if not exists vehicles_storage_key_idx
  on public.vehicles (storage_key);

comment on column public.vehicles.storage_key is
  'Fatura dosyalarının klasör adı. Plaka DEĞİL: plaka kişisel veri ve imzalı URL içinde görünür, ayrıca değişebilir. Birincil anahtar değil, yalnızca depo anahtarı.';

-- -------------------------------------------------------------------------
-- 2) YENİ STORAGE POLİTİKALARI
--
-- Eskiler `klasör = auth.uid()` diyordu. Yeniler "klasör, görebildiğim bir
-- aracın storage_key'i mi" diye soruyor; sahiplik kontrolünü `vehicles`
-- tablosunun RLS'i yapıyor.
-- -------------------------------------------------------------------------
drop policy if exists "fatura_oku_sahip"      on storage.objects;
drop policy if exists "fatura_yukle_sahip"    on storage.objects;
drop policy if exists "fatura_guncelle_sahip" on storage.objects;
drop policy if exists "fatura_sil_sahip"      on storage.objects;

create policy "fatura_oku_arac_sahibi" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-invoices'
    and exists (
      select 1 from public.vehicles v
      where v.storage_key::text = (storage.foldername(name))[1]
    )
  );

create policy "fatura_yukle_arac_sahibi" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-invoices'
    and exists (
      select 1 from public.vehicles v
      where v.storage_key::text = (storage.foldername(name))[1]
    )
  );

create policy "fatura_guncelle_arac_sahibi" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vehicle-invoices'
    and exists (
      select 1 from public.vehicles v
      where v.storage_key::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'vehicle-invoices'
    and exists (
      select 1 from public.vehicles v
      where v.storage_key::text = (storage.foldername(name))[1]
    )
  );

create policy "fatura_sil_arac_sahibi" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicle-invoices'
    and exists (
      select 1 from public.vehicles v
      where v.storage_key::text = (storage.foldername(name))[1]
    )
  );

-- -------------------------------------------------------------------------
-- 3) DOSYA TAŞIMA
-- SQL'in yapabileceği bir iş değil (Storage API gerekiyor):
--   node scripts/faturalari-araca-bagla.mjs            deneme
--   node scripts/faturalari-araca-bagla.mjs --uygula   uygular
-- Betik sırayı koruyor: indir -> yeni yola yükle -> kolonu güncelle -> eski
-- dosyayı sil. Yükleme başarısız olursa hiçbir şey değişmez.
-- -------------------------------------------------------------------------

-- =========================================================================
-- UÇTAN UCA DOĞRULANDI (iki gerçek hesap, sonra geri alındı) — 13/13
--   · 8 dosya yeni şemaya taşındı, eski şemada 0 kaldı
--   · devir öncesi sahip imzalı bağlantı alıp dosyayı indirdi (HTTP 200)
--   · devir sonrası ALICI imzalı bağlantı alıp dosyayı İNDİRDİ (HTTP 200)
--     ← Faz 1.5'in tek amacı buydu; Faz 1'de yapamıyordu
--   · fatura yolu DEĞİŞMEDİ: devir sırasında hiçbir dosya taşınmadı
--   · SATICI devirden sonra imza bile alamadı
--   · geri devirde satıcının erişimi geri döndü
--   · yukleyen_user_id devirde değişmedi
--
-- Test sonrası: test hesabı silindi, araç geri devredildi, test devirlerinin
-- bıraktığı sahte sahiplik geçmişi kaldırıldı. Son durum: 10 araç,
-- 10 aktif sahiplik, 0 kapanmış satır, 8 fatura dosyası, 0 devir kodu.
-- 79 test geçiyor.
-- =========================================================================
