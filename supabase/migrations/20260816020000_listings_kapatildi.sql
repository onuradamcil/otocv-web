-- =========================================================================
-- ⚠ GÜVENLİK: `listings` TABLOSU ZİYARETÇİYE TAMAMEN AÇIK
--
-- ⚠⚠ BU DOSYA HENÜZ CANLIYA UYGULANMADI — ürün sahibinin onayı bekleniyor.
--    Uygulama sırası ÖNEMLİ, en altta yazılı.
--
-- -------------------------------------------------------------------------
-- BULUNAN — ölçüldü, varsayılmadı
-- -------------------------------------------------------------------------
-- Politika:  "Herkes ilanları görebilir"  SELECT  rol PUBLIC  USING (true)
--
-- Anon anahtarıyla (istemci paketinin içinde, herkese açık) yapılan gerçek
-- bir sorgu şunları döndürdü:
--
--   okunabilen satır : 3
--   sütunlar         : id, vehicle_plate, user_id, title, description,
--                      price, city, district, tramer_amount, status,
--                      views_count, created_at, updated_at, is_featured,
--                      is_urgent, is_trade_in, previous_price,
--                      neighborhood, favorite_count, contact_phone
--   price dolu satır : 1  (100000)
--   vehicle_plate    : 3/3 satırda
--
-- Bu, ürünün İKİ temel kısıtını birden deliyor:
--   · PLAKA kişisel veri sayılıyor ve arayüzde gizleniyor (testlerle
--     korunuyor) — ama REST üzerinden doğrudan alınabiliyor.
--   · ARAÇ FİYATI hukuki sebeple hiçbir yerde görünmemeli; `price` sütunu
--     okunabiliyor.
--
-- `vitrin_listesi` RPC'si tam da bu denetimi yapmak için yazılmıştı: plakayı
-- yalnızca sahibine döndürüyor, fiyatı hiç döndürmüyor. Ama TABLONUN KENDİSİ
-- açık kaldığı için RPC atlanabiliyordu.
--
-- -------------------------------------------------------------------------
-- YOLDA BULUNAN İKİNCİ HATA — SESSİZ BAŞARISIZLIK
-- -------------------------------------------------------------------------
-- `publishVehicleListing` şöyle çalışıyordu:
--   1. plakaya ait satırı SELECT ediyor (sahiplik filtresi YOK — genel
--      okuma politikası sayesinde başkasının satırını da görüyor)
--   2. bulduysa o id'yi UPDATE ediyor
--
-- Ama UPDATE, sahiplik politikasına (`auth.uid() = user_id`) tabi. Araç
-- DEVREDİLDİKTEN sonra satır hâlâ ESKİ sahibin üzerinde olduğu için:
--   · SELECT satırı buluyor
--   · UPDATE 0 satır etkiliyor
--   · Supabase HATA DÖNDÜRMÜYOR
--   · servis `{ success: true }` dönüyor
--
-- Yani devraldığınız aracı vitrine çıkarmaya çalışınca hiçbir şey olmuyor
-- ve ekran başarı diyor. Aşağıdaki RPC bunu da çözüyor: satır varsa
-- `user_id` yeni sahibe DEVRALINIYOR.
-- =========================================================================

-- 1 · VİTRİNE ÇIKARMA — SAHİPLİK SUNUCUDA DENETLENİYOR
create or replace function public.vitrin_yayinla(
  p_plaka     text,
  p_baslik    text,
  p_aciklama  text,
  p_il        text,
  p_ilce      text,
  p_tramer    numeric default 0,
  p_one_cikar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_sahip uuid;
  v_id    bigint;
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  -- Sahiplik ARAÇ üzerinden denetleniyor, ilan üzerinden değil. Sebep
  -- yukarıda: devir sonrası ilan satırı hâlâ eski sahipte olabiliyor.
  select user_id into v_sahip from public.vehicles
  where plate_number = upper(btrim(coalesce(p_plaka, '')));

  if not found then
    return jsonb_build_object('basarili', false, 'hata', 'arac_yok');
  end if;
  if v_sahip is distinct from v_uid then
    return jsonb_build_object('basarili', false, 'hata', 'sahip_degil');
  end if;

  if coalesce(btrim(p_baslik),'') = '' or coalesce(btrim(p_aciklama),'') = ''
     or coalesce(btrim(p_il),'') = '' or coalesce(btrim(p_ilce),'') = '' then
    return jsonb_build_object('basarili', false, 'hata', 'eksik_alan');
  end if;

  -- ⚠ `UNIQUE (vehicle_plate)` KOŞULSUZ: plaka başına yalnızca BİR satır
  -- olabiliyor, durumu ne olursa olsun. O yüzden duruma bakılmadan aranıyor.
  select id into v_id from public.listings
  where vehicle_plate = upper(btrim(p_plaka));

  if v_id is not null then
    update public.listings set
      user_id       = v_uid,          -- devir sonrası sahiplik devralınıyor
      title         = btrim(p_baslik),
      description   = btrim(p_aciklama),
      city          = p_il,
      district      = p_ilce,
      tramer_amount = coalesce(p_tramer, 0),
      is_featured   = coalesce(p_one_cikar, false),
      status        = 'active',
      updated_at    = now()
    where id = v_id;
  else
    insert into public.listings
      (vehicle_plate, user_id, title, description, city, district,
       tramer_amount, is_featured, status)
    values
      (upper(btrim(p_plaka)), v_uid, btrim(p_baslik), btrim(p_aciklama), p_il, p_ilce,
       coalesce(p_tramer, 0), coalesce(p_one_cikar, false), 'active')
    returning id into v_id;
  end if;

  -- ⚠ `price` HİÇ YAZILMIYOR ve bu bilinçli: araca ait fiyat üründe yok.
  return jsonb_build_object('basarili', true, 'id', v_id);
end;
$$;

-- 2 · VİTRİNDEN KALDIRMA — SİLMİYOR, DURUM DEĞİŞTİRİYOR
-- Kalıcı silme veri kaybıydı: görüntülenme ve favori sayaçları da gidiyordu.
create or replace function public.vitrin_kaldir(p_plaka text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_sahip uuid;
  v_adet  integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  select user_id into v_sahip from public.vehicles
  where plate_number = upper(btrim(coalesce(p_plaka, '')));

  if not found then
    return jsonb_build_object('basarili', false, 'hata', 'arac_yok');
  end if;
  if v_sahip is distinct from v_uid then
    return jsonb_build_object('basarili', false, 'hata', 'sahip_degil');
  end if;

  update public.listings
  set status = 'pasif', updated_at = now()
  where vehicle_plate = upper(btrim(p_plaka)) and status = 'active';

  get diagnostics v_adet = row_count;
  return jsonb_build_object('basarili', true, 'kaldirilan', v_adet);
end;
$$;

-- ⚠ İKİ REVOKE BİRDEN: `from public` tek başına yetmiyor, anon ayrı grant
-- taşıyor. Bu tuzağa mesajlaşma RPC'lerinde ve `_bildirim_yaz`da düşülmüştü.
revoke all on function public.vitrin_yayinla(text,text,text,text,text,numeric,boolean) from public, anon;
grant execute on function public.vitrin_yayinla(text,text,text,text,text,numeric,boolean) to authenticated;

revoke all on function public.vitrin_kaldir(text) from public, anon;
grant execute on function public.vitrin_kaldir(text) to authenticated;

-- 3 · TABLO ZİYARETÇİYE KAPATILIYOR
--
-- Genel pazaryeri okuması `vitrin_listesi` RPC'sinden geçiyor (security
-- definer, RLS'e tabi değil) — vitrin bundan etkilenmiyor.
-- Sahibin kendi kaydını okuması: aşağıdaki politika + `vehicles` üzerinden
-- yapılan `select('*, listings(*)')` iç içe sorguları.
drop policy if exists "Herkes ilanları görebilir" on public.listings;

create policy "vitrin_kaydi_sahibine_gorunur"
  on public.listings for select
  to authenticated
  using (auth.uid() = user_id);

-- =========================================================================
-- UYGULAMA SIRASI — ÖNEMLİ
-- -------------------------------------------------------------------------
-- 1. ÖNCE bu migration uygulanır (RPC'ler oluşur, tablo kapanır).
-- 2. SONRA istemci `marketplaceService.js` üzerinden RPC'leri kullanmaya
--    başlar. Sıra ters olursa istemci var olmayan RPC'yi çağırır.
--
-- İki adım arasında vitrine çıkarma kısa süre çalışmaz. İstemci
-- değişikliği hazır; migration uygulanır uygulanmaz birlikte doğrulanacak:
--   · anon `listings` okuyamıyor mu
--   · vitrine çıkarma / kaldırma çalışıyor mu
--   · garaj ve vitrin listesi bozulmadı mı
-- =========================================================================
