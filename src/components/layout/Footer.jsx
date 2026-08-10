// =========================================================================
// OTO-CV FOOTER (Footer.jsx)
// İşlev: Kurumsal, yasal ve destek bağlantıları + telif şeridi.
//
// NOT: Yasal metinler ve kurumsal bilgiler henüz yazılmadı. Sahte link
//      konmuyor; hazır olmayanlar gri ve tıklanamaz, "Yakında" başlığıyla
//      işaretli. Metinler hazırlandıkça YakindaOge -> HazirLink olacak.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';

function Sutun({ baslik, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black text-slate-900 tracking-wider uppercase">{baslik}</h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function HazirLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center min-h-[36px] text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        {children}
      </Link>
    </li>
  );
}

function YakindaOge({ children }) {
  return (
    <li>
      <span
        className="flex items-center min-h-[36px] text-[11px] font-semibold text-slate-400 cursor-not-allowed select-none"
        title="Yakında"
      >
        {children}
      </span>
    </li>
  );
}

export default function Footer() {
  const yil = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-16 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          <div className="space-y-3">
            <span className="text-base font-display font-bold tracking-tight text-slate-900 block">OTO.CV</span>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[240px]">
              Aracınızın bakım geçmişini dijital sicil olarak tutun, sigorta ve muayene
              tarihlerini kaçırmayın, karnenizi tek bağlantıyla paylaşın.
            </p>
          </div>

          <Sutun baslik="Kurumsal">
            <YakindaOge>Hakkımızda</YakindaOge>
            <YakindaOge>İletişim</YakindaOge>
            <YakindaOge>Kurumsal Çözümler</YakindaOge>
          </Sutun>

          <Sutun baslik="Yasal">
            <YakindaOge>KVKK Aydınlatma Metni</YakindaOge>
            <YakindaOge>Gizlilik Politikası</YakindaOge>
            <YakindaOge>Kullanım Şartları</YakindaOge>
          </Sutun>

          <Sutun baslik="Destek">
            <HazirLink href="/verify">PIN ile Araç Sorgula</HazirLink>
            <YakindaOge>Sık Sorulan Sorular</YakindaOge>
            <YakindaOge>Nasıl Çalışır?</YakindaOge>
          </Sutun>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-slate-400">
            © {yil} Oto.CV · Tüm hakları saklıdır
          </span>
          <span className="text-[10px] font-medium text-slate-300">
            Yasal metinler hazırlanıyor
          </span>
        </div>
      </div>
    </footer>
  );
}
