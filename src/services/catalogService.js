// =========================================================================
// OTO-CV MİMARİ KATMANI: DYNAMIC LAZY LOADING KATALOG SERVİSİ
// İşlev: Step 2 ve Filtreleme için Supabase kataloğundan adım adım veri çeker.
// =========================================================================

import { supabase } from '../lib/supabase';

/**
 * 1. Markaları Çek (Sayfa Açılışında - Sadece ~2KB)
 */
export const fetchCatalogBrands = async () => {
  try {
    const { data, error } = await supabase
      .from('car_brands')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Marka çekme hatası:', error.message);
    return [];
  }
};

/**
 * 2. Markaya Göre Model Serilerini Çek (Örn: BMW -> 3 Serisi, 5 Serisi)
 */
export const fetchCatalogSeries = async (brandId) => {
  if (!brandId) return [];
  try {
    const { data, error } = await supabase
      .from('car_series')
      .select('id, name')
      .eq('brand_id', brandId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Seri çekme hatası:', error.message);
    return [];
  }
};

/**
 * 3. Seriye Göre Motor / Alt Modelleri Çek (Örn: 3 Serisi -> 320i, 320d)
 */
export const fetchCatalogModels = async (seriesId) => {
  if (!seriesId) return [];
  try {
    const { data, error } = await supabase
      .from('car_models')
      .select('id, name')
      .eq('series_id', seriesId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Alt model çekme hatası:', error.message);
    return [];
  }
};

/**
 * 4. Alt Modele Göre Donanım Paketlerini Çek (Örn: 320i -> First Edition M Sport)
 */
export const fetchCatalogPackages = async (modelId) => {
  if (!modelId) return [];
  try {
    const { data, error } = await supabase
      .from('car_packages')
      .select('id, name')
      .eq('model_id', modelId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Paket çekme hatası:', error.message);
    return [];
  }
};