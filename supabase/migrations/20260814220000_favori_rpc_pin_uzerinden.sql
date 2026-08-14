-- =========================================================================
-- FAVORİLER: TABLOYA DOĞRUDAN ERİŞİM KAPATILDI, HER ŞEY PIN ÜZERİNDEN RPC
--
-- -------------------------------------------------------------------------
-- NİYE
-- -------------------------------------------------------------------------
-- `favoriler` tablosu araca PLAKA ile bağlanıyor (bkz.
-- 20260814210000_favoriler_araca_baglandi.sql). RLS ise kullanıcıya kendi
-- satırlarını okutuyordu. İkisi bir araya gelince şu açık oluşuyordu:
--
--   1. Kullanıcı pazaryerinde bir aracı favoriliyor.
--   2. `select * from favoriler` çağırıyor.
--   3. Dönen satırda `vehicle_plate` var.
--
-- Oysa pazaryeri plakayı BİLEREK gizliyor: plaka, aracın gerçek sahibine
-- ulaşmanın anahtarı ve ürün onu URL'de bile taşımıyor (devir akışında
-- alıcıdan plaka istenmesi de aynı gerekçeyle kaldırıldı). Favori tablosunu
-- okunur bırakmak, kapatılan kapının yanına pencere açmak olurdu.
--
-- İkinci sebep işlevsel: `vehicles` RLS'i yalnızca SAHİBE okuma veriyor.
-- Favori listesini istemcide join ile çekmek, başkasının aracı için boş
-- satır döndürüyordu — yani liste zaten çalışmıyordu.
--
-- -------------------------------------------------------------------------
-- ÇÖZÜM
-- -------------------------------------------------------------------------
-- Tablo istemciye tamamen kapatılıyor; üç `security definer` fonksiyon
-- PIN alıyor ve PIN döndürüyor. Plaka fonksiyonun içinde kalıyor, dışarı
-- hiç çıkmıyor.
--
-- ⚠ ÜÇ REVOKE BİRDEN GEREKİYOR. `revoke ... from public` tek başına
-- yetmiyor: `anon` ve `authenticated` rollerine ayrıca verilmiş yetkiler
-- ayakta kalıyor. Bu daha önce ölçülerek görüldü.
-- =========================================================================

-- 1 · TABLOYU İSTEMCİYE KAPAT ------------------------------------------------

-- Adlar 20260814160000_favoriler.sql'den birebir alındı. `if exists`
-- yazım hatasını sessizce yutuyor: yanlış ada `drop` çalışsaydı politika
-- ayakta kalır ve bu dosyanın kapattığı sızıntı temiz bir veritabanında
-- açık kalırdı.
drop policy if exists favori_oku_kendi  on public.favoriler;
drop policy if exists favori_ekle_kendi on public.favoriler;
drop policy if exists favori_sil_kendi  on public.favoriler;

revoke all on public.favoriler from public;
revoke all on public.favoriler from anon, authenticated;
grant  all on public.favoriler to service_role;

-- RLS açık kalıyor: politikası olmayan tabloya, yetkisi olsa bile
-- kimse erişemez. İkinci bir kilit katmanı.
alter table public.favoriler enable row level security;

-- 2 · FAVORİ AÇ/KAPA ---------------------------------------------------------

create or replace function public.favori_degistir(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_plaka text;
  v_sahip uuid;
  v_var   boolean;
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  select plate_number, user_id into v_plaka, v_sahip
  from vehicles where pin_code = upper(btrim(p_pin));

  if v_plaka is null then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  -- Kendi aracını favorilemek anlamsız: favori "başkasının aracını takip
  -- et" demek. Tetikleyici yerine burada engelleniyor çünkü istemci zaten
  -- tabloya yazamıyor.
  if v_sahip = v_uid then
    return jsonb_build_object('basarili', false, 'hata', 'kendi_aracin');
  end if;

  select exists(
    select 1 from favoriler where user_id = v_uid and vehicle_plate = v_plaka
  ) into v_var;

  if v_var then
    delete from favoriler where user_id = v_uid and vehicle_plate = v_plaka;
    return jsonb_build_object('basarili', true, 'favorili', false);
  end if;

  insert into favoriler (user_id, vehicle_plate) values (v_uid, v_plaka)
  on conflict (user_id, vehicle_plate) do nothing;

  return jsonb_build_object('basarili', true, 'favorili', true);
end;
$$;

-- 3 · FAVORİ LİSTESİ ---------------------------------------------------------

create or replace function public.favori_listem()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  -- PLAKA DÖNMÜYOR. Pazaryerinde plaka gösterilmiyor; favori listesi de
  -- göstermemeli. Kimlik olarak PIN yeterli.
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'pin_code',      v.pin_code,
      'brand',         v.brand,
      'model',         v.model,
      'year',          v.year,
      'km',            v.km,
      'trust_score',   v.trust_score,
      'image_url',     v.image_url,
      'city',          coalesce(l.city, v.city),
      'listing_title', coalesce(l.title, v.title),
      'is_featured',   coalesce(l.is_featured, false),
      'vitrinde',      (l.id is not null),
      'favorilendi',   f.olustu
    ) order by f.olustu desc)
    from favoriler f
    join vehicles v on v.plate_number = f.vehicle_plate
    -- LEFT JOIN bilerek: araç vitrinden kalksa bile favori kayboluyor
    -- olmamalı. `vitrinde` bir süzgeç değil, etiket.
    left join listings l
      on l.vehicle_plate = f.vehicle_plate and l.status = 'active'
    where f.user_id = v_uid
  ), '[]'::jsonb);
end;
$$;

-- 4 · FAVORİLENEN PIN'LER (kalp ikonunun dolu/boş durumu için) ---------------

create or replace function public.favori_pinlerim()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(v.pin_code)
    from favoriler f join vehicles v on v.plate_number = f.vehicle_plate
    where f.user_id = v_uid
  ), '[]'::jsonb);
end;
$$;

-- 5 · YETKİLER ---------------------------------------------------------------
-- Üçü de yalnızca oturum açmış kullanıcıya. `anon`'a açık bırakmak, giriş
-- yapmamış ziyaretçinin PIN denemesiyle araç varlığını sorgulamasına izin
-- verirdi.

revoke all on function public.favori_degistir(text) from public;
revoke all on function public.favori_listem()      from public;
revoke all on function public.favori_pinlerim()    from public;

grant execute on function public.favori_degistir(text) to authenticated;
grant execute on function public.favori_listem()      to authenticated;
grant execute on function public.favori_pinlerim()    to authenticated;
