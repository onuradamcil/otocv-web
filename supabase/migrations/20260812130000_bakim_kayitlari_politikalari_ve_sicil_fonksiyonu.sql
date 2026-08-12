-- =========================================================================
-- B ADIMI · maintenance_records POLİTİKALARI + GENEL SİCİL FONKSİYONU
--
-- DİKKAT · SIRA: Bu migration RLS'i AÇMAZ. Açma işi ayrı ve EN SON
-- migration'da (20260812140000). RLS önce açılırsa karne boş görünür,
-- çünkü genel okuma yolu ve istemci değişiklikleri henüz devrede olmaz.
--
-- ÖN KOŞUL: 20260812125000 (invoice_url -> invoice_path) bundan ÖNCE
-- uygulanmalı; aşağıdaki fonksiyon o kolonu okuyor.
--
-- -------------------------------------------------------------------------
-- SORUN
-- -------------------------------------------------------------------------
-- Tabloda `"Herkes bakım ekleyebilir"` politikası TANIMLI ama RLS kapalı
-- olduğu için hiç değerlendirilmiyor. Anon anahtarı istemci paketinin
-- içinde — pratikte herkese açık. Sonuç: anon anahtarıyla herkes her aracın
-- bakım kaydını okuyabiliyor, değiştirebiliyor, silebiliyor.
--
-- Tablo `vehicle_plate` taşıyor. Herkese açık SELECT ile tek istek
-- sistemdeki BÜTÜN plakaları döndürür — plakayı URL'lerden ve ziyaretçi
-- arayüzünden KVKK gerekçesiyle kaldırma çabasını boşa çıkarır.
--
-- -------------------------------------------------------------------------
-- ÇÖZÜMÜN ŞEKLİ
-- -------------------------------------------------------------------------
-- RLS, anon anahtarıyla DOĞRUDAN tablo erişimini denetler. Karne sayfasının
-- ne gösterebileceğini denetlemek zorunda değil:
--
--   doğrudan tablo erişimi  ->  yalnızca araç sahibi (politikalar)
--   genel okuma             ->  sicil_getir(pin) fonksiyonu
--
-- Fonksiyon `security definer` olduğu için RLS onu engellemez, ama YALNIZCA
-- verilen PIN'in kaydını döndürebilir. Toplu çekme imkânsız: istek başına
-- bir PIN, dizi ya da desen kabul edilmiyor.
--
-- Vitrin ETKİLENMEZ (doğrulandı): MarketplaceView bu tabloya hiç dokunmuyor,
-- `listings` tablosundan okuyor. Bakım kaydını okuyan yalnızca iki yer var
-- (araç detayı, karne) ve ikisi de PIN ile açılıyor; ziyaretçi PIN'i zaten
-- sayfanın kendisinden alıyor.
--
-- -------------------------------------------------------------------------
-- NEDEN GENİŞ TABLO DEĞİL, TEK jsonb DÖNÜYOR
-- -------------------------------------------------------------------------
-- İlk yazımda `returns table (km integer, tramer_amount numeric, ...)`
-- şeklinde kolon kolon tip ilan etmiştim. Bu kırılgan: ilan edilen tip
-- gerçek kolon tipiyle birebir uyuşmazsa fonksiyon ÇALIŞMA ANINDA patlar
-- ve hata mesajı da yanıltıcı olur. Üstelik `vehicles` tablosuna bir kolon
-- eklendiğinde fonksiyon imzasını da güncellemek gerekir.
--
-- Tek `jsonb` dönerek bu hata sınıfını tamamen ortadan kaldırıyoruz.
-- Sözleşme yine net: aşağıdaki yapı garanti ediliyor.
--
--   {
--     "arac":            { ...künye alanları..., "sahip_mi": bool,
--                          "plate_number": sahibine dolu / ziyaretçide null },
--     "bakim_kayitlari": [ { ..., "invoice_path": sahibine dolu / null,
--                            "faturali": bool } ]
--   }
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) DOĞRUDAN ERİŞİM POLİTİKALARI — yalnızca araç sahibi
--
-- Eski açık politika kaldırılıyor: adı "Herkes bakım ekleyebilir" ve RLS
-- açıldığı anda gerçekten herkese yazma izni verirdi.
-- -------------------------------------------------------------------------
drop policy if exists "Herkes bakım ekleyebilir" on public.maintenance_records;

-- Sahiplik kontrolü tek yerde. Politikalarda tekrar eden alt sorgu yazmak,
-- birini güncelleyip diğerini atlamaya davetiye olur.
create or replace function public.arac_sahibi_mi(p_plaka text)
returns boolean
language sql
stable
security invoker            -- çağıranın yetkisiyle çalışır, yetki yükseltmez
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.vehicles v
    where v.plate_number = p_plaka
      and v.user_id = auth.uid()
  );
$$;

comment on function public.arac_sahibi_mi(text) is
  'Oturumdaki kullanıcı bu plakanın sahibi mi? maintenance_records politikaları bunu kullanır.';

drop policy if exists "bakim_oku_sahip" on public.maintenance_records;
create policy "bakim_oku_sahip" on public.maintenance_records
  for select to authenticated using (public.arac_sahibi_mi(vehicle_plate));

drop policy if exists "bakim_ekle_sahip" on public.maintenance_records;
create policy "bakim_ekle_sahip" on public.maintenance_records
  for insert to authenticated with check (public.arac_sahibi_mi(vehicle_plate));

drop policy if exists "bakim_guncelle_sahip" on public.maintenance_records;
create policy "bakim_guncelle_sahip" on public.maintenance_records
  for update to authenticated
  using (public.arac_sahibi_mi(vehicle_plate))
  with check (public.arac_sahibi_mi(vehicle_plate));

drop policy if exists "bakim_sil_sahip" on public.maintenance_records;
create policy "bakim_sil_sahip" on public.maintenance_records
  for delete to authenticated using (public.arac_sahibi_mi(vehicle_plate));

-- -------------------------------------------------------------------------
-- 2) GENEL SİCİL FONKSİYONU
--
-- GÜVENLİK KONTROL LİSTESİ — `security definer` dikkatli yazılmazsa kendisi
-- bir açık olur. Uygulananlar:
--
--   · set search_path = public, pg_temp
--     Şema kaçırma saldırısını engeller. Bu satır olmadan saldırgan kendi
--     şemasında sahte bir `vehicles` tanımlayıp fonksiyonu ona
--     yönlendirebilir.
--   · girdi doğrulama
--     PIN biçimi denetlenir; biçimsiz girdi hiç sorguya girmez. Desen ve
--     joker karakter kabul edilmez.
--   · yalnızca gereken alanlar
--     jsonb elle kuruluyor, `to_jsonb(v)` KULLANILMIYOR — o, tabloya
--     ileride eklenecek hassas bir kolonu sessizce dışarı sızdırırdı.
--   · plaka yalnızca sahibine
--   · fatura yolu yalnızca sahibine
--     Ziyaretçi yolu bilmediği için imzalı bağlantı da isteyemez.
--   · tek PIN, tek araç
--   · execute yetkisi açıkça veriliyor
-- -------------------------------------------------------------------------
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

  select * into v_arac
  from public.vehicles v
  where v.pin_code ilike btrim(p_pin)
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
  'PIN ile TEK aracın sicilini jsonb olarak döndürür. Genel okuma yolu budur; tabloya doğrudan erişim yalnızca araç sahibine açıktır. Ziyaretçiye plaka ve fatura yolu döndürmez.';

-- Koruma fonksiyonun İÇİNDE olduğu için çağrı herkese açık.
revoke all on function public.sicil_getir(text) from public;
grant execute on function public.sicil_getir(text) to anon, authenticated;
