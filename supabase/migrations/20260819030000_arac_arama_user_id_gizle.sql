-- =========================================================================
-- arac_arama(): user_id ARTIK YALNIZCA SAHİBİNE DÖNÜYOR
--
-- 19 Ağustos 2026 beta taraması, herkese açık RPC'lerde bir sızıntı ölçtü:
-- anonim çağırana 11/11 satırda ham `user_id` (auth UUID) doluyordu. Plaka
-- doğru şekilde maskeleniyordu ama sahip kimliği açıktaydı.
--
-- NİYE ÖNEMLİ: UUID tek başına isim/telefon vermiyor, ama kalıcı ve
-- benzersiz. Dışarıdan bakan biri hangi araçların AYNI kişiye ait olduğunu
-- kümeleyebiliyordu — araç sayısı, şehir dağılımı, vitrine çıkarma
-- alışkanlığı. KVKK açısından dışarı verilmesi gereksiz bir alan.
--
-- NİYE ALAN TAMAMEN KALDIRILMADI: sözleşmeyi bozmamak için. Alan duruyor,
-- yalnızca sahibi dışında NULL dönüyor. İstemcide `user_id` hiçbir yerde
-- okunmuyor (ölçüldü: MarketplaceView, VehicleDetailsScreen, servis katmanı
-- — tek kullanım yok), yani görünür bir davranış değişmiyor.
--
-- Fonksiyonun geri kalanı ve imzası (parametresiz) AYNEN korundu.
--
-- Doğrulandı (19 Ağustos 2026):
--   anon          -> user_id 0/11, plaka 0/11, pin 2/11, kart_id 11/11
--   sahip         -> user_id 10/11, plaka 10/11
--   ikinci hesap  -> user_id 0/11
-- =========================================================================
create or replace function public.arac_arama()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      -- ⚠ KART KİMLİĞİ PLAKA DEĞİL. `vehicles`ın birincil anahtarı plaka ve
      -- plaka kişisel veri; DOM'a anahtar olarak bile girmemeli.
      'kart_id', md5(v.plate_number),
      'listing_id', l.id,
      -- ⚠ SAHİP KİMLİĞİ ARTIK MASKELİ. Ziyaretçinin kartları çizmek için
      -- sahip UUID'sine ihtiyacı yok; kart kimliği `kart_id` ile veriliyor.
      'user_id', case when v.user_id = v_uid then v.user_id else null end,
      'katman', case when l.id is not null then 'vitrin' else 'listelenebilir' end,
      'listing_title', l.title,
      'listing_description', l.description,
      'city', coalesce(l.city, v.city),
      'district', coalesce(l.district, v.district),
      'tramer_amount', v.tramer_amount,
      -- YENİ: hasar beyanı süzgecinin dayandığı alan.
      'tramer_status', v.tramer_status,
      'is_featured', coalesce(l.is_featured, false),
      'views_count', coalesce(l.views_count, 0),
      'favorite_count', coalesce(l.favorite_count, 0),
      'created_at', coalesce(l.created_at, v.created_at),
      -- Plaka YALNIZCA sahibine.
      'plate_number', case when v.user_id = v_uid then v.plate_number else null end,
      'brand', v.brand, 'model', v.model, 'series', v.series, 'year', v.year,
      'km', v.km, 'package', v.package, 'fuel_type', v.fuel_type,
      'transmission', v.transmission, 'trust_score', v.trust_score,
      'image_url', v.image_url,
      -- ⚠ PIN YALNIZCA VİTRİN KATMANINDA: karne paylaşımı vitrine çıkmakla
      -- veriliyor, yalnızca listelenmekle değil.
      'pin_code', case when l.id is not null then v.pin_code else null end
    ) order by coalesce(l.is_featured, false) desc,
               coalesce(l.created_at, v.created_at) desc)
    from vehicles v
    left join listings l
      on l.vehicle_plate = v.plate_number and l.status = 'active'
    -- Ücretli vitrin kaydı görünürlük kapatılsa bile sessizce kaybolmuyor.
    where v.gorunurluk = 'listelenebilir' or l.id is not null
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.arac_arama() from public;
grant execute on function public.arac_arama() to anon, authenticated;
