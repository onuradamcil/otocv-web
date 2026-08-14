-- =========================================================================
-- DEVİR TALEP YOLU KAPATILDI
--
-- -------------------------------------------------------------------------
-- NİYE — İKİ SEBEP, İKİSİ DE ÖLÇÜLDÜ
-- -------------------------------------------------------------------------
-- `devir_talep_et(p_plaka, p_mesaj)` herhangi bir oturumlu kullanıcının,
-- YALNIZCA PLAKAYI BİLEREK araç sahibine bildirim göndermesine izin
-- veriyordu.
--
-- 1. TACİZ KANALI. Plakalar sokakta görünüyor. Bir plakayı fotoğraflayan
--    herkes o aracın sahibine bildirim gönderebiliyordu. Devir kodu ise
--    gerçek bir kanıt: kodu bilen kişi satıcıyla temas kurmuş demektir.
--
-- 2. ZATEN İŞLEMİYORDU. Yolun arayüzdeki gerekçesi "satıcıya
--    ulaşamıyorsanız" idi. Ama karar fonksiyonu
--    `devir_talep_karari(p_istek_id, p_onay, p_riza_metni)` araç sahibinin
--    AKTİF ONAYINI ve rıza metnini istiyor — ulaşılamayan satıcı talebi de
--    onaylayamaz. Satıcı ulaşılabilir olduğunda ise zaten devir kodu
--    üretebiliyor.
--
-- Yani yol, çalışmayan bir işlev karşılığında çalışan bir taciz kanalı
-- açıyordu.
--
-- -------------------------------------------------------------------------
-- NİYE FONKSİYON SİLİNMİYOR, YALNIZCA YETKİSİ ALINIYOR
-- -------------------------------------------------------------------------
-- `devir_istekleri` tablosunda 15 onaylanmış kayıt var ve
-- `devir_talep_karari` ile satıcının "Gelen Talepler" ekranı bu kayıtları
-- okumaya devam ediyor. Fonksiyonu düşürmek geçmişi okunamaz kılardı.
-- Bekleyen talep YOK (kontrol edildi), dolayısıyla yetkiyi almak kimseyi
-- yarı yolda bırakmıyor.
--
-- Geri açmak istenirse tek satır: grant execute ... to authenticated.
-- =========================================================================

-- ÜÇ REVOKE birden. Bu ders bu projede defalarca öğrenildi:
--   · `from public` PUBLIC devralmasını kaldırır ama isimle verilmiş
--     anon/authenticated yetkilerini bırakır
--   · `from anon, authenticated` isimle verilenleri kaldırır ama PUBLIC
--     devralmasını bırakır
-- İkisi birlikte yazılmadan yetki gerçekten kapanmıyor.
revoke all on function public.devir_talep_et(text, text) from public;
revoke all on function public.devir_talep_et(text, text) from anon, authenticated;

-- service_role'a açıkça geri veriliyor: bakım betikleri ve olası bir
-- yönetim ekranı için gerekli. PUBLIC'ten alınca o da kayboluyor.
grant execute on function public.devir_talep_et(text, text) to service_role;

comment on function public.devir_talep_et(text, text) is
  'KAPALI: istemciden çağrılamaz. Plakayı bilen herkesin araç sahibine bildirim göndermesine izin verdiği için yetkisi geri alındı. Devir yalnızca devir kodu ile yapılıyor. Yalnızca service_role çağırabilir.';
