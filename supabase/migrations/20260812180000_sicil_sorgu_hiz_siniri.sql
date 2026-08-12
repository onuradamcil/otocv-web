-- =========================================================================
-- PIN SORGUSUNA İSTEK HIZI SINIRI
--
-- -------------------------------------------------------------------------
-- NİYE GEREKLİ: ENTROPİ TEK BAŞINA YETMEZ
-- -------------------------------------------------------------------------
-- Entropi her denemenin isabet ŞANSINI düşürür; hız sınırı kaç DENEME
-- yapılabileceğini sınırlar. İkisi çarpım halinde çalışır ve biri eksikse
-- diğeri tek bacak üzerinde durur.
--
-- En iyi örnek banka kartı: PIN'i 4 haneli, yani 10.000 olasılık — entropi
-- olarak felaket. Güvenliğini sağlayan şey uzunluk değil, 3 yanlış denemede
-- kilitlenmesi.
--
-- Bizde durum tersiydi: PIN entropisi 50 bite çıkarıldı ama deneme sınırı
-- yoktu. Saldırgan saniyede binlerce PIN deneyebilirdi.
--
-- -------------------------------------------------------------------------
-- SUPABASE'İN HAZIR SINIRI BU İŞE YARAMIYOR (dokümanla doğrulandı)
-- -------------------------------------------------------------------------
-- Hazır rate limit yalnızca KİMLİK DOĞRULAMA uçlarına uygulanıyor (IP başına
-- token bucket, kapasite 30). `sicil_getir` Data API üzerinde ve orada hazır
-- sınır yok. Supabase'in kendi "API'nizi güvene alma" dokümanı "IP başına
-- rate limit" maddesini *kendiniz kurmanız gerekenler* listesinde sayıyor.
--
-- -------------------------------------------------------------------------
-- NİYE VERİTABANINDA, SUNUCU KAPISINDA DEĞİL
-- -------------------------------------------------------------------------
-- İlk düşündüğüm çözüm, `sicil_getir`'i herkese açık olmaktan çıkarıp bir
-- Next.js API rotasının arkasına almaktı. Sorun: mobil uygulama doğrudan
-- Supabase'e bağlandığında o kapı açık kalır — sınır yalnızca web'i korur.
--
-- Sonra PostgREST'in istek başlıklarını SQL'e aktarıp aktarmadığını
-- ÖLÇTÜM (geçici bir tanı fonksiyonuyla, gerçek istemci yolundan):
--
--   cf-connecting-ip  ->  176.33.243.97   (gerçek istemci IP'si)
--   x-forwarded-for   ->  176.33.243.97
--   sb-forwarded-for  ->  mevcut
--
-- Başlıklar geliyor. Yani sınır doğrudan fonksiyonun içine kurulabiliyor:
-- yeni altyapı yok, servis anahtarı yok, proxy katmanı yok — ve web ile
-- mobil AYNI kapıdan geçtiği için ikisi de aynı korumadan faydalanıyor.
--
-- -------------------------------------------------------------------------
-- HANGİ SAYAÇ: BAŞARISIZ SORGU
-- -------------------------------------------------------------------------
-- Numaralandırma çok sayıda FARKLI ve çoğu BULUNAMAYAN PIN dener. Meşru
-- kullanıcı elindeki PIN'i sorgular ve bulur. Yani başarısızlığı saymak,
-- saldırganla meşru kullanıcıyı ayırt eden en keskin ölçüt — giriş denemesi
-- kısıtlamasının aynı mantığı. Toplam isteği saymak, karneye bakan meşru
-- kullanıcıyı da cezalandırırdı.
--
--   Başarısız sorgu   20 / 10 dakika  (asıl koruma)
--   Toplam sorgu     600 / 10 dakika  (toplu çekmeye karşı ikincil ağ)
--
-- 20 seçildi, 10 değil: şirket ve mobil operatör NAT'ları arkasında aynı
-- IP'yi paylaşan onlarca meşru kullanıcı olabilir; birkaç yazım hatası
-- birikirse hepsi engellenirdi. 20'de bile saldırganın 50 bitlik uzayda
-- isabet şansı pratikte sıfır.
--
-- -------------------------------------------------------------------------
-- IP TAKLİDİNE KARŞI
-- -------------------------------------------------------------------------
-- `cf-connecting-ip` tercih ediliyor çünkü Cloudflare bu başlığı KENDİSİ
-- yazıyor ve istemcinin gönderdiğini eziyor — taklit edilemez.
-- `x-forwarded-for` BİLEREK kullanılmıyor: istemci ona kendi değerini
-- ekleyebilir, ilk girdiyi güvenilir saymak sınırı atlamanın yolu olurdu.
--
-- -------------------------------------------------------------------------
-- IP OKUNAMAZSA: BİLEREK AÇIK BIRAKILIYOR
-- -------------------------------------------------------------------------
-- Başlık yoksa (migration/psql üzerinden çağrı, ya da başlık adları
-- değişirse) sınır uygulanmıyor. Kapalı bırakmak "daha güvenli" görünür ama
-- bir başlık adı değiştiğinde BÜTÜN karne sayfalarını çalışmaz hale
-- getirirdi. Hız sınırı bir erişim denetimi değil, kötüye kullanım frenidir;
-- erişim denetimini RLS ve fonksiyonun kendisi yapıyor.
--
-- -------------------------------------------------------------------------
-- LOG TABLOSU KİŞİSEL VERİ TAŞIYOR
-- -------------------------------------------------------------------------
-- Tablo IP adresi ve hangi PIN'in sorgulandığını tutuyor. Okunabilir olsaydı
-- kimin hangi aracı sorguladığı dışarıdan görülebilirdi — sınırın kendisi
-- bir sızıntıya dönüşürdü. RLS açık ve HİÇ POLİTİKA YOK: yalnızca
-- security definer fonksiyon yazabiliyor, hiçbir istemci rolü okuyamıyor.
--
-- Temizlik fırsatçı: her ~100 istekte bir, bir saatten eski kayıtlar
-- siliniyor. Ayrı bir zamanlanmış işe (pg_cron) gerek yok ve tablo sınırsız
-- büyümüyor.
--
-- -------------------------------------------------------------------------
-- null DÖNDÜRÜLMÜYOR — BU ÖNEMLİ
-- -------------------------------------------------------------------------
-- Sınır aşıldığında fonksiyon `{"hata":"cok_fazla_deneme", ...}` döndürüyor.
-- null döndürmek "bulunamadı" ile aynı şey olurdu ve kullanıcıya "böyle bir
-- araç yok" yalanını söylerdi — oysa araç var, yalnızca çok sorgu geldi.
-- Arayüz bu işareti tanıyıp ayrı bir ekran gösteriyor.
--
-- -------------------------------------------------------------------------
-- plaka_kayitli_mi ARTIK ANON'A KAPALI
-- -------------------------------------------------------------------------
-- O fonksiyon bir keşif kapısı: plaka uzayı PIN uzayından çok daha küçük,
-- 34ABC001, 34ABC002... denenerek hangi araçların kayıtlı olduğu
-- öğrenilebilirdi. İlan sihirbazı zaten oturum gerektiriyor.
-- =========================================================================

-- Geçici tanı fonksiyonu (başlıkları ölçmek için oluşturulmuştu) düşüyor.
drop function if exists public.zz_tani_basliklar();

-- -------------------------------------------------------------------------
-- 1) SORGU KAYIT TABLOSU
-- -------------------------------------------------------------------------
create table if not exists public.sicil_sorgu_log (
  id           bigserial primary key,
  ip           text        not null,
  sorgulanan   text        not null,
  bulundu      boolean     not null,
  olustu       timestamptz not null default now()
);

comment on table public.sicil_sorgu_log is
  'PIN sorgularının hız sınırı sayacı. IP kişisel veri: tablo RLS ile kapalı, hiçbir istemci rolü okuyamaz; yalnızca security definer fonksiyon yazar. Kayıtlar 1 saat sonra silinir.';

create index if not exists sicil_log_ip_zaman_idx
  on public.sicil_sorgu_log (ip, olustu desc);
-- Kısmi indeks: asıl sorgu "bu IP'nin son 10 dakikadaki BAŞARISIZ sayısı".
create index if not exists sicil_log_basarisiz_idx
  on public.sicil_sorgu_log (ip, olustu desc) where not bulundu;

alter table public.sicil_sorgu_log enable row level security;
-- Politika YOK ve bu kasıtlı: RLS açık + politika yok = hiçbir istemci rolü
-- okuyamaz/yazamaz. security definer fonksiyon RLS'e tabi olmadığı için yazar.
revoke all on table public.sicil_sorgu_log from anon, authenticated;

-- -------------------------------------------------------------------------
-- 2) istemci_ip() · 3) sicil_hiz_siniri_asildi_mi() · 4) sicil_getir
--    5) plaka_kayitli_mi yetkisi
--
-- ⚠ GÖVDELER BU DOSYADA DEĞİL — 20260812210000_sema_kaymasi_giderildi.sql'de.
-- İlk yazımda "panele uygulandı" yazmıştım; sonuç olarak depodan kurulan bir
-- veritabanında istek hızı sınırı hiç çalışmıyordu ve sicil_getir eski
-- sürümde kalıyordu. Gerekçeler yukarıda geçerli.
-- -------------------------------------------------------------------------

-- =========================================================================
-- UYGULAMA SONRASI DOĞRULANDI
--   · Geçerli PIN sorgusu çalışıyor, `hata` işareti gelmiyor
--   · 11. başarısız denemede engellendi (limit o sırada 10'du; sonra NAT
--     payı için 20 yapıldı)
--   · Sınır aşıldıktan sonra GEÇERLİ PIN de engellendi — saldırgan arada
--     geçerli sorgu yapıp sayacı sıfırlayamıyor
--   · İşaret şekli istemcinin beklediği gibi: {hata, yeniden_dene_saniye}
--   · sicil_sorgu_log anon VE oturumlu kullanıcı için okunamıyor
--   · plaka_kayitli_mi anon'da "permission denied", oturumluda çalışıyor
--
-- TEST NOTU: sınırı gerçekten aşan paket ayrı dosyada
-- (tests/06-hiz-siniri.spec.js) ve varsayılan koşumda TANIMLANMIYOR bile.
-- Sebebi: koşan makinenin IP'sini 10 dakika engelliyor, dolayısıyla ondan
-- sonraki her karne testini kırardı. Elle koşmak için:
--   HIZ_SINIRI=1 npx playwright test --project=hizsiniri
--
-- 78 test varsayılan koşumda geçiyor + 2 test isteğe bağlı pakette.
-- =========================================================================
