// =========================================================================
// CANLI OLAY KÖPRÜSÜ
//
// -------------------------------------------------------------------------
// SİNYAL / VERİ AYRIMI
// -------------------------------------------------------------------------
// Ekranların anlık güncellenmesi için her tabloyu Realtime'a açmak
// gerekmiyor — açmamalı da: `konusmalar` ve `devir_istekleri` tabloları
// `vehicle_plate` tutuyor ve plaka üründe bilerek gizli (pazaryerinden ve
// devir akışından tam bu gerekçeyle kaldırıldı). Realtime satırın TAMAMINI
// yayınladığı için o tabloları açmak plakayı istemciye vermek olurdu.
//
// Bunun yerine:
//   · SİNYAL, RLS'i kendi kendine yeterli olan tek tablodan gelir:
//     `notifications`. Zaten publication'da ve zaten dinleniyor.
//   · VERİ her zaman RPC'den gelir (`devir_bekleyenlerim`, `konusmalarim`…),
//     yani plaka hiçbir adımda geçmez.
//
// Sinyal veri taşımıyor, yalnızca "tazele" diyor. Bu ayrım korunduğu sürece
// yeni bir ekranı canlandırmak tek satır kod ve sıfır yeni erişim demek.
//
// -------------------------------------------------------------------------
// NİYE CONTEXT DEĞİL, `window` OLAYI
// -------------------------------------------------------------------------
// Sinyali context değerine koymak, `NotificationProvider`ın TÜM
// tüketicilerini her bildirimde yeniden render ederdi. Dinleyen ekranların
// istediği render değil, TETİK. Projede bu kalıp zaten yerleşik:
// `AVATAR_DEGISTI` (`src/services/hesapService.js`).
// =========================================================================

/** Yeni bildirim geldiğinde yayılan olay. */
export const BILDIRIM_GELDI = 'otocv:bildirim-geldi';

/**
 * Sinyali yayar. TEK çağıranı `NotificationContext`in realtime işleyicisi.
 *
 * Bildirimin türü ayrıntıya konuyor ki dinleyen taraf ilgilenmediği bir
 * bildirimde boşuna sorgu atmasın.
 */
export function bildirimDuyur(bildirim) {
  if (typeof window === 'undefined' || !bildirim) return;
  window.dispatchEvent(
    new CustomEvent(BILDIRIM_GELDI, {
      detail: { tur: bildirim.type || 'info', hedef: bildirim.hedef_yol || null, id: bildirim.id },
    })
  );
}
