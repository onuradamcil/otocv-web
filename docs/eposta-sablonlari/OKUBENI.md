# E-posta şablonları

Supabase Auth'un gönderdiği e-postaların HTML'i burada tutuluyor.

## ⚠ Niye depoda

Bu şablonlar **yalnızca Supabase panelinde** duruyordu. Yani:

- Sürüm takibi yok — kim ne zaman değiştirdi bilinmiyor
- Gözden geçirme yok — bir hata girerse kimse görmüyor
- Yedek yok — panel kaybolursa şablon da kaybolur

Nitekim gözden geçirilmediği için iki hata sessizce yaşamış ve ikisi de
**22.08.2026'da düzeltildi**:

1. `parola-sifirla.html` içinde `border-b: 1px solid #f1f5f9` yazıyordu.
   **`border-b` geçerli bir CSS özelliği değil** (Tailwind sözdizimi
   sızmış); logonun altındaki çizgi hiç çizilmiyordu.
2. Logo `<span>` içindeydi ve Gmail onu kendisi bağlantıya çeviriyordu:
   `.cv` gerçek bir alan adı uzantısı olduğu için "OTO.CV" adres sanılıyor
   ve marka adı, **sahip olmadığımız `oto.cv`** adresine giden mavi bir
   linke dönüşüyordu. Canlıda görüldü. Artık hepsi bilerek `<a>`.

⚠ Düzeltmeler bu dosyalarda. **Panele de yapıştırılması gerekiyor** —
kaynak Supabase panelidir, bu klasör kopyadır.

⚠ **Bu dosyalar kaynak değil, KOPYA.** Supabase panelden okuyor, buradan
değil. Panelde bir şey değiştirirseniz buraya da yazın, yoksa ikisi ayrışır.

## Dosyalar

| Dosya | Supabase şablonu | Durum |
|---|---|---|
| `parola-sifirla.html` | `recovery` — Reset Password | Canlıda · ⚠ düzeltilmiş hâli panele yapıştırılmalı |
| `parola-degisti.html` | `auth.email.notification.password_changed` | ✅ Canlıda, bildirim **açık**, test edildi |
| `eposta-degisimi-onayla.html` | `email_change` — Change Email Address | ⚠ Panelde fabrika şablonu duruyor (İngilizce) |
| `eposta-degisti.html` | `auth.email.notification.email_changed` | ⚠ Bildirim **kapalı**, açılması gerekiyor |
| `hesap-dogrula.html` | `confirmation` — Confirm signup | ⚠ "Confirm email" ayarı **kapalı**; kod hazır |

Her dosyanın `.SADE.html` eşi var: yorumsuz, doğrudan panele yapıştırılabilir.


## ⚠ E-POSTA DEĞİŞİMİNDE İKİ AYRI ŞABLON VAR — KARIŞTIRMAYIN

Bu ikisi farklı anlarda, farklı işler için gider:

| Şablon | Ne zaman | Kime | Ne yapar |
|---|---|---|---|
| `eposta-degisimi-onayla.html` (`email_change`) | Talep anında, **hemen** | Eski + yeni adres | Değişikliği **onaylatır** |
| `eposta-degisti.html` (`...notification.email_changed`) | Onay **tamamlandıktan sonra** | Eski + yeni adres | Olup bittiğini **haber verir** |

⚠ İlki eksik bırakılırsa Supabase'in **fabrika şablonu** gider: İngilizce
"Confirm your new email address", markasız, bağlantılı. 22.08.2026'da canlıda
tam olarak bu yaşandı.

⚠ İkincisi bir **bildirim** ve öntanımlı **kapalı** gelir — şablonu
yapıştırmak yetmez, anahtarını da açmak gerekir.

## Konu satırları

```
🔒 Parolanızı Sıfırlayın            | Oto.CV Güvenlik Ağı
⚠️ Parolanız Değiştirildi           | Oto.CV Güvenlik Ağı
⚠️ E-posta Adresiniz Değiştirildi   | Oto.CV Güvenlik Ağı
Doğrulama kodunuz                   | Oto.CV Güvenlik Ağı
E-posta değişikliğinizi onaylayın   | Oto.CV Güvenlik Ağı
```

## ⚠ Kayıt doğrulaması: BAĞLANTI DEĞİL KOD

`hesap-dogrula.html` yalnızca `{{ .Token }}` kullanıyor, `{{ .ConfirmationURL }}`
**kullanmıyor** — ürün sahibinin kararı. Sihirli bağlantı kullanıcıyı
postadan tarayıcıya atlatıyor ve mobilde çoğu zaman yanlış tarayıcıda
açılıyor; oradaki oturum kayıt formunun açık olduğu sekmeyle aynı değil.

**Şablona bağlantı EKLEMEYİN.** Eklenirse iki ayrı doğrulama yolu doğar:
kullanıcı bağlantıya tıklayıp başka sekmede doğrulanır, kod ekranı ise açık
kalıp "kod geçersiz" der.

## Kullanılabilir değişkenler

Hepsi her şablonda geçerli **değil**:

| Değişken | Nerede geçerli |
|---|---|
| `{{ .ConfirmationURL }}` | Onay gerektiren akışlar (kayıt, sıfırlama, e-posta değişimi) |
| `{{ .Token }}` / `{{ .TokenHash }}` | Tek kullanımlık kod ile giriş |
| `{{ .SiteURL }}` | Her yerde — panelden gelir (Authentication → URL Configuration) |
| `{{ .Email }}` | Her yerde |
| `{{ .Data.* }}` | `auth.users.raw_user_meta_data` içindekiler |
| `{{ .OldEmail }}` | Yalnızca `email_changed` bildirimi |
| `{{ .OldPhone }}` / `{{ .Phone }}` | Yalnızca `phone_changed` bildirimi |
| `{{ .Provider }}` | Yalnızca `identity_linked` / `identity_unlinked` |

⚠ **`{{ .Data.first_name }}` KULLANMAYIN.** Ölçüldü (21.08.2026): 8 hesabın
**0'ında** `first_name` yok; yalnızca 2 Google hesabında `full_name` var.
Kullanılırsa kullanıcıların çoğuna "Merhaba ," gider.

⚠ **`{{ .SiteURL }}` panelden gelir, `.env.local`'den değil.** İkisi ayrı
ayarlar. Canlıya çıkmadan önce Authentication → URL Configuration'da
gerçek adres yazdığını doğrulayın; `localhost` kalırsa e-postadaki
bağlantılar gerçek kullanıcıda çalışmaz.

## Açılması gereken diğer güvenlik bildirimleri

Supabase yedi tane getiriyor ve **hepsi öntanımlı kapalı**:

```
auth.email.notification.password_changed       ← AÇIK, bu depoda
auth.email.notification.email_changed          ← hazır, bu depoda, KAPALI
auth.email.notification.phone_changed
auth.email.notification.mfa_factor_enrolled
auth.email.notification.mfa_factor_unenrolled
auth.email.notification.identity_linked
auth.email.notification.identity_unlinked
```

⚠ **Bu bildirimlere güvenlik KONTROLÜ olarak yaslanmayın.** SMTP arızası
bildirimi sessizce yutar — parola yine değişir, yalnızca uyarı loglanır.
Bildirim bir tespit aracıdır, engel değil.

## Gönderici adresi

Şu an Brevo'da gönderici `otocv.com@gmail.com`. ⚠ Brevo ücretsiz webmail
adreslerini doğrulayamıyor ve gönderen adresini sessizce değiştiriyor:

```
otocv.com@gmail.com  →  otocv.com@5000001.t-sender-sib.com
```

E-posta reddedilmiyor (gmail.com'un DMARC politikası `p=none`), ama bir
güvenlik uyarısının tanınmayan bir makine adresinden gelmesi kullanıcıyı
kimlik avı şüphesine düşürüyor. Kalıcı çözüm: kendi alan adı + Brevo'da
DKIM/DMARC doğrulaması. Alan adı, ürün adı kesinleşince alınacak.
