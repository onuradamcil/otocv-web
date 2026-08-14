// =========================================================================
// OTO-CV İKON KAYDI — ÇİZİMLER (icons/registry.jsx)
//
// Motor Icon.jsx'te. Burada yalnızca çizimler var.
//
// IZGARA SÖZLEŞMESİ (Icon.jsx'teki kuralın uygulaması):
//   kutu 24×24 · canlı alan 20×20 (her kenarda 2 birim boşluk)
//   fill yok, stroke="currentColor", kalınlık 2, uçlar yuvarlak
//   Renk ve boyut BURADA belirtilmez — motor verir. Bu yüzden hiçbir çizimde
//   stroke rengi, width/height ya da fill yazmıyor.
//
// İKİ AİLE:
//   1) GENEL ARAYÜZ İKONLARI — onay, kapat, uyarı, takvim… Heroicons
//      "outline" dilinde. Kod tabanındaki elle yazılmış SVG'ler de bu dilde
//      olduğu için kütüphane onlarla yan yana durduğunda fark edilmiyor.
//   2) ALANA ÖZGÜ İKONLAR — arac, karne, anahtar, pinKod. Bunlar hazır
//      kütüphanelerde YOK; OtoCV'nin işini anlatan kavramlar oldukları için
//      buraya elle çizildi. Sitenin ikon dilini "genel bir SaaS" değil
//      "taşıt sicili" yapan kısım budur.
//
// KULLANILMAYAN İKON BURADA DURMAZ. CIZIMLER tek bir nesne olduğu için
// paketleyici tek tek özellikleri ayıklayamaz — kayıtlı her ikon, hiçbir
// yerde kullanılmasa bile her ziyaretçinin tarayıcısına iniyor. İlk turda
// plaka/kilometre/tramer/muayene çizilmiş ama hiçbir yere bağlanmamıştı;
// bu yüzden kaldırıldılar. Gerekince geri eklenir, maliyeti bir çizim.
//
// Bir çizim eklerken: canlı alanı taşırma, 2 birim boşluğu koru, düz çizgi
// yerine yuvarlak birleşim kullan ve 14px'te (size="sm") okunduğunu kontrol
// et — ikonların çoğu satır içinde o boyutta basılıyor.
// =========================================================================

import React from 'react';

export const CIZIMLER = {
  // =======================================================================
  // 1) GENEL ARAYÜZ İKONLARI
  // =======================================================================

  // Onay işareti. Eski ✓ (U+2713) karakterinin yerini alır: o karakterin
  // yüksekliği yazı tipine göre değişiyordu ve rozetlerin içinde kayıyordu.
  onay: (
    <>
      <path d="M4.5 12.75l6 6 9-13.5" />
    </>
  ),

  // Kapat. Eski ✕ (U+2715) karakterinin yerini alır.
  kapat: (
    <>
      <path d="M6 18L18 6M6 6l12 12" />
    </>
  ),

  // "Yok / sıfırla" — renk seçimini kaldıran butonlarda kullanılır. Önceden
  // ╱ (U+2571, kutu çizim karakteri) basılıyordu; o karakter yazı tipine göre
  // kayıyor ve bazı yazı tiplerinde hiç bulunmuyor.
  yasak: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M6 18L18 6" />
    </>
  ),

  arti: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),

  // Gezinme okları. Kod tabanında aşağı ok 10, geri oku 3 ayrı yerde elle
  // yazılmıştı — hepsi aynı şekli farklı kalınlıklarla çiziyordu.
  asagi: (
    <>
      <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </>
  ),

  geri: (
    <>
      <path d="M15.75 19.5L8.25 12l7.5-7.5" />
    </>
  ),

  uyari: (
    <>
      <path d="M12 9v3.9m0 3.1h.01M10.3 3.9L2.7 17c-.7 1.2.2 2.7 1.6 2.7h15.4c1.4 0 2.3-1.5 1.6-2.7L13.7 3.9c-.7-1.2-2.7-1.2-3.4 0z" />
    </>
  ),

  bilgi: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8.2h.01" />
    </>
  ),

  takvim: (
    <>
      <rect x="3.2" y="5.5" width="17.6" height="15.3" rx="2" />
      <path d="M3.2 10.2h17.6M8.2 2.8v3.4M15.8 2.8v3.4" />
    </>
  ),

  konum: (
    <>
      <path d="M20 10.4c0 5.9-8 11.3-8 11.3s-8-5.4-8-11.3a8 8 0 1116 0z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),

  klasor: (
    <>
      <path d="M2.8 7.4c0-1 .8-1.8 1.8-1.8h4.1c.5 0 1 .2 1.3.6l1.4 1.5h7.9c1 0 1.9.8 1.9 1.8v8.7c0 1-.9 1.8-1.9 1.8H4.6c-1 0-1.8-.8-1.8-1.8V7.4z" />
    </>
  ),

  ilan: (
    <>
      <rect x="5.3" y="4.4" width="13.4" height="16.4" rx="1.8" />
      <path d="M9 3.2h6a1 1 0 011 1v1.6a1 1 0 01-1 1H9a1 1 0 01-1-1V4.2a1 1 0 011-1z" />
      <path d="M8.8 11.6h6.4M8.8 15.2h4.2" />
    </>
  ),

  kalkan: (
    <>
      <path d="M12 21.3c4.8-1.3 8.3-5.7 8.3-10.9 0-1.2-.2-2.4-.6-3.5h-.1c-3 0-5.7-1.2-7.6-3-1.9 1.8-4.6 3-7.6 3H4.3c-.4 1.1-.6 2.3-.6 3.5 0 5.2 3.5 9.6 8.3 10.9z" />
      <path d="M9.2 12l2 2 3.6-4" />
    </>
  ),

  zil: (
    <>
      <path d="M18.2 16.4a8.6 8.6 0 01-2.2-5.7V10a4 4 0 00-8 0v.7a8.6 8.6 0 01-2.2 5.7 22.9 22.9 0 0012.4 0z" />
      <path d="M14.6 19.4a2.7 2.7 0 01-5.2 0" />
    </>
  ),

  // Kalp — favori. Tek çizgi yol; `dolu` prop'uyla içi doldurulabiliyor
  // (bkz. Icon.jsx). Favori aç/kapa iki DURUM taşıyor ve durumu yalnızca
  // renkle anlatmak yetmiyor: renk körü kullanıcı ikisini ayırt edemez.
  kalp: (
    <>
      <path d="M12 20.3l-1.4-1.3C5.4 14.4 2 11.3 2 7.6 2 4.6 4.4 2.3 7.4 2.3c1.7 0 3.4.8 4.6 2.1 1.2-1.3 2.9-2.1 4.6-2.1 3 0 5.4 2.3 5.4 5.3 0 3.7-3.4 6.8-8.6 11.4L12 20.3z" />
    </>
  ),

  yildiz: (
    <>
      <path d="M12 3.4l2.6 5.6 5.9.7-4.3 4 1.2 5.9-5.4-3-5.4 3 1.2-5.9-4.3-4 5.9-.7L12 3.4z" />
    </>
  ),

  duzenle: (
    <>
      <path d="M16.9 4.5l1.7-1.7a1.9 1.9 0 112.6 2.6L10.6 16.1a4.5 4.5 0 01-1.9 1.1L6 18l.8-2.7a4.5 4.5 0 011.1-1.9l9-8.9z" />
      <path d="M16.9 4.5L19.5 7.1" />
    </>
  ),

  goz: (
    <>
      <path d="M2 12s3.6-6.8 10-6.8S22 12 22 12s-3.6 6.8-10 6.8S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),

  gozKapali: (
    <>
      <path d="M4 8.2A11 11 0 002 12s3.6 6.8 10 6.8c1 0 2-.1 2.9-.4M6.2 6.2A10.6 10.6 0 0112 5.2c6.4 0 10 6.8 10 6.8a12.9 12.9 0 01-4.3 5" />
      <path d="M3 3l18 18" />
      <path d="M10 10a2.8 2.8 0 004 4" />
    </>
  ),

  // Uygulama mağazası rozetlerinde kullanılır. Apple/Google marka
  // logolarının yerine bilinçli olarak nötr bir indirme oku kondu:
  // o logolar tescilli marka ve elimizde resmî varlıkları yok.
  indir: (
    <>
      <path d="M12 3.6v11.2M7.6 10.4L12 14.8l4.4-4.4" />
      <path d="M4 17.4v1.6a1.4 1.4 0 001.4 1.4h13.2a1.4 1.4 0 001.4-1.4v-1.6" />
    </>
  ),

  kure: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 12h17.6" />
      <path d="M12 3a13.6 13.6 0 010 18 13.6 13.6 0 010-18z" />
    </>
  ),

  simsek: (
    <>
      <path d="M13.2 2.8L4.6 13.4h5.4l-1.2 7.8 8.6-10.6h-5.4l1.2-7.8z" />
    </>
  ),

  parlama: (
    <>
      <path d="M9.5 3.4l1.3 3.6 3.6 1.3-3.6 1.3-1.3 3.6-1.3-3.6L4.6 8.3l3.6-1.3 1.3-3.6z" />
      <path d="M17.4 13.2l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1z" />
    </>
  ),

  // BOYA — boyalı/değişen parça bilgisi için. İlk denemede palet çizilmişti
  // ama 14px'te bulamaç oluyordu (kadranın içindeki boya lekeleri kayboluyor).
  // Damla tek kapalı biçim olduğu için küçük boyutta net kalıyor.
  boya: (
    <>
      <path d="M12 3.4c0 0 5.6 6.2 5.6 10a5.6 5.6 0 11-11.2 0c0-3.8 5.6-10 5.6-10z" />
    </>
  ),

  // =======================================================================
  // 2) ALANA ÖZGÜ İKONLAR — hazır kütüphanelerde bulunmayan, OtoCV'nin
  //    işini anlatan çizimler.
  // =======================================================================

  // ARAÇ — hazır kütüphanelerdeki "truck" (kamyon) yerine gerçek bir
  // otomobil silueti: kaput eğimi, kuşak hattı ve iki tekerlek.
  arac: (
    <>
      <path d="M5 17H3.9a.7.7 0 01-.7-.7v-3a1 1 0 01.07-.36l1.9-4.6A2 2 0 016.9 7h10.2a2 2 0 011.85 1.24l1.9 4.6a1 1 0 01.07.36v3a.7.7 0 01-.7.7H19" />
      <path d="M3.4 13h17.2" />
      <path d="M9.4 17h5.2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),


  // KARNE — sitenin ürünü: köşesi kıvrık resmi belge + onay işareti.
  karne: (
    <>
      <path d="M13.2 3H7.2A1.7 1.7 0 005.5 4.7v14.6A1.7 1.7 0 007.2 21h9.6a1.7 1.7 0 001.7-1.7V8.1L13.2 3z" />
      <path d="M13.2 3v5.1h5.3" />
      <path d="M9 14.2l2.1 2.1 3.9-4.4" />
    </>
  ),




  // ANAHTAR — servis/bakım. Bakım satırlarında servis adının yanında
  // konum iğnesi yerine bu kullanılır: orada anlatılan şey bir yer değil,
  // işi yapan servistir.
  // Tek kapalı siluet: sol altta sap, sağ üstte çatal ağız. İlk deneme
  // (halka + sap) 14px'te anahtardan çok anahtar deliği gibi okunuyordu.
  anahtar: (
    <>
      <path d="M14.4 5.6a4.1 4.1 0 00-5.3 5.3l-5.1 5.1a1.9 1.9 0 002.7 2.7l5.1-5.1a4.1 4.1 0 005.3-5.3l-2.5 2.5-2.7-2.7 2.5-2.5z" />
    </>
  ),

  // PIN — 6 haneli sicil sorgulama kodu alanı. Rakam basmaz; okunabilirlik
  // için 4 nokta ile soyutlanır.
  pinKod: (
    <>
      <rect x="2.6" y="7.6" width="18.8" height="8.8" rx="2" />
      <path d="M6.8 12h.01M10.3 12h.01M13.8 12h.01M17.3 12h.01" strokeWidth="2.6" />
    </>
  ),
};
