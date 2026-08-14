-- =========================================================================
-- FAVORİ ARTIK İLANA DEĞİL ARACA AİT
--
-- -------------------------------------------------------------------------
-- NİYE DEĞİŞTİ
-- -------------------------------------------------------------------------
-- İlk tasarımda favori `listings.id` gösteriyordu. Ama bu ürün bir SİCİL
-- ürünü, pazaryeri ikincil: PIN ile sicil sorgulayan biri de aracı
-- favorileyebilmeli ve o araç vitrinde olmayabiliyor — o durumda
-- favorilenecek bir "ilan" yok.
--
-- Araca bağlamak iki şeyi düzeltiyor:
--   · PIN sorgulayan kullanıcı da favorileyebiliyor
--   · Araç vitrinden kalksa bile favori anlamını koruyor (eskiden ilan
--     silinince favori de düşerdi)
--
-- Tablo BOŞTU (kontrol edildi), veri taşıma gerekmedi.
--
-- Sayaç `listings.favorite_count` alanında tutulmaya devam ediyor: sahip
-- "Vitrindeki Araçlarım" ekranında kaç kişinin favorilediğini görüyor.
-- Araç vitrinde değilse güncellenecek satır yok ve bu sorun değil — favori
-- yine kaydediliyor, yalnızca gösterilecek bir vitrin kartı yok.
-- =========================================================================

drop trigger if exists favori_sayaci_guncelle on public.favoriler;
drop trigger if exists favori_kendi_aracini_engelle on public.favoriler;

alter table public.favoriler drop constraint if exists favori_tek_kayit;
alter table public.favoriler drop column if exists listing_id;

alter table public.favoriler
  add column if not exists vehicle_plate text
    references public.vehicles(plate_number) on delete cascade;

delete from public.favoriler where vehicle_plate is null;
alter table public.favoriler alter column vehicle_plate set not null;

alter table public.favoriler
  add constraint favori_tek_kayit unique (user_id, vehicle_plate);

drop index if exists favori_ilan_idx;
create index if not exists favori_arac_idx on public.favoriler (vehicle_plate);

create or replace function public.favori_kendi_aracini_engelle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sahip uuid;
begin
  select user_id into v_sahip from vehicles where plate_number = new.vehicle_plate;

  if v_sahip is not null and v_sahip = new.user_id then
    raise exception 'KENDI_ARACIN';
  end if;

  return new;
end;
$$;

create trigger favori_kendi_aracini_engelle
  before insert on public.favoriler
  for each row execute function public.favori_kendi_aracini_engelle();

create or replace function public.favori_sayaci_guncelle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update listings
       set favorite_count = coalesce(favorite_count, 0) + 1
     where vehicle_plate = new.vehicle_plate;
    return new;
  end if;

  update listings
     set favorite_count = greatest(coalesce(favorite_count, 0) - 1, 0)
   where vehicle_plate = old.vehicle_plate;
  return old;
end;
$$;

create trigger favori_sayaci_guncelle
  after insert or delete on public.favoriler
  for each row execute function public.favori_sayaci_guncelle();

revoke all on function public.favori_kendi_aracini_engelle() from public;
revoke all on function public.favori_kendi_aracini_engelle() from anon, authenticated;
revoke all on function public.favori_sayaci_guncelle() from public;
revoke all on function public.favori_sayaci_guncelle() from anon, authenticated;

update public.listings l
   set favorite_count = (select count(*) from public.favoriler f where f.vehicle_plate = l.vehicle_plate);
