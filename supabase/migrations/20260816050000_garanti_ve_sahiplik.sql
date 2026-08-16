-- =========================================================================
-- GARANTİ VE İLK SAHİPLİK — SORULAN AMA KAYDEDİLMEYEN İKİ ALAN
--
-- -------------------------------------------------------------------------
-- NİYE VAR
-- -------------------------------------------------------------------------
-- Araç kayıt sihirbazı üç soru soruyordu — Garanti Durumu, Aracın İlk
-- Sahibiyim, Takas Olur mu — ve ÜÇÜNÜN DE veritabanında karşılığı yoktu.
-- Kullanıcı cevaplıyor, cevap `formData` içinde kalıyor ve kayıt
-- payload'una hiç girmeden uçuyordu.
--
-- Ürün sahibinin kararı (16 Ağustos 2026):
--   · TAKAS kaldırıldı — satış kavramı. Bu ürün araç satış sitesi değil,
--     dijital sicil; ürünle ilgili satış/fiyat dili platformu satış sitesi
--     konumuna sokuyor.
--   · GARANTİ ve İLK SAHİPLİK kaydedilecek — ikisi de gerçek araç bilgisi
--     ve sicil değerini artırıyor.
--
-- -------------------------------------------------------------------------
-- ⚠ NİYE `boolean` DEĞİL `boolean NULL` — ÜÇ DURUM VAR, İKİ DEĞİL
-- -------------------------------------------------------------------------
-- Alanların ikisi de ZORUNLU DEĞİL. `not null default false` yazmak,
-- soruyu cevaplamamış her aracı "garantisi yok" ve "ilk sahibi değil"
-- diye kaydetmek olurdu — kullanıcının adına yapılmamış bir beyan.
--
-- Bu tam olarak bu üründen temizlenen kusur: `tramer_status` bir ara
-- boşken 'Hasarsız' yazıyordu ve karne aracı "Temiz" diye basıyordu.
-- Çözüm orada da aynıydı: bilinmiyor DURUMU KORUNUR.
--
--   null   = kullanıcı cevaplamadı  -> ekranda satır çizilmiyor
--   true   = "Var" / "İlk Sahibiyim"
--   false  = "Yok" / "İlk Sahibi Değilim"
--
-- -------------------------------------------------------------------------
-- ⚠ `spare_key` (YEDEK ANAHTAR) BİLEREK EKLENMEDİ
-- -------------------------------------------------------------------------
-- Önizleme ekranı `formData.spareKey || 'Var'` yazıyordu ve sihirbazda
-- yedek anahtar diye bir alan HİÇ YOK — yani her araç için, hiç
-- sorulmadan "yedek anahtarı var" beyanı basılıyordu. Sütun eklemek
-- yerine o satır kaldırıldı: sorulmayan şey beyan edilmez.
-- =========================================================================

alter table public.vehicles
  add column if not exists has_warranty  boolean,
  add column if not exists is_first_owner boolean;

comment on column public.vehicles.has_warranty is
  'Üretici/yetkili servis garantisi devam ediyor mu? null = kullanıcı beyan etmedi.';

comment on column public.vehicles.is_first_owner is
  'Aracın ilk sahibi mi? null = kullanıcı beyan etmedi.';
