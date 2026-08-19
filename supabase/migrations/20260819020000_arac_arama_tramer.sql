-- =========================================================================
-- ARAMA SONUCUNA TRAMER DURUMU EKLENDİ
--
-- -------------------------------------------------------------------------
-- NİYE ŞİMDİ
-- -------------------------------------------------------------------------
-- Hasar beyanı süzgeci uzun süre "yapılamaz" olarak bekliyordu: `vitrin_listesi`
-- `tramer_status` döndürmüyordu ve o RPC'yi değiştirmek onay bekliyordu.
--
-- Arama artık `arac_arama()` üzerinden yapılıyor ve o fonksiyon bu turda
-- yazıldı — yani engel kalktı.
--
-- -------------------------------------------------------------------------
-- ⚠ ÜÇ DURUM VE HİÇBİRİ UYDURMA DEĞİL
-- -------------------------------------------------------------------------
-- `vehicles.tramer_status` canlıda tam olarak üç değer taşıyor (ölçüldü):
--     'Tramer Yok' · 'Tramer Var' · 'Bilmiyorum'
--
-- Bu ayrım ürünün kendi kararı: sihirbazda bir dönem 'Hasarsız' varsayılanı
-- vardı ve beyan ETMEYEN kullanıcının aracını hasarsız gösteriyordu; bilerek
-- 'Bilmiyorum'a çevrildi (`16-uydurma-veri` bunu bekçiliyor).
--
-- Süzgeç de bu üçünü OLDUĞU GİBİ gösterecek. "Hasarsız" diye bir seçenek
-- üretip 'Bilmiyorum' kayıtlarını oraya katmak, beyan edilmeyeni beyan
-- edilmiş gibi sunmak olurdu.
--
-- Fonksiyonun geri kalanı DEĞİŞMİYOR; yalnızca çıktıya tek alan ekleniyor.
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
      'user_id', v.user_id,
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
