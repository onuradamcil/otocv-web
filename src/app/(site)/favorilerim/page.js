// =========================================================================
// FAVORİLERİM ((site)/favorilerim/page.js)
//
// Kullanıcının favorilediği vitrin kayıtları. Liste `favoriService`
// üzerinden geliyor ve vitrinden kaldırılmış kayıtlar süzülüyor: favorilerde
// "artık yok" bir kart göstermek, kullanıcıya var olmayan bir araç vaat
// etmek olurdu.
//
// ⚠ TUTAR YOK. Araca ait herhangi bir fiyat, platformu satış sitesi konumuna
// sokuyor. Kartın vurgusu sicil puanı.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { favoriListesi, favoriDegistir } from '@/services/favoriService';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';
import Icon from '@/components/common/icons';
import { dugme } from '@/components/common/dugme';
import AracGorseli from '@/components/common/AracGorseli';

export default function FavorilerimPage() {
  const router = useRouter();
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | hazir | oturumyok
  const [liste, setListe] = useState([]);

  useEffect(() => {
    let iptal = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (iptal) return;
      if (!user) { setDurum('oturumyok'); return; }

      const { veri } = await favoriListesi();
      if (iptal) return;
      setListe(veri);
      setDurum('hazir');
    })();

    return () => { iptal = true; };
  }, []);

  const cikar = async (pin) => {
    // İyimser: kart hemen listeden düşüyor. Bu ekranda "favorilerimden
    // çıkar" tek anlamlı işlem, geri alma beklentisi yok.
    setListe((ö) => ö.filter((f) => f.pin_code !== pin));
    await favoriDegistir(pin, true);
  };

  if (durum === 'yukleniyor') {
    return <GlobalStepLoader mode="iskelet" varyant="kart" gecikmeMs={200} adet={3} />;
  }

  if (durum === 'oturumyok') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full text-center space-y-4">
          <h1 className="baslik-bolum text-slate-900">Favorilerim</h1>
          <p className="metin-yardimci text-slate-500">
            Favorilerinizi görmek için oturum açmanız gerekiyor.
          </p>
          <Link href="/login" className={dugme('birincil')}>Giriş Yap</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="baslik-sayfa text-slate-900">Favorilerim</h1>
        <p className="metin-yardimci text-slate-500 mt-1">
          Vitrinde beğendiğiniz araçlar. Sicil karnelerine buradan ulaşabilirsiniz.
        </p>
      </div>

      {liste.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center space-y-3 bg-white rounded-lg border border-dashed border-slate-300">
          <span className="w-12 h-12 rounded-lg bg-slate-50 grid place-items-center text-slate-500">
            <Icon name="kalp" size="xl" />
          </span>
          <div>
            <h2 className="baslik-bolum text-slate-900">Henüz favoriniz yok</h2>
            <p className="metin-yardimci text-slate-500 mt-1">
              Vitrindeki araçların üzerindeki kalbe dokunarak buraya ekleyebilirsiniz.
            </p>
          </div>
          <Link href="/" className={dugme('birincil')}>Vitrine Göz At</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {liste.map((f) => {
            const foto = f.image_url ? f.image_url.split(',')[0].trim() : null;

            return (
              <article
                key={f.pin_code}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col p-2"
              >
                <div className="h-36 w-full bg-slate-50 rounded-md overflow-hidden relative grid place-items-center p-1">
                  {/* İç sarmalayıcı kapsayıcının `p-1`ini korumak için:
                      `fill` iç boşluğu yok sayıp kenara yayılıyor.
                      `sizes` ızgaradan: `grid-cols-1 sm:2 lg:3 xl:4` */}
                  <div className="relative w-full h-full">
                    <AracGorseli
                      src={foto}
                      alt={`${f.brand || ''} ${f.model || ''}`.trim()}
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 290px"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => cikar(f.pin_code)}
                    aria-label="Favorilerden çıkar"
                    className="absolute top-1.5 right-1.5 w-9 h-9 grid place-items-center rounded-full bg-white/90 border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Icon name="kalp" size="md" dolu />
                  </button>

                  {f.is_featured && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-400 text-slate-950 text-etiket font-semibold px-2 py-0.5 rounded">
                      ÖNE ÇIKAN
                    </span>
                  )}
                  {/* Vitrinde OLMAYAN araç da favorilenebiliyor (PIN ile
                      sicil sorgulayan kullanıcı). Bu bir süzgeç değil,
                      etiket: kart listeden düşmüyor, durumu yazıyor. */}
                  {!f.vitrinde && (
                    <span className="absolute bottom-1.5 left-1.5 bg-slate-700/90 text-white text-etiket font-semibold px-2 py-0.5 rounded">
                      VİTRİNDE DEĞİL
                    </span>
                  )}
                </div>

                <div className="pt-2 px-1 pb-1 space-y-1 flex-1 flex flex-col">
                  <div className="flex justify-between items-center metin-yardimci text-slate-900">
                    <span className="truncate">{f.city || '—'}</span>
                    <span className="font-mono">{f.year}</span>
                  </div>
                  <h3 className="metin-yardimci text-slate-700 line-clamp-2 min-h-[32px]">
                    {f.listing_title || `${f.brand} ${f.model}`}
                  </h3>

                  <div className="mt-auto pt-2 space-y-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 flex items-center justify-between">
                      <span className="text-etiket text-slate-500 font-bold">Sicil Puanı</span>
                      <span className="text-yardimci font-semibold text-indigo-600 font-mono tabular-nums">
                        {f.trust_score ?? 0}/100
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/karne/${encodeURIComponent(f.pin_code || '')}`)}
                      className={dugme('ikincil', { tamGenislik: true })}
                    >
                      Sicil Karnesi
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
