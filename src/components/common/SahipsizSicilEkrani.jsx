// =========================================================================
// SAHİPSİZ SİCİL EKRANI
//
// PIN geçerli, araç var, sicili duruyor — ama aracın kayıtlı sahibi yok.
// Önceki sahibi hesabını kapatmış; araç "sahipsiz havuza" düştü.
//
// -------------------------------------------------------------------------
// NEDEN "BULUNAMADI" DEĞİL
// -------------------------------------------------------------------------
// Bu ekran, "Karne bulunamadı" ekranından AYRI. İkisini aynı göstermek
// kullanıcıya "böyle bir araç yok" yalanını söylemek olurdu — oysa araç var
// ve servis geçmişi eksiksiz duruyor. Hız sınırı ekranı da aynı gerekçeyle
// ayrı tutulmuştu; kural aynı: kullanıcıya olmayan bir gerçeği söyleme.
//
// -------------------------------------------------------------------------
// NEDEN ORTAK BİLEŞEN
// -------------------------------------------------------------------------
// Aynı durumu iki rota gösteriyor: /karne/[pin] ve /details/[pin]. Metni iki
// dosyaya kopyalamak, birini güncelleyip diğerini unutmaya davetiye. Bu
// projede tam olarak o hata hasar kataloğunda yaşandı.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

/**
 * @param {{ozet: object|null, pin: string}} props
 *   ozet: {marka, model, yil, kayit, faturali, sicil_puani, sahipsiz_kaldi_at}
 */
export default function SahipsizSicilEkrani({ ozet, pin }) {
  const router = useRouter();
  const o = ozet || {};

  return (
    <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
      <div className="bg-white border border-amber-200 rounded-lg p-8 max-w-md w-full text-center space-y-5 shadow-sm">

        <div className="space-y-2">
          <h1 className="text-bolum font-semibold text-slate-900 tracking-tight">
            Bu aracın kayıtlı sahibi yok
          </h1>
          <p className="text-mini text-slate-500 font-medium leading-relaxed">
            Aracın önceki sahibi hesabını kapattı. <strong className="text-slate-700">Servis
            geçmişi silinmedi</strong> — sicil duruyor, ancak sahibi belirlenene
            kadar ayrıntıları kapalı.
          </p>
        </div>

        {/* Sayılar veritabanından geliyor, tahmin değil. Kapalı bir siciller
            ne kadar veri olduğunu söylemek dürüstlük gereği: kullanıcı neyin
            kapalı olduğunu bilmeli. */}
        {(o.kayit !== undefined || o.marka) && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
            {o.marka && (
              <p className="text-govde font-semibold text-slate-900">
                {o.yil} {o.marka} {o.model}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Bakım kaydı', o.kayit],
                ['Belgeli', o.faturali],
                ['Sicil puanı', o.sicil_puani],
              ].map(([etiket, deger]) => (
                <div key={etiket} className="bg-white border border-slate-200 rounded-lg py-2">
                  <div className="text-bolum font-semibold text-slate-900 tabular-nums">
                    {deger ?? '—'}
                  </div>
                  <div className="text-etiket text-slate-500 font-bold uppercase tracking-wide">
                    {etiket}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-yardimci text-slate-500 leading-relaxed">
          Araç sizinse, plakanızla başvurup ruhsatınızı doğrulattıktan sonra
          sicili garajınıza aktarabilirsiniz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-mini py-3 rounded-md transition-colors cursor-pointer"
          >
            Anasayfa
          </button>
          {/* Sihirbaza gidiyor: geri yükleme plakayla başlıyor ve plaka bu
              ekranda BİLEREK gösterilmiyor (kişisel veri, ziyaretçiye
              verilmez). Kullanıcı aracın sahibiyse plakayı zaten biliyor. */}
          <button
            type="button"
            onClick={() => router.push('/add-vehicle/step1')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-mini py-3 rounded-md transition-colors cursor-pointer"
          >
            Sicili Devral
          </button>
        </div>

        {pin && (
          <p className="text-etiket text-slate-500 font-mono">{pin}</p>
        )}
      </div>
    </div>
  );
}
