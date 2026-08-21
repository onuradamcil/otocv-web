-- =========================================================================
-- YABANCI ANAHTAR İNDEKSLERİ
--
-- -------------------------------------------------------------------------
-- NİYE — İKİ AYRI SEBEP
-- -------------------------------------------------------------------------
-- (a) OKUMA: `vehicles.user_id` bu ürünün en sıcak yüklemi. Garaj ekranının
--     ana sorgusu ve `vehicles` üzerindeki HER RLS denetimi bu sütunu
--     süzüyor. İndekssiz her sorgu tam tarama demek.
--
-- (b) SİLME: Ebeveyn satırı silinirken PostgreSQL, yabancı anahtarı ihlal
--     eden çocuk var mı diye ÇOCUK TABLOYU TARIYOR. İndeks yoksa bu tarama
--     tam tarama oluyor. Bu üründe hesap kapatma gerçek bir özellik
--     (`hesap_kapatma_talepleri`) — 100 bin kullanıcıda tek bir hesap
--     silme işlemi dakikalar sürebilirdi.
--
-- ⚠ BEDELİ VAR VE BİLEREK ÖDENİYOR: her indeks, her INSERT/UPDATE'te
-- güncelleniyor. Buradakiler dar (tek uuid sütunu) olduğu için yazma
-- maliyeti düşük; karşılığında alınan okuma ve silme kazancı çok daha büyük.
--
-- ⚠ `CONCURRENTLY` KULLANILMADI. Bugün tablolar küçük (en büyüğü 11 satır),
-- indeks milisaniyeler içinde kuruluyor ve `CONCURRENTLY` migration
-- işleminin içinde çalışamıyor. VERİ BÜYÜDÜKTEN SONRA eklenecek her indeks
-- `CREATE INDEX CONCURRENTLY` ile kurulmalı — yoksa tabloyu yazmaya kapatır.
--
-- ⚠ SUPABASE DENETÇİSİ BUNLARI YAKINDA "KULLANILMAMIŞ İNDEKS" DİYE
-- İŞARETLEYECEK. Etmesi normal: 11 satırlık bir tabloda planlayıcı indeks
-- kullanmaz, tam tarama daha ucuzdur. Bu indeksler bugün için değil, 100
-- bin kullanıcı için konuyor. DÜŞÜRMEYİN.
--
-- Aynı tuzak katalog ve arama indeksleri için de geçerli
-- (`vehicles_arama_trgm_idx`, `vehicles_marka_agaci_idx` ...): denetçi
-- onları da "kullanılmamış" sayıyor çünkü envanterde 11 araç var.
-- =========================================================================

-- --- Sıcak yol: garaj sorgusu + vehicles RLS yüklemi -----------------
create index if not exists vehicles_user_id_idx
  on public.vehicles (user_id);

-- --- RLS yüklemi: mesaj_oku_taraf içinde `gonderen_id = auth.uid()` --
create index if not exists mesajlar_gonderen_id_idx
  on public.mesajlar (gonderen_id);

-- --- Büyüyecek tablolar + hesap silmede çocuk taraması ---------------
create index if not exists bakim_yukleyen_user_id_idx
  on public.maintenance_records (yukleyen_user_id);

create index if not exists devir_istekleri_karar_veren_idx
  on public.devir_istekleri (karar_veren_user_id);

create index if not exists devir_istekleri_satin_alma_idx
  on public.devir_istekleri (satin_alma_id);

create index if not exists devir_kodlari_veren_user_id_idx
  on public.devir_kodlari (veren_user_id);

create index if not exists engellemeler_engellenen_id_idx
  on public.engellemeler (engellenen_id);

create index if not exists mesaj_sikayetleri_sikayet_eden_idx
  on public.mesaj_sikayetleri (sikayet_eden_id);
