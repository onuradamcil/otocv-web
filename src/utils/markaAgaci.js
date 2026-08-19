// =========================================================================
// KADEMELİ MARKA AĞACI (utils/markaAgaci.js)
//
// Süzgecin marka kırılımı: Marka → Seri → Model → Donanım.
// Kullanıcı bir kademe seçtiğinde ızgara ANINDA süzülüyor ve bir alt kademe
// açılıyor. Yani bu yapı hem gezinme hem süzgeç.
//
// -------------------------------------------------------------------------
// ⚠ AĞAÇ ARTIK KATALOGTAN BESLENİYOR — ÖNCEKİ KARAR TERSİNE DÖNDÜ
// -------------------------------------------------------------------------
// Bu dosya bir süre "katalog tabloları KULLANILMAYACAK" diye gerekçelendirdi
// ve dalları envanterden (vitrindeki araçlardan) üretti. Ürün sahibi bunu
// reddetti ve haklı:
//
//   "Skoda markasından bir araç vitrine çıkmış diye süzgeçe Skoda eklemişsin.
//    O aracın vitrin süresi dolduğunda markayı süzgeçten mi kaldıracağız?"
//
// Envanterden türetilen ağaç, süzgeci envanterin gölgesi yapıyordu: marka
// listesi araç girip çıktıkça değişiyor, kullanıcı aynı yerde aynı seçeneği
// bulamıyordu. Sektör liderlerinde marka listesi SABİT bir taksonomi.
//
// Bu yüzden dallar artık `car_brands / car_series / car_models / car_packages`
// tablolarından geliyor (49 / 822 / 3.591 / 23.138 satır, RLS'te herkese açık
// okunabilir). Çekme işi `services/catalogService.js`te ve Step1'in kaskad
// mantığıyla birebir aynı: kademe kademe, tıklandıkça.
//
// BU DOSYADA KALAN İŞ: dal üretmek değil, seçilen dalın araçlarla EŞLEŞMESİ.
// Araçlar katalog kimliği tutmuyor (`vehicles.brand/series/model/package` düz
// metin, foreign key yok), o yüzden eşleşme normalize METİNLE yapılıyor.
// =========================================================================

/**
 * Ağacın dört kademesi. Dizideki SIRA ağacın derinliğidir.
 *
 * `veri`  → araç kaydındaki alan adı (metin)
 * `alan`  → `suzgec` state'indeki alan adı (normalize anahtar)
 * Adlar sahibinden.com'un kendi terimleri: kullanıcı aşinalığı ürün
 * sahibinin açık isteği ve verimizin değerleri bu adlarla doğru okunuyor.
 */
export const KADEMELER = [
  { alan: 'marka', veri: 'brand', baslik: 'Marka' },
  { alan: 'seri', veri: 'series', baslik: 'Seri' },
  { alan: 'model', veri: 'model', baslik: 'Model' },
  { alan: 'donanim', veri: 'package', baslik: 'Donanım' },
];

/**
 * KARŞILAŞTIRMA ANAHTARI — ekranda hiç görünmez.
 *
 * Katalogtaki ad ile araçtaki metin birebir aynı yazılmış olmak zorunda
 * değil: araç kayıtları serbest metin ve veritabanında bugün bile tutarsız
 * (`Bentley` ama `COROLLA HB`). Normalize edilmezse katalogtan gelen "Bmw"
 * ile araçtaki "BMW" eşleşmez.
 *
 * -----------------------------------------------------------------------
 * ⚠ SUNUCUDAKİ `arama_normalize` İLE BİREBİR AYNI OLMAK ZORUNDA
 * -----------------------------------------------------------------------
 * Süzme sunucuya taşındığında (`arac_arama`) marka/seri/model/donanım
 * karşılaştırması şu hâle geldi:
 *
 *     arama_normalize(v.brand) = v_marka        <- v_marka İSTEMCİDEN geliyor
 *
 * Yani SOL taraf SQL'in normalize edicisinden, SAĞ taraf buradan geçiyor.
 * İkisi farklı katlarsa eşleşme sessizce başarısız olur.
 *
 * İlk yazımda burada yalnızca i-ailesi katlanıyordu; SQL tarafı ise Türkçe
 * ve Avrupa aksanlarının tamamını ASCII'ye indiriyordu. Ölçüldü:
 *
 *     lower('Tofaş')            -> 'tofaş'
 *     arama_normalize('Tofaş')  -> 'tofas'      -> EŞLEŞMİYOR
 *
 * Etkilenen katalog dalları: Tofaş (marka); Doğan, Şahin, Serçe, C-Elysée
 * (seri); 43 paket. O dallara tıklayan kullanıcı sessizce BOŞ liste
 * görüyordu. Bugün envanterde aksanlı dal taşıyan araç olmadığı için hata
 * görünmüyordu — ilk Şahin/Doğan kaydında ortaya çıkacaktı.
 *
 * -----------------------------------------------------------------------
 * ⚠ TÜRKÇE 'I' TUZAĞI — SIRA ÖNEMLİ
 * -----------------------------------------------------------------------
 * Türkçe yerelinde noktalı/noktasız i ayrı harflerdir:
 *     'FIAT'.toLocaleLowerCase('tr')  ->  'fıat'   (noktasız ı)
 *     'Fiat'.toLocaleLowerCase('tr')  ->  'fiat'   (noktalı i)
 * İki AYRI anahtar: aynı marka eşleşmezdi.
 *
 * Locale'siz `toLowerCase()` tek başına da kurtarmıyor:
 *     'İSTANBUL'.toLowerCase()  ->  'i̇stanbul'  (i + BİRLEŞEN NOKTA, 9 karakter)
 *
 * Çözüm ve SQL'deki sıranın aynısı: ÖNCE harfleri katla, SONRA küçült.
 * Ters sırada `MİNİ` -> `mi̇ni̇` oluyor ve `Mini` ile eşleşmiyor.
 *
 * ⚠ HARİTA SQL İLE BİREBİR: 58 karakter, kaynak ve hedef HİZALI. Bir
 * karakter kayarsa `translate` sessizce yanlış harf üretir. Değiştirilirse
 * `supabase/migrations/20260819040000_arama_normalize_ve_indeks.sql`
 * içindeki `arama_normalize` de AYNI ANDA güncellenmeli.
 */
const KAYNAK_HARFLER = 'ÇĞİIÖŞÜçğıiöşüÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÚÙÛÑŠŽÝáàâäéèêëíìîïóòôúùûñšžý';
const HEDEF_HARFLER  = 'cgiiosucgiiosuaaaaeeeeiiiiooouuunszyaaaaeeeeiiiiooouuunszy';

/** SQL `translate()` karşılığı: kaynak harfleri hedefteki eşine çevirir. */
function harfleriKatla(metin) {
  let cikti = '';
  for (const harf of metin) {
    const i = KAYNAK_HARFLER.indexOf(harf);
    cikti += i === -1 ? harf : HEDEF_HARFLER[i];
  }
  return cikti;
}

export function agacAnahtari(deger) {
  // SQL'deki sıra birebir: çevir -> küçült -> boşlukları sadeleştir -> kırp.
  return harfleriKatla(String(deger ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * ⚠ `agacUygun` ve `agacDerinligi` KALDIRILDI.
 *
 * İkisi de istemci tarafı süzmenin parçasıydı: `agacUygun` bir kaydın
 * seçili kırılıma uyup uymadığına, `agacDerinligi` gösterilecek kademeye
 * bakıyordu. Süzme sunucuya taşındığında (`arac_arama` RPC'si) bu mantık
 * SQL'e geçti — `20260819050000_arac_arama_sunucu_tarafi.sql` içindeki
 * `ok_agac` yüklemi ağacın dört kademesini tek yüklemde uyguluyor.
 *
 * Geride ölü kod olarak kalmışlardı: `agacUygun` import ediliyor ama hiç
 * çağrılmıyordu, `agacDerinligi` hiç import edilmiyordu. Gösterilecek
 * kademe artık `agacYolu.length`ten türetiliyor (`MarketplaceView`).
 */
