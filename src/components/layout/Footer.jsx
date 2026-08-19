// =========================================================================
// OTO-CV FOOTER (Footer.jsx)
// İşlev: Kurumsal, yasal ve destek bağlantıları + telif şeridi.
//
// NOT: Yasal metinler ve kurumsal bilgiler henüz yazılmadı. Sahte link
//      konmuyor; hazır olmayanlar gri ve tıklanamaz, "Yakında" başlığıyla
//      işaretli. Metinler hazırlandıkça YakindaOge -> HazirLink olacak.
//
// -------------------------------------------------------------------------
// NİYE KOYU ZEMİN
// -------------------------------------------------------------------------
// Alt bilgi `bg-white` idi, sayfa zemini ise `--color-canvas` (#FFFDFB).
// Aradaki fark ölçülebilir bir sınır değil — alt bilgi sayfanın devamı gibi
// görünüyor, nerede bittiği okunmuyordu.
//
// Zemin `#0F172A`: YENİ bir renk DEĞİL, `globals.css:50`teki
// `--color-darkslate` markası. Anasayfanın arama kahramanı da aynı rengi
// kullanıyor (`MarketplaceView.jsx:1198`) — yani sayfa artık koyu bir
// başlangıç ve koyu bir bitişle çerçeveleniyor, ortası açık kalıyor.
//
// ⚠ RENKLER ÖLÇÜLEREK SEÇİLDİ (#0F172A üzerinde kontrast):
//     slate-200 → 13.9:1   slate-300 → 11.5:1
//     slate-400 →  6.67:1  slate-500 →  3.59:1  ✗ AA'yı geçmiyor
// Bu yüzden koyu zeminde `text-slate-500` HİÇ KULLANILMIYOR; açık zemindeki
// eski değerler birebir taşınsaydı üç ayrı yerde okunaksız metin olurdu.
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
      <h2 className="etiket text-white">{baslik}</h2>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function HazirLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        /* ⚠ Vurgu rengi `indigo-600` DEĞİL: koyu zeminde 2.1:1 kalıyor,
             yani "üzerine gelince okunmaz oluyor" gibi ters bir etki
             veriyordu. Koyu zeminde vurgu = beyaza doğru açılmak. */
        className="odak-acik flex items-center min-h-[44px] metin-yardimci text-slate-200 hover:text-white transition-colors rounded"
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
        /* Hazır bağlantılar `slate-200`, bunlar `slate-400`: aradaki fark
           "bu henüz açılmadı"yı taşıyor. Daha da kısmak (slate-500) 3.59:1
           ile AA'nın altına düşerdi — hiyerarşi okunaksızlıkla kurulmuyor. */
        className="flex items-center min-h-[44px] metin-yardimci text-slate-400 cursor-not-allowed select-none"
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
    <footer className="bg-[#0F172A] border-t border-slate-800 mt-16 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          <div className="space-y-3">
            <span className="text-base font-display font-bold tracking-tight text-white block">OTO.CV</span>
            {/* Keyfi 11px yerine ölçekteki `.metin-yardimci` (12px). Bu bir
                cümle, etiket değil; alt bilgi her sayfada olduğu için ölçek
                dışı kalması tipografiyi her ekranda deliyordu. */}
            <p className="metin-yardimci text-slate-400 font-medium leading-relaxed max-w-[240px]">
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

      {/* Koyu zeminde `slate-100` bir ayraç görünmez olurdu; şeffaf beyaz
          ayraç zeminin kendi tonundan bağımsız olarak hep bir kademe
          açık kalıyor. */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="metin-yardimci text-slate-400">
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
            className="odak-acik inline-flex items-center min-h-[44px] metin-yardimci text-slate-400 hover:text-white transition-colors rounded"
          >
            Verileriniz nasıl işleniyor?
          </Link>
        </div>
      </div>
    </footer>
  );
}
