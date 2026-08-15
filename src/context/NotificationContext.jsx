// =========================================================================
// OTO-CV MİMARİ KATMANI: REAL-TIME BİLDİRİM CONTEXT SAĞLAYICISI (NotificationContext.jsx)
// İşlev: vehicle_id bağlantısını garantiye alır, anlık sayaç düşürür ve
//        mükerrer bildirim oluşumunu başlık bazlı engeller.
// =========================================================================

'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { parseVehicleDate } from '../utils/dateHelper';
import { plakaBicimle } from '../utils/plaka';
import { bildirimDuyur } from '../lib/canliOlay';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  // =========================================================================
  // 1. BLOK: REAKTİF STATE VE SİBER KİLİT REF MİMARİSİ
  // =========================================================================
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const isSyncingRef = useRef(false);

  // =========================================================================
  // 2. BLOK: ASENKRON BİLDİRİM ÇEKME FONKSİYONU
  // =========================================================================
  const fetchNotifications = async (currentUserId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      const unread = data?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Bildirimler yüklenirken kurumsal hata oluştu:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 🧠 3. BLOK: GARANTİLİ VEHICLE_ID BAĞLANTILI OTOMATİK BİLDİRİM BOTU
  // =========================================================================
  const syncGlobalAutomaticNotifications = async (currentUserId) => {
    if (!currentUserId || isSyncingRef.current) return;

    isSyncingRef.current = true;

    try {
      const { data: userVehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', currentUserId);

      if (!userVehicles || userVehicles.length === 0) return;

      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('title')
        .eq('user_id', currentUserId);

      // =====================================================================
      // ⚠ TEKİLLEŞTİRME ANAHTARI BAŞLIĞIN AYNISI DEĞİL — BOŞLUKLAR ATILIYOR
      // ---------------------------------------------------------------------
      // Bildirim başlıkları plaka içeriyor ve plaka artık BİÇİMLİ basılıyor
      // ("41 IHH 434"). Eskiden ham basılıyordu ("41IHH434") ve canlıda 216
      // satır o hâliyle duruyor.
      //
      // Anahtar başlığın birebir kendisi olsaydı, biçim değişikliği eski
      // satırlarla eşleşmez ve VAR OLAN HER BİLDİRİMİN KOPYASI yeniden
      // üretilirdi — kullanıcı aynı uyarıyı iki kez görürdü. Boşlukları
      // atmak iki biçimi aynı anahtara indiriyor:
      //
      //     "[Son 15 Gün] 41IHH434 Trafik Sigortası Yaklaştı"
      //     "[Son 15 Gün] 41 IHH 434 Trafik Sigortası Yaklaştı"
      //         ikisi de -> "[Son15Gün]41IHH434TrafikSigortasıYaklaştı"
      //
      // Böylece eski satırlara DOKUNMADAN kopya üretmeden geçiliyor; yeni
      // bildirimler biçimli, eskiler olduğu gibi kalıyor ve zamanla
      // yerlerini yenilerine bırakıyor.
      //
      // Farklı bildirimlerin çakışma riski yok: başlıkları aşama ("[Son 15
      // Gün]") ve poliçe türü sözcükleriyle ayrışıyor, boşluk atınca da
      // ayrışmaya devam ediyor.
      // =====================================================================
      const baslikAnahtari = (baslik) => String(baslik || '').replace(/\s+/g, '');

      const existingTitles = new Set(
        existingNotifs?.map(n => baslikAnahtari(n.title)) || []
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const car of userVehicles) {
        // NOT: burada eskiden `car.idx ?? car.id ?? null` vardi. vehicles
        // tablosunda ne idx ne id kolonu var (birincil anahtar plate_number),
        // dolayisiyla sonuc DAIMA null oluyordu. Ustelik notifications.vehicle_id
        // tipi uuid, arac kimligi ise varchar plaka — doldurulsa bile uyumsuz.
        // Bildirimden araca gitme ozelligi bir sema degisikligi gerektiriyor;
        // o zamana kadar alan hic yazilmiyor.

        const policyCheckList = [
          { typeName: 'Trafik Sigortası', dateStr: car.traffic_insurance_end_date },
          { typeName: 'Kasko Poliçesi', dateStr: car.kasko_end_date },
          { typeName: 'TÜVTÜRK Muayenesi', dateStr: car.inspection_end_date }
        ];

        for (const item of policyCheckList) {
          const parsed = parseVehicleDate(item.dateStr);
          if (!parsed || isNaN(parsed.getTime())) continue;

          parsed.setHours(0, 0, 0, 0);
          const timeDiff = parsed.getTime() - today.getTime();
          const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          let stageKey = null;
          let notifPayload = null;

          if (daysLeft <= 0) {
            stageKey = `[Süresi Doldu]`;
            notifPayload = {
              title: `${stageKey} ${plakaBicimle(car.plate_number)} ${item.typeName} Süresi Doldu!`,
              message: `${car.brand} ${car.model} (${plakaBicimle(car.plate_number)}) aracınızın ${item.typeName.toLowerCase()} süresi dolmuştur. Aracınız teminatsız durumdadır.`,
              type: 'danger'
            };
          } else if (daysLeft <= 7) {
            stageKey = `[Son 7 Gün]`;
            notifPayload = {
              title: `${stageKey} ${plakaBicimle(car.plate_number)} ${item.typeName} Bitiyor!`,
              message: `${car.brand} ${car.model} (${plakaBicimle(car.plate_number)}) aracınızın ${item.typeName.toLowerCase()} bitimine son ${daysLeft} gün kaldı. Teklifinizi hemen alın.`,
              type: 'danger'
            };
          } else if (daysLeft <= 15) {
            stageKey = `[Son 15 Gün]`;
            notifPayload = {
              title: `${stageKey} ${plakaBicimle(car.plate_number)} ${item.typeName} Yaklaştı`,
              message: `${car.brand} ${car.model} (${plakaBicimle(car.plate_number)}) aracınızın ${item.typeName.toLowerCase()} bitimine ${daysLeft} gün kaldı. Fiyatları karşılaştırın.`,
              type: 'warning'
            };
          } else if (daysLeft <= 30) {
            stageKey = `[Son 30 Gün]`;
            notifPayload = {
              title: `${stageKey} ${plakaBicimle(car.plate_number)} ${item.typeName} 1 Ay Kaldı`,
              message: `${car.brand} ${car.model} (${plakaBicimle(car.plate_number)}) aracınızın ${item.typeName.toLowerCase()} süresi 1 ay sonra doluyor.`,
              type: 'warning'
            };
          }

          if (notifPayload) {
            const anahtar = baslikAnahtari(notifPayload.title);

            if (!existingTitles.has(anahtar)) {
              existingTitles.add(anahtar);

              const { error: insertErr } = await supabase
                .from('notifications')
                .insert({
                  user_id: currentUserId,
                  title: notifPayload.title,
                  message: notifPayload.message,
                  type: notifPayload.type,
                  is_read: false
                });

              if (insertErr) {
                console.error('❌ Supabase Bildirim Yazma Hatası:', insertErr.message);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Küresel otomatik bildirim bot hatası:', err.message);
    } finally {
      isSyncingRef.current = false;
    }
  };

  // =========================================================================
  // 4. BLOK: AUTH VE REAL-TIME YAŞAM DÖNGÜSÜ
  // =========================================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uId = session?.user?.id || null;
      setUserId(uId);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications(userId);
    syncGlobalAutomaticNotifications(userId);

    const channel = supabase
      .channel(`user_notifications_${userId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
            // Ekranlara "tazele" sinyali. Gerekçesi `src/lib/canliOlay.js`
            // başlığında: `devir_istekleri` ve `konusmalar` Realtime'a
            // açılmıyor (plaka tutuyorlar); bildirim akışı sinyal, veri
            // her zaman RPC'den geliyor.
            bildirimDuyur(payload.new);
          }
          else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            );
            setUnreadCount(prev => {
              if (payload.old.is_read === false && payload.new.is_read === true) {
                return Math.max(0, prev - 1);
              }
              return prev;
            });
          }
          else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            setUnreadCount(prev => payload.old.is_read ? prev : Math.max(0, prev - 1));
          }
        }
      );

    // ⚠ DURUM GERİ ÇAĞIRMASI ŞART: `subscribe()` argümansız çağrıldığında
    // `CHANNEL_ERROR` ve `TIMED_OUT` sessizce yutuluyor. Mesaj realtime'ı
    // aylarca bu yüzden bozuk kalabilirdi — abonelik kuruluyor sanılıyordu.
    channel.subscribe((durum, hata) => {
      if (durum === 'CHANNEL_ERROR' || durum === 'TIMED_OUT') {
        console.error(`Bildirim aboneliği kurulamadı (${durum}):`, hata?.message || '');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // =========================================================================
  // 5. BLOK: DIŞARIYA AÇILAN SİBER AKSİYONLAR
  // =========================================================================
  const deleteNotification = async (notificationId) => {
    try {
      const targetNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (targetNotif && !targetNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.error('Bildirim silinirken hata oluştu:', err.message);
      if (userId) fetchNotifications(userId);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const targetNotif = notifications.find(n => n.id === notificationId);
      if (!targetNotif || targetNotif.is_read) return;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.error('Bildirim güncellenirken hata oluştu:', err.message);
      if (userId) fetchNotifications(userId);
    }
  };

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      console.error('Tüm bildirimler güncellenirken hata oluştu:', err.message);
      if (userId) fetchNotifications(userId);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      markAsRead, 
      markAllAsRead, 
      deleteNotification,
      refreshNotifications: () => userId && fetchNotifications(userId) 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications, NotificationProvider içinde kullanılmalıdır.');
  }
  return context;
}