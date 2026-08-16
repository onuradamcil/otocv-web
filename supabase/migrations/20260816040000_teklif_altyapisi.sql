-- =========================================================================
-- TEKLİF TALEBİ ALTYAPISI — UYARIDAN GELİRE
--
-- -------------------------------------------------------------------------
-- NİYE VAR
-- -------------------------------------------------------------------------
-- Ürün bugün "sigortan bitiyor" diyor ve kullanıcıyı kendi düzenleme
-- ekranına gönderiyor: sorunu haber verip çözümü kullanıcıya bırakıyor.
-- Gelir kapısı tam o boşlukta.
--
-- Kapılar aslında ZATEN VAR ama hepsi boş — ölçüldü:
--   MarketplaceView.jsx:456  "Sigorta & Kasko → Teklif Al"  -> ComingSoon
--   GarageScreen.jsx:293     "Hemen Teklif Al"              -> sadece toast
--   PolicyOfferModal.jsx:111 "En Uygun Teklifi Gör"         -> sadece toast
--   NotificationContext:167  poliçe bildirimi               -> hedef_yol YOK
--
-- -------------------------------------------------------------------------
-- ⚠ PARTNER YOK — BU YÜZDEN "TALEP" TOPLUYORUZ, "TEKLİF" GÖSTERMİYORUZ
-- -------------------------------------------------------------------------
-- Anlaşmalı sigorta ortağı henüz yok. Sahte prim, sahte firma adı ya da
-- "en uygun teklif" iddiası göstermek, bu projede aylardır temizlenen
-- uydurma veri kusurunun birebir aynısı olurdu (uydurma plaka, uydurma
-- şasi, "TÜVTÜRK ONAYLI", hep sıfır gösteren sayaçlar...).
--
-- Bu yüzden tablo bir TEKLİF tablosu değil, bir TALEP tablosu: kullanıcının
-- ilgisini kaydediyor. İki işe yarıyor:
--   1. Kullanıcıya dürüst bir yol açıyor ("ortak gelince haber verelim").
--   2. Sigorta şirketiyle komisyon pazarlığına ÖLÇÜLMÜŞ TALEPLE oturmayı
--      sağlıyor — "ayda şu kadar kaskosu dolan kullanıcı teklif istedi"
--      demek, sıfırdan komisyon istemekten bambaşka bir konum.
--
-- -------------------------------------------------------------------------
-- MODEL: YÖNLENDİRME — KİŞİSEL VERİ AKTARILMIYOR
-- -------------------------------------------------------------------------
-- Ürün sahibinin kararı. Kullanıcı partnere takip parametresiyle
-- gönderilecek; ad/telefon gibi veriler ÜÇÜNCÜ TARAFA AKTARILMIYOR.
-- Lead formu modeli KVKK'da açık rıza, ayrı aydınlatma metni ve veri
-- işleyen sözleşmesi gerektirir — bilerek kapsam dışı.
-- =========================================================================

create table if not exists public.teklif_talepleri (
  id            bigint generated always as identity primary key,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  vehicle_plate text        not null references public.vehicles(plate_number) on delete cascade,

  -- Hangi belge için istendi. `bakim` ve `muayene` şimdiden tanımlı:
  -- altyapı tek dikeyle sınırlı değil, ekranları sonraki turda geliyor.
  tur           text        not null check (tur in ('trafik', 'kasko', 'muayene', 'bakim')),

  -- ⚠ TALEP ANINDAKİ DEĞER. Sonradan hesaplanamaz: poliçe yenilenince
  -- tarih değişiyor ve "kullanıcı kaç gün kala ilgilendi" bilgisi kayboluyor.
  -- Dönüşüm analizinin en değerli alanı bu — hangi eşikte insanlar
  -- harekete geçiyor?
  kalan_gun     integer,

  -- HANGİ KAPI ÇALIŞIYOR. Ürün beş ayrı yerden uyarı veriyor; hangisinin
  -- talebe dönüştüğünü bilmeden hangi yüzeye yatırım yapılacağı bilinemez.
  kaynak        text        not null check (kaynak in ('panel', 'garaj_serit', 'police_modal', 'bildirim', 'anasayfa')),

  -- Partner yokken null. Ortak geldiğinde hangi ortağa yönlendirildiği.
  ortak_kodu    text,

  durum         text        not null default 'talep'
                            check (durum in ('talep', 'yonlendirildi', 'donusdu', 'iptal')),

  olustu        timestamptz not null default now()
);

create index if not exists teklif_talepleri_kullanici_idx
  on public.teklif_talepleri (user_id, olustu desc);

-- Tekilleştirme sorgusunun (aynı araç+tür 24 saatte bir) dayandığı indeks.
create index if not exists teklif_talepleri_arac_tur_idx
  on public.teklif_talepleri (vehicle_plate, tur, olustu desc);

-- -------------------------------------------------------------------------
-- RLS — `satin_almalar` deseninin aynısı
-- -------------------------------------------------------------------------
-- Yalnızca SELECT politikası var ve yalnızca kendi kayıtlarına. INSERT /
-- UPDATE / DELETE politikası BİLEREK YOK: istemci bu tabloya yazamıyor,
-- yazma tek kapıdan (aşağıdaki RPC) geçiyor. Böylece sahiplik denetimi
-- atlanamıyor.
alter table public.teklif_talepleri enable row level security;

drop policy if exists "teklif_talebi_oku_kendi" on public.teklif_talepleri;
create policy "teklif_talebi_oku_kendi"
  on public.teklif_talepleri for select
  to authenticated
  using (auth.uid() = user_id);

-- =========================================================================
-- TALEP OLUŞTURMA — SAHİPLİK SUNUCUDA DENETLENİYOR
-- =========================================================================
create or replace function public.teklif_talebi_olustur(
  p_plaka  text,
  p_tur    text,
  p_kaynak text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_plaka     text := upper(btrim(coalesce(p_plaka, '')));
  v_arac      public.vehicles;
  v_bitis     date;
  v_kalan     integer;
  v_son       timestamptz;
  v_id        bigint;
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  if p_tur not in ('trafik', 'kasko', 'muayene', 'bakim') then
    return jsonb_build_object('basarili', false, 'hata', 'gecersiz_tur');
  end if;
  if p_kaynak not in ('panel', 'garaj_serit', 'police_modal', 'bildirim', 'anasayfa') then
    return jsonb_build_object('basarili', false, 'hata', 'gecersiz_kaynak');
  end if;

  select * into v_arac from public.vehicles where plate_number = v_plaka;
  if not found then
    return jsonb_build_object('basarili', false, 'hata', 'arac_yok');
  end if;

  -- ⚠ Sahiplik ARAÇ üzerinden. Vitrin RPC'lerindeki dersin aynısı: ilan ya
  -- da talep üzerinden denetlemek, devir sonrası sessizce yanlış çalışıyor.
  if v_arac.user_id is distinct from v_uid then
    return jsonb_build_object('basarili', false, 'hata', 'sahip_degil');
  end if;

  -- TEKİLLEŞTİRME: aynı araç + aynı tür için 24 saatte tek kayıt.
  -- Yoksa düğmeye üç kez basan bir kullanıcı talebi üçe katlıyor ve
  -- partnere gösterilecek sayı şişiyor. Şişmiş bir sayıyla pazarlığa
  -- oturmak, sayının kendisinden daha kötü.
  select olustu into v_son
  from public.teklif_talepleri
  where vehicle_plate = v_plaka and tur = p_tur
  order by olustu desc limit 1;

  if v_son is not null and v_son > now() - interval '24 hours' then
    return jsonb_build_object('basarili', true, 'yeni', false, 'hata', 'zaten_var');
  end if;

  -- Kalan gün SUNUCUDA hesaplanıyor; istemciden gelen sayıya güvenilmiyor.
  v_bitis := case p_tur
    when 'trafik'  then v_arac.traffic_insurance_end_date
    when 'kasko'   then v_arac.kasko_end_date
    when 'muayene' then v_arac.inspection_end_date
    else null
  end;
  v_kalan := case when v_bitis is null then null else (v_bitis - current_date) end;

  insert into public.teklif_talepleri (user_id, vehicle_plate, tur, kalan_gun, kaynak)
  values (v_uid, v_plaka, p_tur, v_kalan, p_kaynak)
  returning id into v_id;

  return jsonb_build_object('basarili', true, 'yeni', true, 'id', v_id, 'kalan_gun', v_kalan);
end;
$$;

-- ⚠ İKİ REVOKE BİRDEN: `from public` tek başına yetmiyor, `anon` ayrı grant
-- taşıyor. Bu tuzağa `_bildirim_yaz`da düşülmüştü ve anon'a açık kalmıştı.
revoke all on function public.teklif_talebi_olustur(text, text, text) from public;
revoke all on function public.teklif_talebi_olustur(text, text, text) from anon;
grant execute on function public.teklif_talebi_olustur(text, text, text) to authenticated;
