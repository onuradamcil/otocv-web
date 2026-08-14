-- =========================================================================
-- DEVİR: SON ONAY + ÜCRET ADIMI
--
-- -------------------------------------------------------------------------
-- ESKİ AKIŞ VE SORUNU
-- -------------------------------------------------------------------------
-- A kod üretiyor, B kodu girip onaylıyor, araç ANINDA geçiyordu
-- (`devir_tamamla`). A'nın ikinci bir onayı yoktu: kod bir kez üretildikten
-- sonra A'nın süreçte hiçbir söz hakkı kalmıyordu.
--
-- Arayüzdeki "Gelen Talepler" sekmesi hiç dolamıyordu, çünkü onu besleyen
-- `devir_talep_et` istemciye kapalıydı — PLAKA gerektirdiği için bilerek
-- kapatılmıştı (plakayı bilen herkes araç sahibini rahatsız edebiliyordu).
-- Yani sekme, kapatılmış bir yolun kalıntısıydı. Artık kod üzerinden
-- besleniyor: plaka hiçbir adımda istenmiyor.
--
-- -------------------------------------------------------------------------
-- YENİ AKIŞ
-- -------------------------------------------------------------------------
--   1. A kod üretir (mevcut `devir_kodu_uret`) ve RIZASINI BURADA verir.
--   2. B kodu girer, önizlemeyi görür (mevcut `devir_onizleme`).
--   3. B "devralmak istiyorum" der  -> `devir_istek_olustur`
--      ARAÇ GEÇMEZ. A'ya bildirim gider.
--   4. A onaylar/reddeder            -> `devir_istek_karari`
--      Onayda B'ye bildirim gider ve 2 GÜNLÜK ödeme süresi başlar.
--   5. B öder ve devralır            -> `devir_odeyip_tamamla`
--   6. 2 gün dolarsa istek DE kod DA düşer; süreç baştan başlar.
--
-- Rıza metni son onayda TEKRAR İSTENMİYOR (ürün sahibinin kararı): aynı
-- metni iki kez onaylatmak onayı refleks hâline getiriyor. Son onay
-- yalnızca evet/hayır.
--
-- -------------------------------------------------------------------------
-- ⚠ MEVCUT TABLO GENİŞLETİLİYOR, YENİDEN YARATILMIYOR
-- -------------------------------------------------------------------------
-- `devir_istekleri` zaten vardı (kapatılan plaka tabanlı yolun tablosu) ve
-- içinde 15 satır veri duruyordu. `create table if not exists` sessizce
-- hiçbir şey yapmıyor, dolayısıyla yeni sütunlar hiç oluşmuyordu — bu
-- migration ilk denemede tam olarak böyle patladı.
--
-- Tablonun kendi sözlüğüne de uyuluyor: bekleyen durumun adı `'bekliyor'`
-- (`'beklemede'` değil) ve talep eden sütunu `isteyen_user_id`. Yeni şemayı
-- dayatmak eski 15 satırı kırardı; canlı veritabanının yedeği yok.
--
-- -------------------------------------------------------------------------
-- ÜCRET SUNUCUDA SABİT
-- -------------------------------------------------------------------------
-- `demo_satin_alma` tutarı İSTEMCİDEN alıyor, yani istemci ₺0 gönderebilir.
-- Bu yüzden devir ücreti oradan geçirilmiyor: `devir_odeyip_tamamla` satın
-- alma kaydını KENDİ oluşturuyor ve tutarı `devir_ucreti()`nden yazıyor.
-- Gerçek tahsilata geçilirken değişecek tek yer o fonksiyon.
--
-- -------------------------------------------------------------------------
-- SÜRE DOLUMU: OKUMA ANINDA
-- -------------------------------------------------------------------------
-- Projede zamanlanmış iş (cron) altyapısı yok. Süresi geçmiş istek,
-- kendisine DOKUNULDUĞU anda düşüyor ve kodunu da iptal ediyor. Kayıt
-- tabloda kalıyor: neyin neden düştüğü denetlenebilir olmalı (devir
-- kodlarında da silme yerine `iptal_at` kullanılmıştı).
-- =========================================================================

-- 1 · TABLOYU GENİŞLET -------------------------------------------------------

alter table public.devir_istekleri
  add column if not exists kod             text references public.devir_kodlari(kod) on delete cascade,
  add column if not exists sahip_id        uuid references auth.users(id) on delete cascade,
  add column if not exists odeme_son_tarih timestamptz,
  add column if not exists satin_alma_id   bigint references public.satin_almalar(id),
  add column if not exists tamamlandi_at   timestamptz;

-- Eski sözlüğe iki durum ekleniyor; eskiler aynen korunuyor.
alter table public.devir_istekleri drop constraint if exists devir_istekleri_durum_check;
alter table public.devir_istekleri add constraint devir_istekleri_durum_check
  check (durum in ('bekliyor','onaylandi','reddedildi','iptal','suresi_doldu','tamamlandi'));

-- Bir kod için AYNI ANDA tek açık istek. Aksi hâlde B üst üste istek
-- yaratıp araç sahibinin ekranını doldururdu.
create unique index if not exists devir_istek_kod_tek_acik
  on public.devir_istekleri (kod)
  where kod is not null and durum in ('bekliyor','onaylandi');

create index if not exists devir_istek_sahip_idx
  on public.devir_istekleri (sahip_id, durum, olustu desc);

-- Tablo istemciye kapalı: her şey RPC'den geçiyor. Doğrudan erişim açık
-- olsaydı `vehicle_plate` okunabilirdi.
alter table public.devir_istekleri enable row level security;
revoke all on public.devir_istekleri from public;
revoke all on public.devir_istekleri from anon, authenticated;
grant  all on public.devir_istekleri to service_role;

-- 2 · ÜCRET — TEK KAYNAK -----------------------------------------------------
-- Tutar tek yerde tanımlı ki arayüzde yazan rakamla tahsil edilen rakam
-- ayrışmasın.

create or replace function public.devir_ucreti()
returns numeric language sql immutable as $$ select 150::numeric $$;

-- 3 · SÜRESİ GEÇMİŞLERİ DÜŞÜR ------------------------------------------------
-- Her RPC'nin başında çağrılıyor. Ödemesi yapılmamış onay hem kendini hem
-- KODU düşürüyor: ürün sahibinin kararı "her şey sıfırlansın".

create or replace function public._devir_sureleri_dusur()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  with dusenler as (
    update public.devir_istekleri
    set durum = 'suresi_doldu'
    where durum = 'onaylandi'
      and kod is not null
      and odeme_son_tarih is not null
      and odeme_son_tarih < now()
    returning kod
  )
  update public.devir_kodlari k
  set iptal_at = now()
  from dusenler d
  where k.kod = d.kod and k.kullanildi_at is null and k.iptal_at is null;
end;
$$;

-- 4 · B: İSTEK OLUŞTUR -------------------------------------------------------

create or replace function public.devir_istek_olustur(p_kod text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_kayit public.devir_kodlari; v_id bigint;
begin
  if v_uid is null then return jsonb_build_object('basarili', false, 'hata', 'oturum_yok'); end if;
  perform public._devir_sureleri_dusur();

  -- Kaba kuvvet freni: önizleme ve tamamlama ile AYNI sayacı paylaşıyor.
  if public._devir_deneme_asildi_mi(v_uid) then
    return jsonb_build_object('basarili', false, 'hata', 'cok_fazla_deneme');
  end if;

  select * into v_kayit from public.devir_kodlari
  where kod = upper(btrim(coalesce(p_kod,'')))
    and kullanildi_at is null and iptal_at is null and gecerlilik > now();

  if not found then
    perform public._devir_deneme_kaydet(v_uid);
    return jsonb_build_object('basarili', false, 'hata', 'kod_gecersiz');
  end if;

  if v_kayit.veren_user_id = v_uid then
    return jsonb_build_object('basarili', false, 'hata', 'kendine_devir');
  end if;

  -- Kod üretildikten SONRA sahiplik değişmiş olabilir.
  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = v_kayit.vehicle_plate
      and o.bitis is null and o.user_id = v_kayit.veren_user_id
  ) then
    update public.devir_kodlari set iptal_at = now() where kod = v_kayit.kod;
    return jsonb_build_object('basarili', false, 'hata', 'sahiplik_degismis');
  end if;

  -- Açık istek varsa yenisi açılmıyor; var olan geri veriliyor.
  select id into v_id from public.devir_istekleri
  where kod = v_kayit.kod and durum in ('bekliyor','onaylandi');

  if v_id is not null then
    return jsonb_build_object('basarili', true, 'istek_id', v_id, 'zaten_var', true);
  end if;

  insert into public.devir_istekleri (kod, vehicle_plate, isteyen_user_id, sahip_id, durum)
  values (v_kayit.kod, v_kayit.vehicle_plate, v_uid, v_kayit.veren_user_id, 'bekliyor')
  returning id into v_id;

  insert into public.notifications (user_id, title, message, type)
  values (v_kayit.veren_user_id, 'Devir talebi bekliyor',
          'Ürettiğiniz devir kodunu kullanan bir kullanıcı onayınızı bekliyor.', 'devir');

  return jsonb_build_object('basarili', true, 'istek_id', v_id);
end; $$;

-- 5 · A: GELEN TALEPLER ------------------------------------------------------

create or replace function public.devir_gelen_talepler()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;
  perform public._devir_sureleri_dusur();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'istek_id', i.id,
      -- PLAKA DEĞİL PIN: araç kimliği dışarıya hep PIN ile veriliyor.
      'pin_code', v.pin_code, 'brand', v.brand, 'model', v.model,
      'year', v.year, 'image_url', v.image_url, 'durum', i.durum, 'olustu', i.olustu,
      'odeme_son_tarih', i.odeme_son_tarih,
      -- Talep edenin YALNIZCA adı; soyadı, e-posta ve telefon gösterilmiyor.
      'talep_eden', coalesce(nullif(btrim(p.first_name), ''), 'Bir kullanici')
    ) order by i.olustu desc)
    from public.devir_istekleri i
    join public.vehicles v on v.plate_number = i.vehicle_plate
    left join public.profiles p on p.id = i.isteyen_user_id
    -- `kod is not null`: kapatılan plaka tabanlı yoldan kalan eski 15 satır
    -- bu listeye karışmıyor.
    where i.sahip_id = v_uid and i.kod is not null and i.durum in ('bekliyor','onaylandi')
  ), '[]'::jsonb);
end; $$;

-- 6 · A: KARAR ---------------------------------------------------------------

create or replace function public.devir_istek_karari(p_istek_id bigint, p_onay boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_i public.devir_istekleri; v_son timestamptz;
begin
  if v_uid is null then return jsonb_build_object('basarili', false, 'hata', 'oturum_yok'); end if;
  perform public._devir_sureleri_dusur();

  select * into v_i from public.devir_istekleri where id = p_istek_id;

  -- Taraf değilse isteğin VARLIĞI bile sızmamalı: aynı hata dönüyor.
  if v_i.id is null or v_i.sahip_id is null or v_i.sahip_id <> v_uid then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  if v_i.durum <> 'bekliyor' then
    return jsonb_build_object('basarili', false, 'hata', 'durum_uygun_degil');
  end if;

  if not p_onay then
    update public.devir_istekleri
    set durum = 'reddedildi', karar_at = now(), karar_veren_user_id = v_uid
    where id = p_istek_id;
    insert into public.notifications (user_id, title, message, type)
    values (v_i.isteyen_user_id, 'Devir talebiniz reddedildi',
            'Araç sahibi devir talebinizi onaylamadı.', 'devir');
    return jsonb_build_object('basarili', true, 'onaylandi', false);
  end if;

  -- ÖDEME SÜRESİ: 2 gün. Amaç B'yi acele ettirmek değil, aracın belirsiz
  -- süre boyunca yarı devredilmiş hâlde asılı kalmasını engellemek.
  v_son := now() + interval '2 days';

  update public.devir_istekleri
  set durum = 'onaylandi', karar_at = now(), karar_veren_user_id = v_uid, odeme_son_tarih = v_son
  where id = p_istek_id;

  insert into public.notifications (user_id, title, message, type)
  values (v_i.isteyen_user_id, 'Araç üzerinize geçmeye hazır',
          'Araç sahibi devri onayladı. Devir ücretini ödeyerek işlemi tamamlayabilirsiniz.', 'devir');

  return jsonb_build_object('basarili', true, 'onaylandi', true, 'odeme_son_tarih', v_son);
end; $$;

-- 7 · B: BEKLEYEN DEVİRLERİM -------------------------------------------------

create or replace function public.devir_bekleyenlerim()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;
  perform public._devir_sureleri_dusur();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'istek_id', i.id, 'pin_code', v.pin_code, 'brand', v.brand, 'model', v.model,
      'year', v.year, 'image_url', v.image_url, 'durum', i.durum,
      'odeme_son_tarih', i.odeme_son_tarih, 'ucret', public.devir_ucreti()
    ) order by i.olustu desc)
    from public.devir_istekleri i
    join public.vehicles v on v.plate_number = i.vehicle_plate
    where i.isteyen_user_id = v_uid and i.kod is not null and i.durum in ('bekliyor','onaylandi')
  ), '[]'::jsonb);
end; $$;

-- 8 · B: ÖDE VE DEVRAL -------------------------------------------------------
-- ⚠ SATIN ALMA KAYDINI BU FONKSİYON OLUŞTURUYOR, İSTEMCİ DEĞİL.

create or replace function public.devir_odeyip_tamamla(p_istek_id bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_i public.devir_istekleri; v_kayit public.devir_kodlari;
  v_alim bigint; v_sonuc jsonb;
begin
  if v_uid is null then return jsonb_build_object('basarili', false, 'hata', 'oturum_yok'); end if;
  perform public._devir_sureleri_dusur();

  select * into v_i from public.devir_istekleri where id = p_istek_id;

  if v_i.id is null or v_i.isteyen_user_id <> v_uid or v_i.kod is null then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  if v_i.durum = 'suresi_doldu' then
    return jsonb_build_object('basarili', false, 'hata', 'suresi_doldu');
  end if;

  if v_i.durum <> 'onaylandi' then
    return jsonb_build_object('basarili', false, 'hata', 'onay_bekliyor');
  end if;

  select * into v_kayit from public.devir_kodlari where kod = v_i.kod;

  if v_kayit.kullanildi_at is not null or v_kayit.iptal_at is not null then
    return jsonb_build_object('basarili', false, 'hata', 'kod_gecersiz');
  end if;

  -- Sahiplik son bir kez doğrulanıyor: onay ile ödeme arasında araç
  -- başkasına geçmiş olabilir.
  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = v_i.vehicle_plate
      and o.bitis is null and o.user_id = v_i.sahip_id
  ) then
    update public.devir_istekleri set durum = 'iptal' where id = p_istek_id;
    update public.devir_kodlari set iptal_at = now() where kod = v_i.kod and iptal_at is null;
    return jsonb_build_object('basarili', false, 'hata', 'sahiplik_degismis');
  end if;

  insert into public.satin_almalar
    (user_id, urun_kodu, saglayici, tutar, durum, tamamlandi_at, hedef_plaka)
  values
    (v_uid, 'devir', 'demo', public.devir_ucreti(), 'tamamlandi', now(), v_i.vehicle_plate)
  returning id into v_alim;

  v_sonuc := public._devri_uygula(
    v_i.vehicle_plate, v_uid,
    jsonb_build_object(
      'yol', 'istek', 'devreden', v_i.sahip_id, 'kod', v_i.kod, 'istek_id', v_i.id,
      'riza_metni', v_kayit.riza_metni, 'riza_at', v_kayit.riza_at, 'devir_at', now()
    )
  );

  -- Devir başarısızsa satın alma da iade ediliyor: ödeme alınıp aracın
  -- geçmemesi kabul edilemez.
  if v_sonuc ? 'hata' then
    update public.satin_almalar set durum = 'iade' where id = v_alim;
    return v_sonuc;
  end if;

  update public.devir_kodlari set kullanildi_at = now(), kullanan_user_id = v_uid where kod = v_i.kod;
  update public.devir_istekleri
  set durum = 'tamamlandi', tamamlandi_at = now(), satin_alma_id = v_alim
  where id = p_istek_id;

  -- ⚠ BURADA İKİNCİ BİR BİLDİRİM VARDI, KALDIRILDI.
  -- `_devri_uygula` zaten araç sahibine "Aracınız devredildi: PLAKA"
  -- bildirimi gönderiyor. İkinci kayıt hem tekrardı hem de plakayı
  -- taşımıyordu; bildirim metninin kendi kendine yeterli olmasını sınayan
  -- test tam bu yüzden düştü.

  return v_sonuc || jsonb_build_object('satin_alma_id', v_alim);
end; $$;

-- 9 · YETKİLER ---------------------------------------------------------------
-- ⚠ İKİ REVOKE BİRDEN: `from public` tek başına yetmiyor, Supabase `anon`
-- ve `authenticated` rollerine AYRI yetki veriyor.

revoke all on function public._devir_sureleri_dusur()                from public, anon, authenticated;
revoke all on function public.devir_istek_olustur(text)              from public, anon, authenticated;
revoke all on function public.devir_gelen_talepler()                 from public, anon, authenticated;
revoke all on function public.devir_istek_karari(bigint, boolean)    from public, anon, authenticated;
revoke all on function public.devir_bekleyenlerim()                  from public, anon, authenticated;
revoke all on function public.devir_odeyip_tamamla(bigint)           from public, anon, authenticated;
revoke all on function public.devir_ucreti()                         from public, anon, authenticated;

grant execute on function public.devir_istek_olustur(text)           to authenticated;
grant execute on function public.devir_gelen_talepler()              to authenticated;
grant execute on function public.devir_istek_karari(bigint, boolean) to authenticated;
grant execute on function public.devir_bekleyenlerim()               to authenticated;
grant execute on function public.devir_odeyip_tamamla(bigint)        to authenticated;
grant execute on function public.devir_ucreti()                      to authenticated;
-- `_devir_sureleri_dusur` yalnızca diğer fonksiyonların içinden çağrılıyor.

-- 10 · ⚠ ESKİ TEK ADIMLI YOL KAPATILIYOR -------------------------------------
-- Bu migration'ın en kritik satırı. `devir_tamamla` açık kalsaydı devralan
-- kişi hem araç sahibinin onayını hem ücreti atlayıp aracı doğrudan üzerine
-- alabilirdi; yukarıdaki akış yalnızca arayüzde var olan bir süs olurdu.
-- Kilit politikaya değil YETKİYE bağlı; aynı ders `devir_talep_et`te de
-- alınmıştı.

revoke all on function public.devir_tamamla(text) from public, anon, authenticated;
grant execute on function public.devir_tamamla(text) to service_role;

-- 11 · KOD İPTALİ AÇIK İSTEĞİ DE DÜŞÜRÜYOR ----------------------------------
-- Bu, testte yakalanan gerçek bir boşluktu. `devir_kodu_iptal` yalnızca kodu
-- iptal ediyor, isteği 'bekliyor' hâlde bırakıyordu. Tabloda ÖNCEDEN var olan
-- `devir_tek_bekleyen_istek_idx` (plaka başına tek bekleyen istek) yüzünden o
-- araç için bir daha istek açılamıyordu: araç kalıcı olarak asılı kalıyordu.

create or replace function public.devir_kodu_iptal(p_plaka text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_iptal integer;
begin
  if v_uid is null then return jsonb_build_object('hata','oturum_yok'); end if;
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

  update public.devir_istekleri
  set durum = 'iptal', karar_at = now(), karar_veren_user_id = v_uid
  where vehicle_plate = p_plaka and kod is not null and durum in ('bekliyor','onaylandi');

  return jsonb_build_object('basarili', true, 'iptal_edilen', v_iptal);
end; $$;

-- Aynı sebeple ASILI KALMIŞ eski istekler tek seferlik temizleniyor.
update public.devir_istekleri i
set durum = 'iptal'
from public.devir_kodlari k
where i.kod = k.kod
  and i.durum in ('bekliyor','onaylandi')
  and (k.iptal_at is not null or k.kullanildi_at is not null);
