// =========================================================================
// POLİÇE VE UYARI MODALI (PolicyOfferModal.jsx)
//
// İşlev: Net son geçerlilik tarihini ve kalan gün uyarısını gösterir,
//        yenileme ve Google Takvim aksiyonlarını yönetir.
//
// -------------------------------------------------------------------------
// İKİ DÜZELTME
// -------------------------------------------------------------------------
// 1) ANA DÜĞME BİR YERE GİTMİYORDU. "En Uygun Teklifi Gör" yalnızca
//    "yakında bu ekranda listelenecek" bildirimi basıyordu. Artık gerçek
//    ekrana, hem de DOĞRU ARAÇ VE BELGEYLE gidiyor.
//
// 2) TUTULAMAYAN İKİ İDDİA KALDIRILDI:
//    · "En Uygun" — karşılaştırılacak bir teklif yok; üstünlük iddiası
//      dayanaksızdı.
//    · "Fiyatları karşılaştırmak için teklif robotumuzu kullanabilirsiniz"
//      — böyle bir robot yok. Ayrıca "fiyat" bu üründe yasaklı kelime:
//      ürünle ilgili fiyat görünen platform satış sitesi konumuna geçiyor.
//
// -------------------------------------------------------------------------
// ERİŞİLEBİLİRLİK
// -------------------------------------------------------------------------
// Modal `role="dialog"`, `aria-modal` ve odak tuzağı TAŞIMIYORDU: klavye
// kullanıcısı Tab'la modalın arkasındaki sayfada geziniyordu. Kalıp
// `AracSeciciDialog` ile birebir aynı.
//
// ⚠ KANCALAR ERKEN ÇIKIŞTAN ÖNCE. Bu bileşen `isOpen` ile çağrılıyor ve
// kapalıyken `null` dönüyor; efekt aşağıya konsaydı kanca sırası her
// açılış/kapanışta değişir ve React hata verirdi. Onun yerine efekt her
// zaman kuruluyor, içinde `isOpen` denetleniyor.
// =========================================================================

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateGoogleCalendarUrl, parseVehicleDate } from '../../utils/dateHelper';
import { teklifYolu, MODAL_TURU } from '../../services/teklifService';
import Icon from '../common/icons';
import TrPlaka from '../common/TrPlaka';

export default function PolicyOfferModal({ isOpen, onClose, vehicle, policyType, statusInfo }) {
  const router = useRouter();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const oncekiOdak = document.activeElement;

    const tusaBasildi = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const odaklanabilir = panelRef.current.querySelectorAll(
          'button:not([disabled]), input, a[href]'
        );
        if (odaklanabilir.length === 0) return;
        const ilk = odaklanabilir[0];
        const son = odaklanabilir[odaklanabilir.length - 1];
        if (e.shiftKey && document.activeElement === ilk) {
          e.preventDefault();
          son.focus();
        } else if (!e.shiftKey && document.activeElement === son) {
          e.preventDefault();
          ilk.focus();
        }
      }
    };

    document.addEventListener('keydown', tusaBasildi);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => panelRef.current?.querySelector('button')?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', tusaBasildi);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(t);
      if (oncekiOdak instanceof HTMLElement && oncekiOdak.isConnected) {
        oncekiOdak.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !vehicle) return null;

  // =========================================================================
  // 1. BLOK: POLİÇE TİPİ VE NET TARİH ÇÖZÜMLEME
  // =========================================================================
  const isInsurance = policyType === 'insurance';
  const isKasko = policyType === 'kasko';
  const isInspection = policyType === 'inspection';

  const titleText = isInsurance
    ? 'Trafik Sigortası Yenileme'
    : isKasko
    ? 'Kasko Poliçesi Yenileme'
    : 'TÜVTÜRK Muayene Zamanı';

  const rawDate = isInsurance
    ? vehicle.traffic_insurance_end_date
    : isKasko
    ? vehicle.kasko_end_date
    : vehicle.inspection_end_date;

  // Tarihi Türkçe biçime (GG.AA.YYYY) çeviriyor.
  const parsed = parseVehicleDate(rawDate);
  const formattedEndDate = parsed && !isNaN(parsed.getTime())
    ? parsed.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Belirtilmedi';

  const calendarUrl = generateGoogleCalendarUrl(
    `${vehicle.brand} ${vehicle.model} - ${titleText}`,
    `Oto.CV Hatırlatması: ${vehicle.plate_number} plakalı aracınızın ${titleText} süresi yaklaşıyor/doldu. (Son Geçerlilik: ${formattedEndDate})`,
    rawDate
  );

  // =========================================================================
  // 2. BLOK: MODAL ARAYÜZ RENDER KATMANI
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="police-modal-baslik"
        className="bg-white border border-slate-200 w-full max-w-md rounded-lg p-6 shadow-2xl relative space-y-5"
      >

        {/* KAPATMA BUTONU */}
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <Icon name="kapat" size="lg" strokeWidth={2.5} />
        </button>

        {/* BAŞLIK VE İKON ALANI */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${statusInfo.bgClass}`}>
            <Icon name={statusInfo.status === 'expired' ? 'uyari' : 'zil'} size="lg" />
          </div>
          <div>
            <span className="text-etiket font-bold text-slate-500 tracking-wider uppercase font-mono">DİJİTAL SİCİL RADARI</span>
            <h3 id="police-modal-baslik" className="text-base font-semibold text-slate-900 leading-snug">{titleText}</h3>
          </div>
        </div>

        {/* ARAÇ KÜNYE VE NET TARİH ÖZET KARTI */}
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg space-y-2.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-800">
            <span>{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
            <TrPlaka plaka={vehicle.plate_number} boyut="sm" />
          </div>

          <div className="w-full h-px bg-slate-200/60" />

          {/* TARİH VE DURUM MATRİSİ */}
          <div className="grid grid-cols-2 gap-2 text-yardimci font-semibold text-slate-600">
            <div>
              <span className="block text-etiket text-slate-500 font-bold uppercase">Son Geçerlilik Tarihi</span>
              <span className="text-slate-900 font-mono font-bold text-xs">{formattedEndDate}</span>
            </div>
            <div className="text-right">
              <span className="block text-etiket text-slate-500 font-bold uppercase">Durum / Kalan Süre</span>
              <span className={`inline-block px-2 py-0.5 rounded-md text-etiket font-bold ${statusInfo.bgClass}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>

        {/* BİLGİLENDİRME METNİ */}
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          {statusInfo.status === 'expired'
            ? `Aracınızın ${titleText.toLowerCase()} süresi ${formattedEndDate} tarihinde dolmuştur. Cezai işlem ve teminatsız kalma riskine karşı yenileme adımlarını görebilirsiniz.`
            : `Aracınızın ${titleText.toLowerCase()} süresi ${formattedEndDate} tarihinde dolacak. Yenileme adımlarını görebilir, hatırlatma kurabilirsiniz.`
          }
        </p>

        {/* AKSİYON BUTONLARI
            -------------------------------------------------------------------
            ⚠ ÜÇ BELGE TÜRÜ DE AYNI KAPIDAN GEÇİYOR.
            Muayene bir ara istisnaydı: doğrudan TÜVTÜRK'e gidiyordu. İki
            sonucu vardı — (a) muayene talebi hiçbir yere kaydedilmiyordu,
            yani muayene/bakım tarafında elimizde hiç veri oluşmuyordu;
            (b) aynı görünen üç çip farklı davranıyordu.

            Kaybolan bir şey yok: TÜVTÜRK randevu bağlantısı teklif ekranının
            "Bugün yapabilecekleriniz" bölümünde duruyor ve muayene için
            orada çıkıyor. Bedel bir tık. */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              // ⚠ ARAÇ VE BELGE BİRLİKTE GİDİYOR: teklif ekranı doğrudan
              // bu belgeye odaklanıyor. Yalnızca rota verilseydi kullanıcı
              // vardığı listede hangi satır için geldiğini yeniden arardı.
              router.push(teklifYolu(vehicle.plate_number, MODAL_TURU[policyType], 'police_modal'));
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-md font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <span>{isInspection ? 'Randevu ve hatırlatma seçenekleri' : 'Yenileme seçeneklerini gör'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>

          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-2.5 rounded-md font-bold text-xs transition-all flex items-center justify-center gap-2 block text-center"
          >
            <Icon name="takvim" size="sm" />
            <span>Google Takvimime Ekle</span>
          </a>
        </div>

      </div>
    </div>
  );
}
