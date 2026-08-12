import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright çıktıları: ekran görüntüleri, videolar, izler, HTML rapor.
    "playwright-report/**",
    "test-results/**",
  ]),

  // =======================================================================
  // TEST DOSYALARI — React kuralları burada geçerli DEĞİL
  //
  // Playwright'ın fixture API'si `use(...)` adında bir fonksiyon kullanıyor:
  //     sb: async ({}, use) => { ... await use(deger) }
  //
  // eslint-plugin-react-hooks bunu React'in `use()` kancası sanıp
  // "React Hook bir bileşen içinde çağrılmalı" hatası veriyor. Yanlış
  // pozitif: bu dosyalarda React yok, tarayıcıyı süren Node betikleri var.
  //
  // Kuralı GENEL olarak kapatmıyoruz — yalnızca tests/ altında. Uygulama
  // kodunda aynı kural gerçek bir kancayı yakaladı: VehicleDetailsScreen'de
  // iki useEffect erken dönüşün altındaydı ve araç null gelip sonra
  // dolduğunda React "önceki render'dan daha fazla kanca" hatasıyla sayfayı
  // çökertecekti. Bu yüzden kural uygulama tarafında AÇIK kalmalı.
  // =======================================================================
  {
    files: ["tests/**/*.js", "playwright.config.js"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },

  // =======================================================================
  // GEÇİCİ: React derleyicisinin iki yeni kuralı UYARI seviyesinde
  //
  // Bu iki kural mevcut kodda 12 yerde hata veriyor ve hiçbiri bugün bir
  // şeyi bozmuyor:
  //
  //   react-hooks/immutability (7 yer)
  //     Kalıp: useEffect(() => { veriYukle(); }, []) — çağrılan fonksiyon
  //     `const` olarak efektin ALTINDA tanımlı. Çalışma zamanında sorun yok
  //     (efekt mount'tan sonra koşar, o ana kadar const tanımlı), ama
  //     derleyici bunu güvenle iyileştiremiyor.
  //     Dosyalar: GarageScreen, OtoKarneScreen, MarketplaceView,
  //               MyListingsScreen, VehicleVerificationScreen
  //
  //   react-hooks/set-state-in-effect (5 yer)
  //     Efekt gövdesinde doğrudan setState çağrısı; zincirleme render'a
  //     yol açıyor. Performans konusu, kusur değil.
  //
  // NEDEN KAPATILMIYOR, UYARIYA İNDİRİLİYOR: kapatmak onları görünmez
  // yapardı. Uyarı olarak her `npm run lint` çıktısında duruyorlar —
  // borç görünür kalıyor. Bu, yeni bir lint kuralını mevcut kod tabanına
  // almanın standart yolu: uyarıya indir, kademeli düzelt, sonra hataya
  // geri yükselt.
  //
  // NE ZAMAN HATAYA DÖNMELİ: veri yükleme mantığı düzeltildiğinde. Yol
  // haritasında kayıtlı. O gün bu blok tamamen silinecek.
  //
  // DİĞER KURALLAR HATA SEVİYESİNDE KALIYOR — özellikle
  // react-hooks/rules-of-hooks. O kural bugün gerçek bir tuzağı yakaladı:
  // VehicleDetailsScreen'de iki useEffect erken dönüşün altındaydı; araç
  // null gelip sonra dolduğunda React "önceki render'dan daha fazla kanca"
  // hatasıyla sayfayı çökertecekti. Düzeltildi.
  // =======================================================================
  {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
