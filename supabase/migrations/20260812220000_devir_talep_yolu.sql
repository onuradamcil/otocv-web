-- =========================================================================
-- ARAÇ DEVRİ · TALEP YOLU VE ORTAK DEVİR FONKSİYONU
--
-- -------------------------------------------------------------------------
-- NİYE TALEP YOLU
-- -------------------------------------------------------------------------
-- Faz 1'de devir yalnızca SATICININ başlatabildiği bir işti: kod üretir,
-- alıcı girer. Bu, senaryoların yalnızca bir yarısı. Gerçek hayatta en sık
-- karşılaşılan durum şu:
--
--   Araç teslim edilmiş, evrak bitmiş, sicil kimsenin aklına gelmemiş.
--   Alıcı elinde araç varken satıcıya ulaşamıyor.
--
-- O yüzden ikinci yön: alıcı talep açar, satıcı onaylar. Satıcı onaylamadan
-- HİÇBİR ŞEY olmuyor — "alıcı plakayı yazıp sahiplenir" tasarımı, birinin
-- arabanızı sahiplenip servis geçmişinizi alması demek olurdu.
--
-- -------------------------------------------------------------------------
-- TALEP YOLU BİR TACİZ KANALI OLMAMALI
-- -------------------------------------------------------------------------
-- Plakayı bilen herkes araç sahibine bildirim gönderebilir. Üç sınır
-- (20260812230000 dosyasındaki devir_talep_et içinde):
--   · kullanıcı başına 24 saatte en çok 3 FARKLI araç
--   · aynı araca bekleyen talep varsa yenisi açılmaz (kısmi tekil indeks)
--   · reddedilen talepten sonra aynı araca 7 gün yok
-- Ayrıca satıcıya giden bildirim metni "tanımıyorsanız reddedin" diyor.
--
-- -------------------------------------------------------------------------
-- DEVİR MANTIĞI TEK YERE ALINDI
-- -------------------------------------------------------------------------
-- `devir_tamamla`'nın gövdesi `_devri_uygula`'ya taşındı. Sebep: talep yolu
-- da AYNI devri yapmak zorunda. İki yerde tutulsa kayar — bu projede tam
-- olarak o hatayı hasar kataloğunda gördük (aynı veri üç dosyada, üçü
-- birbirinden ayrılmış, kullanıcı bir parçayı bir isimle işaretlerken alıcı
-- başka isimle görüyordu).
--
-- -------------------------------------------------------------------------
-- BİLDİRİM NİYE FONKSİYON İÇİNDE
-- -------------------------------------------------------------------------
-- `notifications` INSERT politikası `auth.uid() = user_id`. Yani ALICININ
-- istemcisi SATICI adına bildirim yazamaz. `security definer` fonksiyon
-- RLS'i baypas ediyor ve devir zaten atomik — doğru yer burası.
--
-- Bildirim metni KENDİ KENDİNE YETERLİ olmak zorunda: bildirime tıklamak
-- her zaman `/garage`'a gidiyor (tabloda link alanı yok) ve satıcı garaja
-- gidince araç orada olmayacak. Bu yüzden plaka ve ne olduğu metnin içinde.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) TALEP TABLOSU
-- -------------------------------------------------------------------------
create table if not exists public.devir_istekleri (
  id                  bigserial   primary key,
  vehicle_plate       text        not null references public.vehicles(plate_number) on update cascade on delete cascade,
  isteyen_user_id     uuid        not null references auth.users(id) on delete cascade,
  mesaj               text,
  durum               text        not null default 'bekliyor'
                      check (durum in ('bekliyor','onaylandi','reddedildi','iptal')),
  olustu              timestamptz not null default now(),
  karar_at            timestamptz,
  karar_veren_user_id uuid        references auth.users(id) on delete set null
);

comment on table public.devir_istekleri is
  'Alıcı tarafından başlatılan devir talepleri. Satıcı onaylamadan hiçbir şey olmuyor. RLS açık, POLİTİKA YOK: yalnızca security definer fonksiyonlar erişir.';

-- Bir araç için AYNI ANDA tek bekleyen talep.
create unique index if not exists devir_tek_bekleyen_istek_idx
  on public.devir_istekleri (vehicle_plate) where durum = 'bekliyor';
create index if not exists devir_istek_isteyen_idx
  on public.devir_istekleri (isteyen_user_id, olustu desc);
create index if not exists devir_istek_plaka_idx
  on public.devir_istekleri (vehicle_plate, durum);

alter table public.devir_istekleri enable row level security;
-- Politika YOK ve kasıtlı: RLS açık + politika yok = hiçbir istemci rolü
-- okuyamaz/yazamaz. Okuma `devir_durumu` fonksiyonundan geçiyor.
revoke all on table public.devir_istekleri from anon, authenticated;

-- -------------------------------------------------------------------------
-- 2) PAYLAŞILAN DENEME SAYACI  (önce tanımlanıyor: aşağıdakiler kullanıyor)
--
-- `devir_onizleme` bir KOD ORACLE'I. `devir_tamamla` ile AYNI sayacı
-- kullanmazsa saldırgan ön izlemede sınırsız kod deneyip geçerli olanı bulur,
-- sonra tek seferde tamamlar ve oradaki sınır hiç devreye girmez.
-- -------------------------------------------------------------------------
create or replace function public._devir_deneme_asildi_mi(p_uid uuid)
returns boolean
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select count(*) >= 10
  from public.devir_deneme_log
  where user_id = p_uid and olustu > now() - interval '15 minutes';
$$;

create or replace function public._devir_deneme_kaydet(p_uid uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.devir_deneme_log (user_id) values (p_uid);
  -- Fırsatçı temizlik: pg_cron gerekmiyor, tablo sınırsız büyümüyor.
  if random() < 0.05 then
    delete from public.devir_deneme_log where olustu < now() - interval '1 hour';
  end if;
end;
$$;

-- İÇ FONKSİYON: hiçbir istemci rolüne açık olmamalı.
-- DİKKAT — ikisi birlikte gerekiyor: `from public` adıyla verilmiş grantları
-- bırakır, `from anon, authenticated` ise PUBLIC mirasını bırakır.
revoke all on function public._devir_deneme_asildi_mi(uuid) from public, anon, authenticated;
revoke all on function public._devir_deneme_kaydet(uuid)    from public, anon, authenticated;

-- -------------------------------------------------------------------------
-- 3) BİLDİRİM YAZICI
-- -------------------------------------------------------------------------
create or replace function public._bildirim_yaz(
  p_user_id uuid, p_baslik text, p_mesaj text, p_tur text
)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications (user_id, title, message, type, is_read)
  values (p_user_id, p_baslik, p_mesaj, coalesce(p_tur,'info'), false);
$$;

comment on function public._bildirim_yaz(uuid,text,text,text) is
  'İÇ KULLANIM. notifications INSERT politikası auth.uid()=user_id olduğu için bir kullanıcı diğeri adına bildirim yazamaz; devir fonksiyonları bunu kullanıyor.';

revoke all on function public._bildirim_yaz(uuid,text,text,text) from public, anon, authenticated;

-- -------------------------------------------------------------------------
-- 4) ORTAK DEVİR FONKSİYONU
-- -------------------------------------------------------------------------
create or replace function public._devri_uygula(
  p_plaka       text,
  p_yeni_sahip  uuid,
  p_onay        jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_eski_sahip uuid;
  v_yeni_pin   text;
  v_kapanan    integer := 0;
  v_arac       public.vehicles;
begin
  select user_id into v_eski_sahip
  from public.vehicle_ownerships
  where vehicle_plate = p_plaka and bitis is null;

  if v_eski_sahip is null then
    return jsonb_build_object('hata','aktif_sahip_yok');
  end if;
  if v_eski_sahip = p_yeni_sahip then
    return jsonb_build_object('hata','kendine_devir');
  end if;

  update public.vehicle_ownerships set bitis = now()
  where vehicle_plate = p_plaka and bitis is null;

  insert into public.vehicle_ownerships (vehicle_plate, user_id, devir_onayi)
  values (p_plaka, p_yeni_sahip, p_onay);

  -- PIN yenileniyor: yoksa satıcının PIN'i paylaştığı herkes sicilde kalır.
  v_yeni_pin := public.pin_uret();

  update public.vehicles
  set user_id = p_yeni_sahip, pin_code = v_yeni_pin
  where plate_number = p_plaka
  returning * into v_arac;

  -- Satıcının yayındaki ilanı kapanıyor: ilan yeni sahibin adı altında
  -- yayında kalmamalı.
  with kapatilan as (
    update public.listings set status = 'devredildi', updated_at = now()
    where vehicle_plate = p_plaka and status = 'active'
    returning 1
  )
  select count(*) into v_kapanan from kapatilan;

  -- Bekleyen diğer talepler ve kodlar iptal: araç artık el değiştirdi.
  update public.devir_istekleri
  set durum = 'iptal', karar_at = now()
  where vehicle_plate = p_plaka and durum = 'bekliyor';

  update public.devir_kodlari set iptal_at = now()
  where vehicle_plate = p_plaka and kullanildi_at is null and iptal_at is null;

  -- SATICIYA BİLDİRİM. Güvenlik açısından önemli: kod sızmışsa aracının
  -- elinden çıktığını öğrendiği tek yer bu.
  perform public._bildirim_yaz(
    v_eski_sahip,
    'Aracınız devredildi: ' || p_plaka,
    coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') || ' (' || p_plaka ||
    ') aracınız yeni sahibine devredildi. Araç artık garajınızda görünmeyecek ve ' ||
    'bakım kayıtlarına erişiminiz sona erdi. Bu işlemi siz başlatmadıysanız ' ||
    'lütfen hemen bizimle iletişime geçin.',
    'warning'
  );

  -- maintenance_records'a DOKUNULMUYOR: kayıtlar plakaya bağlı, servis işi
  -- araca aittir. yukleyen_user_id de değişmiyor (KVKK silme hakkı).
  -- Fatura dosyaları da taşınmıyor: yol <storage_key>/ ve politika "sahip
  -- olduğum aracın anahtarı mı" diye bakıyor, erişim kendiliğinden geçiyor.

  return jsonb_build_object(
    'basarili',       true,
    'plaka',          p_plaka,
    'yeni_pin',       v_yeni_pin,
    'kapatilan_ilan', v_kapanan,
    'eski_sahip',     v_eski_sahip
  );
end;
$$;

comment on function public._devri_uygula(text,uuid,jsonb) is
  'İÇ KULLANIM. Devrin kendisi: sahiplik, PIN yenileme, ilan kapatma, bekleyen talep/kod iptali, satıcıya bildirim. Kod yolu ve talep yolu ikisi de bunu çağırır — devir mantığı tek yerde.';

revoke all on function public._devri_uygula(text,uuid,jsonb) from public, anon, authenticated;

-- -------------------------------------------------------------------------
-- 5) devir_tamamla ARTIK ORTAK FONKSİYONU ÇAĞIRIYOR
-- (Önceki gövdesi 20260812210000'de; oradaki hâli tarihsel kayıt.)
-- -------------------------------------------------------------------------
create or replace function public.devir_tamamla(p_kod text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_kayit  public.devir_kodlari;
  v_sonuc  jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  -- Kaba kuvvet freni: devir_onizleme ile AYNI sayacı paylaşıyor.
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

  -- Kod üretildikten SONRA sahiplik değişmiş olabilir: o durumda kod geçersiz.
  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = v_kayit.vehicle_plate
      and o.bitis is null and o.user_id = v_kayit.veren_user_id
  ) then
    update public.devir_kodlari set iptal_at = now() where kod = v_kayit.kod;
    return jsonb_build_object('hata','sahiplik_degismis');
  end if;

  v_sonuc := public._devri_uygula(
    v_kayit.vehicle_plate, v_uid,
    jsonb_build_object(
      'yol',        'kod',
      'devreden',   v_kayit.veren_user_id,
      'kod',        v_kayit.kod,
      'riza_metni', v_kayit.riza_metni,
      'riza_at',    v_kayit.riza_at,
      'devir_at',   now()
    )
  );

  if v_sonuc ? 'hata' then
    return v_sonuc;
  end if;

  update public.devir_kodlari
  set kullanildi_at = now(), kullanan_user_id = v_uid
  where kod = v_kayit.kod;

  return v_sonuc;
end;
$$;

revoke execute on function public.devir_tamamla(text) from public, anon;
grant  execute on function public.devir_tamamla(text) to authenticated;
