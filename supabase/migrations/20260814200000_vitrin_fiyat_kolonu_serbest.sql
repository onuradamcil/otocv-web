-- =========================================================================
-- listings.price ARTIK ZORUNLU DEĞİL
--
-- -------------------------------------------------------------------------
-- NİYE — BENİM YARATTIĞIM BİR REGRESYONUN ONARIMI
-- -------------------------------------------------------------------------
-- Araca ait fiyat gösterimi kaldırıldı (platformu satış sitesi konumuna
-- sokuyordu). Uygulama artık `price` alanını hiç yazmıyor. Ama sütun
-- `not null` kaldığı için vitrine çıkarma tamamen kırıldı:
--
--   null value in column "price" of relation "listings"
--   violates not-null constraint
--
-- Yani ürün kararı uygulandı ama şema onunla birlikte güncellenmedi.
-- Sütun DÜŞÜRÜLMÜYOR, yalnızca serbest bırakılıyor: mevcut satırdaki değer
-- geçmiş veri ve silmek geri alınamaz.
--
-- -------------------------------------------------------------------------
-- DİĞER ZORUNLU ALANLAR NİYE SERBEST BIRAKILMIYOR
-- -------------------------------------------------------------------------
-- `title`, `description`, `city`, `district` de `not null`. Onlar KALIYOR,
-- çünkü gerçekten gerekli: başlıksız ya da konumsuz bir vitrin kartı
-- alıcıya hiçbir şey anlatmıyor. Bu alanlar araç kaydından geliyor ve
-- eksikse arayüz yayınlamayı ENGELLİYOR (sebebini yazarak) — veritabanı
-- hatasıyla karşılaşmak yerine ne yapması gerektiğini söylüyor.
-- =========================================================================

alter table public.listings
  alter column price drop not null;

comment on column public.listings.price is
  'KULLANILMIYOR. Araca ait fiyat gösterimi platformu satış sitesi konumuna sokuyor; uygulama bu alanı ne yazıyor ne okuyor. Sütun geçmiş veri için duruyor.';
