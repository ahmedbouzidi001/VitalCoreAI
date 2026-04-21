import { supabase } from './supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface AIAnalysisResult {
  health_score: number;
  vitality_score: number;
  summary: string;
  alerts: Array<{ marker: string; status: string; recommendation: string }>;
  nutrition_adjustments: string[];
  training_adjustments: string[];
  supplements: Array<{ name: string; dose: string; timing: string; evidence: string }>;
  local_foods: string[];
  lifestyle_tips: string[];
}

export interface AIMealPlanResult {
  totalCalories: number;
  macros: { protein: number; carbs: number; fat: number; fiber: number };
  breakfast: any;
  lunch: any;
  dinner: any;
  snack: any;
}

export interface AIWorkoutResult {
  type: string;
  name: string;
  duration: number;
  scienceTip: string;
  scienceTipAr: string;
  exercises: any[];
}

async function invokeVitalAI(payload: any): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('vital-ai', { body: payload });
  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const textContent = await error.context?.text();
        errorMessage = `[Code: ${statusCode}] ${textContent || error.message}`;
      } catch {
        errorMessage = error.message || 'Failed to read response';
      }
    }
    return { data: null, error: errorMessage };
  }
  return { data: data?.data, error: null };
}

export async function analyzeBiomarkers(
  biomarkers: any[],
  profile: any,
  language: string
): Promise<{ result: AIAnalysisResult | null; error: string | null }> {
  const { data, error } = await invokeVitalAI({
    type: 'biomarker_analysis',
    biomarkers,
    profile,
    language,
  });
  return { result: data as AIAnalysisResult | null, error };
}

export async function generateMealPlanDay(
  biomarkers: any[],
  profile: any,
  language: string
): Promise<{ result: AIMealPlanResult | null; error: string | null }> {
  const { data, error } = await invokeVitalAI({
    type: 'meal_plan',
    biomarkers,
    profile,
    language,
  });
  return { result: data as AIMealPlanResult | null, error };
}

export async function generateWorkoutSession(
  profile: any,
  workoutType: string,
  language: string
): Promise<{ result: AIWorkoutResult | null; error: string | null }> {
  const { data, error } = await invokeVitalAI({
    type: 'training_plan',
    profile,
    workout_type: workoutType,
    language,
  });
  return { result: data as AIWorkoutResult | null, error };
}

// ---- Profile persistence ----
export async function saveProfile(userId: string, profile: Partial<any>): Promise<string | null> {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
  return error?.message || null;
}

export async function loadProfile(userId: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return { data, error: error?.message || null };
}

// ---- Biomarkers persistence ----
export async function saveBiomarker(userId: string, marker: any): Promise<string | null> {
  const { error } = await supabase.from('biomarkers').upsert({
    user_id: userId,
    name: marker.name,
    name_ar: marker.nameAr,
    category: marker.category,
    value: marker.value,
    unit: marker.unit,
    normal_min: marker.normalMin,
    normal_max: marker.normalMax,
    date: marker.date || new Date().toISOString().split('T')[0],
    notes: marker.notes,
  });
  return error?.message || null;
}

export async function loadBiomarkers(userId: string): Promise<{ data: any[]; error: string | null }> {
  const { data, error } = await supabase
    .from('biomarkers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error: error?.message || null };
}

// ---- Daily stats persistence ----
export async function saveDailyStats(userId: string, stats: any): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('daily_stats').upsert({
    user_id: userId,
    date: today,
    ...stats,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' });
  return error?.message || null;
}

export async function loadTodayStats(userId: string): Promise<{ data: any; error: string | null }> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('daily_stats').select('*').eq('user_id', userId).eq('date', today).single();
  return { data, error: error?.message || null };
}

// ---- Meal plan persistence ----
export async function saveMealPlan(userId: string, planData: any[]): Promise<string | null> {
  const weekStart = getWeekStart();
  const { error } = await supabase.from('meal_plans').upsert({
    user_id: userId,
    week_start: weekStart,
    plan_data: planData,
  }, { onConflict: 'user_id,week_start' });
  return error?.message || null;
}

export async function loadCurrentMealPlan(userId: string): Promise<{ data: any; error: string | null }> {
  const weekStart = getWeekStart();
  const { data, error } = await supabase.from('meal_plans').select('*').eq('user_id', userId).eq('week_start', weekStart).single();
  return { data, error: error?.message || null };
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// ---- Workouts persistence ----
export async function saveWorkout(userId: string, workout: any): Promise<string | null> {
  const { error } = await supabase.from('workouts').insert({
    user_id: userId,
    date: new Date().toISOString().split('T')[0],
    ...workout,
  });
  return error?.message || null;
}

export async function loadRecentWorkouts(userId: string, limit = 7): Promise<{ data: any[]; error: string | null }> {
  const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return { data: data || [], error: error?.message || null };
}

// ---- Last AI analysis ----
export async function loadLastAnalysis(userId: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'biomarker_analysis')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return { data: data?.result, error: error?.message || null };
}
