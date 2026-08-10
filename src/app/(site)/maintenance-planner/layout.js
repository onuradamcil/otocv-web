// =========================================================================
// Bakım Planlayıcı — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Bakım Planlayıcı',
  description: 'Kilometre ve tarih bilgilerinize göre yaklaşan bakımlarınızı planlayın.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
