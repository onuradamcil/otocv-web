-- =========================================================================
-- ARAÇ DURUMU (İKİNCİ EL / SIFIR) — ZORUNLU SORULAN AMA KAYDEDİLMEYEN ALAN
--
-- -------------------------------------------------------------------------
-- NİYE VAR — GARANTİ'DEN DAHA AĞIR BİR DURUM
-- -------------------------------------------------------------------------
-- Garanti ve İlk Sahiplik alanları isteğe bağlıydı; kullanıcı boş
-- bırakabiliyordu. Bu alan öyle değil: `isStep2Valid` ve `isFieldInvalid`
-- ikisi de bu alana bakıyor, yani kullanıcı DOLDURMADAN İLERLEYEMİYOR.
--
-- Buna rağmen `vehicles` şemasında karşılığı yoktu ve kayıt payload'una
-- girmiyordu. Yani ürün, cevaplamayı ZORUNLU tuttuğu bir soruyu hiçbir
-- yere yazmıyordu — kullanıcı doldurmak zorunda kaldığı bir formu boşuna
-- dolduruyordu.
--
-- Ürün sahibinin kararı (16 Ağustos 2026): sütun açılsın, kaydedilsin.
--
-- -------------------------------------------------------------------------
-- ⚠ NİYE EKRAN ETİKETİ DEĞİL KOD SAKLANIYOR
-- -------------------------------------------------------------------------
-- Seçenekler ekranda 'İkinci El' ve 'Sıfır' yazıyor. Veritabanına bu
-- metinleri yazmak, bir başlık düzenlemesinin kayıtlı veriyi bozması
-- demek olurdu: "2. El" diye değiştirilirse eski satırlar eşleşmez ve
-- CHECK kısıtı yeni kayıtları reddeder.
--
-- Aynı gerekçe `teklif_talepleri.tur` alanında da yazıldı: ekran adı
-- değişebilir, veritabanına yazılan kod değişemez.
--
-- -------------------------------------------------------------------------
-- ⚠ NULL BİLEREK SERBEST — GERİYE DÖNÜK VERİ
-- -------------------------------------------------------------------------
-- `not null` yazmak mevcut araçları bozardı: hiçbirinde bu bilgi yok ve
-- varsayılan atamak (ör. 'ikinci_el') onlarca aracın adına yapılmamış bir
-- beyan olurdu. Yeni kayıtlarda alan zaten sihirbaz tarafından zorunlu
-- tutuluyor; kısıt arayüzde, geçmişte değil.
--
--   null       = kayıt bu alan eklenmeden önce oluşturuldu
--   'ikinci_el' / 'sifir'
-- =========================================================================

alter table public.vehicles
  add column if not exists vehicle_condition text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vehicles_vehicle_condition_check'
  ) then
    alter table public.vehicles
      add constraint vehicles_vehicle_condition_check
      check (vehicle_condition is null or vehicle_condition in ('ikinci_el', 'sifir'));
  end if;
end $$;

comment on column public.vehicles.vehicle_condition is
  'Araç durumu: ikinci_el | sifir. null = bu alan eklenmeden önce kaydedilmiş araç. '
  'Ekran etiketleri (İkinci El / Sıfır) arayüzde eşleniyor; başlık değişse de kod sabit.';
