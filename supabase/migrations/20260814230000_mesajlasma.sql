-- =========================================================================
-- KULLANICILAR ARASI MESAJLAŞMA
--
-- -------------------------------------------------------------------------
-- NİYE VAR
-- -------------------------------------------------------------------------
-- Araç detay sayfasında bir "Cep Telefonunu Göster" düğmesi vardı ve
-- arkasındaki numara uydurmaydı (bkz. 16-uydurma-veri.spec.js). Kaldırıldı,
-- ama kaldırılınca araç sahibine ulaşmanın HİÇBİR yolu kalmadı.
--
-- Telefon geri getirilmiyor: numara, sahibin kontrol edemediği kalıcı bir
-- kanal. Bir kez verildikten sonra geri alınamıyor, engellenemiyor,
-- kayıt altına alınamıyor. Plaka da tam bu gerekçeyle pazaryerinden ve
-- devir akışından kaldırılmıştı.
--
-- Mesajlaşma o kanalın platform içi karşılığı: sahip engelleyebiliyor,
-- şikayet edilebiliyor ve her şey kayıt altında.
--
-- -------------------------------------------------------------------------
-- KAPSAM KARARI
-- -------------------------------------------------------------------------
-- Ürün sahibinin kararı: aracın detay ekranına ulaşabilen HERKES mesaj
-- atabilir — vitrinden, PIN sorgusundan ya da paylaşılan bağlantıdan
-- gelmiş olması fark etmiyor. Dolayısıyla `konusma_baslat` vitrin kaydı
-- ARAMIYOR, yalnızca geçerli bir PIN arıyor.
--
-- Oturum şartı duruyor: `anon` mesaj atamıyor. Kimliksiz mesaj, engelleme
-- ve şikayeti anlamsız kılardı.
--
-- -------------------------------------------------------------------------
-- PLAKA İSTEMCİYE HİÇ GİTMİYOR
-- -------------------------------------------------------------------------
-- Konuşma satırı `vehicle_plate` tutuyor çünkü araç kimliği o. Ama tablo
-- istemciye kapalı ve RPC'ler dışarıya PIN veriyor. Favorilerde aynı hata
-- yapılmış ve düzeltilmişti (20260814220000); burada baştan doğru.
-- =========================================================================

-- 1 · KONUŞMALAR -------------------------------------------------------------

create table if not exists public.konusmalar (
  id            uuid primary key default gen_random_uuid(),
  vehicle_plate text        not null references public.vehicles(plate_number) on delete cascade,
  -- Konuşmayı başlatan (araç sahibi DEĞİL).
  baslatan_id   uuid        not null references auth.users(id) on delete cascade,
  -- Aracın o anki sahibi. Devir olursa yeni sahip bu konuşmayı görmemeli;
  -- o yüzden sahiplik konuşmaya YAZILIYOR, join ile okunmuyor.
  sahip_id      uuid        not null references auth.users(id) on delete cascade,
  olustu        timestamptz not null default now(),
  son_mesaj_at  timestamptz not null default now(),

  -- Aynı kişi aynı araç için ikinci bir konuşma açamaz.
  -- Bu yalnızca düzen değil, koruma: oran sınırı konmadığı için sınırsız
  -- konuşma açmak toplu taciz aracı olurdu. Tekillik onu kapatıyor.
  constraint konusma_tekil unique (vehicle_plate, baslatan_id),

  -- Kendi aracına mesaj atmak anlamsız.
  constraint konusma_kendine_degil check (baslatan_id <> sahip_id)
);

create index if not exists konusmalar_baslatan_idx on public.konusmalar (baslatan_id, son_mesaj_at desc);
create index if not exists konusmalar_sahip_idx    on public.konusmalar (sahip_id, son_mesaj_at desc);

-- 2 · MESAJLAR ---------------------------------------------------------------

create table if not exists public.mesajlar (
  id          uuid primary key default gen_random_uuid(),
  konusma_id  uuid        not null references public.konusmalar(id) on delete cascade,
  gonderen_id uuid        not null references auth.users(id) on delete cascade,
  govde       text        not null,
  olustu      timestamptz not null default now(),
  okundu_at   timestamptz,

  -- ENGELLEME BURADA UYGULANIYOR.
  -- Engellenen kullanıcı engellendiğini GÖRMÜYOR: mesajı gönderiliyor ve
  -- kendi ekranında duruyor, ama `teslim = false` olduğu için karşı tarafa
  -- hiç ulaşmıyor. Sebebi: "engellendiniz" demek, misilleme için ikinci
  -- hesap açmayı doğrudan teşvik ediyor.
  --
  -- Mesajın silinmek yerine saklanmasının sebebi şikayet: engellemeden
  -- sonra gelen mesajlar da incelemede kanıt.
  teslim      boolean     not null default true,

  constraint mesaj_govde_bos_degil check (length(btrim(govde)) between 1 and 2000)
);

create index if not exists mesajlar_konusma_idx on public.mesajlar (konusma_id, olustu);

-- 3 · ENGELLEMELER -----------------------------------------------------------

create table if not exists public.engellemeler (
  engelleyen_id uuid        not null references auth.users(id) on delete cascade,
  engellenen_id uuid        not null references auth.users(id) on delete cascade,
  olustu        timestamptz not null default now(),
  primary key (engelleyen_id, engellenen_id),
  constraint engel_kendine_degil check (engelleyen_id <> engellenen_id)
);

-- 4 · ŞİKAYETLER -------------------------------------------------------------

create table if not exists public.mesaj_sikayetleri (
  id             uuid primary key default gen_random_uuid(),
  konusma_id     uuid        not null references public.konusmalar(id) on delete cascade,
  sikayet_eden_id uuid       not null references auth.users(id) on delete cascade,
  sebep          text        not null,
  aciklama       text,
  olustu         timestamptz not null default now(),
  durum          text        not null default 'beklemede',

  constraint sikayet_sebep_gecerli check (sebep in ('taciz','dolandiricilik','spam','uygunsuz_icerik','diger')),
  constraint sikayet_durum_gecerli check (durum in ('beklemede','incelendi','kapatildi')),
  -- Aynı konuşma için aynı kişiden tek şikayet.
  constraint sikayet_tekil unique (konusma_id, sikayet_eden_id)
);

-- 5 · TABLOLAR İSTEMCİYE KAPALI ----------------------------------------------
-- Dördü de yalnızca RPC üzerinden kullanılıyor. Doğrudan erişim açık olsaydı
-- `konusmalar` üzerinden plaka okunabilirdi.

alter table public.konusmalar        enable row level security;
alter table public.mesajlar          enable row level security;
alter table public.engellemeler      enable row level security;
alter table public.mesaj_sikayetleri enable row level security;

revoke all on public.konusmalar        from public;
revoke all on public.mesajlar          from public;
revoke all on public.engellemeler      from public;
revoke all on public.mesaj_sikayetleri from public;

revoke all on public.konusmalar        from anon, authenticated;
revoke all on public.mesajlar          from anon, authenticated;
revoke all on public.engellemeler      from anon, authenticated;
revoke all on public.mesaj_sikayetleri from anon, authenticated;

grant all on public.konusmalar        to service_role;
grant all on public.mesajlar          to service_role;
grant all on public.engellemeler      to service_role;
grant all on public.mesaj_sikayetleri to service_role;

-- ⚠ REALTIME İSTİSNASI
-- Anlık teslim için istemci `mesajlar` tablosunu dinliyor. Realtime, RLS
-- politikalarına uyuyor: politikası olmayan tabloda hiçbir satır yayılmaz.
-- Bu yüzden `mesajlar` için SADECE SELECT politikası açılıyor — insert ve
-- update yine yalnızca RPC'den geçiyor.
create policy mesaj_oku_taraf on public.mesajlar
  for select to authenticated
  using (
    exists (
      select 1 from public.konusmalar k
      where k.id = mesajlar.konusma_id
        and (k.baslatan_id = auth.uid() or k.sahip_id = auth.uid())
    )
    -- Teslim edilmemiş mesajı yalnızca GÖNDEREN görüyor.
    and (teslim or gonderen_id = auth.uid())
  );

grant select on public.mesajlar to authenticated;

-- 6 · KONUŞMA BAŞLAT ---------------------------------------------------------

create or replace function public.konusma_baslat(p_pin text, p_govde text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_plaka   text;
  v_sahip   uuid;
  v_konusma uuid;
  v_govde   text := btrim(coalesce(p_govde, ''));
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  if length(v_govde) = 0 or length(v_govde) > 2000 then
    return jsonb_build_object('basarili', false, 'hata', 'govde_gecersiz');
  end if;

  select plate_number, user_id into v_plaka, v_sahip
  from vehicles where pin_code = upper(btrim(p_pin));

  if v_plaka is null then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  -- Sahipsiz araç: devredilmiş ya da hesabı kapanmış. Yazacak kimse yok.
  if v_sahip is null then
    return jsonb_build_object('basarili', false, 'hata', 'sahipsiz');
  end if;

  if v_sahip = v_uid then
    return jsonb_build_object('basarili', false, 'hata', 'kendi_aracin');
  end if;

  -- Araç sahibi bu kullanıcıyı daha önce engellemişse yeni konuşma HİÇ
  -- açılmıyor. Engellenen bunu görmüyor: yanıt başarılı dönüyor.
  if exists (select 1 from engellemeler where engelleyen_id = v_sahip and engellenen_id = v_uid) then
    return jsonb_build_object('basarili', true, 'engellendi', true);
  end if;

  insert into konusmalar (vehicle_plate, baslatan_id, sahip_id)
  values (v_plaka, v_uid, v_sahip)
  on conflict (vehicle_plate, baslatan_id) do update set son_mesaj_at = now()
  returning id into v_konusma;

  insert into mesajlar (konusma_id, gonderen_id, govde)
  values (v_konusma, v_uid, v_govde);

  update konusmalar set son_mesaj_at = now() where id = v_konusma;

  -- Bildirim: araç sahibi sayfada değilken de haberi olsun.
  insert into notifications (user_id, title, message, type)
  values (v_sahip, 'Aracınız için yeni mesaj',
          'Bir kullanıcı aracınız hakkında mesaj gönderdi.', 'mesaj');

  return jsonb_build_object('basarili', true, 'konusma_id', v_konusma);
end;
$$;

-- 7 · MESAJ GÖNDER -----------------------------------------------------------

create or replace function public.mesaj_gonder(p_konusma_id uuid, p_govde text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_k      record;
  v_karsi  uuid;
  v_teslim boolean := true;
  v_govde  text := btrim(coalesce(p_govde, ''));
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  if length(v_govde) = 0 or length(v_govde) > 2000 then
    return jsonb_build_object('basarili', false, 'hata', 'govde_gecersiz');
  end if;

  select * into v_k from konusmalar where id = p_konusma_id;

  -- Taraf değilse konuşmanın VARLIĞI bile sızmamalı: aynı hata dönüyor.
  if v_k.id is null or (v_k.baslatan_id <> v_uid and v_k.sahip_id <> v_uid) then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  v_karsi := case when v_k.baslatan_id = v_uid then v_k.sahip_id else v_k.baslatan_id end;

  -- Karşı taraf engellemişse mesaj kaydediliyor ama teslim edilmiyor.
  if exists (select 1 from engellemeler where engelleyen_id = v_karsi and engellenen_id = v_uid) then
    v_teslim := false;
  end if;

  insert into mesajlar (konusma_id, gonderen_id, govde, teslim)
  values (p_konusma_id, v_uid, v_govde, v_teslim);

  if v_teslim then
    update konusmalar set son_mesaj_at = now() where id = p_konusma_id;
    insert into notifications (user_id, title, message, type)
    values (v_karsi, 'Yeni mesaj', 'Bir konuşmanızda yeni mesaj var.', 'mesaj');
  end if;

  return jsonb_build_object('basarili', true);
end;
$$;

-- 8 · KONUŞMALARIM -----------------------------------------------------------

create or replace function public.konusmalarim()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(x order by x->>'son_mesaj_at' desc)
    from (
      select jsonb_build_object(
        'konusma_id',  k.id,
        -- PLAKA DEĞİL, PIN. Araç kimliği dışarıya hep PIN ile veriliyor.
        'pin_code',    v.pin_code,
        'brand',       v.brand,
        'model',       v.model,
        'year',        v.year,
        'image_url',   v.image_url,
        'sahibi_miyim', (k.sahip_id = v_uid),
        -- Karşı tarafın YALNIZCA adı. Soyadı, e-posta ve telefon
        -- gösterilmiyor: konuşmayı yürütmek için ad yeterli.
        'karsi_taraf', coalesce(
          nullif(btrim(p.first_name), ''),
          case when k.sahip_id = v_uid then 'Bir kullanıcı' else 'Araç sahibi' end
        ),
        'son_mesaj_at', k.son_mesaj_at,
        'son_mesaj', (
          select m.govde from mesajlar m
          where m.konusma_id = k.id and (m.teslim or m.gonderen_id = v_uid)
          order by m.olustu desc limit 1
        ),
        'okunmamis', (
          select count(*) from mesajlar m
          where m.konusma_id = k.id
            and m.gonderen_id <> v_uid
            and m.teslim
            and m.okundu_at is null
        ),
        'engelledim', exists (
          select 1 from engellemeler e
          where e.engelleyen_id = v_uid
            and e.engellenen_id = case when k.sahip_id = v_uid then k.baslatan_id else k.sahip_id end
        )
      ) as x
      from konusmalar k
      join vehicles v on v.plate_number = k.vehicle_plate
      left join profiles p
        on p.id = case when k.sahip_id = v_uid then k.baslatan_id else k.sahip_id end
      where k.baslatan_id = v_uid or k.sahip_id = v_uid
    ) t
  ), '[]'::jsonb);
end;
$$;

-- 9 · KONUŞMA DETAYI ---------------------------------------------------------

create or replace function public.mesajlar_getir(p_konusma_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_k   record;
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  select * into v_k from konusmalar where id = p_konusma_id;
  if v_k.id is null or (v_k.baslatan_id <> v_uid and v_k.sahip_id <> v_uid) then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  return jsonb_build_object(
    'basarili', true,
    'konusma', (
      select jsonb_build_object(
        'konusma_id',   v_k.id,
        'pin_code',     v.pin_code,
        'brand',        v.brand,
        'model',        v.model,
        'year',         v.year,
        'image_url',    v.image_url,
        'sahibi_miyim', (v_k.sahip_id = v_uid),
        'karsi_taraf',  coalesce(
          nullif(btrim(p.first_name), ''),
          case when v_k.sahip_id = v_uid then 'Bir kullanıcı' else 'Araç sahibi' end
        ),
        'engelledim', exists (
          select 1 from engellemeler e
          where e.engelleyen_id = v_uid
            and e.engellenen_id = case when v_k.sahip_id = v_uid then v_k.baslatan_id else v_k.sahip_id end
        ),
        'sikayet_ettim', exists (
          select 1 from mesaj_sikayetleri s
          where s.konusma_id = v_k.id and s.sikayet_eden_id = v_uid
        )
      )
      from vehicles v
      left join profiles p
        on p.id = case when v_k.sahip_id = v_uid then v_k.baslatan_id else v_k.sahip_id end
      where v.plate_number = v_k.vehicle_plate
    ),
    'mesajlar', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',      m.id,
        'benim',   (m.gonderen_id = v_uid),
        'govde',   m.govde,
        'olustu',  m.olustu
      ) order by m.olustu)
      from mesajlar m
      where m.konusma_id = p_konusma_id
        and (m.teslim or m.gonderen_id = v_uid)
    ), '[]'::jsonb)
  );
end;
$$;

-- 10 · OKUNDU İŞARETLE -------------------------------------------------------

create or replace function public.okundu_isaretle(p_konusma_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  if not exists (
    select 1 from konusmalar
    where id = p_konusma_id and (baslatan_id = v_uid or sahip_id = v_uid)
  ) then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  update mesajlar set okundu_at = now()
  where konusma_id = p_konusma_id and gonderen_id <> v_uid and okundu_at is null;

  return jsonb_build_object('basarili', true);
end;
$$;

-- 11 · OKUNMAMIŞ SAYACI (başlıktaki rozet) -----------------------------------

create or replace function public.okunmamis_mesaj_sayisi()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(count(*), 0)::integer
  from mesajlar m
  join konusmalar k on k.id = m.konusma_id
  where (k.baslatan_id = auth.uid() or k.sahip_id = auth.uid())
    and m.gonderen_id <> auth.uid()
    and m.teslim
    and m.okundu_at is null;
$$;

-- 12 · ENGELLEME -------------------------------------------------------------

create or replace function public.konusma_engelle(p_konusma_id uuid, p_kaldir boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_k     record;
  v_karsi uuid;
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  select * into v_k from konusmalar where id = p_konusma_id;
  if v_k.id is null or (v_k.baslatan_id <> v_uid and v_k.sahip_id <> v_uid) then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  v_karsi := case when v_k.baslatan_id = v_uid then v_k.sahip_id else v_k.baslatan_id end;

  if p_kaldir then
    delete from engellemeler where engelleyen_id = v_uid and engellenen_id = v_karsi;
    return jsonb_build_object('basarili', true, 'engelli', false);
  end if;

  insert into engellemeler (engelleyen_id, engellenen_id)
  values (v_uid, v_karsi)
  on conflict do nothing;

  return jsonb_build_object('basarili', true, 'engelli', true);
end;
$$;

-- 13 · ŞİKAYET ---------------------------------------------------------------

create or replace function public.konusma_sikayet_et(p_konusma_id uuid, p_sebep text, p_aciklama text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('basarili', false, 'hata', 'oturum_yok');
  end if;

  if p_sebep not in ('taciz','dolandiricilik','spam','uygunsuz_icerik','diger') then
    return jsonb_build_object('basarili', false, 'hata', 'sebep_gecersiz');
  end if;

  if not exists (
    select 1 from konusmalar
    where id = p_konusma_id and (baslatan_id = v_uid or sahip_id = v_uid)
  ) then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  insert into mesaj_sikayetleri (konusma_id, sikayet_eden_id, sebep, aciklama)
  values (p_konusma_id, v_uid, p_sebep, nullif(btrim(coalesce(p_aciklama,'')), ''))
  on conflict (konusma_id, sikayet_eden_id) do nothing;

  return jsonb_build_object('basarili', true);
end;
$$;

-- 14 · YETKİLER --------------------------------------------------------------
-- Hepsi yalnızca oturum açmış kullanıcıya. Kimliksiz mesaj, engelleme ve
-- şikayeti anlamsız kılardı.
--
-- ⚠ İKİ REVOKE BİRDEN ŞART — BU DOSYADA BİR KEZ ATLANDI VE ÖLÇÜMLE YAKALANDI.
-- Yalnızca `from public` yazıldığında sekiz fonksiyonun sekizi de `anon`'a
-- açık kaldı: Supabase şemadaki fonksiyonlara `anon` ve `authenticated`
-- rollerine AYRI yetki veriyor ve `public`ten revoke etmek onları
-- düşürmüyor. Aynı ders `devir_talep_et` ve `favoriler` migration'larında
-- da alınmıştı.
--
-- Doğrulama: `role_routine_grants`'ta grantee='anon' satır sayısı 0 olmalı.

revoke all on function public.konusma_baslat(text, text)            from anon;
revoke all on function public.mesaj_gonder(uuid, text)              from anon;
revoke all on function public.konusmalarim()                        from anon;
revoke all on function public.mesajlar_getir(uuid)                  from anon;
revoke all on function public.okundu_isaretle(uuid)                 from anon;
revoke all on function public.okunmamis_mesaj_sayisi()              from anon;
revoke all on function public.konusma_engelle(uuid, boolean)        from anon;
revoke all on function public.konusma_sikayet_et(uuid, text, text)  from anon;

revoke all on function public.konusma_baslat(text, text)            from public;
revoke all on function public.mesaj_gonder(uuid, text)              from public;
revoke all on function public.konusmalarim()                        from public;
revoke all on function public.mesajlar_getir(uuid)                  from public;
revoke all on function public.okundu_isaretle(uuid)                 from public;
revoke all on function public.okunmamis_mesaj_sayisi()              from public;
revoke all on function public.konusma_engelle(uuid, boolean)        from public;
revoke all on function public.konusma_sikayet_et(uuid, text, text)  from public;

grant execute on function public.konusma_baslat(text, text)           to authenticated;
grant execute on function public.mesaj_gonder(uuid, text)             to authenticated;
grant execute on function public.konusmalarim()                       to authenticated;
grant execute on function public.mesajlar_getir(uuid)                 to authenticated;
grant execute on function public.okundu_isaretle(uuid)                to authenticated;
grant execute on function public.okunmamis_mesaj_sayisi()             to authenticated;
grant execute on function public.konusma_engelle(uuid, boolean)       to authenticated;
grant execute on function public.konusma_sikayet_et(uuid, text, text) to authenticated;

-- 15 · REALTIME --------------------------------------------------------------
-- Anlık teslim: istemci kendi konuşmalarındaki yeni satırları dinliyor.
-- Yayın RLS'e uyuyor, yani 5. bölümdeki SELECT politikası neyi gösteriyorsa
-- Realtime de onu yayıyor — teslim edilmemiş mesaj karşı tarafa DÜŞMÜYOR.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mesajlar'
  ) then
    alter publication supabase_realtime add table public.mesajlar;
  end if;
end $$;
