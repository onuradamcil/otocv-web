-- =========================================================================
-- BİLDİRİM METİNLERİNDE PLAKA BİÇİMLENİYOR
--
-- -------------------------------------------------------------------------
-- NİYE VAR
-- -------------------------------------------------------------------------
-- Plaka veritabanında BOŞLUKSUZ duruyor ('41IHH434'). Arayüzün tamamı artık
-- onu `plakaBicimle` ile boşluklu basıyor ('41 IHH 434') ama BİLDİRİM
-- METİNLERİ ham kalmıştı:
--
--     "Aracınız devredildi: 74SDF2343"
--
-- Kullanıcı aynı aracı garajda "74 SDF 2343", bildirim zilinde "74SDF2343"
-- olarak görüyordu. Canlıda ölçüldü: 619 bildirimin 216'sı ham plaka
-- içeriyor, 4 kullanıcıya dağılmış.
--
-- -------------------------------------------------------------------------
-- YALNIZCA METİN BİÇİMLENİYOR, VERİ BİÇİMLENMİYOR
-- -------------------------------------------------------------------------
-- `_devri_uygula` dönüş nesnesindeki 'plaka' alanı OLDUĞU GİBİ kalıyor.
-- O bir görüntü değil, çağıran kodun kullandığı veri; biçimlenirse plakayla
-- yapılan eşleşmeler ('41 IHH 434' <> '41IHH434') sessizce kırılır.
-- Kural: veri ham durur, gösterim biçimlenir.
--
-- -------------------------------------------------------------------------
-- ⚠ ESKİ BİLDİRİMLERE DOKUNULMUYOR
-- -------------------------------------------------------------------------
-- Var olan 216 satır ham plakasıyla kalıyor. İki sebeple:
--
--   1. Canlı veritabanının yedeği yok; gerekmeyen toplu UPDATE riskli.
--   2. İstemci tarafındaki tekilleştirme artık boşlukları yok sayıyor
--      (NotificationContext.jsx içinde `baslikAnahtari`), yani eski ham
--      başlıklarla yeni biçimli başlıklar AYNI anahtara düşüyor ve kopya
--      bildirim üretilmiyor. Eski satırlar okundukça yerlerini yenilere
--      bırakıyor.
--
-- Bu migration hiçbir satırı güncellemiyor, yalnızca fonksiyon tanımlarını
-- değiştiriyor.
-- =========================================================================

-- 1 · SQL TARAFI BİÇİMLEYİCİ -------------------------------------------------
-- İstemcideki `src/utils/plaka.js` ile aynı davranış:
--   · boşluk ve alfanümerik olmayan karakterler atılıyor
--   · TR kalıbına (2 rakam · 1-3 harf · 2-4 rakam) uyuyorsa boşluk konuyor
--   · uymuyorsa DEĞER OLDUĞU GİBİ dönüyor — eksik plaka göstermektense
--     biçimsiz göstermek doğru
--
-- Türkçe büyük harf tuzağı yok: veritabanı collation'ı en_US.UTF-8 ve
-- girdi zaten alfanümeriğe indirgeniyor, yani 'i' -> 'I' (İ değil).
-- Plaka harfleri ASCII olduğu için doğru olan da bu.

create or replace function public.plaka_bicimle(p_plaka text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
           when ham ~ '^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$'
             then regexp_replace(ham, '^([0-9]{2})([A-Z]{1,3})([0-9]{2,4})$', '\1 \2 \3')
           else ham
         end
  from (
    select upper(regexp_replace(coalesce(p_plaka, ''), '[^A-Za-z0-9]', '', 'g')) as ham
  ) t;
$$;

comment on function public.plaka_bicimle(text) is
  'TR plakayı okunur biçime çevirir: 41IHH434 -> 41 IHH 434. Kalıba uymayan değeri olduğu gibi döndürür.';

grant execute on function public.plaka_bicimle(text) to anon, authenticated;

-- 2 · DEVİR BİLDİRİMİNDE PLAKA BİÇİMLENİYOR ----------------------------------
-- Fonksiyon canlıdaki tanımından birebir alındı; TEK fark bildirim
-- başlığındaki ve gövdesindeki `p_plaka` -> `public.plaka_bicimle(p_plaka)`.
-- Dönüş nesnesindeki 'plaka' bilerek ham bırakıldı (yukarıdaki gerekçe).

create or replace function public._devri_uygula(
  p_plaka text,
  p_yeni_sahip uuid,
  p_onay jsonb,
  p_sahipsizden boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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
  --
  -- ⚠ PLAKA BURADA BICIMLENIYOR: bu bir GOSTERIM metni.
  if v_eski_sahip is not null then
    perform public._bildirim_yaz(
      v_eski_sahip,
      'Aracınız devredildi: ' || public.plaka_bicimle(p_plaka),
      coalesce(v_arac.brand,'') || ' ' || coalesce(v_arac.model,'') ||
      ' (' || public.plaka_bicimle(p_plaka) ||
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

  -- ⚠ 'plaka' BICIMLENMIYOR: bu veri, gosterim degil. Cagiran kod bu degeri
  -- eslesmede kullaniyor; bosluk eklenirse '41 IHH 434' <> '41IHH434' olur
  -- ve eslesmeler sessizce kirilir.
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

-- Yetkiler korunuyor: `_devri_uygula` yalnizca ic fonksiyonlardan cagriliyor,
-- istemciye hicbir zaman acik degildi.
revoke all on function public._devri_uygula(text, uuid, jsonb, boolean) from public, anon, authenticated;

-- 3 · ⚠ GÜVENLİK: `_bildirim_yaz` ANON'A AÇIKTI --------------------------------
--
-- Bu iş sırasında ölçülerek bulundu ve anon anahtarıyla SÖMÜRÜLDÜĞÜ
-- doğrulandı (prob satırı yazıldı, okundu, silindi).
--
-- Fonksiyon:
--     _bildirim_yaz(p_user_id uuid, p_baslik text, p_mesaj text,
--                   p_tur text, p_hedef_yol text)
--     SECURITY DEFINER · notifications tablosuna ham insert
--
-- Yetkisi şöyleydi:
--     =X/postgres | anon=X | authenticated=X | service_role=X
--          ^^^ PUBLIC de dahil
--
-- Yani anon anahtarını (istemci paketinin içinde, herkese açık) eline geçiren
-- herkes:
--   · İSTEDİĞİ kullanıcıya bildirim yazabiliyordu (user_id parametre),
--   · başlığı ve gövdesini seçebiliyordu,
--   · `hedef_yol` ile TIKLAMA HEDEFİNİ belirleyebiliyordu.
--
-- Sonuncusu bunu uygulama içi bir OLTALAMA kanalı yapıyordu: "Aracınız
-- devredildi — doğrulamak için tıklayın" gibi, ürünün kendi diliyle yazılmış
-- ve ürünün kendi zilinde görünen bir bildirim. Ayrıca kimlik gerekmediği
-- için tablo şişirme de serbestti.
--
-- ⚠ MEVCUT TEST BUNU YAKALAYAMIYORDU, ÜSTELİK "yakalıyorum" diyordu.
-- 07-devir.spec.js fonksiyonu BOŞ parametreyle (`{}`) çağırıyordu; PostgREST
-- eşleşen imza bulamayıp hata döndürüyor, test de bunu "kapalı" sayıyordu.
-- Yani test yetkiyi hiç sınamıyor, imza uyuşmazlığını ölçüyordu. Geçerli
-- parametrelerle çağrıldığında fonksiyon sorunsuz yazıyordu. Test bu
-- migration ile birlikte düzeltildi: artık geçerli parametreyle çağırıp
-- YETKİ REDDİNİ ve satırın YAZILMADIĞINI denetliyor.
--
-- Diğer beş iç fonksiyon (`_devri_uygula`, `_devir_deneme_asildi_mi`,
-- `pin_uret`, `istemci_ip`, `sicil_hiz_siniri_asildi_mi`) ölçüldü ve zaten
-- doğru kapalıydı; açık olan yalnızca bu biriydi.
--
-- ⚠ İKİ REVOKE BİRDEN: `from public` tek başına yetmiyor, `anon` ve
-- `authenticated` ayrı grant taşıyor. Bu tuzağa mesajlaşma RPC'lerinde de
-- düşülmüştü.

revoke all on function public._bildirim_yaz(uuid, text, text, text, text) from public;
revoke all on function public._bildirim_yaz(uuid, text, text, text, text) from anon, authenticated;
grant execute on function public._bildirim_yaz(uuid, text, text, text, text) to service_role;

-- Çağıranların HEPSİ security definer (ölçüldü: _devri_uygula,
-- belge_kisiti_kaldir, devir_istek_karari, devir_istek_olustur,
-- devir_talep_et, devir_talep_karari, konusma_baslat, mesaj_gonder,
-- sahipsiz_geri_yukle, sahipsiz_otomatik_tamamla). Sahibi olarak
-- koştukları için bu kısıt onları etkilemiyor.
