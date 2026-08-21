-- =========================================================================
-- YENİ KULLANICI → PROFİL SATIRI (auth.users tetikleyicisi)
--
-- -------------------------------------------------------------------------
-- NİYE — İKİ AYRI SORUNU BİRDEN ÇÖZÜYOR
-- -------------------------------------------------------------------------
-- 1. E-POSTA DOĞRULAMASININ ÖNÜNDEKİ ENGEL
--    Kayıt akışı bugün şöyle: `signUp()` → istemciden `profiles.insert()`.
--    Doğrulama açıldığı anda `signUp` OTURUM DÖNDÜRMÜYOR; o insert
--    `profil_olustur_kendi` politikasına (`auth.uid() = id`) takılıp
--    reddediliyor ve KAYIT TAMAMEN KIRILIYOR. Profil oluşturma sunucuya
--    taşınmadan doğrulama açılamaz.
--
-- 2. GOOGLE İLE GİRENLERİN PROFİLİ HİÇ OLUŞMUYOR — ÖLÇÜLDÜ
--    21.08.2026 itibarıyla 8 kullanıcıdan 7'sinin profili vardı. Eksik olan
--    tek kişi Google ile giren kullanıcıydı (15.07.2026). Sebep açık: profil
--    yalnızca e-posta kayıt formunda oluşturuluyor, OAuth geri dönüşünde
--    oluşturan hiçbir kod yok. O kullanıcının Hesabım ekranı boştu.
--
-- -------------------------------------------------------------------------
-- ⚠ AD/SOYAD ÜÇ KAYNAKTAN, SIRAYLA
-- -------------------------------------------------------------------------
-- `first_name` ve `last_name` NOT NULL. Boş bırakılamaz, yani her durumda
-- bir değer üretilmeli:
--
--   1. `first_name` / `last_name`   — e-posta kaydında formdan gelir
--   2. `full_name` / `name`         — Google bunları gönderiyor (ölçüldü)
--   3. e-posta adresinin @ öncesi   — son çare, hiçbiri yoksa
--
-- Soyad hiçbir kaynaktan gelmezse BOŞ DİZE yazılıyor, uydurma bir değer
-- değil. Kullanıcı Hesabım'dan düzeltebiliyor.
--
-- -------------------------------------------------------------------------
-- ⚠ HATA KAYDI DÜŞÜRMÜYOR — BİLİNÇLİ VE TARTIŞMALI BİR TERCİH
-- -------------------------------------------------------------------------
-- Tetikleyici `auth.users` INSERT'inin İÇİNDE çalışıyor. Burada fırlatılan
-- bir hata, kullanıcı kaydının TAMAMINI geri alır — yani tek bir profil
-- sorunu yüzünden hiç kimse kaydolamaz.
--
-- Bu yüzden istisna yakalanıp `warning` olarak loglanıyor. Bedeli:
-- profilsiz bir kullanıcı oluşabilir (bugünkü Google durumunun aynısı).
-- Karşılığı: profil katmanındaki bir arıza kayıt kapısını kapatmıyor.
--
-- Bu tercihin gerçekleşme olasılığı düşük tutuldu: tek insert, tüm NOT NULL
-- kolonlar dolduruluyor ve `on conflict do nothing` var.
--
-- -------------------------------------------------------------------------
-- UYGULAMA SONRASI DENEYEREK DOĞRULANDI
-- -------------------------------------------------------------------------
-- Geçici bir kullanıcı `admin.createUser` ile açıldı:
--   ✅ profil kendiliğinden oluştu
--   ✅ "Kullanici Ikinci" boşluklu soyadı doğru bölündü
--   ✅ telefon `user_metadata`'dan taşındı
--   ✅ kullanıcı silinince profil de kaskatla gitti
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_ad    text;
  v_soyad text;
  v_tam   text;
begin
  v_ad    := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  v_soyad := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');

  -- Formdan gelmediyse OAuth'un tam adını böl.
  if v_ad is null then
    v_tam := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name',
                                   new.raw_user_meta_data ->> 'name')), '');
    if v_tam is not null then
      v_ad := split_part(v_tam, ' ', 1);
      -- İlk boşluktan sonrası soyad. "Ali Veli Han" -> "Ali" + "Veli Han"
      v_soyad := nullif(btrim(substr(v_tam, length(split_part(v_tam, ' ', 1)) + 2)), '');
    end if;
  end if;

  -- NOT NULL güvencesi. Ad hiç yoksa e-postanın @ öncesi; soyad yoksa BOŞ
  -- DİZE — uydurma bir soyad yazmak kullanıcının adını yanlış göstermek olur.
  v_ad    := coalesce(v_ad, split_part(new.email, '@', 1), 'Kullanıcı');
  v_soyad := coalesce(v_soyad, '');

  begin
    insert into public.profiles (id, first_name, last_name, phone_number)
    values (
      new.id,
      v_ad,
      v_soyad,
      nullif(btrim(new.raw_user_meta_data ->> 'phone_number'), '')
    )
    on conflict (id) do nothing;
  exception when others then
    -- ⚠ Bkz. dosya başı: burada fırlatmak kayıt kapısını kapatır.
    raise warning 'handle_new_user: profil olusturulamadi (user_id=%): %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users INSERT sonrası profil satırını oluşturur. E-posta doğrulaması '
  'açıldığında istemci profil yazamayacağı için şart; ayrıca OAuth ile '
  'girenlerin profilsiz kalması sorununu da çözer.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
