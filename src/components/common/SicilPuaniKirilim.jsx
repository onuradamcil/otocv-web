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
// =========================================================================

'use client';

import React from 'react';
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
  bilinmiyor:  { kutu: 'border-slate-300 border-dashed bg-slate-50/60', puan: 'text-slate-500', ikon: 'gozKapali', ikonRenk: 'text-slate-400' },
};

export default function SicilPuaniKirilim({ kirilim, puan, className = '' }) {
  if (!Array.isArray(kirilim) || kirilim.length === 0) {
    // Kırılım yoksa uydurma bir açıklama üretmiyoruz.
    return null;
  }

  const tavanToplam = kirilim.reduce((t, k) => t + (k.tavan || 0), 0);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[11px] font-black tracking-wider uppercase text-slate-500">
          Puan Nasıl Oluştu
        </h4>
        <span className="text-[11px] font-bold font-mono text-slate-600 tabular-nums">
          {puan}/{tavanToplam}
        </span>
      </div>

      <ul className="space-y-1.5">
        {kirilim.map((kalem) => {
          const durum = kalemDurumu(kalem);
          const b = BICIM[durum];

          return (
            <li
              key={kalem.ad}
              className={`flex items-start gap-2.5 border rounded-lg px-3 py-2 ${b.kutu}`}
            >
              <Icon name={b.ikon} size="sm" className={`${b.ikonRenk} shrink-0 mt-0.5`} />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">{kalem.ad}</span>
                  <span className={`text-xs font-black font-mono tabular-nums shrink-0 ${b.puan}`}>
                    {kalem.puan}/{kalem.tavan}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                  {kalem.aciklama}
                </p>
                {kalem.kaynak && (
                  // Kaynak etiketi karnedeki mantığın aynısı: her bulgu
                  // nereden geldiğini söylüyor. "Hesaplandı" ile "Araç sahibi
                  // beyanı" arasındaki fark alıcı için kritik.
                  <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 border border-slate-300 rounded px-1.5 py-0.5">
                    {kalem.kaynak}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Puan yalnızca sisteme girilmiş veriden hesaplanır. Kesikli çerçeveli
        kalemler bir olumsuzluk değil, <strong className="font-semibold">beyan edilmemiş</strong> bilgidir.
      </p>
    </div>
  );
}
