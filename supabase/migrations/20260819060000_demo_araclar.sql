-- =========================================================================
-- DEMO ARAÇLAR — GEÇİCİ VİTRİN DOLGUSU, AYRI TABLODA
--
-- -------------------------------------------------------------------------
-- NİYE AYRI TABLO
-- -------------------------------------------------------------------------
-- Bu kayıtlar SAHTE. `vehicles` tablosuna girselerdi gerçek envanterle
-- karışır; sicil, karne, devir ve hesap kapatma iş akışlarına sızar ve
-- silinmeleri riskli olurdu. Ayrı tabloda `vehicles` tertemiz kalıyor ve
-- temizlik tek komut: `drop table public.demo_araclar cascade;`
--
-- -------------------------------------------------------------------------
-- NİYE İSTEMCİDEN TAŞINDI
-- -------------------------------------------------------------------------
-- Demo kartlar `MarketplaceView` içinde gerçek listeye ekleniyordu (üstelik
-- koddaki yorum "`?demo=N` yoksa çağrılmıyor" dediği hâlde HİÇBİR koşula
-- bağlı değildi: 132 sahte araç her ziyaretçiye gösteriliyordu).
--
-- Süzme sunucuya taşınınca bu kartlar süzgecin DIŞINDA kalırdı: bir marka
-- seçilince listede durmaya devam eder ama sayaçlar onları saymazdı. Yani
-- ekrandaki sayı ile listedeki kart sayısı tutmazdı — ürünün "sayaçlar
-- dürüst olsun" kararının tam tersi. Aynı tabloda oldukları için artık
-- gerçek kartlarla AYNI SQL süzgecinden geçiyorlar.
--
-- ⚠ PIN YOK: demo aracın karnesi de yok; sahte PIN vermek karta
--   tıklanabilir bir ölü kapı açardı.
-- ⚠ GÖRSEL YOK: uydurma fotoğraf, ürünün "beyan edilmeyeni beyan etme"
--   kuralına aykırı olurdu. `AracGorseli` "GÖRSEL YOK" yer tutucusu basıyor.
-- ⚠ `created_at` DEĞİL `gun_once`: sabit tarih saklansaydı "Son 1 hafta"
--   süzgeci zamanla hiçbir demo kartı bulamaz olurdu.
--
-- CANLIYA ÇIKARKEN: bu tablo düşürülür ve `arac_arama()` içindeki union
-- dalı kaldırılır (ikisi de "DEMO" ile işaretli). O ana kadar `p_demo`
-- parametresi `false` geçilerek de tamamen kapatılabilir.
-- =========================================================================
create table if not exists public.demo_araclar (
  kart_id       text primary key,
  brand         text not null,
  series        text,
  model         text not null,
  package       text,
  year          integer not null,
  km            integer not null,
  city          text,
  fuel_type     text,
  transmission  text,
  tramer_status text not null,
  trust_score   integer not null,
  is_featured   boolean not null default false,
  gun_once      integer not null default 0,
  arama_metni   text generated always as (
    public.arama_normalize(
      coalesce(brand,'') || ' ' || coalesce(series,'') || ' ' ||
      coalesce(model,'') || ' ' || coalesce(package,'') || ' ' || coalesce(city,'')
    )
  ) stored
);

create index if not exists demo_araclar_arama_trgm_idx
  on public.demo_araclar using gin (arama_metni gin_trgm_ops);

-- ⚠ RLS AÇIK AMA OKUMA HERKESE: bu tablo bilerek kamuya açık dolgu veri.
-- Yazma yalnızca `service_role`da kalıyor (hiçbir yazma politikası yok).
alter table public.demo_araclar enable row level security;

drop policy if exists demo_araclar_okuma on public.demo_araclar;
create policy demo_araclar_okuma on public.demo_araclar
  for select using (true);

grant select on public.demo_araclar to anon, authenticated;

-- -------------------------------------------------------------------------
-- TOHUMLAMA — KATALOGDAN, DETERMİNİSTİK
--
-- Kombinasyonlar UYDURULMUYOR: gerçek katalog zincirinden
-- (car_brands → car_series → car_models → car_packages) her markadan bir
-- tane olacak şekilde 44 kombinasyon seçiliyor, her birinden 3 varyant
-- üretiliyor = 132 kart.
--
-- Formüller `src/utils/demoVitrin.js` ile birebir aynı. ⚠ VİTES FORMÜLÜ
-- `(i + v)`: katsayı toplamı 3'ün katı olursa `(i + 2v) mod 3` DAİMA 0
-- çıkıyor ve her demo araç 'Otomatik' oluyordu (ölçülmüştü: 139/3).
-- Bu sürümde ölçüldü: 44 / 44 / 44 eşit dağılım.
-- -------------------------------------------------------------------------
delete from public.demo_araclar;

with kombinasyonlar as (
  select b.name as brand, s.name as series, m.name as model, p.name as package,
         row_number() over (order by b.name, s.name, m.name, p.name) - 1 as k
  from car_brands b
  join car_series  s on s.brand_id = b.id
  join car_models  m on m.series_id = s.id
  join car_packages p on p.model_id = m.id
  where (b.name, s.name, m.name, p.name) in (
    select distinct on (b2.name) b2.name, s2.name, m2.name, p2.name
    from car_brands b2
    join car_series  s2 on s2.brand_id = b2.id
    join car_models  m2 on m2.series_id = s2.id
    join car_packages p2 on p2.model_id = m2.id
    order by b2.name, s2.name, m2.name, p2.name
  )
  limit 44
),
varyantlar as (
  select kb.*, v.v, (kb.k * 3 + v.v) as i
  from kombinasyonlar kb cross join (values (0),(1),(2)) as v(v)
),
sehirler  as (select array['İstanbul','Ankara','İzmir','Bursa','Antalya','Konya','Adana','Kocaeli','Gaziantep','Kayseri','Mersin'] as a),
yakitlar  as (select array['Benzin','Dizel','LPG & Benzin','Hibrit','Elektrik','Benzin','Dizel'] as a),
vitesler  as (select array['Otomatik','Manuel','Yarı Otomatik'] as a),
-- ⚠ DÖRT ELEMAN, ÜÇ DEĞİL: VARYANT 3 olduğu için eşit uzunlukta bir dizi
-- `(i+v) mod 3` ile hep aynı değere düşerdi. 'Bilmiyorum' ayrı bir seçenek;
-- 'Tramer Yok'a katılmıyor.
tramerler as (select array['Tramer Yok','Tramer Var','Bilmiyorum','Tramer Yok'] as a)
insert into public.demo_araclar
  (kart_id, brand, series, model, package, year, km, city, fuel_type,
   transmission, tramer_status, trust_score, is_featured, gun_once)
select
  'demo-' || (x.i + 1),
  x.brand, x.series, x.model, x.package,
  2013 + ((x.i * 3 + x.v) % 12),
  18000 + ((x.i * 17393 + x.v * 40961) % 260000),
  (select a[((x.i * 5 + x.v) % array_length(a,1)) + 1] from sehirler),
  (select a[((x.i * 3 + x.v) % array_length(a,1)) + 1] from yakitlar),
  (select a[((x.i + x.v) % array_length(a,1)) + 1] from vitesler),
  (select a[((x.i + x.v) % array_length(a,1)) + 1] from tramerler),
  22 + ((x.i * 13 + x.v * 29) % 73),
  (x.i % 9 = 0),
  ((x.i * 7 + x.v * 2) % 95)
from varyantlar x;
