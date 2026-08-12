-- =========================================================================
-- ŞEMA KAYMASI GİDERİLDİ — SEKİZ FONKSİYONUN GÖVDESİ DEPOYA ALINDI
--
-- -------------------------------------------------------------------------
-- SORUN: DEPO VERİTABANINI TAM TARİF ETMİYORDU
-- -------------------------------------------------------------------------
-- Önceki üç migration dosyasında fonksiyon gövdesi yerine yorum yazmışım:
--
--   20260812170000_sicil_puani_kanita_baglandi.sql:89   "Gövde ... panele uygulandı"
--   20260812180000_sicil_sorgu_hiz_siniri.sql:138       "Gövdeler ... panele uygulandı"
--   20260812190000_arac_devri_sahiplik_gecmisi.sql:222  "Fonksiyon gövdeleri ... panele uygulandı"
--
-- Sonuç: `supabase/migrations/` klasöründen kurulan bir veritabanında
--
--   · araç devri HİÇ OLUŞMAZ          (devir_kodu_uret, devir_tamamla yok)
--   · sicil puanı HİÇ HESAPLANMAZ     (tetikleyici fonksiyonları yok)
--   · istek hızı sınırı ÇALIŞMAZ      (istemci_ip, sicil_hiz_siniri_asildi_mi yok)
--   · sicil_getir ESKİ SÜRÜMDE kalır  (hız sınırı, engine_capacity,
--                                      trust_breakdown içermez)
--
-- Bu son madde en sinsisi: fonksiyon VAR ve çalışıyor, ama eksik. Yani hata
-- vermeden yanlış davranır.
--
-- Ayrıca bu kayma, CI'ın 2. aşamasını (yerel Supabase ile test) imkânsız
-- kılıyordu — testler migration'lardan kurulan bir veritabanına koşacaktı.
--
-- -------------------------------------------------------------------------
-- NİYE ESKİ DOSYALAR DÜZENLENMEDİ, YENİ DOSYA AÇILDI
-- -------------------------------------------------------------------------
-- İlk düşüncem eski dosyalardaki yorumları gövdeyle değiştirmekti. Yapmadım:
-- uygulanmış bir migration'ı geriye dönük değiştirmek, o dosyanın başka bir
-- ortamda uygulanmış hâliyle çelişir ve "hangi sürüm uygulandı" sorusunu
-- cevapsız bırakır. Migration'lar EKLEME-ONLY olmalı.
--
-- Bu dosya, kaymış nesnelerin O ANKİ CANLI HÂLİNİ yakalıyor. Gövdeler
-- `pg_get_functiondef` ile canlı veritabanından çekildi — hafızadan yazılmadı.
--
-- Eski dosyalardaki yanıltıcı yorumlar da bu dosyayı işaret edecek şekilde
-- güncellendi; okuyan kişi "panele uygulandı" deyip yolda kalmasın.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) sicil_puani_hesapla — SİCİL PUANI
-- Model ve gerekçeler: 20260812170000
-- -------------------------------------------------------------------------
create or replace function public.sicil_puani_hesapla(
  p_plaka                      text,
  p_tramer_status              text,
  p_tramer_amount              numeric,
  p_inspection_end_date        date,
  p_traffic_insurance_end_date date
)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_kayit          integer := 0;
  v_faturali       integer := 0;
  v_karsilastiran  integer := 0;
  v_geri_adim      integer := 0;
  v_p_kayit        integer := 0;
  v_p_fatura       integer := 0;
  v_p_km           integer := 0;
  v_p_hasar        integer := 0;
  v_p_muayene      integer := 0;
  v_p_sigorta      integer := 0;
  v_km_durum       text;
  v_hasar_metin    text;
  v_muayene_metin  text;
  v_sigorta_metin  text;
  v_toplam         integer;
begin
  select count(*), count(*) filter (where invoice_path is not null)
    into v_kayit, v_faturali
  from public.maintenance_records
  where vehicle_plate = p_plaka;

  -- A1 · KAYIT SAYISI (max 25) — her kayit 5 puan, 5 kayitta doluyor.
  v_p_kayit := least(coalesce(v_kayit, 0), 5) * 5;

  -- A2 · FATURA ORANI (max 20) — belgesiz kayit beyandir, faturali kayit belge.
  if coalesce(v_kayit, 0) > 0 then
    v_p_fatura := round((v_faturali::numeric / v_kayit) * 20);
  end if;

  -- B · KILOMETRE TUTARLILIGI (max 20)
  -- Tarihe gore siralanip geriye gidis araniyor. Bu, JS tarafindaki
  -- kilometreTutarliligi() ile AYNI kurali uyguluyor.
  with sirali as (
    select km_at_service,
           lag(km_at_service) over (order by service_date) as onceki
    from public.maintenance_records
    where vehicle_plate = p_plaka
      and service_date is not null
      and km_at_service is not null
  )
  select count(*), count(*) filter (where onceki is not null and km_at_service < onceki)
    into v_karsilastiran, v_geri_adim
  from sirali;

  if coalesce(v_karsilastiran, 0) < 2 then
    -- Iki kayit yoksa karsilastirma yapilamaz. "Tutarli" demek, yapilmamis
    -- bir dogrulamayi iddia etmek olur; puan verilmiyor ama bu bir ceza da
    -- degil — bilinmezlik.
    v_km_durum := 'yetersiz';
    v_p_km := 0;
  elsif coalesce(v_geri_adim, 0) = 0 then
    v_km_durum := 'tutarli';
    v_p_km := 20;
  else
    v_km_durum := 'tutarsiz';
    v_p_km := 0;
  end if;

  -- C1 · HASAR BEYANI (max 15)
  if p_tramer_status = 'Tramer Yok' and coalesce(p_tramer_amount, 0) = 0 then
    v_p_hasar := 15;
    v_hasar_metin := 'Hasar kaydi yok beyani';
  elsif p_tramer_status in ('Tramer Var', 'Agir Hasarli', 'Ağır Hasarlı') or coalesce(p_tramer_amount, 0) > 0 then
    v_p_hasar := 0;
    v_hasar_metin := 'Hasar kaydi beyan edilmis';
  else
    v_p_hasar := 0;
    v_hasar_metin := 'Hasar durumu beyan edilmemis';
  end if;

  -- C2 · MUAYENE (max 12)
  if p_inspection_end_date is null then
    v_p_muayene := 0; v_muayene_metin := 'Beyan edilmemis';
  elsif p_inspection_end_date < current_date then
    v_p_muayene := 0; v_muayene_metin := 'Beyan edilen sure dolmus';
  elsif p_inspection_end_date < current_date + interval '30 days' then
    v_p_muayene := 6; v_muayene_metin := 'Gecerli, 30 gunden az kaldi';
  else
    v_p_muayene := 12; v_muayene_metin := 'Beyan edilen sure icinde gecerli';
  end if;

  -- C3 · TRAFIK SIGORTASI (max 8)
  if p_traffic_insurance_end_date is null then
    v_p_sigorta := 0; v_sigorta_metin := 'Beyan edilmemis';
  elsif p_traffic_insurance_end_date < current_date then
    v_p_sigorta := 0; v_sigorta_metin := 'Beyan edilen sure dolmus';
  elsif p_traffic_insurance_end_date < current_date + interval '30 days' then
    v_p_sigorta := 4; v_sigorta_metin := 'Gecerli, 30 gunden az kaldi';
  else
    v_p_sigorta := 8; v_sigorta_metin := 'Beyan edilen sure icinde gecerli';
  end if;

  v_toplam := v_p_kayit + v_p_fatura + v_p_km + v_p_hasar + v_p_muayene + v_p_sigorta;

  return jsonb_build_object(
    'puan', v_toplam,
    'hesaplandi', now(),
    'kirilim', jsonb_build_array(
      jsonb_build_object('ad','Bakim kaydi','puan',v_p_kayit,'tavan',25,
        'aciklama', v_kayit || ' kayit (her kayit 5 puan, tavan 5 kayit)','kaynak','Sistem kaydi'),
      jsonb_build_object('ad','Faturali kayit','puan',v_p_fatura,'tavan',20,
        'aciklama', v_faturali || '/' || v_kayit || ' kayit belgeli','kaynak','Belgeli'),
      jsonb_build_object('ad','Kilometre tutarliligi','puan',v_p_km,'tavan',20,
        'aciklama', case v_km_durum
          when 'tutarli'  then v_karsilastiran || ' kayit tarih sirasinda tutarli'
          when 'tutarsiz' then v_geri_adim || ' kayitta kilometre geriye gidiyor'
          else 'Karsilastirma icin en az 2 tarihli kayit gerekli (' || v_karsilastiran || ' var)'
        end, 'kaynak','Hesaplandi'),
      jsonb_build_object('ad','Hasar beyani','puan',v_p_hasar,'tavan',15,
        'aciklama', v_hasar_metin,'kaynak','Arac sahibi beyani'),
      jsonb_build_object('ad','Muayene','puan',v_p_muayene,'tavan',12,
        'aciklama', v_muayene_metin,'kaynak','Arac sahibi beyani'),
      jsonb_build_object('ad','Trafik sigortasi','puan',v_p_sigorta,'tavan',8,
        'aciklama', v_sigorta_metin,'kaynak','Arac sahibi beyani')
    )
  );
end;
$$;

-- -------------------------------------------------------------------------
-- 2) vehicles_puan_yaz — BEFORE tetikleyici
-- Istemcinin gonderdigi trust_score YOK SAYILIYOR.
-- -------------------------------------------------------------------------
create or replace function public.vehicles_puan_yaz()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sonuc jsonb;
begin
  v_sonuc := public.sicil_puani_hesapla(
    new.plate_number, new.tramer_status, new.tramer_amount,
    new.inspection_end_date, new.traffic_insurance_end_date
  );
  -- BEFORE tetikleyici: NEW dogrudan degistiriliyor, ozyineleme yok.
  -- Istemcinin gonderdigi trust_score DEGERI YOK SAYILIYOR — anon anahtariyla
  -- 98 verilebildigi kanitlandi.
  new.trust_score := (v_sonuc->>'puan')::integer;
  new.trust_breakdown := v_sonuc;
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 3) bakim_sonrasi_puan_yenile — AFTER tetikleyici
-- -------------------------------------------------------------------------
create or replace function public.bakim_sonrasi_puan_yenile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plaka text := coalesce(new.vehicle_plate, old.vehicle_plate);
begin
  if v_plaka is not null then
    -- Bu UPDATE, vehicles uzerindeki BEFORE tetikleyicisini calistirip puani
    -- yeniden hesaplatiyor. Ozyineleme yok: o tetikleyici vehicles'a UPDATE
    -- atmiyor, yalnizca NEW'i degistiriyor.
    update public.vehicles set trust_score = trust_score where plate_number = v_plaka;
  end if;
  return null;
end;
$$;

-- TETİKLEYİCİLER — bunlar da hiçbir dosyada yoktu.
drop trigger if exists vehicles_puan_tetik on public.vehicles;
create trigger vehicles_puan_tetik
  before insert or update of tramer_status, tramer_amount,
                             inspection_end_date, traffic_insurance_end_date,
                             trust_score
  on public.vehicles
  for each row execute function public.vehicles_puan_yaz();

drop trigger if exists bakim_puan_tetik on public.maintenance_records;
create trigger bakim_puan_tetik
  after insert or update or delete on public.maintenance_records
  for each row execute function public.bakim_sonrasi_puan_yenile();

-- -------------------------------------------------------------------------
-- 4) istemci_ip — HIZ SINIRI İÇİN İSTEMCİ IP'Sİ
-- cf-connecting-ip tercih ediliyor: Cloudflare onu kendisi yazar, taklit
-- edilemez. x-forwarded-for BILEREK kullanilmiyor.
-- -------------------------------------------------------------------------
create or replace function public.istemci_ip()
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_basliklar json;
begin
  begin
    v_basliklar := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;

  if v_basliklar is null then
    return null;   -- PostgREST disindan cagri (migration, psql): sinir uygulanmaz
  end if;

  return coalesce(
    v_basliklar ->> 'cf-connecting-ip',
    v_basliklar ->> 'sb-forwarded-for'
  );
end;
$$;

-- -------------------------------------------------------------------------
-- 5) sicil_hiz_siniri_asildi_mi — BAŞARISIZ SORGU SAYACI
-- Gerekce ve limit secimleri: 20260812180000
-- -------------------------------------------------------------------------
create or replace function public.sicil_hiz_siniri_asildi_mi(p_ip text)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_basarisiz integer;
  v_toplam    integer;
  v_pencere   interval := interval '10 minutes';
  -- Basarisizligi saymak, saldirganla mesru kullaniciyi ayirt eden en keskin
  -- olcut. 20 secildi (10 degil): NAT arkasindaki paylasimli IP'ler icin pay.
  v_basarisiz_limit integer := 20;
  -- Toplu cekmeye karsi ikincil ag. Test takimi ve ofis IP'si takilmaz.
  v_toplam_limit integer := 600;
begin
  if p_ip is null then
    -- BILEREK ACIK: hiz siniri erisim denetimi degil, kotuye kullanim frenidir.
    -- Kapali birakmak, baslik adi degistiginde tum karne sayfalarini kirardi.
    return 0;
  end if;

  select count(*) filter (where not bulundu), count(*)
    into v_basarisiz, v_toplam
  from public.sicil_sorgu_log
  where ip = p_ip and olustu > now() - v_pencere;

  if v_basarisiz >= v_basarisiz_limit then return 600; end if;
  if v_toplam    >= v_toplam_limit    then return 600; end if;
  return 0;
end;
$$;

-- -------------------------------------------------------------------------
-- 6) sicil_getir — GENEL OKUMA YOLU (GÜNCEL SÜRÜM)
--
-- DİKKAT: 20260812130000 ve 20260812150000 dosyalarında bu fonksiyonun ESKİ
-- sürümleri var. Aradaki üç değişiklik (engine_capacity, trust_breakdown,
-- hız sınırı) hiçbir dosyaya yazılmamıştı. Aşağıdaki GÜNCEL sürüm.
--
-- volatile: log tablosuna yaziyor, yani yan etkisi var. stable bir fonksiyon
-- yazma yapamaz.
-- -------------------------------------------------------------------------
create or replace function public.sicil_getir(p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_arac      public.vehicles;
  v_sahip_mi  boolean;
  v_kayitlar  jsonb;
  v_ip        text;
  v_bekle     integer;
  v_bulundu   boolean := false;
begin
  if p_pin is null or btrim(p_pin) = '' then return null; end if;
  if btrim(p_pin) !~ '^[A-Za-z0-9-]{3,16}$' then return null; end if;

  v_ip := public.istemci_ip();

  v_bekle := public.sicil_hiz_siniri_asildi_mi(v_ip);
  if v_bekle > 0 then
    -- null DONDURULMUYOR: null "bulunamadi" demek ve ikisini ayirt edememek
    -- kullaniciya "arac yok" yalanini soylemek olurdu.
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

    -- Firsatci temizlik: pg_cron gerekmiyor, tablo sinirsiz buyumuyor.
    if random() < 0.01 then
      delete from public.sicil_sorgu_log where olustu < now() - interval '1 hour';
    end if;
  end if;

  if not v_bulundu then return null; end if;

  v_sahip_mi := (auth.uid() is not null and auth.uid() = v_arac.user_id);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id, 'service_type', m.service_type, 'shop_name', m.shop_name,
           'summary', m.summary, 'service_date', m.service_date,
           'km_at_service', m.km_at_service, 'cost', m.cost,
           'next_service_km', m.next_service_km,
           -- Fatura yolu YALNIZCA sahibine.
           'invoice_path', case when v_sahip_mi then m.invoice_path else null end,
           -- Ziyaretci faturanin VARLIGINI gorebilir; gorseli acamaz.
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
      -- KVKK: plaka kisisel veri. Ziyaretcide null.
      'plate_number', case when v_sahip_mi then v_arac.plate_number else null end
      -- user_id BILEREK YOK: sahiplik `sahip_mi` ile veriliyor.
    ),
    'bakim_kayitlari', v_kayitlar
  );
end;
$$;

-- -------------------------------------------------------------------------
-- 7) devir_kodu_uret — SATICI DEVİR KODU ÜRETİR
-- Gerekceler: 20260812190000
-- -------------------------------------------------------------------------
create or replace function public.devir_kodu_uret(p_plaka text, p_riza_metni text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_alfabe text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_govde  text;
  v_kod    text;
  v_bayt   bytea;
  v_sure   timestamptz;
  i        integer;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;
  if p_riza_metni is null or btrim(p_riza_metni) = '' then
    -- Riza metni ZORUNLU: devrin hukuki dayanagi saticinin onayi.
    return jsonb_build_object('hata','riza_metni_gerekli');
  end if;

  -- Aktif sahiplik tablosuna bakiliyor, vehicles.user_id'ye degil: tek
  -- dogruluk kaynagi orasi.
  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = p_plaka and o.bitis is null and o.user_id = v_uid
  ) then
    return jsonb_build_object('hata','sahip_degil');
  end if;

  -- Ayni anda tek gecerli kod: yoksa satici birden fazla kod dagitip
  -- kontrolu kaybeder.
  update public.devir_kodlari
  set iptal_at = now()
  where vehicle_plate = p_plaka and kullanildi_at is null and iptal_at is null;

  v_govde := '';
  -- TAM NITELENDIRME: pgcrypto `extensions` semasinda.
  v_bayt := extensions.gen_random_bytes(8);
  for i in 0..7 loop
    v_govde := v_govde || substr(v_alfabe, (get_byte(v_bayt, i) & 31) + 1, 1);
  end loop;
  v_kod := 'DV-' || substr(v_govde,1,4) || '-' || substr(v_govde,5,4);

  -- 48 saat: alici icin bol, sizmis kod icin kisa.
  v_sure := now() + interval '48 hours';

  insert into public.devir_kodlari (kod, vehicle_plate, veren_user_id, riza_metni, gecerlilik)
  values (v_kod, p_plaka, v_uid, btrim(p_riza_metni), v_sure);

  return jsonb_build_object('kod', v_kod, 'gecerlilik', v_sure, 'plaka', p_plaka);
end;
$$;

-- -------------------------------------------------------------------------
-- 8) devir_tamamla — ALICI KODU KULLANIR
--
-- NOT: bu gövde 20260812220000 dosyasında `_devri_uygula` iç fonksiyonuna
-- bölünecek (talep yolu da aynı mantığı kullanacak). Burada kaymayı kapatmak
-- için O ANKİ hâli yazılıyor.
-- -------------------------------------------------------------------------
create or replace function public.devir_tamamla(p_kod text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_kayit     public.devir_kodlari;
  v_basarisiz integer;
  v_yeni_pin  text;
  v_kapanan   integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  -- Kaba kuvvet freni: kod tek kullanimlik ve sureli olsa da deneme
  -- sinirsizsa 40 bitlik uzay taranabilir. Sayac KULLANICI basina.
  select count(*) into v_basarisiz
  from public.devir_deneme_log
  where user_id = v_uid and olustu > now() - interval '15 minutes';

  if v_basarisiz >= 10 then
    return jsonb_build_object('hata','cok_fazla_deneme','yeniden_dene_saniye',900);
  end if;

  select * into v_kayit from public.devir_kodlari
  where kod = upper(btrim(coalesce(p_kod,'')))
    and kullanildi_at is null
    and iptal_at is null
    and gecerlilik > now();

  if not found then
    insert into public.devir_deneme_log (user_id) values (v_uid);
    if random() < 0.05 then
      delete from public.devir_deneme_log where olustu < now() - interval '1 hour';
    end if;
    return jsonb_build_object('hata','kod_gecersiz');
  end if;

  if v_kayit.veren_user_id = v_uid then
    return jsonb_build_object('hata','kendine_devir');
  end if;

  -- Kod uretildikten SONRA sahiplik degismis olabilir: o durumda kod gecersiz.
  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = v_kayit.vehicle_plate
      and o.bitis is null
      and o.user_id = v_kayit.veren_user_id
  ) then
    update public.devir_kodlari set iptal_at = now() where kod = v_kayit.kod;
    return jsonb_build_object('hata','sahiplik_degismis');
  end if;

  -- ---- DEVİR ----
  update public.vehicle_ownerships
  set bitis = now()
  where vehicle_plate = v_kayit.vehicle_plate and bitis is null;

  insert into public.vehicle_ownerships (vehicle_plate, user_id, devir_onayi)
  values (
    v_kayit.vehicle_plate, v_uid,
    jsonb_build_object(
      'devreden',   v_kayit.veren_user_id,
      'kod',        v_kayit.kod,
      'riza_metni', v_kayit.riza_metni,
      'riza_at',    v_kayit.riza_at,
      'devir_at',   now()
    )
  );

  -- PIN yenileniyor: yoksa saticinin PIN'i paylastigi herkes sicilde kalir.
  v_yeni_pin := public.pin_uret();

  update public.vehicles
  set user_id = v_uid, pin_code = v_yeni_pin
  where plate_number = v_kayit.vehicle_plate;

  -- Saticinin yayindaki ilani kapatiliyor.
  with kapatilan as (
    update public.listings
    set status = 'devredildi', updated_at = now()
    where vehicle_plate = v_kayit.vehicle_plate and status = 'active'
    returning 1
  )
  select count(*) into v_kapanan from kapatilan;

  update public.devir_kodlari
  set kullanildi_at = now(), kullanan_user_id = v_uid
  where kod = v_kayit.kod;

  -- maintenance_records'a DOKUNULMUYOR: kayitlar plakaya bagli, servis isi
  -- araca aittir. yukleyen_user_id de degismiyor (KVKK silme hakki).

  return jsonb_build_object(
    'basarili',       true,
    'plaka',          v_kayit.vehicle_plate,
    'yeni_pin',       v_yeni_pin,
    'kapatilan_ilan', v_kapanan
  );
end;
$$;

-- =========================================================================
-- Yetki sozlesmesi bu dosyada DEGISTIRILMIYOR; 20260812220000 dosyasinda
-- anon yetkileri temizleniyor (`revoke all from public` anon'u kaldirmiyor —
-- Supabase anon/authenticated rollerine ADIYLA EXECUTE veriyor).
-- =========================================================================
