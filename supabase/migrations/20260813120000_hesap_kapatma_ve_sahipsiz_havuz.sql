-- =========================================================================
-- HESAP KAPATMA VE SAHİPSİZ ARAÇ HAVUZU
--
-- SORUN (canlı veritabanında ölçüldü, 2026-08-13):
--
--   auth.users satırı silinir
--    +- vehicles              CASCADE  -> araç kaydı gider
--    |   +- maintenance_records   CASCADE  -> BÜTÜN SERVİS GEÇMİŞİ gider
--    |   +- vehicle_ownerships    CASCADE  -> sahiplik geçmişi gider
--    |   +- listings              CASCADE
--    |   +- devir_kodlari         CASCADE
--    |   +- devir_istekleri       CASCADE
--    +- profiles / notifications / vehicle_drafts  CASCADE
--
-- Tek hesabın silinmesi 10 aracın 9'unu, 12 bakım kaydının 11'ini ve 8 fatura
-- dosyasını götürüyordu. Ürünün iş modeli — kayıtlı plaka sorgusu ve ücretli
-- devir — sicilin sahibinden BAĞIMSIZ yaşamasına dayanıyor. Sicil sahiple
-- birlikte ölürse satılacak bir şey kalmıyor.
--
-- ÇÖZÜM: silmek yerine ANONİMLEŞTİRMEK.
--
-- KVKK m.7 üç yol sayıyor: "silme, yok etme veya ANONİM HALE GETİRME".
-- Anonimleştirme kanunun kendi saydığı eşdeğer bir yol, istisna değil. Araç
-- kaydında kişisel olan şey kişiyle araç arasındaki BAĞ; bağ koparıldığında
-- kalan veri arabaya ait.
--
--   profiles (ad, telefon)     -> SİLİNİR  (cascade kalıyor — kişisel verinin ta kendisi)
--   notifications, listings    -> SİLİNİR  (listings iletişim telefonu taşıyor)
--   vehicles.user_id           -> NULL     (bağ kopar, araç yaşar)
--   vehicle_ownerships.user_id -> NULL     ("2 sahibi olmuş" kalır, KİM olduğu gider)
--   maintenance_records        -> KALIR    (arabaya ait veri)
--
-- Bu, şemanın zaten taşıdığı niyetin tamamlanması. 20260812190000:157-160
-- satırındaki yorum şunu söylüyordu: "yukleyen_user_id ... on delete set null
-- — Devirde DEĞİŞMEZ. KVKK silme hakkı bu kolonla uygulanır." Bu niyeti bozan
-- tek şey vehicles.user_id cascade'iydi.
--
-- -------------------------------------------------------------------------
-- SAHİPSİZ ARAÇ NASIL GERİ ALINIR — ve neden ödeme tek başına yetmiyor
-- -------------------------------------------------------------------------
-- Sahipsiz araç, ücret karşılığı geri yüklenebilir. Ücretin ZORUNLU olması
-- bir arbitrajı kapatıyor: bedava olsaydı satıcıyla alıcı anlaşıp "sen hesabı
-- kapat, ben geri yüklerim" diyerek devir ücretini atlatırdı.
--
-- AMA ÖDEME ELE GEÇİRMEYİ ENGELLEMİYOR, SADECE FİYATLANDIRIYOR. Sokakta
-- gördüğü aracın plakasını yazan biri, sahibi hesabını kapatmışsa ücreti
-- ödeyip hiç sahibi olmadığı bir aracın servis geçmişini ve eski sahibinin
-- adı-adresi yazılı faturalarını devralabilirdi. Bu yüzden geri yükleme
-- BELGE DOĞRULAMASINA bağlı: ruhsat yüklenir, elle onaylanır, sonra ödenir.
-- sahipsiz_geri_yukle onaysız VE ödemesiz çalışmayı reddediyor.
--
-- ÖDEME ALTYAPISI HENÜZ YOK (iyzico/stripe/webhook/api rotası: sıfır).
-- Kapı yine de bugün kuruluyor, KAPALI olarak: odendi_at alanı duruyor ve
-- fonksiyon o alan boşken çalışmıyor. Tahsilat geldiğinde yalnızca o alan
-- dolacak — şema değişmeyecek. Canlı veride yedek olmadığı için "sonra kolon
-- eklerim" demek istemiyoruz.
--
-- -------------------------------------------------------------------------
-- FATURA DOSYALARI: varsayılan olarak SİLİNMİYOR
-- -------------------------------------------------------------------------
-- Ürün kararı: araç verisinin hiçbiri silinmiyor, faturalar da araç siciline
-- ait kabul ediliyor. Bunun tutarlı olması için KVKK aydınlatma metninde şu
-- cümle bulunmak ZORUNDA: "Yüklediğiniz servis belgeleri araç sicilinin
-- parçasıdır; araç el değiştirse veya hesabınızı kapatsanız da araç kaydıyla
-- kalır." Yazılmazsa tutulamayacak bir silme sözü verilmiş olur.
--
-- Açıkça silme talebi gelirse diye kaçış kapısı var: fatura_belgelerini_sil.
-- Varsayılan akışın parçası DEĞİL, talep üzerine çalışan ayrı araç.
--
-- -------------------------------------------------------------------------
-- NOT: fonksiyon gövdeleri canlı veritabanından alınmıştır
-- -------------------------------------------------------------------------
-- Gövdeler pg_get_functiondef çıktısıyla BİREBİR aynı tutuluyor. Sebep:
-- 6fd41f9'da düzeltilen şema kayması. Depodan kurulan bir veritabanı ile
-- canlı veritabanı arasında en küçük fark bile zamanla büyüyor. Gövde
-- içindeki yorumlar bu yüzden ASCII — canlıda öyle duruyor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1 · YABANCI ANAHTARLAR
--
-- Yalnızca üç FK değişiyor. Diğerlerinin CASCADE kalması BİLİNÇLİ: kapalı
-- hesabın profili, bildirimleri ve canlı ilanı durmamalı.
-- -------------------------------------------------------------------------

-- vehicles.user_id: aracin ve sicilinin yasamasi bu satira bagli.
alter table public.vehicles
  drop constraint if exists vehicles_user_id_fkey;
alter table public.vehicles
  add constraint vehicles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- vehicle_ownerships.user_id: gecmis kalir, kimlik gider. NOT NULL dusmeli,
-- yoksa SET NULL kisit ihlaliyle patlar ve silme hic gerceklesmez.
alter table public.vehicle_ownerships
  alter column user_id drop not null;
alter table public.vehicle_ownerships
  drop constraint if exists vehicle_ownerships_user_id_fkey;
alter table public.vehicle_ownerships
  add constraint vehicle_ownerships_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- devir_kodlari.veren_user_id: riza_metni hukuki kanit, satir silinmemeli.
-- Sarkan kod zararsiz: tek kullanimlik ve aktif sahip kontrolune tabi;
-- sahipsiz aracta aktif_sahip_yok donuyor.
alter table public.devir_kodlari
  alter column veren_user_id drop not null;
alter table public.devir_kodlari
  drop constraint if exists devir_kodlari_veren_user_id_fkey;
alter table public.devir_kodlari
  add constraint devir_kodlari_veren_user_id_fkey
  foreign key (veren_user_id) references auth.users(id) on delete set null;


-- -------------------------------------------------------------------------
-- 2 · SAHİPSİZLİK DAMGASI
--
-- Ayrı bir `durum` kolonu ya da enum EKLENMİYOR. Türetilmiş durum kayamaz;
-- bu projede kayan durumun bedeli hasar kataloğunda görüldü (aynı parçanın
-- üç dosyada iki farklı adı vardı). Tek gerçek: user_id null mı?
-- -------------------------------------------------------------------------
alter table public.vehicles
  add column if not exists sahipsiz_kaldi_at timestamptz;

comment on column public.vehicles.sahipsiz_kaldi_at is
  'Aracın sahipsiz havuza düştüğü an. null = sahibi var. user_id ile birlikte tetikleyici tarafından yönetilir, elle yazılmaz.';

create index if not exists vehicles_sahipsiz_idx
  on public.vehicles (sahipsiz_kaldi_at)
  where sahipsiz_kaldi_at is not null;


-- -------------------------------------------------------------------------
-- 3 · TETİKLEYİCİ — sahipsizlik geçişini yöneten tek yer
--
-- FONKSİYON DEĞİL TETİKLEYİCİ, çünkü BAYPAS EDİLEMEZ olması gerekiyor.
-- Veritabanı elle de yönetiliyor: Supabase panelinden yapılan bir
-- `delete from auth.users` de bu yoldan geçip aynı tutarlı duruma varmalı.
-- Yalnızca hesap_kapat içine yazılsaydı, panelden silinen bir hesap PIN'i
-- yenilenmemiş ve sahiplik satırı hâlâ açık bir araç bırakırdı.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vehicles_sahipsizlik_izle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- SAHIPSIZ KALDI
  if old.user_id is not null and new.user_id is null then

    -- Kullanici kendi aracini havuza atamaz. Aksi halde "hesabi kapatmadan
    -- araci sahipsizlestir, sonra ucuza geri al" oyunu acilirdi.
    if auth.uid() is not null then
      raise exception 'Araç sahipsizleştirme yalnızca hesap kapatma yoluyla yapılır';
    end if;

    new.sahipsiz_kaldi_at := now();

    -- PIN YENILENIYOR: ayrilan sahip karneyi paylasmaya devam etmesin.
    new.pin_code := public.pin_uret();

    update public.vehicle_ownerships
       set bitis = now()
     where vehicle_plate = old.plate_number and bitis is null;

    -- 'devredildi' DENMIYOR cunku devir olmadi — sicilde olmamis bir olay
    -- yazmak bu projenin temel kuralini ihlal eder.
    update public.listings
       set status = 'sahipsiz', updated_at = now()
     where vehicle_plate = old.plate_number and status = 'active';

    update public.devir_istekleri
       set durum = 'iptal', karar_at = now()
     where vehicle_plate = old.plate_number and durum = 'bekliyor';

    update public.devir_kodlari
       set iptal_at = now()
     where vehicle_plate = old.plate_number
       and kullanildi_at is null and iptal_at is null;

  -- SAHIBI GERI GELDI (sahipsiz_geri_yukle).
  elsif old.user_id is null and new.user_id is not null then
    new.sahipsiz_kaldi_at := null;
  end if;

  return new;
end;
$function$;

drop trigger if exists vehicles_sahipsizlik_izle on public.vehicles;
create trigger vehicles_sahipsizlik_izle
  before update of user_id on public.vehicles
  for each row execute function public.vehicles_sahipsizlik_izle();


-- -------------------------------------------------------------------------
-- 4 · SAHİPSİZ ARAÇ TALEPLERİ
--
-- RLS açık, POLİTİKA YOK — devir_kodlari kalıbı. Tabloya yalnızca security
-- definer fonksiyonlar erişir; istemci hiçbir satırı göremez.
-- -------------------------------------------------------------------------
create table if not exists public.sahipsiz_talepleri (
  id               bigint generated by default as identity primary key,
  vehicle_plate    text not null references public.vehicles(plate_number) on delete cascade,
  isteyen_user_id  uuid not null references auth.users(id) on delete cascade,

  -- Ele gecirmeyi engelleyen tek sey bu: aracin gercekten talep edenin
  -- oldugunun belgesi. Odeme bunun yerine gecmez.
  ruhsat_yolu      text not null,

  -- Adlandirma devir_istekleri ile ayni bilerek: iki talep tablosu ayni
  -- kavrami iki farkli adla tasirsa sorgular ve kod kayar.
  durum            text not null default 'bekliyor'
                     check (durum in ('bekliyor','onaylandi','reddedildi','iptal')),
  karar_at         timestamptz,
  karar_notu       text,

  -- ODEME KAPISI. Bugun her zaman null; tahsilat altyapisi geldiginde
  -- doldurulacak. sahipsiz_geri_yukle bu alan bosken calismiyor.
  odendi_at        timestamptz,
  odeme_referansi  text,

  olustu           timestamptz not null default now()
);

comment on table public.sahipsiz_talepleri is
  'Sahipsiz havuzdaki bir aracı devralma talebi. Sıra: talep + ruhsat → elle onay → ödeme → geri yükleme. Ödeme ONAYDAN SONRA alınıyor ki reddedilen talepte iade, itiraz ve ters ibraz süreci hiç doğmasın.';

create unique index if not exists sahipsiz_talep_tek_bekleyen_idx
  on public.sahipsiz_talepleri (vehicle_plate)
  where durum = 'bekliyor';

create index if not exists sahipsiz_talep_isteyen_idx
  on public.sahipsiz_talepleri (isteyen_user_id, olustu);

alter table public.sahipsiz_talepleri enable row level security;


-- -------------------------------------------------------------------------
-- 5 · HESAP KAPATMA KAYDI (KVKK ispatı)
--
-- FK YOK — hedef satır silinmiş olacak. Kişisel veri tutmuyor: yalnızca
-- hangi kimliğin ne zaman kapatıldığı ve ne yapıldığı.
-- -------------------------------------------------------------------------
create table if not exists public.hesap_kapatma_log (
  id                    bigint generated by default as identity primary key,
  kapatilan_user_id     uuid not null,
  islem_at              timestamptz not null default now(),
  sahipsiz_kalan_arac   integer not null default 0,
  anonimlesen_sahiplik  integer not null default 0,
  silinen_fatura        integer not null default 0,
  not_metni             text
);

comment on table public.hesap_kapatma_log is
  'KVKK talebine ne zaman ve nasıl cevap verildiğinin kaydı. auth.users satırı silindiği için FK kurulamıyor — kasıtlı.';

alter table public.hesap_kapatma_log enable row level security;


-- -------------------------------------------------------------------------
-- 6 · _devri_uygula — sahipsiz havuzdan geri yükleme dalı eklendi
--
-- Devir mantığı ÇOĞALTILMIYOR. Sahiplik satırı, PIN yenileme, ilan kapatma,
-- bekleyen taleplerin iptali: hepsi tek yerde kalıyor.
--
-- İmza değişiyor (dördüncü parametre) -> drop + create gerekiyor. plpgsql
-- gövdeleri sert bağımlılık kurmadığı için çağıranlar (devir_tamamla,
-- devir_talep_karari) etkilenmiyor; üç argümanlı çağrıları varsayılan
-- değerle yeni imzaya düşüyor.
-- -------------------------------------------------------------------------
drop function if exists public._devri_uygula(text, uuid, jsonb);

CREATE OR REPLACE FUNCTION public._devri_uygula(p_plaka text, p_yeni_sahip uuid, p_onay jsonb, p_sahipsizden boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_eski_sahip uuid;
  v_yeni_pin   text;
  v_kapanan    integer := 0;
  v_arac       public.vehicles;
begin
  select user_id into v_eski_sahip
  from public.vehicle_ownerships
  where vehicle_plate = p_plaka and bitis is null;

  if p_sahipsizden then
    -- GERI YUKLEME DALI: aracin gercekten havuzda oldugu dogrulaniyor.
    -- Bu kontrol olmadan p_sahipsizden=true, sahipli bir araci sahibinin
    -- haberi olmadan devretmenin yolu olurdu.
    if v_eski_sahip is not null then
      return jsonb_build_object('hata','arac_sahipli');
    end if;
    if not exists (
      select 1 from public.vehicles
      where plate_number = p_plaka
        and user_id is null and sahipsiz_kaldi_at is not null
    ) then
      return jsonb_build_object('hata','arac_sahipsiz_degil');
    end if;

  else
    -- NORMAL DEVIR DALI: davranis degismedi.
    if v_eski_sahip is null then
      return jsonb_build_object('hata','aktif_sahip_yok');
    end if;
    if v_eski_sahip = p_yeni_sahip then
      return jsonb_build_object('hata','kendine_devir');
    end if;

    update public.vehicle_ownerships set bitis = now()
    where vehicle_plate = p_plaka and bitis is null;
  end if;

  insert into public.vehicle_ownerships (vehicle_plate, user_id, devir_onayi)
  values (p_plaka, p_yeni_sahip, p_onay);

  -- PIN yenileniyor: yoksa onceki sahibin PIN'i paylastigi herkes sicilde kalir.
  v_yeni_pin := public.pin_uret();

  update public.vehicles
  set user_id = p_yeni_sahip, pin_code = v_yeni_pin
  where plate_number = p_plaka
  returning * into v_arac;

  with kapatilan as (
    update public.listings set status = 'devredildi', updated_at = now()
    where vehicle_plate = p_plaka and status = 'active'
    returning 1
  )
  select count(*) into v_kapanan from kapatilan;

  update public.devir_istekleri
  set durum = 'iptal', karar_at = now()
  where vehicle_plate = p_plaka and durum = 'bekliyor';

  update public.devir_kodlari set iptal_at = now()
  where vehicle_plate = p_plaka and kullanildi_at is null and iptal_at is null;

  -- SATICIYA BILDIRIM. Guvenlik acisindan onemli: kod sizmissa aracinin
  -- elinden ciktigini ogrendigi tek yer bu.
  -- Sahipsiz havuzdan geri yuklemede bildirilecek kimse YOK — hesap kapali.
  if v_eski_sahip is not null then
    perform public._bildirim_yaz(
      v_eski_sahip,
      'Aracınız devredildi: ' || p_plaka,
      coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') || ' (' || p_plaka ||
      ') aracınız yeni sahibine devredildi. Araç artık garajınızda görünmeyecek ve ' ||
      'bakım kayıtlarına erişiminiz sona erdi. Bu işlemi siz başlatmadıysanız ' ||
      'lütfen hemen bizimle iletişime geçin.',
      'warning'
    );
  end if;

  -- maintenance_records'a DOKUNULMUYOR: kayitlar plakaya bagli, servis isi
  -- araca aittir. yukleyen_user_id de degismiyor (KVKK silme hakki).
  -- Fatura dosyalari da tasinmiyor: yol <storage_key>/ ve politika "sahip
  -- oldugum aracin anahtari mi" diye bakiyor, erisim kendiliginden geciyor.

  return jsonb_build_object(
    'basarili',       true,
    'plaka',          p_plaka,
    'yeni_pin',       v_yeni_pin,
    'kapatilan_ilan', v_kapanan,
    'eski_sahip',     v_eski_sahip,
    'sahipsizden',    p_sahipsizden
  );
end;
$function$;


-- -------------------------------------------------------------------------
-- 7 · plaka_durumu — dördüncü durum: sahipsiz
--
-- Modalın gösterdiği durum sayısı üçten dörde çıkıyor. Sahipsiz araçta özet
-- de dönüyor ki sihirbaz ikinci bir çağrı yapmadan "bu aracın 11 bakım
-- kaydı var" diyebilsin — ve bu cümle DOĞRU olsun.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plaka_durumu(p_plaka text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid      uuid := auth.uid();
  v_temiz    text;
  v_arac     public.vehicles;
  v_kayit    integer;
  v_faturali integer;
begin
  if v_uid is null then
    return jsonb_build_object('hata','oturum_yok');
  end if;

  v_temiz := regexp_replace(upper(coalesce(p_plaka,'')), '[^A-Z0-9]', '', 'g');
  if v_temiz = '' then
    return jsonb_build_object('kayitli', false, 'benim_mi', false, 'sahipsiz', false);
  end if;

  select * into v_arac from public.vehicles v
  where regexp_replace(upper(v.plate_number), '[^A-Z0-9]', '', 'g') = v_temiz
  limit 1;

  if not found then
    return jsonb_build_object('kayitli', false, 'benim_mi', false, 'sahipsiz', false);
  end if;

  -- SAHIPSIZ: ozet veriliyor, kayitlarin kendisi degil. Plaka da zaten
  -- kullanicinin kendi yazdigi deger, yeni bilgi degil.
  if v_arac.sahipsiz_kaldi_at is not null then
    select count(*), count(*) filter (where invoice_path is not null)
      into v_kayit, v_faturali
    from public.maintenance_records where vehicle_plate = v_arac.plate_number;

    return jsonb_build_object(
      'kayitli', true, 'benim_mi', false, 'sahipsiz', true,
      'ozet', jsonb_build_object(
        'marka', v_arac.brand, 'model', v_arac.model, 'yil', v_arac.year,
        'kayit', v_kayit, 'faturali', v_faturali,
        'sicil_puani', v_arac.trust_score,
        'sahipsiz_kaldi_at', v_arac.sahipsiz_kaldi_at
      )
    );
  end if;

  -- coalesce sart: user_id null iken karsilastirma null doner ve jsonb'ye
  -- false yerine null yazilirdi.
  return jsonb_build_object(
    'kayitli',  true,
    'benim_mi', coalesce(v_arac.user_id = v_uid, false),
    'sahipsiz', false,
    'pin_code', case when v_arac.user_id = v_uid then v_arac.pin_code else null end
  );
end;
$function$;


-- -------------------------------------------------------------------------
-- 8 · sicil_getir — sahipsiz araçta karne KAPANIYOR
--
-- Ürün kararı: sahipsiz aracın karnesi PIN ile bile açılmaz; yalnızca özet
-- görünür ve tamamı geri yükleyene açılır. Değişen tek yer "SAHIPSIZ ARAC"
-- bloğu; hız sınırı, günlük kaydı ve normal dönüş aynen korunuyor.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sicil_getir(p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_arac      public.vehicles;
  v_sahip_mi  boolean;
  v_kayitlar  jsonb;
  v_ip        text;
  v_bekle     integer;
  v_bulundu   boolean := false;
  v_kayit     integer;
  v_faturali  integer;
begin
  if p_pin is null or btrim(p_pin) = '' then return null; end if;
  if btrim(p_pin) !~ '^[A-Za-z0-9-]{3,16}$' then return null; end if;

  v_ip := public.istemci_ip();

  -- HIZ SINIRI. Asilmissa sorgu hic yapilmiyor.
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

  -- Sorgu kaydediliyor. Firsatci temizlik: her ~100 istekte bir saatten eski
  -- kayitlar siliniyor.
  if v_ip is not null then
    insert into public.sicil_sorgu_log (ip, sorgulanan, bulundu)
    values (v_ip, left(btrim(p_pin), 16), v_bulundu);

    if random() < 0.01 then
      delete from public.sicil_sorgu_log where olustu < now() - interval '1 hour';
    end if;
  end if;

  if not v_bulundu then return null; end if;

  -- SAHIPSIZ ARAC: karne kapali, ozet acik.
  -- null DONDURULMUYOR — ayni gerekce: "arac yok" demek yalan olurdu, arac
  -- var ve sicili duruyor. Ozetin gercek sayilarla donmesi geri yukleme
  -- teklifinin dogru olmasi icin gerekli.
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

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id, 'service_type', m.service_type, 'shop_name', m.shop_name,
           'summary', m.summary, 'service_date', m.service_date,
           'km_at_service', m.km_at_service, 'cost', m.cost,
           'next_service_km', m.next_service_km,
           'invoice_path', case when v_sahip_mi then m.invoice_path else null end,
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
      'plate_number', case when v_sahip_mi then v_arac.plate_number else null end
    ),
    'bakim_kayitlari', v_kayitlar
  );
end;
$function$;


-- -------------------------------------------------------------------------
-- 9 · devir_talep_et — sahipsiz araç için reddediyor
--
-- Sahipsiz araçta bildirilecek satıcı YOK. Bu koruma olmadan
-- _bildirim_yaz(null, ...) çağrılır ve notifications.user_id NOT NULL olduğu
-- için işlem patlardı. Kullanıcı doğru yola (sahipsiz_talep_et) yönleniyor.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.devir_talep_et(p_plaka text, p_mesaj text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  if v_arac.sahipsiz_kaldi_at is not null then
    return jsonb_build_object('hata','sahipsiz');
  end if;
  if v_arac.user_id = v_uid then
    return jsonb_build_object('hata','zaten_sizde');
  end if;

  -- SINIR 1: gunde en cok 3 FARKLI araca talep.
  select count(distinct vehicle_plate) into v_gunluk
  from public.devir_istekleri
  where isteyen_user_id = v_uid and olustu > now() - interval '24 hours';
  if v_gunluk >= 3 then
    return jsonb_build_object('hata','gunluk_sinir','yeniden_dene_saniye', 86400);
  end if;

  -- SINIR 2: ayni araca bekleyen talep varsa yenisi yok.
  if exists (
    select 1 from public.devir_istekleri
    where vehicle_plate = v_arac.plate_number and durum = 'bekliyor'
  ) then
    return jsonb_build_object('hata','zaten_bekleyen_talep');
  end if;

  -- SINIR 3: reddedilen talepten sonra ayni araca 7 gun yok.
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
$function$;


-- -------------------------------------------------------------------------
-- 10 · SAHİPSİZ ARAÇ AKIŞI
-- -------------------------------------------------------------------------

-- Özet: geri yükleme teklifinin doğru sayılarla yapılabilmesi için.
-- Kayıtların kendisini VERMİYOR — o, ödeme sonrası açılıyor.
CREATE OR REPLACE FUNCTION public.sahipsiz_onizleme(p_plaka text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Kullanicinin KENDI talebinin durumu da donuyor: baskasinin talebi
  -- gorunmuyor.
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
      'id', v_talep.id, 'durum', v_talep.durum,
      'odendi', (v_talep.odendi_at is not null), 'olustu', v_talep.olustu
    ) end
  );
end;
$function$;


-- Talep açar. HİÇBİR ŞEYİ DEVRETMEZ.
CREATE OR REPLACE FUNCTION public.sahipsiz_talep_et(p_plaka text, p_ruhsat_yolu text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Ruhsat ZORUNLU. Ele gecirmeyi engelleyen tek sey bu; odeme yalnizca
  -- bedava geri almayi engelliyor.
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
  if v_arac.sahipsiz_kaldi_at is null then
    return jsonb_build_object('hata','arac_sahipsiz_degil');
  end if;

  -- Sinirlar devir_istekleri ile AYNI: talep yolu taciz ya da tarama
  -- kanalina donmemeli. Plakayi bilen herkes talep acabildigi icin gerekli.
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

  insert into public.sahipsiz_talepleri (vehicle_plate, isteyen_user_id, ruhsat_yolu)
  values (v_arac.plate_number, v_uid, btrim(p_ruhsat_yolu))
  returning id into v_id;

  return jsonb_build_object(
    'basarili', true, 'istek_id', v_id, 'plaka', v_arac.plate_number,
    'durum', 'bekliyor'
  );
end;
$function$;


-- Geri yükleme. YALNIZCA service_role — onaylayan ekranı henüz yok.
-- İKİ KAPI: belge onayı (ele geçirmeyi engeller) ve ödeme (bedava geri
-- almayı engeller). İkisi de geçilmeden çalışmaz.
CREATE OR REPLACE FUNCTION public.sahipsiz_geri_yukle(p_istek_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_talep  public.sahipsiz_talepleri;
  v_sonuc  jsonb;
  v_arac   public.vehicles;
begin
  select * into v_talep from public.sahipsiz_talepleri where id = p_istek_id;
  if not found then
    return jsonb_build_object('hata','istek_yok');
  end if;

  -- KAPI 1: belge dogrulamasi.
  if v_talep.durum <> 'onaylandi' then
    return jsonb_build_object('hata','onay_bekliyor','durum',v_talep.durum);
  end if;

  -- KAPI 2: odeme. Hesabi kapatip araci ucretsiz geri alma oyununu bitiriyor.
  if v_talep.odendi_at is null then
    return jsonb_build_object('hata','odeme_bekliyor');
  end if;

  v_sonuc := public._devri_uygula(
    v_talep.vehicle_plate,
    v_talep.isteyen_user_id,
    jsonb_build_object(
      'kaynak',    'sahipsiz_havuz',
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

  select * into v_arac from public.vehicles where plate_number = v_talep.vehicle_plate;

  perform public._bildirim_yaz(
    v_talep.isteyen_user_id,
    'Araç sicili devralındı: ' || v_talep.vehicle_plate,
    coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') || ' (' ||
    v_talep.vehicle_plate || ') aracı ve geçmiş servis kayıtları garajınıza ' ||
    'eklendi. Aracın karne bağlantısı yenilendi; eski bağlantı artık çalışmıyor.',
    'success'
  );

  return v_sonuc;
end;
$function$;


-- -------------------------------------------------------------------------
-- 11 · HESAP KAPATMA
--
-- SIRA TUZAĞI: bu fonksiyon auth.users satırını SİLMİYOR. Betik siliyor ve
-- sıra şu olmak zorunda:
--   1) hesap_kapat()            -> anonimleştirme + log
--   2) (istenirse) fatura_belgelerini_sil() + Storage'tan dosyaları sil
--   3) auth.users satırını sil  -> profiles/notifications/listings cascade
--
-- Önce auth.users silinirse maintenance_records.yukleyen_user_id SET NULL
-- olur ve HANGİ FATURANIN KİME AİT OLDUĞU KAYBOLUR. Aynı sınıf hata storage
-- politikalarında bir kez yapıldı: politikalar dosyalar taşınmadan önce
-- uygulanınca 8 dosya okunamaz hâle gelmişti.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hesap_kapat(p_user_id uuid, p_not text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_plakalar   text[];
  v_arac       integer := 0;
  v_sahiplik   integer := 0;
  v_fatura     integer := 0;
begin
  if p_user_id is null then
    return jsonb_build_object('hata','kullanici_yok');
  end if;

  select coalesce(array_agg(plate_number), '{}')
    into v_plakalar
  from public.vehicles where user_id = p_user_id;

  -- Bilgi amacli: bu kullanicinin yukledigi ve hala duran fatura sayisi.
  -- SILINMIYOR — urun karari geregi belgeler arac siciliyle kaliyor.
  select count(*) into v_fatura
  from public.maintenance_records
  where yukleyen_user_id = p_user_id and invoice_path is not null;

  -- ARACLAR SAHIPSIZ HAVUZA. Tetikleyici gerisini yapiyor.
  update public.vehicles set user_id = null where user_id = p_user_id;
  get diagnostics v_arac = row_count;

  -- GECMIS SAHIPLIKLER ANONIMLESIYOR. "Bu aracin 2 sahibi olmus" bilgisi
  -- kaliyor, KIM oldugu gidiyor — anonimlestirmenin tanimi bu.
  update public.vehicle_ownerships set user_id = null where user_id = p_user_id;
  get diagnostics v_sahiplik = row_count;

  insert into public.hesap_kapatma_log
    (kapatilan_user_id, sahipsiz_kalan_arac, anonimlesen_sahiplik, silinen_fatura, not_metni)
  values (p_user_id, v_arac, v_sahiplik, 0, p_not);

  return jsonb_build_object(
    'basarili',            true,
    'sahipsiz_kalan_arac', v_arac,
    'plakalar',            to_jsonb(v_plakalar),
    'anonimlesen_sahiplik', v_sahiplik,
    'duran_fatura',        v_fatura,
    'sonraki_adim',        'auth.users satirini betik siliyor'
  );
end;
$function$;


-- KVKK KAÇIŞ KAPISI. Varsayılan akışın parçası DEĞİL.
-- Kullanıcı açıkça "belgelerim silinsin" derse çalıştırılır. Yalnızca yolları
-- döndürüp kolonu boşaltıyor; Storage'taki baytları betik siliyor (SQL'den
-- storage.objects satırını silmek dosyayı yörüngede bırakır).
CREATE OR REPLACE FUNCTION public.fatura_belgelerini_sil(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_yollar text[];
begin
  if p_user_id is null then
    return jsonb_build_object('hata','kullanici_yok');
  end if;

  select coalesce(array_agg(invoice_path), '{}')
    into v_yollar
  from public.maintenance_records
  where yukleyen_user_id = p_user_id and invoice_path is not null;

  update public.maintenance_records
  set invoice_path = null
  where yukleyen_user_id = p_user_id and invoice_path is not null;

  -- Sicil puani dusecek: belgelenme bileseni artik karsiliksiz. Bu DOGRU
  -- davranis — olmayan belgeyi varmis gibi saymak karne durustlugunu bozar.
  update public.hesap_kapatma_log
  set silinen_fatura = coalesce(array_length(v_yollar, 1), 0)
  where kapatilan_user_id = p_user_id
    and id = (select max(id) from public.hesap_kapatma_log where kapatilan_user_id = p_user_id);

  return jsonb_build_object(
    'basarili', true,
    'silinen',  coalesce(array_length(v_yollar, 1), 0),
    'yollar',   to_jsonb(v_yollar)
  );
end;
$function$;


-- -------------------------------------------------------------------------
-- 12 · YETKİLER
--
-- İKİ REVOKE DA YAZILIYOR — bu ders bu projede iki kez alındı:
--   revoke ... from public               -> adıyla verilmiş anon/authenticated
--                                           grant'ini BIRAKIYOR
--   revoke ... from anon, authenticated  -> PUBLIC kalıtımını BIRAKIYOR
-- Üçü de ayrı ayrı yazılmadan fonksiyon gerçekten kapanmıyor.
--
-- service_role'e AÇIKÇA grant gerekiyor: PUBLIC'ten revoke edilince
-- service_role de kalıtımla gelen yetkisini kaybediyor.
-- -------------------------------------------------------------------------

-- Yalnizca yonetim tarafi (service_role).
revoke all on function public.hesap_kapat(uuid, text)              from public;
revoke all on function public.hesap_kapat(uuid, text)              from anon, authenticated;
grant execute on function public.hesap_kapat(uuid, text)           to service_role;

revoke all on function public.fatura_belgelerini_sil(uuid)         from public;
revoke all on function public.fatura_belgelerini_sil(uuid)         from anon, authenticated;
grant execute on function public.fatura_belgelerini_sil(uuid)      to service_role;

revoke all on function public.sahipsiz_geri_yukle(bigint)          from public;
revoke all on function public.sahipsiz_geri_yukle(bigint)          from anon, authenticated;
grant execute on function public.sahipsiz_geri_yukle(bigint)       to service_role;

-- Ic yardimcilar: istemciye hic acilmiyor.
revoke all on function public._devri_uygula(text, uuid, jsonb, boolean) from public;
revoke all on function public._devri_uygula(text, uuid, jsonb, boolean) from anon, authenticated;

revoke all on function public.vehicles_sahipsizlik_izle()          from public;
revoke all on function public.vehicles_sahipsizlik_izle()          from anon, authenticated;

-- Oturum acmis kullaniciya acik olanlar. anon'a KAPALI: hepsi zaten
-- auth.uid() is null ile basliyor ama API yuzeyi gereksiz genis olmasin.
revoke all on function public.sahipsiz_onizleme(text)              from public;
revoke all on function public.sahipsiz_onizleme(text)              from anon;
grant execute on function public.sahipsiz_onizleme(text)           to authenticated;

revoke all on function public.sahipsiz_talep_et(text, text)        from public;
revoke all on function public.sahipsiz_talep_et(text, text)        from anon;
grant execute on function public.sahipsiz_talep_et(text, text)     to authenticated;

revoke all on function public.plaka_durumu(text)                   from public;
revoke all on function public.plaka_durumu(text)                   from anon;
grant execute on function public.plaka_durumu(text)                to authenticated;

revoke all on function public.devir_talep_et(text, text)           from public;
revoke all on function public.devir_talep_et(text, text)           from anon;
grant execute on function public.devir_talep_et(text, text)        to authenticated;

-- sicil_getir ZIYARETCIYE ACIK kaliyor: karne sorgusu oturum gerektirmiyor,
-- urunun cekirdegi bu. Korumasi hiz siniri ve 50 bitlik PIN.
grant execute on function public.sicil_getir(text)                 to anon, authenticated;


-- -------------------------------------------------------------------------
-- 13 · RUHSAT BELGELERİ KOVASI
--
-- Sahipsiz araçtan sicil geri yükleme talebinde ruhsat yüklenmesi ZORUNLU.
-- Ele geçirmeyi engelleyen kontrol bu: plakalar sokakta görünür, yalnızca
-- plakayı bilmek bir aracın servis geçmişini almaya yetmemeli.
--
-- Ruhsat ad, adres ve TC bilgisi taşıyabilir -> kova ÖZEL. vehicle-invoices
-- ile aynı sınırlar: 10 MB, yalnızca görüntü ve PDF.
--
-- YAN ETKİ, İSTENEN: sahipsiz aracın FATURALARI da kendiliğinden kilitleniyor.
-- vehicle-invoices politikaları `exists (select 1 from vehicles where
-- storage_key = klasör)` diyor ve `vehicles` RLS'i `auth.uid() = user_id`.
-- Sahipsiz araçta user_id null olduğu için hiçbir kullanıcı eşleşmiyor —
-- belgeler geri yüklenene kadar kimseye açılmıyor. Ayrıca kullanıcı kendi
-- aracını havuza atamıyor: aynı politikanın WITH CHECK'i `auth.uid() = null`
-- olur ve null TRUE olmadığı için güncelleme reddedilir. Tetikleyicideki
-- auth.uid() kontrolü bunun ikinci katmanı.
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('belgeler', 'belgeler', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

-- Klasör adı = yükleyenin kullanıcı kimliği. vehicle-invoices'taki
-- storage_key kalıbı BURADA KULLANILMIYOR: belge henüz bir araca ait değil,
-- bir TALEBE ait ve talep sahibi henüz aracın sahibi değil.
drop policy if exists "belge_yukle_kendi_klasoru" on storage.objects;
create policy "belge_yukle_kendi_klasoru" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'belgeler'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "belge_oku_kendi_klasoru" on storage.objects;
create policy "belge_oku_kendi_klasoru" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'belgeler'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE ve DELETE POLİTİKASI YOK, BİLEREK.
-- Ruhsat bir kanıt: başvuru yapıldıktan sonra başvuranın onu değiştirebilmesi
-- ya da silebilmesi, inceleme süresince delili değiştirebilmesi demek olurdu.
-- İnceleyen taraf service_role ile okuyor (storage RLS'i baypas eder).
