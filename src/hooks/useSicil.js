// =========================================================================
// useSicil — BAKIM SİCİLİNİ PIN İLE ÇEKEN TEK OKUMA YOLU
//
// -------------------------------------------------------------------------
// NEDEN BU HOOK VAR
// -------------------------------------------------------------------------
// Bakım geçmişini iki ekran okuyor: araç detayı ve karne. İkisi de eskiden
// `maintenance_records` tablosunu plakayla sorguluyordu:
//
//   supabase.from('maintenance_records').select('*').eq('vehicle_plate', plaka)
//
// Bu sorgu RLS açıldığı anda ziyaretçi için 0 satır döndürür — çünkü
// tabloya doğrudan erişim artık yalnızca araç sahibine açık. Ziyaretçinin
// okuma yolu `sicil_getir(pin)` fonksiyonu.
//
// İki ekranı ayrı ayrı düzeltmek yerine tek hook'a bağlandı: aynı sorguyu
// iki yerde tutmak, birini güncelleyip diğerini atlamaya davetiye. Nitekim
// eski hâlinde iki ekran farklı sıralama kullanıyordu (biri `created_at`,
// diğeri `km_at_service`) ve bu fark hiçbir yerde kasıtlı değildi.
//
// -------------------------------------------------------------------------
// SIRALAMA
// -------------------------------------------------------------------------
// Fonksiyon `service_date desc` döndürüyor. Bu, eski iki sıralamanın
// ikisinden de doğru: bakım geçmişi işlem tarihine göre okunur.
// `created_at` kaydın SİSTEME GİRİLDİĞİ an — kullanıcı üç yıl önceki bir
// bakımı bugün girdiğinde listenin başına çıkıyordu. `km_at_service` ise
// kilometre tutarlılığı hesabını yanıltıyordu (karneHelper artık kendi
// içinde tarihe göre sıralayarak bu tuzağı kapatıyor).
//
// -------------------------------------------------------------------------
// SESSİZ HATA YOK
// -------------------------------------------------------------------------
// Fonksiyon çağrısı başarısız olursa eski tablo sorgusuna DÜŞMÜYORUZ.
// Öyle bir yedek yol, RLS açıkken boş liste döndürüp "bu aracın bakım
// kaydı yok" gibi görünürdü — veri kaybı izlenimi, sebebi görünmeyen bir
// hata. Hata `hata` alanında dışarı veriliyor, çağıran onu gösteriyor.
//
// -------------------------------------------------------------------------
// SONSUZ YÜKLENİYOR KAPATILDI
// -------------------------------------------------------------------------
// Bu hook'ta `try/catch/finally` YOKTU. `supabase.rpc` promise'i reddederse
// (ağ kopması, sunucu ölümü, CORS) `setYukleniyor(false)` satırına hiç
// gelinmiyordu ve `yukleniyor` sonsuza kadar `true` kalıyordu. Kullanıcının
// gördüğü kalıcı iskeletin kod içindeki en net yolu buydu.
//
// Artık: `finally` yükleme durumunu her koşulda kapatıyor, `zamanAsimiyla`
// asılı kalan isteği 15 saniyede kesiyor ve `yenile()` gerçek bir çıkış
// yolu sunuyor.
// =========================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { zamanAsimiyla, agHatasiMetni } from '../lib/istek';

// PIN henüz üretilmemişken arayüzde kullanılan yer tutucular. Sorguya
// sokmak boşuna istek demek.
const YER_TUTUCULAR = new Set(['CV-PENDING', 'CV-RESMI', 'CV-YOK']);

/**
 * PIN ile araç sicilini çeker.
 *
 * @param {string} pin Araç PIN kodu (örn. 'CV-000002')
 * @returns {{kayitlar: Array, arac: object|null, sahipMi: boolean,
 *            sahipsizOzet: object|null, yukleniyor: boolean,
 *            hata: string|null, yenile: Function}}
 *
 * `sahipsizOzet` dolu geldiğinde araç sahipsiz havuzda demektir: `arac` ve
 * `kayitlar` boş olur ama bu bir hata DEĞİLDİR — sicil duruyor, yalnızca
 * kapalı. Özet `{marka, model, yil, kayit, faturali, sicil_puani,
 * sahipsiz_kaldi_at}` alanlarını taşır.
 */
export function useSicil(pin, secenekler = {}) {
  // -----------------------------------------------------------------------
  // HAZIR VERİ — ÇİFT SORGUYU KAPATAN YOL
  //
  // Detay ve karne rotaları `sicil_getir`'i zaten çağırıyor ve dönen
  // nesnenin içinde `bakim_kayitlari` DA geliyor. Ama sayfalar yalnızca
  // `arac` alanını kullanıp kayıtları atıyor, sonra ekran bileşeni bu
  // hook'la AYNI fonksiyonu ikinci kez çağırıyordu.
  //
  // Bedeli ölçüldü: her sayfa görüntülemesi `sicil_sorgu_log`'a iki satır
  // yazıyor. Hız sınırı 10 dakikada 20 BAŞARISIZ sorguda devreye girip
  // geçerli PIN'leri de 10 dakika bloklüyor — çift sayım yüzünden gerçek
  // eşik 20 değil 10 hatalı denemeydi. "Karne bölümüne geçemiyorum"
  // şikâyetinin ölçülebilir sebebi buydu.
  //
  // Çağıran hazır kayıtları verirse hook hiç istek atmıyor.
  // -----------------------------------------------------------------------
  const hazirKayitlar = Array.isArray(secenekler.hazirKayitlar)
    ? secenekler.hazirKayitlar
    : null;

  // Geçerli PIN türetiliyor, state'e YAZILMIYOR. Önce boş sonucu efekt
  // içinden setState ile kuruyordum; React o kalıbı haklı olarak uyarıyor
  // (etki gövdesinde senkron setState = zincirleme render). Türetilebilen
  // bir değeri state'te tutmak zaten gereksiz.
  const gecerliPin = useMemo(() => {
    const temiz = (pin || '').trim();
    if (!temiz || YER_TUTUCULAR.has(temiz.toUpperCase())) return null;
    return temiz;
  }, [pin]);

  // Hazır veri varsa sorgulanacak PIN yok — efekt hiç çalışmıyor.
  const sorgulanacakPin = hazirKayitlar ? null : gecerliPin;

  const [kayitlar, setKayitlar] = useState([]);
  const [arac, setArac] = useState(null);
  const [sahipMi, setSahipMi] = useState(false);
  // Sahipsiz araç: hesabı kapatılan kullanıcının aracı. Sicili duruyor ama
  // karnesi kapalı; yalnızca özet dönüyor. `null` = araç sahipsiz değil.
  const [sahipsizOzet, setSahipsizOzet] = useState(null);
  // PIN yoksa yükleme durumu da yok: sonsuz iskelet göstermemek için
  // başlangıç değeri PIN'in varlığına bağlı.
  const [yukleniyor, setYukleniyor] = useState(() => Boolean(sorgulanacakPin));
  const [hata, setHata] = useState(null);

  // Sayım, bileşen sökülüp yeniden bağlandığında yeniden çekmeyi tetiklemek
  // için. `yenile()` bunu artırıyor.
  const [tetik, setTetik] = useState(0);
  const yenile = useCallback(() => setTetik((n) => n + 1), []);

  useEffect(() => {
    if (!sorgulanacakPin) return;

    // Bileşen sökülürse geç gelen yanıt state'e yazmasın: React sökülmüş
    // bileşene setState uyarısı verir ve daha kötüsü, hızlı gezinmede eski
    // aracın verisi yeni ekranda görünebilir.
    let iptal = false;

    (async () => {
      setYukleniyor(true);
      setHata(null);

      try {
        const { data, error } = await zamanAsimiyla(
          supabase.rpc('sicil_getir', { p_pin: sorgulanacakPin })
        );

        if (iptal) return;

        if (error) {
          console.error('Sicil çekilemedi:', error.message);
          setHata(error.message);
          setKayitlar([]);
          setArac(null);
          setSahipMi(false);
          setSahipsizOzet(null);
        } else if (data?.hata === 'cok_fazla_deneme') {
          // HIZ SINIRI. Bunu "bulunamadı"dan ayırmak zorunlu: aynı görünmesi,
          // kullanıcıya "bu araç yok" yalanını söylemek olurdu. Fonksiyon bu
          // yüzden null değil, işaretli bir nesne döndürüyor.
          const dk = Math.ceil((data.yeniden_dene_saniye || 600) / 60);
          setHata(`Çok fazla sorgu yapıldı. ${dk} dakika sonra tekrar deneyin.`);
          setKayitlar([]);
          setArac(null);
          setSahipMi(false);
          setSahipsizOzet(null);
        } else if (data?.hata === 'sahipsiz') {
          // SAHİPSİZ ARAÇ. Yine "bulunamadı"dan ayrı tutuluyor, aynı gerekçeyle:
          // araç var ve sicili duruyor, "yok" demek yalan olurdu. `hata`
          // KURULMUYOR — bu bir arıza değil, aracın bir durumu. Çağıran ekran
          // özeti gösterip geri yükleme yolunu anlatıyor.
          setSahipsizOzet(data.ozet || {});
          setKayitlar([]);
          setArac(null);
          setSahipMi(false);
        } else if (!data) {
          // null = PIN bulunamadı ya da biçim geçersiz. Hata değil, boş sonuç.
          setKayitlar([]);
          setArac(null);
          setSahipMi(false);
          setSahipsizOzet(null);
        } else {
          setKayitlar(data.bakim_kayitlari || []);
          setArac(data.arac || null);
          setSahipMi(data.arac?.sahip_mi === true);
          setSahipsizOzet(null);
        }
      } catch (e) {
        // Buraya YALNIZCA promise reddedilirse gelinir: ağ kopması, sunucu
        // ölümü ya da zaman aşımı. Eskiden bu dal hiç yoktu ve akış burada
        // sessizce kesiliyordu.
        if (iptal) return;
        console.error('Sicil çekilemedi (ağ):', e);
        setHata(agHatasiMetni(e));
        setKayitlar([]);
        setArac(null);
        setSahipMi(false);
        setSahipsizOzet(null);
      } finally {
        // `iptal` kontrolü YOK ve bu bilerek: bileşen sökülmüşse setState
        // zaten yok sayılıyor (React 18+), ama sökülmediği hâlde `iptal`
        // erken dönmüşse yükleme durumunun açık kalması tam da onarmaya
        // çalıştığımız hataydı.
        setYukleniyor(false);
      }
    })();

    return () => {
      iptal = true;
    };
  }, [sorgulanacakPin, tetik]);

  // Hazır veri verildiyse istek hiç atılmadı; kayıtlar doğrudan dönüyor.
  if (hazirKayitlar) {
    return {
      kayitlar: hazirKayitlar, arac: null, sahipMi: false, sahipsizOzet: null,
      yukleniyor: false, hata: null, yenile,
    };
  }

  // PIN yoksa hiç sorgu atılmadı; state'in başlangıç değerleri zaten boş.
  // Bu dalda `hata` da null — "PIN yok" bir hata değil.
  if (!gecerliPin) {
    return {
      kayitlar: [], arac: null, sahipMi: false, sahipsizOzet: null,
      yukleniyor: false, hata: null, yenile,
    };
  }

  return { kayitlar, arac, sahipMi, sahipsizOzet, yukleniyor, hata, yenile };
}

export default useSicil;
