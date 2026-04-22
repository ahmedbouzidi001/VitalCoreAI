// VitalCore AI — Real Food Logger with OpenFoodFacts API
import { supabase } from './supabase';

export interface FoodItem {
  id: string;
  name: string;
  nameAr?: string;
  brandName?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  quantity_g: number;
  barcode?: string;
  image?: string;
}

export interface FoodLog {
  id?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  quantity_g: number;
  date?: string;
}

// OpenFoodFacts API — free, 3M+ products
export async function searchFoods(query: string, country: string = 'TN'): Promise<FoodItem[]> {
  try {
    const countryMap: Record<string, string> = {
      TN: 'world', MA: 'world', DZ: 'world',
      FR: 'fr', SA: 'world', AE: 'world',
      TR: 'world', GR: 'world', US: 'us', GB: 'uk',
    };
    const cc = countryMap[country] || 'world';
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&cc=${cc}`;
    const res = await fetch(url);
    const data = await res.json();

    return (data.products || [])
      .filter((p: any) => p.nutriments?.['energy-kcal_100g'] !== undefined)
      .slice(0, 10)
      .map((p: any) => ({
        id: p.code || Math.random().toString(36),
        name: p.product_name || p.product_name_fr || query,
        brandName: p.brands,
        calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
        protein: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
        carbs: Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
        fat: Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
        fiber: Math.round((p.nutriments['fiber_100g'] || 0) * 10) / 10,
        quantity_g: 100,
        barcode: p.code,
        image: p.image_small_url || p.image_thumb_url,
      }));
  } catch (e) {
    console.error('OpenFoodFacts search error:', e);
    return [];
  }
}

export async function getProductByBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    return {
      id: barcode,
      name: p.product_name || p.product_name_fr || 'Produit',
      brandName: p.brands,
      calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
      protein: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
      carbs: Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
      fiber: Math.round((p.nutriments['fiber_100g'] || 0) * 10) / 10,
      quantity_g: 100,
      barcode,
      image: p.image_small_url,
    };
  } catch (e) {
    console.error('Barcode lookup error:', e);
    return null;
  }
}

export async function saveFoodLog(userId: string, log: FoodLog): Promise<string | null> {
  const { error } = await supabase.from('food_logs').insert({
    user_id: userId,
    date: log.date || new Date().toISOString().split('T')[0],
    meal_type: log.meal_type,
    food_name: log.food_name,
    calories: log.calories,
    protein: log.protein,
    carbs: log.carbs,
    fat: log.fat,
    fiber: log.fiber,
    quantity_g: log.quantity_g,
  });
  return error?.message || null;
}

export async function loadTodayFoodLogs(userId: string): Promise<{ data: FoodLog[]; error: string | null }> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .order('created_at', { ascending: true });
  return { data: (data || []) as FoodLog[], error: error?.message || null };
}

export async function deleteFoodLog(logId: string): Promise<string | null> {
  const { error } = await supabase.from('food_logs').delete().eq('id', logId);
  return error?.message || null;
}

// Popular Tunisian/MENA foods (fallback when no internet)
export const LOCAL_FOODS_DB: FoodItem[] = [
  { id: 'couscous', name: 'Couscous (cuit)', calories: 176, protein: 5.9, carbs: 36, fat: 0.3, fiber: 2.2, quantity_g: 100 },
  { id: 'lablabi', name: 'Lablabi (1 bol)', calories: 320, protein: 18, carbs: 42, fat: 6, fiber: 11, quantity_g: 300 },
  { id: 'brik', name: 'Brik à l\'œuf', calories: 220, protein: 8, carbs: 22, fat: 12, fiber: 1, quantity_g: 100 },
  { id: 'merguez', name: 'Merguez grillée', calories: 280, protein: 14, carbs: 2, fat: 24, fiber: 0, quantity_g: 100 },
  { id: 'harissa', name: 'Harissa (1 cuillère)', calories: 15, protein: 0.7, carbs: 2.2, fat: 0.6, fiber: 1, quantity_g: 15 },
  { id: 'dattes', name: 'Dattes Deglet Nour', calories: 282, protein: 2.5, carbs: 75, fat: 0.4, fiber: 8, quantity_g: 100 },
  { id: 'makloub', name: 'Maklouba (riz viande légumes)', calories: 380, protein: 22, carbs: 48, fat: 10, fiber: 4, quantity_g: 300 },
  { id: 'chorba', name: 'Chorba de légumes', calories: 180, protein: 10, carbs: 28, fat: 3, fiber: 6, quantity_g: 300 },
  { id: 'poulet_grill', name: 'Poulet grillé', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, quantity_g: 100 },
  { id: 'thon', name: 'Thon en conserve', calories: 132, protein: 29, carbs: 0, fat: 1, fiber: 0, quantity_g: 100 },
  { id: 'fromage_kiri', name: 'Fromage La Vache qui Rit', calories: 55, protein: 2.5, carbs: 2, fat: 4, fiber: 0, quantity_g: 18 },
  { id: 'pain_complet', name: 'Pain complet (tranche)', calories: 80, protein: 4, carbs: 15, fat: 1, fiber: 2, quantity_g: 35 },
  { id: 'lait', name: 'Lait entier (200ml)', calories: 130, protein: 6.8, carbs: 9.6, fat: 7.4, fiber: 0, quantity_g: 200 },
  { id: 'oeuf', name: 'Œuf entier', calories: 78, protein: 6, carbs: 0.6, fat: 5, fiber: 0, quantity_g: 60 },
  { id: 'avocat', name: 'Avocat', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, quantity_g: 100 },
  { id: 'banane', name: 'Banane', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, quantity_g: 100 },
  { id: 'orange', name: 'Orange', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, quantity_g: 100 },
  { id: 'amandes', name: 'Amandes', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, quantity_g: 100 },
  { id: 'yaourt', name: 'Yaourt nature', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, quantity_g: 100 },
  { id: 'whey', name: 'Whey Protein (scoop)', calories: 120, protein: 25, carbs: 3, fat: 1.5, fiber: 0, quantity_g: 30 },
];
