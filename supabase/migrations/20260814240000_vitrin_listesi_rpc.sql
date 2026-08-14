-- =========================================================================
-- PAZARYERİ VİTRİNİ: LİSTE ARTIK RPC'DEN GELİYOR
--
-- -------------------------------------------------------------------------
-- BULUNAN ARIZA — VİTRİN SAHİBİ DIŞINDA HERKESE BOŞ GÖRÜNÜYORDU
-- -------------------------------------------------------------------------
-- `fetchMarketplaceListings` şu sorguyu atıyordu:
--
--     supabase.from('listings').select('*, vehicles(*)').eq('status','active')
--
-- Ama `vehicles` tablosunun SELECT politikası YALNIZCA SAHİBE açık
-- (`vehicles_oku_sahip`: auth.uid() = user_id). Dolayısıyla başka bir
-- kullanıcı ya da ziyaretçi listeyi çektiğinde `item.vehicles` NULL
-- dönüyordu.
--
-- Ölçüldü (üç ayrı hesapla, aynı sorgu):
--     SAHİP : 2 ilan -> arac_geldi=true,  pin=CV-8YW4W-R5Z4F
--     ALICI : 2 ilan -> arac_geldi=false, pin=YOK
--     ANON  : 2 ilan -> arac_geldi=false, pin=YOK
--
-- Sonucu: pazaryeri kartları marka, model, yıl, km, puan ve görsel olmadan
-- çiziliyor; karta tıklanınca `pin_code` undefined olduğu için
-- `/details/undefined` açılıyor ve "CV-UNDEFINED koduna ait kayıt
-- bulunamadı" hatası veriyordu. Yani ürünün kamuya bakan yüzü, sahibi
-- dışında HERKES için çalışmıyordu.
--
-- Yerelde görünmemesinin sebebi: testler ve elle doğrulamalar hep aracın
-- SAHİBİ hesabıyla yapılıyordu. Aynı ders sahte telefon numarasında da
-- alınmıştı — o da yalnızca `isPublicView` dalında duruyordu.
--
-- -------------------------------------------------------------------------
-- NİYE RLS DEĞİL RPC
-- -------------------------------------------------------------------------
-- "Vitrindeki araçlar herkese okunsun" diye bir politika eklemek en kısa
-- yoldu ama YANLIŞ: o politika `vehicles` satırının TAMAMINI açardı ve
-- satırda `plate_number` var. Plaka üründe bilerek gizleniyor (pazaryerinden
-- ve devir akışından tam bu gerekçeyle kaldırıldı).
--
-- Bu yüzden favorilerde ve mesajlaşmada kurulan kalıp burada da geçerli:
-- `security definer` fonksiyon, güvenli bir izdüşüm döndürüyor.
--
-- ⚠ PLAKA YALNIZCA SAHİBİNE. `plate_number` sadece çağıran o ilanın
-- sahibiyse dolduruluyor; "Vitrindeki Araçlarım" ekranı plakayı gösterdiği
-- ve kaldırma işlemi plakayla çalıştığı için gerekiyor.
-- =========================================================================

create or replace function public.vitrin_listesi(
  p_sehir     text default null,
  p_kullanici uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'listing_id',          l.id,
        'user_id',             l.user_id,
        'listing_title',       l.title,
        'listing_description', l.description,
        'city',                l.city,
        'district',            l.district,
        'tramer_amount',       l.tramer_amount,
        'is_featured',         coalesce(l.is_featured, false),
        'views_count',         coalesce(l.views_count, 0),
        'created_at',          l.created_at,
        -- ⚠ PLAKA: yalnızca ilanın sahibine.
        'plate_number',        case when l.user_id = v_uid then l.vehicle_plate else null end,
        'brand',               v.brand,
        'model',               v.model,
        'series',              v.series,
        'year',                v.year,
        'km',                  v.km,
        'package',             v.package,
        'fuel_type',           v.fuel_type,
        -- `gear_type` sütunu `vehicles` tablosunda YOK; vites bilgisi
        -- `transmission` sütununda. Servis katmanı `v.gear_type ||
        -- 'Otomatik'` yazıyordu, yani vitesi belirtilmemiş her aracı
        -- "Otomatik" gösteriyordu — uydurma yedek. Gerçek sütun dönüyor.
        'transmission',        v.transmission,
        'trust_score',         v.trust_score,
        'image_url',           v.image_url,
        'pin_code',            v.pin_code
      )
      order by coalesce(l.is_featured, false) desc, l.created_at desc
    )
    from listings l
    join vehicles v on v.plate_number = l.vehicle_plate
    where l.status = 'active'
      and (p_sehir is null or l.city = p_sehir)
      -- Kullanıcı süzgeci sunucuda: "Vitrindeki Araçlarım" eskiden TÜM
      -- pazaryerini indirip istemcide süzüyordu.
      and (p_kullanici is null or l.user_id = p_kullanici)
  ), '[]'::jsonb);
end;
$$;

-- -------------------------------------------------------------------------
-- YETKİLER
--
-- ⚠ İKİ REVOKE BİRDEN. `from public` tek başına yetmiyor: Supabase
-- fonksiyonlara `anon` ve `authenticated` rollerine AYRI yetki veriyor.
-- Bu ders mesajlaşma migration'ında ölçümle yakalandı.
--
-- Bu fonksiyon anon'a AÇIK ve olması gereken bu: pazaryeri vitrini
-- anasayfa, giriş yapmamış ziyaretçi de görmeli. Fonksiyon plakayı zaten
-- yalnızca sahibine veriyor.
-- -------------------------------------------------------------------------

revoke all on function public.vitrin_listesi(text, uuid) from public;
revoke all on function public.vitrin_listesi(text, uuid) from anon, authenticated;

grant execute on function public.vitrin_listesi(text, uuid) to anon, authenticated;
