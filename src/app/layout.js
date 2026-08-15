// =========================================================================
// OTO-CV ANA MİMARİ: KÖK YERLEŞİM VE SARMALAYICI KATMANI (layout.js)
// İşlev: Uygulamanın HTML iskeletini oluşturur, küresel font tescillerini
//        yapar ve bildirim motoru sarmalayıcısını projeye enjekte eder.
// =========================================================================

import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { NotificationProvider } from "../context/NotificationContext";
import { ToastProvider } from "../context/ToastContext";
import "./globals.css";

// =========================================================================
// 🔤 YAZI TİPİ SİSTEMİ
//
// Önceki durum: Geist + Geist Mono next/font ile indiriliyordu ama hiçbir
// yerde kullanılmıyordu; Inter, Space Grotesk ve JetBrains Mono ise
// globals.css'ten Google Fonts CDN'i üzerinden çekiliyordu. Yani dört
// aileden ikisi boşuna iniyordu ve CDN isteği sayfa çizimini geciktiriyordu.
//
// Şimdi: üçü de next/font ile self-host ediliyor. Üçü de DEĞİŞKEN font,
// yani ağırlıkları tek tek istemek yerine tam aralık tek dosyada geliyor.
// Bu, kod tabanında 238 yerde kullanılan font-semibold (900) ve
// font-semibold (800) ağırlıklarının sahte kalınlaştırma yerine gerçek
// ağırlıkla çizilmesini sağlıyor — CDN isteği yalnızca 700'e kadar
// ağırlık indirdiği için o 238 kullanım tarayıcı uydurmasıydı.
//
// subsets: Türkçe için latin YETMEZ. ğ ş ı İ karakterleri latin-ext'te.
// display: swap — font inerken metin görünmez kalmıyor.
// =========================================================================
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FFFDFB] text-[#0F172A]">
        
        {/* =========================================================================
            🚀 SİBER ENJEKSİYON: BİLDİRİM MOTORU GEÇİDİ
            Açıklama: NotificationProvider uygulamanın en tepesine mühürlendi.
                     Next.js font mimarini ve flex gövde yapını bozmadan tüm children
                     elemanlarına gerçek zamanlı veri akışı sağlar.
           ========================================================================= */}
        <NotificationProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </NotificationProvider>

      </body>
    </html>
  );
}