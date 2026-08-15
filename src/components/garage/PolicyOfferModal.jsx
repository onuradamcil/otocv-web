// =========================================================================
// OTO-CV ARAYÜZ KATMANI: PREMIUM POLİÇE VE UYARI MODALI (PolicyOfferModal.jsx)
// İşlev: Kullanıcıya net son geçerlilik tarihini ve kalan gün uyarısını sunar,
//        teklif alma ve Google Takvime ekleme aksiyonlarını yönetir.
// =========================================================================

'use client';

import React from 'react';
import { generateGoogleCalendarUrl, parseVehicleDate } from '../../utils/dateHelper';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/icons';

export default function PolicyOfferModal({ isOpen, onClose, vehicle, policyType, statusInfo }) {
  const toast = useToast();
  if (!isOpen || !vehicle) return null;

  // =========================================================================
  // 1. BLOK: POLİÇE TİPİ VE NET TARİH ÇÖZÜMLEME DEDEKTERİ
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

  // Tarihi Türkçe formatına (DD.MM.YYYY) dönüştüren siber dönüştürücü
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
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-5">
        
        {/* KAPATMA BUTONU */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <Icon name="kapat" size="lg" strokeWidth={2.5} />
        </button>

        {/* BAŞLIK VE İKON ALANI */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${statusInfo.bgClass}`}>
            <Icon name={statusInfo.status === 'expired' ? 'uyari' : 'zil'} size="lg" />
          </div>
          <div>
            <span className="text-etiket font-bold text-slate-400 tracking-wider uppercase font-mono">DİJİTAL SİCİL RADARI</span>
            <h3 className="text-base font-semibold text-slate-900 leading-snug">{titleText}</h3>
          </div>
        </div>

        {/* 🚀 ARAÇ KÜNYE VE NET TARİH ÖZET KARTI */}
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-800">
            <span>{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
            <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {vehicle.plate_number}
            </span>
          </div>

          <div className="w-full h-px bg-slate-200/60" />

          {/* TARİH VE DURUM MATRİSİ */}
          <div className="grid grid-cols-2 gap-2 text-yardimci font-semibold text-slate-600">
            <div>
              <span className="block text-etiket text-slate-400 font-bold uppercase">Son Geçerlilik Tarihi</span>
              <span className="text-slate-900 font-mono font-bold text-xs">{formattedEndDate}</span>
            </div>
            <div className="text-right">
              <span className="block text-etiket text-slate-400 font-bold uppercase">Durum / Kalan Süre</span>
              <span className={`inline-block px-2 py-0.5 rounded-md text-etiket font-bold ${statusInfo.bgClass}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>

        {/* BİLGİLENDİRME METNİ */}
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          {statusInfo.status === 'expired' 
            ? `Aracınızın ${titleText.toLowerCase()} süresi ${formattedEndDate} tarihinde dolmuştur. Cezai işlem veya teminatsız durum yaşamamak için hemen teklif alabilirsiniz.`
            : `Aracınızın ${titleText.toLowerCase()} süresi ${formattedEndDate} tarihinde dolacaktır. Fiyatları karşılaştırmak için teklif robotumuzu kullanabilirsiniz.`
          }
        </p>

        {/* AKSİYON BUTONLARI */}
        <div className="space-y-2 pt-2">
          {!isInspection ? (
            <button
              onClick={() => {
                onClose();
                toast.bilgi(`${vehicle.plate_number} için sigorta teklifleri yakında bu ekranda listelenecek.`);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span>En Uygun Teklifi Gör</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          ) : (
            <a
              href="https://www.tuvturk.com.tr"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs transition-all active:scale-98 flex items-center justify-center gap-2 block text-center"
            >
              <span>TÜVTÜRK Randevusu Al</span>
            </a>
          )}

          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 block text-center"
          >
            <Icon name="takvim" size="sm" />
            <span>Google Takvimime Ekle</span>
          </a>
        </div>

      </div>
    </div>
  );
}