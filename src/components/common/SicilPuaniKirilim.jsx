// =========================================================================
// SicilPuaniKirilim — PUANIN NEDEN O SAYI OLDUĞUNU GÖSTERİR
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Puan, alıcıya verilen bir iddia. Tek başına bir sayı ("92") doğrulanamaz;
// alıcı ona ya körü körüne inanır ya hiç inanmaz. İkisi de kötü.
//
// Eski hâlinde sayı gerçekten de doğrulanamazdı, çünkü hiçbir şeyden
// hesaplanmıyordu: her yeni araç sabit 92 alıyor, her bakım kaydı +5
// ekliyordu. Yani sayı aracın durumunu değil, kaç kez form doldurulduğunu
// ölçüyordu. Hasarlı ve muayenesi dolmuş bir araç kayıt ekleyerek 98'e
// çıkabiliyordu.
//
// Artık puan veritabanında gerçek veriden hesaplanıyor ve kırılımıyla
// birlikte saklanıyor. Bu bileşen o kırılımı basıyor: hangi kalemden kaç
// puan alındı, kaç puan alınabilirdi ve NEDEN.
//
// -------------------------------------------------------------------------
// EKSİK VERİ CEZA DEĞİL
// -------------------------------------------------------------------------
// Bu ayrım tasarımın merkezinde. "Kilometre tutarlılığı: 0/20" iki farklı
// şey olabilir:
//   · kilometre geriye gidiyor  -> gerçek bir olumsuz bulgu
//   · karşılaştırma için yeterli kayıt yok -> bilinmezlik
//
// İkisini aynı renkte göstermek, bilinmeyeni kötü haber gibi sunmak olurdu.
// O yüzden üç durum var ve renk kadar ŞEKİL de değişiyor: gri kesikli
// çerçeve "bilgi yok", kırmızı "olumsuz bulgu", yeşil "puan alındı".
// Gri tonlamalı baskıda da ayırt edilebilsin diye.
//
// -------------------------------------------------------------------------
// SATIRDA HÜKÜM, AÇILINCA KURAL
// -------------------------------------------------------------------------
// Satır neyin kaç puan aldığını söylüyor; kuralın kendisi (kaç puan neye
// göre veriliyor, veri nereden geliyor) tıklayınca ALTINDA açılıyor.
//
// ⚠ ÖNCE HOVER BALONUYDU VE KIRPILIYORDU. Balon `absolute` konumluydu,
// listenin `overflow-hidden` sınıfı (yuvarlak köşeler için) onu kesiyordu;
// panel dışına taşamıyordu. Portal ile gövdeye taşımak kırpılmayı çözerdi
// ama dokunmatikte hover olmadığı için deneyim yine ikinci sınıf kalırdı.
//
// Satır içi açılım ikisini birden çözüyor: kırpılacak bir katman yok,
// dokunmatikte ve klavyede aynı şekilde çalışıyor.
// =========================================================================

'use client';

import React, { useState } from 'react';
import Icon from './icons';

/** Kalemin durumu: puan alındı mı, alınmadıysa sebebi bulgu mu bilinmezlik mi? */
function kalemDurumu(kalem) {
  if (kalem.puan > 0) return kalem.puan >= kalem.tavan ? 'tam' : 'kismi';

  // Puan 0. Açıklama metni bilinmezliğe mi işaret ediyor, olumsuz bulguya mı?
  const a = (kalem.aciklama || '').toLocaleLowerCase('tr-TR');
  const bilinmezIzleri = ['beyan edilmemis', 'beyan edilmemiş', 'gerekli', 'okunamad'];
  if (bilinmezIzleri.some((iz) => a.includes(iz))) return 'bilinmiyor';
  return 'olumsuz';
}

const BICIM = {
  tam:         { kutu: 'border-emerald-200 bg-emerald-50/60', puan: 'text-emerald-700', ikon: 'onay',   ikonRenk: 'text-emerald-600' },
  kismi:       { kutu: 'border-amber-200 bg-amber-50/50',     puan: 'text-amber-700',   ikon: 'bilgi',  ikonRenk: 'text-amber-600' },
  olumsuz:     { kutu: 'border-rose-200 bg-rose-50/50',       puan: 'text-rose-700',    ikon: 'uyari',  ikonRenk: 'text-rose-600' },
  bilinmiyor:  { kutu: 'border-slate-300 border-dashed bg-slate-50/60', puan: 'text-slate-500', ikon: 'gozKapali', ikonRenk: 'text-slate-500' },
};

// -------------------------------------------------------------------------
// KALEM AÇIKLAMALARI
//
// Her metin `sicil_puani_hesapla` fonksiyonundaki GERÇEK kuraldan yazıldı;
// hiçbiri tahmin değil. Kural değişirse buranın da değişmesi gerekiyor —
// eşikler (5 kayıt, %oran, 30 gün) doğrudan oradan alındı.
// -------------------------------------------------------------------------
const ACIKLAMALAR = {
  'bakim kaydi': {
    olcer: 'Araca girilmiş bakım ve servis kaydının sayısını ölçer.',
    kural: 'Her kayıt 5 puan getirir, 5. kayıtta tavan dolar.',
    niye:  'Bakımı kayıt altına alınan araçta yapılan işlem gizlenmemiş demektir. Tek tek kayıtlar aracın geçmişini takip edilebilir hâle getiriyor.',
  },
  'faturali kayit': {
    olcer: 'Bakım kayıtlarının kaçının fatura/belgesinin yüklendiğini ölçer.',
    kural: 'Puan = (belgeli kayıt ÷ toplam kayıt) × 20.',
    niye:  'Belgesiz kayıt bir beyandır, faturalı kayıt belgedir. Bu kalem ikisi arasındaki farkı puana çeviriyor.',
  },
  'kilometre tutarliligi': {
    olcer: 'Bakım kayıtları servis tarihine göre sıralanır, kilometrenin geriye gidip gitmediğine bakılır.',
    kural: 'Geriye gidiş yoksa 20 puan. Tek kayıtta bile geriye gidiyorsa 0. Karşılaştırma için tarihli ve kilometreli en az 2 kayıt gerekiyor.',
    niye:  'Kilometre düşürme ikinci el alımdaki en yaygın manipülasyon. İki kayıt yoksa puan verilmiyor ama bu bir olumsuzluk değil — karşılaştırma yapılamadığı için bilinmezlik.',
  },
  'hasar beyani': {
    olcer: 'Araç sahibinin hasar ve tramer beyanını ölçer.',
    kural: '"Tramer yok" ve tutar 0 ise 15 puan. Tramer beyan edilmişse ya da tutar girilmişse 0. Hiç beyan edilmemişse de 0.',
    niye:  'Beyan edilmemiş hasar bilgisi, hasarsızlık anlamına gelmiyor. Bu kalemde eksik bilgi puan getirmiyor.',
  },
  'muayene': {
    olcer: 'Beyan edilen muayene bitiş tarihini ölçer.',
    kural: 'Bitişe 30 günden fazla varsa 12 puan, 30 günden az kaldıysa 6 puan; süre dolmuşsa ya da beyan yoksa 0.',
    niye:  'Muayenesi dolmak üzere olan araç alıcıya devirden hemen sonra masraf çıkarıyor. Kalan süre bu yüzden kademeli puanlanıyor.',
  },
  'trafik sigortasi': {
    olcer: 'Beyan edilen trafik sigortası bitiş tarihini ölçer.',
    kural: 'Bitişe 30 günden fazla varsa 8 puan, 30 günden az kaldıysa 4 puan; süre dolmuşsa ya da beyan yoksa 0.',
    niye:  'Trafik sigortası zorunlu. Süresi dolmuş araç devirden sonra doğrudan yasal sorumluluk doğuruyor.',
  },
};

/**
 * Kalem adını arama anahtarına çeviriyor.
 *
 * Veritabanı kırılımı Türkçe karaktersiz yazıyor ("Bakim kaydi"), ekranda
 * ise şapkalı hâller görünebiliyor. Eşleşmeyi yazıma bırakmak, tek bir
 * harf yüzünden açıklamanın sessizce kaybolması demekti.
 */
function anahtar(ad) {
  return (ad || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (h) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[h]))
    .replace(/i̇/g, 'i')
    .trim();
}

export default function SicilPuaniKirilim({ kirilim, puan, className = '' }) {
  // Tek seferde tek açıklama açık: hepsini birden açmak listeyi okunmaz
  // uzunluğa çıkarıyor ve karşılaştırmayı zorlaştırıyor.
  const [acikKalem, setAcikKalem] = useState(null);

  if (!Array.isArray(kirilim) || kirilim.length === 0) {
    // Kırılım yoksa uydurma bir açıklama üretmiyoruz.
    return null;
  }

  const tavanToplam = kirilim.reduce((t, k) => t + (k.tavan || 0), 0);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-yardimci font-semibold tracking-wider uppercase text-slate-500">
          Puan Nasıl Oluştu
        </h4>
        <span className="text-yardimci font-bold font-mono text-slate-600 tabular-nums">
          {puan}/{tavanToplam}
        </span>
      </div>

      {/* TEK SÜTUN, SATIR SATIR — ızgara değil.
          Izgarada kalem adı, açıklaması ve puanı her hücrede farklı yere
          düşüyordu; göz altı kalemi karşılaştırmak için her seferinde
          yeniden yer arıyordu. Satır düzeninde ad, açıklama ve puan tüm
          kalemlerde AYNI hizada: puanlar alt alta okunabiliyor. */}
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
        {kirilim.map((kalem) => {
          const durum = kalemDurumu(kalem);
          const b = BICIM[durum];
          const bilgi = ACIKLAMALAR[anahtar(kalem.ad)];
          const panelId = `puan-panel-${anahtar(kalem.ad).replace(/\s+/g, '-')}`;
          const acik = acikKalem === kalem.ad;

          return (
            <li key={kalem.ad}>
              {/* Tetikleyici DÜĞME: dokunmatikte ve klavyede aynı şekilde
                  çalışıyor. Hover balonu olsaydı dokunmatik cihazda hiç
                  açılamazdı. */}
              <button
                type="button"
                aria-expanded={bilgi ? acik : undefined}
                aria-controls={bilgi ? panelId : undefined}
                onClick={() => bilgi && setAcikKalem(acik ? null : kalem.ad)}
                className={`w-full text-left flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 px-3 py-2.5
                  ${bilgi ? 'cursor-pointer' : 'cursor-default'}
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${b.kutu}`}
              >
                <span className="flex items-center gap-2 sm:w-52 shrink-0">
                  <Icon name={b.ikon} size="sm" className={`${b.ikonRenk} shrink-0`} />
                  <span className="text-mini font-bold text-slate-800">{kalem.ad}</span>
                  {bilgi && (
                    <Icon
                      name="asagi"
                      size="xs"
                      className={`text-slate-500 shrink-0 transition-transform ${acik ? 'rotate-180' : ''}`}
                    />
                  )}
                </span>

                <span className="text-yardimci text-slate-600 leading-snug flex-1 min-w-0 pl-5 sm:pl-0">
                  {kalem.aciklama}
                </span>

                <span className={`text-mini font-semibold font-mono tabular-nums shrink-0 sm:w-14 sm:text-right pl-5 sm:pl-0 ${b.puan}`}>
                  {kalem.puan}/{kalem.tavan}
                </span>
              </button>

              {/* AÇIKLAMA SATIR İÇİNDE. Konumlandırılmış bir katman
                  olmadığı için kırpılacak bir şey de yok. */}
              {bilgi && acik && (
                <div id={panelId} className="px-3 pb-3 pt-1 bg-white space-y-2 border-t border-slate-100">
                  <p className="text-yardimci leading-relaxed text-slate-600">{bilgi.olcer}</p>
                  <p className="text-yardimci leading-relaxed text-slate-600">
                    <span className="font-bold text-slate-800">Nasıl puanlanıyor: </span>
                    {bilgi.kural}
                  </p>
                  <p className="text-yardimci leading-relaxed text-slate-500">{bilgi.niye}</p>
                  {kalem.kaynak && (
                    // Kaynak etiketi karnedeki mantığın aynısı: her bulgu
                    // nereden geldiğini söylüyor. "Hesaplandı" ile "Araç
                    // sahibi beyanı" arasındaki fark alıcı için kritik.
                    <span className="inline-block text-etiket font-bold uppercase tracking-wide text-slate-500 border border-slate-300 rounded px-1.5 py-0.5">
                      Kaynak: {kalem.kaynak}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-etiket text-slate-500 leading-relaxed">
        Puan yalnızca sisteme girilmiş veriden hesaplanır. Kesikli çerçeveli
        kalemler bir olumsuzluk değil, <strong className="font-semibold">beyan edilmemiş</strong> bilgidir.
      </p>
    </div>
  );
}
