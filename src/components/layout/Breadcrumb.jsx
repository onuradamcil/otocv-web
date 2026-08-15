// =========================================================================
// OTO-CV KIRINTI YOL (Breadcrumb.jsx)
// İşlev: Derin sayfalarda konum bildirir ve anasayfaya dönüş yolu verir.
//        Dış siteden karne linkiyle gelen ziyaretçi için önemli.
//
// Anasayfada ve tek seviyeli sayfalarda BASILMAZ — orada bilgi taşımaz,
// yalnızca gürültü olur (UX kuralı: breadcrumb derinlik varsa anlamlıdır).
//
// KVKK: dinamik segment (PIN kodu) yol metnine yazılmaz.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ETIKET = {
  garage: 'Garajım',
  'my-listings': 'Vitrindeki Araçlarım',
  'favorilerim': 'Favorilerim',
  'mesajlar': 'Mesajlarım',
  verify: 'Karne Sorgula',
  devir: 'Araç Devir',
  details: 'Araç Detayı',
  karne: 'Oto-Karne',
  dashboard: 'Bana Özel Özet',
  'query-history': 'Sorgulama Geçmişim',
  packages: 'Ücretler & Ödemeler',
  account: 'Hesabım',
  'insurance-offer': 'Sigorta Teklifleri',
  'maintenance-planner': 'Bakım Planlayıcı',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const parcalar = pathname.split('/').filter(Boolean);

  // Yalnızca iki veya daha derin yollarda göster (/details/CV-XXXXXX gibi)
  if (parcalar.length < 2) return null;

  const etiket = ETIKET[parcalar[0]];
  if (!etiket) return null;

  return (
    <nav aria-label="Konum" className="border-b border-slate-100 bg-white/60 print:hidden">
      {/* Baglantinin dokunma alani min-h-[24px] ile WCAG 2.2 AA
          asgarisine (SC 2.5.8 Target Size Minimum, 24x24) cikarildi.
          Onceden salt metin oldugu icin yuksekligi 17px idi. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-1.5 text-yardimci font-semibold">
        <Link
          href="/"
          className="inline-flex items-center min-h-[24px] px-0.5 text-slate-500 hover:text-indigo-600 transition-colors rounded"
        >
          Anasayfa
        </Link>
        <span className="text-slate-500" aria-hidden="true">›</span>
        <span className="text-slate-900 font-bold" aria-current="page">{etiket}</span>
      </div>
    </nav>
  );
}
