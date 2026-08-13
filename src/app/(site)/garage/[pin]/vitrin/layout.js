export const metadata = {
  title: 'Vitrin Kartı',
  description: 'Aracınızın pazaryerinde görüneceği kartı düzenleyin.',
  // Kişisel garaj sayfası; arama motorlarına kapalı.
  robots: { index: false, follow: false },
};

export default function VitrinLayout({ children }) {
  return children;
}
