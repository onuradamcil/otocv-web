-- =========================================================================
-- KAVRAM AYRIMI: VİTRİN ≠ ARANABİLİR ENVANTER
--
-- -------------------------------------------------------------------------
-- ÖLÇÜLEN SORUN
-- -------------------------------------------------------------------------
-- Anasayfadaki "Vitrindeki Araçlar" başlığının altındaki 143 kartın yalnızca
-- **2'si** gerçekten vitrindeydi (aktif `listings` kaydı = ücretli katman).
-- Kalan 9 gerçek + 132 demo `listelenebilir` katmanındaydı: aranabilir ama
-- vitrinde değil. Yani başlık yanlış şey söylüyor, süzgeç de vitrini değil
-- tüm aranabilir envanteri süzüyordu.
--
-- Ürün sahibinin "vitrin kendine has bir ortam kalmalı" kararı bu ayrımı
-- kodda kurmayı gerektiriyor.
--
-- -------------------------------------------------------------------------
-- İKİ DEĞİŞİKLİK
-- -------------------------------------------------------------------------
-- 1. `p_katman` parametresi — çağıran taraf hangi katmanı istediğini
--    söyleyebiliyor: 'vitrin' | 'listelenebilir' | null (hepsi).
--    ⚠ VARSAYILAN null: mevcut çağrıların hiçbiri bozulmuyor.
--
--    ⚠ Katman süzgeci diğerlerinden AYRI ele alınıyor: SAYAÇ hesaplarının
--    hepsine katılıyor (her sayaç `ok_katman`ı da uyguluyor) ama kendisi
--    bir "seçenek" değil — kullanıcı katman seçmiyor, ekran seçiyor.
--
-- 2. `demo_araclar.vitrinde` — demo kartlar vitrin katmanına alınıyor.
--    Ürün sahibinin kararı: kavram temiz kalsın (vitrin = teşhirdeki araç)
--    ama ekran dolu görünsün. Canlıya çıkarken demo silinince vitrin
--    gerçek ücretli kayıtlarla dolar.
--
-- Doğrulandı: katmansız 143 · vitrin 134 · listelenebilir 9 ·
-- demo kapalıyken vitrin 2 · yanlış katman sızıntısı 0.
--
-- ⚠ ESKİ 4 PARAMETRELİ İMZA DÜŞÜRÜLÜYOR: yeni sürümün 5. parametresi de
-- varsayılanlı olduğu için 4 argümanlı çağrı İKİ imzaya birden uyar ve
-- PostgreSQL "function is not unique" der.
-- =========================================================================

alter table public.demo_araclar
  add column if not exists vitrinde boolean not null default true;

update public.demo_araclar set vitrinde = true where vitrinde is distinct from true;

create or replace function public.arac_arama(
  p_suzgec jsonb default '{}'::jsonb,
  p_limit  integer default 24,
  p_offset integer default 0,
  p_demo   boolean default true,
  p_katman text    default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_arama   text := public.arama_normalize(nullif(p_suzgec->>'arama', ''));
  v_sehir   text := nullif(nullif(p_suzgec->>'sehir',  ''), 'Tümü');
  v_yakit   text := nullif(nullif(p_suzgec->>'yakit',  ''), 'Tümü');
  v_vites   text := nullif(nullif(p_suzgec->>'vites',  ''), 'Tümü');
  v_tramer  text := nullif(nullif(p_suzgec->>'tramer', ''), 'Tümü');
  v_marka   text := nullif(p_suzgec->>'marka',   '');
  v_seri    text := nullif(p_suzgec->>'seri',    '');
  v_model   text := nullif(p_suzgec->>'model',   '');
  v_donanim text := nullif(p_suzgec->>'donanim', '');
  v_yil_min  integer := nullif(p_suzgec->>'yilMin', '')::integer;
  v_yil_max  integer := nullif(p_suzgec->>'yilMax', '')::integer;
  v_km_min   integer := nullif(p_suzgec->>'kmMin',  '')::integer;
  v_km_max   integer := nullif(p_suzgec->>'kmMax',  '')::integer;
  v_sicil    integer := coalesce(nullif(p_suzgec->>'sicilEnAz', '')::integer, 0);
  v_onecikan boolean := coalesce((p_suzgec->>'yalnizOneCikan')::boolean, false);
  v_yeni     boolean := coalesce((p_suzgec->>'yalnizYeni')::boolean, false);
  v_bulanik  boolean := coalesce(length(public.arama_normalize(nullif(p_suzgec->>'arama',''))) >= 4, false);
  v_yeni_esik timestamptz := now() - interval '7 days';
  -- ⚠ SAYFA BOYUTU TAVANI: aksi hâlde `p_limit` üzerinden tüm tablo tek
  -- istekte çekilebilirdi — LIMIT koymanın amacı buydu.
  v_limit  integer := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_katman text := nullif(p_katman, '');
  v_sonuc jsonb;
begin
  with kaynak as (
    -- GERÇEK ARAÇLAR
    select
      md5(v.plate_number) as kart_id, v.plate_number, v.user_id,
      v.brand::text, v.series::text, v.model::text, v.package::text,
      v.year, v.km, v.fuel_type, v.transmission, v.trust_score,
      v.tramer_amount, v.tramer_status, v.image_url, v.pin_code,
      l.id as listing_id, l.title::text as listing_title, l.description as listing_description,
      coalesce(l.city, v.city)::text         as kart_sehir,
      coalesce(l.district, v.district)::text as kart_ilce,
      coalesce(l.is_featured, false)   as one_cikan,
      coalesce(l.views_count, 0)       as goruntulenme,
      coalesce(l.favorite_count, 0)    as favori,
      coalesce(l.created_at, v.created_at) as olusturma,
      v.arama_metni as arama_a, l.arama_metni as arama_i,
      false as demo,
      case when l.id is not null then 'vitrin' else 'listelenebilir' end as katman
    from vehicles v
    left join listings l
      on l.vehicle_plate = v.plate_number and l.status = 'active'
    -- Ücretli vitrin kaydı, görünürlük kapatılsa bile sessizce kaybolmuyor.
    where v.gorunurluk = 'listelenebilir' or l.id is not null

    union all

    -- DEMO KARTLAR — GEÇİCİ. `p_demo=false` ile tamamen kapatılır.
    select
      d.kart_id, null::varchar, null::uuid,
      d.brand, d.series, d.model, d.package,
      d.year, d.km, d.fuel_type, d.transmission, d.trust_score,
      null::integer, d.tramer_status, null::text, null::varchar,
      null::bigint, null::text, null::text,
      d.city, null::text,
      d.is_featured, 0, 0,
      now() - (d.gun_once || ' days')::interval,
      d.arama_metni, null::text,
      true,
      -- DEMO: `vitrinde` bayrağı katmanı belirliyor.
      case when d.vitrinde then 'vitrin' else 'listelenebilir' end
    from demo_araclar d
    where p_demo
  ),
  taban as (
    select k.*,
      (v_arama is null
        or k.arama_a like '%'||v_arama||'%'
        or k.arama_i like '%'||v_arama||'%'
        or (v_bulanik and (word_similarity(v_arama, k.arama_a) >= 0.4
                           or word_similarity(v_arama, coalesce(k.arama_i,'')) >= 0.4))) as ok_arama,
      (v_sehir  is null or k.kart_sehir    = v_sehir)  as ok_sehir,
      (v_yakit  is null or k.fuel_type     = v_yakit)  as ok_yakit,
      (v_vites  is null or k.transmission  = v_vites)  as ok_vites,
      -- ⚠ 'Bilmiyorum' 'Tramer Yok'a KATILMIYOR: beyan etmeyen kullanıcının
      -- aracını hasarsız saymak, sihirbazda bilerek düzeltilen hatanın aynısı.
      (v_tramer is null or k.tramer_status = v_tramer) as ok_tramer,
      -- Marka ağacı dört kademe TEK yüklem: kademeler zincir, ayrı ayrı
      -- hariç tutulamıyor (istemcide de öyleydi).
      ((v_marka   is null or public.arama_normalize(k.brand)   = v_marka)
       and (v_seri    is null or public.arama_normalize(k.series)  = v_seri)
       and (v_model   is null or public.arama_normalize(k.model)   = v_model)
       and (v_donanim is null or public.arama_normalize(k.package) = v_donanim)) as ok_agac,
      ((v_yil_min is null or k.year >= v_yil_min) and (v_yil_max is null or k.year <= v_yil_max)) as ok_yil,
      ((v_km_min  is null or k.km   >= v_km_min)  and (v_km_max  is null or k.km   <= v_km_max))  as ok_km,
      (k.trust_score >= v_sicil)                       as ok_sicil,
      -- ⚠ Öne çıkarma SIRALAMAYI belirliyor, görünürlüğü ENGELLEMİYOR.
      (not v_onecikan or k.one_cikan)                  as ok_onecikan,
      (not v_yeni or k.olusturma >= v_yeni_esik)       as ok_yeni,
      -- ⚠ Kullanıcının seçtiği bir süzgeç DEĞİL; ekranın hangi katmanı
      -- gösterdiğini söylüyor. Sayaçların hepsine katılıyor.
      (v_katman is null or k.katman = v_katman)        as ok_katman
    from kaynak k
  ),
  gecen as (
    select * from taban
    where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
      and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman
  ),
  sayfa as (
    select * from gecen
    -- Gerçek kayıtlar demo kartların ÖNÜNDE: demo bir gün silindiğinde
    -- ızgaranın ilk kartları değişmesin.
    order by demo asc, one_cikan desc, olusturma desc nulls last, kart_id
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'satirlar', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kart_id', s.kart_id, 'listing_id', s.listing_id,
        'katman', s.katman,
        'demo', s.demo,
        'user_id',      case when s.user_id = v_uid then s.user_id else null end,
        'plate_number', case when s.user_id = v_uid then s.plate_number else null end,
        'pin_code',     case when s.listing_id is not null then s.pin_code else null end,
        'listing_title', s.listing_title, 'listing_description', s.listing_description,
        'city', s.kart_sehir, 'district', s.kart_ilce,
        'brand', s.brand, 'series', s.series, 'model', s.model, 'package', s.package,
        'year', s.year, 'km', s.km, 'fuel_type', s.fuel_type,
        'transmission', s.transmission, 'trust_score', s.trust_score,
        'tramer_amount', s.tramer_amount, 'tramer_status', s.tramer_status,
        'image_url', s.image_url, 'is_featured', s.one_cikan,
        'views_count', s.goruntulenme, 'favorite_count', s.favori,
        'created_at', s.olusturma
      ) order by s.demo asc, s.one_cikan desc, s.olusturma desc nulls last, s.kart_id)
      from sayfa s
    ), '[]'::jsonb),
    'toplam', (select count(*) from gecen),
    -- Her sayaç grubu KENDİ yüklemini hariç tutuyor; gerisi uygulanıyor.
    'secenekler', jsonb_build_object(
      'sehirler', coalesce((select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad) from (
          select kart_sehir as ad, count(*) as adet from taban
          where ok_arama and ok_yakit and ok_vites and ok_tramer and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman
            and kart_sehir is not null and btrim(kart_sehir) <> '' group by kart_sehir) t), '[]'::jsonb),
      'yakitlar', coalesce((select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad) from (
          select fuel_type as ad, count(*) as adet from taban
          where ok_arama and ok_sehir and ok_vites and ok_tramer and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman
            and fuel_type is not null and btrim(fuel_type) <> '' group by fuel_type) t), '[]'::jsonb),
      'vitesler', coalesce((select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad) from (
          select transmission as ad, count(*) as adet from taban
          where ok_arama and ok_sehir and ok_yakit and ok_tramer and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman
            and transmission is not null and btrim(transmission) <> '' group by transmission) t), '[]'::jsonb),
      'tramerler', coalesce((select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad) from (
          select tramer_status as ad, count(*) as adet from taban
          where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman
            and tramer_status is not null and btrim(tramer_status) <> '' group by tramer_status) t), '[]'::jsonb),
      -- ⚠ BANTLAR SABİT, SAYILAR GERÇEK. "80+ (0)" dürüst bilgi; sabit
      -- "%80+" çipi, o bantta hiç araç yokken yanıltmaydı.
      'sicilBantlari', (
        select jsonb_agg(jsonb_build_object('esik', e.esik, 'adet', (
          select count(*) from taban
          where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
            and ok_agac and ok_yil and ok_km and ok_onecikan and ok_yeni and ok_katman
            and trust_score >= e.esik)) order by e.esik)
        from (values (0),(40),(60),(80)) as e(esik)),
      'oneCikanAdet', (select count(*) from taban
        where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
          and ok_agac and ok_yil and ok_km and ok_sicil and ok_yeni and ok_katman and one_cikan),
      'yeniAdet', (select count(*) from taban
        where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
          and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_katman
          and olusturma >= v_yeni_esik),
      -- ⚠ HER GRUBUN "Tümü" SATIRI KENDİ HARİÇ TUTMASIYLA. İstemcide tek
      -- bir `tumuAdet` vardı ve üç gruba birden veriliyordu; kodun kendi
      -- yorumu da bunu yaklaşık kabul ediyordu.
      'tumu', jsonb_build_object(
        'sehir', (select count(*) from taban where ok_arama and ok_yakit and ok_vites and ok_tramer and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman),
        'yakit', (select count(*) from taban where ok_arama and ok_sehir and ok_vites and ok_tramer and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman),
        'vites', (select count(*) from taban where ok_arama and ok_sehir and ok_yakit and ok_tramer and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman),
        'tramer',(select count(*) from taban where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni and ok_katman))
    )
  ) into v_sonuc;

  return v_sonuc;
end;
$function$;

revoke all on function public.arac_arama(jsonb, integer, integer, boolean, text) from public;
grant execute on function public.arac_arama(jsonb, integer, integer, boolean, text) to anon, authenticated;

drop function if exists public.arac_arama(jsonb, integer, integer, boolean);
