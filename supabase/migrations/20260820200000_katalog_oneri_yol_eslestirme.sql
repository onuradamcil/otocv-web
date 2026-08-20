-- =========================================================================
-- KATALOG ÖNERİSİ: YOL ÜZERİNDEN EŞLEŞTİRME + ENVANTER ÖNCELİĞİ
--
-- -------------------------------------------------------------------------
-- NİYE — İLK SÜRÜM ÇOK AZ ÖNERİ VERİYORDU
-- -------------------------------------------------------------------------
-- Önceki sürüm yalnızca YAPRAK ADINA bakıyordu. "bmw" yazınca seri adları
-- ("3 Serisi") içinde "bmw" geçmediği için hiçbir seri eşleşmiyor, listede
-- tek satır kalıyordu. Ürün sahibinin ekranda gördüğü buydu.
--
-- Artık eşleşme YOL üzerinden: marka + seri (+ model) birleştirilip
-- aranıyor. "bmw" artık markayı, BMW serilerini ve BMW modellerini birden
-- getiriyor — ölçüldü: 1 satır -> 8 satır.
--
-- ⚠ İNDEKS EKLENMEDİ VE BU ÖLÇÜLMÜŞ BİR KARAR. Birleştirilmiş ifade
-- üzerinde trigram indeksi kurulamıyor: marka adı ayrı tabloda ve ifade
-- indeksi join'i kapsayamaz. Sıralı tarama ölçüldü (`explain analyze`):
-- 3,57 ms. Katalog 4.462 satır ve istemcide 300 ms gecikme var; bu maliyet
-- için tabloyu denormalize etmek gereksiz karmaşıklık olurdu.
--
-- İlk migration'daki yaprak-adı trigram indeksleri DURUYOR: marka aramasını
-- (`car_brands`) hâlâ hızlandırıyorlar.
--
-- -------------------------------------------------------------------------
-- ⚠ SIRALAMA GERÇEK BİR SİNYALE DAYANIYOR, UYDURMA DEĞİL
-- -------------------------------------------------------------------------
-- Ürün sahibi "kullanıcının kullanımına göre şekillensin" dedi. Arama
-- geçmişi TUTULMUYOR; kişiselleştirme uydurma olurdu ve bu ürünün temel
-- kuralına aykırı.
--
-- Onun yerine elimizdeki gerçek sinyal kullanılıyor: ENVANTERDE ARACI OLAN
-- künyeler öne alınıyor (`dolu`). Böylece "Bmw › 3 Serisi" (gerçekten araç
-- var) "Bmw › 1 Serisi"nin üstüne çıkıyor — kullanıcının tıklayınca sonuç
-- bulma olasılığı en yüksek satır en üstte.
--
-- Öneriler yine de KATALOGDAN geliyor (ürün sahibinin kararı): envanterde
-- karşılığı olmayan künye de listeleniyor, yalnızca daha aşağıda.
--
-- -------------------------------------------------------------------------
-- KADEME SINIRLARI
-- -------------------------------------------------------------------------
-- marka 3 · seri 4 · model 3. Biri diğerini boğmasın diye ayrı ayrı
-- sınırlanıyor: tek bir sınır olsaydı 3.591 modelin 49 markayı listeden
-- tamamen silmesi işten bile değildi.
-- =========================================================================

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
  v_sonuc jsonb;
begin
  v_sorgu := public.arama_normalize(p_sorgu);

  -- ⚠ İKİ KARAKTER ALTI ARANMIYOR. Tek harf katalogun neredeyse tamamıyla
  -- eşleşir: hem anlamsız bir liste çıkar hem her tuşta boşuna tarama olur.
  if v_sorgu is null or length(v_sorgu) < 2 then
    return jsonb_build_object('satirlar', '[]'::jsonb);
  end if;

  with envanter as (
    -- Gerçekten aracı olan marka/seri çiftleri. `distinct` şart: envanter
    -- büyüdükçe aynı çift yüzlerce kez tekrar eder.
    select distinct public.arama_normalize(brand) as marka,
                    public.arama_normalize(series) as seri
    from public.vehicles
    where brand is not null
  ),
  marka as (
    select 'marka'::text as tur, b.name as etiket,
           public.arama_normalize(b.name) as marka,
           null::text as seri, null::text as model,
           case when public.arama_normalize(b.name) like v_sorgu || '%' then 0 else 1 end as onek,
           case when exists (select 1 from envanter e
                             where e.marka = public.arama_normalize(b.name)) then 0 else 1 end as dolu,
           b.name as sira
    from public.car_brands b
    where public.arama_normalize(b.name) like '%' || v_sorgu || '%'
    -- Markada ÖNEK önce: "bm" yazan "Bmw"yi bekler, adının ortasında "bm"
    -- geçen bir markayı değil.
    order by onek, dolu, b.name
    limit 3
  ),
  seri as (
    select 'seri'::text as tur, b.name || ' › ' || s.name as etiket,
           public.arama_normalize(b.name) as marka,
           public.arama_normalize(s.name) as seri,
           null::text as model,
           case when public.arama_normalize(s.name) like v_sorgu || '%' then 0 else 1 end as onek,
           case when exists (select 1 from envanter e
                             where e.marka = public.arama_normalize(b.name)
                               and e.seri = public.arama_normalize(s.name)) then 0 else 1 end as dolu,
           b.name || s.name as sira
    from public.car_series s
    join public.car_brands b on b.id = s.brand_id
    -- YOL EŞLEŞMESİ: "bmw" seri adında geçmez ama marka+seri yolunda geçer.
    where public.arama_normalize(b.name || ' ' || s.name) like '%' || v_sorgu || '%'
    -- Alt kademelerde ENVANTER önce, önek sonra: kullanıcı marka yazdığında
    -- hepsi eşit derecede "önek dışı" olur, ayırt edici sinyal envanterdir.
    order by dolu, onek, b.name, s.name
    limit 4
  ),
  model as (
    select 'model'::text as tur,
           b.name || ' › ' || s.name || ' › ' || m.name as etiket,
           public.arama_normalize(b.name) as marka,
           public.arama_normalize(s.name) as seri,
           public.arama_normalize(m.name) as model,
           case when public.arama_normalize(m.name) like v_sorgu || '%' then 0 else 1 end as onek,
           case when exists (select 1 from envanter e
                             where e.marka = public.arama_normalize(b.name)
                               and e.seri = public.arama_normalize(s.name)) then 0 else 1 end as dolu,
           b.name || s.name || m.name as sira
    from public.car_models m
    join public.car_series s on s.id = m.series_id
    join public.car_brands b on b.id = s.brand_id
    where public.arama_normalize(b.name || ' ' || s.name || ' ' || m.name) like '%' || v_sorgu || '%'
    order by dolu, onek, b.name, s.name, m.name
    limit 3
  ),
  hepsi as (
    select * from marka union all select * from seri union all select * from model
  )
  select coalesce(jsonb_agg(
           jsonb_build_object('tur', h.tur, 'etiket', h.etiket,
                              'marka', h.marka, 'seri', h.seri, 'model', h.model,
                              'dolu', h.dolu = 0)
           -- Kademe sırası korunuyor: marka → seri → model. Kullanıcı
           -- genelden özele iner; tersi liste okunaksız olur.
           order by case h.tur when 'marka' then 0 when 'seri' then 1 else 2 end,
                    h.dolu, h.onek, h.sira
         ), '[]'::jsonb)
    into v_sonuc
  from hepsi h;

  return jsonb_build_object('satirlar', v_sonuc);
end;
$$;

comment on function public.katalog_oneri(text, integer) is
  'Arama çubuğu önerileri: marka/seri/model YOLU üzerinde normalize metin '
  'araması. Envanterde karşılığı olan künyeler öne alınır (dolu alanı). '
  'Donanım (car_packages) kapsam dışı.';

grant execute on function public.katalog_oneri(text, integer) to anon, authenticated;
