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

  try {
    const str = dateString.toString().trim();

    // 1. ISO Formatı Kontrolü (YYYY-MM-DD)
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