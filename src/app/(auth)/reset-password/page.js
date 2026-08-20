// =========================================================================
// OTO-CV ŞİFRE SIFIRLAMA ROUTE'U ((full)/reset-password/page.js)
// İşlev: E-posta kurtarma linkinin indiği adres. Eski route.js yönlendirme
//        hilesinin yerini alır.
//
// NEDEN OTURUM KAPISI VAR: ResetPasswordScreen doğrudan
// supabase.auth.updateUser({ password }) çağırıyor ve oturumun çoktan
// kurulmuş olduğunu varsayıyor. Kurtarma oturumu, Supabase istemcisinin
// detectSessionInUrl ayarı sayesinde URL'deki token'dan kuruluyor — ama bu
// asenkron. Kapı olmasa kullanıcı formu erken doldurup "oturum yok" hatası
// alır, ya da linki bozuk/süresi geçmişse hiç açıklama görmez.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ResetPasswordScreen from '@/components/ResetPasswordScreen';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // 'checking' | 'ready' | 'invalid'

  useEffect(() => {
    let settled = false;

    const markReady = () => {
      if (settled) return;
      settled = true;
      setStatus('ready');
    };

    // 1) Token URL'den zaten işlenmiş olabilir
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    // 2) İşlenme sırasında olabilir; olayı bekle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) markReady();
    });

    // 3) Makul süre içinde oturum kurulmadıysa link geçersiz
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setStatus('invalid');
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, []);

  if (status === 'checking') {
    // Tek çark yerine iskelet: gelen içeriğin şeklini taşır.
    // gecikmeMs=200 -> bekleme 200 ms'den kısaysa hiç gösterge çıkmaz;
    // kullanıcı 100 ms'i anlık sayar, orada gösterge yavaş hissettirir.
    return <GlobalStepLoader mode="iskelet" varyant="form" gecikmeMs={200} />;
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-bolum font-semibold text-slate-900 tracking-tight">Bağlantı geçerli değil</h1>
          <p className="text-mini text-slate-500 font-medium leading-relaxed">
            Şifre sıfırlama bağlantısı geçersiz ya da süresi dolmuş. Bağlantılar tek kullanımlıktır ve
            kısa süre sonra geçerliliğini yitirir. Giriş ekranından yeni bir bağlantı isteyebilirsiniz.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-mini py-3 rounded-md transition-colors cursor-pointer"
            >
              Giriş Ekranına Dön
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-mini py-3 rounded-md transition-colors cursor-pointer"
            >
              Anasayfa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ResetPasswordScreen
      onSuccess={() => router.push('/')}
      onBack={() => router.push('/')}
    />
  );
}
