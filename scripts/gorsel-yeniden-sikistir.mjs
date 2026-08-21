// =========================================================================
// ESKİ GÖRSELLERİ YENİDEN SIKIŞTIRMA (tek seferlik bakım betiği)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Sıkıştırma boru hattı (`src/utils/gorselSikistir.js`) sonradan eklendi.
// Ondan ÖNCE yüklenen dosyalar telefondan çıktığı hâliyle duruyor. Ölçüldü
// (21.08.2026): 48 dosyanın 14'ü 1 MB üstü ve toplam 42 MB'ın 34 MB'ı bu 14
// dosyada. En büyüğü 4,5 MB'lık bir PNG fatura ve tek başına günde 167 MB
// egress yakıyordu — tüm depolama trafiğinin yarısı.
//
// Bu betik o dosyaları bugünkü profillerle yeniden sıkıştırıyor.
// YENİ yüklemeler zaten doğru; burası yalnızca geçmişi toparlıyor.
//
// -------------------------------------------------------------------------
// ⚠ BİÇİM VE YOL DEĞİŞTİRİLMİYOR — BU BİR TASARIM KARARI
// -------------------------------------------------------------------------
// PNG'yi WebP'ye çevirmek daha çok kazandırırdı. YAPILMIYOR, çünkü dosya
// yolları veritabanında duruyor (`maintenance_records.invoice_path`,
// `vehicles` görsel dizileri...). Uzantıyı değiştirmek o referansları
// kırardı; aynı ada farklı biçim yazmak ise dosyayı yalancı hâle getirirdi.
//
// Onun yerine BİÇİM AYNI KALIYOR, yalnızca boyut küçültülüyor ve kalite
// profili uygulanıyor. Asıl kazanç zaten çözünürlükten geliyor: 4000 px'lik
// bir telefon fotoğrafı 2400 px'e inince veri dörtte bire düşüyor.
//
// -------------------------------------------------------------------------
// ⚠ PROFİLLER `gorselSikistir.js` İLE AYNI — UYDURULMADI
// -------------------------------------------------------------------------
// Belge 2400 px / %88, araç fotoğrafı 1920 px / %82, avatar 512 px / %85.
// Belge bilerek daha cömert: sicilin tüm iddiası evraka dayanıyor, okunamayan
// bir fatura hiç yüklenmemiş faturadan iyi değil.
//
// -------------------------------------------------------------------------
// ⚠ GÜVENLİK AĞLARI
// -------------------------------------------------------------------------
// 1. Öntanımlı kip PROVA. Hiçbir şey yazılmaz, yalnızca ne olacağı listelenir.
//    Gerçekten yazmak için `--uygula` gerekiyor.
// 2. Yeni dosya eskisinden KÜÇÜK DEĞİLSE dokunulmuyor.
// 3. Yeni dosya ÇÖZÜLEBİLİYOR ve ÖLÇÜSÜ BEKLENEN değilse atlanıyor.
//    ⚠ Bu denetim bir kez yanlış yazıldı: "boyut %5'in altına düştüyse
//    bozuktur" kuralı, 8K bir fotoğrafı (7680x4320 -> 1920x1080, %96
//    küçülme) bozuk sanıp atladı. Ham boyut oranı kaynağın çözünürlüğünü
//    hesaba katmıyor. Doğru ölçü, çıktının gerçekten geçerli bir görüntü
//    olması ve beklenen kenar ölçüsünü tutturmasıdır.
// 4. Her dosyanın ORİJİNALİ önce `yedek/` klasörüne indiriliyor. Bir şey
//    ters giderse geri yükleme yolu var.
// 5. PDF ve görüntü olmayan hiçbir şeye dokunulmuyor.
//
// -------------------------------------------------------------------------
// KULLANIM
// -------------------------------------------------------------------------
//   node scripts/gorsel-yeniden-sikistir.mjs            # prova
//   node scripts/gorsel-yeniden-sikistir.mjs --uygula   # gerçekten yaz
//
// `.env.local` içinde şunlar olmalı:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...   <- ⚠ NEXT_PUBLIC_ ÖNEKİ OLMADAN
//
// ⚠ `service_role` anahtarı RLS'i tamamen atlar. Bu betik dışında hiçbir
// yerde kullanılmamalı, tarayıcıya asla gitmemeli, depoya asla yazılmamalı.
// `.env*` zaten `.gitignore`'da.
// =========================================================================

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const UYGULA = process.argv.includes('--uygula');
const ESIK = 1024 * 1024;            // 1 MB üstü dosyalar ele alınıyor
const YEDEK_DIZINI = 'gorsel-yedek';

/**
 * `--yalnizca <parça>` — yolunda bu metin geçen dosyalar dışındakileri atlar.
 *
 * ⚠ NİYE VAR: ürün sahibi 14 dosyaya birden dokunmadan ÖNCE tek bir faturayı
 * görüp okunabilirliğini kendi gözüyle doğrulamak istedi. Toplu bir bakım
 * işini önce tek örnekte denemek, geri alınması pahalı her işte doğru sıra.
 */
const YALNIZCA = (() => {
  const i = process.argv.indexOf('--yalnizca');
  return i >= 0 ? process.argv[i + 1] : null;
})();

// Kova -> profil eşlemesi. `gorselSikistir.js`teki SIKISTIRMA ile aynı.
const PROFIL = {
  'vehicle-invoices': { enUzunKenar: 2400, kalite: 88, ad: 'belge' },
  belgeler: { enUzunKenar: 2400, kalite: 88, ad: 'belge' },
  'vehicle-images': { enUzunKenar: 1920, kalite: 82, ad: 'araç fotoğrafı' },
  avatarlar: { enUzunKenar: 512, kalite: 85, ad: 'avatar' },
};

// -------------------------------------------------------------------------
// Ortam
// -------------------------------------------------------------------------
function ortamOku() {
  let ham;
  try {
    ham = readFileSync('.env.local', 'utf8');
  } catch {
    cikisHata('.env.local okunamadı. Betik depo kökünden çalıştırılmalı.');
  }
  const al = (ad) => {
    const m = ham.match(new RegExp(`^${ad}=(.*)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  const url = al('NEXT_PUBLIC_SUPABASE_URL');
  const anahtar = al('SUPABASE_SERVICE_ROLE_KEY');

  if (!url) cikisHata('.env.local içinde NEXT_PUBLIC_SUPABASE_URL yok.');
  if (!anahtar) {
    cikisHata(
      '.env.local içinde SUPABASE_SERVICE_ROLE_KEY yok.\n' +
      '  Supabase -> Project Settings -> API -> service_role (secret)\n' +
      '  ⚠ NEXT_PUBLIC_ öneki OLMADAN eklenmeli.',
    );
  }
  return { url, anahtar };
}

function cikisHata(mesaj) {
  console.error(`\n❌ ${mesaj}\n`);
  process.exit(1);
}

const kb = (b) => `${(b / 1024).toFixed(0)} KB`;

// -------------------------------------------------------------------------
// Kovadaki tüm nesneleri özyinelemeli topla
// -------------------------------------------------------------------------
// ⚠ `list` klasör klasör çalışıyor; alt klasörleri kendiliğinden inmiyor.
// Dosya yolları `<uuid>/<uuid>/<dosya>` gibi iki kat derin olabiliyor.
async function nesneleriTopla(supabase, kova, önek = '', derinlik = 0) {
  if (derinlik > 5) return [];
  const { data, error } = await supabase.storage.from(kova).list(önek, { limit: 1000 });
  if (error) {
    console.warn(`  ⚠ ${kova}/${önek} listelenemedi: ${error.message}`);
    return [];
  }
  const sonuc = [];
  for (const öge of data ?? []) {
    const yol = önek ? `${önek}/${öge.name}` : öge.name;
    if (öge.id === null) {
      sonuc.push(...(await nesneleriTopla(supabase, kova, yol, derinlik + 1)));
    } else {
      sonuc.push({ yol, boyut: Number(öge.metadata?.size ?? 0), tur: öge.metadata?.mimetype ?? '' });
    }
  }
  return sonuc;
}

// -------------------------------------------------------------------------
// Tek dosyayı yeniden kodla — BİÇİM DEĞİŞMEDEN
// -------------------------------------------------------------------------
async function yenidenKodla(tampon, profil) {
  const görsel = sharp(tampon, { failOn: 'none' });
  const üstveri = await görsel.metadata();
  const biçim = üstveri.format;
  const kaynakEnUzun = Math.max(üstveri.width ?? 0, üstveri.height ?? 0);

  // ⚠ Yalnızca gerçekten büyükse küçültülüyor. `withoutEnlargement` şart:
  // küçük bir görseli büyütmek hem veriyi şişirir hem kaliteyi düşürür.
  const boru = görsel.rotate().resize({
    width: profil.enUzunKenar,
    height: profil.enUzunKenar,
    fit: 'inside',
    withoutEnlargement: true,
  });

  let veri;
  switch (biçim) {
    case 'jpeg':
      veri = await boru.jpeg({ quality: profil.kalite, mozjpeg: true }).toBuffer();
      break;
    case 'png':
      // PNG kayıpsız; kazanç ölçek küçültme ve palet indirgemeden geliyor.
      veri = await boru.png({ compressionLevel: 9, palette: true, quality: profil.kalite }).toBuffer();
      break;
    case 'webp':
      veri = await boru.webp({ quality: profil.kalite }).toBuffer();
      break;
    default:
      return { veri: null, biçim: biçim ?? 'bilinmiyor', sebep: 'goruntu-degil' };
  }

  // =======================================================================
  // ⚠ SAĞLAMLIK DENETİMİ — ÇIKTI GERÇEKTEN GEÇERLİ Mİ
  // =======================================================================
  // ÖNCEKİ SÜRÜM HAM BOYUT ORANINA BAKIYORDU ("%5'in altına düştüyse
  // bozuktur") VE YANLIŞ ALARM VERDİ. Ölçüldü: 7680x4320 (8K) bir fotoğraf
  // 1920'ye inince piksel sayısı 16 kat azalıyor; dosya %96 küçülüyor ve bu
  // tamamen normal. Oran ölçüsü, kaynağın çözünürlüğünü hesaba katmıyordu.
  //
  // Doğru denetim şu: çıktı ÇÖZÜLEBİLİYOR mu ve ölçüsü BEKLENEN mi.
  // Bozuk bir tampon `metadata()` çağrısında patlar ya da ölçüsüz döner.
  const beklenenEnUzun = Math.min(kaynakEnUzun, profil.enUzunKenar);
  let çıktıEnUzun = 0;
  try {
    const yeniÜstveri = await sharp(veri).metadata();
    çıktıEnUzun = Math.max(yeniÜstveri.width ?? 0, yeniÜstveri.height ?? 0);
  } catch {
    return { veri: null, biçim, sebep: 'cozulemedi' };
  }

  // 2 piksellik tolerans: `fit: inside` yuvarlama yapıyor.
  if (Math.abs(çıktıEnUzun - beklenenEnUzun) > 2) {
    return { veri: null, biçim, sebep: `olcu-tutmadi (${çıktıEnUzun} != ${beklenenEnUzun})` };
  }

  return { veri, biçim };
}

// -------------------------------------------------------------------------
// Ana akış
// -------------------------------------------------------------------------
async function main() {
  const { url, anahtar } = ortamOku();
  const supabase = createClient(url, anahtar, { auth: { persistSession: false } });

  console.log(`\n${UYGULA ? '🔴 UYGULAMA KİPİ — dosyalar GERÇEKTEN değişecek' : '🔵 PROVA — hiçbir şey yazılmayacak'}\n`);

  let toplamÖnce = 0;
  let toplamSonra = 0;
  let değişen = 0;
  let atlanan = 0;

  for (const [kova, profil] of Object.entries(PROFIL)) {
    const nesneler = await nesneleriTopla(supabase, kova);
    const büyükler = nesneler
      .filter((n) => n.boyut > ESIK)
      .filter((n) => !YALNIZCA || n.yol.includes(YALNIZCA));
    if (büyükler.length === 0) {
      console.log(`${kova}: 1 MB üstü dosya yok (${nesneler.length} dosya tarandı)`);
      continue;
    }

    console.log(`\n${kova} — profil "${profil.ad}" (${profil.enUzunKenar} px / %${profil.kalite})`);

    for (const n of büyükler) {
      // ===================================================================
      // ⚠ ZATEN İŞLENMİŞ DOSYAYA BİR DAHA DOKUNMA
      // ===================================================================
      // BU BİR HATANIN ONARIMI VE İKİ AYRI ZARAR VERMİŞTİ:
      //
      // Betik ilk kez tek bir fatura için çalıştırıldı (4503 KB -> 1125 KB),
      // ürün sahibi sonucu gözle onayladı. Sonra tamamı için tekrar
      // çalıştırıldı. O fatura 1125 KB ile HÂLÂ 1 MB eşiğinin üstünde
      // olduğu için YENİDEN işlendi:
      //
      //   1. Görüntü ikinci kez palet indirgemesinden geçti: 1125 -> 846 KB
      //      ve piksel bileşenlerinin %24,6'sı değişti. Yani onaylanan
      //      sürüm sessizce başka bir şeye dönüştü.
      //   2. Daha kötüsü: yedek alma adımı ÜZERİNE YAZDI. Elimizdeki tek
      //      gerçek orijinal (4,5 MB) yerelde kayboldu.
      //
      // Yedek dosyasının VARLIĞI, o dosyanın daha önce işlendiğinin
      // kanıtıdır. Tek bir denetim iki hatayı birden kapatıyor.
      const yedekYolu = join(YEDEK_DIZINI, kova, n.yol);
      if (existsSync(yedekYolu)) {
        console.log(`  ⏭  ATLANDI (daha önce işlenmiş, yedeği var): ${n.yol}`);
        atlanan += 1;
        continue;
      }

      const { data, error } = await supabase.storage.from(kova).download(n.yol);
      if (error) {
        console.log(`  ⚠ ATLANDI (inilemedi): ${n.yol} — ${error.message}`);
        atlanan += 1;
        continue;
      }
      const önce = Buffer.from(await data.arrayBuffer());

      let yeni;
      try {
        yeni = await yenidenKodla(önce, profil);
      } catch (e) {
        console.log(`  ⚠ ATLANDI (çözülemedi): ${n.yol} — ${e.message}`);
        atlanan += 1;
        continue;
      }

      if (!yeni.veri) {
        console.log(`  ⏭  ATLANDI (${yeni.sebep}, biçim "${yeni.biçim}"): ${n.yol}`);
        atlanan += 1;
        continue;
      }

      const oran = yeni.veri.length / önce.length;

      // Güvenlik ağı: küçülmediyse dokunma. Sağlamlık denetimi (çözülebiliyor
      // mu, ölçü tuttu mu) `yenidenKodla` içinde yapıldı — ham boyut oranına
      // bakmak yanlış alarm üretiyordu, bkz. oradaki not.
      if (oran >= 1) {
        console.log(`  ⏭  ATLANDI (küçülmedi): ${n.yol} ${kb(önce.length)} -> ${kb(yeni.veri.length)}`);
        atlanan += 1;
        continue;
      }

      console.log(
        `  ${UYGULA ? '✔' : '·'} ${n.yol}\n` +
        `      ${kb(önce.length)} -> ${kb(yeni.veri.length)}  (%${((1 - oran) * 100).toFixed(0)} kazanç, ${yeni.biçim})`,
      );

      toplamÖnce += önce.length;
      toplamSonra += yeni.veri.length;
      değişen += 1;

      if (UYGULA) {
        // Güvenlik ağı 4: orijinali diske al.
        // ⚠ `existsSync` denetimi yukarıda yapıldı; buraya gelen dosyanın
        // yedeği YOK demektir. Yine de üzerine yazmamak için ikinci kez
        // bakılıyor: bir yedeği kaybetmenin bedeli, fazladan bir dosya
        // sistemi çağrısından kat kat yüksek.
        mkdirSync(dirname(yedekYolu), { recursive: true });
        if (existsSync(yedekYolu)) {
          console.log('      ⚠ YEDEK ZATEN VAR, üzerine yazılmadı — dosya atlandı');
          atlanan += 1;
          değişen -= 1;
          continue;
        }
        writeFileSync(yedekYolu, önce);

        const { error: yükleHata } = await supabase.storage
          .from(kova)
          .upload(n.yol, yeni.veri, { upsert: true, contentType: n.tur || `image/${yeni.biçim}` });

        if (yükleHata) {
          console.log(`      ❌ YAZILAMADI: ${yükleHata.message}`);
          atlanan += 1;
          değişen -= 1;
        }
      }
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`Değişen dosya : ${değişen}`);
  console.log(`Atlanan       : ${atlanan}`);
  console.log(`Toplam        : ${kb(toplamÖnce)} -> ${kb(toplamSonra)}`);
  if (toplamÖnce > 0) {
    console.log(`Kazanç        : %${((1 - toplamSonra / toplamÖnce) * 100).toFixed(0)}`);
  }
  if (!UYGULA && değişen > 0) {
    console.log(`\nGerçekten uygulamak için: node scripts/gorsel-yeniden-sikistir.mjs --uygula`);
    console.log(`Orijinaller "${YEDEK_DIZINI}/" altına yedeklenecek.`);
  }
  console.log('');
}

main().catch((e) => cikisHata(e.stack ?? String(e)));
