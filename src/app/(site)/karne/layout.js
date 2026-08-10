// =========================================================================
// Oto-Karne — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Oto-Karne',
  description: 'Aracınızın resmi sicil belgesi ve paylaşılabilir bakım karnesi.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
