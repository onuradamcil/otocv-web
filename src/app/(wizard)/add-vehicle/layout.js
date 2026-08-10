// =========================================================================
// Araç Kaydı — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Araç Kaydı',
  description: 'Aracınızı 4 adımda kaydedin ve dijital sicilini oluşturun.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
