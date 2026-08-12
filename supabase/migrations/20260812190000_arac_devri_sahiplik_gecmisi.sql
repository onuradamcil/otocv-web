-- =========================================================================
-- ARAÇ DEVRİ · FAZ 1 — SAHİPLİK GEÇMİŞİ VE DEVİR KODLARI
--
-- -------------------------------------------------------------------------
-- ÇÖZÜLEN SORUN: İKİNCİ EL ALICI ARACI SİSTEME HİÇ EKLEYEMİYORDU
-- -------------------------------------------------------------------------
-- `vehicles.user_id` tek bir sahip tutuyor ve plaka birincil anahtar.
-- Dolayısıyla bir araç sistemde yalnızca bir kez kayıtlı olabiliyordu.
-- İkinci el alıcı sihirbaza plakasını yazdığında şu modalı görüyordu:
--
--   "Bu Araç Zaten Kayıtlı! Bir araç dijital garaja yalnızca bir kez
--    kaydedilebilir."
--
-- ve tek çıkışı kapatma düğmesiydi. Yani ürünün çekirdek değeri — servis
-- sicili — ilk sahiple sınırlıydı. Oysa sicilin asıl alıcısı ikinci el
-- alıcı.
--
-- -------------------------------------------------------------------------
-- NEDEN PLAKA BİRİNCİL ANAHTAR OLARAK KALDI (FAZ AYRIMI)
-- -------------------------------------------------------------------------
-- Roadmap'te bu iş "uuid + vehicle_ownerships" diye duruyordu. İnceleyince
-- uuid'nin ASIL SENARYO İÇİN GEREKMEDİĞİ ortaya çıktı:
--
--   · Satışta Türkiye'de plaka genelde araçta kalır. Bakım kayıtları plakaya
--     bağlı olduğu için sahiplik değişse de kayıtlar yerinde kalıyor —
--     kayıt devri BEDAVAYA geliyor.
--   · uuid yalnızca PLAKA DEĞİŞİKLİĞİ için gerekli (şehir değişimi vb.).
--
-- Birincil anahtar değiştirmek canlı veride, yedeksiz, yüksek riskli bir iş:
-- iki tablonun yabancı anahtarı ve ~20 kod noktası etkileniyor. O yüzden
-- Faz 2'ye bırakıldı. Bu migration TAMAMEN KATKI: hiçbir FK, hiçbir PK
-- değişmiyor.
--
-- -------------------------------------------------------------------------
-- DEVİR MEKANİZMASI: SATICI BAŞLATIR
-- -------------------------------------------------------------------------
-- Satıcı tek kullanımlık, 48 saat geçerli bir kod üretir; alıcı onu girer.
-- Alternatifi "alıcı plakayı yazıp sahiplenir" olurdu — o, birinin arabanızı
-- sahiplenip servis geçmişinizi alması demek.
--
-- -------------------------------------------------------------------------
-- KVKK: FATURALAR SATICININ KİŞİSEL VERİSİNİ TAŞIYOR
-- -------------------------------------------------------------------------
-- Kullanıcı kararı: faturalar da devredilecek. Gerekçesi "kullanıcı zaten
-- kişisel bilgi içeren belge yüklemez" idi; bu varsayım DOĞRU DEĞİL —
-- faturalar özel bucket'ta ve yalnızca sahibi görüyor, kullanıcı onları tam
-- da gizli olduğu için yüklüyor. Türkiye'de servis faturası ada kesildiği
-- için büyük olasılıkla ad ve adres içeriyor.
--
-- Bu yüzden dayanak varsayım değil, AÇIK RIZA:
--   · `devir_kodlari.riza_metni` — satıcının onayladığı metin AYNEN saklanır.
--     Metin ileride değişirse, geçmiş devirlerde hangi metnin onaylandığı
--     kanıt olarak durur.
--   · `vehicle_ownerships.devir_onayi` — devir anındaki rıza kaydı.
--   · `maintenance_records.yukleyen_user_id` — KVKK silme hakkı. Satıcı
--     ileride "faturalarımı silin" derse hangi dosyaların onun olduğu bilinir.
--     Bu kolon devirde DEĞİŞMEZ.
--
-- Uyarı metni "içermiyordur" değil "İÇEREBİLİR" diye yazılacak.
--
-- -------------------------------------------------------------------------
-- ÖLÇÜLEN ÖN KOŞUL: FATURA DOSYALARI ALICIYA GÖRÜNMÜYOR
-- -------------------------------------------------------------------------
-- Uçtan uca devir testi bunu KANITLADI (varsayım değil):
--
--   devir sonrası, alıcı  ->  kayıtta invoice_path DOLU
--                        ->  dosyayı açamıyor
--
-- Sebep: storage politikası `(storage.foldername(name))[1] = auth.uid()::text`
-- ve dosyalar `<user_id>/<plaka>/<dosya>` yolunda. Devirden sonra dosya hâlâ
-- satıcının klasöründe.
--
-- Çözüm Faz 1.5'e bırakıldı: yolu araca bağlamak (`<plaka>/<dosya>`) ve
-- politikayı "bu aracın şu anki sahibiyim" kontrolüne çevirmek. O zaman devir
-- HİÇBİR dosyaya dokunmaz — sahiplik değişmesi erişimi kendiliğinden verir.
-- Alternatifi (dosyaları devirde taşımak) her devri yarıda kalabilecek bir
-- kopyalama işine çevirirdi.
--
-- -------------------------------------------------------------------------
-- İKİ HATA YAPTIM, İKİSİ DE ÇALIŞMA ANINDA ÇIKTI
-- -------------------------------------------------------------------------
-- 1. `gen_random_bytes(10)` diye çağırdım. Supabase pgcrypto'yu `extensions`
--    şemasına kuruyor, benim `set search_path = public, pg_temp` satırım onu
--    görünmez yapıyordu. search_path'i GENİŞLETMEK yerine çağrıyı tam
--    nitelendirdim (`extensions.gen_random_bytes`): daraltma kasıtlıydı,
--    şema kaçırmaya karşı savunma.
--
--    Hata gözden kaçtı çünkü doğrulama betiğimde `error` alanını okumuyordum,
--    yalnızca `data`ya bakıyordum. `data` null geliyordu ve fonksiyonun null
--    döndürdüğünü sandım.
--
-- 2. `update listings set is_active = false` yazdım — kolon adını
--    DOĞRULAMADAN varsaydım. Gerçek kolon `status varchar default 'active'`.
--    Fonksiyon `column "is_active" does not exist` ile patladı.
--
--    Bu ikinci hata bir şeyi de gösterdi: fonksiyon tek bir işlem olduğu için
--    hata anında HER ŞEY geri alındı — araç satıcıda kaldı, sahiplik satırları
--    bozulmadı, yarım devir oluşmadı. Devir mantığını tek fonksiyona koymanın
--    sebebi tam olarak buydu.
--
-- -------------------------------------------------------------------------
-- SONRAKİ ADIM İÇİN NOT: HESAP SİLİNİRSE SİCİL DE SİLİNİYOR
-- -------------------------------------------------------------------------
-- `vehicles.user_id` FK'si `on delete cascade`. Yani kullanıcı hesabını
-- silerse araçları, bakım kayıtları ve sahiplik geçmişi de silinir. Test
-- hesaplarını temizlerken fark ettim. Bu bir ürün kararı: aracın sicili,
-- sahibinin hesabından bağımsız yaşamalı mı? İkinci el alıcı için cevap
-- muhtemelen "evet". Yol haritasına ayrı madde olarak yazıldı; burada
-- değiştirilmedi çünkü kapsam dışı ve tek başına bir karar gerektiriyor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) PIN ÜRETİMİ SUNUCUYA TAŞINDI
--
-- Devirde PIN yenilenmesi gerekiyor ve bu sunucuda olmak zorunda. Aynı
-- üreteci istemcide de tutmak iki uygulama demek; sunucudaki tek kaynak.
-- Alfabe Crockford Base32 (I, L, O, U yok), 10 karakter = 50 bit — istemcideki
-- pinUretici.js ile aynı biçim.
--
-- Yan fayda: PIN artık istemcinin belirlediği bir değer olmaktan çıkabilir.
-- (Sihirbazı buna bağlamak ayrı bir adım.)
-- -------------------------------------------------------------------------
create or replace function public.pin_uret()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_alfabe text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   -- 32 = 2^5, kalan sapması yok
  v_govde  text;
  v_bayt   bytea;
  i        integer;
begin
  for deneme in 1..10 loop
    v_govde := '';
    -- TAM NİTELENDİRME: pgcrypto `extensions` şemasında (yukarıdaki 1. hata).
    v_bayt := extensions.gen_random_bytes(10);
    for i in 0..9 loop
      -- Baytın ALT 5 BİTİ. Bayt 0-255 düzgün dağılımlıysa alt 5 bit de
      -- 0-31 düzgün dağılımlı: kalan sapması yok.
      v_govde := v_govde || substr(v_alfabe, (get_byte(v_bayt, i) & 31) + 1, 1);
    end loop;
    v_govde := 'CV-' || substr(v_govde,1,5) || '-' || substr(v_govde,6,5);
    if not exists (select 1 from public.vehicles where upper(pin_code) = v_govde) then
      return v_govde;
    end if;
  end loop;
  raise exception 'PIN uretilemedi: 10 denemede benzersiz deger bulunamadi';
end;
$$;

-- -------------------------------------------------------------------------
-- 2) FATURAYI KİM YÜKLEDİ · KVKK silme hakkı için
-- -------------------------------------------------------------------------
alter table public.maintenance_records
  add column if not exists yukleyen_user_id uuid references auth.users(id) on delete set null;

comment on column public.maintenance_records.yukleyen_user_id is
  'Kaydı/faturayı yükleyen kullanıcı. Devirde DEĞİŞMEZ. KVKK silme hakkı bu kolonla uygulanır.';

-- -------------------------------------------------------------------------
-- 3) SAHİPLİK GEÇMİŞİ
-- -------------------------------------------------------------------------
create table if not exists public.vehicle_ownerships (
  id            bigserial   primary key,
  vehicle_plate text        not null references public.vehicles(plate_number) on update cascade on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  baslangic     timestamptz not null default now(),
  bitis         timestamptz,                  -- null = AKTİF sahiplik
  devir_onayi   jsonb,                        -- boş ise ilk kayıt, devir değil
  created_at    timestamptz not null default now()
);

-- Bir aracın AYNI ANDA tek aktif sahibi olabilir. Bu kısıt olmadan yarım
-- kalan bir devir iki aktif sahip bırakabilir ve "sahip kim" cevapsız kalır.
create unique index if not exists arac_tek_aktif_sahip_idx
  on public.vehicle_ownerships (vehicle_plate) where bitis is null;
create index if not exists sahiplik_kullanici_idx
  on public.vehicle_ownerships (user_id, bitis);

alter table public.vehicle_ownerships enable row level security;

-- Kullanıcı yalnızca KENDİ sahiplik kayıtlarını görür. "Bu aracı daha önce
-- kim aldı" bilgisi kişisel veri.
drop policy if exists "sahiplik_oku_kendi" on public.vehicle_ownerships;
create policy "sahiplik_oku_kendi" on public.vehicle_ownerships
  for select to authenticated using (auth.uid() = user_id);
-- Yazma politikası YOK: yalnızca security definer fonksiyonlar yazar.

-- -------------------------------------------------------------------------
-- 4) DEVİR KODLARI + KABA KUVVET KÜTÜĞÜ
-- -------------------------------------------------------------------------
create table if not exists public.devir_kodlari (
  kod              text        primary key,
  vehicle_plate    text        not null references public.vehicles(plate_number) on update cascade on delete cascade,
  veren_user_id    uuid        not null references auth.users(id) on delete cascade,
  riza_metni       text        not null,
  riza_at          timestamptz not null default now(),
  gecerlilik       timestamptz not null,
  kullanildi_at    timestamptz,
  kullanan_user_id uuid        references auth.users(id) on delete set null,
  iptal_at         timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.devir_kodlari enable row level security;
-- Politika YOK: kod aracın sahipliğini veren bir anahtar, istemci bu tabloyu
-- hiç okumamalı. Satıcı kendi kodunu fonksiyon dönüşünden görür.
revoke all on table public.devir_kodlari from anon, authenticated;

create table if not exists public.devir_deneme_log (
  id      bigserial   primary key,
  user_id uuid        not null,
  olustu  timestamptz not null default now()
);
create index if not exists devir_deneme_kullanici_idx
  on public.devir_deneme_log (user_id, olustu desc);
alter table public.devir_deneme_log enable row level security;
revoke all on table public.devir_deneme_log from anon, authenticated;

-- Fonksiyon gövdeleri (devir_kodu_uret, devir_tamamla) panele uygulandı;
-- ayrıntılı gerekçeler yukarıda.

-- =========================================================================
-- UÇTAN UCA DOĞRULANDI (iki gerçek hesap arasında, sonra geri alındı)
--   · satıcı kod üretti, alıcı devri tamamladı
--   · PIN yenilendi (CV-P0QFP-FXH07 -> yeni)
--   · araç alıcıya geçti, satıcı artık göremiyor
--   · bakım kayıtları geçti, puan korundu (60 -> 60)
--   · yukleyen_user_id DEĞİŞMEDİ
--   · alıcı fatura yolunu görüyor ama DOSYAYI AÇAMIYOR (Faz 1.5 gerekçesi)
--   · sahiplik geçmişi: satıcının satırı kapandı, alıcının satırı açıldı
--   · kullanılmış kod tekrar çalışmıyor, iptal edilen kod çalışmıyor
--   · başkasının aracına kod üretilemiyor, kendine devir reddediliyor
--   · rıza metni boşsa kod üretilmiyor
--   · 9. geçersiz denemede kaba kuvvet freni devreye girdi
--   · devir_kodlari ve devir_deneme_log hiçbir istemci rolüne açık değil
--
-- Test sonrası temizlik: test hesapları silindi, araç geri devredildi,
-- test devirlerinin bıraktığı sahte sahiplik geçmişi kaldırıldı. Sicilin
-- gerçeği yansıtması bu projenin temel kuralı — test artığı bir devir kaydı
-- bırakmak onu ihlal ederdi.
-- =========================================================================
