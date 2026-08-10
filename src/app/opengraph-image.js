// =========================================================================
// OTO-CV PAYLAŞIM KARTI (opengraph-image.js)
// İşlev: WhatsApp, X ve diğer mecralarda link paylaşıldığında çıkan görsel.
//        Next.js'in ImageResponse API'si ile derleme anında üretilir.
//        Tasarım dili korunur: koyu slate zemin, amber vurgu.
// =========================================================================

import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Oto.CV — Dijital Taşıt Sicili ve Bakım Karnesi';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0F172A',
          color: '#FFFDFB',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, color: '#FBBF24', letterSpacing: 2 }}>
          OTO.CV
        </div>

        <div style={{ display: 'flex', fontSize: 66, fontWeight: 800, marginTop: 28, lineHeight: 1.15 }}>
          Dijital Taşıt Sicili ve
        </div>
        <div style={{ display: 'flex', fontSize: 66, fontWeight: 800, lineHeight: 1.15 }}>
          Bakım Karnesi
        </div>

        <div style={{ display: 'flex', fontSize: 29, marginTop: 34, color: '#94A3B8' }}>
          Bakım geçmişini tut · Tarihleri kaçırma · Karneni paylaş
        </div>
      </div>
    ),
    size
  );
}
