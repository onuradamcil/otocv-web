// =========================================================================
// PAROLA KURALLARI LİSTESİ
//
// -------------------------------------------------------------------------
// NİYE VAR — KURALI HATA KUTUSUNDA ÖĞRENMEK
// -------------------------------------------------------------------------
// Ürün sahibi parolasını değiştiremedi ve kuralı ancak gönderdikten sonra,
// kırmızı bir kutuda, İngilizce ve ham karakter dökümü hâlinde gördü:
//
//   "Password should contain at least one character of each:
//    abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789,
//    !@#$%^&*()_+-=[]{};'\:"|<>?,./`~."
//
// Bir formu doldurup göndermek, kuralı öğrenmenin en pahalı yoludur:
// kullanıcı emeğini harcar, reddedilir ve neyin eksik olduğunu ham bir
// listeden çıkarmaya çalışır. Kural formun İÇİNDE, YAZARKEN görünmeli.
//
// -------------------------------------------------------------------------
// ⚠ DURUM RENKLE DEĞİL ŞEKİLLE DE ANLATILIYOR (WCAG 1.4.1)
// -------------------------------------------------------------------------
// Sağlanan kuralda onay işareti, sağlanmayanda boş halka var. Renk körü bir
// kullanıcı yalnızca yeşil/gri farkına bakarak ayırt edemezdi.
//
// ⚠ `aria-live` KULLANILMIYOR VE BU BİLİNÇLİ. Liste her tuş vuruşunda
// değişiyor; canlı bölge olsaydı ekran okuyucu her harfte beş kuralı
// yeniden okurdu. Bunun yerine her satır kendi durumunu metin olarak
// taşıyor ("sağlandı" / "eksik") ve kullanıcı istediğinde okuyabiliyor.
// =========================================================================

'use client';

import React from 'react';
import Icon from './icons';
import { kurallariDenetle, turkceHarfVarMi } from '../../utils/parolaKurali';

/**
 * @param {object}  p
 * @param {string}  p.parola     Denetlenecek parola
 * @param {boolean} [p.gorunur]  false ise hiç çizilmez (alan boşken gizlemek için)
 */
export default function ParolaKurallari({ parola = '', gorunur = true }) {
  if (!gorunur) return null;

  const kurallar = kurallariDenetle(parola);
  const turkce = turkceHarfVarMi(parola);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="block text-etiket font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        Şifre kuralları
      </span>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {kurallar.map((k) => (
          <li
            key={k.ad}
            className={`flex items-center gap-1.5 text-yardimci ${
              k.saglandi ? 'text-emerald-700 font-semibold' : 'text-slate-500 font-medium'
            }`}
          >
            {k.saglandi ? (
              <Icon name="onay" size="xs" aria-hidden="true" />
            ) : (
              /* Boş halka: onay işaretiyle aynı yeri kaplasın diye ölçüsü
                 sabit. Aksi hâlde kural sağlandığında satır yatay kayıyor. */
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 rounded-full border border-slate-300 shrink-0"
              />
            )}
            <span>{k.metin}</span>
            {/* Durum metni yalnızca ekran okuyucuya: renk/şekil görmeyene
                de aynı bilgi gitsin. */}
            <span className="sr-only">{k.saglandi ? '— sağlandı' : '— eksik'}</span>
          </li>
        ))}
      </ul>

      {turkce && (
        /* ⚠ TÜRKÇE ÜRÜNDE GERÇEK BİR TUZAK. Supabase'in kabul ettiği harf
           kümesi ASCII: `ş`, `ğ`, `ü`, `ı`, `ö`, `ç` ne küçük harf ne sembol
           sayılıyor. Uyarı olmadan kullanıcı "harf yazdım, neden kural
           sağlanmadı?" diye arayüzü suçlar. */
        <p className="mt-2 pt-2 border-t border-slate-200 text-yardimci font-medium text-amber-700">
          Türkçe harfler (ğ, ü, ş, ı, ö, ç) kural sayımına girmiyor — İngilizce
          alfabeden harf ekleyin.
        </p>
      )}
    </div>
  );
}
