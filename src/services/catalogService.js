// =========================================================================
// OTO-CV MİMARİ KATMANI: DYNAMIC LAZY LOADING KATALOG SERVİSİ
// İşlev: Step 2 ve Filtreleme için Supabase kataloğundan adım adım veri çeker.
// =========================================================================

import { supabase } from '../lib/supabase';

/**
 * Aynı ADLI kayıtları eler.
 *
 * ⚠ KATALOGTA GERÇEK TEKRARLAR VAR — ölçüldü: McLaren'in 14 serisinin
 * TAMAMI çift satır (540C, 570GT, 570S, 720S, Senna…), ayrıca 18 paket.
 * Süzgeç ağacı araçlarla ADLA eşleştiği için iki "540C" satırı işlevsel
 * olarak aynı: hangisine tıklanırsa tıklansın sonuç birebir aynı. Kullanıcı
 * ise listede iki kez görüyor ve bunu bir hata sanıyor.
 *
 * ⚠ KATALOG SATIRLARI SİLİNMİYOR. Tekrarları veritabanından temizlemek
 * cazip ama `car_series` silmek `car_models` ve `car_packages`'ı CASCADE ile
 * götürüyor; üstelik sihirbaz (Step1) bu tabloları KİMLİKLE kullanıyor ve
 * elenen kimliğe bağlı kayıtlar sessizce kaybolurdu. Ayıklama görüntüleme
 * katmanında yapılıyor — geri alınabilir ve hiçbir veriye dokunmuyor.
 *
 * Karşılaştırma büyük/küçük harf ve boşluk duyarsız; ilk gelen korunuyor
 * (sorgular `name` sırasıyla döndüğü için sonuç deterministik).
 */
const adaGoreAyikla = (liste) => {
  const gorulen = new Set();
  return (liste || []).filter((kayit) => {
    const anahtar = String(kayit?.name ?? '').trim().toLowerCase();
    if (!anahtar || gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);
    return true;
  });
};

// =========================================================================
// OTURUM İÇİ ÖNBELLEK
//
// -------------------------------------------------------------------------
// NİYE — ÖLÇÜLDÜ, TAHMİN DEĞİL
// -------------------------------------------------------------------------
// Katalog DEĞİŞMEYEN başvuru verisi: 49 marka, 822 seri, 3.591 model,
// 23.138 paket. Bir oturum boyunca tek bir satırı bile değişmiyor.
//
// Buna rağmen her çağrıda veritabanına gidiyordu. Günlükten ölçüldü
// (21.08.2026, 24 saat): `/rest/v1/car_brands` **4.634 istek**. 13 aylık
// aktif kullanıcı için. 100 bin kullanıcıda bu, hiç değişmeyen 49 satır
// için milyonlarca sorgu demek.
//
// -------------------------------------------------------------------------
// ⚠ SONUÇ DEĞİL, SÖZ (PROMISE) SAKLANIYOR
// -------------------------------------------------------------------------
// Sonucu saklamak yalnızca İKİNCİ çağrıyı kurtarırdı. Sözü saklamak, henüz
// dönmemiş bir isteğe gelen eşzamanlı çağrıları da aynı isteğe bağlıyor.
// Sihirbaz açılırken marka listesini birden fazla bileşen istiyor; bu ayrım
// orada doğrudan iki isteği bire indiriyor.
//
// ⚠ HATA ÖNBELLEĞE ALINMIYOR. Ağ koptuğunda dönen boş liste saklansaydı,
// bağlantı geri geldiğinde katalog oturum boyunca boş kalırdı.
//
// ⚠ SÜRE SINIRI YOK VE BU BİLİNÇLİ. Önbellek modül düzeyinde, yani sekme
// kapanınca ölüyor. Katalog bir dağıtım (deploy) ile değişirse kullanıcı
// zaten yeni bir JS paketi indiriyor ve önbellek sıfırdan başlıyor.
// =========================================================================

const onbellek = new Map();

/**
 * `uretici`yi anahtar başına BİR KEZ çalıştırır, sözü saklar.
 * Boş sonuç dönerse (hata dalı) önbellekten düşürülür.
 */
const onbellekli = (anahtar, uretici) => {
  if (onbellek.has(anahtar)) return onbellek.get(anahtar);

  const soz = uretici().then((sonuc) => {
    // Hata dalları `[]` döndürüyor. Boş listeyi kalıcı saklamak, geçici bir
    // ağ hatasını oturum boyunca "katalog boş" hâline çevirirdi.
    if (!Array.isArray(sonuc) || sonuc.length === 0) onbellek.delete(anahtar);
    return sonuc;
  }).catch((e) => {
    onbellek.delete(anahtar);
    throw e;
  });

  onbellek.set(anahtar, soz);
  return soz;
};

/** Test ve hata ayıklama için: önbelleği tamamen boşaltır. */
export const katalogOnbelleginiTemizle = () => onbellek.clear();

/**
 * 1. Markaları Çek (Sayfa Açılışında - Sadece ~2KB)
 */
export const fetchCatalogBrands = async () => onbellekli('marka', async () => {
  try {
    const { data, error } = await supabase
      .from('car_brands')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return adaGoreAyikla(data);
  } catch (error) {
    console.error('❌ Marka çekme hatası:', error.message);
    return [];
  }
});

/**
 * 2. Markaya Göre Model Serilerini Çek (Örn: BMW -> 3 Serisi, 5 Serisi)
 */
export const fetchCatalogSeries = async (brandId) => {
  if (!brandId) return [];
  return onbellekli(`seri:${brandId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('car_series')
        .select('id, name')
        .eq('brand_id', brandId)
        .order('name', { ascending: true });

      if (error) throw error;
      return adaGoreAyikla(data);
    } catch (error) {
      console.error('❌ Seri çekme hatası:', error.message);
      return [];
    }
  });
};

/**
 * 3. Seriye Göre Motor / Alt Modelleri Çek (Örn: 3 Serisi -> 320i, 320d)
 */
export const fetchCatalogModels = async (seriesId) => {
  if (!seriesId) return [];
  return onbellekli(`model:${seriesId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('car_models')
        .select('id, name')
        .eq('series_id', seriesId)
        .order('name', { ascending: true });

      if (error) throw error;
      return adaGoreAyikla(data);
    } catch (error) {
      console.error('❌ Alt model çekme hatası:', error.message);
      return [];
    }
  });
};

/**
 * 4. Alt Modele Göre Donanım Paketlerini Çek (Örn: 320i -> First Edition M Sport)
 */
export const fetchCatalogPackages = async (modelId) => {
  if (!modelId) return [];
  return onbellekli(`paket:${modelId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('car_packages')
        .select('id, name')
        .eq('model_id', modelId)
        .order('name', { ascending: true });

      if (error) throw error;
      return adaGoreAyikla(data);
    } catch (error) {
      console.error('❌ Paket çekme hatası:', error.message);
      return [];
    }
  });
};
// =========================================================================
// ADRESTEN AĞAÇ YOLUNU GERİ KURMA
//
// -------------------------------------------------------------------------
// NİYE GEREKİYOR
// -------------------------------------------------------------------------
// Marka ağacı iki ayrı şey tutuyor:
//   • `suzgec.marka/seri/model/donanim` -> NORMALİZE AD ('bmw', '3 serisi')
//   • `agacYolu`                        -> katalog KİMLİKLERİ (id)
//
// Süzme sunucuya taşındığında adreste AD taşınmaya başladı (paylaşılan
// bağlantı okunaklı olsun ve katalog kimlikleri değişirse bozulmasın diye).
// Ama `agacYolu` id'ye muhtaç: alt kademeyi çekmek için ebeveynin id'si
// gerekiyor. Yani `/arama?marka=bmw&seri=3 serisi` ile açılan sayfada ağaç
// hangi dalda olduğunu BİLEMİYORDU — süzgeç uygulanıyor ama panel köke
// dönmüş görünüyordu.
//
// Bu fonksiyon o boşluğu kapatıyor: kökten başlayıp her kademede normalize
// ada göre eşleşen düğümü bulup id zincirini kuruyor.
//
// ⚠ EN FAZLA 4 ARDIŞIK İSTEK ve yalnızca sayfa açılışında. Kademeler
// zincirleme olduğu için paralelleştirilemiyor: seriyi çekmek için markanın
// id'si şart.
//
// ⚠ EŞLEŞMEYEN KADEME ZİNCİRİ KESİYOR, HATA ATMIYOR. Katalogdan kaldırılmış
// bir dalın adresi paylaşılmış olabilir; o durumda ağaç bulunabildiği yere
// kadar açılıyor. Boş dizi dönmek, kullanıcıyı hiç bilgilendirmeden köke
// atmaktan iyi.
// =========================================================================

import { agacAnahtari } from '../utils/markaAgaci';

/**
 * Normalize adlardan katalog id zinciri kurar.
 *
 * @param {{marka?:string, seri?:string, model?:string, donanim?:string}} adlar
 * @returns {Promise<Array<{id:number|string, name:string}>>} `agacYolu` biçimi
 */
export const catalogYolunuCoz = async (adlar) => {
  const yol = [];
  try {
    const kademeler = [
      { anahtar: adlar?.marka, getir: () => fetchCatalogBrands() },
      { anahtar: adlar?.seri, getir: (ust) => fetchCatalogSeries(ust) },
      { anahtar: adlar?.model, getir: (ust) => fetchCatalogModels(ust) },
      { anahtar: adlar?.donanim, getir: (ust) => fetchCatalogPackages(ust) },
    ];

    for (const kademe of kademeler) {
      if (!kademe.anahtar) break;           // bu kademe seçilmemiş -> zincir bitti
      const ustId = yol.length ? yol[yol.length - 1].id : undefined;
      const liste = await kademe.getir(ustId);
      const bulunan = (liste || []).find((d) => agacAnahtari(d.name) === kademe.anahtar);
      if (!bulunan) break;                  // katalogda yok -> bulunduğu yere kadar
      yol.push({ id: bulunan.id, name: bulunan.name });
    }
  } catch (e) {
    console.error('❌ [Catalog Service] Ağaç yolu çözülemedi:', e.message);
  }
  return yol;
};
