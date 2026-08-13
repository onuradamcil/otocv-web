// =========================================================================
// SON ÇARE HATA SINIRI (app/global-error.js)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// `app/error.js` kök layout'un İÇİNDE çalışır — yani kök layout'un kendisi
// (yazı tipi yüklenmesi, sağlayıcılar, `<html>`/`<body>`) çökerse onu
// yakalayamaz. O durumda kullanıcı BEYAZ EKRAN görür; ne mesaj, ne çıkış
// yolu, ne de neyin yanlış gittiğine dair bir iz.
//
// `global-error.js` kök layout'un yerine geçer. Bu yüzden `<html>` ve
// `<body>` etiketlerini KENDİSİ yazmak zorunda — Next.js'in tek istisnası.
//
// Buraya düşülmesi beklenen bir şey değil; düşülürse de kullanıcı en azından
// ne olduğunu ve nereye gideceğini görüyor. Stil satır içi yazılmış, çünkü
// kök layout devre dışıyken global CSS'in yüklendiğine güvenilemez.
// =========================================================================

'use client';

import React, { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Kök hata:', error);
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#FFFDFB', color: '#0F172A' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '2rem' }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 900, margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>
              Uygulama başlatılamadı
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Beklenmedik bir sorun oluştu. Verileriniz etkilenmedi.
              Sayfayı yenilemeyi deneyin.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ minHeight: '44px', width: '100%', background: '#4f46e5', color: '#fff', border: 0, borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
