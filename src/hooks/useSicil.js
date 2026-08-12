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
// =========================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

// PIN henüz üretilmemişken arayüzde kullanılan yer tutucular. Sorguya
// sokmak boşuna istek demek.
const YER_TUTUCULAR = new Set(['CV-PENDING', 'CV-RESMI', 'CV-YOK']);

/**
 * PIN ile araç sicilini çeker.
 *
 * @param {string} pin Araç PIN kodu (örn. 'CV-000002')
 * @returns {{kayitlar: Array, arac: object|null, sahipMi: boolean,
 *            yukleniyor: boolean, hata: string|null, yenile: Function}}
 */
export function useSicil(pin) {
  // Geçerli PIN türetiliyor, state'e YAZILMIYOR. Önce boş sonucu efekt
  // içinden setState ile kuruyordum; React o kalıbı haklı olarak uyarıyor
  // (etki gövdesinde senkron setState = zincirleme render). Türetilebilen
  // bir değeri state'te tutmak zaten gereksiz.
  const gecerliPin = useMemo(() => {
    const temiz = (pin || '').trim();
    if (!temiz || YER_TUTUCULAR.has(temiz.toUpperCase())) return null;
    return temiz;
  }, [pin]);

  const [kayitlar, setKayitlar] = useState([]);
  const [arac, setArac] = useState(null);
  const [sahipMi, setSahipMi] = useState(false);
  // PIN yoksa yükleme durumu da yok: sonsuz iskelet göstermemek için
  // başlangıç değeri PIN'in varlığına bağlı.
  const [yukleniyor, setYukleniyor] = useState(() => Boolean(gecerliPin));
  const [hata, setHata] = useState(null);

  // Sayım, bileşen sökülüp yeniden bağlandığında yeniden çekmeyi tetiklemek
  // için. `yenile()` bunu artırıyor.
  const [tetik, setTetik] = useState(0);
  const yenile = useCallback(() => setTetik((n) => n + 1), []);

  useEffect(() => {
    if (!gecerliPin) return;

    // Bileşen sökülürse geç gelen yanıt state'e yazmasın: React sökülmüş
    // bileşene setState uyarısı verir ve daha kötüsü, hızlı gezinmede eski
    // aracın verisi yeni ekranda görünebilir.
    let iptal = false;

    (async () => {
      setYukleniyor(true);
      setHata(null);

      const { data, error } = await supabase.rpc('sicil_getir', { p_pin: gecerliPin });

      if (iptal) return;

      if (error) {
        console.error('Sicil çekilemedi:', error.message);
        setHata(error.message);
        setKayitlar([]);
        setArac(null);
        setSahipMi(false);
      } else if (!data) {
        // null = PIN bulunamadı ya da biçim geçersiz. Hata değil, boş sonuç.
        setKayitlar([]);
        setArac(null);
        setSahipMi(false);
      } else {
        setKayitlar(data.bakim_kayitlari || []);
        setArac(data.arac || null);
        setSahipMi(data.arac?.sahip_mi === true);
      }

      setYukleniyor(false);
    })();

    return () => {
      iptal = true;
    };
  }, [gecerliPin, tetik]);

  // PIN yoksa hiç sorgu atılmadı; state'in başlangıç değerleri zaten boş.
  // Bu dalda `hata` da null — "PIN yok" bir hata değil.
  if (!gecerliPin) {
    return { kayitlar: [], arac: null, sahipMi: false, yukleniyor: false, hata: null, yenile };
  }

  return { kayitlar, arac, sahipMi, yukleniyor, hata, yenile };
}

export default useSicil;
