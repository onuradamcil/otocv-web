// =========================================================================
// Bana Özel Özet — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Bana Özel Özet',
  description: 'Araçlarınızın durumu, yaklaşan tarihler ve bakım özeti.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
