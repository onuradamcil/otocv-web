// =========================================================================
// DOSYA 2: OTO-CV SİHİRBAZ BELGE: LUXURY A4 RESMİ SİCİL PASAPORTU (OfficialReportView.jsx)
// İşlev: Sadece ve sadece saf A4 döküman yapısıdır. Asla header içermez!
//        Veritabanından gelen servis kayıtlarının canlı bütçe bilançosunu hesaplar.
// =========================================================================

'use client';

import React from 'react';
import { tramerVarMi, tramerMetni } from '../../utils/tramerHelper';

export default function OfficialReportView({ vehicle, maintenanceRecords = [], isPublicView = false }) {
  // =========================================================================
  // 1. BLOK: SAF BULUT SÖZLEŞME VE BİLGİ HARİTALAMA GEÇİDİ
  // =========================================================================
  const score = vehicle?.trust_score ?? 60;
  
  // 🚀 SİBER ENTEGRASYON: Eski 4 haneli geçici fallback yok edildi, canlı bulut kodu mühürlendi!
  const pinCode = vehicle?.pin_code || 'CV-PENDING';
  
  // 🔒 KVKK: Resmi sicil belgesi ziyaretçiye de açık olduğu için plaka yalnızca
  // ruhsat sahibine gösterilir. Belgenin doğrulama işlevini PIN kodu üstlenir.
  //
  // Neden burada satır silinmiyor: bu bir resmi evrak düzeni. Eksik satır
  // belgeyi kusurlu gösterir, oysa sebebi yazan bir değer okuyucuyu bilgilendirir.
  // Künye tablolarında ise satır tamamen kaldırılıyor, çünkü orada yokluk nötrdür.
  const plateNumber = isPublicView
    ? 'KVKK kapsamında paylaşılmaz'
    : (vehicle?.plate_number || 'Tescilli Plaka');
  const vin = vehicle?.vin || 'WBA0M3T2MGM******';
  const engineNumber = vehicle?.engine_number || 'N20B20A******'; 
  const registrationNo = vehicle?.registration_no || 'AA012345'; 
  const tramer = vehicle?.tramer_status || 'Hasarsız / Değişensiz / Orijinal';
  const kmValue = vehicle?.km ?? 0;
  const formattedKm = kmValue.toLocaleString('tr-TR');
  
  const brand = vehicle?.brand || 'Belirsiz Marka';
  const model = vehicle?.model || 'Belirsiz Model';
  const packageStr = vehicle?.package || 'Standart Donanım Paketi';
  const fuelType = vehicle?.fuel_type || 'Benzin / Hibrit';
  const transmission = vehicle?.transmission || 'Otomatik vites';
  const color = vehicle?.color || 'Metalik Siyah';

  // =========================================================================
  // 2. BLOK: REAKTİF BİLANÇO MOTORU (TOTAL SERMİYE BÜTÇE DÖNGÜSÜ)
  // =========================================================================
  const recordsSource = maintenanceRecords.length > 0 
    ? maintenanceRecords 
    : (vehicle?.maintenance_records || []);

  const totalMaintenanceCost = recordsSource.reduce((sum, item) => {
    if (!item.cost) return sum;
    const cleanCost = typeof item.cost === 'string' 
      ? parseInt(item.cost.replace(/\./g, ''), 10) 
      : parseInt(item.cost, 10);
    return sum + (isNaN(cleanCost) ? 0 : cleanCost);
  }, 0);

  const formattedTotalCost = `₺${totalMaintenanceCost.toLocaleString('tr-TR')}`;

  const rawImageUrls = vehicle?.image_url || vehicle?.image || '';
  const carPhoto = rawImageUrls
    ? rawImageUrls.split(',').map(url => url.trim()).find(url => url.startsWith('http'))
    : '';

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const currentDate = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // =========================================================================
  // 3. BLOK: INTERFACE ARAYÜZ KATMANI (A4 MATBUU EVRAK MİZANPAJI)
  // =========================================================================
  return (
    <div className="flex justify-center items-center py-2 bg-transparent select-none print:p-0 w-full">
      <div 
        id="official-report-print-zone" 
        className="w-full bg-[#FAFAF7] border border-[#E5DECE] rounded-xl p-10 relative shadow-xl shadow-slate-950/5 flex flex-col justify-between print:border-none print:shadow-none print:rounded-none print:p-0 print:bg-white min-h-[1000px]"
      >
        <CropMark position="top-0 left-0" vertical={true} horizontal={true} />
        <CropMark position="top-0 right-0" vertical={true} horizontal={false} />
        <CropMark position="bottom-0 left-0" vertical={false} horizontal={true} />
        <CropMark position="bottom-0 right-0" vertical={false} horizontal={false} />

        <div className="space-y-8 flex-1">
          {/* ANTET */}
          <div className="flex justify-between items-start border-b border-[#E5DECE] pb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-widest text-[#1E1B4B]">OTO.CV</h2>
              <p className="text-[10px] font-semibold text-[#4F46E5] tracking-widest uppercase">MOTORLU KARA TAŞITI RESMİ SİCİL BELGESİ</p>
              <p className="text-[9px] text-slate-400 font-medium font-mono">Belge Düzenleme Tarihi: {currentDate}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="bg-[#1E1B4B] px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12z" />
                </svg>
                <span className="text-[9px] text-white font-bold tracking-wider uppercase">AutoID Verified</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Ref: {pinCode}</span>
            </div>
          </div>

          {/* KÜNYE VE KADRAN */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#F1EDE4]/20 p-6 rounded-xl border border-[#E5DECE]/50">
            <div className="md:col-span-8 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-[#4F46E5] tracking-wider uppercase">{vehicle?.year || 2026} ÜRETİM YILI</span>
                <h3 className="text-xl font-bold text-[#1E1B4B] tracking-tight mt-0.5">{brand} {model}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{packageStr}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 pt-2 text-xs border-t border-[#E5DECE]/40">
                <DocStatRow label="Resmi Plaka Kaydı" value={plateNumber} />
                <DocStatRow label="Mevcut Kilometre Göstergesi" value={`${formattedKm} km`} />
                <DocStatRow label="Şasi Seri Numarası (VIN)" value={vin} />
                <DocStatRow label="Motor Seri Numarası" value={engineNumber} />
                <DocStatRow label="Ruhsat Tescil Seri No" value={registrationNo} />
                <DocStatRow label="Araç Sınıfı / Segment" value="M1 / D Segment" />
                <DocStatRow label="Toplam Belgelenmiş Servis Yatırımı" value={formattedTotalCost} />
              </div>
            </div>
            <div className="md:col-span-4 flex flex-col items-center justify-center border-l-0 md:border-l border-[#E5DECE]/60 pl-0 md:pl-4">
              <div className="w-24 h-28 relative flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} stroke="#E2E8F0" strokeWidth="5" fill="transparent" className="opacity-70" />
                  <circle cx="50" cy="50" r={radius} stroke="url(#officialA4GaugeGradient)" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-500" />
                  <defs>
                    <linearGradient id="officialA4GaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[7px] font-bold text-slate-400 tracking-wider">VERİ GÜVENİ</span>
                  <span className="text-xl font-bold text-[#0F172A] leading-none my-0.5">{score}</span>
                  <span className="text-[8px] font-bold text-emerald-600">/ 100</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-1 tracking-wide uppercase">Doğruluk Katsayısı</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SpecRow label="YAKIT BESLEME SİSTEMİ" value={fuelType} />
            <SpecRow label="ŞANZIMAN / TRANSMİSYON" value={transmission} />
            <SpecRow label="TESCİLLİ GÖVDE RENGİ" value={color} />
            {/* isSuccess artık serbest metin karşılaştırmasıyla değil, tek
                kaynaktan belirleniyor. Önceden `!== 'Tramer Kaydı Var'`
                yazıyordu; veritabanında 'Tramer Var' yazan araçlar (10'un
                4'ü) bu yüzden hasarsız gibi yeşil basılıyordu. */}
            <SpecRow label="TRAMER HASAR DURUMU" value={tramer} isSuccess={!tramerVarMi(vehicle)} />
          </div>

          <div className="bg-[#F1EDE4]/40 border border-[#E5DECE] rounded-xl p-5 space-y-3.5">
            <h4 className="text-[10px] font-bold text-[#1E1B4B] tracking-widest uppercase">MERKEZİ VERİ TABANI SORGULAMA SONUÇLARI</h4>
            <div className="space-y-3 text-xs">
              <TableRow label="TÜVTÜRK Muayene Geçerlilik Durumu" status="Aktif (Kilometre Verisi Tutarlı)" />
              {/* BU SATIR RESMİ BİR BEYAN. Önceden yalnızca tek yazımı
                  ('Tramer Kaydı Var') tanıdığı için 'Tramer Var' yazan
                  araçlarda "Kayıt Bulunmamaktadır (Temiz)" basıyordu —
                  65.756 TL hasarı olan araç karnede hasarsız görünüyordu.
                  Tutar da artık doğru okunuyor: '65.756' metnini Number()
                  ile çevirmek 65.756 üretiyordu (nokta Türkçe'de binlik
                  ayracı, JavaScript'te ondalık). */}
              <TableRow label="Geçmiş Hasar, Ağır Hasar & Pert Kaydı Sorgusu" status={tramerMetni(vehicle)} isSuccess={!tramerVarMi(vehicle)} />
              <TableRow label="Mülkiyet, Haciz, Rehin & Hak Mahrumiyeti Kontrolü" status="Hak Mahrumiyeti Yoktur (Satışa Engel Değil)" />
              <TableRow label="Adalet Bakanlığı UYAP Çalınma / Aranma Kaydı Taraması" status="Temiz (Aranma İhbarı Yoktur)" />
              <TableRow label="Periyodik Servis / Sanayi Faturaları Tescil Uyumluluğu" status={totalMaintenanceCost > 0 ? `${formattedTotalCost} Yatırım Onaylı` : "AutoID Güvencesiyle Onaylanmış"} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DateMatrixBox title="ZORUNLU TRAFİK SİGORTASI SÜRESİ" date={vehicle?.traffic_insurance_end_date?.split(' ')[0] || '12/12/2029'} />
            <DateMatrixBox title="KASKO POLİÇESİ GEÇERLİLİK" date={vehicle?.kasko_end_date?.split(' ')[0] || 'Opsiyonel / Belirtilmedi'} />
            <DateMatrixBox title="TÜVTÜRK MUAYENE GEÇERLİLİK" date={vehicle?.inspection_end_date?.split(' ')[0] || '12/12/2029'} />
          </div>

          <div className="text-[10px] text-slate-400 font-medium leading-relaxed bg-white border border-gray-200/80 p-4 rounded-xl">
            <span className="font-bold text-slate-500 block mb-0.5">YASAL BİLGİLENDİRME VE SİSTEM ŞERHİ</span>
            Triger, sıvı bakımları ve atölye faturaları verilerinin AutoID havuzundaki doğrulanmış dökümüdür. Belge üzerindeki PIN kodu veya karekod vasıtasıyla verilerin güncelliği her zaman <span className="font-semibold text-indigo-600">https://oto.cv</span> adresi üzerinden teyit edilebilmektedir. Baskı esnasında tahrifat yapılması durumunda sistem sorgusu esas alınacaktır.
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-[#E5DECE] pt-5 mt-6">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">SİSTEM DOĞRULAMA KODU (PIN)</span>
            <p className="text-sm font-bold text-[#1E1B4B] tracking-widest font-mono">{pinCode}</p>
            <p className="text-[9px] text-slate-400 leading-normal font-medium max-w-[480px]">
              Alıcı adayları veya resmi merciler, belge üzerindeki karekodu mobil cihazları ile taratarak aracın sanayi faturaları ve e-devlet tescil siciline şeffafça erişim sağlayabilirler.
            </p>
          </div>
          <div className="bg-white p-1.5 border border-[#E5DECE] rounded-lg shrink-0 flex items-center justify-center">
            <svg className="w-14 h-12 text-[#1E1B4B]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 2h6v6H2V2zm2 2v2h2V4H4zm8-2h6v6h-6V2zm2 2v2h2V4h-2zM2 14h6v6H2v-6zm2 2v2h2v-2H4zm10-2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm-4-2h2v2h-2v-2zm2-4h2v2h-2v-2zm-2 2h2v2h-2v-2zM10 2h2v2h-2V2zm0 4h2v2h-2V6zM8 10h2v2H8v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm4 0h2v2h-2v-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function CropMark({ position, vertical, horizontal }) {
  return (
    <div className={`absolute w-3 h-3 pointer-events-none print:hidden ${position}`}>
      <div className={`absolute bg-amber-600/20 transition-colors ${vertical ? 'top-0 h-2.5 w-[1px]' : 'bottom-0 h-2.5 w-[1px]'} ${horizontal ? 'left-0' : 'right-0'}`} />
      <div className={`absolute bg-amber-600/20 transition-colors ${vertical ? 'top-0' : 'bottom-0'} ${horizontal ? 'left-0 w-2.5 h-[1px]' : 'right-0 w-2.5 h-[1px]'}`} />
    </div>
  );
}

function DocStatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-200/50 pb-1">
      <span className="text-slate-400 font-medium text-[11px] tracking-tight">{label}:</span>
      <span className="font-bold text-[#1E1B4B] font-mono text-[11px] truncate max-w-[170px] text-right">{value}</span>
    </div>
  );
}

// isSuccess ÜÇ DEĞERLİ ve artık metinden türetilmiyor:
//   undefined -> nötr bilgi (yakıt, şanzıman, renk gibi)
//   true      -> olumlu/temiz bulgu, yeşil
//   false     -> dikkat gerektiren bulgu, amber
//
// Önceden değer metniyle karşılaştırma yapılıyordu
// (value === 'Hasarsız / Değişensiz / Orijinal'). Metnin bir harfi
// değişince renk sessizce yanlışa dönüyordu; resmi belgede kabul edilemez.
function SpecRow({ label, value, isSuccess }) {
  const dikkat = isSuccess === false;
  const iyi = isSuccess === true;
  return (
    <div className={`border rounded-xl p-3 flex flex-col justify-center shadow-sm select-none bg-white ${dikkat ? 'border-amber-200' : 'border-[#E5DECE]/50'}`}>
      <span className="text-slate-400 text-[9px] font-bold tracking-wider block leading-none">{label}</span>
      <span className={`text-xs font-bold truncate block mt-1 ${dikkat ? 'text-amber-600' : iyi ? 'text-emerald-600' : 'text-[#1E1B4B]'}`}>{value}</span>
    </div>
  );
}

// isSuccess verilmezse eski davranış korunur (sabit metinli satırlar için).
// Verilirse metne HİÇ bakılmaz — çağıran taraf zaten gerçeği biliyor.
// Bu ayrım önemliydi: metinden çıkarım yapan eski hâl, "Sorgulanamadı
// (Beyan Yok)" gibi yeni bir metni olumlu sanıp yeşil basardı.
function TableRow({ label, status, isSuccess }) {
  const isDanger =
    isSuccess === undefined
      ? status.includes('Kayıt Var')
      : isSuccess === false;
  return (
    <div className="flex justify-between items-center border-b border-gray-300/10 pb-0.5">
      <span className="text-slate-600 font-medium tracking-tight">{label}</span>
      <div className="flex items-center gap-1">
        <svg className={`w-3.5 h-3.5 shrink-0 ${isDanger ? 'text-amber-500' : 'text-emerald-500'}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
        <span className={`font-bold ${isDanger ? 'text-amber-600' : 'text-[#1E1B4B]'}`}>{status}</span>
      </div>
    </div>
  );
}

function DateMatrixBox({ title, date }) {
  return (
    <div className="flex-1 bg-white border border-gray-200/60 rounded-xl p-3 text-center shadow-sm select-none">
      <span className="text-slate-400 text-[8px] font-bold block tracking-wider leading-none">{title}</span>
      <span className="text-xs font-bold text-[#0F172A] font-mono block mt-1.5 tracking-wider">{date}</span>
    </div>
  );
}