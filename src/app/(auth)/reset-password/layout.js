// =========================================================================
// Şifre Sıfırlama — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Şifre Sıfırlama',
  description: 'E-posta ile gelen bağlantı üzerinden yeni şifrenizi belirleyin.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
