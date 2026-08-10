// =========================================================================
// Hesabım — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Hesabım',
  description: 'Ad, soyad, telefon ve şifre bilgilerinizi düzenleyin.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
