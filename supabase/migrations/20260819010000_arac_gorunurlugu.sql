-- =========================================================================
-- ARAÇ GÖRÜNÜRLÜĞÜ: KAYITLI HER ARAÇ ARAMADA ÇIKABİLİR
--
-- -------------------------------------------------------------------------
-- NİYE
-- -------------------------------------------------------------------------
-- Bugüne kadar bir araç kaydı SAHİBİNE ÖZELDİ: `vehicles` RLS'i
-- `auth.uid() = user_id`. Dışarıya açılan tek yol vitrindi (`listings`
-- kaydı + `vitrin_listesi()` RPC'si). Sonuç: anasayfadaki arama ve süzgeçler
-- yalnızca 2 aracı görüyordu, yani çalışmıyordu.
--
-- Ürün sahibinin kararı: kayıtlı her araç arama ve süzgeçlerde çıksın.
-- Ama bu, "özel sicil" vaadini kaldırmadan yapılmalı.
--
-- -------------------------------------------------------------------------
-- KADEMELİ GÖRÜNÜRLÜK
-- -------------------------------------------------------------------------
--   gizli           yalnızca sahibi görür (hiçbir aramada çıkmaz)
--   listelenebilir  aramada/süzgeçte çıkar; künye, şehir, sicil puanı ve
--                   FOTOĞRAF görünür. Plaka ve PIN KAPALI, yani KARNE
--                   PAYLAŞIMA AÇIK DEĞİL.
--   (vitrin)        aktif bir `listings` kaydı olan araç. Ek olarak PIN
--                   açılır -> karne herkese görünür; öne çıkarma (ücretli)
--                   bu katmanda.
--
-- ⚠ 'vitrin' AYRI BİR KOLON DEĞERİ DEĞİL, TÜRETİLİYOR. Plan üç değerli bir
-- alan öngörüyordu; uygularken ikiye indirildi. Sebep: "bu araç vitrinde mi"
-- sorusunun cevabı ZATEN `listings.status='active'`. Aynı gerçeği ikinci bir
-- kolonda tutmak iki kaynağın er ya da geç ayrışması demek — kolon 'vitrin'
-- derken aktif kayıt olmayan (ya da tersi) bir araç kaçınılmaz.
--
-- -------------------------------------------------------------------------
-- VARSAYILAN: GÖRÜNÜR
-- -------------------------------------------------------------------------
-- Ürün sahibinin kararı: "ilk seçenek görünür olsun, değiştirdiği anda
-- uyarı çıksın". Mevcut 11 kayıt da görünür oluyor — hepsi ürün sahibinin
-- kendi kayıtları, üçüncü kişi verisi yok.
--
-- ⚠ RLS'E DOKUNULMUYOR. `vehicles` tablosuna doğrudan erişim katı özel
-- kalıyor; dışarıya açılan tek kapı aşağıdaki SECURITY DEFINER fonksiyonu.
-- =========================================================================

alter table public.vehicles
  add column if not exists gorunurluk text not null default 'listelenebilir';

-- Serbest metin kabul edilmiyor: yazım hatası sessizce "hiçbir yerde
-- görünmeyen" bir araç üretirdi.
alter table public.vehicles
  drop constraint if exists vehicles_gorunurluk_gecerli;
alter table public.vehicles
  add constraint vehicles_gorunurluk_gecerli
  check (gorunurluk in ('gizli', 'listelenebilir'));

-- Arama sorgusu daima bu kolona göre süzüyor; envanter büyüdüğünde tam
-- tarama olmasın diye kısmi indeks.
create index if not exists vehicles_gorunurluk_idx
  on public.vehicles (gorunurluk)
  where gorunurluk = 'listelenebilir';

comment on column public.vehicles.gorunurluk is
  'gizli | listelenebilir — aracın aramada/süzgeçte çıkıp çıkmayacağı. '
  'Vitrin katmanı bu kolonda DEĞİL, listings.status=active ile türetiliyor.';

-- =========================================================================
-- ARAMA KAYNAĞI
-- =========================================================================
-- `vitrin_listesi()` KALDIRILMIYOR: `MyListingsScreen` onu kullanıyor ve o
-- ekranın işi zaten yalnızca vitrin kayıtları.
--
-- Bu fonksiyon anasayfa ve /vitrin sayfasını besliyor.
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
      -- plaka kişisel veri; DOM'a anahtar olarak bile girmemeli. Geri
      -- döndürülemeyen ama kararlı bir özet kullanılıyor.
      'kart_id', md5(v.plate_number),
      'listing_id', l.id,
      'user_id', v.user_id,
      -- Arayüz katmanı buradan öğreniyor: karne bağı çizilecek mi.
      'katman', case when l.id is not null then 'vitrin' else 'listelenebilir' end,
      'listing_title', l.title,
      'listing_description', l.description,
      'city', coalesce(l.city, v.city),
      'district', coalesce(l.district, v.district),
      'tramer_amount', v.tramer_amount,
      'is_featured', coalesce(l.is_featured, false),
      'views_count', coalesce(l.views_count, 0),
      'favorite_count', coalesce(l.favorite_count, 0),
      'created_at', coalesce(l.created_at, v.created_at),
      -- Plaka YALNIZCA sahibine (bugünkü `vitrin_listesi` kuralı aynen).
      'plate_number', case when v.user_id = v_uid then v.plate_number else null end,
      'brand', v.brand, 'model', v.model, 'series', v.series, 'year', v.year,
      'km', v.km, 'package', v.package, 'fuel_type', v.fuel_type,
      'transmission', v.transmission, 'trust_score', v.trust_score,
      'image_url', v.image_url,
      -- ⚠ PIN YALNIZCA VİTRİN KATMANINDA. Karne PIN ile açılıyor; sadece
      -- listelenen aracın karnesi paylaşıma açık değil. Ürün sahibinin
      -- kararı: "karne hariç vitrinle aynı".
      'pin_code', case when l.id is not null then v.pin_code else null end
    ) order by coalesce(l.is_featured, false) desc,
               coalesce(l.created_at, v.created_at) desc)
    from vehicles v
    left join listings l
      on l.vehicle_plate = v.plate_number and l.status = 'active'
    -- ⚠ `or l.id is not null`: aktif bir vitrin kaydı ÜCRETLİ ve bilinçli
    -- bir yayın kararı. Kullanıcı görünürlüğü kapatsa bile parasını ödediği
    -- vitrin kaydı sessizce kaybolmamalı; arayüz bu çelişkiyi kapatmayı
    -- teklif ediyor.
    where v.gorunurluk = 'listelenebilir' or l.id is not null
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.arac_arama() from public;
grant execute on function public.arac_arama() to anon, authenticated;
