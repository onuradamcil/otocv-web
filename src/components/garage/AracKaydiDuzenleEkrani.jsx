// =========================================================================
// ARAÇ KAYDI DÜZENLEME (vitrin bilgileri)
//
// -------------------------------------------------------------------------
// NİYE VAR — ÇIKIŞSIZ YOL VARDI
// -------------------------------------------------------------------------
// Vitrin kartı ekranı, araç kaydında il/ilçe/açıklama eksikse "önce araç
// kaydınızı tamamlayın" diyordu. Ama kayda ait tek bağlantı `/details/[pin]`
// idi ve o sayfa SALT OKUNUR. Yani kullanıcı bir şeyi düzeltmesi
// söyleniyordu, düzeltecek yer yoktu.
//
// Ürün genelinde de bir boşluktu: araç kaydedilebiliyor ama sonradan
// düzeltilemiyordu. Yanlış yazılan bir açıklama kalıcıydı.
//
// -------------------------------------------------------------------------
// NİYE YALNIZCA DÖRT ALAN
// -------------------------------------------------------------------------
// Bu ekran tam bir araç düzenleyicisi DEĞİL. Yalnızca vitrinin zorunlu
// kıldığı ve değiştirilmesi zararsız olan alanları açıyor:
//   il · ilçe · başlık · açıklama
//
// Marka, model, yıl, km ve plaka bilerek dışarıda: bunlar sicilin kimliği.
// Km'nin serbestçe düşürülebilmesi puanlamadaki kilometre tutarlılığı
// denetimini anlamsız kılardı; plaka değişimi ise aracın kendisini
// değiştirmek olurdu. Onların düzeltilmesi ayrı bir karar.
//
// ⚠ SAYFA, MODAL DEĞİL. Projedeki kural: çok alanlı form + paylaşılabilir
// adres + mobilde klavye = sayfa.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../common/icons';
import { dugme } from '../common/dugme';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { TURKEY_LOCATIONS } from '../../data/turkeyLocations';

const ACIKLAMA_ASGARI = 20;

export default function AracKaydiDuzenleEkrani({ pin }) {
  const router = useRouter();
  const toast = useToast();

  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | hazir | yok | hata
  const [arac, setArac] = useState(null);
  const [form, setForm] = useState({ city: '', district: '', title: '', description: '' });
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    let iptal = false;

    (async () => {
      // ⚠ try/catch ŞART: reddedilen promise hata sınırına ulaşmıyor ve
      // ekran sonsuza kadar iskelette kalıyor.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (iptal) return;
        if (!user) { setDurum('yok'); return; }

        // Sahiplik filtresi AÇIK: RLS zaten sahibe kısıtlıyor ama sorgunun
        // kendisi de niyetini söylemeli.
        const { data, error } = await supabase
          .from('vehicles')
          .select('plate_number, pin_code, brand, model, year, km, city, district, title, description')
          .eq('pin_code', String(pin || '').toUpperCase())
          .eq('user_id', user.id)
          .maybeSingle();

        if (iptal) return;
        if (error) { setDurum('hata'); return; }
        if (!data) { setDurum('yok'); return; }

        setArac(data);
        setForm({
          city: data.city || '',
          district: data.district || '',
          title: data.title || '',
          // Zengin metin editöründen gelen HTML sadeleştiriliyor: bu ekran
          // düz metin alanı ve etiketleri olduğu gibi göstermek kullanıcıya
          // kod okutmak olurdu.
          description: String(data.description || '').replace(/<[^>]*>/g, '').trim(),
        });
        setDurum('hazir');
      } catch {
        if (!iptal) setDurum('hata');
      }
    })();

    return () => { iptal = true; };
  }, [pin]);

  const iller = Object.keys(TURKEY_LOCATIONS).sort((a, b) => a.localeCompare(b, 'tr'));
  const ilceler = form.city ? (TURKEY_LOCATIONS[form.city] || []) : [];

  function ilDegisti(il) {
    // İl değişince ilçe SIFIRLANIYOR: eski ilçe yeni ile ait değil ve
    // sessizce kalması kaydı tutarsız yapardı.
    setForm((f) => ({ ...f, city: il, district: '' }));
  }

  const aciklamaYeterli = form.description.trim().length >= ACIKLAMA_ASGARI;
  const gecerli = form.city && form.district && form.title.trim() && aciklamaYeterli;

  async function kaydet(e) {
    e.preventDefault();
    if (!gecerli || kaydediliyor) return;

    setKaydediliyor(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          city: form.city,
          district: form.district,
          title: form.title.trim(),
          description: form.description.trim(),
        })
        .eq('plate_number', arac.plate_number);

      if (error) { toast.hata('Kayıt güncellenemedi.'); return; }

      toast.basari('Araç kaydı güncellendi.');
      router.push(`/garage/${encodeURIComponent(pin)}/vitrin`);
    } catch {
      toast.hata('Kayıt güncellenemedi.');
    } finally {
      setKaydediliyor(false);
    }
  }

  if (durum === 'yukleniyor') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (durum === 'yok' || durum === 'hata') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] grid place-items-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="baslik-bolum text-slate-900">
            {durum === 'yok' ? 'Araç bulunamadı' : 'Kayıt yüklenemedi'}
          </h1>
          <p className="metin-yardimci text-slate-500">
            {durum === 'yok'
              ? 'Bu araç sizin garajınızda görünmüyor.'
              : 'Bağlantı kurulamadı. Lütfen tekrar deneyin.'}
          </p>
          <Link href="/garage" className={dugme('birincil')}>Garajıma Dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <form onSubmit={kaydet} className="max-w-2xl mx-auto space-y-5">

        <div className="border-b border-slate-200 pb-4">
          <h1 className="baslik-sayfa text-slate-900">Araç Kaydını Düzenle</h1>
          <p className="metin-yardimci text-slate-500 mt-1">
            {arac.year} {arac.brand} {arac.model} — vitrin kartı bu bilgileri buradan alıyor.
          </p>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="etiket text-slate-400">İl</span>
              <select
                value={form.city}
                onChange={(e) => ilDegisti(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 metin-govde text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              >
                <option value="">Seçiniz</option>
                {iller.map((il) => <option key={il} value={il}>{il}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="etiket text-slate-400">İlçe</span>
              <select
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                disabled={!form.city}
                className="mt-1.5 w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 metin-govde text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors disabled:opacity-50"
              >
                <option value="">{form.city ? 'Seçiniz' : 'Önce il seçin'}</option>
                {ilceler.map((ilce) => <option key={ilce} value={ilce}>{ilce}</option>)}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="etiket text-slate-400">Başlık</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={120}
              placeholder={`${arac.year} ${arac.brand} ${arac.model}`}
              className="mt-1.5 w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 metin-govde text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </label>

          <label className="block">
            <span className="etiket text-slate-400">Açıklama</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={6}
              maxLength={4000}
              placeholder="Aracın durumu, bakım geçmişi ve bilinmesini istediğiniz noktalar."
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 metin-govde text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors resize-none"
            />
            <span className={`metin-yardimci mt-1 block ${aciklamaYeterli ? 'text-slate-400' : 'text-amber-700'}`}>
              {aciklamaYeterli
                ? `${form.description.trim().length}/4000`
                : `En az ${ACIKLAMA_ASGARI} karakter yazın (${form.description.trim().length}).`}
            </span>
          </label>

          {/* ⚠ NİYE MARKA/MODEL/KM YOK — kullanıcı aramasın diye söyleniyor. */}
          <p className="metin-yardimci text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl p-3 leading-relaxed">
            Marka, model, yıl, kilometre ve plaka buradan değiştirilemez. Bunlar sicilin
            kimliğini oluşturuyor; kilometrenin serbestçe düzeltilebilmesi sicil puanındaki
            kilometre tutarlılığı denetimini anlamsız kılardı.
          </p>
        </section>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/garage/${encodeURIComponent(pin)}/vitrin`} className={dugme('ikincil', { ek: 'flex-1' })}>
            Vazgeç
          </Link>
          <button type="submit" disabled={!gecerli || kaydediliyor} className={dugme('birincil', { ek: 'flex-1' })}>
            <Icon name="onay" size="sm" />
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
