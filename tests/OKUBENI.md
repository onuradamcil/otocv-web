# Testler

## Nasıl çalıştırırım?

```bash
npm test
```

Bu kadar. Dev sunucusu kapalıysa kendisi açar, açıksa ona bağlanır.

## Hata olursa ne yapmalıyım?

```bash
npm run test:rapor
```

Tarayıcıda görsel bir rapor açılır. Başarısız testi tıklarsanız:

- **ekran görüntüsü** — hata anında ekranda ne vardı
- **video** — testin baştan sona ne yaptığı
- **iz (trace)** — her adımda tıklanan yer, o anki DOM ve ağ istekleri

Yani hatayı okumak zorunda değilsiniz, izliyorsunuz.

Testi kendi gözünüzle canlı izlemek isterseniz:

```bash
npm run test:izle
```

Tarayıcı açılır ve adımlar önünüzde işler.

Sadece hızlı bir sağlık kontrolü isterseniz (yaklaşık 30 saniye):

```bash
npm run test:hizli
```

## Kurulum

İlk kez çalıştırıyorsanız iki şey gerekir.

**1. Kimlik bilgileri.** `.env.test` dosyası. Örnekten kopyalayıp doldurun:

```bash
cp .env.test.example .env.test
```

Değerler `.env.local` dosyanızdakilerle aynı. Bu dosya `.gitignore` içinde,
depoya girmez.

**2. Tarayıcı.** Playwright kendi tarayıcısını kullanır:

```bash
npx playwright install chromium
```

## Neler test ediliyor?

| Dosya | Ne yapar |
|---|---|
| `01-rota-erisim.spec.js` | Her sayfa açılıyor mu, konsola hata yazıyor mu, korumalı rotalar `/login`'e yönlendiriyor mu |
| `02-karne-butunlugu.spec.js` | Karne, sorgulamadığı hiçbir şeyi beyan etmiyor mu; hasarlı araç "temiz" görünmüyor mu; kaynak etiketleri yerinde mi |
| `03-formlar.spec.js` | Bakım kaydı formu gerçekten kaydediyor mu; giriş çalışıyor mu; şifre butonu erişilebilir mi |
| `04-mobil.spec.js` | Yatay kaydırma, dokunma alanları, `h1`, mobil çekmecenin odak davranışı |

## Testler veritabanına yazıyor mu?

Yalnızca `03-formlar.spec.js` yazıyor — gerçek bir bakım kaydı oluşturuyor,
çünkü formun **gerçekten** çalıştığını başka türlü kanıtlayamayız.

**Yazdığını kendisi siliyor.** Koşum bitince kaydı siler ve `trust_score`'u
eski değerine döndürür. Test başarısız olsa, hata atsa ya da yarıda kesilse
bile temizlik çalışır — Playwright'ın fixture teardown mekanizması bunu
garanti eder.

Yazılan her kayıt benzersiz bir işaret taşır (`OTOCV-TEST-<zaman>-<rastgele>`),
bu yüzden silme yalnızca o koşumun ürettiğini bulur. Gerçek kullanıcı
verisine hiçbir koşulda dokunmaz.

## GitHub'daki robot (CI)

`git push` yaptığınızda GitHub bir makine açıp lint + derleme + testleri
koşar. Sonucu commit'in yanında yeşil tik ya da kırmızı çarpı olarak
görürsünüz. Ayrıntı için deponun **Actions** sekmesi.

CI şu an **veritabanına yazan paketi koşmuyor** (`03-formlar`). Sebebi: her
push'ta canlı veritabanına gerçek kayıt yazmak istemiyoruz. Yerel Supabase
kurulduğunda (yol haritası) o paket de CI'ya girecek.

CI'ın testleri koşabilmesi için GitHub'da şu gizli anahtarlar tanımlı olmalı
(**Settings → Secrets and variables → Actions**):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OTOCV_TEST_EMAIL
OTOCV_TEST_PASSWORD
OTOCV_TEST_PLAKA
```

Tanımlı değilse test adımı atlanır ve koşum kırmızı olmaz — yalnızca lint ve
derleme çalışır.

## Test yazarken dikkat edilecek iki tuzak

**1. `innerText` CSS dönüşümünü uygular.** Kaynak etiketleri `uppercase`
sınıfı taşıyor; `innerText` onları "ARAÇ SAHİBİ BEYANI" diye döndürür ve
arama başarısız olur. Ham metin için `textContent` kullanın —
`yardimcilar.js` içindeki `hamMetin()` bunu yapıyor. Bu tuzağa geliştirme
sırasında iki kez düşüldü.

**2. `button[aria-expanded]` seçicisi hamburger'i bulmaz.** Sayfada birden çok
öğede `aria-expanded` var (hesap menüsü, hamburger, bildirim zili) ve o seçici
ilkini yakalar. Hamburger için `button[aria-label='Menüyü aç']`, hesap menüsü
için `button[aria-controls='hesap-menusu']` kullanın.
Bu yüzden bir kez çekmecenin bozuk olduğu sanıldı; oysa yanlış butona
tıklanıyordu.

## PIN neden ortam değişkeninde tutulmuyor

Testler eskiden `OTOCV_TEST_PIN` okuyordu. PIN güvenlik gerekçesiyle
yenilendiğinde o değer sessizce eskidi ve 12 test var olmayan bir PIN'e gitti.

Plaka birincil anahtar ve hiç değişmiyor. PIN'e ihtiyaç duyan test onu
çalışma anında plakadan çözüyor:

```js
const pin = await pinBul('41IHH434');   // ya da: await ornekPin()
```

Sonuç: PIN döndürme (rotation) hiçbir test dosyasını etkilemiyor. Güvenlik
işini ucuzlatan tam da bu — PIN yenilemek artık tek bir SQL komutu.
