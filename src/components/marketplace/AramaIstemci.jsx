// =========================================================================
// ARAMA SONUÇ EKRANI İSTEMCİSİ (AramaIstemci.jsx)
//
// Adres çubuğundaki arama ve süzgeç parametrelerini okuyup
// `MarketplaceView`e başlangıç durumu olarak veriyor.
//
// -------------------------------------------------------------------------
// NİYE SÜZGEÇ ADRESTE
// -------------------------------------------------------------------------
// Ürün sahibinin senaryosu: anasayfadaki süzgeçten marka seçmek de arama
// yapmalı ve sonuç ekranına götürmeli. Bunun çalışması için süzgeç durumunun
// adreste taşınması şart — yoksa `/arama`ya gidildiğinde seçim kaybolur.
//
// Yan kazanç: sonuç ekranı paylaşılabilir ve yer imlenebilir oluyor.
// Sektör liderlerinde de listeleme adresi seçilen kırılımı taşıyor.
//
// ⚠ MARKA AĞACI ADRESTEN GERİ KURULUYOR ama iki farklı şey saklanıyor:
//   • `suzgec.marka/seri/model/donanim` -> NORMALİZE AD ('bmw', '3 serisi')
//   • `agacYolu`                        -> katalog KİMLİKLERİ (id)
// Adreste ad taşınıyor; kimlik zinciri `MarketplaceView` içinde katalogtan
// çözülüyor. Adreste id taşımak reddedildi: katalog kimlikleri değişirse
// paylaşılan bağlantı sessizce bozulur ve adres okunaksız olur.
// =========================================================================

'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MarketplaceView from './MarketplaceView';

/** Adreste taşınan süzgeç anahtarları. Sıra ekranla ilgisiz, okunurluk için. */
export const SUZGEC_ANAHTARLARI = [
  'marka', 'seri', 'model', 'donanim',
  'sehir', 'yakit', 'vites', 'tramer',
  'yilMin', 'yilMax', 'kmMin', 'kmMax',
  'sicilEnAz', 'oneCikan', 'yeni',
];

export default function AramaIstemci() {
  const router = useRouter();
  const sorgu = useSearchParams();

  // ⚠ `useMemo` + dize anahtarı: `useSearchParams` her render'da yeni bir
  // nesne döndürüyor. Doğrudan bağımlılık verilseydi `MarketplaceView`in
  // veri çekme etkisi sonsuz döngüye girerdi.
  const anahtar = sorgu.toString();
  const baslangic = useMemo(() => {
    const p = new URLSearchParams(anahtar);
    const al = (ad) => p.get(ad) || '';
    return {
      arama: al('q'),
      suzgec: {
        // 'Tümü' bu üçünün "süzme yok" değeri; adreste yoksa o değere dönüyor.
        sehir: al('sehir') || 'Tümü',
        yakit: al('yakit') || 'Tümü',
        vites: al('vites') || 'Tümü',
        tramer: al('tramer') || 'Tümü',
        marka: al('marka'), seri: al('seri'),
        model: al('model'), donanim: al('donanim'),
        yilMin: al('yilMin'), yilMax: al('yilMax'),
        kmMin: al('kmMin'), kmMax: al('kmMax'),
        sicilEnAz: Number(al('sicilEnAz')) || 0,
        // ⚠ Dize karşılaştırması: `Boolean('false')` true döner.
        yalnizOneCikan: al('oneCikan') === '1',
        yalnizYeni: al('yeni') === '1',
      },
    };
  }, [anahtar]);

  // ⚠ `key` ARAMA KELİMESİNE BAĞLI — ÖLÇÜLMÜŞ BİR HATANIN ONARIMI.
  // `baslangicAramasi`/`baslangicSuzgeci` `MarketplaceView` içinde YALNIZCA
  // ilk bağlanmada okunuyor. Aynı rotada kalıp adresi değiştirmek (başlık
  // şeridinden yeni arama yapmak) sonuçları TAZELEMİYORDU: adres
  // `?q=zzzbulunmayanmarka` oluyor ama ızgarada eski 48 kart duruyordu ve
  // yalnızca tam yenilemede düzeliyordu. Kullanıcı için bu "arama çalışmıyor"
  // demek. Yeni arama = yeni sorgu, dolayısıyla bileşenin yeniden
  // bağlanması doğru davranış.
  //
  // ⚠ ANAHTAR YALNIZCA `q`, TÜM SORGU DİZESİ DEĞİL. Süzgeç seçimleri de
  // adrese yazılıyor (adres senkronu); tüm dizeye bağlansaydı her süzgeç
  // tıklamasında bileşen yeniden bağlanır, açık ağaç/kaydırma konumu
  // sıfırlanır ve state -> adres -> yeniden bağlanma döngüsü riski doğardı.
  const aramaAnahtari = `q:${baslangic.arama}`;

  return (
    <MarketplaceView
      key={aramaAnahtari}
      tamSayfa
      baslangicAramasi={baslangic.arama}
      baslangicSuzgeci={baslangic.suzgec}
      onSelectVehicle={(item) => router.push(`/details/${encodeURIComponent(item.pin_code)}`)}
      onNavigateToGarage={() => router.push('/garage')}
      onNavigateToVerify={() => router.push('/verify')}
      onNavigateToInsurance={() => router.push('/insurance-offer')}
      onNavigateToMaintenance={() => router.push('/maintenance-planner')}
    />
  );
}
