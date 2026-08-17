// =========================================================================
// BEKLEYEN DEVİRLERİM (devralan tarafı)
//
// -------------------------------------------------------------------------
// NİYE VAR — AKIŞIN SON HALKASIYDI
// -------------------------------------------------------------------------
// Devir üç adıma çıktı: istek -> araç sahibinin onayı -> ücret. İlk iki adım
// arayüzde vardı ama üçüncüsünün ekranı YOKTU: araç sahibi onayladıktan
// sonra devralan kişi bildirimi alıyor, ödeme yapacak yeri bulamıyordu.
// Akış son adımda tıkanıyordu.
//
// -------------------------------------------------------------------------
// İKİ DURUM, İKİ FARKLI CÜMLE
// -------------------------------------------------------------------------
//   · 'bekliyor'   -> araç sahibinin kararı bekleniyor. Kullanıcının
//                     yapabileceği bir şey YOK; düğme de yok, çünkü
//                     tıklanamayan bir düğme "bozuk" gibi görünüyor.
//   · 'onaylandi'  -> sıra kullanıcıda. Ücret, kalan süre ve ödeme düğmesi.
//
// -------------------------------------------------------------------------
// KALAN SÜRE NİYE SAYAÇ DEĞİL
// -------------------------------------------------------------------------
// Süre 2 gün; saniye sayan bir geri sayım hem gereksiz baskı kuruyor hem de
// her saniye yeniden render ediyor. "1 gün 4 saat kaldı" yeterli bilgi.
// Son 6 saatte renk ambere dönüyor: aciliyet rakamla değil biçimle
// anlatılıyor.
// =========================================================================

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../common/icons';
import { dugme } from '../common/dugme';
import { useToast } from '../../context/ToastContext';
import { devirBekleyenlerim, devirOdeyipTamamla } from '../../services/devirService';
import useCanliTazeleme from '../../hooks/useCanliTazeleme';
import { aracKapakGorseli } from '../../utils/aracGorseli';
import PaywallDialog from '../common/PaywallDialog';
import { URUNLER } from '../../data/paketler';
import AracGorseli from '../common/AracGorseli';

/** "1 gün 4 saat" gibi okunur kalan süre. Geçmişse null. */
function kalanSure(sonTarih) {
  if (!sonTarih) return null;
  const ms = new Date(sonTarih).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const saat = Math.floor(ms / 3_600_000);
  const gun = Math.floor(saat / 24);
  const kalanSaat = saat % 24;

  if (gun > 0) return { metin: `${gun} gün ${kalanSaat} saat`, saat };
  if (saat > 0) return { metin: `${saat} saat`, saat };
  return { metin: `1 saatten az`, saat: 0 };
}

export default function BekleyenDevirlerim({ kart, onDevralindi }) {
  const toast = useToast();
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | hazir | hata
  const [liste, setListe] = useState([]);
  const [odenen, setOdenen] = useState(null);       // işlemdeki istek_id
  const [paywallIstek, setPaywallIstek] = useState(null); // ödeme onayı bekleyen kayıt

  const yukle = useCallback(async (iskeletGoster = true) => {
    if (iskeletGoster) setDurum('yukleniyor');
    // ⚠ try/catch ŞART: reddedilen promise hata sınırına ulaşmıyor ve ekran
    // sonsuza kadar iskelette kalıyor.
    try {
      const r = await devirBekleyenlerim();
      if (!r.basarili) { setDurum('hata'); return; }
      setListe(Array.isArray(r.veri) ? r.veri : []);
      setDurum('hazir');
    } catch {
      setDurum('hata');
    }
  }, []);

  useEffect(() => { yukle(false); }, [yukle]);

  // CANLI: araç sahibi onayladığı anda bu ekran kendiliğinden güncelleniyor.
  // Eskiden yalnızca mount'ta veri çekiyordu; kullanıcı onayı görmek için
  // sayfayı yenilemek zorundaydı. `yukle(false)` iskelet göstermiyor —
  // liste ekranda dururken altından çekmek kötü.
  useCanliTazeleme(['devir', 'success', 'warning'], () => yukle(false));

  /**
   * ⚠ ÖDEME KAYDINI PAYWALL DEĞİL, RPC ÜRETİYOR.
   *
   * `PaywallDialog` normalde `satin_almalar` kaydını kendisi oluşturuyor
   * (gerekçesi orada yazılı). Devirde bu YANLIŞ olurdu: kaydı
   * `devir_odeyip_tamamla` sahiplik değişimiyle AYNI işlemde oluşturuyor,
   * tutarı sunucudaki `devir_ucreti()` sabitinden yazıyor ve devir
   * başarısız olursa `iade` ediyor. İkisi birden kayıt üretseydi kullanıcı
   * iki kez ücretlendirilmiş görünürdü.
   *
   * Bu yüzden diyalog `kaydiCagiranUretir` ile açılıyor: onayı topluyor,
   * kaydı bırakıyor.
   */
  async function ode(istekId) {
    setPaywallIstek(null);
    setOdenen(istekId);
    const r = await devirOdeyipTamamla(istekId);
    setOdenen(null);

    if (!r.basarili) {
      // Süresi dolmuşsa liste tazeleniyor: kullanıcı neden başarısız
      // olduğunu ekranda da görsün, yalnızca bildirimde değil.
      if (r.hata) toast.hata(r.hata);
      yukle(false);
      return;
    }

    toast.basari('Devir tamamlandı. Araç garajınızda.');
    onDevralindi?.(r.veri);
    yukle(false);
  }

  // Bekleyen bir şey yoksa bölüm HİÇ basılmıyor: boş bir kart, kullanıcıya
  // eksik bir şey varmış hissi veriyor.
  if (durum === 'yukleniyor' || (durum === 'hazir' && liste.length === 0)) return null;

  if (durum === 'hata') {
    return (
      <section className={kart}>
        <h2 className="baslik-bolum text-slate-900">Bekleyen devir işlemleriniz</h2>
        <p className="metin-yardimci text-slate-500">Liste yüklenemedi.</p>
        <button type="button" onClick={() => yukle(true)} className={dugme('ikincil')}>
          Tekrar dene
        </button>
      </section>
    );
  }

  return (
    <section className={kart}>
      <div className="space-y-1">
        <h2 className="baslik-bolum text-slate-900">Bekleyen devir işlemleriniz</h2>
        <p className="metin-yardimci text-slate-500 leading-relaxed">
          Devralmak için talep gönderdiğiniz araçlar.
        </p>
      </div>

      <ul className="space-y-3">
        {liste.map((d) => {
          const sure = kalanSure(d.odeme_son_tarih);
          const acil = sure && sure.saat < 6;
          const onaylandi = d.durum === 'onaylandi';

          return (
            <li key={d.istek_id} className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* `relative` EKLENDİ: `AracGorseli` `fill` ile konumlanıyor. */}
                <span className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 grid place-items-center relative">
                  {/* ⚠ HAM ALAN BASILAMAZ: `image_url` virgülle birleştirilmiş
                      ÇOKLU adres tutabiliyor (canlıda 6 adres / 719 karakter
                      ölçüldü) ve doğrudan `src`e verilince kırık görsel
                      çıkıyor. Kapak için ilk geçerli adres alınıyor. */}
                  <AracGorseli
                    src={aracKapakGorseli(d.image_url)}
                    alt=""
                    sizes="48px"
                    bosMetin=""
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="metin-govde font-semibold text-slate-900 truncate">
                    {d.year} {d.brand} {d.model}
                  </p>
                  {/* PLAKA DEĞİL PIN: araç kimliği hep PIN ile gösteriliyor. */}
                  <p className="metin-yardimci font-mono text-indigo-600">{d.pin_code}</p>
                </div>
              </div>

              {onaylandi ? (
                <>
                  <div className={`rounded-xl p-3 space-y-1.5 border ${
                    acil ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Icon name="onay" size="sm" className={acil ? 'text-amber-600' : 'text-emerald-600'} />
                      <p className={`metin-govde font-semibold ${acil ? 'text-amber-900' : 'text-emerald-900'}`}>
                        Araç üzerinize geçmeye hazır
                      </p>
                    </div>
                    <p className={`metin-yardimci leading-relaxed ${acil ? 'text-amber-900/80' : 'text-emerald-900/80'}`}>
                      Araç sahibi devri onayladı. Devir ücretini ödediğinizde araç, bakım
                      geçmişi ve belgelerle birlikte garajınıza geçer.
                    </p>
                    {/* Süre dolduğunda İSTEK DE KOD DA düşüyor; kullanıcı
                        bunu ödeme yapmadan önce bilmeli. */}
                    <p className={`metin-yardimci font-bold ${acil ? 'text-amber-900' : 'text-emerald-900'}`}>
                      {sure
                        ? `Ödeme için ${sure.metin} kaldı. Süre dolarsa işlem sıfırlanır ve yeni kod gerekir.`
                        : 'Ödeme süresi doldu. Araç sahibinden yeni bir devir kodu isteyin.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="etiket text-slate-500">Devir ücreti</p>
                      <p className="sayi-vurgu text-slate-900">
                        ₺{Number(d.ucret || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaywallIstek(d)}
                      disabled={!sure || odenen === d.istek_id}
                      className={dugme('birincil')}
                    >
                      {odenen === d.istek_id ? 'İşleniyor…' : 'Ücreti öde ve devral'}
                    </button>
                  </div>
                </>
              ) : (
                /* 'bekliyor': kullanıcının yapabileceği bir şey yok.
                   Tıklanamayan bir düğme koymak "bozuk" izlenimi verirdi. */
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2">
                  <Icon name="bilgi" size="sm" className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="metin-yardimci text-slate-600 leading-relaxed">
                    Araç sahibinin onayı bekleniyor. Onaylandığında bildirim alacak ve
                    ücreti ödeyerek işlemi tamamlayabileceksiniz.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ÖDEME ONAYI — vitrine çıkarmadaki akışın aynısı.
          Kullanıcı ne için ödediğini, hangi araç olduğunu ve tutarı tek
          ekranda görüyor; demo modda gerçek tahsilat yok. */}
      {paywallIstek && (
        <PaywallDialog
          urunKodu={URUNLER.devir.kod}
          baslik="Devir ücreti"
          kaydiCagiranUretir
          detay={
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 grid place-items-center relative">
                <AracGorseli
                  src={aracKapakGorseli(paywallIstek.image_url)}
                  alt=""
                  sizes="40px"
                  bosMetin=""
                />
              </span>
              <span className="min-w-0">
                <span className="block metin-govde font-bold text-slate-900 truncate">
                  {paywallIstek.year} {paywallIstek.brand} {paywallIstek.model}
                </span>
                <span className="block metin-yardimci font-mono text-indigo-600">
                  {paywallIstek.pin_code}
                </span>
              </span>
            </div>
          }
          onKapat={() => setPaywallIstek(null)}
          onSatinAl={() => ode(paywallIstek.istek_id)}
        />
      )}
    </section>
  );
}
