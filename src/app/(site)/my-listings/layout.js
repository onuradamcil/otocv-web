// =========================================================================
// Aktif İlanlarım — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Aktif İlanlarım',
  description: 'Vitrine çıkardığınız araçlarınızı buradan yönetin.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
