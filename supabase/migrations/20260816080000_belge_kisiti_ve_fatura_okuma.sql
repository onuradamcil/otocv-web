-- =========================================================================
-- İKİ YETKİ BOŞLUĞU: BELGE KISITI VE FATURA OKUMA POLİTİKASI
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1) `belge_erisimi_kisitli` BAYRAĞINI SAHİP İSTEMCİDEN KAPATABİLİYORDU
-- -------------------------------------------------------------------------
-- `vehicles` üzerindeki politika şu:
--
--   "Kullanıcılar sadece kendi aracını yönetebilir"  ALL  using (auth.uid() = user_id)
--
-- Yani sahip HER SÜTUNU güncelleyebiliyor. `belge_erisimi_kisitli` de bir
-- sütun.
--
-- Bayrağın ne işe yaradığı önemli: sahipsiz havuzdan araç devralındığında
-- `iki_kademeli_devralma` bunu `true` yapıyor, çünkü BAKIM KAYITLARI yeni
-- sahibe geçiyor ama FATURA GÖRSELLERİ geçmiyor — onlar önceki sahibin
-- yüklediği belgeler ve KVKK açısından ona ait.
--
-- Boşluk şuydu: aracı devralan kişi tek satırlık bir istemci çağrısıyla
--
--   update vehicles set belge_erisimi_kisitli = false where plate_number = '...'
--
-- yazıp kısıtı kaldırabiliyordu. Fatura okuma politikası bu bayrağa
-- baktığı için, önceki sahibin belgeleri açılıyordu.
--
-- ⚠ ÇÖZÜM POLİTİKA DEĞİL TETİKLEYİCİ. Politikayı sütun bazına indirmek
-- PostgreSQL'de RLS ile yapılamıyor (kolon düzeyinde GRANT ayrı bir
-- mekanizma ve `ALL` politikasıyla birlikte kırılgan). Projede aynı sorun
-- `profiles.is_premium` için tetikleyiciyle çözülmüştü; aynı kalıp.
--
-- Tetikleyici SECURITY DEFINER fonksiyonları ENGELLEMİYOR: onlar
-- `auth.uid()` null olan bir bağlamda değil, ama bayrağı yalnızca sunucu
-- tarafı akış değiştiriyor ve o akış da bu tetikleyiciden geçiyor. Bu
-- yüzden ayrım "kim çağırdı" değil, "değer değişiyor mu" üzerinden
-- yapılıyor: istemci eski değeri aynen göndermeye devam edebilir.
-- -------------------------------------------------------------------------

create or replace function public.vehicles_belge_kisiti_koru()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Sunucu tarafı akış (SECURITY DEFINER RPC) `auth.uid()` taşımadan da
  -- çalışabiliyor; oradan gelen değişikliğe dokunulmuyor.
  if auth.uid() is null then
    return new;
  end if;

  -- Değer DEĞİŞMİYORSA sorun yok: istemci satırın tamamını gönderirken
  -- bayrağı aynen taşıyabilir ve bu meşru bir güncelleme.
  if new.belge_erisimi_kisitli is not distinct from old.belge_erisimi_kisitli then
    return new;
  end if;

  raise exception 'BELGE_KISITI_ISTEMCIDEN_DEGISTIRILEMEZ';
end;
$$;

drop trigger if exists vehicles_belge_kisiti_koru on public.vehicles;
create trigger vehicles_belge_kisiti_koru
  before update on public.vehicles
  for each row execute function public.vehicles_belge_kisiti_koru();

revoke all on function public.vehicles_belge_kisiti_koru() from public, anon, authenticated;


-- -------------------------------------------------------------------------
-- 2) FATURA KOVASININ OKUMA POLİTİKASI `to authenticated` KAYBETMİŞ
-- -------------------------------------------------------------------------
-- `20260812200000` politikayı `for select to authenticated` diye kurmuştu.
-- `20260813200000` onu düşürüp `to` yan tümcesi OLMADAN yeniden kurdu;
-- `to` yazılmayınca varsayılan `public` oluyor.
--
-- ⚠ BUGÜN SÖMÜRÜLEBİLİR DEĞİL — ama derinlemesine savunma boşluğu.
-- Politikanın içindeki `exists (select 1 from public.vehicles ...)` alt
-- sorgusu ÇAĞIRANIN RLS'ine tabi ve `vehicles` üzerindeki hiçbir politika
-- anon'a satır vermiyor. Yani anon alt sorgudan boş dönüyor ve erişim
-- açılmıyor.
--
-- Buna rağmen düzeltiliyor: risk, `vehicles`a anon okuması veren İKİNCİ bir
-- değişikliğe bağlı ve o kısayol daha önce bir kez tartışılıp reddedilmiş.
-- İki hatanın üst üste gelmesini beklemek yerine biri şimdi kapatılıyor.
--
-- ⚠ KOŞUL METNİ AYNEN KORUNUYOR. Özellikle `belge_erisimi_kisitli`
-- denetimi: kaldırılırsa yukarıdaki 1. maddede korunan kısıt delinir.
-- -------------------------------------------------------------------------

do $$
declare
  v_kosul text;
begin
  select pg_get_expr(p.polqual, p.polrelid) into v_kosul
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  where c.relname = 'objects' and p.polname = 'fatura_oku_arac_sahibi';

  if v_kosul is null then
    raise notice 'fatura_oku_arac_sahibi politikasi bulunamadi, atlaniyor';
    return;
  end if;

  execute 'drop policy "fatura_oku_arac_sahibi" on storage.objects';
  execute format(
    'create policy "fatura_oku_arac_sahibi" on storage.objects for select to authenticated using (%s)',
    v_kosul
  );
end $$;
