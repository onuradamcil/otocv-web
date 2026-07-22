// =========================================================================
// SÜREKLİ MOTORU: SUPABASE SINGLETON BAĞLANTI SÜRÜCÜSÜ (supabase.js)
// İşlev: Next.js HMR yenilemelerinde çift istemci (client) türemesini 
//        engeller ve oturum yönetimini akıllı depolamaya bağlar.
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const customStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    const isRememberMe = localStorage.getItem('otocv_remember_me') !== 'false';
    if (isRememberMe) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

// 🚀 SİBER GÜVENCE: Sunucu ve İstemci ortamını tam izole ederek Singleton koruması sağlıyoruz
let supabaseClient;

if (typeof window !== 'undefined') {
  // Tarayıcı (Client) tarafındaysak global pencere hafızasını kullan kanka
  if (!globalThis.supabaseInstance) {
    globalThis.supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: customStorage,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  supabaseClient = globalThis.supabaseInstance;
} else {
  // Sunucu (Server Side) tarafındaysak her istek için temiz tekil istemci üret
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false // Sunucuda session persist edilmez kanka
    }
  });
}

export const supabase = supabaseClient;