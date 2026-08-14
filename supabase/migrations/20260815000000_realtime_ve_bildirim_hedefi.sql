-- =========================================================================
-- CANLI TESLİMAT ONARIMI + BİLDİRİM HEDEFİ
--
-- -------------------------------------------------------------------------
-- 1 · MESAJ REALTIME'I HİÇ ÇALIŞMIYORDU — POLİTİKA KENDİ KENDİNİ KİLİTLİYOR
-- -------------------------------------------------------------------------
-- `mesajlar` üzerindeki `mesaj_oku_taraf` politikası çapraz tabloya
-- başvuruyordu:
--
--     EXISTS (SELECT 1 FROM konusmalar k WHERE k.id = mesajlar.konusma_id ...)
--
-- Ama `konusmalar` istemciye BİLEREK kapalı: tablo `vehicle_plate` tutuyor
-- ve plaka üründe gizli. RLS ifadeleri sorguyu ATAN rolün yetkisiyle
-- değerlendirildiği için politika patlıyordu. `authenticated` rolü taklit
-- edilerek ölçüldü:
--
--     ERROR: 42501: permission denied for table konusmalar
--     HINT:  GRANT SELECT ON public.konusmalar TO authenticated;
--
-- ⚠ İPUCUNDAKİ GRANT UYGULANMADI. O grant plakayı istemciye açardı —
-- pazaryerinden ve devir akışından tam bu gerekçeyle kaldırılmıştı.
--
-- Realtime RLS'e uyduğu için hiçbir olay yayılmıyordu; kullanıcının yeni
-- mesajı görmek için sayfayı yenilemesinin sebebi buydu.
--
-- Çözüm: çapraz tablo başvurusu `security definer` bir yardımcıya taşındı.
-- Fonksiyon sahibinin yetkisiyle çalıştığı için `konusmalar`ı okuyabiliyor;
-- istemciye hiçbir yeni erişim açılmıyor.
--
-- Denormalizasyon (taraf kimliklerini `mesajlar`a kopyalamak) da çözerdi
-- ama backfill gerektiriyor ve canlı veritabanının yedeği yok.
--
-- -------------------------------------------------------------------------
-- 2 · ⚠ ONARIMIN YAN ETKİSİ: `teslim` SÜTUNU ENGELLEMEYİ ELE VERİYORDU
-- -------------------------------------------------------------------------
-- Politika patladığı sürece istemci `mesajlar`dan hiçbir şey okuyamıyordu.
-- Onarılınca okuyabilir hâle geldi — ve `authenticated` TÜM sütunlarda
-- SELECT yetkisine sahipti.
--
-- `teslim`, engelleme durumunu taşıyor: engellenen kullanıcının kendi
-- mesajları `teslim = false`. Politika kullanıcıya kendi mesajlarını
-- gösterdiği için, engellenen kişi API'yi doğrudan sorgulayıp
-- ENGELLENDİĞİNİ ANLAYABİLİRDİ. Gölge engellemenin tüm amacı buydu.
--
-- Bu yüzden yetki sütun düzeyine indirildi. İki şey ölçülerek doğrulandı:
--   (a) RLS ifadesinin `teslim`e başvurması sütun yetkisi olmadan ÇALIŞIYOR
--       (politika sistem tarafından değerlendiriliyor, kullanıcı sorgusu
--       gibi değil) — 16 satır döndü.
--   (b) Realtime sütun yetkisine UYUYOR. Canlı abonelikle ölçülen payload:
--       ["id","govde","olustu","okundu_at","konusma_id","gonderen_id"]
--       `teslim` payload'da YOK.
--
-- -------------------------------------------------------------------------
-- 3 · BİLDİRİMLER TIKLANINCA HEP AYNI YERE GİDİYORDU
-- -------------------------------------------------------------------------
-- Bildirimde hedefi taşıyan bir alan yoktu. `vehicle_id` kolonu her satırda
-- NULL ve tipi uyumsuz (uuid ↔ plaka varchar). Bu yüzden `hedef_yol`
-- eklendi ve bildirimi ÜRETEN fonksiyon adresi de yazıyor.
--
-- Ayrıca `type` alanı iki farklı anlamda kullanılıyordu: önem derecesi
-- (`warning`/`success`/`danger`/`info`) ve kategori (`devir`/`mesaj`).
-- Kategori değerleri arayüzdeki renk mantığında tanınmadığı için gri
-- varsayılana düşüyordu. Artık hepsi önem derecesi yazıyor; kategori
-- bilgisini `hedef_yol` taşıyor.
-- =========================================================================

-- 1 · KONUŞMA TARAFI YARDIMCISI ---------------------------------------------

create or replace function public.konusma_tarafi_miyim(p_konusma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.konusmalar k
    where k.id = p_konusma_id
      and (k.baslatan_id = auth.uid() or k.sahip_id = auth.uid())
  )
$$;

revoke all on function public.konusma_tarafi_miyim(uuid) from public, anon, authenticated;
grant execute on function public.konusma_tarafi_miyim(uuid) to authenticated;

drop policy if exists mesaj_oku_taraf on public.mesajlar;
create policy mesaj_oku_taraf on public.mesajlar
  for select to authenticated
  using (
    public.konusma_tarafi_miyim(konusma_id)
    and (teslim or gonderen_id = auth.uid())
  );

-- 2 · SÜTUN DÜZEYİNDE DARALTMA -----------------------------------------------
-- `teslim` bilerek DIŞARIDA: gölge engellemeyi ifşa ediyor.

revoke select on public.mesajlar from authenticated;
grant select (id, konusma_id, gonderen_id, govde, olustu, okundu_at)
  on public.mesajlar to authenticated;

-- 3 · BİLDİRİM HEDEFİ --------------------------------------------------------
-- Boş geçilebilir: eski bildirimlerde NULL kalıyor ve istemci onları
-- garaja yönlendiriyor. Backfill yapılmıyor.

alter table public.notifications add column if not exists hedef_yol text;

-- ⚠ ESKİ 4 PARAMETRELİ SÜRÜM ÖNCE DÜŞÜYOR.
-- Yeni sürüm 5. parametreyi VARSAYILANLI aldığı için 4 argümanla da
-- çağrılabiliyor. İkisi bir arada kalınca PostgreSQL hangisini seçeceğini
-- bilemiyor ve mevcut TÜM bildirim yazma çağrıları patlıyor:
--     function public._bildirim_yaz(uuid, text, text, unknown) is not unique
-- Bu hata devir testinde yakalandı.
drop function if exists public._bildirim_yaz(uuid, text, text, text);

create or replace function public._bildirim_yaz(
  p_user_id uuid, p_baslik text, p_mesaj text, p_tur text,
  p_hedef_yol text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, title, message, type, is_read, hedef_yol)
  values (p_user_id, p_baslik, p_mesaj, coalesce(p_tur,'info'), false, p_hedef_yol);
end;
$$;

-- 4 · BİLDİRİM ÜRETEN FONKSİYONLAR HEDEF YAZIYOR -----------------------------
-- Gövdeler `20260814230000_mesajlasma.sql` ve `20260814250000_devir_onay_ve_odeme.sql`
-- ile aynı; yalnızca bildirim satırları `_bildirim_yaz(..., hedef)` çağrısına
-- döndü ve `type` önem derecesine çevrildi.

create or replace function public.konusma_baslat(p_pin text, p_govde text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_plaka text; v_sahip uuid; v_konusma uuid;
  v_govde text := btrim(coalesce(p_govde, ''));
begin
  if v_uid is null then return jsonb_build_object('basarili', false, 'hata', 'oturum_yok'); end if;
  if length(v_govde) = 0 or length(v_govde) > 2000 then
    return jsonb_build_object('basarili', false, 'hata', 'govde_gecersiz');
  end if;

  select plate_number, user_id into v_plaka, v_sahip from vehicles where pin_code = upper(btrim(p_pin));
  if v_plaka is null then return jsonb_build_object('basarili', false, 'hata', 'bulunamadi'); end if;
  if v_sahip is null then return jsonb_build_object('basarili', false, 'hata', 'sahipsiz'); end if;
  if v_sahip = v_uid then return jsonb_build_object('basarili', false, 'hata', 'kendi_aracin'); end if;

  if exists (select 1 from engellemeler where engelleyen_id = v_sahip and engellenen_id = v_uid) then
    return jsonb_build_object('basarili', true, 'engellendi', true);
  end if;

  insert into konusmalar (vehicle_plate, baslatan_id, sahip_id)
  values (v_plaka, v_uid, v_sahip)
  on conflict (vehicle_plate, baslatan_id) do update set son_mesaj_at = now()
  returning id into v_konusma;

  insert into mesajlar (konusma_id, gonderen_id, govde) values (v_konusma, v_uid, v_govde);
  update konusmalar set son_mesaj_at = now() where id = v_konusma;

  perform public._bildirim_yaz(v_sahip, 'Aracınız için yeni mesaj',
    'Bir kullanıcı aracınız hakkında mesaj gönderdi.', 'info', '/mesajlar');

  return jsonb_build_object('basarili', true, 'konusma_id', v_konusma);
end; $$;

create or replace function public.mesaj_gonder(p_konusma_id uuid, p_govde text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_k record; v_karsi uuid; v_teslim boolean := true;
  v_govde text := btrim(coalesce(p_govde, ''));
begin
  if v_uid is null then return jsonb_build_object('basarili', false, 'hata', 'oturum_yok'); end if;
  if length(v_govde) = 0 or length(v_govde) > 2000 then
    return jsonb_build_object('basarili', false, 'hata', 'govde_gecersiz');
  end if;

  select * into v_k from konusmalar where id = p_konusma_id;
  if v_k.id is null or (v_k.baslatan_id <> v_uid and v_k.sahip_id <> v_uid) then
    return jsonb_build_object('basarili', false, 'hata', 'bulunamadi');
  end if;

  v_karsi := case when v_k.baslatan_id = v_uid then v_k.sahip_id else v_k.baslatan_id end;

  if exists (select 1 from engellemeler where engelleyen_id = v_karsi and engellenen_id = v_uid) then
    v_teslim := false;
  end if;

  insert into mesajlar (konusma_id, gonderen_id, govde, teslim)
  values (p_konusma_id, v_uid, v_govde, v_teslim);

  if v_teslim then
    update konusmalar set son_mesaj_at = now() where id = p_konusma_id;
    perform public._bildirim_yaz(v_karsi, 'Yeni mesaj',
      'Bir konuşmanızda yeni mesaj var.', 'info', '/mesajlar');
  end if;

  return jsonb_build_object('basarili', true);
end; $$;

create or replace function public.devir_istek_olustur(p_kod text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_kayit public.devir_kodlari; v_id bigint;
begin
  if v_uid is null then return jsonb_build_object('basarili', false, 'hata', 'oturum_yok'); end if;
  perform public._devir_sureleri_dusur();
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

  if not exists (
    select 1 from public.vehicle_ownerships o
    where o.vehicle_plate = v_kayit.vehicle_plate
      and o.bitis is null and o.user_id = v_kayit.veren_user_id
  ) then
    update public.devir_kodlari set iptal_at = now() where kod = v_kayit.kod;
    return jsonb_build_object('basarili', false, 'hata', 'sahiplik_degismis');
  end if;

  select id into v_id from public.devir_istekleri
  where kod = v_kayit.kod and durum in ('bekliyor','onaylandi');

  if v_id is not null then
    return jsonb_build_object('basarili', true, 'istek_id', v_id, 'zaten_var', true);
  end if;

  insert into public.devir_istekleri (kod, vehicle_plate, isteyen_user_id, sahip_id, durum)
  values (v_kayit.kod, v_kayit.vehicle_plate, v_uid, v_kayit.veren_user_id, 'bekliyor')
  returning id into v_id;

  perform public._bildirim_yaz(v_kayit.veren_user_id, 'Devir talebi bekliyor',
    'Ürettiğiniz devir kodunu kullanan bir kullanıcı onayınızı bekliyor.', 'warning', '/devir');

  return jsonb_build_object('basarili', true, 'istek_id', v_id);
end; $$;

create or replace function public.devir_istek_karari(p_istek_id bigint, p_onay boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_i public.devir_istekleri; v_son timestamptz;
begin
  if v_uid is null then return jsonb_build_object('basarili', false, 'hata', 'oturum_yok'); end if;
  perform public._devir_sureleri_dusur();

  select * into v_i from public.devir_istekleri where id = p_istek_id;
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
    perform public._bildirim_yaz(v_i.isteyen_user_id, 'Devir talebiniz reddedildi',
      'Araç sahibi devir talebinizi onaylamadı.', 'warning', '/devir');
    return jsonb_build_object('basarili', true, 'onaylandi', false);
  end if;

  v_son := now() + interval '2 days';
  update public.devir_istekleri
  set durum = 'onaylandi', karar_at = now(), karar_veren_user_id = v_uid, odeme_son_tarih = v_son
  where id = p_istek_id;

  perform public._bildirim_yaz(v_i.isteyen_user_id, 'Araç üzerinize geçmeye hazır',
    'Araç sahibi devri onayladı. İşlemi tamamlamak için 2 gününüz var.', 'success', '/devir');

  return jsonb_build_object('basarili', true, 'onaylandi', true, 'odeme_son_tarih', v_son);
end; $$;
