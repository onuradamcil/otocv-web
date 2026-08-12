// =========================================================================
// OTO-CV KARNE HESAPLAMA KATMANI (karneHelper.js)
//
// -------------------------------------------------------------------------
// NEDEN BU DOSYA VAR
// -------------------------------------------------------------------------
// Resmi sicil belgesi, "MERKEZİ VERİ TABANI SORGULAMA SONUÇLARI" başlığı
// altında üç satır SABİT METİN basıyordu:
//
//   "TÜVTÜRK Muayene Geçerlilik Durumu → Aktif (Kilometre Verisi Tutarlı)"
//   "Mülkiyet, Haciz, Rehin & Hak Mahrumiyeti Kontrolü → Hak Mahrumiyeti Yoktur"
//   "Adalet Bakanlığı UYAP Çalınma / Aranma Kaydı Taraması → Temiz"
//
// Hiçbiri sorgulanmıyordu; her araçta aynı çıkıyordu. Oto.CV bu kurumlara
// erişemiyor. Yani belge, erişemediği sistemleri sorgulamış gibi görünüyordu.
//
// Bunun ne kadar yanıltıcı olabildiğini canlı veri gösterdi: 11ASD1231
// plakalı aracın bakım kayıtlarında kilometre GERİYE gidiyor, ama belge o
// araç için "Kilometre Verisi Tutarlı" basıyordu — yani sabit metin, gerçeğin
// tam tersini beyan ediyordu.
//
// -------------------------------------------------------------------------
// BU DOSYANIN İLKESİ
// -------------------------------------------------------------------------
// Belgeye yalnızca ÜÇ kaynaktan veri girer:
//
//   HESAPLANDI          Oto.CV'nin kendi verisinden türetilen bulgu.
//                       Dışarıdan bilgi gerektirmez, doğrulanabilir.
//   ARAÇ SAHİBİ BEYANI  Kullanıcının girdiği bilgi. Gerçek veridir ama
//                       doğrulanmamıştır; belgede öyle etiketlenir.
//   BELGELİ             Arkasında yüklenmiş fatura görseli olan kayıt.
//
// Dördüncü bir kaynak yok. Tahmin, varsayılan ve "muhtemelen böyledir"
// belgeye girmez. Bilgi yoksa yokluğu yazılır.
// =========================================================================

// Uzantı bilerek yazıldı ('.js'). Kod tabanının geri kalanı uzantısız
// kullanıyor ve Next.js ikisini de çözüyor; ama uzantısız biçim ESM
// standardında geçerli değil ve bu dosyayı ham `node` ile test etmeyi
// imkânsız kılıyor. Hesaplama katmanının testlenebilir olması, biçim
// tutarlılığından önce gelir.
import { parseVehicleDate, calculatePolicyStatus } from './dateHelper.js';

export const KAYNAK = {
  HESAP: 'Hesaplandı',
  BEYAN: 'Araç sahibi beyanı',
  BELGE: 'Belgeli',
};

/**
 * Bir bakım kaydından kilometreyi güvenle okur.
 * km_at_service sayısal kolon ama eski kayıtlarda metin gelebilir.
 */
function kmOku(kayit) {
  const ham = kayit?.km_at_service;
  if (ham === null || ham === undefined || ham === '') return null;
  if (typeof ham === 'number') return Number.isFinite(ham) ? ham : null;
  const rakam = String(ham).replace(/\D/g, '');
  if (!rakam) return null;
  const s = parseInt(rakam, 10);
  return Number.isFinite(s) ? s : null;
}

/**
 * KİLOMETRE TUTARLILIĞI — Oto.CV'nin gerçekten hesaplayabildiği bulgu.
 *
 * Mantık: bakım kayıtları TARİHE göre sıralandığında kilometre artan olmalı.
 * Geriye giden bir adım varsa ya kayıt hatası ya kilometre müdahalesi vardır.
 * İkisi de alıcının bilmek isteyeceği şey.
 *
 * KRİTİK DETAY — sıralamayı bu fonksiyon KENDİ yapar:
 * OtoKarneScreen kayıtları `order('km_at_service', desc)` ile çekiyor, yani
 * gelen dizi TARİHE göre sıralı DEĞİL. Gelen sıraya güvenip karşılaştırma
 * yapmak, km'ye göre sıralı bir listede "km hep azalıyor" sonucu üretirdi —
 * her araç tutarsız görünürdü. Bu yüzden önce tarihe göre sıralanır.
 *
 * Hüküm vermek için en az 2 karşılaştırılabilir kayıt gerekir. Tek kayıtla
 * "tutarlı" demek, olmayan bir doğrulamayı iddia etmek olur → 'yetersiz'.
 *
 * @returns {{durum:'tutarli'|'tutarsiz'|'yetersiz', geriAdim:number,
 *            karsilastirilan:number, enBuyukDusus:number|null}}
 */
export function kilometreTutarliligi(kayitlar = []) {
  const kullanilabilir = (kayitlar || [])
    .map((k) => {
      const tarih = parseVehicleDate(k?.service_date);
      const km = kmOku(k);
      return tarih && !isNaN(tarih.getTime()) && km !== null
        ? { zaman: tarih.getTime(), km }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.zaman - b.zaman);

  if (kullanilabilir.length < 2) {
    return { durum: 'yetersiz', geriAdim: 0, karsilastirilan: kullanilabilir.length, enBuyukDusus: null };
  }

  let geriAdim = 0;
  let enBuyukDusus = 0;
  for (let i = 1; i < kullanilabilir.length; i++) {
    const fark = kullanilabilir[i].km - kullanilabilir[i - 1].km;
    if (fark < 0) {
      geriAdim += 1;
      enBuyukDusus = Math.max(enBuyukDusus, -fark);
    }
  }

  return {
    durum: geriAdim === 0 ? 'tutarli' : 'tutarsiz',
    geriAdim,
    karsilastirilan: kullanilabilir.length,
    enBuyukDusus: geriAdim > 0 ? enBuyukDusus : null,
  };
}

/** Belgede basılacak kilometre tutarlılığı metni. */
export function kilometreMetni(kayitlar = []) {
  const s = kilometreTutarliligi(kayitlar);
  if (s.durum === 'tutarli') {
    return `Tutarlı (${s.karsilastirilan} kayıt karşılaştırıldı)`;
  }
  if (s.durum === 'tutarsiz') {
    const dusus = s.enBuyukDusus ? ` · en büyük düşüş ${s.enBuyukDusus.toLocaleString('tr-TR')} km` : '';
    return `Tutarsız — ${s.geriAdim} kayıtta geriye gidiş${dusus}`;
  }
  return s.karsilastirilan === 1
    ? 'Karşılaştırma için tek kayıt yeterli değil'
    : 'Tarih ve kilometre içeren kayıt bulunmuyor';
}

/**
 * KAYIT SÜREKLİLİĞİ — Carfax'ın asıl sattığı şey budur: aracın ne kadar
 * süredir izlendiği ve kaydın kesintisiz olup olmadığı. Oto.CV bunu kendi
 * verisinden hesaplayabiliyor.
 *
 * @returns {{kayit:number, ilk:Date|null, son:Date|null, sureMetni:string,
 *            faturali:number, faturaliYuzde:number|null}}
 */
export function kayitSurekliligi(kayitlar = []) {
  const liste = kayitlar || [];
  const tarihler = liste
    .map((k) => parseVehicleDate(k?.service_date))
    .filter((d) => d && !isNaN(d.getTime()))
    .sort((a, b) => a - b);

  const faturali = liste.filter((k) => !!k?.invoice_url).length;

  if (tarihler.length === 0) {
    return {
      kayit: liste.length, ilk: null, son: null, sureMetni: 'Tarihli kayıt yok',
      faturali,
      faturaliYuzde: liste.length ? Math.round((faturali / liste.length) * 100) : null,
    };
  }

  const ilk = tarihler[0];
  const son = tarihler[tarihler.length - 1];

  // Ay farkı: takvim ayı üzerinden. Gün bazlı bölme (fark/30) 31 günlük
  // aralıklarda "1 ay" yerine "1 ay 1 gün" gibi kırık sonuçlar üretiyordu.
  const ayFarki = (son.getFullYear() - ilk.getFullYear()) * 12 + (son.getMonth() - ilk.getMonth());
  const yil = Math.floor(ayFarki / 12);
  const ay = ayFarki % 12;

  let sureMetni;
  if (ayFarki < 1) sureMetni = 'Aynı ay içinde';
  else if (yil === 0) sureMetni = `${ay} ay`;
  else if (ay === 0) sureMetni = `${yil} yıl`;
  else sureMetni = `${yil} yıl ${ay} ay`;

  return {
    kayit: liste.length,
    ilk,
    son,
    sureMetni,
    faturali,
    faturaliYuzde: liste.length ? Math.round((faturali / liste.length) * 100) : null,
  };
}

/**
 * MUAYENE GEÇERLİLİĞİ — araç sahibinin beyan ettiği tarihten hesaplanır.
 * "Sorgulandı" DEMEZ; beyanın bugüne göre durumunu söyler.
 *
 * @returns {{metin:string, durum:'iyi'|'dikkat'|'bilinmiyor'}}
 */
export function muayeneBeyanDurumu(vehicle) {
  const ham = vehicle?.inspection_end_date;
  if (!ham) return { metin: 'Beyan edilmemiş', durum: 'bilinmiyor' };

  const d = calculatePolicyStatus(ham);
  if (d.status === 'unknown') return { metin: 'Beyan okunamadı', durum: 'bilinmiyor' };
  if (d.status === 'expired') return { metin: 'Beyan edilen süre dolmuş', durum: 'dikkat' };
  if (d.status === 'warning') return { metin: `Geçerli · ${d.text}`, durum: 'dikkat' };
  return { metin: 'Beyan edilen süre içinde geçerli', durum: 'iyi' };
}

/**
 * BELGE DEĞERİ — uydurma varsayılan yerine dürüst yokluk.
 *
 * Belgede `fuel_type || 'Benzin / Hibrit'` gibi satırlar vardı. Veri yoksa
 * uydurma bir teknik özellik basılıyordu. Canlı veride 06ONR97 plakalı aracın
 * yakıt, vites ve renk alanları boş — o araç için belge üç uydurma özellik
 * yazıyordu. Bu fonksiyon onun yerine "Beyan edilmemiş" döner.
 */
export function beyanDegeri(deger, yedek = 'Beyan edilmemiş') {
  if (deger === null || deger === undefined) return yedek;
  const s = String(deger).trim();
  return s === '' ? yedek : s;
}
