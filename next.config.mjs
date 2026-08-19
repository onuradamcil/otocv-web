// =========================================================================
// GÖRSEL İYİLEŞTİRME AYARLARI
//
// -------------------------------------------------------------------------
// NİYE GEREKİYOR — VE NEYİ ÇÖZMEDİĞİ
// -------------------------------------------------------------------------
// Araç kartları 76-160 px'lik kutulara 1920 px'lik dosya indiriyordu. Aradaki
// fark tamamen boşa giden çıkış trafiği. `next/image` her kutuya o kutunun
// ölçüsünde bir kopya sunuyor.
//
// ⚠ BU KATMAN DEPOLAMAYA DOKUNMUYOR. Kovadaki dosya aynı boyutta kalıyor;
// yalnızca kullanıcıya GİDEN kopya küçülüyor. Depolama ve yükleme süresi
// `src/utils/gorselSikistir.js` ile, yüklemeden ÖNCE çözülüyor. İki katman
// birbirinin yerine geçmiyor.
// =========================================================================

// Host, ortam değişkeninden türetiliyor. Sabit yazmak, proje kimliğini kaynağa
// gömmek ve ortam değiştiğinde sessizce kırılmak demekti.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    // Ortam değişkeni yoksa desen hiç eklenmiyor: geçersiz bir desen eklemek
    // yapılandırmayı tamamen bozar. Uzak görseller iyileştirilmeden çalışır.
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ⚠ YALNIZCA GENEL ARAÇ GÖRSELİ KOVASI. `pathname` daraltılmadan bırakmak
    // (`/**`) bizim iyileştiricimizi Supabase'teki HER yol için açık bir
    // ara sunucuya çevirirdi. `search: ''` sorgu dizesi taşıyan adresleri
    // reddediyor — imzalı URL'ler buradan geçemesin diye.
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/vehicle-images/**',
            search: '',
          },
        ]
      : [],

    // Next 16'da bu alan ZORUNLU: dokümanda "required starting with Next.js 16"
    // yazıyor, çünkü serbest bırakılan kalite değerleri iyileştiriciyi kötüye
    // kullanılabilir hâle getiriyor. Tek değer yeterli — kod hiçbir yerde
    // `quality` geçmiyor, yani hepsi 75 kullanıyor.
    qualities: [75],

    // WebP tek başına. AVIF ~%20 daha küçük ama kodlaması ~%50 daha yavaş ve
    // her biçim AYRI önbelleğe alınıyor: iki biçim, iki kat disk. Yükleme
    // tarafında zaten WebP'ye çeviriyoruz, ikinci bir biçmin kazancı marjinal.
    formats: ['image/webp'],

    // 31 gün. Dosya adları yükleme anında zaman damgalı ve bir daha
    // değişmiyor — yani içerik değişmeden adres değişmiyor, adres değişmeden
    // içerik değişmiyor. Bu durumda uzun önbellek güvenli ve tekrar
    // iyileştirme maliyetini sıfıra indiriyor.
    //
    // ⚠ Next'te önbelleği geçersiz kılma mekanizması YOK. Uzun süre ancak
    // adresler değişmez olduğu için seçilebiliyor; değişebilir adreslerde bu
    // değer düşürülmeliydi.
    minimumCacheTTL: 2678400,
  },

  // =======================================================================
  // GÜVENLİK BAŞLIKLARI
  //
  // 19 Ağustos 2026 taramasında sınanan altı rotanın hiçbiri tek bir
  // güvenlik başlığı döndürmüyordu: ne CSP, ne HSTS, ne X-Frame-Options.
  //
  // ⚠ BU KATMAN XSS'İ ÇÖZMÜYOR, İKİNCİ HATTI KURUYOR. Asıl onarım
  // `src/utils/htmlTemizle.js` ile basma anındaki temizlik. Başlıklar,
  // gözden kaçan bir enjeksiyonun ne kadar ilerleyebileceğini daraltıyor.
  // =======================================================================
  poweredByHeader: false,   // "X-Powered-By: Next.js" sürüm bilgisi sızdırıyordu

  async headers() {
    // Supabase hostu ortamdan türetiliyor; sabit yazmak ortam değişince
    // sessizce CSP ihlali üretirdi (istekler engellenir, sebebi görünmez).
    const sb = supabaseHost ? `https://${supabaseHost}` : '';
    const sbWs = supabaseHost ? `wss://${supabaseHost}` : '';
    const gelistirme = process.env.NODE_ENV !== 'production';

    // ⚠ `'unsafe-inline'` ve `'unsafe-eval'` script-src'de DURUYOR ve bu
    // bilinçli bir ödün. Next.js istemci tarafında satır içi başlatma
    // betikleri basıyor; bunları nonce'a bağlamak middleware ister ve
    // projede middleware YOK. Yani bu CSP betik enjeksiyonuna karşı
    // ZAYIF — asıl korumayı sanitizasyon veriyor. Buradaki gerçek kazanç
    // `frame-ancestors`, `object-src`, `base-uri` ve `form-action`.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${sb}`.trim(),
      "font-src 'self' data:",
      // ⚠ `blob:` BURADA ŞART. Fotoğraf yükleme akışı sıkıştırdığı görseli
      // `URL.createObjectURL` ile blob adresine çevirip `fetch(blobUrl)` ile
      // geri okuyor (`CreateListingWizard.jsx:405`). `blob:` olmadan bu
      // istek CSP'ye takılıyor ve araç fotoğrafı yükleme sessizce kırılıyor
      // — ilk yazdığım CSP'de yoktu, `23-gorsel-sikistirma` testi yakaladı.
      // Güvenlik ödünü yok: blob adresini yalnızca sayfanın kendisi üretir.
      `connect-src 'self' blob: ${sb} ${sbWs}${gelistirme ? ' ws: http://localhost:*' : ''}`.trim(),
      "media-src 'self' blob:",
      // Tıklama hırsızlığını (clickjacking) kapatan asıl madde.
      "frame-ancestors 'none'",
      "object-src 'none'",
      // Enjekte edilen bir <base> etiketiyle tüm göreli adreslerin
      // saldırgana yönlendirilmesini engelliyor.
      "base-uri 'self'",
      // Form gönderimi dışarı kaçırılamasın.
      "form-action 'self'",
      "frame-src 'self'",
    ].join('; ');

    const basliklar = [
      { key: 'Content-Security-Policy', value: csp },
      // frame-ancestors'ın eski tarayıcılardaki karşılığı.
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Plaka/PIN taşıyan adreslerin dış sitelere referrer olarak
      // gitmemesi için: aynı köken tam adres, dışarıya yalnızca köken.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Ürünün kullanmadığı güçlü API'ler kapatılıyor.
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
    ];

    // ⚠ HSTS YALNIZCA ÜRETİMDE. Geliştirmede localhost'a HSTS yazmak,
    // tarayıcıyı http://localhost'u https'e zorlamaya itip yerel ortamı
    // günlerce kırabiliyor — üstelik temizlemesi elle yapılıyor.
    if (!gelistirme) {
      basliklar.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [{ source: '/:path*', headers: basliklar }];
  },
};

export default nextConfig;
