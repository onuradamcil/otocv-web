-- =========================================================================
-- arac_arama() · SÜZME, SIRALAMA, SAYFALAMA VE SAYAÇLAR ARTIK SUNUCUDA
--
-- -------------------------------------------------------------------------
-- ÖNCEKİ DURUM VE NİYE DEĞİŞTİ
-- -------------------------------------------------------------------------
-- Eski `arac_arama()` parametresizdi ve `jsonb_agg` ile görünür envanterin
-- TAMAMINI tek dizi olarak döndürüyordu. Süzme, sıralama, sayfalama ve
-- süzgeç sayaçları tarayıcıda yapılıyordu. 11 araçta kusursuz çalışıyor;
-- yüz binlerce araçta her arama tüm tabloyu serileştirip tel üzerinden
-- gönderir. 19 Ağustos 2026 beta taramasının 6 numaralı bulgusu buydu.
--
-- -------------------------------------------------------------------------
-- ⚠ NİYE "ÖNCE SADECE LIMIT KOYALIM" DENMEDİ
-- -------------------------------------------------------------------------
-- Süzgeç sayaçları ("Ankara (3)", "80+ (0)") kendi yüklemini hariç tutarak
-- hesaplanıyor ve bu bilinçli bir dürüstlük kararı: sabit "%80+" yazmak,
-- o bantta hiç araç yokken kullanıcıyı yanıltıyordu.
--
-- Kırpılmış bir listeden sayılan sayaç YALAN söyler. Yani sayaçlar ya tüm
-- veri istemcide olacak ya da sunucuda toplanacak; arası yok. Bu yüzden
-- LIMIT ile sayaçlar AYNI anda taşınmak zorundaydı.
--
-- -------------------------------------------------------------------------
-- SAYAÇLAR NASIL HESAPLANIYOR — TEK GEÇİŞ
-- -------------------------------------------------------------------------
-- `taban` CTE'si her satır için her yüklemi ayrı bir BOOLEAN sütuna
-- yazıyor. Sonra her sayaç, KENDİ yüklemi dışındaki hepsini `filter` ile
-- uyguluyor. Böylece tablo bir kez taranıyor, sekiz sayaç grubu aynı
-- taramadan çıkıyor — yüklem başına ayrı sorgu atmak yerine.
--
-- -------------------------------------------------------------------------
-- ⚠ DAVRANIŞ DEĞİŞİKLİĞİ: `tumuAdet` ARTIK BOYUT BAŞINA
-- -------------------------------------------------------------------------
-- İstemcide tek bir `tumuAdet` vardı ve şehir/yakıt/vites gruplarının
-- üçüne birden veriliyordu ('sehir' hariç tutularak). Kodun kendi yorumu
-- da bunu yaklaşık kabul ediyordu. Sunucuda her boyutun "Tümü" satırı
-- kendi hariç tutmasıyla hesaplanıyor: yakıt grubundaki "Tümü", yakıt
-- süzgeci kaldırılmış hâlin sayısı. Sayılar bazı durumlarda eskisinden
-- FARKLI çıkacak — çünkü eskisi yaklaşıktı, bu doğru.
--
-- -------------------------------------------------------------------------
-- KORUNAN ÜRÜN KARARLARI (istemcideki YUKLEMLER ile birebir)
-- -------------------------------------------------------------------------
--   • 'Bilmiyorum' tramer değeri 'Tramer Yok'a KATILMIYOR, ayrı seçenek.
--   • Öne çıkarma SIRALAMAYI belirliyor, görünürlüğü ENGELLEMİYOR.
--   • Arama alanları: marka, seri, model, paket, ilan başlığı, şehir, PIN.
--   • Plaka yalnızca sahibine; PIN yalnızca vitrin katmanında.
--   • 'Yeni' eşiği 7 gün (istemcideki YENI_ESIGI_MS ile aynı).
-- =========================================================================

-- ⚠ ESKİ İMZA DÜŞÜRÜLÜYOR. Yeni sürümün tüm parametreleri varsayılanlı
-- olduğu için `arac_arama()` çağrısı İKİ imzaya birden uyuyor ve
-- PostgreSQL "function is not unique" hatası veriyor. Eski sürüm
-- durursa yeni sürüm hiç çağrılamaz.
drop function if exists public.arac_arama();

create or replace function public.arac_arama(
  p_suzgec jsonb default '{}'::jsonb,
  p_limit  integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();

  -- 'Tümü' ve boş dize "süzme yok" demek; ikisi de null'a indirgeniyor ki
  -- gövdede tek bir kontrol yetsin.
  v_arama   text := public.arama_normalize(nullif(p_suzgec->>'arama', ''));
  v_sehir   text := nullif(nullif(p_suzgec->>'sehir',  ''), 'Tümü');
  v_yakit   text := nullif(nullif(p_suzgec->>'yakit',  ''), 'Tümü');
  v_vites   text := nullif(nullif(p_suzgec->>'vites',  ''), 'Tümü');
  v_tramer  text := nullif(nullif(p_suzgec->>'tramer', ''), 'Tümü');

  -- Marka ağacı: istemci NORMALİZE anahtar gönderiyor (agacAnahtari).
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

  -- 'Yeni' eşiği istemcideki YENI_ESIGI_MS ile aynı: 7 gün.
  v_yeni_esik timestamptz := now() - interval '7 days';

  -- ⚠ SAYFA BOYUTU SINIRLANIYOR. Aksi hâlde `p_limit` üzerinden tüm tabloyu
  -- tek istekte çekmek mümkün olurdu — LIMIT'i koymanın amacı buydu.
  v_limit  integer := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);

  v_sonuc jsonb;
begin
  with taban as (
    select
      v.plate_number, v.brand, v.series, v.model, v.package,
      v.year, v.km, v.fuel_type, v.transmission, v.trust_score,
      v.tramer_amount, v.tramer_status, v.image_url, v.pin_code, v.user_id,
      l.id            as listing_id,
      l.title         as listing_title,
      l.description   as listing_description,
      coalesce(l.city, v.city)         as kart_sehir,
      coalesce(l.district, v.district) as kart_ilce,
      coalesce(l.is_featured, false)   as one_cikan,
      coalesce(l.views_count, 0)       as goruntulenme,
      coalesce(l.favorite_count, 0)    as favori,
      coalesce(l.created_at, v.created_at) as olusturma,

      -- ---- YÜKLEMLER (her biri ayrı boolean) ------------------------------
      (v_arama is null
        or v.arama_metni like '%' || v_arama || '%'
        or l.arama_metni like '%' || v_arama || '%')                  as ok_arama,
      (v_sehir  is null or coalesce(l.city, v.city) = v_sehir)        as ok_sehir,
      (v_yakit  is null or v.fuel_type    = v_yakit)                  as ok_yakit,
      (v_vites  is null or v.transmission = v_vites)                  as ok_vites,
      (v_tramer is null or v.tramer_status = v_tramer)                as ok_tramer,
      -- Marka ağacı dört kademe TEK yüklem: kademeler zincir, ayrı ayrı
      -- hariç tutulamıyor (istemcide de öyleydi).
      ((v_marka   is null or public.arama_normalize(v.brand)   = v_marka)
       and (v_seri    is null or public.arama_normalize(v.series)  = v_seri)
       and (v_model   is null or public.arama_normalize(v.model)   = v_model)
       and (v_donanim is null or public.arama_normalize(v.package) = v_donanim)) as ok_agac,
      ((v_yil_min is null or v.year >= v_yil_min)
       and (v_yil_max is null or v.year <= v_yil_max))                as ok_yil,
      ((v_km_min is null or v.km >= v_km_min)
       and (v_km_max is null or v.km <= v_km_max))                    as ok_km,
      (v.trust_score >= v_sicil)                                      as ok_sicil,
      (not v_onecikan or coalesce(l.is_featured, false))              as ok_onecikan,
      (not v_yeni or coalesce(l.created_at, v.created_at) >= v_yeni_esik) as ok_yeni
    from vehicles v
    left join listings l
      on l.vehicle_plate = v.plate_number and l.status = 'active'
    -- Ücretli vitrin kaydı, görünürlük kapatılsa bile sessizce kaybolmuyor.
    where v.gorunurluk = 'listelenebilir' or l.id is not null
  ),
  -- Tüm yüklemleri geçenler: ızgarada basılan küme.
  gecen as (
    select * from taban
    where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
      and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni
  ),
  sayfa as (
    select * from gecen
    -- Öne çıkanlar önce (ödenmiş görünürlük), sonra yeni olan.
    order by one_cikan desc, olusturma desc nulls last, plate_number
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'satirlar', coalesce((
      select jsonb_agg(jsonb_build_object(
        -- Kart kimliği plaka DEĞİL: plaka kişisel veri.
        'kart_id',      md5(s.plate_number),
        'listing_id',   s.listing_id,
        'katman',       case when s.listing_id is not null then 'vitrin' else 'listelenebilir' end,
        'user_id',      case when s.user_id = v_uid then s.user_id else null end,
        'plate_number', case when s.user_id = v_uid then s.plate_number else null end,
        'pin_code',     case when s.listing_id is not null then s.pin_code else null end,
        'listing_title', s.listing_title,
        'listing_description', s.listing_description,
        'city', s.kart_sehir, 'district', s.kart_ilce,
        'brand', s.brand, 'series', s.series, 'model', s.model, 'package', s.package,
        'year', s.year, 'km', s.km, 'fuel_type', s.fuel_type,
        'transmission', s.transmission, 'trust_score', s.trust_score,
        'tramer_amount', s.tramer_amount, 'tramer_status', s.tramer_status,
        'image_url', s.image_url,
        'is_featured', s.one_cikan, 'views_count', s.goruntulenme,
        'favorite_count', s.favori, 'created_at', s.olusturma
      ) order by s.one_cikan desc, s.olusturma desc nulls last, s.plate_number)
      from sayfa s
    ), '[]'::jsonb),

    'toplam', (select count(*) from gecen),

    'secenekler', jsonb_build_object(
      -- Her grup KENDİ yüklemini hariç tutuyor; gerisi uygulanıyor.
      'sehirler', coalesce((
        select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad)
        from (
          select kart_sehir as ad, count(*) as adet from taban
          where ok_arama and ok_yakit and ok_vites and ok_tramer and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni
            and kart_sehir is not null and btrim(kart_sehir) <> ''
          group by kart_sehir
        ) t
      ), '[]'::jsonb),
      'yakitlar', coalesce((
        select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad)
        from (
          select fuel_type as ad, count(*) as adet from taban
          where ok_arama and ok_sehir and ok_vites and ok_tramer and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni
            and fuel_type is not null and btrim(fuel_type) <> ''
          group by fuel_type
        ) t
      ), '[]'::jsonb),
      'vitesler', coalesce((
        select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad)
        from (
          select transmission as ad, count(*) as adet from taban
          where ok_arama and ok_sehir and ok_yakit and ok_tramer and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni
            and transmission is not null and btrim(transmission) <> ''
          group by transmission
        ) t
      ), '[]'::jsonb),
      'tramerler', coalesce((
        select jsonb_agg(jsonb_build_array(ad, adet) order by adet desc, ad)
        from (
          select tramer_status as ad, count(*) as adet from taban
          where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_agac
            and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni
            and tramer_status is not null and btrim(tramer_status) <> ''
          group by tramer_status
        ) t
      ), '[]'::jsonb),

      -- Sicil bantları: sabit eşikler, GERÇEK sayılar. "80+ (0)" dürüst
      -- bilgi; sabit "%80+" çipi yanıltmaydı.
      'sicilBantlari', (
        select jsonb_agg(jsonb_build_object('esik', e.esik, 'adet', (
          select count(*) from taban
          where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
            and ok_agac and ok_yil and ok_km and ok_onecikan and ok_yeni
            and trust_score >= e.esik
        )) order by e.esik)
        from (values (0),(40),(60),(80)) as e(esik)
      ),

      'oneCikanAdet', (
        select count(*) from taban
        where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
          and ok_agac and ok_yil and ok_km and ok_sicil and ok_yeni
          and one_cikan
      ),
      'yeniAdet', (
        select count(*) from taban
        where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_tramer
          and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan
          and olusturma >= v_yeni_esik
      ),

      -- Her grubun "Tümü" satırı: o grubun süzgeci kaldırılmış hâlin sayısı.
      'tumu', jsonb_build_object(
        'sehir', (select count(*) from taban where ok_arama and ok_yakit and ok_vites and ok_tramer and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni),
        'yakit', (select count(*) from taban where ok_arama and ok_sehir and ok_vites and ok_tramer and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni),
        'vites', (select count(*) from taban where ok_arama and ok_sehir and ok_yakit and ok_tramer and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni),
        'tramer',(select count(*) from taban where ok_arama and ok_sehir and ok_yakit and ok_vites and ok_agac and ok_yil and ok_km and ok_sicil and ok_onecikan and ok_yeni)
      )
    )
  ) into v_sonuc;

  return v_sonuc;
end;
$function$;

revoke all on function public.arac_arama(jsonb, integer, integer) from public;
grant execute on function public.arac_arama(jsonb, integer, integer) to anon, authenticated;

comment on function public.arac_arama(jsonb, integer, integer) is
  'Pazaryeri araması: sunucu tarafı süzme, sıralama, sayfalama ve süzgeç sayaçları. {satirlar, toplam, secenekler} döner.';
