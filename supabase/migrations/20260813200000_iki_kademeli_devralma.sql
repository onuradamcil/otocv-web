-- =========================================================================
-- İKİ KADEMELİ DEVRALMA — elle onay ölçeklenmiyordu
--
-- İlk kurulumda sahipsiz araç devralma tek yoldan geçiyordu: ruhsat yükle,
-- biri elle incelesin, onaylasın. Kullanıcının itirazı yerindeydi:
-- "binlerce devir olsa bunu tek tek onaylamak insan gücünü geçiyor."
--
-- Önce bir ayrım: NORMAL DEVİR ZATEN İNSANSIZ. Satıcı kendi garajından kod
-- üretiyor ya da talebi onaylıyor; binlerce devir o yoldan geçiyor ve bize iş
-- düşmüyor. Sahipsiz geri yükleme ise istisna yolu — yalnızca sahibi hesabını
-- kapatmış VE aracı başkasının elinde olan durumda oluşuyor.
--
-- -------------------------------------------------------------------------
-- OTOMATİK ONAYIN GERÇEK RİSKİ ÖDEME DEĞİL, VERİ
-- -------------------------------------------------------------------------
-- Plakayı bilen biri ödeyip bir yabancının aracını devralırsa, aldığı şey
-- yalnızca bakım kayıtları olmuyor: ESKİ SAHİBİN ADI VE ADRESİ YAZILI FATURA
-- GÖRSELLERİ de geliyor. Beyan metni ve bekleme süresi bunu engellemez.
--
-- Doğrulayacak bir gerçeğimiz de yok: elimizde şasi numarası, ruhsat seri
-- numarası ya da resmî bir kayıt bulunmuyor — yalnızca önceki sahibin yazdığı
-- marka/model/km. Yani "sahibi olduğunu bilgiyle kanıtla" testi kurulamıyor.
--
-- -------------------------------------------------------------------------
-- ÇÖZÜM: ZARARI ONAYI ZORLAŞTIRARAK DEĞİL, VERİYİ AYIRARAK KALDIRMAK
-- -------------------------------------------------------------------------
--                        OTOMATİK              BELGELİ
--   Koşul                ödeme+beyan+7 gün     ruhsat + elle inceleme
--   Bakım kayıtları      açılır                açılır
--   Fatura GÖRSELLERİ    KAPALI KALIR          açılır
--   İnsan gücü           sıfır                 yalnızca bu yolda
--
-- Otomatik yol kötüye kullanılsa bile ele geçen şey ARABAYA AİT VERİ oluyor;
-- kişisel veri aktarılmıyor. Kişisel veri isteyen ruhsatını gösteriyor ve o
-- yolu seçenlerin sayısı doğal olarak küçük kalıyor.
--
-- SİCİL PUANI DÜŞMÜYOR, bilerek: puan ARACIN belgelenme düzeyini anlatıyor ve
-- o değişmedi. Değişen şey belgeleri kimin görebildiği. Karne bunu saklamıyor,
-- açıkça söylüyor: kayıt "belgeli" görünmeye devam ediyor ve sahibine
-- `belgeler_kisitli` işareti gidiyor.
--
-- BELGE KİSİTİNİ KALDIRMAK ÜCRETSİZ. Kısıt bir paywall değil, önceki sahibin
-- kişisel verisini koruyan güvenlik önlemi; ikinci kez ücret almak gizlilik
-- önlemini gelir kaldıracına çevirmek olurdu.
--
-- ASIL ÖLÇEKLEME: sahipsiz araç hiç oluşmasın. Hesap kapatma akışına
-- "araçlarınızı devretmek ister misiniz?" adımı eklenecek (arayüz işi).
--
-- -------------------------------------------------------------------------
-- NOT: fonksiyon gövdeleri canlı veritabanına UYGULANAN metnin kendisidir.
-- Gövde içi yorumlar bu yüzden ASCII. Bu turda tam olarak bu kuralı bir kez
-- ihlal ettim — `sicil_getir`'i dosyaya yazıp uygulamayı atladım ve kusur
-- ancak uçtan uca testte ortaya çıktı.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1 · ŞEMA: belge kısıtı, talep yolu ve beyan
-- -------------------------------------------------------------------------
alter table public.vehicles
  add column if not exists belge_erisimi_kisitli boolean not null default false;

comment on column public.vehicles.belge_erisimi_kisitli is
  'true = aracın sahibi fatura görsellerini göremiyor. Sahipsiz havuzdan OTOMATİK yolla (belge doğrulaması olmadan) devralınan araçlarda kuruluyor. Bakım kayıtları açık; kapalı olan yalnızca kişisel veri taşıyan belgeler.';

alter table public.sahipsiz_talepleri
  add column if not exists yol text not null default 'belgeli';

alter table public.sahipsiz_talepleri
  drop constraint if exists sahipsiz_talep_yol_check;
alter table public.sahipsiz_talepleri
  add constraint sahipsiz_talep_yol_check check (yol in ('otomatik','belgeli'));

alter table public.sahipsiz_talepleri
  add column if not exists beyan_metni text;

-- Ruhsat artık YALNIZCA belgeli yolda zorunlu.
alter table public.sahipsiz_talepleri
  alter column ruhsat_yolu drop not null;

alter table public.sahipsiz_talepleri
  drop constraint if exists sahipsiz_talep_yol_tutarli;
alter table public.sahipsiz_talepleri
  add constraint sahipsiz_talep_yol_tutarli check (
    (yol = 'belgeli'  and ruhsat_yolu is not null) or
    (yol = 'otomatik' and beyan_metni is not null)
  );

comment on column public.sahipsiz_talepleri.beyan_metni is
  'Otomatik yolda kullanıcının onayladığı beyan. AYNEN saklanıyor: metin ileride değişse de hangi beyanın onaylandığı kanıt olarak duruyor — devir rıza metniyle aynı kalıp.';

-- -------------------------------------------------------------------------
-- 2 · FATURA STORAGE POLİTİKASI — kısıtlı araçta kapalı
--
-- Politika `exists (select 1 from vehicles ...)` diyor ve o alt sorgu
-- çağıranın RLS'ine tabi, yani yalnızca kendi aracını görüyor. Koşula kısıt
-- kontrolü ekleniyor: kısıtlıysa eşleşme olmuyor, dosya açılmıyor.
--
-- Gerçek dosyayla ölçüldü: aynı dosya, aynı kullanıcı, tek fark bu bayrak —
-- kapalıyken indiriliyor, açıkken imzalı bağlantı, listeleme ve doğrudan
-- indirme üçü de engelleniyor.
-- -------------------------------------------------------------------------
drop policy if exists "fatura_oku_arac_sahibi" on storage.objects;
create policy "fatura_oku_arac_sahibi" on storage.objects
  for select
  using (
    bucket_id = 'vehicle-invoices'
    and exists (
      select 1 from public.vehicles v
      where v.storage_key::text = (storage.foldername(objects.name))[1]
        and not coalesce(v.belge_erisimi_kisitli, false)
    )
  );


-- -------------------------------------------------------------------------
-- 3 · TALEP AÇMA — iki yol
-- -------------------------------------------------------------------------
drop function if exists public.sahipsiz_talep_et(text, text);

create or replace function public.sahipsiz_talep_et(
  p_plaka       text,
  p_yol         text,
  p_ruhsat_yolu text default null,
  p_beyan_metni text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid    uuid := auth.uid();
  v_temiz  text;
  v_arac   public.vehicles;
  v_gunluk integer;
  v_id     bigint;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  if p_yol not in ('otomatik','belgeli') then
    return jsonb_build_object('hata','bilinmeyen_yol');
  end if;

  -- Belgeli yolda ruhsat, otomatik yolda beyan ZORUNLU.
  if p_yol = 'belgeli' and (p_ruhsat_yolu is null or btrim(p_ruhsat_yolu) = '') then
    return jsonb_build_object('hata','ruhsat_gerekli');
  end if;
  if p_yol = 'otomatik' and (p_beyan_metni is null or btrim(p_beyan_metni) = '') then
    return jsonb_build_object('hata','beyan_gerekli');
  end if;

  v_temiz := regexp_replace(upper(coalesce(p_plaka,'')), '[^A-Z0-9]', '', 'g');
  select * into v_arac from public.vehicles v
  where regexp_replace(upper(v.plate_number), '[^A-Z0-9]', '', 'g') = v_temiz
  limit 1;

  if not found then
    return jsonb_build_object('hata','arac_yok');
  end if;
  if v_arac.sahipsiz_kaldi_at is null then
    return jsonb_build_object('hata','arac_sahipsiz_degil');
  end if;

  select count(distinct vehicle_plate) into v_gunluk
  from public.sahipsiz_talepleri
  where isteyen_user_id = v_uid and olustu > now() - interval '24 hours';
  if v_gunluk >= 3 then
    return jsonb_build_object('hata','gunluk_sinir','yeniden_dene_saniye', 86400);
  end if;

  if exists (
    select 1 from public.sahipsiz_talepleri
    where vehicle_plate = v_arac.plate_number and durum = 'bekliyor'
  ) then
    return jsonb_build_object('hata','zaten_bekleyen_talep');
  end if;

  if exists (
    select 1 from public.sahipsiz_talepleri
    where vehicle_plate = v_arac.plate_number and isteyen_user_id = v_uid
      and durum = 'reddedildi' and karar_at > now() - interval '7 days'
  ) then
    return jsonb_build_object('hata','ret_bekleme_suresi');
  end if;

  insert into public.sahipsiz_talepleri
    (vehicle_plate, isteyen_user_id, yol, ruhsat_yolu, beyan_metni)
  values
    (v_arac.plate_number, v_uid, p_yol,
     nullif(btrim(coalesce(p_ruhsat_yolu,'')), ''),
     nullif(btrim(coalesce(p_beyan_metni,'')), ''))
  returning id into v_id;

  return jsonb_build_object(
    'basarili', true, 'istek_id', v_id, 'plaka', v_arac.plate_number,
    'yol', p_yol, 'durum', 'bekliyor',
    'tamamlanabilir_at', case when p_yol = 'otomatik' then now() + interval '7 days' else null end
  );
end;
$$;


-- -------------------------------------------------------------------------
-- 4 · OTOMATİK YOLDA GERİ YÜKLEME — kullanıcının kendisi tamamlıyor
--
-- Zamanlanmış iş (pg_cron) yok ve kurmuyoruz: kullanıcı bekleme süresi
-- dolunca geri gelip tamamlıyor. Böylece "arkada bir şey oldu" değil,
-- kullanıcının gördüğü ve onayladığı bir işlem oluyor.
-- -------------------------------------------------------------------------
create or replace function public.sahipsiz_otomatik_tamamla(p_istek_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid      uuid := auth.uid();
  v_talep    public.sahipsiz_talepleri;
  v_satin_id bigint;
  v_sonuc    jsonb;
  v_arac     public.vehicles;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  select * into v_talep from public.sahipsiz_talepleri
  where id = p_istek_id and isteyen_user_id = v_uid;

  if not found then
    return jsonb_build_object('hata','istek_yok');
  end if;
  if v_talep.yol <> 'otomatik' then
    return jsonb_build_object('hata','belgeli_yol');
  end if;
  if v_talep.durum <> 'bekliyor' then
    return jsonb_build_object('hata','istek_yok','durum',v_talep.durum);
  end if;

  -- KAPI 1: bekleme suresi.
  if v_talep.olustu + interval '7 days' > now() then
    return jsonb_build_object(
      'hata','bekleme_suresi',
      'tamamlanabilir_at', v_talep.olustu + interval '7 days'
    );
  end if;

  -- KAPI 2: odeme. Harcanmamis satin alma TUKETILIYOR.
  select id into v_satin_id
  from public.satin_almalar
  where user_id = v_uid and urun_kodu = 'sicil_geri_yukleme'
    and durum = 'tamamlandi' and hedef_plaka is null
  order by olustu
  limit 1
  for update skip locked;

  if v_satin_id is null then
    return jsonb_build_object('hata','odeme_bekliyor');
  end if;

  v_sonuc := public._devri_uygula(
    v_talep.vehicle_plate,
    v_uid,
    jsonb_build_object(
      'kaynak',        'sahipsiz_havuz',
      'yol',           'otomatik',
      'istek_id',      v_talep.id,
      'beyan_metni',   v_talep.beyan_metni,
      'satin_alma_id', v_satin_id,
      'belge_kisiti',  true
    ),
    true
  );

  if v_sonuc ? 'hata' then
    return v_sonuc;
  end if;

  update public.satin_almalar
  set hedef_plaka = v_talep.vehicle_plate
  where id = v_satin_id;

  -- BELGE KISITI. Bakim kayitlari geldi, fatura gorselleri gelmedi.
  update public.vehicles
  set belge_erisimi_kisitli = true
  where plate_number = v_talep.vehicle_plate;

  update public.sahipsiz_talepleri
  set durum = 'onaylandi', karar_at = now(),
      karar_notu = 'Otomatik yol: beyan + ödeme + bekleme süresi'
  where id = v_talep.id;

  select * into v_arac from public.vehicles where plate_number = v_talep.vehicle_plate;

  perform public._bildirim_yaz(
    v_uid,
    'Araç sicili devralındı: ' || v_talep.vehicle_plate,
    coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') || ' (' ||
    v_talep.vehicle_plate || ') aracı ve geçmiş servis kayıtları garajınıza ' ||
    'eklendi. Fatura belgeleri önceki sahibin kişisel bilgilerini taşıdığı için ' ||
    'kapalıdır; ruhsatınızı doğrulatarak bunları da açabilirsiniz.',
    'success'
  );

  return v_sonuc || jsonb_build_object('belge_erisimi_kisitli', true);
end;
$$;


-- -------------------------------------------------------------------------
-- 5 · BELGELİ YOL — elle onay sonrası, belgeler AÇIK
-- -------------------------------------------------------------------------
create or replace function public.sahipsiz_geri_yukle(p_istek_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_talep  public.sahipsiz_talepleri;
  v_sonuc  jsonb;
  v_arac   public.vehicles;
begin
  select * into v_talep from public.sahipsiz_talepleri where id = p_istek_id;
  if not found then
    return jsonb_build_object('hata','istek_yok');
  end if;

  if v_talep.durum <> 'onaylandi' then
    return jsonb_build_object('hata','onay_bekliyor','durum',v_talep.durum);
  end if;

  if v_talep.odendi_at is null then
    return jsonb_build_object('hata','odeme_bekliyor');
  end if;

  select * into v_arac from public.vehicles where plate_number = v_talep.vehicle_plate;

  -- Arac zaten bu kisideyse (otomatik yolla devralmis, simdi ruhsatini
  -- dogrulatiyor) yeniden devretmiyoruz: yalnizca belge kisiti kalkiyor.
  if v_arac.user_id = v_talep.isteyen_user_id then
    update public.vehicles
    set belge_erisimi_kisitli = false
    where plate_number = v_talep.vehicle_plate;

    perform public._bildirim_yaz(
      v_talep.isteyen_user_id,
      'Belgeleriniz açıldı: ' || v_talep.vehicle_plate,
      'Ruhsatınız doğrulandı. ' || v_talep.vehicle_plate ||
      ' aracının fatura belgeleri artık görüntülenebilir.',
      'success'
    );

    return jsonb_build_object(
      'basarili', true, 'plaka', v_talep.vehicle_plate,
      'islem', 'belge_kisiti_kaldirildi'
    );
  end if;

  v_sonuc := public._devri_uygula(
    v_talep.vehicle_plate,
    v_talep.isteyen_user_id,
    jsonb_build_object(
      'kaynak',    'sahipsiz_havuz',
      'yol',       'belgeli',
      'istek_id',  v_talep.id,
      'ruhsat',    v_talep.ruhsat_yolu,
      'karar_at',  v_talep.karar_at,
      'odendi_at', v_talep.odendi_at,
      'odeme_referansi', v_talep.odeme_referansi
    ),
    true
  );

  if v_sonuc ? 'hata' then
    return v_sonuc;
  end if;

  update public.vehicles
  set belge_erisimi_kisitli = false
  where plate_number = v_talep.vehicle_plate;

  select * into v_arac from public.vehicles where plate_number = v_talep.vehicle_plate;

  perform public._bildirim_yaz(
    v_talep.isteyen_user_id,
    'Araç sicili devralındı: ' || v_talep.vehicle_plate,
    coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') || ' (' ||
    v_talep.vehicle_plate || ') aracı, geçmiş servis kayıtları ve fatura ' ||
    'belgeleri garajınıza eklendi. Aracın karne bağlantısı yenilendi.',
    'success'
  );

  return v_sonuc;
end;
$$;


-- -------------------------------------------------------------------------
-- 6 · ÖN İZLEME — yol bilgisi ve bekleme süresi
-- -------------------------------------------------------------------------
create or replace function public.sahipsiz_onizleme(p_plaka text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid      uuid := auth.uid();
  v_temiz    text;
  v_arac     public.vehicles;
  v_kayit    integer;
  v_faturali integer;
  v_talep    public.sahipsiz_talepleri;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  v_temiz := regexp_replace(upper(coalesce(p_plaka,'')), '[^A-Z0-9]', '', 'g');
  select * into v_arac from public.vehicles v
  where regexp_replace(upper(v.plate_number), '[^A-Z0-9]', '', 'g') = v_temiz
  limit 1;

  if not found then
    return jsonb_build_object('hata','arac_yok');
  end if;
  if v_arac.sahipsiz_kaldi_at is null then
    return jsonb_build_object('hata','arac_sahipsiz_degil');
  end if;

  select count(*), count(*) filter (where invoice_path is not null)
    into v_kayit, v_faturali
  from public.maintenance_records where vehicle_plate = v_arac.plate_number;

  select * into v_talep from public.sahipsiz_talepleri
  where vehicle_plate = v_arac.plate_number and isteyen_user_id = v_uid
  order by olustu desc limit 1;

  return jsonb_build_object(
    'plaka',       v_arac.plate_number,
    'marka',       v_arac.brand,
    'model',       v_arac.model,
    'yil',         v_arac.year,
    'kayit',       v_kayit,
    'faturali',    v_faturali,
    'sicil_puani', v_arac.trust_score,
    'sahipsiz_kaldi_at', v_arac.sahipsiz_kaldi_at,
    'talebim', case when v_talep.id is null then null else jsonb_build_object(
      'id', v_talep.id, 'durum', v_talep.durum, 'yol', v_talep.yol,
      'odendi', (v_talep.odendi_at is not null), 'olustu', v_talep.olustu,
      'tamamlanabilir_at', case when v_talep.yol = 'otomatik'
                                then v_talep.olustu + interval '7 days' else null end,
      'bekleme_bitti', (v_talep.olustu + interval '7 days' <= now())
    ) end
  );
end;
$$;


-- -------------------------------------------------------------------------
-- 7 · KARNE — kilitli belgeleri SAKLAMIYOR
--
-- Değişen tek yer: sahibe `invoice_path` verilirken belge kısıtı denetleniyor
-- ve dönüşe `belgeler_kisitli` işareti ekleniyor. Kayıt "belgeli" görünmeye
-- devam ediyor çünkü GERÇEKTEN belgeli — değişen şey kimin görebildiği.
-- -------------------------------------------------------------------------
create or replace function public.sicil_getir(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_arac      public.vehicles;
  v_sahip_mi  boolean;
  v_kayitlar  jsonb;
  v_ip        text;
  v_bekle     integer;
  v_bulundu   boolean := false;
  v_kayit     integer;
  v_faturali  integer;
  v_kisitli   boolean;
begin
  if p_pin is null or btrim(p_pin) = '' then return null; end if;
  if btrim(p_pin) !~ '^[A-Za-z0-9-]{3,16}$' then return null; end if;

  v_ip := public.istemci_ip();

  v_bekle := public.sicil_hiz_siniri_asildi_mi(v_ip);
  if v_bekle > 0 then
    return jsonb_build_object(
      'hata', 'cok_fazla_deneme',
      'yeniden_dene_saniye', v_bekle
    );
  end if;

  select * into v_arac from public.vehicles v
  where upper(v.pin_code) = upper(btrim(p_pin)) limit 1;

  v_bulundu := found;

  if v_ip is not null then
    insert into public.sicil_sorgu_log (ip, sorgulanan, bulundu)
    values (v_ip, left(btrim(p_pin), 16), v_bulundu);

    if random() < 0.01 then
      delete from public.sicil_sorgu_log where olustu < now() - interval '1 hour';
    end if;
  end if;

  if not v_bulundu then return null; end if;

  if v_arac.sahipsiz_kaldi_at is not null then
    select count(*), count(*) filter (where invoice_path is not null)
      into v_kayit, v_faturali
    from public.maintenance_records m where m.vehicle_plate = v_arac.plate_number;

    return jsonb_build_object(
      'hata', 'sahipsiz',
      'ozet', jsonb_build_object(
        'marka', v_arac.brand, 'model', v_arac.model, 'yil', v_arac.year,
        'kayit', v_kayit, 'faturali', v_faturali,
        'sicil_puani', v_arac.trust_score,
        'sahipsiz_kaldi_at', v_arac.sahipsiz_kaldi_at
      )
    );
  end if;

  v_sahip_mi := (auth.uid() is not null and auth.uid() = v_arac.user_id);
  v_kisitli  := coalesce(v_arac.belge_erisimi_kisitli, false);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id, 'service_type', m.service_type, 'shop_name', m.shop_name,
           'summary', m.summary, 'service_date', m.service_date,
           'km_at_service', m.km_at_service, 'cost', m.cost,
           'next_service_km', m.next_service_km,
           -- Kisitli aracta sahibe bile yol verilmiyor: dosya storage
           -- politikasinda da kapali, burada vermek bos imzali baglanti
           -- uretmekten baska ise yaramazdi.
           'invoice_path', case when v_sahip_mi and not v_kisitli then m.invoice_path else null end,
           'faturali', (m.invoice_path is not null)
         ) order by m.service_date desc nulls last), '[]'::jsonb)
    into v_kayitlar
  from public.maintenance_records m
  where m.vehicle_plate = v_arac.plate_number;

  return jsonb_build_object(
    'arac', jsonb_build_object(
      'pin_code', v_arac.pin_code, 'brand', v_arac.brand, 'model', v_arac.model,
      'series', v_arac.series, 'package', v_arac.package, 'year', v_arac.year,
      'km', v_arac.km, 'fuel_type', v_arac.fuel_type,
      'transmission', v_arac.transmission, 'color', v_arac.color,
      'body_type', v_arac.body_type, 'engine_capacity', v_arac.engine_capacity,
      'tramer_status', v_arac.tramer_status, 'tramer_amount', v_arac.tramer_amount,
      'trust_score', v_arac.trust_score, 'trust_breakdown', v_arac.trust_breakdown,
      'traffic_insurance_end_date', v_arac.traffic_insurance_end_date,
      'kasko_end_date', v_arac.kasko_end_date,
      'inspection_end_date', v_arac.inspection_end_date,
      'image_url', v_arac.image_url, 'city', v_arac.city, 'district', v_arac.district,
      'title', v_arac.title, 'description', v_arac.description,
      'damage_report', v_arac.damage_report, 'selected_features', v_arac.selected_features,
      'created_at', v_arac.created_at,
      'sahip_mi', v_sahip_mi,
      -- Kisit yalnizca SAHIBINE bildiriliyor. Ziyaretciye soylemek, aracin
      -- nasil devralindigi hakkinda gereksiz bilgi vermek olurdu.
      'belgeler_kisitli', (v_sahip_mi and v_kisitli),
      'plate_number', case when v_sahip_mi then v_arac.plate_number else null end
    ),
    'bakim_kayitlari', v_kayitlar
  );
end;
$$;


-- -------------------------------------------------------------------------
-- 8 · BELGE KİSİTİNİ KALDIRMA YOLU
--
-- Otomatik yolla devralan kişi aracı artık SAHİPLENDİ, yani
-- `sahipsiz_talep_et` ona kapalı ("arac_sahipsiz_degil"). Belgelerini
-- açabilmesi için ayrı bir giriş gerekiyordu; bu boşluk uçtan uca test
-- edilirken fark edildi.
--
-- ⚠ BU İŞLEM ÜCRETSİZ, bilerek. Kısıt bir paywall değil, önceki sahibin
-- kişisel verisini koruyan güvenlik önlemi. Kullanıcı sicil geri yükleme
-- ücretini zaten ödedi; kendi aracının belgelerini görebilmek için ikinci kez
-- ücret almak, gizlilik önlemini gelir kaldıracına çevirmek olurdu.
-- -------------------------------------------------------------------------
create or replace function public.belge_kisiti_talep_et(p_plaka text, p_ruhsat_yolu text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid   uuid := auth.uid();
  v_temiz text;
  v_arac  public.vehicles;
  v_id    bigint;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  if p_ruhsat_yolu is null or btrim(p_ruhsat_yolu) = '' then
    return jsonb_build_object('hata','ruhsat_gerekli');
  end if;

  v_temiz := regexp_replace(upper(coalesce(p_plaka,'')), '[^A-Z0-9]', '', 'g');
  select * into v_arac from public.vehicles v
  where regexp_replace(upper(v.plate_number), '[^A-Z0-9]', '', 'g') = v_temiz
  limit 1;

  if not found then
    return jsonb_build_object('hata','arac_yok');
  end if;
  if v_arac.user_id is distinct from v_uid then
    return jsonb_build_object('hata','sahip_degil');
  end if;
  if not coalesce(v_arac.belge_erisimi_kisitli, false) then
    return jsonb_build_object('hata','kisit_yok');
  end if;

  if exists (
    select 1 from public.sahipsiz_talepleri
    where vehicle_plate = v_arac.plate_number and durum = 'bekliyor'
  ) then
    return jsonb_build_object('hata','zaten_bekleyen_talep');
  end if;

  insert into public.sahipsiz_talepleri
    (vehicle_plate, isteyen_user_id, yol, ruhsat_yolu)
  values
    (v_arac.plate_number, v_uid, 'belgeli', btrim(p_ruhsat_yolu))
  returning id into v_id;

  return jsonb_build_object(
    'basarili', true, 'istek_id', v_id, 'plaka', v_arac.plate_number,
    'durum', 'bekliyor'
  );
end;
$$;


-- BELGE KISITINI KALDIR — elle onay sonrasi, UCRET YOK.
-- `sahipsiz_geri_yukle` devir icin; bu yalnizca kisiti kaldiriyor. Ikisini
-- ayirmak, odeme kapisinin yanlis yere uygulanmasini onluyor.
create or replace function public.belge_kisiti_kaldir(p_istek_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_talep public.sahipsiz_talepleri;
  v_arac  public.vehicles;
begin
  select * into v_talep from public.sahipsiz_talepleri where id = p_istek_id;
  if not found then
    return jsonb_build_object('hata','istek_yok');
  end if;
  if v_talep.durum <> 'onaylandi' then
    return jsonb_build_object('hata','onay_bekliyor','durum',v_talep.durum);
  end if;

  select * into v_arac from public.vehicles where plate_number = v_talep.vehicle_plate;
  if v_arac.user_id is distinct from v_talep.isteyen_user_id then
    return jsonb_build_object('hata','sahip_degismis');
  end if;

  update public.vehicles
  set belge_erisimi_kisitli = false
  where plate_number = v_talep.vehicle_plate;

  perform public._bildirim_yaz(
    v_talep.isteyen_user_id,
    'Belgeleriniz açıldı: ' || v_talep.vehicle_plate,
    'Ruhsatınız doğrulandı. ' || v_talep.vehicle_plate ||
    ' aracının fatura belgeleri artık görüntülenebilir.',
    'success'
  );

  return jsonb_build_object(
    'basarili', true, 'plaka', v_talep.vehicle_plate,
    'islem', 'belge_kisiti_kaldirildi'
  );
end;
$$;


-- -------------------------------------------------------------------------
-- 9 · YETKİLER
-- -------------------------------------------------------------------------
revoke all on function public.sahipsiz_talep_et(text, text, text, text)        from public;
revoke all on function public.sahipsiz_talep_et(text, text, text, text)        from anon;
grant execute on function public.sahipsiz_talep_et(text, text, text, text)     to authenticated;

-- Otomatik tamamlama KULLANICIYA AÇIK: kapılar (bekleme + ödeme) fonksiyonun
-- içinde ve talebin sahibi olma koşulu da denetleniyor.
revoke all on function public.sahipsiz_otomatik_tamamla(bigint)                from public;
revoke all on function public.sahipsiz_otomatik_tamamla(bigint)                from anon;
grant execute on function public.sahipsiz_otomatik_tamamla(bigint)             to authenticated;

revoke all on function public.belge_kisiti_talep_et(text, text)                from public;
revoke all on function public.belge_kisiti_talep_et(text, text)                from anon;
grant execute on function public.belge_kisiti_talep_et(text, text)             to authenticated;

-- Belgeli yol ve kısıt kaldırma yalnızca yönetim tarafında: ruhsatı inceleyen
-- taraf çalıştırıyor.
revoke all on function public.sahipsiz_geri_yukle(bigint)                      from public;
revoke all on function public.sahipsiz_geri_yukle(bigint)                      from anon, authenticated;
grant execute on function public.sahipsiz_geri_yukle(bigint)                   to service_role;

revoke all on function public.belge_kisiti_kaldir(bigint)                      from public;
revoke all on function public.belge_kisiti_kaldir(bigint)                      from anon, authenticated;
grant execute on function public.belge_kisiti_kaldir(bigint)                   to service_role;
