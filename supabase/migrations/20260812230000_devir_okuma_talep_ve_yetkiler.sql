-- =========================================================================
-- ARAÇ DEVRİ · OKUMA FONKSİYONLARI, TALEP AKIŞI VE YETKİ TEMİZLİĞİ
--
-- -------------------------------------------------------------------------
-- KAPATILAN ÜÇ BOŞLUK
-- -------------------------------------------------------------------------
-- 1. Satıcı devir kodunu YALNIZCA BİR KEZ görüyordu (fonksiyonun dönüşünde).
--    `devir_kodlari` istemciye kapalı olduğu için sayfayı kapatırsa kodu bir
--    daha göremiyor, kalan süreyi bilmiyor, iptal edemiyordu.
--    -> `devir_durumu`, `devir_kodu_iptal`
--
-- 2. Alıcı ne devraldığını göremiyordu — kodu girmeden ön izleme yoktu, gözü
--    kapalı onaylıyordu.
--    -> `devir_onizleme`
--
-- 3. Kullanıcı KENDİ plakasını sihirbaza yazdığında da "Bu Araç Zaten
--    Kayıtlı" görüyordu; `plaka_kayitli_mi` sahipliğe bakmıyor. Canlı veride
--    doğrulandı: kendi plakası true, başkasının plakası true — ikisi ayırt
--    edilemiyor.
--    -> `plaka_durumu`
--
-- -------------------------------------------------------------------------
-- ⚠ devir_onizleme BİR KOD ORACLE'IDIR
-- -------------------------------------------------------------------------
-- Ön izleme, kodun geçerli olup olmadığını söyleyen ücretsiz bir sorgu. Eğer
-- `devir_tamamla` ile AYNI deneme sayacını kullanmazsa saldırgan ön izlemede
-- sınırsız kod dener, geçerli olanı bulur ve tek seferde tamamlar —
-- tamamlamadaki sınır hiç devreye girmez. İkisi `_devir_deneme_asildi_mi` /
-- `_devir_deneme_kaydet` üzerinden aynı sayacı paylaşıyor ve bu, testte
-- doğrulandı (ön izleme 11. denemede kesildi, ardından devir_tamamla da aynı
-- sayacı gördü).
--
-- -------------------------------------------------------------------------
-- YETKİ DERSİ: İKİ REVOKE BİRLİKTE GEREKİYOR
-- -------------------------------------------------------------------------
--   revoke ... from public              -> PUBLIC sözde-rolünü kaldırır,
--                                          ADIYLA verilmiş grantları BIRAKIR
--   revoke ... from anon, authenticated -> adıyla verilmişleri kaldırır,
--                                          PUBLIC mirasını BIRAKIR
--
-- Hiçbiri tek başına yeterli değil. Bunu iki kez, iki farklı yönden öğrendim:
-- ilk turda `from public` yazdım ve anon açık kaldı; düzeltirken
-- `from anon, authenticated` yazdım ve PUBLIC mirası yüzünden `pin_uret` ile
-- `istemci_ip` hâlâ çağrılabiliyordu. Doğrulamada ikisi de yakalandı.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) plaka_durumu — MODALIN ÜÇ DURUMU
-- Aracın kendisi hakkında bilgi VERMEZ; o iş devir_onizleme'nin (kod gerekir).
-- -------------------------------------------------------------------------
create or replace function public.plaka_durumu(p_plaka text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_temiz text;
  v_arac  public.vehicles;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  v_temiz := regexp_replace(upper(coalesce(p_plaka,'')), '[^A-Z0-9]', '', 'g');
  if v_temiz = '' then
    return jsonb_build_object('kayitli', false, 'benim_mi', false);
  end if;

  select * into v_arac from public.vehicles v
  where regexp_replace(upper(v.plate_number), '[^A-Z0-9]', '', 'g') = v_temiz
  limit 1;

  if not found then
    return jsonb_build_object('kayitli', false, 'benim_mi', false);
  end if;

  return jsonb_build_object(
    'kayitli',  true,
    'benim_mi', (v_arac.user_id = v_uid),
    -- PIN yalnızca sahibine: "garaja git" bağlantısı için gerekiyor.
    'pin_code', case when v_arac.user_id = v_uid then v_arac.pin_code else null end
  );
end;
$$;

revoke execute on function public.plaka_durumu(text) from public, anon;
grant  execute on function public.plaka_durumu(text) to authenticated;

-- -------------------------------------------------------------------------
-- 2) devir_durumu — SATICI TARAFI
-- -------------------------------------------------------------------------
create or replace function public.devir_durumu(p_plaka text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_kod      jsonb;
  v_talepler jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = p_plaka and o.bitis is null and o.user_id = v_uid
  ) then
    return jsonb_build_object('hata','sahip_degil');
  end if;

  select jsonb_build_object(
           'kod',          k.kod,
           'gecerlilik',   k.gecerlilik,
           'kalan_saniye', greatest(0, floor(extract(epoch from (k.gecerlilik - now()))))::integer,
           'riza_metni',   k.riza_metni,
           'olustu',       k.created_at
         )
    into v_kod
  from public.devir_kodlari k
  where k.vehicle_plate = p_plaka
    and k.kullanildi_at is null and k.iptal_at is null and k.gecerlilik > now()
  order by k.created_at desc
  limit 1;

  -- Bekleyen talepler. İsteyenin ADI gösteriliyor: satıcı "bu, aracımı
  -- sattığım kişi mi" diye karar verecek. Kişi zaten talebi kendisi gönderdi.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',      i.id,
           'mesaj',   i.mesaj,
           'olustu',  i.olustu,
           'isteyen', trim(coalesce(pr.first_name,'') || ' ' || coalesce(pr.last_name,''))
         ) order by i.olustu desc), '[]'::jsonb)
    into v_talepler
  from public.devir_istekleri i
  left join public.profiles pr on pr.id = i.isteyen_user_id
  where i.vehicle_plate = p_plaka and i.durum = 'bekliyor';

  return jsonb_build_object('kod', v_kod, 'talepler', v_talepler);
end;
$$;

revoke execute on function public.devir_durumu(text) from public, anon;
grant  execute on function public.devir_durumu(text) to authenticated;

-- -------------------------------------------------------------------------
-- 3) devir_kodu_iptal
-- -------------------------------------------------------------------------
create or replace function public.devir_kodu_iptal(p_plaka text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_iptal integer;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;
  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = p_plaka and o.bitis is null and o.user_id = v_uid
  ) then
    return jsonb_build_object('hata','sahip_degil');
  end if;

  with iptal as (
    update public.devir_kodlari set iptal_at = now()
    where vehicle_plate = p_plaka and kullanildi_at is null and iptal_at is null
    returning 1
  )
  select count(*) into v_iptal from iptal;

  return jsonb_build_object('basarili', true, 'iptal_edilen', v_iptal);
end;
$$;

revoke execute on function public.devir_kodu_iptal(text) from public, anon;
grant  execute on function public.devir_kodu_iptal(text) to authenticated;

-- -------------------------------------------------------------------------
-- 4) devir_onizleme — ALICI TARAFI (kod oracle'ı, sayacı paylaşıyor)
-- -------------------------------------------------------------------------
create or replace function public.devir_onizleme(p_kod text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_kayit    public.devir_kodlari;
  v_arac     public.vehicles;
  v_kayitlar integer;
  v_faturali integer;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  if public._devir_deneme_asildi_mi(v_uid) then
    return jsonb_build_object('hata','cok_fazla_deneme','yeniden_dene_saniye',900);
  end if;

  select * into v_kayit from public.devir_kodlari
  where kod = upper(btrim(coalesce(p_kod,'')))
    and kullanildi_at is null and iptal_at is null and gecerlilik > now();

  if not found then
    perform public._devir_deneme_kaydet(v_uid);
    return jsonb_build_object('hata','kod_gecersiz');
  end if;

  if v_kayit.veren_user_id = v_uid then
    return jsonb_build_object('hata','kendine_devir');
  end if;

  select * into v_arac from public.vehicles where plate_number = v_kayit.vehicle_plate;

  select count(*), count(*) filter (where invoice_path is not null)
    into v_kayitlar, v_faturali
  from public.maintenance_records where vehicle_plate = v_kayit.vehicle_plate;

  -- Plaka VERİLİYOR: alıcının elinde satıcı tarafından verilmiş geçerli bir
  -- kod var ve devralacağı aracın plakasını görmesi gerekiyor. Rastgele kod
  -- deneyen biri buraya ulaşamıyor (paylaşılan sayaç + 40 bitlik kod).
  return jsonb_build_object(
    'plaka',       v_kayit.vehicle_plate,
    'marka',       v_arac.brand,
    'model',       v_arac.model,
    'yil',         v_arac.year,
    'km',          v_arac.km,
    'kayit',       v_kayitlar,
    'faturali',    v_faturali,
    'sicil_puani', v_arac.trust_score,
    'riza_metni',  v_kayit.riza_metni,
    'gecerlilik',  v_kayit.gecerlilik
  );
end;
$$;

revoke execute on function public.devir_onizleme(text) from public, anon;
grant  execute on function public.devir_onizleme(text) to authenticated;

-- -------------------------------------------------------------------------
-- 5) devir_talep_et — ALICI TALEP AÇAR (üç sınırla)
-- -------------------------------------------------------------------------
create or replace function public.devir_talep_et(p_plaka text, p_mesaj text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_temiz  text;
  v_arac   public.vehicles;
  v_gunluk integer;
  v_ad     text;
  v_id     bigint;
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
  if v_arac.user_id = v_uid then
    return jsonb_build_object('hata','zaten_sizde');
  end if;

  -- SINIR 1: günde en çok 3 FARKLI araca talep.
  select count(distinct vehicle_plate) into v_gunluk
  from public.devir_istekleri
  where isteyen_user_id = v_uid and olustu > now() - interval '24 hours';
  if v_gunluk >= 3 then
    return jsonb_build_object('hata','gunluk_sinir','yeniden_dene_saniye', 86400);
  end if;

  -- SINIR 2: aynı araca bekleyen talep varsa yenisi yok.
  if exists (
    select 1 from public.devir_istekleri
    where vehicle_plate = v_arac.plate_number and durum = 'bekliyor'
  ) then
    return jsonb_build_object('hata','zaten_bekleyen_talep');
  end if;

  -- SINIR 3: reddedilen talepten sonra aynı araca 7 gün yok.
  if exists (
    select 1 from public.devir_istekleri
    where vehicle_plate = v_arac.plate_number and isteyen_user_id = v_uid
      and durum = 'reddedildi' and karar_at > now() - interval '7 days'
  ) then
    return jsonb_build_object('hata','ret_bekleme_suresi');
  end if;

  insert into public.devir_istekleri (vehicle_plate, isteyen_user_id, mesaj)
  values (v_arac.plate_number, v_uid, left(btrim(coalesce(p_mesaj,'')), 300))
  returning id into v_id;

  select trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
    into v_ad from public.profiles where id = v_uid;

  -- SATICIYA BİLDİRİM. Metin, tanımadığı biri talep ettiğinde ne yapacağını
  -- da söylüyor — talep yolu taciz kanalına dönmemeli.
  perform public._bildirim_yaz(
    v_arac.user_id,
    'Devir talebi: ' || v_arac.plate_number,
    coalesce(nullif(v_ad,''), 'Bir kullanıcı') || ', ' ||
    coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') || ' (' ||
    v_arac.plate_number || ') aracınızı devralmak için talep gönderdi. ' ||
    'Garajınızdan onaylayabilir veya reddedebilirsiniz. ' ||
    'Bu kişiyi tanımıyorsanız reddedin — onaylamadığınız sürece hiçbir şey değişmez.',
    'warning'
  );

  return jsonb_build_object('basarili', true, 'istek_id', v_id, 'plaka', v_arac.plate_number);
end;
$$;

revoke execute on function public.devir_talep_et(text,text) from public, anon;
grant  execute on function public.devir_talep_et(text,text) to authenticated;

-- -------------------------------------------------------------------------
-- 6) devir_talep_karari — SATICI ONAYLAR / REDDEDER
-- -------------------------------------------------------------------------
create or replace function public.devir_talep_karari(
  p_istek_id bigint, p_onay boolean, p_riza_metni text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_istek public.devir_istekleri;
  v_arac  public.vehicles;
  v_sonuc jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  select * into v_istek from public.devir_istekleri
  where id = p_istek_id and durum = 'bekliyor';
  if not found then
    return jsonb_build_object('hata','istek_yok');
  end if;

  -- Kararı YALNIZCA aktif sahip verebilir.
  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = v_istek.vehicle_plate
      and o.bitis is null and o.user_id = v_uid
  ) then
    return jsonb_build_object('hata','sahip_degil');
  end if;

  select * into v_arac from public.vehicles where plate_number = v_istek.vehicle_plate;

  if not p_onay then
    update public.devir_istekleri
    set durum = 'reddedildi', karar_at = now(), karar_veren_user_id = v_uid
    where id = p_istek_id;

    perform public._bildirim_yaz(
      v_istek.isteyen_user_id,
      'Devir talebiniz reddedildi',
      coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') ||
      ' aracı için gönderdiğiniz devir talebi araç sahibi tarafından reddedildi.',
      'info'
    );
    return jsonb_build_object('basarili', true, 'karar', 'reddedildi');
  end if;

  -- ONAY: rıza metni zorunlu — devrin hukuki dayanağı bu.
  if p_riza_metni is null or btrim(p_riza_metni) = '' then
    return jsonb_build_object('hata','riza_metni_gerekli');
  end if;

  v_sonuc := public._devri_uygula(
    v_istek.vehicle_plate, v_istek.isteyen_user_id,
    jsonb_build_object(
      'yol',        'talep',
      'devreden',   v_uid,
      'istek_id',   v_istek.id,
      'riza_metni', btrim(p_riza_metni),
      'riza_at',    now(),
      'devir_at',   now()
    )
  );

  if v_sonuc ? 'hata' then
    return v_sonuc;
  end if;

  -- _devri_uygula bekleyen talepleri 'iptal' yapıyor; bunu 'onaylandi' yaz.
  update public.devir_istekleri
  set durum = 'onaylandi', karar_at = now(), karar_veren_user_id = v_uid
  where id = p_istek_id;

  perform public._bildirim_yaz(
    v_istek.isteyen_user_id,
    'Devir tamamlandı: ' || v_istek.vehicle_plate,
    coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') || ' (' ||
    v_istek.vehicle_plate || ') aracı artık sizin garajınızda. Bakım kayıtları ' ||
    've belgeleri araçla birlikte devredildi. Aracın yeni sicil kodu: ' ||
    (v_sonuc->>'yeni_pin'),
    'success'
  );

  return jsonb_build_object('basarili', true, 'karar', 'onaylandi',
                            'plaka', v_istek.vehicle_plate);
end;
$$;

revoke execute on function public.devir_talep_karari(bigint,boolean,text) from public, anon;
grant  execute on function public.devir_talep_karari(bigint,boolean,text) to authenticated;

-- =========================================================================
-- 7) YETKİ TEMİZLİĞİ — İÇ YARDIMCILAR İSTEMCİYE KAPATILIYOR
--
-- Bunlar yalnızca diğer security definer fonksiyonlar tarafından çağrılıyor.
-- Sömürülebilir değillerdi (devir fonksiyonları auth.uid() kontrolüyle
-- başlıyor, tetikleyici fonksiyonları tetikleyici dışında çalışmıyor, gerisi
-- RLS'e tabi) ama API yüzeyini gereksiz genişletiyorlardı ve Supabase
-- denetleyicisi definer fonksiyonları bu yüzden işaretliyor.
-- =========================================================================
revoke execute on function public.pin_uret()                       from public, anon, authenticated;
revoke execute on function public.istemci_ip()                     from public, anon, authenticated;
revoke execute on function public.sicil_hiz_siniri_asildi_mi(text)  from public, anon, authenticated;
revoke execute on function public.sicil_puani_hesapla(text,text,numeric,date,date) from public, anon, authenticated;
revoke execute on function public.vehicles_puan_yaz()              from public, anon, authenticated;
revoke execute on function public.bakim_sonrasi_puan_yenile()      from public, anon, authenticated;

revoke execute on function public.devir_kodu_uret(text,text) from public, anon;
grant  execute on function public.devir_kodu_uret(text,text) to authenticated;

-- arac_sahibi_mi: `maintenance_records` POLİTİKALARI bunu kullanıyor ve
-- politika değerlendirmesi SORGUYU YAPAN rolün yetkisiyle çalışıyor — yani
-- authenticated'ın EXECUTE yetkisi ZORUNLU. Kaldırılırsa araç sahibi kendi
-- bakım kayıtlarını okuyamaz.
revoke execute on function public.arac_sahibi_mi(text) from public, anon;
grant  execute on function public.arac_sahibi_mi(text) to authenticated;

-- =========================================================================
-- SQL KATMANI DOĞRULANDI (iki gerçek hesap, sonra geri alındı) — 30/32 → 14/14
--   · plaka_durumu üç durumu ayırıyor; alıcı PIN görmüyor
--   · satıcı kodu YENİDEN görüyor, kalan süre 172.799 s, rıza metni saklı
--   · alıcı ön izleme alıyor (marka/model/yıl, kayıt, faturalı, puan, rıza)
--   · ÖN İZLEME DEVRİ TAMAMLAMIYOR (kod hâlâ geçerli)
--   · kod yolu devri tamamlıyor; satıcı aracı göremiyor
--   · satıcıya bildirim düşüyor, plaka metnin içinde, tür 'warning'
--   · talep yolu çalışıyor; ikinci talep engelleniyor
--   · SAHİP OLMAYAN karar veremiyor ('sahip_degil')
--   · onay devri tamamlıyor, puan korunuyor
--   · ORACLE: ön izleme 11. denemede kesiliyor, devir_tamamla AYNI sayacı görüyor
--   · iç fonksiyonlar (pin_uret, istemci_ip, _devri_uygula, _bildirim_yaz,
--     iki tetikleyici, sicil_hiz_siniri_asildi_mi) istemciye tamamen kapalı
--   · arac_sahibi_mi yetkisi korunduğu için bakım kaydı okuma çalışıyor
--   · 79 test geçiyor
-- =========================================================================
