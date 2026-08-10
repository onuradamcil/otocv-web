// =========================================================================
// Sigorta Teklifleri — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

export const metadata = {
  title: 'Sigorta Teklifleri',
  description: 'Aracınızın poliçe tarihlerine göre size uygun sigorta ve kasko teklifleri.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
