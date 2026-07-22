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

// 👑 TESCİL: Uygulamanın arama motoru optimizasyonu (SEO) başlık grubu
export const metadata = {
  title: "Oto.CV | Dijital Taşıt Sicil ve Tescil Dünyası",
  description: "Aracınızın tescilli geçmişini mühürleyin, dijital sicil kartı ile güvenle yönetin.",
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