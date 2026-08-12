-- =========================================================================
-- D ADIMI · invoice_url DÜŞÜRÜLÜYOR + PIN ARAMASI İNDEKSE BAĞLANIYOR
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) invoice_url KOLONU DÜŞÜYOR
--
-- 20260812125000 bu kolonun "doğrulamadan SONRA" düşürüleceğini yazmıştı.
-- Doğrulama tamamlandı:
--
--   · 7 kaydın hepsinde `invoice_path` dolu ve imzalı bağlantı çalışıyor
--   · 7 eski public URL'nin hepsi önbellek atlatılarak denendi -> HTTP 400
--     (dosyalar public bucket'tan silinmiş, yani URL'ler ölü)
--   · sahipsiz kayıt (#12) silindi, başka kullanıcıya ait kayıt (#23) da
--     temizlendi; ikisinin dosyası da public bucket'tan kaldırıldı
--   · 62 test geçiyor, RLS açık
--
-- Kolon artık yalnızca ölü işaretçi tutuyor. Tutmaya devam etmenin bir
-- maliyeti var: her satırda plaka + bucket yolu içeren bir metin, hiçbir
-- şeye yaramıyor ve ileride birinin "burada bir URL var, kullanalım" deyip
-- kapanmış açığı geri açmasına davetiye.
-- -------------------------------------------------------------------------
alter table public.maintenance_records drop column if exists invoice_url;

-- -------------------------------------------------------------------------
-- 2) PIN ARAMASI ARTIK İNDEKS KULLANIYOR
--
-- SORUN: `sicil_getir` PIN'i şöyle arıyordu:
--
--   where v.pin_code ilike btrim(p_pin)
--
-- `ilike`, `vehicles_pin_code_key` btree indeksini KULLANAMAZ. Yani her
-- karne görüntülemesi tam tablo taraması yapıyordu. On araçta farkı yok;
-- yüz binlerce araçta her karne açılışı bütün tabloyu okur.
--
-- ÇÖZÜM: `upper(pin_code) = upper(btrim(p_pin))` + upper(pin_code) üzerinde
-- fonksiyonel indeks. Davranış BİREBİR aynı kalıyor (büyük/küçük harf
-- duyarsız eşleşme), ama artık indeksten gidiyor.
--
-- `ilike` yerine `=` kullanmanın ikinci bir faydası: `ilike` desen
-- karakterlerini (`%`, `_`) yorumlar. Fonksiyonun girdi doğrulaması bunları
-- zaten reddediyor, ama savunma tek katmana bağlı kalmasın — `=` hiçbir
-- koşulda desen olarak yorumlanmaz.
-- -------------------------------------------------------------------------
create unique index if not exists vehicles_pin_upper_idx
  on public.vehicles (upper(pin_code));

comment on index public.vehicles_pin_upper_idx is
  'sicil_getir() PIN aramasının kullandığı indeks. Fonksiyon upper(pin_code) = upper(girdi) karşılaştırıyor; bu indeks olmadan her karne görüntülemesi tam tablo taraması olur. UNIQUE: aynı PIN''in büyük/küçük harf varyantı iki araca verilemez.';

create or replace function public.sicil_getir(p_pin text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_arac      public.vehicles;
  v_sahip_mi  boolean;
  v_kayitlar  jsonb;
begin
  -- GİRDİ DOĞRULAMA. Biçimsiz girdi veritabanına hiç ulaşmaz.
  if p_pin is null or btrim(p_pin) = '' then
    return null;
  end if;
  if btrim(p_pin) !~ '^[A-Za-z0-9-]{3,16}$' then
    return null;
  end if;

  -- İndeksli, büyük/küçük harf duyarsız eşleşme. Eskiden `ilike` idi ve
  -- indeksi kullanamıyordu (bkz. yukarıdaki açıklama).
  select * into v_arac
  from public.vehicles v
  where upper(v.pin_code) = upper(btrim(p_pin))
  limit 1;

  if not found then
    return null;                    -- bulunamadı: boş sonuç, hata değil
  end if;

  v_sahip_mi := (auth.uid() is not null and auth.uid() = v_arac.user_id);

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id',              m.id,
               'service_type',    m.service_type,
               'shop_name',       m.shop_name,
               'summary',         m.summary,
               'service_date',    m.service_date,
               'km_at_service',   m.km_at_service,
               'cost',            m.cost,
               'next_service_km', m.next_service_km,
               -- Fatura yolu YALNIZCA sahibine.
               'invoice_path',    case when v_sahip_mi then m.invoice_path else null end,
               -- Ziyaretçi faturanın VARLIĞINI görebilir: kaydın belgeli
               -- olup olmadığı karnede gösteriliyor ve bu bilgi görseli
               -- açığa çıkarmıyor.
               'faturali',        (m.invoice_path is not null)
             )
             order by m.service_date desc nulls last
           ),
           '[]'::jsonb
         )
  into v_kayitlar
  from public.maintenance_records m
  where m.vehicle_plate = v_arac.plate_number;

  return jsonb_build_object(
    'arac', jsonb_build_object(
      'pin_code',                   v_arac.pin_code,
      'brand',                      v_arac.brand,
      'model',                      v_arac.model,
      'series',                     v_arac.series,
      'package',                    v_arac.package,
      'year',                       v_arac.year,
      'km',                         v_arac.km,
      'fuel_type',                  v_arac.fuel_type,
      'transmission',               v_arac.transmission,
      'color',                      v_arac.color,
      'body_type',                  v_arac.body_type,
      'tramer_status',              v_arac.tramer_status,
      'tramer_amount',              v_arac.tramer_amount,
      'trust_score',                v_arac.trust_score,
      'traffic_insurance_end_date', v_arac.traffic_insurance_end_date,
      'kasko_end_date',             v_arac.kasko_end_date,
      'inspection_end_date',        v_arac.inspection_end_date,
      'image_url',                  v_arac.image_url,
      'city',                       v_arac.city,
      'district',                   v_arac.district,
      'title',                      v_arac.title,
      'description',                v_arac.description,
      'damage_report',              v_arac.damage_report,
      'selected_features',          v_arac.selected_features,
      'created_at',                 v_arac.created_at,
      'sahip_mi',                   v_sahip_mi,
      -- KVKK: plaka kişisel veri. Ziyaretçide null.
      'plate_number',               case when v_sahip_mi then v_arac.plate_number else null end
    ),
    'bakim_kayitlari', v_kayitlar
  );
end;
$$;

comment on function public.sicil_getir(text) is
  'PIN ile TEK aracın sicilini jsonb olarak döndürür. Genel okuma yolu budur; tabloya doğrudan erişim yalnızca araç sahibine açıktır. Ziyaretçiye plaka ve fatura yolu döndürmez. PIN aramasi vehicles_pin_upper_idx indeksini kullanir.';

revoke all on function public.sicil_getir(text) from public;
grant execute on function public.sicil_getir(text) to anon, authenticated;
