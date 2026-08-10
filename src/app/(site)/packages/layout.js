// =========================================================================
// Paketlerim & Ödemeler — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Paketlerim & Ödemeler',
  description: 'Üyelik paketleriniz, ödeme geçmişiniz ve faturalarınız.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
