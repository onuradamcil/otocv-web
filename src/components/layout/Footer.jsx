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
      {/* h2: sayfaların çoğunda tek bir h1 var ve alt bilgi h3 kullanınca
          başlık hiyerarşisinde h1 -> h3 atlaması oluşuyordu (denetimde
          dashboard, mesajlar, sorgu geçmişi ve devir sayfalarında ölçüldü).
          Ekran okuyucu kullanıcısı için başlık ağacı bozuk demek. */}
      <h2 className="text-[10px] font-black text-slate-900 tracking-wider uppercase">{baslik}</h2>
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

          {/* Üçü de artık gerçek sayfa. Nihai metinler hazırlanana kadar
              sayfalar sistemin fiilen ne yaptığını anlatıyor ve bu durumu
              üstte açıkça söylüyor — "Yakında" deyip boş bırakmaktan da,
              uydurma bir metin koymaktan da dürüst olanı bu. */}
          <Sutun baslik="Yasal">
            <HazirLink href="/kvkk">KVKK Aydınlatma Metni</HazirLink>
            <HazirLink href="/gizlilik">Gizlilik Politikası</HazirLink>
            <HazirLink href="/kullanim-sartlari">Kullanım Şartları</HazirLink>
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
          {/* "Yasal metinler hazırlanıyor" yazıyordu ve o zaman doğruydu:
              üç bağlantı da ölüydü. Sayfalar açıldığı için bu uyarı artık
              yanlış olurdu — nihai metnin hazırlandığını sayfaların kendisi
              üstte söylüyor. */}
          {/* inline-flex + min-h: küçük punto bir bağlantının dokunma alanı
              yine de 24 pikselin altına inmemeli (WCAG AA). Metni <span>'den
              <Link>'e çevirdiğimde bunu atlamıştım ve mobil erişilebilirlik
              testleri üç sayfada birden kırıldı. */}
          <Link
            href="/kvkk"
            className="inline-flex items-center min-h-[36px] text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Verileriniz nasıl işleniyor?
          </Link>
        </div>
      </div>
    </footer>
  );
}
