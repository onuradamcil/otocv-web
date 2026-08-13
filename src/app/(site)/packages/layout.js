// =========================================================================
// Paketlerim & Ödemeler — sayfa metadata'sı
// Sayfa client component olduğu için metadata buradan veriliyor
// (client component'ten metadata export edilemez).
// =========================================================================

// "Paket" DENMİYOR: bireysel tarafta abonelik yok, ürünler işlem başına.
// Paket kelimesi tekrar eden ödeme beklentisi kurar.
export const metadata = {
  title: 'Ücretler & Ödemeler',
  description: 'İşlem ücretleri, ücretsiz özellikler ve ödeme geçmişiniz.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
