// =========================================================================
// MESAJ SERVİSİ
//
// -------------------------------------------------------------------------
// NİYE HEPSİ RPC
// -------------------------------------------------------------------------
// `konusmalar` tablosu araç kimliğini PLAKA ile tutuyor. İstemciye açık
// olsaydı, pazaryerinde bilerek gizlenen plaka mesaj listesi üzerinden
// okunabilirdi — favorilerde tam olarak bu hata yapılmış ve kapatılmıştı.
// Fonksiyonlar PIN alıyor, PIN döndürüyor.
//
// Tek istisna `mesajlar` tablosunun SELECT'i: anlık teslim için Realtime
// o tabloyu dinliyor ve Realtime, RLS politikası olmayan tablodan satır
// yaymıyor. INSERT/UPDATE yine yalnızca RPC'den geçiyor.
//
// -------------------------------------------------------------------------
// OTURUM KORUMASI
// -------------------------------------------------------------------------
// Fonksiyonlar yalnızca `authenticated`'a açık. Ziyaretçi çağırınca
// "permission denied" dönüyor ve konsola hata basılıyordu; anasayfada bu
// Next.js hata katmanını açıp gerçek bir sorun varmış gibi gösteriyor.
// Beklenen durumu hata diye raporlamak gerçek hataları gürültüye boğuyor.
// =========================================================================

import { supabase } from '../lib/supabase';
import { zamanAsimiyla, agHatasiMetni } from '../lib/istek';

const HATA_METNI = {
  oturum_yok:     'Mesaj göndermek için giriş yapın.',
  bulunamadi:     'Konuşma bulunamadı.',
  kendi_aracin:   'Kendi aracınıza mesaj gönderemezsiniz.',
  sahipsiz:       'Bu aracın kayıtlı sahibi yok.',
  govde_gecersiz: 'Mesaj boş olamaz ve 2000 karakteri aşamaz.',
  sebep_gecersiz: 'Geçersiz şikayet sebebi.',
};

async function oturumVarMi() {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/** RPC yanıtını tek tip sonuca çeviriyor. */
function sonuc(data, error, varsayilanHata) {
  if (error) return { basarili: false, hata: agHatasiMetni(error) || varsayilanHata };
  if (!data?.basarili) return { basarili: false, hata: HATA_METNI[data?.hata] || varsayilanHata };
  return { basarili: true, veri: data };
}

/**
 * Araç sahibiyle yeni konuşma başlatır (ya da var olana mesaj ekler).
 *
 * `engellendi` alanı ÇAĞIRANA GÖSTERİLMİYOR: engellenen kullanıcı
 * engellendiğini görmemeli, yoksa misilleme için ikinci hesap açıyor.
 * Bu yüzden bu durumda da başarı dönüyor ve mesaj gitmiş gibi görünüyor.
 */
export async function konusmaBaslat(pin, govde) {
  if (!(await oturumVarMi())) return { basarili: false, hata: HATA_METNI.oturum_yok };

  const { data, error } = await zamanAsimiyla(
    supabase.rpc('konusma_baslat', { p_pin: pin, p_govde: govde })
  );
  return sonuc(data, error, 'Mesaj gönderilemedi.');
}

export async function mesajGonder(konusmaId, govde) {
  if (!(await oturumVarMi())) return { basarili: false, hata: HATA_METNI.oturum_yok };

  const { data, error } = await zamanAsimiyla(
    supabase.rpc('mesaj_gonder', { p_konusma_id: konusmaId, p_govde: govde })
  );
  return sonuc(data, error, 'Mesaj gönderilemedi.');
}

export async function konusmalarim() {
  if (!(await oturumVarMi())) return { veri: [], hata: null };

  const { data, error } = await zamanAsimiyla(supabase.rpc('konusmalarim'));
  if (error) return { veri: [], hata: agHatasiMetni(error) || 'Konuşmalar yüklenemedi.' };
  return { veri: Array.isArray(data) ? data : [], hata: null };
}

export async function mesajlariGetir(konusmaId) {
  if (!(await oturumVarMi())) return { basarili: false, hata: HATA_METNI.oturum_yok };

  const { data, error } = await zamanAsimiyla(
    supabase.rpc('mesajlar_getir', { p_konusma_id: konusmaId })
  );
  return sonuc(data, error, 'Konuşma yüklenemedi.');
}

export async function okunduIsaretle(konusmaId) {
  if (!(await oturumVarMi())) return;
  // Sessiz: okundu işareti kullanıcının yaptığı bir iş değil, yan etki.
  // Başarısız olması ekranda hata göstermeyi hak etmiyor.
  await supabase.rpc('okundu_isaretle', { p_konusma_id: konusmaId });
}

export async function okunmamisSayisi() {
  if (!(await oturumVarMi())) return 0;
  const { data, error } = await supabase.rpc('okunmamis_mesaj_sayisi');
  if (error) return 0;
  return Number(data) || 0;
}

export async function konusmaEngelle(konusmaId, kaldir = false) {
  if (!(await oturumVarMi())) return { basarili: false, hata: HATA_METNI.oturum_yok };

  const { data, error } = await zamanAsimiyla(
    supabase.rpc('konusma_engelle', { p_konusma_id: konusmaId, p_kaldir: kaldir })
  );
  return sonuc(data, error, 'İşlem tamamlanamadı.');
}

export const SIKAYET_SEBEPLERI = [
  { kod: 'taciz',            ad: 'Taciz veya tehdit' },
  { kod: 'dolandiricilik',   ad: 'Dolandırıcılık şüphesi' },
  { kod: 'spam',             ad: 'İstenmeyen tanıtım' },
  { kod: 'uygunsuz_icerik',  ad: 'Uygunsuz içerik' },
  { kod: 'diger',            ad: 'Diğer' },
];

export async function konusmaSikayetEt(konusmaId, sebep, aciklama) {
  if (!(await oturumVarMi())) return { basarili: false, hata: HATA_METNI.oturum_yok };

  const { data, error } = await zamanAsimiyla(
    supabase.rpc('konusma_sikayet_et', {
      p_konusma_id: konusmaId, p_sebep: sebep, p_aciklama: aciklama || null,
    })
  );
  return sonuc(data, error, 'Şikayet gönderilemedi.');
}

/**
 * Bir konuşmadaki yeni mesajları anlık dinler.
 *
 * Yoklama yerine Realtime: yüz binlerce kullanıcı hedefinde her açık
 * yazışmanın saniyede bir sorgu atması, sicil sorgusundaki çift çağrı
 * sorununun çok daha büyüğü olurdu.
 *
 * Yayın RLS'e uyuyor: teslim edilmemiş (engellenmiş) mesaj karşı tarafa
 * DÜŞMÜYOR, çünkü politika onu zaten göstermiyor.
 *
 * @returns {() => void} aboneliği kapatan fonksiyon
 */
export function mesajlariDinle(konusmaId, geldiginde) {
  const kanal = supabase
    .channel(`mesajlar:${konusmaId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mesajlar', filter: `konusma_id=eq.${konusmaId}` },
      (yuk) => geldiginde?.(yuk.new)
    )
    .subscribe();

  return () => { supabase.removeChannel(kanal); };
}
