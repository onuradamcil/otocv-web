// =========================================================================
// Sorgulama Geçmişim — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Sorgulama Geçmişim',
  description: 'PIN ile sorguladığınız araçların kaydı.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
