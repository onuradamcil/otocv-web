# E-posta şablonları

Supabase Auth'un gönderdiği e-postaların HTML'i burada tutuluyor.

## ⚠ Niye depoda

Bu şablonlar **yalnızca Supabase panelinde** duruyordu. Yani:

- Sürüm takibi yok — kim ne zaman değiştirdi bilinmiyor
- Gözden geçirme yok — bir hata girerse kimse görmüyor
- Yedek yok — panel kaybolursa şablon da kaybolur

Nitekim gözden geçirilmediği için bir hata sessizce yaşamış:
`parola-sifirla.html` içinde `border-b: 1px solid #f1f5f9` yazıyor.
**`border-b` geçerli bir CSS özelliği değil** (Tailwind sözdizimi sızmış);
logonun altındaki çizgi hiç çizilmiyor.

⚠ **Bu dosyalar kaynak değil, KOPYA.** Supabase panelden okuyor, buradan
değil. Panelde bir şey değiştirirseniz buraya da yazın, yoksa ikisi ayrışır.

## Dosyalar

| Dosya | Supabase şablonu | Durum |
|---|---|---|
| `parola-sifirla.html` | `recovery` (Reset Password) | Canlıda · ⚠ `border-b` hatası duruyor |
| `parola-degisti.html` | `auth.email.notification.password_changed` | ⚠ Bildirim **kapalı**, açılması gerekiyor |

## Konu satırları

```
🔒 Parolanızı Sıfırlayın   | Oto.CV Güvenlik Ağı
⚠️ Parolanız Değiştirildi  | Oto.CV Güvenlik Ağı
```

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
auth.email.notification.password_changed       ← hazır, bu depoda
auth.email.notification.email_changed
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
