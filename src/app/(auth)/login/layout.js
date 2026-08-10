// =========================================================================
// Giriş Yap — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Giriş Yap',
  description: 'Oto.CV hesabınıza giriş yapın.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
