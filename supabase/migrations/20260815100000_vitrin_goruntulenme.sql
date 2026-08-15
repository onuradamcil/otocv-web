-- =========================================================================
-- VİTRİN GÖRÜNTÜLENMESİ — "KAÇ FARKLI KİŞİ BAKTI"
--
-- -------------------------------------------------------------------------
-- NİYE VAR
-- -------------------------------------------------------------------------
-- `listings.views_count` sütunu şemada duruyordu ve "Vitrindeki Araçlarım"
-- ekranı onu "0 Kez Okundu" diye basıyordu. Ama sayacı ARTIRAN hiçbir kod
-- yoktu: canlıda toplam 0 ölçüldü. Yani ekran hep sıfır gösteren bir sayaç
-- gösteriyordu — `favorite_count`ta da aynı hata yapılmıştı.
--
-- -------------------------------------------------------------------------
-- TEKİLLEŞTİRME: SAYI "KAÇ KEZ" DEĞİL "KAÇ KİŞİ" ANLATIYOR
-- -------------------------------------------------------------------------
-- Ürün sahibinin kararı: sayı FARKLI KİŞİ sayısı olacak. Ham görüntülenme
-- saymak aynı kişinin sayfayı beş kez yenilemesini beş kişi gibi gösterirdi.
--
-- İzleyici kimliği iki şekilde oluşuyor:
--   · Oturum açıksa   -> 'u:' || auth.uid()   (SUNUCU belirliyor)
--   · Ziyaretçiyse    -> 'a:' || istemcinin tarayıcısında sakladığı rastgele
--                        kimlik
--
-- ⚠ KULLANICI KİMLİĞİNİ İSTEMCİ GÖNDEREMİYOR. Fonksiyon oturum varsa
-- `auth.uid()`i kullanıyor ve istemciden gelen değeri YOK SAYIYOR; aksi
-- hâlde bir istemci başkasının kimliğiyle görüntülenme yazabilirdi.
--
-- ⚠ ZİYARETÇİ KİMLİĞİNİN SINIRI AÇIKÇA BİLİNİYOR: tarayıcıda tutulan bir
-- değer olduğu için silinebilir ve kasten üretilebilir. Yani sayı, niyetli
-- bir saldırgana karşı şişirilebilir. Vitrin kamuya açık olduğu ve tek
-- alternatif ziyaretçileri hiç saymamak olduğu için bu kabul edildi;
-- gerçek koruma (IP/oran sınırı) tahsilat altyapısıyla birlikte gelmeli.
--
-- -------------------------------------------------------------------------
-- ARAÇ SAHİBİ KENDİ ARACINI SAYDIRMIYOR
-- -------------------------------------------------------------------------
-- Sahip kendi vitrin kartını günde beş kez açıyor. Onu saymak sayacı
-- anlamsız kılardı.
-- =========================================================================

-- 1 · TEKİL İZLEYİCİ TABLOSU -------------------------------------------------

create table if not exists public.vitrin_goruntulenmeleri (
  vehicle_plate text        not null references public.vehicles(plate_number) on delete cascade,
  -- 'u:<uuid>' ya da 'a:<rastgele>'. Birincil anahtar tekilleştirmenin
  -- kendisi: aynı izleyici aynı araç için ikinci kez satır açamıyor.
  izleyici      text        not null,
  ilk_goruldu   timestamptz not null default now(),
  primary key (vehicle_plate, izleyici)
);

create index if not exists vitrin_goruntulenme_plaka_idx
  on public.vitrin_goruntulenmeleri (vehicle_plate);

-- Tablo istemciye tamamen kapalı: satırında PLAKA var ve plaka üründe
-- bilerek gizleniyor. Ayrıca kimin neye baktığı okunabilir olsaydı
-- izleyici mahremiyeti de kalmazdı.
alter table public.vitrin_goruntulenmeleri enable row level security;
revoke all on public.vitrin_goruntulenmeleri from public;
revoke all on public.vitrin_goruntulenmeleri from anon, authenticated;
grant  all on public.vitrin_goruntulenmeleri to service_role;

-- 2 · SAYACI TETİKLEYİCİ YAZIYOR ---------------------------------------------
-- `favorite_count` ile aynı kalıp: sayı denormalize tutuluyor ki vitrin
-- listesi her satır için ayrıca count(*) çalıştırmasın. Yüz binlerce
-- kullanıcı hedefinde bu fark büyük.

create or replace function public._vitrin_goruntulenme_say()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  update public.listings
  set views_count = coalesce(views_count, 0) + 1
  where vehicle_plate = new.vehicle_plate and status = 'active';
  return null;
end;
$$;

drop trigger if exists vitrin_goruntulenme_sayaci on public.vitrin_goruntulenmeleri;
create trigger vitrin_goruntulenme_sayaci
  after insert on public.vitrin_goruntulenmeleri
  for each row execute function public._vitrin_goruntulenme_say();

-- 3 · GÖRÜNTÜLENME KAYDET ----------------------------------------------------

create or replace function public.vitrin_goruntulendi(p_pin text, p_anon_kimlik text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_plaka    text;
  v_sahip    uuid;
  v_izleyici text;
  v_yeni     integer := 0;   -- `get diagnostics ... row_count` TAMSAYI döndürüyor
begin
  select plate_number, user_id into v_plaka, v_sahip
  from public.vehicles where pin_code = upper(btrim(coalesce(p_pin, '')));

  if v_plaka is null then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  -- Araç sahibi kendi aracını saydırmıyor.
  if v_uid is not null and v_sahip = v_uid then
    return jsonb_build_object('basarili', true, 'sayildi', false);
  end if;

  -- ⚠ KİMLİĞİ SUNUCU BELİRLİYOR. Oturum varsa istemciden gelen değer YOK
  -- SAYILIYOR; aksi hâlde başkasının kimliğiyle görüntülenme yazılabilirdi.
  if v_uid is not null then
    v_izleyici := 'u:' || v_uid::text;
  else
    -- Ziyaretçi kimliği yoksa tekilleştirme yapılamıyor; saymamak,
    -- yanlış saymaktan iyi.
    if coalesce(btrim(p_anon_kimlik), '') = '' then
      return jsonb_build_object('basarili', true, 'sayildi', false);
    end if;
    -- Uzunluk sınırı: tablo şişirme denemesine karşı.
    v_izleyici := 'a:' || left(btrim(p_anon_kimlik), 64);
  end if;

  insert into public.vitrin_goruntulenmeleri (vehicle_plate, izleyici)
  values (v_plaka, v_izleyici)
  on conflict (vehicle_plate, izleyici) do nothing;

  get diagnostics v_yeni = row_count;

  -- `on conflict do nothing` ile satır eklenmediyse row_count 0: yani bu
  -- izleyici bu aracı ZATEN görmüş, tekrar sayılmıyor.
  return jsonb_build_object('basarili', true, 'sayildi', v_yeni > 0);
end;
$$;

-- 4 · YETKİLER ---------------------------------------------------------------
-- ⚠ İKİ REVOKE BİRDEN: `from public` tek başına yetmiyor.
-- Fonksiyon anon'a AÇIK ve olması gereken bu: vitrin kamuya açık, ziyaretçi
-- görüntülemesi de sayılıyor.

revoke all on function public.vitrin_goruntulendi(text, text) from public;
revoke all on function public.vitrin_goruntulendi(text, text) from anon, authenticated;
grant execute on function public.vitrin_goruntulendi(text, text) to anon, authenticated;

revoke all on function public._vitrin_goruntulenme_say() from public, anon, authenticated;

-- 5 · MEVCUT SAYAÇLARI GERÇEK VERİYLE EŞİTLE ---------------------------------
-- `views_count` bugüne kadar hiç yazılmadı (canlıda toplam 0). Tabloda da
-- kayıt yok; yine de sayacı kaynağıyla eşitlemek, ileride bir tutarsızlık
-- olursa bu satırın tekrar çalıştırılabilir olmasını sağlıyor.
update public.listings l
set views_count = (
  select count(*) from public.vitrin_goruntulenmeleri g
  where g.vehicle_plate = l.vehicle_plate
);
