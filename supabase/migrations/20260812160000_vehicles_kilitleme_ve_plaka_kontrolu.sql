-- =========================================================================
-- vehicles TABLOSU KİLİTLENİYOR + PLAKA KONTROLÜ DARALTILIYOR
--
-- -------------------------------------------------------------------------
-- KANITLANAN İKİ AÇIK (anon anahtarı, oturum AÇMADAN)
-- -------------------------------------------------------------------------
-- 1. OKUMA — `select plate_number, pin_code from vehicles`
--    10 aracın HEPSİ döndü. Plakalar ve PIN'ler dahil.
--
--    Bu bulgu iki ayrı güvenlik çalışmasını boşa çıkarıyordu:
--      · sicil_getir() plakayı ziyaretçiden saklıyor — tabloyu listeleyebilen
--        biri için tamamen anlamsız.
--      · PIN entropisi 31 bitten 50 bite çıkarıldı — PIN'lerin tamamını
--        listeleyebilen birinin hiçbir şey tahmin etmesi gerekmez. Aynı
--        sebeple, planlanan istek hızı sınırı da işe yaramazdı: tahmin
--        etmeyi yavaşlatmak, listelemek serbestken bir şey ifade etmiyor.
--
-- 2. EKLEME — insert into vehicles (user_id: <başka kullanıcı>, trust_score: 98)
--    BAŞARILI oldu. Anon, başka kullanıcının adına araç ekledi ve güven
--    puanını kendisi belirledi. (Kanıt satırı hemen silindi.)
--
-- -------------------------------------------------------------------------
-- ASIL TUZAK: POLİTİKALAR VEYA'LANIR
-- -------------------------------------------------------------------------
-- Tabloda şu dört politika birlikte duruyordu:
--
--   "Herkes araçları sorgulayabilir"                SELECT  using true
--   "Herkes araç ekleyebilir"                       INSERT  check true
--   "Kullanıcılar sadece kendi garajına araç ..."   INSERT  check auth.uid() = user_id
--   "Kullanıcılar sadece kendi aracını yönetebilir" ALL     using auth.uid() = user_id
--
-- Postgres'te aynı komut için birden fazla permissive politika VEYA'lanır.
-- Yani `check true` olan politika, yanındaki `auth.uid() = user_id` koşullu
-- politikayı tamamen etkisiz kılıyordu. Sıkı politikanın orada DURMASI,
-- tablonun korunduğu izlenimini veriyordu — kodu okuyan biri "kendi aracını
-- yönetebilir" satırını görüp güvende sanabilirdi.
--
-- Ders: politika eklemek korumaz; korumayı en GEVŞEK politika belirler.
--
-- -------------------------------------------------------------------------
-- VİTRİN ETKİLENMİYOR (doğrulandı)
-- -------------------------------------------------------------------------
-- MarketplaceView ve marketplaceService yalnızca `listings` tablosunu
-- okuyor; `vehicles`'a hiç dokunmuyor. Kilitlemeyi mümkün kılan şey bu.
--
-- İSTEMCİ TARAFINDA DEĞİŞENLER (bu migration'ın ön koşulu):
--   · details/[pin], karne/[pin], verify/[pin] sayfaları ve PIN sorgu formu
--     artık `vehicles` yerine sicil_getir() çağırıyor
--   · isOwner artık `sahip_mi` alanından geliyor; fonksiyon user_id
--     döndürmediği için eski karşılaştırma her zaman false verirdi ve sahip
--     kendi aracını ziyaretçi gibi, plakası gizlenmiş hâlde görürdü
--   · İlan sihirbazının plaka tekillik kontrolü plaka_kayitli_mi() kullanıyor
--   · "QR Kod Tarat" düğmesi kaldırıldı: veritabanına EN SON eklenen aracı
--     çekip "tescilli araç bulundu" diye gösteriyordu — yani kullanıcının
--     taradığı araç değil, bir yabancının aracı
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) sicil_getir'e engine_capacity eklendi
--
-- Sayfalar `select('*')` yaptığı için bu kolon eliyle geliyordu. Fonksiyona
-- bağlanınca eksik kalacaktı; motor hacmi karnede gösterilen gerçek alan.
--
-- Fonksiyonun tam gövdesi 20260812150000 dosyasındaki hâliyle aynı; tek fark
-- alan listesine 'engine_capacity' eklenmesi. `to_jsonb(v)` BİLEREK
-- kullanılmıyor: ileride tabloya eklenecek hassas bir kolonu sessizce dışarı
-- sızdırırdı.
--
-- Ayrıca `user_id` BİLEREK döndürülmüyor. Sahiplik bilgisi `sahip_mi` ile
-- veriliyor; kullanıcı kimliği aynı zamanda fatura storage klasör adı
-- olduğu için dışarı vermek gereksiz bir ipucu olurdu.
-- -------------------------------------------------------------------------
--   (fonksiyon gövdesi: 20260812150000 ile aynı + 'engine_capacity')

-- -------------------------------------------------------------------------
-- 2) PLAKA TEKİLLİK KONTROLÜ İÇİN DAR KAPSAMLI FONKSİYON
--
-- SORUN: ilan sihirbazı şöyle kontrol ediyordu:
--
--   supabase.from('vehicles').select('plate_number')      -- FİLTRE YOK
--   ...karşılaştırma istemcide
--
-- Yani BÜTÜN plakaları indiriyordu. İki sorun:
--   · Sızıntı: her kullanıcı sistemdeki tüm plakaları elde ediyordu. Plaka
--     kişisel veri; URL'lerden ve ziyaretçi arayüzünden KVKK gerekçesiyle
--     kaldırdığımız şey buradan akıyordu.
--   · Ölçek: yüz binlerce araçta her plaka kontrolü tüm tabloyu indirmek
--     demek. Tek bir doğru/yanlış cevabı için ödenen bedel, kullanıcının
--     internetine ve sunucuya yükleniyordu.
--
-- Fonksiyon yalnızca true/false döndürüyor: hangi plakaların kayıtlı olduğu
-- değil, SORULAN plakanın kayıtlı olup olmadığı. Kullanıcı zaten kendi
-- plakasını biliyor; yeni bilgi sızmıyor.
--
-- Normalleştirme SUNUCUDA: `41 IHH 434` ile `41IHH434` karşılaştırması tek
-- yerde. İki yükleme yolunun farklı biçim üretmesi daha önce gerçek bir
-- soruna yol açmıştı (fatura klasörü `41_IHH_434` iken plaka `41IHH434`).
-- -------------------------------------------------------------------------
create or replace function public.plaka_kayitli_mi(p_plaka text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.vehicles v
    where regexp_replace(upper(v.plate_number), '[^A-Z0-9]', '', 'g')
        = regexp_replace(upper(coalesce(p_plaka, '')), '[^A-Z0-9]', '', 'g')
      and coalesce(btrim(p_plaka), '') <> ''
  );
$$;

comment on function public.plaka_kayitli_mi(text) is
  'Verilen plaka sistemde kayıtlı mı? Yalnızca boolean döner. İlan sihirbazının tekillik kontrolü bunu kullanır; eskiden tüm plakalar istemciye indiriliyordu.';

revoke all on function public.plaka_kayitli_mi(text) from public;
grant execute on function public.plaka_kayitli_mi(text) to anon, authenticated;

-- -------------------------------------------------------------------------
-- 3) AÇIK POLİTİKALAR KALDIRILIYOR
-- -------------------------------------------------------------------------
drop policy if exists "Herkes araçları sorgulayabilir" on public.vehicles;
drop policy if exists "Herkes araç ekleyebilir" on public.vehicles;

-- -------------------------------------------------------------------------
-- 4) SAHİBE ÖZEL OKUMA
--
-- Genel okuma yolu sicil_getir; tabloya doğrudan erişim sahibinde kalıyor.
-- Garaj, bildirimler ve bakım popup'ı kendi araçlarını okuduğu için
-- etkilenmiyor (hepsi `eq('user_id', user.id)` ya da kendi plakası ile).
-- -------------------------------------------------------------------------
drop policy if exists "vehicles_oku_sahip" on public.vehicles;
create policy "vehicles_oku_sahip" on public.vehicles
  for select to authenticated using (auth.uid() = user_id);

-- =========================================================================
-- UYGULAMA SONRASI DOĞRULANDI (tests/05-guvenlik.spec.js)
--   · anon araç listesi okuyamıyor                          -> 0 satır
--   · anon başkasının adına araç ekleyemiyor                 -> reddedildi
--   · oturumlu kullanıcı yalnızca kendi araçlarını görüyor
--   · plaka_kayitli_mi yalnızca boolean dönüyor, joker eşleşmiyor
--   · ziyaretçi karne ve araç detayını hâlâ görebiliyor
--   · sahip faturasını imzalı bağlantıyla hâlâ açabiliyor
-- 71 test geçiyor.
-- =========================================================================
