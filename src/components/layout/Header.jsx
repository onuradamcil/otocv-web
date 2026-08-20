// =========================================================================
// OTO-CV HEADER (Header.jsx)
// İşlev: Logo, ana menü, "Araç Kaydet" düğmesi, bildirim zili, hesap menüsü
//        ve md altında hamburger. Kendi oturum durumunu yönetir.
//
// Erişilebilirlik: gezinme öğeleri Link, aksiyonlar button — hepsi klavyeyle
//        kullanılabilir ve görünür odak halkası taşır. İkon butonları 44px
//        dokunma alanı ve aria-label ile geliyor.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NotificationDropdown from '@/context/NotificationDropdown';
import MobileDrawer from './MobileDrawer';
import HeaderArama from './HeaderArama';
import { useGenisEkran, KIRILIM_MD } from '@/hooks/useVitrinGorunum';
import Icon from '@/components/common/icons';
// Giriş/Hesap bağlantıları elle yazılmış metin bağlantılarıydı ve dokunma
// alanları 16 px ölçülmüştü. `dugme.js` 44 px'i taban olarak veriyor.
import { dugme } from '@/components/common/dugme';
import { avatarUrl, AVATAR_DEGISTI } from '@/services/hesapService';
import { okunmamisSayisi } from '@/services/mesajService';
import useCanliTazeleme from '@/hooks/useCanliTazeleme';

const ODAK = 'focus-visible:ring-offset-2';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [okunmamis, setOkunmamis] = useState(0);
  const [navbarName, setNavbarName] = useState('');
  // Açılır menü başlığı için: ham e-posta yerine ad, baş harfler ve üyelik.
  // Bu bilgi garaj ekranındaki profil kartından buraya taşındı.
  const [profil, setProfil] = useState(null);
  // Profil görseli imzalı URL ile geliyor: kova özel.
  const [avatarAdres, setAvatarAdres] = useState(null);
  // Görsel değişince profili yeniden okumak için sayaç.
  const [profilTetik, setProfilTetik] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const hesapMenuRef = useRef(null);

  // ⚠ ARAMA KUTUSU TEK ÖRNEK ÇİZİLİYOR — CSS İLE GİZLEMEK YETMEZ.
  // İlk denemede masaüstü örneği `hidden md:flex`, mobil örneği `md:hidden`
  // idi; ikisi de DOM'da duruyordu. Ölçüldü: `getByLabel(/PIN ile ara/i)`
  // İKİ öğeye çözülüyor ve Playwright strict mode ihlaliyle dört test
  // birden kırılıyor. Ayrıca mobilde `.first` gizli olan masaüstü örneğini
  // seçiyordu. Bu projede aynı hata vitrin liste/ızgara ikilisinde de
  // yaşanmıştı; çözümü de aynı: medya sorgusunu OKUYUP tek örnek çizmek.
  const genisEkran = useGenisEkran(KIRILIM_MD);

  // Oturum takibi
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Profil adı ve üyelik. `is_premium` de çekiliyor: açılır menü başlığı
  // artık ham e-posta değil, kimliği gösteren bir kart.
  useEffect(() => {
    if (!user) { setNavbarName(''); setProfil(null); setAvatarAdres(null); return; }
    supabase
      .from('profiles')
      .select('first_name, last_name, is_premium, avatar_yolu')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error && data.first_name && data.last_name) {
          setNavbarName(`${data.first_name.charAt(0).toUpperCase()}${data.first_name.slice(1)} ${data.last_name.charAt(0).toUpperCase()}.`);
          setProfil(data);
        } else {
          setNavbarName('Hesabım');
          setProfil(data || null);
        }
        // Görsel varsa baş harflerin yerine o gösteriliyor.
        if (data?.avatar_yolu) avatarUrl(data.avatar_yolu).then(setAvatarAdres);
        else setAvatarAdres(null);
      });
  }, [user, profilTetik]);

  // OKUNMAMIŞ MESAJ SAYISI.
  //
  // Menü her açıldığında tazeleniyor, aralıkla YOKLANMIYOR: yüz binlerce
  // kullanıcıda her başlığın düzenli sorgu atması, sicil sorgusundaki çift
  // çağrı sorununun çok daha büyüğü olurdu. Kullanıcı sayacı ancak menüyü
  // açtığında görüyor; tam o anda tazelemek yeterli ve en ucuzu.
  useEffect(() => {
    if (!user || !isDropdownOpen) return;
    let iptal = false;
    okunmamisSayisi()
      .then((n) => { if (!iptal) setOkunmamis(n); })
      .catch(() => { /* sayaç yan bilgi; hatası ekranda yer kaplamamalı */ });
    return () => { iptal = true; };
  }, [user, isDropdownOpen]);

  // Oturum kapanınca sayaç sıfırlanıyor: sonraki kullanıcı öncekinin
  // okunmamış sayısını görmemeli.
  useEffect(() => { if (!user) setOkunmamis(0); }, [user]);

  // CANLI ROZET. Menü açılmasını beklemeden güncelleniyor — ama yine
  // YOKLAMA YOK: tazeleme yalnızca gerçek bir bildirim düştüğünde oluyor.
  useCanliTazeleme(['mesaj', 'info'], () => {
    if (!user) return;
    okunmamisSayisi().then(setOkunmamis).catch(() => {});
  });

  // Hesabım ekranından görsel yüklendiğinde menü de tazeleniyor. Bu olay
  // olmadan kullanıcı sayfayı yenileyene kadar baş harflerini görmeye
  // devam ediyordu ve görselin yüklenmediğini sanıyordu.
  useEffect(() => {
    const tazele = () => setProfilTetik((n) => n + 1);
    window.addEventListener(AVATAR_DEGISTI, tazele);
    return () => window.removeEventListener(AVATAR_DEGISTI, tazele);
  }, []);

  // -------------------------------------------------------------------------
  // DIŞARI TIKLAYINCA VE ESC İLE KAPANMA
  //
  // Hesap menüsü yalnızca kendi düğmesine tekrar tıklayınca kapanıyordu:
  // sayfanın başka bir yerine tıklamak onu açık bırakıyor, kullanıcı menüyü
  // "kovalamak" zorunda kalıyordu. Esc de çalışmıyordu.
  //
  // `mousedown` kullanılıyor, `click` değil: menü içindeki bir bağlantıya
  // tıklandığında `click` sırasında öğe DOM'dan kalkmış olabiliyor ve
  // `contains` yanlış cevap veriyor. `PublishListingModal` da aynı olayı
  // kullanıyor.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isDropdownOpen) return;

    const disariTiklama = (e) => {
      if (hesapMenuRef.current && !hesapMenuRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    // `closeMenus` bu efektten SONRA tanımlanıyor; setter doğrudan
    // çağrılıyor ki bildirim sırasına bağımlılık doğmasın.
    const escBasildi = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };

    document.addEventListener('mousedown', disariTiklama);
    document.addEventListener('keydown', escBasildi);
    return () => {
      document.removeEventListener('mousedown', disariTiklama);
      document.removeEventListener('keydown', escBasildi);
    };
  }, [isDropdownOpen]);

  // Sticky gölge
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenus = () => setIsDropdownOpen(false);

  const handleSignOut = async () => {
    closeMenus();
    await supabase.auth.signOut();
    setUser(null);
    setNavbarName('');
    router.push('/');
  };

  // Oturum gerektiren hedef: yoksa girişe gönder
  const uyeHedef = (path) => (user ? path : '/login');

  // Menü başlığında kullanılan türetilmiş değerler. State'e yazılmıyor:
  // profilden hesaplanabilen bir şeyi ayrıca tutmak, ikisinin kayması demek.
  const tamAd = profil?.first_name && profil?.last_name
    ? `${profil.first_name} ${profil.last_name}`
    : '';
  const basHarfler = tamAd
    ? tamAd.split(' ').filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toLocaleUpperCase('tr-TR')).join('')
    : (user?.email?.charAt(0)?.toLocaleUpperCase('tr-TR') || '?');

  // -----------------------------------------------------------------------
  // SAĞLAYICI (OAuth) PROFİL FOTOĞRAFI
  // -----------------------------------------------------------------------
  // Google ile giren kullanıcı baş harf görüyordu: `profiles.avatar_yolu`
  // yalnızca KULLANICININ KENDİ YÜKLEDİĞİ görseli tutuyor, sağlayıcıdan
  // gelen fotoğrafa hiç bakılmıyordu.
  //
  // ⚠ ANAHTARLAR VARSAYILMADI, CANLI VERİTABANINDA ÖLÇÜLDÜ: Google hem
  // `avatar_url` hem `picture` yazıyor ve ikisi BİREBİR AYNI. İkisi de
  // okunuyor çünkü hangisini yazdığı sağlayıcıya göre değişiyor.
  //
  // ⚠ APPLE FOTOĞRAF GÖNDERMİYOR. "Sign in with Apple" yalnızca e-posta ve
  // (yalnızca ilk izinde) ad döndürüyor; profil görseli KAPSAMINDA YOK.
  // Yani Apple ile girenler baş harflerde kalıyor — bu bir eksik değil,
  // sağlayıcının vermediği bir veriyi uydurmamak.
  //
  // Yeni state/istek YOK: `user` zaten oturumla geliyor, bu ondan türüyor.
  const saglayiciAvatar = user?.user_metadata?.avatar_url
    || user?.user_metadata?.picture
    || null;

  // ÖNCELİK: kullanıcının kendi yüklediği görsel > sağlayıcı fotoğrafı >
  // baş harfler. Kendi yüklediği her zaman kazanıyor — bilinçli bir seçimi
  // Google'dan gelen fotoğrafın ezmesi geri adım olurdu.
  const gosterilenAvatar = avatarAdres || saglayiciAvatar;

  // ⚠ SIRALAMA: `/dashboard` EN ÜSTTEYDİ ama içeriği bir "yapım aşamasında"
  // yer tutucusu. Menünün ilk maddesi, kullanıcının en çok tıkladığı yerdir;
  // oraya boş bir ekran koymak ürünün çalışmadığı izlenimi veriyordu.
  // Gerçekten çalışan ve en sık kullanılan ekran (garaj) başa alındı; özet
  // hazır olana kadar aşağıda ve "yakında" etiketiyle duruyor.
  const HESAP_MENU = [
    { href: '/dashboard', label: 'Bana Özel Özet' },
    { href: '/garage', label: 'Tescilli Taşıtlarım (Garaj)' },
    { href: '/my-listings', label: 'Vitrindeki Araçlarım' },
    { href: '/favorilerim', label: 'Favorilerim' },
    { href: '/mesajlar', label: 'Mesajlarım', rozet: okunmamis },
    // ⚠ HENÜZ GERÇEK EKRAN DEĞİL. Rota `ComingSoon` basıyor ama menüde
    // diğer yedi GERÇEK ekranla birebir aynı biçimde duruyordu: kullanıcı
    // çalışan bir ekrana gittiğini sanıp "yapım aşamasında" görüyordu.
    // `yakinda` rozeti bu menüde ZATEN destekleniyordu, yalnızca bu
    // maddeye atanmamıştı.
    { href: '/query-history', label: 'Sorgulama Geçmişim', yakinda: true },
    { href: '/packages', label: 'Ücretler & Ödemeler' },
    { href: '/account', label: 'Hesabım' },
  ];

  return (
    <>
      <header
        /* ⚠ ŞERİT KOYU TONA ALINDI (#0F172A).
           Beyazdı ve sayfa zemini de beyaza yakındı; şerit siteden HİÇ
           ayrılmıyordu. Bu renk icat değil, markanın kendi
           `--color-darkslate` tonu — alt bilgi de aynı tonda, yani sayfa
           koyu bir üst ve koyu bir altla çerçeveleniyor.
           ⚠ Kaydırma gölgesi koyu zeminde görünmüyor; ayrım artık rengin
           kendisinden geliyor, gölge yalnızca derinlik katıyor. */
        className={`bg-[#0F172A] sticky top-0 z-50 select-none transition-shadow print:hidden ${
          scrolled ? 'shadow-lg border-b border-slate-800' : 'border-b border-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-4">

          <div className="flex items-center gap-8 shrink-0">
            {/* `inline-flex items-center min-h-[44px]`: logo bağlantısının
                yüksekliği yalnızca yazı boyu kadardı (24 px ölçüldü). Logo
                anasayfaya dönüşün ana yolu; dokunma alanı standardın altında
                kalmamalı. */}
            {/* ⚠ BU BİR YER TUTUCU — GERÇEK LOGO HENÜZ YOK.
                Kelime işareti 16px idi ve şeritteki en büyük öge olmasına
                rağmen bir marka çapası kurmuyordu. 20px (`text-vurgu`)
                yapıldı: şeridin geri kalanı 14px, yani logo tek başına bir
                kademe yukarıda duruyor.

                Gerçek logo geldiğinde bu `<Link>`in İÇİ değişecek ama
                ÖLÇÜSÜ korunmalı: yüksekliği ~28px, dokunma alanı 44px.
                Daha büyük bir logo şeridi dengesizleştirir, daha küçüğü
                markayı gezinme bağlantısı seviyesine düşürür. */}
            <Link href="/" onClick={closeMenus} className={`inline-flex items-center min-h-[44px] text-vurgu font-display font-bold tracking-tight text-white rounded ${ODAK}`}>
              OTO.CV
            </Link>

            {/* `py-2`: menü bağlantıları 16px yüksekliğindeydi — WCAG 2.2'nin
                24px'lik hedef asgarisinin altında. Dikey dolgu, görünümü
                değiştirmeden isabet alanını büyütüyor; `items-center` hizayı
                koruyor. */}
            <nav aria-label="Ana menü" className="hidden md:flex items-center gap-7 text-govde font-medium text-slate-200 [&_a]:py-2 [&_span]:py-2">
              {/* "Pazaryeri Vitrini" KALDIRILDI: logonun gittiği yere
                  gidiyordu (ikisi de `/`). Menüde ikinci bir anasayfa
                  bağlantısı yer kaplıyor ama hiçbir yere GÖTÜRMÜYOR —
                  kullanıcı bir seçenek sanıp tıklıyor, bulunduğu sayfada
                  kalıyordu. Logo zaten evrensel anasayfa bağlantısı. */}
              {/* "Karne Sorgula" BURADAN KALKTI, yerine devir geldi.
                  Gerekçe: karne sorgulama anasayfadaki "Künye Sorgula"
                  kartında, footer'da ve /devir sayfasının altında zaten var —
                  menüdeki dördüncü kopyaydı. Devrin ise hiçbir bağımsız
                  girişi yoktu: satın aldığı aracın sicilini devralmak isteyen
                  kişi ilan sihirbazına girip plaka yazmak zorundaydı. */}
              <Link
                href="/devir"
                onClick={closeMenus}
                /* ⚠ ETKİN VE ÜZERİNE GELME RENKLERİ KOYU ZEMİNE GÖRE.
                  Eskiden etkin `indigo-600`, hover `slate-900` idi — ikisi de
                  beyaz şerit içindi ve lacivert üstünde okunmuyor
                  (indigo-600 burada 2.1:1). Koyu zeminde vurgu beyaza
                  doğru açılmak demek. */
                className={`inline-flex items-center min-h-[44px] transition-colors rounded odak-acik ${pathname.startsWith('/devir') ? 'text-white font-semibold' : 'hover:text-white'}`}
              >
                Araç Devir
              </Link>
              {/* ⚠ "Kurumsal Çözümler" KALDIRILDI.
                Üç sorunu birdendi: (1) tıklanamıyordu, hiçbir hedefi yoktu,
                (2) kontrastı 1.49:1 ölçüldü — yani fiilen görünmüyordu,
                (3) `title="Yakında"` tek başına erişilebilir bir açıklama
                değil (projede yazılı kural: GarageScreen.jsx:338).
                Görünmeyen ve çalışmayan bir öge menüde yer tutmuyor. */}
            </nav>
          </div>

          {/* ARAMA — MASAÜSTÜ.
              Koyu kahraman bloğu kaldırıldığı için arama buraya taşındı ve
              artık HER SAYFADA erişilebilir (ürün sahibinin kararı).
              `hidden md:flex`: dar ekranda şeritte yer yok, orada şeridin
              ALTINDA kendi tam genişlikli satırında çiziliyor. */}
          {genisEkran && (
            <div className="flex flex-1 justify-center min-w-0">
              {/* ⚠ Suspense ŞART: `HeaderArama` içinde `useSearchParams` var
                  ve Next 16 onu sınır olmadan ön işlenen rotalarda kabul
                  etmiyor — başlık HER rotada çiziliyor, yani sınır olmasa
                  statik üretim bozulurdu. */}
              <Suspense fallback={null}><HeaderArama /></Suspense>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* ARAÇ KAYDET — tek düğme, açılır panel YOK.
                -----------------------------------------------------------
                Eskiden üzerine gelince iki kartlı bir panel açılıyordu:
                "Yeni Araç Kaydet" ve "Aracımı Satışa Çıkar". Kaldırıldı,
                üç sebeple:

                1. İkisi aynı işin iki yolu DEĞİLDİ. Birincisi sihirbazı
                   açıyordu, ikincisi yalnızca /garage'a gidiyordu — orada
                   aracı bulup "Satışa Çıkar"a basmak gerekiyordu. Yani
                   panel bir seçim sunuyor gibi görünüp aslında bir
                   yönlendirme yapıyordu. Eski ilan sitesinin
                   "sıfırdan ilan / garajımdan seç" ikilisinden kalmaydı.

                2. Panel yalnızca `onMouseEnter` ile açılıyordu. Klavyeyle
                   gezen ya da dokunmatik kullanan biri ikinci karta HİÇ
                   ulaşamıyordu; "iki yol" fare kullanıcısına özeldi.

                3. Mobil çekmecede zaten tek bağlantı vardı. Masaüstü ve
                   mobil artık aynı şeyi yapıyor.

                "Satışa çıkar" niyeti kaybolmuyor: garaj kartında,
                /my-listings'te ve filo panelinde duruyor.

                Metin "Ücretsiz İlan Ver" değil, iki sebeple:
                  - Ürün önce SİCİL, ilan ikincil; araç kaydetmek için
                    ilan vermek gerekmiyor.
                  - "Ücretsiz" artık YANLIŞ olurdu: ilk araç ücretsiz ama
                    ikinci ve sonrası Ek Araç Kaydı gerektiriyor. */}
            <Link
              href={uyeHedef('/add-vehicle/step1')}
              onClick={closeMenus}
              className={`hidden md:flex min-h-[44px] bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold text-govde px-4 rounded-md transition-colors shadow-2xs items-center gap-2 border border-amber-500/30 ${ODAK}`}
            >
              <Icon name="ilan" size="xs" />
              <span>Araç Kaydet</span>
            </Link>

            {/* BİLDİRİM ARTIK KENDİ HEDEFİNE GİDİYOR.
                Eskiden buraya `() => router.push('/garage')` veriliyordu ve
                bildirim nesnesi YOK SAYILIYORDU: mesaj bildirimi de, devir
                bildirimi de garajı açıyordu. `hedef_yol` alanı bildirimi
                üreten fonksiyonda yazılıyor; taşımayan eski bildirimler
                garaja düşüyor. */}
            <NotificationDropdown
              onNavigate={(bildirim) => router.push(uyeHedef(bildirim?.hedef_yol || '/garage'))}
            />

            {/* HESAP — masaüstü */}
            {!user ? (
              /* ⚠ DOKUNMA ALANI ÖLÇÜLDÜ VE 16 px'Tİ.
                 "Giriş Yap" 49x16, "Hesap Aç" 53x16 — yani sayfanın en
                 önemli iki eylemi, `dugme.js`'in ilan ettiği 44 px WCAG
                 asgarisinin dörtte biri kadardı. Metin bağlantısı olduğu için
                 yüksekliği yalnızca yazı boyu kadardı.

                 Ayraç `|` de kaldırıldı: kontrastı 1.23:1 ölçüldü, yani
                 görünmüyordu ama ekran okuyucuda `aria-hidden` sayesinde de
                 okunmuyordu — hiçbir işi yoktu. */
              <div className="hidden md:flex items-center gap-1 pl-1">
                {/* ⚠ `dugme('sessiz')` KULLANILAMIYOR: o varyant
                    `text-slate-600` veriyor ve BEYAZ şerit için yazılmıştı.
                    Şerit `#0F172A` olunca ölçüldü: 2.35:1 — AA'nın çok
                    altında, yani "Giriş Yap" fiilen okunmuyordu.
                    Varyanta `ek` ile renk geçirmek de güvenilmez: ikisi de
                    aynı özelliği yazan Tailwind yardımcısı ve hangisinin
                    kazanacağı sınıf sırasına değil üretilen CSS sırasına
                    bağlı. Bu yüzden geometri `dugme` ile aynı tutulup renk
                    açıkça yazıldı. */}
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-md text-govde font-medium tracking-tight transition-colors text-slate-200 hover:text-white hover:bg-white/10 odak-acik"
                >
                  Giriş Yap
                </Link>
                <Link href="/register" className={dugme('ikincil', { ek: ODAK })}>Hesap Aç</Link>
              </div>
            ) : (
              <div className="relative hidden md:block pl-1" ref={hesapMenuRef}>
                {/* aria-controls + aria-haspopup: ekran okuyucuya bu düğmenin
                    bir menü açtığını ve hangisini açtığını söylüyor. Sayfada
                    `aria-expanded` taşıyan başka düğmeler de var (bildirim
                    zili), bu yüzden menünün kendi kimliği olması gerekiyor. */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="menu"
                  aria-controls="hesap-menusu"
                  /* ⚠ `min-h-[44px]` — HER OTURUMLU ROTADA 62x16 IDI.
                       Genişlik zaten yeterliydi, eksik olan yükseklikti: düğme
                       metin bağlantısı gibi çizildiği için kutu yalnızca yazı
                       boyu kadardı. Oturumsuz dal `dugme()` kullanıyor ve o
                       zaten 44px veriyor — yani oturum AÇIK kullanıcı, oturum
                       KAPALI olandan daha kötü bir hedef alıyordu.
                       ⚠ `px` EKLENMEDİ: yatay dolgu sağdaki zil/hamburger
                       hizasını kaydırır. Satır kapsayıcısı `h-16` olduğu için
                       44px başlık yüksekliğini değiştirmiyor. */
                    className={`flex items-center gap-1.5 min-h-[44px] text-govde font-medium text-slate-200 hover:text-white transition-colors rounded odak-acik`}
                >
                  <span>{navbarName || 'Hesabım'}</span>
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>

                {isDropdownOpen && (
                  <div id="hesap-menusu" className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden z-50 text-govde">
                    {/* BAŞLIK: eskiden yalnızca ham e-posta yazıyordu.
                        Garaj ekranından kaldırılan profil kartının taşıdığı
                        bilgi (baş harfler, ad soyad, üyelik) buraya taşındı —
                        bilgi kaybolmadı, ait olduğu yere geldi. */}
                    <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-govde shrink-0 font-display overflow-hidden">
                        {/* Görsel varsa baş harflerin YERİNE geçiyor; yoksa
                            baş harfler duruyor. İkisini birden göstermek
                            aynı bilgiyi iki kez basmak olurdu. */}
                        {gosterilenAvatar
                          ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element --
                          next/image BURADA YANLIŞ: kova özel olduğu için adres
                          kısa ömürlü İMZALI URL ve her yüklemede değişiyor.
                          next/image bu adresleri kendi iyileştirme yolundan
                          geçirip önbelleğe alır; imza süresi dolunca da bozuk
                          görsel gösterir. Sağlayıcı fotoğrafı için de aynısı
                          geçerli: adres bizim alan adımızda değil. */}
                      <img
                        src={gosterilenAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                        /* ⚠ Google fotoğraf adresleri Referer başlığı
                           gönderildiğinde 403 dönebiliyor; bu satır isteği
                           referrer'sız yolluyor. Ayrıca profil adresimizi
                           Google'a bildirmemiş oluyoruz. */
                        referrerPolicy="no-referrer"
                      />
                            </>
                          )
                          : basHarfler}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-900 baslik-kart truncate">
                          {tamAd || 'Hesabım'}
                        </p>
                        <p className="text-slate-500 metin-yardimci truncate">{user.email}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 etiket ${
                          profil?.is_premium ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {profil?.is_premium && <Icon name="yildiz" size="xs" />}
                          {profil?.is_premium ? 'Premium Üyelik' : 'Standart Üyelik'}
                        </span>
                      </div>
                    </div>

                    <div className="py-1 flex flex-col">
                      {HESAP_MENU.map((m) => (
                        <Link
                          key={m.href}
                          href={m.href}
                          onClick={closeMenus}
                          /* ⚠ TİPOGRAFİ ÖLÇEĞE BAĞLANDI. Eskiden ham
                             `font-semibold text-mini` (12px) idi: menünün
                             hemen üstündeki e-posta satırı `.metin-yardimci`
                             (13px) olduğu için, ASIL EYLEMLER yardımcı
                             metinden küçük kalıyordu. Artık ikisi de 13px;
                             ayrım punto ile değil RENKLE kuruluyor: satırlar
                             `slate-700`, e-posta `slate-500`.
                             ⚠ `min-h-[44px]`: satır 36px'ti.

                             ⚠ `font-medium` BİLEREK YOK. Denendi ve ÖLÇÜLDÜ:
                             hesaplanan ağırlık yine 400 çıkıyor. Sebep cascade
                             — `.metin-yardimci` globals.css'te KATMANSIZ
                             tanımlı, Tailwind yardımcıları ise `@layer
                             utilities` içinde; katmansız CSS katmanlıyı
                             yeniyor. Yani sınıf yazılsa da hiçbir şey
                             yapmıyordu; sessizce kaybeden bir sınıf bırakmak
                             sonradan okuyanı yanıltır. Ağırlığın sahibi
                             ölçek. */
                          className={`px-4 min-h-[44px] hover:bg-slate-50 flex justify-between items-center gap-3 transition-colors text-slate-700 metin-yardimci ${ODAK}`}
                        >
                          <span>{m.label}</span>
                          <span className="flex items-center gap-2">
                            {/* Rozet YALNIZCA sayı sıfırdan büyükse basılıyor.
                                "0" göstermek okunmamış mesaj varmış izlenimi
                                veriyor ve rozetin anlamını öldürüyor. */}
                            {m.yakinda && (
                              <span className="etiket text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
                                Yakında
                              </span>
                            )}
                            {m.rozet > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white etiket grid place-items-center">
                                {m.rozet > 99 ? '99+' : m.rozet}
                              </span>
                            )}
                            {/* ⚠ SATIR SONU CHEVRON'U KALDIRILDI (7 satırda 7 adet).
                                Hiçbir bilgi taşımıyordu: menüdeki her satır zaten
                                bir bağlantı, yani "buraya gidilir" oku her satırda
                                aynı şeyi tekrarlıyordu. Üstelik `text-slate-300`
                                ile beyaz üstünde 1.6:1 — görünür bile değildi.
                                Sağ taraf artık YALNIZCA gerçek sinyali taşıyor:
                                okunmamış sayısı ve "Yakında" rozeti. */}
                          </span>
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 p-1.5">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        /* ⚠ İKON SOLA ALINDI. Sağa yaslı bir ok, üstündeki
                           yedi gezinme satırıyla aynı "ileri git" işaretini
                           taklit ediyordu — oysa çıkış bir yere GÖTÜRMÜYOR,
                           oturumu kapatıyor. Baştaki ikon ise menünün tek
                           yıkıcı eylemini bir bakışta ayırıyor.
                           ⚠ `min-h-[44px]`: düğme 32px'ti. */
                        /* `font-semibold` yok — yukarıdaki satırlarla aynı
                           cascade sebebi. Çıkışı ayıran şey ağırlık değil:
                           rose rengi, baştaki ikon ve üstündeki ayraç. */
                        className={`w-full px-3 min-h-[44px] text-left metin-yardimci text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 transition-colors ${ODAK}`}
                      >
                        {/* ⚠ ÇİZİM YOLU EKSİKTİ: eski `d` değeri `...V15` deyip
                            kapıyı yarıda bırakıyordu — dikdörtgenin alt ve sağ
                            kenarı hiç çizilmiyordu, ikon "yarım kutu" gibi
                            görünüyordu. Tam Heroicons yolu kullanılıyor.
                            `currentColor`: düğmenin rengini miras alıyor, ayrı
                            bir `rose-400` tonu tutmuyor (beyaz üstünde 3.7:1
                            kalıyordu ve metinden soluk düşüyordu). */}
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                        </svg>
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HAMBURGER — mobil, 44px dokunma alanı */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menüyü aç"
              aria-expanded={drawerOpen}
              className={`md:hidden w-11 h-11 -mr-2 grid place-items-center rounded-lg text-slate-200 hover:bg-white/10 transition-colors odak-acik`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* ARAMA — MOBİL.
            Şeridin kendisi zaten dolu (logo + Araç Kaydet + zil + hamburger);
            aramayı oraya sıkıştırmak dokunma hedeflerini birbirine sokardı.
            Bu yüzden kendi satırında, tam genişlikte ve şeridin ALTINDA.
            Ürün sahibinin tercihi buydu — alternatifi büyüteç ikonuyla
            açılıp kapanan bir alandı, o da aramayı bir dokunuş geriye
            götürüyordu.

            ⚠ `md:hidden`: masaüstünde YUKARIDAKİ örnek çiziliyor. İkisi
            aynı anda görünseydi sayfada `getByLabel(/PIN ile ara/i)` iki
            öğeye çözülür ve dört test strict mode ihlaliyle kırılırdı. */}
        {!genisEkran && (
          <div className="border-t border-slate-800 px-4 py-2">
            <Suspense fallback={null}><HeaderArama mobil /></Suspense>
          </div>
        )}
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />
    </>
  );
}
