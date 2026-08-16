// =========================================================================
// TEKLİF TALEBİ SERVİSİ
//
// -------------------------------------------------------------------------
// NE YAPIYOR
// -------------------------------------------------------------------------
// Kullanıcı "poliçem bitiyor, teklif istiyorum" dediğinde bunu kaydeder.
// Yazma işini `teklif_talebi_olustur` RPC'si yapıyor; bu dosya ince bir
// katman — `odemeService.js` ile aynı sözleşme.
//
// ⚠ SAHİPLİK BURADA DENETLENMİYOR, SUNUCUDA DENETLENİYOR.
// İstemcide "bu araç benim mi" diye bakmak yalnızca ekranı düzenler,
// güvenlik sağlamaz. RPC `vehicles.user_id`ye bakıyor ve `anon` rolünden
// yetkisi geri alınmış durumda.
//
// -------------------------------------------------------------------------
// BELGE TÜRÜ EŞLEMESİ NİYE BURADA
// -------------------------------------------------------------------------
// Ürün belgeleri üç ayrı dilde adlandırıyor: veritabanı sütunu
// (`kasko_end_date`), ekran adı ("Kasko Poliçesi") ve modal tipi
// ("kasko" | "insurance" | "inspection"). Talep kaydı dördüncü bir dil
// icat etmesin diye çeviri tek yerde toplandı.
// =========================================================================

import { supabase } from '../lib/supabase';
import { aktifOrtaklar } from '../data/teklifOrtaklari';

/** Talep kaydında kullanılan belge türleri. RPC'deki CHECK ile birebir aynı. */
export const TURLER = ['trafik', 'kasko', 'muayene', 'bakim'];

/** Talebi hangi ekranın doğurduğu. RPC'deki CHECK ile birebir aynı. */
export const KAYNAKLAR = ['panel', 'garaj_serit', 'police_modal', 'bildirim', 'anasayfa'];

/** Kullanıcıya gösterilen belge adları. Ekranlar bunu ortak kullanıyor. */
export const TUR_ADI = {
  trafik: 'Trafik Sigortası',
  kasko: 'Kasko Poliçesi',
  muayene: 'TÜVTÜRK Muayenesi',
  bakim: 'Periyodik Bakım',
};

/**
 * `PolicyOfferModal`ın `policyType` değerini talep türüne çevirir.
 * Modal 'insurance' diyor, kayıt 'trafik' bekliyor.
 */
export const MODAL_TURU = {
  insurance: 'trafik',
  kasko: 'kasko',
  inspection: 'muayene',
};

/**
 * `vehicles` tablosundaki tarih sütununu talep türüne çevirir.
 * `ozetService` ve teklif ekranı ikisi de bunu kullanıyor.
 */
export const SUTUN_TURU = {
  traffic_insurance_end_date: 'trafik',
  kasko_end_date: 'kasko',
  inspection_end_date: 'muayene',
};

/**
 * Teklif ekranına giden adresi üretir.
 *
 * ⚠ TEK ÜRETİCİ. Üç ayrı yerden (garaj şeridi, poliçe modalı, bildirim)
 * aynı adrese gidiliyor. Elle yazılan sorgu dizgileri kaçınılmaz olarak
 * ayrışıyor: biri `?plaka=`, öbürü `?plate=` yazıyor ve `kaynak` ölçümü
 * sessizce boş kalıyor.
 *
 * @param {string} plaka
 * @param {string} tur    TURLER'den biri
 * @param {string} kaynak KAYNAKLAR'dan biri
 * @returns {string}
 */
export function teklifYolu(plaka, tur, kaynak) {
  const p = new URLSearchParams();
  if (plaka) p.set('plaka', plaka);
  if (TURLER.includes(tur)) p.set('tur', tur);
  if (KAYNAKLAR.includes(kaynak)) p.set('kaynak', kaynak);
  const sorgu = p.toString();
  return sorgu ? `/insurance-offer?${sorgu}` : '/insurance-offer';
}

/**
 * Örnek (demo) ortaklar gösterilsin mi?
 *
 * -------------------------------------------------------------------------
 * NİYE ORTAM DEĞİŞKENİ — `?demo=1` TEK BAŞINA YETMEDİ
 * -------------------------------------------------------------------------
 * İlk hâlinde demo yalnızca adres çubuğuna `?demo=1` yazılınca açılıyordu.
 * Ölçüldü ve yanlış olduğu görüldü: ürünü kullanan kişi garajdaki çipten,
 * panelden ya da bildirimden geldiğinde parametre TAŞINMIYOR ve ekranın
 * boş hâlini görüyor. Yani demo, tam da denenmek istenen akışta hiç
 * çalışmıyordu.
 *
 * Artık iki yoldan biri yeterli:
 *   · `NEXT_PUBLIC_TEKLIF_DEMO=1`  → site genelinde açık (geliştirme/sunum)
 *   · `?demo=1`                     → tek seferlik, bayrak kapalıyken de
 *
 * ⚠ GÜVENLİK AĞI DEĞİŞMEDİ: demo hangi yoldan açılırsa açılsın ekranda
 * kapatılamaz "ÖRNEK GÖRÜNÜM" şeridi çıkıyor ve firma adları "Örnek" ile
 * başlıyor. Bayrağı açmak, sahte bir anlaşmayı gerçek gibi göstermeye
 * yetmiyor — testler bu değişmezi ayrıca denetliyor.
 *
 * @param {boolean} [sorguParametresi] Adresteki `?demo=1`
 * @returns {boolean}
 */
export function demoAcikMi(sorguParametresi = false) {
  return process.env.NEXT_PUBLIC_TEKLIF_DEMO === '1' || sorguParametresi === true;
}

/** RPC'nin döndürdüğü hata kodlarının okunur karşılıkları. */
const HATA_METNI = {
  oturum_yok: 'Bu işlem için oturum açmanız gerekiyor.',
  gecersiz_tur: 'Bu belge türü için talep alınamıyor.',
  gecersiz_kaynak: 'Talep kaydedilemedi. Lütfen tekrar deneyin.',
  arac_yok: 'Araç bulunamadı.',
  sahip_degil: 'Bu araç size ait değil.',
};

/**
 * Teklif talebini kaydeder.
 *
 * Aynı araç + aynı belge için 24 saat içinde ikinci kayıt açılmıyor; bu
 * durumda `yeni: false` dönüyor ve HATA SAYILMIYOR — kullanıcı açısından
 * talep zaten alınmış durumda.
 *
 * @param {string} plaka
 * @param {string} tur
 * @param {string} kaynak
 * @returns {Promise<{basarili: boolean, yeni?: boolean, hata?: string}>}
 */
export async function teklifTalebiOlustur(plaka, tur, kaynak) {
  const { data, error } = await supabase.rpc('teklif_talebi_olustur', {
    p_plaka: plaka,
    p_tur: tur,
    p_kaynak: kaynak,
  });

  if (error) {
    console.error('Teklif talebi kaydedilemedi:', error.message);
    return { basarili: false, hata: 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.' };
  }

  if (!data?.basarili) {
    return {
      basarili: false,
      hata: HATA_METNI[data?.hata] || 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.',
    };
  }

  return { basarili: true, yeni: data.yeni !== false };
}

/**
 * Bu araç + belge için zaten talep var mı?
 *
 * Ekran düğmeyi "Talebiniz alındı" hâline getirebilsin diye. Okuma RLS
 * altında — kullanıcı yalnızca kendi taleplerini görüyor.
 *
 * @param {string} plaka
 * @param {string} tur
 * @returns {Promise<boolean>}
 */
export async function talepVarMi(plaka, tur) {
  const { data, error } = await supabase
    .from('teklif_talepleri')
    .select('id')
    .eq('vehicle_plate', plaka)
    .eq('tur', tur)
    .limit(1);

  if (error) {
    // Okunamadıysa "talep yok" varsayılıyor: kullanıcı düğmeyi görmeye
    // devam ediyor. Tersi, gerçekte kaydedilmemiş bir talebi "alındı"
    // diye göstermek olurdu.
    console.error('Teklif talebi okunamadı:', error.message);
    return false;
  }

  return (data || []).length > 0;
}

export { aktifOrtaklar };
