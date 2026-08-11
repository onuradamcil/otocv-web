// =========================================================================
// DOSYA 1: OTO-CV KARNE ANA YÖNETİCİSİ (OtoKarneScreen.jsx)
// İşlev: Reklam kartı üretimi, resmi A4 PDF döküm sevk idaresi ve 
//        Frankfurt DB entegreli canlı PIN kodunu alt katmanlara dağıtma motoru.
// =========================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image'; 
import AdvertisingCard from './AdvertisingCard'; 
import OfficialReportView from './OfficialReportView';
import Icon from '../common/icons';
// MİMARİ BAĞLANTI: İki üst dizindeki merkezi Supabase kalkanı içeri davet edildi
import { supabase } from '../../lib/supabase';

export default function OtoKarneScreen({ vehicle, onBack, isPublicView = false }) {
  // =========================================================================
  // 1. BLOK: REAKTİF STATE VE VERİTABANI HAFIZA ODASI
  // =========================================================================
  const [activeTab, setActiveTab] = useState(0); 
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // YENİ NESİL ENTEGRASYON: Çökmeyi önleyen dinamik bakım veri havuzları
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  
  const cardRef = useRef(null);

  // Plaka kodunun güvenli tespiti
  const plateNumber = vehicle?.plate_number || vehicle?.plate || '';

  // =========================================================================
  // 2. BLOK: VERİTABANI BAĞLANTI MOTORU (FRANKFURT DB SİCİL FETCH)
  // =========================================================================
  useEffect(() => {
    if (plateNumber) {
      fetchVehicleMaintenanceHistory();
    }
  }, [plateNumber]);

  const fetchVehicleMaintenanceHistory = async () => {
    try {
      setLoadingRecords(true);
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('vehicle_plate', plateNumber)
        .order('km_at_service', { ascending: false });

      if (error) throw error;
      setMaintenanceRecords(data || []);
    } catch (err) {
      console.error('Karne katmanında bakım geçmişi derlenirken hata:', err.message);
    } finally {
      setLoadingRecords(false);
    }
  };

  // =========================================================================
  // 3. BLOK: CANLI BULUT VERİ HARİTALAMA VE FORMAT SÜRÜCÜLERİ
  // =========================================================================
  const resolveField = (key) => {
    if (!vehicle) return null;
    const fieldMapping = {
      trust_score: vehicle.trust_score ?? vehicle.trustScore ?? 60,
      plate_number: vehicle.plate_number ?? vehicle.plateValue ?? '34 ABC 123',
      
      // 🚀 SİBER ENTEGRASYON: Statik uydurma placeholder imha edildi! Doğrudan canlı bulut PIN_CODE alanı bağlandı.
      pin_code: vehicle.pin_code || vehicle.pinCode || 'CV-PENDING',
      
      vin: vehicle.vin ?? 'WBA0M3T2MGM******',
      tramer_status: vehicle.tramer_status ?? vehicle.tramerStatus ?? 'Hasarsız',
      brand: vehicle.brand ?? 'Belirsiz',
      model: vehicle.model ?? 'Belirsiz',
      year: vehicle.year ?? 2026
    };
    return fieldMapping[key] ?? vehicle[key] ?? null;
  };

  const pinCode = resolveField('pin_code');
  const kmValue = vehicle?.km ?? 0;
  const formattedKm = kmValue.toLocaleString('tr-TR');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // =========================================================================
  // 4. BLOK: PNG DERLEME VE RESMİ SİCİL PDF ÇIKTI MOTORU
  // =========================================================================
  const handleOutputEngine = async () => {
    if (activeTab === 0) {
      if (!cardRef.current) return;
      try {
        showToast('İlan kartı yüksek çözünürlükte derleniyor...', 'info');
        const dataUrl = await toPng(cardRef.current, {
          quality: 1.0,
          pixelRatio: 2, 
          skipFonts: true
        });
        const downloadLink = document.createElement('a');
        downloadLink.download = `OtoCV_Ilan_Karti_${pinCode}.png`;
        downloadLink.href = dataUrl;
        downloadLink.click();
        showToast('İlan Reklam Kartı (PNG) galeriye indirildi.', 'success');
      } catch (error) {
        showToast('Görsel dosyası oluşturulurken bir hata oluştu.', 'error');
      }
    } else {
      document.title = `OtoCV_Resmi_Rapor_${pinCode}`;
      window.print();
      showToast('Yazdırma ve PDF döküm sistemi tetiklendi.', 'success');
    }
  };

  // Alıcının göreceği doğrulama adresi. Karne görselindeki PIN ile aynı kodu taşır.
  // Plaka yerine PIN kullanılır: plaka kişisel veridir, URL'de taşınmaz.
  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/details/${encodeURIComponent(pinCode)}`
    : `/details/${pinCode}`;

  const copyVerificationLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setShowShareModal(false);
    showToast('Sorgulama bağlantısı panoya kopyalandı.', 'success');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased pb-12 relative print:bg-white print:pb-0">
      
      {/* TOAST PANELİ */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-slideIn print:hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg max-w-sm">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0" />
            <span className="text-xs font-medium text-slate-700 leading-normal">{toast.message}</span>
          </div>
        </div>
      )}

      {/* APP BAR */}
      {/* top-16: site header'ı (h-16 = 64px) sticky olduğu için onun altına hizalanır.
          z-40 site header'ın z-50'sinin altında kalır — doğru sıralama. */}
      <header className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-4 md:px-8 py-4 flex justify-between items-center select-none print:hidden">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs">
          <Icon name="geri" size="sm" strokeWidth={2.5} />
          Geri Dön
        </button>
        
        <h2 className="font-bold text-xs md:text-sm text-[#0F172A] tracking-tight">
          Oto-Karne Veri Doğrulama <span className="text-indigo-600 font-mono font-bold">[{pinCode}]</span>
        </h2>

        <div className="flex items-center gap-2">
          <button onClick={handleOutputEngine} className="bg-[#4F46E5] hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-98">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {activeTab === 0 ? 'Kartı İndir (PNG)' : 'Resmi Belge Al (PDF)'}
          </button>
          <button onClick={() => setShowShareModal(true)} className="bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-98">
            Paylaş
          </button>
        </div>
      </header>

      {/* SEKMELER */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 space-y-8 print:m-0 print:p-0">
        <div className="flex justify-center select-none print:hidden">
          <div className="bg-gray-200/60 border border-gray-200 p-1 rounded-2xl flex w-full max-w-[440px]">
            <button onClick={() => setActiveTab(0)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              İlan Paylaşım Reklam Kartı
            </button>
            <button onClick={() => setActiveTab(1)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 1 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              Detaylı Resmi Sicil Belgesi
            </button>
          </div>
        </div>

        {/* DİNAMİK MİZANPAJA SEVK IDARESI */}
        {activeTab === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn print:block print:w-full">
            <div className="lg:col-span-5 flex flex-col items-center space-y-4 print:w-full print:max-w-none">
              <div ref={cardRef} className="w-full max-w-[360px] print:max-w-none print:w-full rounded-[28px] overflow-hidden bg-transparent">
                {/* 🚀 CANLI PASLAMA: Alt barda kullanılabilmesi adına tüm nesne enjekte edildi */}
                <AdvertisingCard vehicle={vehicle} />
              </div>
            </div>
            
            <div className="lg:col-span-7 space-y-6 print:hidden select-none">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="w-8 h-8 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Icon name="karne" size="md" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Pazaryeri Satış Operasyonlarınızı Hızlandırın</h3>
                  <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                    İlgili tescil paneli, ilan platformlarında ve dijital mecralarda potansiyel alıcı kitlesine şeffaf ve güvenilir kurumsal veri sunabilmeniz adına tescil edilmiştir.
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100/70 p-4 rounded-xl flex gap-2 text-xs font-semibold text-amber-900 leading-relaxed">
                  <div className="w-1.5 h-1.5 bg-amber-600 rounded-full shrink-0 mt-1.5" />
                  <p>Doğrulanmış profile sahip satıcılar, bu dijital belgeyi ilan fotoğraflarının arasına konumlandırarak alıcı kitlesinin güvenini üst seviyeye çıkarırlar.</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
                <span className="text-indigo-600 font-extrabold text-[10px] tracking-widest block uppercase">DÖKÜMANTASYON KULLANIM REHBERİ</span>
                <div className="space-y-4">
                  <GuideRow num="1" title="Görseli İndirin" desc="Üst paneldeki eylem butonunu kullanarak tescilli dikey reklam kartını doğrudan galerinize PNG formatında kaydedin." />
                  <GuideRow num="2" title="İlanınıza Ekleyin" desc="İlan portallarında kayıt oluştururken, indirdiğiniz bu dikey veri görselini araç fotoğraflarının arasına konumlandırın." />
                  <GuideRow num="3" title="Şeffaf Doğrulama Sağlayın" desc="Alıcı adayları kart üzerindeki PIN kodu vasıtasıyla araç geçmişine eksiksiz va ücretsiz erişim sağlasın." />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-6 animate-fadeIn">
            <div className="w-full max-w-[740px] bg-white border border-gray-200 rounded-xl p-4 text-center text-xs font-medium text-slate-500 shadow-sm print:hidden">
              Araç başı test sürüşlerinde ve noter devir süreçlerinde alıcı mülkiyet güvenini mühürlemek için bu kurumsal tescil pasaportunun <span className="font-semibold text-slate-800">PDF çıktısını alabilir</span> veya doğrudan yazdırabilirsiniz.
            </div>
            <div className="w-full max-w-[740px] print:max-w-none print:w-full">
              {loadingRecords ? (
                <div className="py-20 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                  <span className="text-[11px] font-bold text-slate-400 tracking-wide animate-pulse">Resmi Sicil Bilanço Verileri Derleniyor...</span>
                </div>
              ) : (
                /* 🚀 CANLI PASLAMA: Resmi döküm alanına taze veri bağları ulaştırıldı */
                <OfficialReportView vehicle={vehicle} maintenanceRecords={maintenanceRecords} isPublicView={isPublicView} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* PAYLAŞ MODALI */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/30 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-[#0F172A]">Doğrulama Bağlantısı</h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                aria-label="Pencereyi kapat"
                className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Icon name="kapat" size="md" />
              </button>
            </div>
            <div onClick={copyVerificationLink} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-gray-200 hover:bg-slate-100 cursor-pointer transition-all">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-[#0F172A] block">Linki Kopyala</span>
                <span className="text-[10px] text-indigo-600 font-mono truncate block mt-0.5">{verificationUrl}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html { background: white !important; color: #000000 !important; }
          #print-target-element { max-w: 100% !important; width: 100% !important; box-shadow: none !important; border: none !important; }
          #official-report-print-zone {
            max-w: 100% !important; width: 100% !important; box-shadow: none !important; border: none !important;
            background: #FAFAF7 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}

function GuideRow({ num, title, desc }) {
  return (
    <div className="flex gap-3.5 items-start">
      <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0 select-none">{num}</div>
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">{title}</h4>
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}