// =========================================================================
// HESABIM (HesabimEkrani.jsx)
//
// Altı bölüm, her biri kendi kaydet düğmesiyle. Tek bir dev "Kaydet"
// yerine bölüm bölüm kaydetmenin sebebi: e-posta ve şifre değişiklikleri
// ad-soyad düzenlemesinden farklı sonuçlar doğuruyor (doğrulama e-postası,
// oturum yenilenmesi). Hepsini tek düğmeye bağlamak, kullanıcının ne
// onayladığını bulanıklaştırırdı.
//
// -------------------------------------------------------------------------
// EKRANIN SÖYLEMEDİĞİ ŞEYLER (bilerek)
// -------------------------------------------------------------------------
// Burada "bildirim tercihleri" diye üç ayar YOK. Ölçüldü: bugün
// `notifications` tablosuna yazan tek kaynak devir ve sahipsiz araç
// akışları. Poliçe uyarıları veritabanına hiç yazılmıyor, garajda istemci
// tarafında hesaplanıyor. "Poliçe hatırlatmalarını kapat" düğmesi koymak,
// hiçbir şeyi değiştirmeyen bir düğme koymak olurdu.
//
// Devir bildirimleri de kapatılabilir değil ve bu bilinçli: aracınız için
// devir talebi geldiğini haber veren bildirimi susturmak güvenlik açığıdır.
// Ekran bunu saklamıyor, sebebiyle birlikte yazıyor.
// =========================================================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/icons';
import GlobalStepLoader from '../common/GlobalStepLoader';
import HesapKapatmaDialog from './HesapKapatmaDialog';
import {
  profilGetir, profilGuncelle, pazarlamaIzniYaz,
  avatarUrl, avatarYukle, avatarKaldir,
  epostaDegistir, sifreDegistir,
  bekleyenKapatmaTalebi, kapatmaTalepEt, kapatmaTalebiIptal, aracOzeti,
} from '../../services/hesapService';

const GIRDI = 'w-full h-11 px-3.5 rounded-md border border-slate-200 bg-slate-50 text-mini font-bold text-slate-800 placeholder:text-slate-500 placeholder:font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-colors disabled:opacity-60';
const ETIKET = 'text-etiket font-semibold text-slate-500 uppercase tracking-wider';
const BIRINCIL = 'min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 text-white font-semibold text-mini rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed';

export default function HesabimEkrani() {
  const toast = useToast();

  const [kullanici, setKullanici] = useState(null);
  const [profil, setProfil] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Profil görseli. `avatarAdres` imzalı URL — kova özel olduğu için
  // doğrudan bir genel adres yok.
  const [avatarAdres, setAvatarAdres] = useState(null);
  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false);
  const dosyaRef = useRef(null);

  // Profil formu
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [telefon, setTelefon] = useState('');
  const [profilKaydediliyor, setProfilKaydediliyor] = useState(false);

  // E-posta
  const [yeniEposta, setYeniEposta] = useState('');
  const [epostaGonderiliyor, setEpostaGonderiliyor] = useState(false);
  const [epostaBekliyor, setEpostaBekliyor] = useState(false);

  // Şifre
  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [sifreKaydediliyor, setSifreKaydediliyor] = useState(false);

  // Pazarlama izni
  const [izinYaziliyor, setIzinYaziliyor] = useState(false);

  // Hesap kapatma
  const [araclar, setAraclar] = useState([]);
  const [talep, setTalep] = useState(null);
  const [kapatmaAcik, setKapatmaAcik] = useState(false);
  const [talepGonderiliyor, setTalepGonderiliyor] = useState(false);

  useEffect(() => {
    let iptal = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (iptal || !user) { setYukleniyor(false); return; }

      const [{ veri }, { talep: mevcutTalep }, { araclar: liste }] = await Promise.all([
        profilGetir(user.id),
        bekleyenKapatmaTalebi(user.id),
        aracOzeti(user.id),
      ]);

      if (iptal) return;

      setKullanici(user);
      setProfil(veri);
      setAd(veri?.first_name || '');
      setSoyad(veri?.last_name || '');
      setTelefon(veri?.phone_number || '');
      setTalep(mevcutTalep);
      setAraclar(liste);
      if (veri?.avatar_yolu) setAvatarAdres(await avatarUrl(veri.avatar_yolu));
      setYukleniyor(false);
    })();

    return () => { iptal = true; };
  }, []);

  // -----------------------------------------------------------------------
  const profilKaydet = async (e) => {
    e.preventDefault();
    if (!ad.trim() || !soyad.trim()) {
      toast.hata('Ad ve soyad boş bırakılamaz.');
      return;
    }

    setProfilKaydediliyor(true);
    const { basarili, hata } = await profilGuncelle(kullanici.id, { ad, soyad, telefon });
    setProfilKaydediliyor(false);

    if (!basarili) { toast.hata(hata); return; }
    setProfil((p) => ({ ...p, first_name: ad.trim(), last_name: soyad.trim(), phone_number: telefon.trim() || null }));
    toast.basari('Profiliniz güncellendi.');
  };

  const epostaKaydet = async (e) => {
    e.preventDefault();
    const adres = yeniEposta.trim();
    if (!adres) return;
    if (adres.toLowerCase() === (kullanici?.email || '').toLowerCase()) {
      toast.hata('Yeni adres mevcut adresinizle aynı.');
      return;
    }

    setEpostaGonderiliyor(true);
    const { basarili, hata } = await epostaDegistir(adres);
    setEpostaGonderiliyor(false);

    if (!basarili) { toast.hata(hata); return; }
    setEpostaBekliyor(true);
    setYeniEposta('');
    toast.basari('Doğrulama bağlantısı yeni adresinize gönderildi.');
  };

  const sifreKaydet = async (e) => {
    e.preventDefault();
    if (yeniSifre.length < 6) { toast.hata('Yeni şifre en az 6 karakter olmalı.'); return; }
    if (yeniSifre !== yeniSifreTekrar) { toast.hata('Yeni şifreler birbiriyle uyuşmuyor.'); return; }

    setSifreKaydediliyor(true);
    const { basarili, hata } = await sifreDegistir(kullanici.email, mevcutSifre, yeniSifre);
    setSifreKaydediliyor(false);

    if (!basarili) { toast.hata(hata); return; }
    setMevcutSifre(''); setYeniSifre(''); setYeniSifreTekrar('');
    toast.basari('Şifreniz değiştirildi.');
  };

  const gorselSec = async (e) => {
    const dosya = e.target.files?.[0];
    // Aynı dosyayı tekrar seçebilmek için girdi sıfırlanıyor: aksi hâlde
    // `change` olayı ikinci kez tetiklenmiyor.
    e.target.value = '';
    if (!dosya) return;

    setAvatarYukleniyor(true);
    const { yol, hata } = await avatarYukle(kullanici.id, dosya);
    if (hata) { setAvatarYukleniyor(false); toast.hata(hata); return; }

    setProfil((p) => ({ ...p, avatar_yolu: yol }));
    setAvatarAdres(await avatarUrl(yol));
    setAvatarYukleniyor(false);
    toast.basari('Profil görseliniz güncellendi.');
  };

  const gorselKaldir = async () => {
    setAvatarYukleniyor(true);
    const { basarili, hata } = await avatarKaldir(kullanici.id, profil?.avatar_yolu);
    setAvatarYukleniyor(false);
    if (!basarili) { toast.hata(hata); return; }

    setProfil((p) => ({ ...p, avatar_yolu: null }));
    setAvatarAdres(null);
    toast.basari('Profil görseliniz kaldırıldı.');
  };

  const izniDegistir = async (deger) => {
    setIzinYaziliyor(true);
    const { basarili, hata } = await pazarlamaIzniYaz(kullanici.id, deger);
    setIzinYaziliyor(false);

    if (!basarili) { toast.hata(hata); return; }
    setProfil((p) => ({ ...p, pazarlama_izni: deger }));
    toast.basari(deger ? 'Ticari ileti izni verildi.' : 'Ticari ileti izni geri çekildi.');
  };

  const talepGonder = async (notMetni) => {
    setTalepGonderiliyor(true);
    const { basarili, hata } = await kapatmaTalepEt(notMetni);
    setTalepGonderiliyor(false);

    if (!basarili) { toast.hata(hata); return; }
    setKapatmaAcik(false);
    const { talep: yeni } = await bekleyenKapatmaTalebi(kullanici.id);
    setTalep(yeni);
    toast.basari('Kapatma talebiniz alındı.');
  };

  const talebiIptalEt = async () => {
    setTalepGonderiliyor(true);
    const { basarili, hata } = await kapatmaTalebiIptal();
    setTalepGonderiliyor(false);

    if (!basarili) { toast.hata(hata); return; }
    setTalep(null);
    toast.basari('Kapatma talebiniz iptal edildi.');
  };

  // -----------------------------------------------------------------------
  if (yukleniyor) {
    return <GlobalStepLoader mode="iskelet" varyant="sade" gecikmeMs={200} />;
  }

  if (!kullanici) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-bolum font-semibold text-slate-900">Hesabım</h1>
          <p className="text-mini text-slate-500 font-semibold">Bu sayfa için oturum açmanız gerekiyor.</p>
          <Link href="/login" className={`inline-flex items-center justify-center ${BIRINCIL}`}>Giriş Yap</Link>
        </div>
      </div>
    );
  }

  const uyelikMetni = profil?.is_premium ? 'Premium Üyelik' : 'Standart Üyelik';

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-5">

        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Hesabım</h1>
          <p className="text-mini text-slate-500 font-semibold mt-1">
            Kimlik bilgileriniz, giriş güvenliğiniz ve veri haklarınız.
          </p>
        </div>

        {/* Bekleyen kapatma talebi varsa en üstte: ekranın geri kalanını
            düzenlemek anlamsız hâle gelmiyor ama kullanıcı durumu bilmeli. */}
        {talep && (
          <div role="status" className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-rose-600 mt-0.5 shrink-0"><Icon name="uyari" size="md" /></span>
              <div className="min-w-0">
                <p className="text-mini font-semibold text-rose-900">Hesap kapatma talebiniz alındı</p>
                <p className="text-yardimci text-rose-900/80 font-semibold mt-0.5 leading-relaxed">
                  Talep tarihi: {new Date(talep.olustu).toLocaleDateString('tr-TR')} · Talep anındaki araç
                  sayınız: {talep.arac_sayisi}. Kapatma uygulanana kadar hesabınızı kullanmaya devam
                  edebilir, talebinizi iptal edebilirsiniz.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={talebiIptalEt}
              disabled={talepGonderiliyor}
              className="shrink-0 min-h-[44px] px-4 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold text-mini rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              Talebi iptal et
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        <Bolum baslik="Profil" ozet="Görseliniz, ad, soyad ve telefon numaranız.">
          {/* PROFİL GÖRSELİ.
              Kova ÖZEL: görsel bir kişinin yüzü olabiliyor ve genel kovada
              dosya adını tahmin eden herkes ona ulaşırdı. Okuma imzalı URL
              ile yapılıyor. */}
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-indigo-50 border border-indigo-100 grid place-items-center shrink-0">
              {avatarAdres ? (
                /* eslint-disable-next-line @next/next/no-img-element --
                   next/image BURADA YANLIŞ: kova özel olduğu için adres kısa
                   ömürlü İMZALI URL ve her yüklemede değişiyor. next/image
                   bu adresleri önbelleğe alır; imza süresi dolunca bozuk
                   görsel gösterir. */
                <img src={avatarAdres} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-indigo-600 font-semibold text-govde font-display">
                  {(ad?.[0] || '').toLocaleUpperCase('tr-TR')}{(soyad?.[0] || '').toLocaleUpperCase('tr-TR')}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => dosyaRef.current?.click()}
                  disabled={avatarYukleniyor}
                  className="min-h-[36px] px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-mini rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {avatarYukleniyor ? 'Yükleniyor…' : avatarAdres ? 'Değiştir' : 'Görsel yükle'}
                </button>
                {avatarAdres && (
                  <button
                    type="button"
                    onClick={gorselKaldir}
                    disabled={avatarYukleniyor}
                    className="min-h-[36px] px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-mini rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Kaldır
                  </button>
                )}
              </div>
              {/* ⚠ İKİ BİLGİ BİRLİKTE VERİLİYOR — BİRİ EKSİKSE METİN YANILTIYOR.
                  Eskiden yalnızca "en fazla 2 MB" yazıyordu. Bu tek başına
                  yanlış yönlendiriyordu: telefon fotoğrafı neredeyse her zaman
                  2 MB'ın üstünde olduğu için kullanıcı hata alıyor ve elinde
                  küçültecek bir araç olmuyordu.

                  Ama sınırı büsbütün SİLMEK de yanlıştı: `12-hesabim` testi
                  bunu yakaladı ve gerekçesi haklı — "sınırı yalnızca
                  reddederek uygulamak, kullanıcıyı deneme yanılmaya zorlar."
                  Sınır hâlâ var; küçültülemeyen dosyalarda (bozuk dosya, eski
                  tarayıcı) devreye giriyor.

                  Bu yüzden ikisi bir arada: önce ne olacağı, sonra üst sınır. */}
              <p className="metin-yardimci text-slate-500">
                JPG, PNG veya WEBP · büyük görseller otomatik küçültülür (üst sınır 2 MB)
              </p>
            </div>

            <input
              ref={dosyaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={gorselSec}
              className="hidden"
              aria-label="Profil görseli seç"
            />
          </div>

          <form onSubmit={profilKaydet} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={ETIKET}>Ad</span>
                <input value={ad} onChange={(e) => setAd(e.target.value)} className={`mt-1.5 ${GIRDI}`} aria-label="Ad" autoComplete="given-name" />
              </label>
              <label className="block">
                <span className={ETIKET}>Soyad</span>
                <input value={soyad} onChange={(e) => setSoyad(e.target.value)} className={`mt-1.5 ${GIRDI}`} aria-label="Soyad" autoComplete="family-name" />
              </label>
            </div>
            <label className="block">
              <span className={ETIKET}>Telefon</span>
              <input
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                type="tel"
                inputMode="tel"
                placeholder="05XX XXX XX XX"
                className={`mt-1.5 ${GIRDI}`}
                aria-label="Telefon"
              />
            </label>
            <div className="flex justify-end">
              <button type="submit" disabled={profilKaydediliyor} className={BIRINCIL}>
                {profilKaydediliyor ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
              </button>
            </div>
          </form>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum baslik="E-posta adresi" ozet="Giriş yaparken kullandığınız adres.">
          <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-3 mb-3">
            <p className="text-etiket font-semibold text-slate-500 uppercase tracking-wider">Mevcut adres</p>
            <p className="text-mini font-bold text-slate-800 mt-0.5 break-all">{kullanici.email}</p>
          </div>

          {epostaBekliyor && (
            <div role="status" className="bg-indigo-50 border border-indigo-200 rounded-md p-3 mb-3">
              <p className="text-yardimci text-indigo-900 font-semibold leading-relaxed">
                Doğrulama bağlantısı gönderildi. <strong>Adresiniz siz bağlantıya tıklayana kadar
                değişmiyor</strong>; o ana dek mevcut adresinizle giriş yapmaya devam edin.
              </p>
            </div>
          )}

          <form onSubmit={epostaKaydet} className="space-y-3">
            <label className="block">
              <span className={ETIKET}>Yeni e-posta adresi</span>
              <input
                value={yeniEposta}
                onChange={(e) => setYeniEposta(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="ornek@eposta.com"
                className={`mt-1.5 ${GIRDI}`}
                aria-label="Yeni e-posta adresi"
              />
            </label>
            <div className="flex justify-end">
              <button type="submit" disabled={epostaGonderiliyor || !yeniEposta.trim()} className={BIRINCIL}>
                {epostaGonderiliyor ? 'Gönderiliyor…' : 'Doğrulama gönder'}
              </button>
            </div>
          </form>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum baslik="Şifre" ozet="Mevcut şifrenizi doğrulamadan değiştirilemez.">
          <form onSubmit={sifreKaydet} className="space-y-3">
            <label className="block">
              <span className={ETIKET}>Mevcut şifre</span>
              <input
                value={mevcutSifre}
                onChange={(e) => setMevcutSifre(e.target.value)}
                type={sifreGorunur ? 'text' : 'password'}
                autoComplete="current-password"
                className={`mt-1.5 ${GIRDI}`}
                aria-label="Mevcut şifre"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={ETIKET}>Yeni şifre</span>
                <input
                  value={yeniSifre}
                  onChange={(e) => setYeniSifre(e.target.value)}
                  type={sifreGorunur ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`mt-1.5 ${GIRDI}`}
                  aria-label="Yeni şifre"
                />
              </label>
              <label className="block">
                <span className={ETIKET}>Yeni şifre (tekrar)</span>
                <input
                  value={yeniSifreTekrar}
                  onChange={(e) => setYeniSifreTekrar(e.target.value)}
                  type={sifreGorunur ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`mt-1.5 ${GIRDI}`}
                  aria-label="Yeni şifre tekrar"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSifreGorunur((g) => !g)}
                aria-pressed={sifreGorunur}
                className="inline-flex items-center gap-1.5 min-h-[36px] text-yardimci font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <Icon name={sifreGorunur ? 'gozKapali' : 'goz'} size="sm" />
                {sifreGorunur ? 'Şifreleri gizle' : 'Şifreleri göster'}
              </button>

              <button
                type="submit"
                disabled={sifreKaydediliyor || !mevcutSifre || !yeniSifre}
                className={BIRINCIL}
              >
                {sifreKaydediliyor ? 'Değiştiriliyor…' : 'Şifreyi değiştir'}
              </button>
            </div>
          </form>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum baslik="Üyelik" ozet="Mevcut üyelik durumunuz ve ücretler.">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`w-9 h-9 rounded-md grid place-items-center shrink-0 ${
                profil?.is_premium ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500'
              }`}>
                <Icon name="yildiz" size="md" />
              </span>
              <div>
                <p className="text-mini font-semibold text-slate-900">{uyelikMetni}</p>
                <p className="text-yardimci text-slate-500 font-semibold">
                  Bireysel tarafta abonelik yok; ödemeler işlem başına alınıyor.
                </p>
              </div>
            </div>
            <Link
              href="/packages"
              className="inline-flex items-center justify-center min-h-[44px] px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-mini rounded-md transition-colors shrink-0"
            >
              Ücretleri görüntüle
            </Link>
          </div>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum baslik="İletişim tercihleri" ozet="Hangi iletileri almak istediğiniz.">
          <div className="space-y-3">
            {/* KAPATILAMAYAN tercih. Gri bir anahtar gösterip tıklatmamak
                yerine hiç anahtar konmuyor ve sebebi yazılıyor: çalışmayan
                bir kontrol, olmayan bir kontrolden daha kafa karıştırıcı. */}
            <div className="flex items-start gap-3 p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <span className="text-slate-400 mt-0.5 shrink-0"><Icon name="kalkan" size="sm" /></span>
              <div className="min-w-0">
                <p className="text-mini font-semibold text-slate-800">Devir ve sicil bildirimleri</p>
                <p className="text-yardimci text-slate-500 font-semibold mt-0.5 leading-relaxed">
                  Kapatılamaz. Aracınız için devir talebi geldiğini ya da sicilinizde bir değişiklik
                  olduğunu bildiren iletiler işlem bildirimidir; susturulması güvenliğinizi
                  zayıflatır.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-md border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={!!profil?.pazarlama_izni}
                onChange={(e) => izniDegistir(e.target.checked)}
                disabled={izinYaziliyor}
                className="mt-0.5 w-4 h-4 shrink-0 accent-indigo-600 cursor-pointer"
                aria-label="Ticari elektronik ileti izni"
              />
              <span className="min-w-0">
                <span className="block text-mini font-semibold text-slate-800">Kampanya ve duyuru iletileri</span>
                <span className="block text-yardimci text-slate-500 font-semibold mt-0.5 leading-relaxed">
                  Açık rızanız olmadan ticari ileti göndermiyoruz. İzni istediğiniz an geri
                  çekebilirsiniz.
                  {profil?.pazarlama_izni_at && (
                    <> Son değişiklik: {new Date(profil.pazarlama_izni_at).toLocaleDateString('tr-TR')}.</>
                  )}
                </span>
              </span>
            </label>
          </div>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum baslik="Verilerim" ozet="KVKK kapsamındaki haklarınız.">
          <div className="space-y-3">
            <p className="text-yardimci text-slate-600 font-semibold leading-relaxed">
              Kişisel verilerinizin nasıl işlendiğini{' '}
              <Link href="/kvkk" className="text-indigo-600 hover:underline font-bold">KVKK Aydınlatma Metni</Link>{' '}
              ve <Link href="/gizlilik" className="text-indigo-600 hover:underline font-bold">Gizlilik Politikası</Link>{' '}
              sayfalarında bulabilirsiniz.
            </p>

            <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-mini font-semibold text-slate-800">Hesabımı kapatmak istiyorum</p>
                <p className="text-yardimci text-slate-500 font-semibold mt-0.5 leading-relaxed">
                  Talebiniz kaydedilir ve elle uygulanır. Araç kayıtları ve bakım geçmişi silinmez —
                  araç sahipsiz havuza geçer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKapatmaAcik(true)}
                disabled={!!talep}
                className="shrink-0 min-h-[44px] px-4 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed text-rose-700 font-semibold text-mini rounded-md transition-colors cursor-pointer"
              >
                {talep ? 'Talebiniz bekliyor' : 'Kapatma talebi oluştur'}
              </button>
            </div>
          </div>
        </Bolum>
      </div>

      {kapatmaAcik && (
        <HesapKapatmaDialog
          araclar={araclar}
          gonderiliyor={talepGonderiliyor}
          onKapat={() => setKapatmaAcik(false)}
          onTalepEt={talepGonder}
        />
      )}
    </div>
  );
}

function Bolum({ baslik, ozet, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
      <div className="mb-4">
        <h2 className="text-govde font-semibold text-slate-900 tracking-tight">{baslik}</h2>
        <p className="text-yardimci text-slate-500 font-semibold mt-0.5">{ozet}</p>
      </div>
      {children}
    </section>
  );
}
