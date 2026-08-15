// =========================================================================
// ZİYARETÇİ KİMLİĞİ — görüntülenme tekilleştirmesi için
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Vitrin görüntülenmesi "kaç KEZ" değil "kaç FARKLI KİŞİ" sayıyor. Oturum
// açmış kullanıcı için bu kolay: sunucu `auth.uid()`i kullanıyor. Ama vitrin
// kamuya açık ve ziyaretçilerin çoğu oturumsuz; onları hiç saymamak sayacı
// gerçeğin çok altında bırakırdı.
//
// Bu yüzden tarayıcıda rastgele, kalıcı ve KİMSEYE BAĞLI OLMAYAN bir değer
// tutuluyor. Tek işi aynı ziyaretçiyi ikinci kez saymamak.
//
// -------------------------------------------------------------------------
// NE DEĞİL
// -------------------------------------------------------------------------
// · Kimlik değil: hiçbir hesapla, e-postayla veya cihaz parmak iziyle
//   ilişkilendirilmiyor.
// · İzleme aracı değil: yalnızca görüntülenme tekilleştirmesinde kullanılıyor,
//   sunucuya başka hiçbir çağrıda gönderilmiyor.
// · Garanti değil: kullanıcı tarayıcı verisini silerse yeni kimlik üretilir
//   ve aynı kişi ikinci kez sayılabilir. Sayının doğası bu; "yaklaşık farklı
//   kişi" demek doğru olur.
//
// ⚠ Oturum açıkken bu değer GÖNDERİLSE BİLE sunucu onu yok sayıyor
// (`vitrin_goruntulendi` oturum varsa `auth.uid()`i kullanıyor). Yani bir
// istemci başkasının adına görüntülenme yazamıyor.
// =========================================================================

const ANAHTAR = 'otocv_izleyici';

/**
 * Tarayıcıya özel kalıcı ziyaretçi kimliği. Sunucu tarafında (SSR) ya da
 * depolama kapalıysa null döner — o durumda görüntülenme sayılmıyor,
 * çünkü tekilleştirilemeyen bir sayı yanlış sayıdan iyi değil.
 *
 * @returns {string|null}
 */
export function izleyiciKimligi() {
  if (typeof window === 'undefined') return null;

  try {
    let deger = window.localStorage.getItem(ANAHTAR);
    if (deger) return deger;

    // `crypto.randomUUID` modern tarayıcılarda var; yoksa yeterince
    // dağınık bir yedek üretiliyor. Kriptografik güç gerekmiyor — bu bir
    // sır değil, yalnızca bir ayraç.
    deger = (window.crypto && typeof window.crypto.randomUUID === 'function')
      ? window.crypto.randomUUID()
      : `y-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

    window.localStorage.setItem(ANAHTAR, deger);
    return deger;
  } catch {
    // Gizli sekme ya da depolama kapalı: sessizce vazgeçiliyor.
    // Görüntülenmeyi saymamak, kullanıcıya hata göstermekten iyi.
    return null;
  }
}
