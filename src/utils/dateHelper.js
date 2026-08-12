// =========================================================================
// OTO-CV METRİK KATMANI: AKILLI TARİH HESAPLAMA MOTORU (dateHelper.js)
// İşlev: TR (DD/MM/YYYY) ve ABD (MM/DD/YYYY) tarih formatlarını otomatik
//        tespit eder, 2028 ay aşımı bug'larını engeller ve statü matrisini çizer.
// =========================================================================

/**
 * 1. BLOK: AKILLI TARİH AYRIŞTIRICI (PARSER)
 * Metinsel tarih verilerini akıllı süzgeçten geçirerek JS Date nesnesine dönüştürür.
 */
export function parseVehicleDate(dateString) {
  if (!dateString) return null;

  // Supabase 'date' tipli kolonu Date nesnesi olarak da verebilir.
  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? null : dateString;
  }

  try {
    const str = dateString.toString().trim();

    // 1. ISO Formatı (YYYY-MM-DD) — veritabanı 'date' kolonları bu biçimde gelir.
    //
    // DİKKAT, BURADA BİR SAAT DİLİMİ TUZAĞI VAR:
    // new Date('2027-12-12') ifadesi tarihi UTC GECE YARISI olarak ayrıştırır.
    // UTC+3'te (Türkiye) bu yerel 03:00 olur ve gün doğru kalır. Ama UTC-5'te
    // bir kullanıcıda yerel saat 2027-12-11 19:00 olur — yani tarih BİR GÜN
    // GERİYE kayar. Poliçe bitiş tarihi bir gün erken görünür.
    //
    // Bu yüzden ISO metni parçalara ayırıp YEREL tarih olarak kuruyoruz.
    // Tarih-only değerlerde doğru olan yöntem bu; saat bilgisi taşımayan bir
    // veriyi saat dilimine tabi kılmak baştan hatalı.
    const isoEslesme = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoEslesme) {
      const [, yil, ay, gun] = isoEslesme;
      return new Date(Number(yil), Number(ay) - 1, Number(gun));
    }

    if (str.includes('-')) {
      return new Date(str);
    }

    // 2. Bölü (/) veya Nokta (.) ile ayrılmış formatların tespiti
    const delimiter = str.includes('.') ? '.' : '/';
    const dateParts = str.split(delimiter);

    if (dateParts.length === 3) {
      const part1 = parseInt(dateParts[0], 10);
      const part2 = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);

      let day, month;

      // 🧠 AKILLI SÜZGEÇ: İkinci rakam 12'den büyükse (Örn: 06/30/2026), 2. kısım kesinlikle GÜNdür (MM/DD/YYYY)
      if (part2 > 12) {
        month = part1 - 1; // JS ayları 0-11 indeksler
        day = part2;
      }
      // Birinci rakam 12'den büyükse (Örn: 25/06/2026), 1. kısım kesinlikle GÜNdür (DD/MM/YYYY)
      else if (part1 > 12) {
        day = part1;
        month = part2 - 1;
      }
      // Her iki rakam da 12 ve altındaysa (Örn: 05/06/2026) varsayılan olarak TR formatı (DD/MM/YYYY) kabul edilir
      else {
        day = part1;
        month = part2 - 1;
      }

      return new Date(year, month, day);
    }

    return new Date(str);
  } catch (error) {
    console.error("Tarih ayrıştırma katmanında beklenmeyen hata:", error.message);
    return null;
  }
}

/**
 * 1.b BLOK: VERİTABANINA YAZMA BİÇİMİ (ISO)
 *
 * NEDEN GEREKLİ: tarih kolonları artık Postgres 'date' tipinde. Formlar ise
 * kullanıcıya TR biçiminde (DD/MM/YYYY) maskelenmiş giriş yaptırıyor. O metni
 * doğrudan göndermek olmaz:
 *
 *   Postgres '12/12/2027' ifadesini sunucunun DateStyle ayarına göre yorumlar.
 *   Varsayılan MDY ayarında bu "12 Aralık" değil "12. ayın 12'si" olarak
 *   şanslıca aynı çıkar — ama '25/06/2027' MDY'de GEÇERSİZ AY hatası verir,
 *   '05/06/2027' ise sessizce 5 Haziran yerine 6 Mayıs olur.
 *
 * Yani tarihi biçimlendirilmiş metin olarak göndermek, sunucu ayarına bağlı
 * bir kumar. ISO ('YYYY-MM-DD') tek kesin biçim.
 *
 * @returns {string|null} 'YYYY-MM-DD' veya ayrıştırılamazsa null
 */
export function toIsoDate(value) {
  if (!value) return null;

  const d = parseVehicleDate(value);
  if (!d || isNaN(d.getTime())) return null;

  // toISOString() KULLANILMAZ: o UTC'ye çevirir ve yerel tarihi bir gün
  // kaydırabilir. Yerel bileşenlerden elle kuruyoruz.
  const yil = d.getFullYear();
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
}

/**
 * 1.c BLOK: EKRANDA GÖSTERME BİÇİMİ (TR)
 *
 * Veritabanı 'date' kolonu ISO döndürüyor ('2027-12-12'). Kullanıcıya bunu
 * olduğu gibi göstermek olmaz — Türkiye'de tarih GG/AA/YYYY okunur. Önceden
 * kolonlar metin olduğu için ekranda zaten TR biçimindeydi; tip değişikliğiyle
 * bu biçimlendirme sorumluluğu koda geçti.
 *
 * @returns {string} 'GG/AA/YYYY' veya ayrıştırılamazsa yedek metin
 */
export function formatTrDate(value, yedek = 'Belirtilmemiş') {
  const d = parseVehicleDate(value);
  if (!d || isNaN(d.getTime())) return yedek;

  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * 2. BLOK: POLİÇE DURUM VE KALAN GÜN METRİK HESAPLAYICI
 * Bitiş tarihine göre kalan gün durum matrisini hesaplar.
 */
export function calculatePolicyStatus(endDateString) {
  const parsedDate = parseVehicleDate(endDateString);
  
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return {
      status: 'unknown',
      text: 'Girilmedi',
      bgClass: 'bg-slate-50 border-slate-100 text-slate-500',
      dotClass: 'bg-slate-400',
      isCritical: false
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDate.setHours(0, 0, 0, 0);

  const timeDiff = parsedDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // DURUM 1: Poliçe süresi dolmuşsa (Geçmiş tarihler)
  if (daysLeft < 0) {
    return {
      status: 'expired',
      text: 'Süresi Doldu',
      bgClass: 'bg-rose-50 border-rose-100 text-rose-700',
      dotClass: 'bg-rose-600',
      isCritical: true,
      daysMessage: 'Süresi dolmuş durumda'
    };
  }

  // DURUM 2: Poliçe süresinin bitimine 30 günden az kalmışsa
  if (daysLeft <= 30) {
    return {
      status: 'warning',
      text: `${daysLeft} Gün Kaldı`,
      bgClass: 'bg-amber-50 border-amber-100 text-amber-700',
      dotClass: 'bg-amber-600',
      isCritical: true,
      daysMessage: `${daysLeft} gün içinde yenilenmeli`
    };
  }

  // DURUM 3: Poliçe güvenli aralıktaysa
  return {
    status: 'active',
    text: 'Aktif',
    bgClass: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    dotClass: 'bg-emerald-600',
    isCritical: false,
    daysMessage: 'Güvenli aralıkta'
  };
}

/**
 * 3. BLOK: GOOGLE TAKVİM LİNK ÜRETİCİ
 * Poliçe ve muayene bitiş tarihini kullanıcının Google Takvimine aktarması için link üretir.
 */
export function generateGoogleCalendarUrl(title, details, endDateString) {
  const parsedDate = parseVehicleDate(endDateString);
  if (!parsedDate || isNaN(parsedDate.getTime())) return '#';

  // Google Takvim formatı: YYYYMMDDTHHMMSSZ
  const startTime = parsedDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
  
  // Etkinliği 1 saatlik varsayılan aralıkla oluşturuyoruz
  const endTimeDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
  const endTime = endTimeDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const encodedTitle = encodeURIComponent(`[Oto.CV] ${title}`);
  const encodedDetails = encodeURIComponent(details);

  return `${baseUrl}&text=${encodedTitle}&dates=${startTime}/${endTime}&details=${encodedDetails}`;
}