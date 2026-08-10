// =========================================================================
// Hesap Aç — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Hesap Aç',
  description: 'Ücretsiz Oto.CV hesabı oluşturun ve ilk aracınızı kaydedin.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
