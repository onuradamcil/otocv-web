-- =========================================================================
-- KATALOG ÖNERİ ALTYAPISI (arama çubuğu autocomplete)
--
-- -------------------------------------------------------------------------
-- NİYE VAR
-- -------------------------------------------------------------------------
-- Başlık şeridindeki arama kutusu yalnızca Enter'da çalışıyordu: kullanıcı
-- yazarken hiçbir geri bildirim almıyordu. Artık yazdıkça marka/seri/model
-- önerisi çıkacak.
--
-- Bu iş İSTEMCİDE YAPILAMIYOR. `catalogService` kademeleri yalnızca ebeveyn
-- kimliğiyle çekebiliyor (`eq('brand_id', …)`); 3.591 modeli ebeveyn
-- bilmeden indirmenin yolu yok. Ada göre metin araması yapan bir RPC de
-- yoktu — bu dosya onu ekliyor.
--
-- -------------------------------------------------------------------------
-- ⚠ ÖNERİLER KATALOGDAN, ENVANTERDEN DEĞİL — BİLİNÇLİ KARAR
-- -------------------------------------------------------------------------
-- Ürün sahibinin kararı: liste EKSİKSİZ olsun. Yani "BMW 3 Serisi" envanterde
-- hiç araç olmasa bile önerilir ve tıklanınca boş sonuç ekranı gelir.
-- Alternatifi (yalnızca envanterdeki künyeleri önermek) ölü kapıyı
-- engellerdi ama listeyi envanter kadar dar bırakırdı.
--
-- Bu yüzden öneri satırlarında SAYI GÖSTERİLMİYOR: katalogda sayı yok ve
-- uydurma sayı bu ürünün temel kuralına aykırı.
--
-- -------------------------------------------------------------------------
-- ⚠ DÖNEN DEĞERLER HEM GÖRÜNEN AD HEM NORMALİZE AD TAŞIYOR
-- -------------------------------------------------------------------------
-- Adres süzgeci normalize ad bekliyor: `arac_arama` yüklemi
-- `arama_normalize(k.brand) = v_marka` biçiminde TAM EŞİTLİK.
-- Ekranda ise okunabilir ad gerekiyor. İkisi ayrı alanlarda dönüyor;
-- istemcinin yeniden normalize etmesi gerekmiyor (etseydi JS/SQL haritaları
-- arasında sessiz kayma riski doğardı).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) TRIGRAM İNDEKSLERİ
-- -------------------------------------------------------------------------
-- `pg_trgm` zaten kurulu (20260819040000). Trigram indeksleri o migration'da
-- YALNIZCA envanter tablolarına konmuştu; katalog dışarıda kalmıştı.
--
-- ⚠ GIN + trigram seçildi, btree değil: öneri hem ÖNEK ('bm%') hem İÇERİK
-- ('%seri%') eşleşmesi yapıyor. btree yalnızca öneki hızlandırır, içerik
-- aramasında tabloyu baştan sona tarar.
--
-- `car_packages` BİLEREK DIŞARIDA: 23.138 satır ve donanım önerileri bu
-- turun kapsamında değil.
create index if not exists car_brands_ad_trgm_idx
  on public.car_brands using gin (public.arama_normalize(name) gin_trgm_ops);

create index if not exists car_series_ad_trgm_idx
  on public.car_series using gin (public.arama_normalize(name) gin_trgm_ops);

create index if not exists car_models_ad_trgm_idx
  on public.car_models using gin (public.arama_normalize(name) gin_trgm_ops);

-- -------------------------------------------------------------------------
-- 2) ÖNERİ FONKSİYONU
-- -------------------------------------------------------------------------
create or replace function public.katalog_oneri(
  p_sorgu text,
  p_limit integer default 6
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_sorgu text;
  v_limit integer;
  v_sonuc jsonb;
begin
  v_sorgu := public.arama_normalize(p_sorgu);
  v_limit := least(greatest(coalesce(p_limit, 6), 1), 20);

  -- ⚠ İKİ KARAKTER ALTI ARANMIYOR. Tek harf katalogun neredeyse tamamıyla
  -- eşleşir: hem anlamsız bir liste çıkar hem her tuşta boşuna tarama olur.
  if v_sorgu is null or length(v_sorgu) < 2 then
    return jsonb_build_object('satirlar', '[]'::jsonb);
  end if;

  -- Üç kademe ayrı ayrı aranıp birleştiriliyor. Her kademeden en fazla
  -- `v_limit` satır — biri diğerini boğmasın (3.591 model, 49 markayı
  -- listeden tamamen silerdi).
  with marka as (
    select
      'marka'::text                        as tur,
      b.name                               as etiket,
      public.arama_normalize(b.name)       as marka,
      null::text                           as seri,
      null::text                           as model,
      -- Önek eşleşmesi önce: "bm" yazan kullanıcı "Bmw"yi bekler,
      -- adının ortasında "bm" geçen bir markayı değil.
      case when public.arama_normalize(b.name) like v_sorgu || '%'
           then 0 else 1 end               as oncelik
    from public.car_brands b
    where public.arama_normalize(b.name) like '%' || v_sorgu || '%'
    order by oncelik, b.name
    limit v_limit
  ),
  seri as (
    select
      'seri'::text                         as tur,
      b.name || ' › ' || s.name            as etiket,
      public.arama_normalize(b.name)       as marka,
      public.arama_normalize(s.name)       as seri,
      null::text                           as model,
      case when public.arama_normalize(s.name) like v_sorgu || '%'
           then 0 else 1 end               as oncelik
    from public.car_series s
    join public.car_brands b on b.id = s.brand_id
    where public.arama_normalize(s.name) like '%' || v_sorgu || '%'
    order by oncelik, b.name, s.name
    limit v_limit
  ),
  model as (
    select
      'model'::text                        as tur,
      b.name || ' › ' || s.name || ' › ' || m.name as etiket,
      public.arama_normalize(b.name)       as marka,
      public.arama_normalize(s.name)       as seri,
      public.arama_normalize(m.name)       as model,
      case when public.arama_normalize(m.name) like v_sorgu || '%'
           then 0 else 1 end               as oncelik
    from public.car_models m
    join public.car_series s on s.id = m.series_id
    join public.car_brands b on b.id = s.brand_id
    where public.arama_normalize(m.name) like '%' || v_sorgu || '%'
    order by oncelik, b.name, s.name, m.name
    limit v_limit
  ),
  hepsi as (
    select * from marka
    union all select * from seri
    union all select * from model
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'tur',    h.tur,
             'etiket', h.etiket,
             'marka',  h.marka,
             'seri',   h.seri,
             'model',  h.model
           )
           -- Kademe sırası korunuyor: marka → seri → model. Kullanıcı
           -- genelden özele iner; tersi liste okunaksız olur.
           order by case h.tur when 'marka' then 0 when 'seri' then 1 else 2 end,
                    h.oncelik, h.etiket
         ), '[]'::jsonb)
    into v_sonuc
  from hepsi h;

  return jsonb_build_object('satirlar', v_sonuc);
end;
$$;

comment on function public.katalog_oneri(text, integer) is
  'Arama çubuğu önerileri: marka/seri/model adlarında normalize edilmiş '
  'metin araması. Her satır hem görünen adı (etiket) hem adres süzgecine '
  'yazılacak normalize adı taşır. Donanım (car_packages) kapsam dışı.';

-- Katalog zaten herkese açık okunabilir (temel şemadaki RLS politikası),
-- öneri de oturum açmamış ziyaretçiye lazım.
grant execute on function public.katalog_oneri(text, integer) to anon, authenticated;
