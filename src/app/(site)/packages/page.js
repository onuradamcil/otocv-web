// =========================================================================
// ÜCRETLER VE ÖDEMELER ((site)/packages/page.js)
//
// Menüdeki "Paketlerim & Ödemeler" buraya geliyordu ve ekran `ComingSoon`
// yer tutucusuydu. Artık ücret listesini gösteriyor.
//
// -------------------------------------------------------------------------
// NEDEN "PAKET" DEĞİL "ÜCRET"
// -------------------------------------------------------------------------
// Bireysel tarafta abonelik satılmıyor: ürünler işlem başına. "Paket"
// kelimesi tekrar eden ödeme beklentisi kurar ve öyle bir şey yok. Kurumsal
// paketler geldiğinde bu ekranda ayrı bir bölüm açılacak.
//
// -------------------------------------------------------------------------
// ÖDEME GEÇMİŞİ BÖLÜMÜ BOŞ AMA DÜRÜST
// -------------------------------------------------------------------------
// Tahsilat altyapısı bağlı değil, dolayısıyla hiç ödeme kaydı yok. Bölümü
// gizlemek yerine "henüz ödeme yapılmadı" diyor: kullanıcı ödediğini sanıp
// kaydını burada aradığında boş bir ekranla değil, açıklamayla karşılaşır.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_MOD, URUNLER, URUN_SIRASI, fiyatYaz } from '@/data/paketler';
import Icon from '@/components/common/icons';

export default function Page() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
          Ücretler
        </h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Bireysel kullanımda abonelik yok. Her işlem kendi ekranında, tek
          seferlik ödenir; kullanılmayan bakiye ya da tekrar eden ödeme
          bulunmuyor.
        </p>
      </div>

      {DEMO_MOD && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-600 shrink-0 mt-0.5">
            <Icon name="uyari" size="sm" strokeWidth={2.5} />
          </span>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-amber-950">
              Ödeme altyapısı henüz bağlı değil
            </p>
            <p className="text-yardimci text-amber-900/80 font-medium leading-relaxed">
              Aşağıdaki tutarlar bilgilendirme amaçlıdır. Şu an hiçbir işlemde
              tahsilat yapılmıyor; ödeme adımları demo olarak çalışıyor.
            </p>
          </div>
        </div>
      )}

      {/* ÜCRET LİSTESİ. Tek kaynak: src/data/paketler.js */}
      <div className="space-y-3">
        {URUN_SIRASI.map((anahtar) => {
          const urun = URUNLER[anahtar];
          return (
            <div
              key={urun.kod}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">{urun.ad}</h2>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {urun.ozet}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-semibold text-slate-900 tabular-nums leading-none">
                    {fiyatYaz(urun.fiyat)}
                  </p>
                  <p className="text-etiket text-slate-500 font-bold uppercase tracking-wide mt-1">
                    {urun.sureGun ? `${urun.sureGun} gün` : 'Tek seferlik'}
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 pt-1 border-t border-slate-100">
                {urun.kazanimlar.map((k) => (
                  <li key={k} className="flex items-start gap-2 pt-1.5">
                    <span className="text-emerald-600 shrink-0 mt-0.5">
                      <Icon name="onay" size="xs" strokeWidth={3} />
                    </span>
                    <span className="text-yardimci text-slate-600 font-medium leading-relaxed">
                      {k}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ÜCRETSİZ OLANLAR. Ne için para alınmadığını söylemek, ne için
          alındığı kadar önemli — kullanıcı belge yüklerken tereddüt etmesin. */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5">
        <h2 className="text-sm font-semibold text-slate-900">Her zaman ücretsiz</h2>
        {[
          'İlk aracınızın kaydı ve dijital karnesi',
          'Sınırsız bakım kaydı ve fatura yükleme',
          'Kendi belgelerinizi görüntüleme',
          'Karnenizi PIN ile paylaşma ve karne sorgulama',
          'Sigorta, kasko ve muayene takibi',
        ].map((k) => (
          <div key={k} className="flex items-start gap-2.5">
            <span className="text-slate-500 shrink-0 mt-0.5">
              <Icon name="onay" size="xs" strokeWidth={3} />
            </span>
            <span className="text-xs text-slate-600 font-medium leading-relaxed">{k}</span>
          </div>
        ))}
      </div>

      {/* ÖDEME GEÇMİŞİ. Boş ama gizlenmiyor. */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Ödeme geçmişi</h2>
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-1">
          <p className="text-xs font-bold text-slate-600">Henüz ödeme kaydınız yok</p>
          <p className="text-yardimci text-slate-500 font-medium leading-relaxed">
            Tahsilat başladığında ödemeleriniz ve faturalarınız burada listelenecek.
          </p>
        </div>
      </div>

      {/* Kurumsal fiyatlandırma henüz belirlenmedi — "yakında" demek yerine
          ne olduğunu ve ne olmadığını söylüyoruz. */}
      <div className="border-t border-slate-100 pt-6 space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Galeri ve filo kullanımı</h2>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Çok sayıda araç yöneten galeri ve filo sahipleri için ayrı bir
          fiyatlandırma hazırlanıyor. Yukarıdaki tutarlar bireysel kullanım
          içindir.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push('/garage')}
        className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-6 py-3 rounded-xl transition-colors cursor-pointer"
      >
        Garajıma Dön
      </button>
    </div>
  );
}
