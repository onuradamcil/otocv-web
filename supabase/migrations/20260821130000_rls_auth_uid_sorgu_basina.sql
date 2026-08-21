-- =========================================================================
-- RLS: auth.uid() ARTIK SATIR BAŞINA DEĞİL, SORGU BAŞINA HESAPLANIYOR
--
-- -------------------------------------------------------------------------
-- NİYE — 100 BİN KULLANICI SENARYOSUNUN BİRİNCİ DARBOĞAZI
-- -------------------------------------------------------------------------
-- `auth.uid()` bir fonksiyon çağrısı. RLS ifadesinde çıplak yazıldığında
-- PostgreSQL onu TARANAN HER SATIR için yeniden çağırıyor. 11 araçta fark
-- edilmez; 100 bin araçta tek bir sorgu 100 bin fonksiyon çağrısı demek.
--
-- `(select auth.uid())` yazıldığında planlayıcı ifadeyi InitPlan'a alıyor:
-- sorgu başına BİR kez hesaplanıp sonuç yeniden kullanılıyor.
--
-- Supabase'in kendi denetçisi bunu 18 politikada işaretlemişti
-- (`auth_rls_initplan`, WARN). Ölçüldü: uygulamadan sonra 0 kaldı.
--
-- -------------------------------------------------------------------------
-- ⚠ DAVRANIŞ DEĞİŞMİYOR — BU BİR GÜVENLİK DEĞİŞİKLİĞİ DEĞİL
-- -------------------------------------------------------------------------
-- `auth.uid()` sorgu boyunca zaten sabit: oturum aynı, kullanıcı aynı. Her
-- satırda yeniden çağırmak aynı değeri üretiyordu. Yani kimin neyi gördüğü
-- birebir aynı kalıyor, yalnızca aynı cevabı 100 bin kez hesaplamaktan
-- vazgeçiyoruz.
--
-- ⚠ `DROP` + `CREATE` DEĞİL, `ALTER POLICY` KULLANILDI. Sebebi ölçülü bir
-- tercih: `ALTER` politikanın ADINI, KOMUTUNU ve ROLLERİNİ hiç ellemiyor,
-- yalnızca ifadeyi değiştiriyor. `DROP`+`CREATE` ile bu üçünden birini
-- yanlış yazmak politikayı sessizce genişletebilirdi — RLS'te bu, kullanıcı
-- verisinin başkasına açılması demek. Ayrıca `DROP` ile `CREATE` arasında
-- politikanın hiç olmadığı bir an oluşmuyor.
--
-- ⚠ SADECE `auth.uid()` SARMALANDI. İfadelerin geri kalanına, kolon
-- adlarına, `AND`/`OR` kurgusuna dokunulmadı.
-- =========================================================================

alter policy "hesap_kapatma_oku_kendi" on public.hesap_kapatma_talepleri
  using ((select auth.uid()) = user_id);

alter policy "Kullanıcılar kendi ilanlarını yönetebilir" on public.listings
  using ((select auth.uid()) = user_id);

alter policy "vitrin_kaydi_sahibine_gorunur" on public.listings
  using ((select auth.uid()) = user_id);

-- ⚠ Buradaki `konusma_tarafi_miyim(konusma_id)` BİLEREK sarmalanmadı:
-- argümanı satıra bağlı (`konusma_id`), yani gerçekten her satır için
-- farklı cevap veriyor. Sarmalamak yanlış sonuç üretirdi.
alter policy "mesaj_oku_taraf" on public.mesajlar
  using (konusma_tarafi_miyim(konusma_id) and (teslim or (gonderen_id = (select auth.uid()))));

alter policy "Kullanıcılar kendi bildirimlerini oluşturabilir" on public.notifications
  with check ((select auth.uid()) = user_id);

alter policy "Kullanıcılar sadece kendi bildirimlerini görüntüleyebilir." on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Kullanıcılar sadece kendi bildirimlerini güncelleyebilir." on public.notifications
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Kullanıcılar sadece kendi bildirimlerini silebilir." on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Kullanıcılar kendi profillerini görebilir." on public.profiles
  using ((select auth.uid()) = id);

alter policy "profil_guncelle_kendi" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "profil_olustur_kendi" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "satin_alma_oku_kendi" on public.satin_almalar
  using ((select auth.uid()) = user_id);

alter policy "teklif_talebi_oku_kendi" on public.teklif_talepleri
  using ((select auth.uid()) = user_id);

alter policy "Kullanıcı kendi taslağını görebilir ve yönetebilir" on public.vehicle_drafts
  using ((select auth.uid()) = user_id);

alter policy "sahiplik_oku_kendi" on public.vehicle_ownerships
  using ((select auth.uid()) = user_id);

alter policy "Kullanıcılar sadece kendi aracını yönetebilir" on public.vehicles
  using ((select auth.uid()) = user_id);

alter policy "Kullanıcılar sadece kendi garajına araç ekleyebilir" on public.vehicles
  with check ((select auth.uid()) = user_id);

alter policy "vehicles_oku_sahip" on public.vehicles
  using ((select auth.uid()) = user_id);
