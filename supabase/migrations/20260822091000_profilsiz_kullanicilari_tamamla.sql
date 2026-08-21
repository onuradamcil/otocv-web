-- =========================================================================
-- PROFİLSİZ KALMIŞ KULLANICILARI TAMAMLA (tek seferlik onarım)
--
-- Ölçüldü (21.08.2026): 8 kullanıcıdan 1'inin profili yoktu — Google ile
-- giren kullanıcı (15.07.2026). Profil yalnızca e-posta kayıt formunda
-- oluşturuluyordu; OAuth geri dönüşünde oluşturan hiçbir kod yoktu.
-- O kullanıcının Hesabım ekranı boş görünüyordu.
--
-- `handle_new_user` bundan SONRAKİ kayıtları çözüyor; bu migration
-- GEÇMİŞTE kalanları tamamlıyor.
--
-- ⚠ YALNIZCA EKLEME YAPIYOR. Var olan hiçbir profile dokunmuyor
-- (`where not exists`). Ad/soyad üretimi tetikleyicideki mantığın aynısı.
--
-- Uygulama sonrası ölçüldü: 8 kullanıcı / 8 profil / 0 eksik.
-- =========================================================================

insert into public.profiles (id, first_name, last_name, phone_number)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'first_name'), ''),
    nullif(split_part(btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
                                     u.raw_user_meta_data ->> 'name', '')), ' ', 1), ''),
    split_part(u.email, '@', 1),
    'Kullanıcı'
  ) as first_name,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'last_name'), ''),
    nullif(btrim(substr(
      btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
                     u.raw_user_meta_data ->> 'name', '')),
      length(split_part(btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
                                       u.raw_user_meta_data ->> 'name', '')), ' ', 1)) + 2
    )), ''),
    ''
  ) as last_name,
  nullif(btrim(u.raw_user_meta_data ->> 'phone_number'), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
