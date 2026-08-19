-- =========================================================================
-- ARAMA ALTYAPISI · NORMALİZE SÜTUN + TRİGRAM İNDEKSLERİ
--
-- -------------------------------------------------------------------------
-- NİYE GEREKİYOR
-- -------------------------------------------------------------------------
-- `arac_arama()` bugün LIMIT'siz: görünür envanterin TAMAMINI tek JSON
-- olarak döndürüyor ve süzme/sıralama/sayfalama/sayaçlar tarayıcıda
-- yapılıyor. 11 araçta sorunsuz; yüz binlerce araçta her arama tüm tabloyu
-- serileştirir. Bu dosya, aramanın sunucuya taşınabilmesi için gereken
-- zemini kuruyor (RPC bir sonraki migration'da).
--
-- -------------------------------------------------------------------------
-- NİYE TAM METİN ARAMASI (FTS) DEĞİL, TRİGRAM
-- -------------------------------------------------------------------------
-- PostgreSQL'in yerleşik `turkish` yapılandırması Türkçe DÜZYAZI için
-- yapılmış: kelimeleri gövdesine indiriyor. Ama burada aranan şey düzyazı
-- değil — "Bentley", "Continental", "M Sport", "320i", "X-PACK" gibi özel
-- isimler ve alfanümerik donanım kodları. Türkçe gövdeleyici bunları
-- yanlış köke indirir ve eşleşmeyi bozar.
--
-- Trigram (`pg_trgm`) kelimeyi anlamlandırmaya çalışmıyor, üç harflik
-- parçalara bakıyor. Bu yüzden özel isimlerde doğru davranıyor ve üstüne
-- yazım hatası toleransı veriyor: "bently" -> Bentley.
--
-- -------------------------------------------------------------------------
-- ⚠ TÜRKÇE 'I' TUZAĞI — SIRALAMA ÖNEMLİ
-- -------------------------------------------------------------------------
-- `lower('İ')` veritabanı sıralama düzenine göre 'i' + BİRLEŞTİRİCİ NOKTA
-- üretiyor (iki kod noktası). Bu, görünüşte 'i' olan ama eşleşmeyen bir
-- dize demek. Aynı tuzak istemci tarafında da yaşandı ve orada da çözüm
-- aynı oldu: ÖNCE harfleri katla, SONRA küçült.
--
-- `translate()` tek tek kod noktası eşliyor, sıralama düzeninden
-- etkilenmiyor. ⚠ KAYNAK VE HEDEF BİREBİR HİZALI OLMAK ZORUNDA (58/58);
-- bir karakter kayarsa translate sessizce YANLIŞ harf üretir ve arama
-- gizliden gizliye bozulur. Ölçüldü: uzunluklar eşit, örnekler doğru.
--
-- Türkçe harflerin yanına Avrupa aksanları da eklendi. Katalogda bugün
-- yalnızca 'é' geçiyor (ölçüldü: - : . ( ) / & + ç Ç é ğ İ ı ö Ö ş Ş ü),
-- ama marka isimleri Citroën / Škoda gibi aksanlar taşıyabiliyor ve
-- kullanıcı bunları aksansız yazıyor. Doğrulandı:
--     CITROËN -> citroen,  Citroën -> citroen,  ŠKODA -> skoda
--     MİNİ    -> mini,     Mini    -> mini      (yanlış sırada mi̇ni̇ olurdu)
-- =========================================================================

create extension if not exists pg_trgm;

-- -------------------------------------------------------------------------
-- Normalize edici. IMMUTABLE olmak ZORUNDA: hem üretilmiş sütunda hem de
-- indeks ifadesinde kullanılıyor, PostgreSQL ikisinde de değişmezlik şartı
-- arıyor.
--
-- ⚠ BU FONKSİYONUN GÖVDESİ DEĞİŞİRSE saklanan sütunlar KENDİLİĞİNDEN
-- yeniden hesaplanmaz. Değiştirmek gerekirse sütunları da tazelemek şart,
-- yoksa arama sessizce eskimiş veriye bakar.
-- -------------------------------------------------------------------------
create or replace function public.arama_normalize(p_metin text)
returns text
language sql
immutable
parallel safe
set search_path to 'pg_catalog', 'public'
as $$
  select nullif(
    btrim(
      regexp_replace(
        lower(translate(coalesce(p_metin, ''), 'ÇĞİIÖŞÜçğıiöşüÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÚÙÛÑŠŽÝáàâäéèêëíìîïóòôúùûñšžý', 'cgiiosucgiiosuaaaaeeeeiiiiooouuunszyaaaaeeeeiiiiooouuunszy')),
        '\s+', ' ', 'g'
      )
    ),
  '');
$$;

comment on function public.arama_normalize(text) is
  'Arama karşılaştırması için metni katlar: Türkçe harfler ASCII''ye, sonra küçük harf. Önce translate, sonra lower — ters sırada İ birleştirici nokta üretiyor.';

-- -------------------------------------------------------------------------
-- ARAÇ TARAFI ARAMA METNİ
--
-- İstemcideki bugünkü arama şu alanlara bakıyor: brand, model, series,
-- package, listing_title, city, pin_code. Bunların araca ait olanları tek
-- sütunda toplanıyor; ilan başlığı `listings` tablosunda olduğu için ayrı
-- (aşağıda).
--
-- `district` de ekleniyor: şehir aranabiliyorsa ilçe de aranabilmeli,
-- kullanıcı "Etimesgut" yazdığında boş dönmesi şaşırtıcı olurdu.
-- -------------------------------------------------------------------------
alter table public.vehicles
  add column if not exists arama_metni text
  generated always as (
    public.arama_normalize(
      coalesce(brand, '')     || ' ' || coalesce(series, '')   || ' ' ||
      coalesce(model, '')     || ' ' || coalesce(package, '')  || ' ' ||
      coalesce(city, '')      || ' ' || coalesce(district, '') || ' ' ||
      coalesce(pin_code, '')
    )
  ) stored;

alter table public.listings
  add column if not exists arama_metni text
  generated always as (
    public.arama_normalize(
      coalesce(title, '') || ' ' || coalesce(city, '') || ' ' || coalesce(district, '')
    )
  ) stored;

-- -------------------------------------------------------------------------
-- İNDEKSLER
--
-- ⚠ GIN + gin_trgm_ops: `%kelime%` aramasını indeksten karşılayan tek yol.
-- Düz btree bu desende kullanılamıyor (baştan eşleşme gerektiriyor).
-- -------------------------------------------------------------------------
create index if not exists vehicles_arama_trgm_idx
  on public.vehicles using gin (arama_metni gin_trgm_ops);

create index if not exists listings_arama_trgm_idx
  on public.listings using gin (arama_metni gin_trgm_ops);

-- Marka ağacı dört kademeyi NORMALİZE karşılaştırıyor (istemcideki
-- `agacAnahtari` ile aynı kural). İfade indeksleri o karşılaştırmayı
-- indeksten karşılıyor.
create index if not exists vehicles_marka_agaci_idx
  on public.vehicles (
    public.arama_normalize(brand),
    public.arama_normalize(series),
    public.arama_normalize(model),
    public.arama_normalize(package)
  );

-- Süzgeç boyutları. Bugün `vehicles` tablosunda aranan HİÇBİR alanda
-- indeks yoktu; 11 satırda fark etmiyor, ölçekte tamamı sıralı tarama.
create index if not exists vehicles_sehir_idx        on public.vehicles (city);
create index if not exists vehicles_yakit_idx        on public.vehicles (fuel_type);
create index if not exists vehicles_vites_idx        on public.vehicles (transmission);
create index if not exists vehicles_tramer_idx       on public.vehicles (tramer_status);
create index if not exists vehicles_yil_idx          on public.vehicles (year);
create index if not exists vehicles_km_idx           on public.vehicles (km);
create index if not exists vehicles_sicil_idx        on public.vehicles (trust_score);
create index if not exists vehicles_olusturma_idx    on public.vehicles (created_at desc);

-- Sıralama "öne çıkanlar önce, sonra yeni" — birleşik indeks ikisini
-- birden karşılıyor.
create index if not exists listings_siralama_idx
  on public.listings (is_featured desc, created_at desc)
  where status = 'active';
