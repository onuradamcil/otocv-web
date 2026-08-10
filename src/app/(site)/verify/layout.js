// =========================================================================
// Karne PIN Sorgula — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Karne PIN Sorgula',
  description: 'PIN kodu ile aracın bakım geçmişini ve dijital sicilini sorgulayın.',
  robots: { index: true, follow: true },
};

export default function Layout({ children }) {
  return children;
}
