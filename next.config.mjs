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
};

export default nextConfig;
