// =========================================================================
// OTO-CV ANA MİMARİ: KÖK YERLEŞİM VE SARMALAYICI KATMANI (layout.js)
// İşlev: Uygulamanın HTML iskeletini oluşturur, küresel font tescillerini
//        yapar ve bildirim motoru sarmalayıcısını projeye enjekte eder.
// =========================================================================

import { Geist, Geist_Mono } from "next/font/google";
import { NotificationProvider } from "../context/NotificationContext";
import "./globals.css";

// 🧠 BİLGİ: Projenin kurumsal yazı tiplerini sisteme tanımlıyoruz kanka
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 👑 TESCİL: Uygulamanın arama motoru optimizasyonu (SEO) temeli
// Başlık şablonu: alt sayfalar yalnızca kendi adını verir, "| Oto.CV" otomatik eklenir.
// metadataBase, göreli yolların (OG görseli gibi) tam adrese çevrilmesi için gerekli.
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: "Oto.CV | Dijital Taşıt Sicili ve Bakım Karnesi",
    template: "%s | Oto.CV",
  },
  description:
    "Aracınızın bakım geçmişini dijital sicil olarak tutun, sigorta ve muayene tarihlerini kaçırmayın, karnenizi tek bağlantıyla paylaşın.",
  applicationName: "Oto.CV",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Oto.CV",
    title: "Oto.CV | Dijital Taşıt Sicili ve Bakım Karnesi",
    description:
      "Aracınızın bakım geçmişini dijital sicil olarak tutun, karnenizi tek bağlantıyla paylaşın.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FFFDFB] text-[#0F172A]">
        
        {/* =========================================================================
            🚀 SİBER ENJEKSİYON: BİLDİRİM MOTORU GEÇİDİ
            Açıklama: NotificationProvider uygulamanın en tepesine mühürlendi.
                     Next.js font mimarini ve flex gövde yapını bozmadan tüm children
                     elemanlarına gerçek zamanlı veri akışı sağlar.
           ========================================================================= */}
        <NotificationProvider>
          {children}
        </NotificationProvider>

      </body>
    </html>
  );
}