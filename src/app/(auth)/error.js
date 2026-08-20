// =========================================================================
// (auth) HATA SINIRI ((auth)/error.js)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// `(auth)` grubunun hiç hata sınırı yoktu: giriş, kayıt ve şifre sıfırlama
// ekranlarındaki bir çökme kök sınıra (`src/app/global-error.js`) düşüyor ve
// kullanıcı BOŞ BEYAZ EKRAN görüyordu. 19 Ağustos 2026 beta taramasının
// bulgusu buydu.
//
// Bu ekranlar ürünün giriş kapısı: burada beyaz ekran gören kullanıcı geri
// dönmüyor. Üstelik `(auth)` altında oturum YOK — kullanıcıya "garajına dön"
// demek anlamsız, gidebileceği yer anasayfa ve giriş ekranı.
//
// -------------------------------------------------------------------------
// SINIRIN SINIRI — BİLİNMESİ GEREKEN
// -------------------------------------------------------------------------
// Hata sınırları YALNIZCA render ve efekt sırasında FIRLATILAN hataları
// yakalar. Reddedilen bir promise (`supabase.auth.signInWithPassword`
// başarısız olursa) buraya HİÇ ULAŞMAZ — o yol zaten `try/catch` ile
// kendi hata mesajını basıyor. Bu dosya son çare, tek çare değil.
//
// ⚠ TEKNİK AYRINTI KULLANICIYA GÖSTERİLMİYOR ama konsola YUTULMADAN
// yazılıyor: hata mesajında oturum belirteci ya da e-posta geçebilir.
// =========================================================================

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/common/icons';

export default function AuthError({ error, reset }) {
  useEffect(() => {
    console.error('Oturum ekranı hatası:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <span className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 grid place-items-center mx-auto">
          <Icon name="uyari" size="xl" />
        </span>

        <div className="space-y-2">
          <h1 className="baslik-bolum text-slate-900">Bu ekran açılamadı</h1>
          {/* ⚠ "Hesabınız etkilenmedi" cümlesi ölçülü bir iddia: bu sınır
              yalnızca ARAYÜZ hatasında devreye giriyor, veriye dokunulmuyor.
              Uydurma bir güvence değil. */}
          <p className="metin-yardimci text-slate-500 leading-relaxed">
            Beklenmedik bir sorun oluştu. Hesabınız etkilenmedi; birazdan
            tekrar deneyebilirsiniz.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-mini rounded-md transition-colors cursor-pointer focus-visible:ring-offset-2"
          >
            Tekrar Dene
          </button>
          {/* ⚠ `(auth)` altında oturum YOK: "garajıma dön" demek anlamsız
              olurdu, kullanıcı zaten giriş yapmaya çalışıyor. */}
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center min-h-[44px] bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-mini rounded-md transition-colors"
          >
            Anasayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
