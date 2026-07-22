// =========================================================================
// OTO-CV SİBER KÖPRÜ: RESET-PASSWORD SUNUCU YÖNLENDİRİCİSİ (reset-password/route.js)
// İşlev: E-posta linkine tıklayan üyeyi Next.js sunucu taraflı 404 hatasından
//        kurtarır. Gelen tüm token ve hash yapısını bozmadan pürüzsüzce ana sayfaya fırlatır.
// =========================================================================

import { NextResponse } from 'next/server';

export async function GET(request) {
  // Gelen linkin tam URL'ini ve içindeki saklı token parametrelerini yakalıyoruz
  const requestUrl = new URL(request.url);
  
  // Kullanıcıyı, ana sayfamızda kurduğumuz siber radarın (page.js) beklediği konuma,
  // URL'deki tüm şifreli token'ları (?type=recovery vb.) koruyarak şimşek hızında yönlendiriyoruz
  return NextResponse.redirect(`${requestUrl.origin}/?type=recovery`);
}