import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  saveProfile, loadProfile,
  saveBiomarker, loadBiomarkers,
  saveDailyStats, loadTodayStats,
  saveMealPlan, loadCurrentMealPlan,
  saveWorkout, loadRecentWorkouts,
  loadLastAnalysis,
  analyzeBiomarkers as aiAnalyzeBiomarkers,
  analyzePDFBiomarkers,
  generateMealPlanDay,
  generateWorkoutSession,
  AIAnalysisResult,
} from '@/services/vitalCore';

export interface BiologicalMarker {
  id: string;
  name: string;
  nameAr?: string;
  category: 'hormones' | 'vitamins' | 'metabolic';
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  date: string;
}

export interface Meal {
  id: string;
  name: string;
  nameAr?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  prepTime: number;
  image: string;
  ingredients: string[];
  ingredientsAr?: string[];
  instructions: string[];
  instructionsAr?: string[];
  tags: string[];
}

export interface MealPlanDay {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
  totalCalories: number;
  macros: { protein: number; carbs: number; fat: number; fiber: number };
}

export interface WorkoutExercise {
  id: string;
  name: string;
  nameAr?: string;
  muscleGroup: string;
  muscleGroupSecondary?: string;
  sets: number;
  reps: string;
  rest: number;
  intensity: 'high' | 'medium' | 'low';
  technique?: string;
  tempo?: string;
  rir?: number;
  progression?: string;
}

export interface WorkoutSession {
  type: 'hypertrophy' | 'strength' | 'endurance' | 'longevity' | 'recovery';
  split?: string;
  name: string;
  duration: number;
  warmup?: string;
  cooldown?: string;
  scienceTip: string;
  scienceTipAr?: string;
  exercises: WorkoutExercise[];
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
  goals: string[];
}

export interface DailyStats {
  calories: number;
  water: number;
  steps: number;
  sleep: number;
}

interface HealthContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  biomarkers: BiologicalMarker[];
  addBiomarker: (marker: BiologicalMarker) => void;
  deficiencies: BiologicalMarker[];
  healthScore: number;
  dailyStats: DailyStats;
  updateDailyStats: (updates: Partial<DailyStats>) => void;
  weeklyMealPlan: MealPlanDay[];
  weeklyWorkout: WorkoutSession[];
  regenerateMealPlan: (preferencesContext?: string) => Promise<void>;
  regenerateWorkout: (type: WorkoutSession['type'], splitType?: string) => Promise<void>;
  completeOnboarding: () => void;
  onboardingDone: boolean;
  aiAnalysis: AIAnalysisResult | null;
  runAIAnalysis: () => Promise<void>;
  isAILoading: boolean;
  aiError: string | null;
  isMealLoading: boolean;
  isWorkoutLoading: boolean;
  isDataLoading: boolean;
  importPDFBiomarkers: (base64: string, language: string) => Promise<any>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

const DEFAULT_MEAL: Meal = {
  id: 'default', name: 'Salade Tunisienne + Grillades', nameAr: 'سلطة تونسية مع مشوي',
  calories: 450, protein: 35, carbs: 30, fat: 18, fiber: 6, prepTime: 20, image: 'meal-1',
  ingredients: ['200g poulet grillé', '1 tomate', '1 concombre', '50g olives', 'jus de citron', 'huile d\'olive'],
  ingredientsAr: ['200 غ دجاج مشوي', 'طماطم', 'خيار', '50 غ زيتون', 'عصير ليمون', 'زيت زيتون'],
  instructions: ['Grillez le poulet 15 min.', 'Coupez les légumes en dés.', 'Mélangez avec citron et huile.'],
  instructionsAr: ['اشوِ الدجاج 15 دقيقة.', 'قطع الخضار مكعبات.', 'اخلط مع الليمون والزيت.'],
  tags: ['high-protein', 'tunisian', 'mediterranean'],
};

const DEFAULT_MEAL_PLAN_DAY: MealPlanDay = {
  breakfast: { ...DEFAULT_MEAL, id: 'b1', name: 'Œufs + Avocat + Épinards', nameAr: 'بيض بالأفوكادو والسبانخ', calories: 380, protein: 28, carbs: 15, fat: 22, fiber: 5, image: 'meal-2', prepTime: 10, ingredients: ['3 œufs', '1/2 avocat', '100g épinards'], ingredientsAr: ['3 بيض', 'نصف أفوكادو', '100غ سبانخ'], instructions: ['Faites revenir les épinards.', 'Ajoutez les œufs.', 'Servez avec avocat.'], instructionsAr: ['قلي السبانخ.', 'أضف البيض.', 'قدم مع الأفوكادو.'], tags: ['keto-friendly', 'high-protein'] },
  lunch: { ...DEFAULT_MEAL, id: 'l1', name: 'Couscous au Poulet', nameAr: 'كسكسي بالدجاج', calories: 620, protein: 42, carbs: 65, fat: 14, fiber: 8, image: 'meal-1', prepTime: 35, ingredients: ['200g couscous', '200g poulet', 'légumes', 'harissa'], ingredientsAr: ['200غ كسكسي', '200غ دجاج', 'خضروات', 'هريسة'], instructions: ['Cuisez le couscous à la vapeur.', 'Préparez le bouillon.', 'Servez chaud.'], instructionsAr: ['اطبخ الكسكسي.', 'حضر المرق.', 'قدم ساخناً.'], tags: ['tunisian', 'traditional'] },
  dinner: { ...DEFAULT_MEAL, id: 'd1', name: 'Saumon + Quinoa', nameAr: 'سلمون مع الكينوا', calories: 520, protein: 40, carbs: 38, fat: 16, fiber: 7, image: 'meal-3', prepTime: 25, ingredients: ['180g saumon', '80g quinoa', '150g brocoli'], ingredientsAr: ['180غ سلمون', '80غ كينوا', '150غ بروكلي'], instructions: ['Cuisez le quinoa 15 min.', 'Grillez le saumon.', 'Servez ensemble.'], instructionsAr: ['اطبخ الكينوا.', 'اشوِ السلمون.', 'قدم.'], tags: ['omega-3', 'anti-inflammatory'] },
  snack: { ...DEFAULT_MEAL, id: 's1', name: 'Smoothie Protéiné + Dattes', nameAr: 'سموذي البروتين مع التمر', calories: 280, protein: 18, carbs: 32, fat: 6, fiber: 4, image: 'meal-2', prepTime: 5, ingredients: ['200ml lait d\'amande', '1 scoop protéine', '2 dattes'], ingredientsAr: ['200مل حليب لوز', 'ملعقة بروتين', 'تمرتان'], instructions: ['Mixez tous les ingrédients.', 'Servez frais.'], instructionsAr: ['اخلط المكونات.', 'قدم بارداً.'], tags: ['post-workout'] },
  totalCalories: 1800,
  macros: { protein: 128, carbs: 150, fat: 58, fiber: 24 },
};

const DEFAULT_BIOMARKERS: BiologicalMarker[] = [
  { id: 'testosterone', name: 'Testostérone', nameAr: 'التستوستيرون', category: 'hormones', value: 520, unit: 'ng/dL', normalMin: 300, normalMax: 1000, date: '2025-04-01' },
  { id: 'cortisol', name: 'Cortisol', nameAr: 'الكورتيزول', category: 'hormones', value: 18, unit: 'µg/dL', normalMin: 6, normalMax: 23, date: '2025-04-01' },
  { id: 'tsh', name: 'TSH (Thyroïde)', nameAr: 'هرمون الغدة الدرقية', category: 'hormones', value: 2.1, unit: 'mIU/L', normalMin: 0.4, normalMax: 4.0, date: '2025-04-01' },
  { id: 'insulin', name: 'Insuline', nameAr: 'الأنسولين', category: 'hormones', value: 9, unit: 'µIU/mL', normalMin: 2, normalMax: 25, date: '2025-04-01' },
  { id: 'vitamin_d', name: 'Vitamine D', nameAr: 'فيتامين د', category: 'vitamins', value: 18, unit: 'ng/mL', normalMin: 30, normalMax: 100, date: '2025-04-01' },
  { id: 'vitamin_b12', name: 'Vitamine B12', nameAr: 'فيتامين ب12', category: 'vitamins', value: 380, unit: 'pg/mL', normalMin: 200, normalMax: 900, date: '2025-04-01' },
  { id: 'magnesium', name: 'Magnésium', nameAr: 'المغنيسيوم', category: 'vitamins', value: 0.72, unit: 'mmol/L', normalMin: 0.75, normalMax: 1.0, date: '2025-04-01' },
  { id: 'ferritin', name: 'Ferritine', nameAr: 'الفيريتين', category: 'vitamins', value: 45, unit: 'ng/mL', normalMin: 30, normalMax: 300, date: '2025-04-01' },
  { id: 'glucose', name: 'Glycémie à jeun', nameAr: 'سكر الدم الصائم', category: 'metabolic', value: 92, unit: 'mg/dL', normalMin: 70, normalMax: 100, date: '2025-04-01' },
  { id: 'cholesterol', name: 'Cholestérol total', nameAr: 'الكوليسترول الكلي', category: 'metabolic', value: 175, unit: 'mg/dL', normalMin: 0, normalMax: 200, date: '2025-04-01' },
  { id: 'creatinine', name: 'Créatinine', nameAr: 'الكرياتينين', category: 'metabolic', value: 0.9, unit: 'mg/dL', normalMin: 0.7, normalMax: 1.3, date: '2025-04-01' },
  { id: 'hba1c', name: 'HbA1c', nameAr: 'الهيموغلوبين السكري', category: 'metabolic', value: 5.2, unit: '%', normalMin: 0, normalMax: 5.7, date: '2025-04-01' },
];

const DEFAULT_WORKOUT: WorkoutSession = {
  type: 'hypertrophy', split: 'upper_lower', name: 'Upper Body — Hypertrophie', duration: 60,
  warmup: '5 min vélo léger + mobilité épaules',
  cooldown: 'Étirements statiques 5 min',
  scienceTip: 'Les séries de 8-12 reps avec 70-80% de 1RM maximisent l\'hypertrophie (Schoenfeld, 2010).',
  scienceTipAr: 'التدريب بـ 8-12 تكرار بـ 70-80% من الحد الأقصى يعظم نمو العضلات.',
  exercises: [
    { id: 'e1', name: 'Développé couché', nameAr: 'ضغط الصدر', muscleGroup: 'Pectoraux', muscleGroupSecondary: 'Triceps, Épaules antérieures', sets: 4, reps: '8-10', rest: 90, intensity: 'high', technique: 'Rétractez les omoplates, pieds à plat au sol', tempo: '3-1-2-0', rir: 2, progression: '+2.5kg/semaine' },
    { id: 'e2', name: 'Rowing barre', nameAr: 'سحب بالبار', muscleGroup: 'Dos', muscleGroupSecondary: 'Biceps, Trapèzes', sets: 4, reps: '8-10', rest: 90, intensity: 'high', technique: 'Tirez les coudes vers les hanches, gardez le dos plat', tempo: '2-1-3-0', rir: 2 },
    { id: 'e3', name: 'Développé militaire haltères', nameAr: 'ضغط الأكتاف', muscleGroup: 'Épaules', sets: 3, reps: '10-12', rest: 75, intensity: 'medium', technique: 'Stabilisez le core, évitez l\'extension lombaire', rir: 3 },
    { id: 'e4', name: 'Curl biceps barbell', nameAr: 'تمرين البايسبس', muscleGroup: 'Biceps', sets: 3, reps: '12', rest: 60, intensity: 'medium', technique: 'Gardez les coudes fixes contre le corps', rir: 2 },
    { id: 'e5', name: 'Triceps poulie haute', nameAr: 'تمرين الترايسبس', muscleGroup: 'Triceps', sets: 3, reps: '12-15', rest: 60, intensity: 'medium' },
    { id: 'e6', name: 'Oiseau haltères', nameAr: 'تمرين الأكتاف الجانبي', muscleGroup: 'Épaules latérales', sets: 3, reps: '15', rest: 60, intensity: 'low', technique: 'Légère flexion des coudes, contrôle la descente' },
  ],
};

const DEFAULT_RECOVERY: WorkoutSession = {
  type: 'recovery', name: 'Récupération Active', duration: 30,
  scienceTip: 'La récupération active améliore l\'élimination du lactate et réduit les courbatures (Monedero & Donne, 2000).',
  scienceTipAr: 'التعافي النشط يسرع إزالة حمض اللاكتيك ويقلل ألم العضلات.',
  exercises: [],
};

function buildDefaultWeeklyWorkout(): WorkoutSession[] {
  const days: WorkoutSession[] = [
    { ...DEFAULT_WORKOUT, name: 'Upper A — Push/Pull', type: 'hypertrophy' },
    { ...DEFAULT_WORKOUT, name: 'Lower A — Quads/Hamstrings', type: 'strength', exercises: [
      { id: 'sq1', name: 'Squat', nameAr: 'السكوات', muscleGroup: 'Quadriceps', sets: 4, reps: '5', rest: 180, intensity: 'high', technique: 'Descente 3s, genoux dans l\'axe des pieds', rir: 1 },
      { id: 'rdl1', name: 'Soulevé de terre roumain', nameAr: 'السحب الروماني', muscleGroup: 'Ischio-jambiers', sets: 3, reps: '8', rest: 120, intensity: 'high', technique: 'Poussez les hanches en arrière, dos droit' },
      { id: 'lp1', name: 'Presse à cuisses', nameAr: 'ضغط الأرجل', muscleGroup: 'Quadriceps', sets: 3, reps: '10-12', rest: 90, intensity: 'medium' },
      { id: 'lc1', name: 'Leg Curl', nameAr: 'تمرين الهامستر', muscleGroup: 'Ischio-jambiers', sets: 3, reps: '12-15', rest: 75, intensity: 'medium' },
      { id: 'cal1', name: 'Mollets debout', nameAr: 'رفع الكعب', muscleGroup: 'Mollets', sets: 4, reps: '15-20', rest: 60, intensity: 'low' },
    ]},
    DEFAULT_RECOVERY,
    { ...DEFAULT_WORKOUT, name: 'Upper B — Hypertrophie', type: 'hypertrophy' },
    { ...DEFAULT_WORKOUT, name: 'Lower B — Fessiers/Explosivité', type: 'endurance', exercises: [
      { id: 'hip1', name: 'Hip Thrust', nameAr: 'تمرين الأرداف', muscleGroup: 'Fessiers', sets: 4, reps: '10-12', rest: 90, intensity: 'high', technique: 'Squeeze les fessiers en haut, dos plat sur le banc' },
      { id: 'bul1', name: 'Fentes bulgares', nameAr: 'فرجلة بلغارية', muscleGroup: 'Quadriceps, Fessiers', sets: 3, reps: '10/jambe', rest: 90, intensity: 'high' },
      { id: 'gm1', name: 'Good Morning', nameAr: 'تمرين جود مورنينج', muscleGroup: 'Ischio-jambiers', sets: 3, reps: '12', rest: 75, intensity: 'medium', technique: 'Flexion de hanche, légère flexion des genoux' },
      { id: 'box1', name: 'Box Jump', nameAr: 'القفز على الصندوق', muscleGroup: 'Explosivité', sets: 3, reps: '5', rest: 120, intensity: 'high', technique: 'Atterrissage souple, amorti avec les genoux' },
    ]},
    { ...DEFAULT_WORKOUT, name: 'Longévité + Mobilité', type: 'longevity', exercises: [
      { id: 'dl1', name: 'Deadlift léger', nameAr: 'سحب خفيف', muscleGroup: 'Chaîne postérieure', sets: 3, reps: '10', rest: 90, intensity: 'medium', technique: 'Technique parfaite, charge 60% 1RM' },
      { id: 'pull1', name: 'Pull-up / Bande assistée', nameAr: 'عقلة', muscleGroup: 'Dos', sets: 3, reps: '8-10', rest: 90, intensity: 'medium' },
      { id: 'farm1', name: 'Farmer Walk', nameAr: 'المشي بالأثقال', muscleGroup: 'Forearm, Core, Trapèzes', sets: 3, reps: '30m', rest: 90, intensity: 'medium', technique: 'Épaules en arrière, grip solide' },
      { id: 'mob1', name: 'Turkish Get-Up', nameAr: 'تمرين القيام التركي', muscleGroup: 'Épaules, Core', sets: 2, reps: '3/côté', rest: 90, intensity: 'low', technique: 'Mouvement lent et contrôlé' },
    ]},
    DEFAULT_RECOVERY,
  ];
  return days;
}

function buildDefaultWeeklyMealPlan(): MealPlanDay[] {
  return Array(7).fill(null).map(() => ({ ...DEFAULT_MEAL_PLAN_DAY }));
}

export function HealthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Utilisateur', age: 28, weight: 78, height: 178, gender: 'male',
    activityLevel: 'moderate', goals: ['muscle_gain', 'optimize_hormones'],
  });
  const [biomarkers, setBiomarkers] = useState<BiologicalMarker[]>(DEFAULT_BIOMARKERS);
  const [dailyStats, setDailyStats] = useState<DailyStats>({ calories: 1240, water: 1800, steps: 7240, sleep: 6.5 });
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<MealPlanDay[]>(buildDefaultWeeklyMealPlan());
  const [weeklyWorkout, setWeeklyWorkout] = useState<WorkoutSession[]>(buildDefaultWeeklyWorkout());
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isMealLoading, setIsMealLoading] = useState(false);
  const [isWorkoutLoading, setIsWorkoutLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadUserData();
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const [profileRes, bioRes, statsRes, mealRes, analysisRes] = await Promise.all([
        loadProfile(user.id), loadBiomarkers(user.id), loadTodayStats(user.id),
        loadCurrentMealPlan(user.id), loadLastAnalysis(user.id),
      ]);
      if (profileRes.data) {
        setProfile(prev => ({
          ...prev,
          age: profileRes.data.age || prev.age,
          weight: profileRes.data.weight || prev.weight,
          height: profileRes.data.height || prev.height,
          gender: profileRes.data.gender || prev.gender,
          activityLevel: profileRes.data.activity_level || prev.activityLevel,
          goals: profileRes.data.goals || prev.goals,
        }));
        if (profileRes.data.onboarding_done) setOnboardingDone(true);
      }
      if (bioRes.data.length > 0) {
        setBiomarkers(bioRes.data.map((b: any) => ({
          id: b.id, name: b.name, nameAr: b.name_ar, category: b.category,
          value: b.value, unit: b.unit, normalMin: b.normal_min, normalMax: b.normal_max, date: b.date,
        })));
      }
      if (statsRes.data) {
        setDailyStats({ calories: statsRes.data.calories || 0, water: statsRes.data.water || 0, steps: statsRes.data.steps || 0, sleep: statsRes.data.sleep || 0 });
      }
      if (mealRes.data?.plan_data) setWeeklyMealPlan(mealRes.data.plan_data);
      if (analysisRes.data) setAiAnalysis(analysisRes.data);
    } finally {
      setIsDataLoading(false);
    }
  };

  const deficiencies = biomarkers.filter(b => b.value < b.normalMin);
  const healthScore = Math.max(0, Math.min(100,
    100 - (deficiencies.length * 12) +
    (dailyStats.sleep >= 7 ? 5 : -5) +
    (dailyStats.steps >= 8000 ? 5 : -3) +
    (dailyStats.water >= 2000 ? 3 : -2)
  ));

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...updates };
      if (user) {
        saveProfile(user.id, {
          age: updated.age, weight: updated.weight, height: updated.height,
          gender: updated.gender, activity_level: updated.activityLevel, goals: updated.goals,
        }).catch(console.error);
      }
      return updated;
    });
  }, [user]);

  const addBiomarker = useCallback(async (marker: BiologicalMarker) => {
    setBiomarkers(prev => {
      const idx = prev.findIndex(b => b.id === marker.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = marker;
        return updated;
      }
      return [...prev, marker];
    });
    if (user) await saveBiomarker(user.id, marker);
  }, [user]);

  const updateDailyStats = useCallback(async (updates: Partial<DailyStats>) => {
    setDailyStats(prev => {
      const updated = { ...prev, ...updates };
      if (user) {
        saveDailyStats(user.id, updated).catch(console.error);
      }
      return updated;
    });
  }, [user]);

  const runAIAnalysis = useCallback(async () => {
    setIsAILoading(true);
    setAiError(null);
    try {
      const bmr = profile.gender === 'male'
        ? 88.362 + 13.397 * profile.weight + 4.799 * profile.height - 5.677 * profile.age
        : 447.593 + 9.247 * profile.weight + 3.098 * profile.height - 4.330 * profile.age;
      const tdee = Math.round(bmr * 1.55);
      const { result, error } = await aiAnalyzeBiomarkers(
        biomarkers.map(b => ({ name: b.name, value: b.value, unit: b.unit, normal_min: b.normalMin, normal_max: b.normalMax, category: b.category })),
        { ...profile, tdee, bmr: Math.round(bmr) },
        'fr'
      );
      if (error) setAiError(error);
      else if (result) setAiAnalysis(result);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setIsAILoading(false);
    }
  }, [biomarkers, profile]);

  const importPDFBiomarkers = useCallback(async (base64: string, language: string) => {
    try {
      const { result, error } = await analyzePDFBiomarkers(base64, language);
      if (error) {
        console.error('PDF analysis error:', error);
        return null;
      }
      return result;
    } catch (e) {
      console.error('PDF import failed:', e);
      return null;
    }
  }, []);

  const regenerateMealPlan = useCallback(async (preferencesContext?: string) => {
    setIsMealLoading(true);
    try {
      const results = await Promise.all(
        Array(7).fill(null).map(() =>
          generateMealPlanDay(
            biomarkers.map(b => ({ name: b.name, value: b.value, unit: b.unit, normal_min: b.normalMin, normal_max: b.normalMax })),
            { ...profile, tdee: 2200, preferencesContext: preferencesContext || '' },
            'fr',
            'TN'
          )
        )
      );
      const plans = results.map(r => {
        if (r.result) {
          const d = r.result;
          return { totalCalories: d.totalCalories, macros: d.macros, breakfast: { id: 'b', ...d.breakfast }, lunch: { id: 'l', ...d.lunch }, dinner: { id: 'd', ...d.dinner }, snack: { id: 's', ...d.snack } } as MealPlanDay;
        }
        return DEFAULT_MEAL_PLAN_DAY;
      });
      setWeeklyMealPlan(plans);
      if (user) await saveMealPlan(user.id, plans);
    } catch (e) {
      console.error('Meal plan generation failed:', e);
    } finally {
      setIsMealLoading(false);
    }
  }, [biomarkers, profile, user]);

  const regenerateWorkout = useCallback(async (type: WorkoutSession['type'], splitType?: string) => {
    setIsWorkoutLoading(true);
    try {
      const { result, error } = await generateWorkoutSession(profile, type, 'fr', splitType);
      if (result && !error) {
        const newSession: WorkoutSession = {
          type: result.type as WorkoutSession['type'],
          split: splitType,
          name: result.name,
          duration: result.duration,
          warmup: (result as any).warmup,
          cooldown: (result as any).cooldown,
          scienceTip: result.scienceTip,
          scienceTipAr: result.scienceTipAr,
          exercises: result.exercises.map(e => ({
            id: e.id || Math.random().toString(36),
            name: e.name, nameAr: e.nameAr,
            muscleGroup: e.muscleGroup,
            muscleGroupSecondary: (e as any).muscleGroupSecondary,
            sets: e.sets, reps: String(e.reps), rest: e.rest,
            intensity: e.intensity || 'medium',
            technique: e.technique,
            tempo: (e as any).tempo,
            rir: (e as any).rir,
            progression: (e as any).progression,
          })),
        };
        setWeeklyWorkout(prev => prev.map((s, i) => i === 0 ? newSession : s));
        if (user) {
          await saveWorkout(user.id, { type: newSession.type, name: newSession.name, duration: newSession.duration, exercises: newSession.exercises });
        }
      }
    } catch (e) {
      console.error('Workout generation failed:', e);
    } finally {
      setIsWorkoutLoading(false);
    }
  }, [profile, user]);

  const completeOnboarding = useCallback(async () => {
    setOnboardingDone(true);
    if (user) await saveProfile(user.id, { onboarding_done: true });
  }, [user]);

  return (
    <HealthContext.Provider value={{
      profile, updateProfile,
      biomarkers, addBiomarker,
      deficiencies, healthScore,
      dailyStats, updateDailyStats,
      weeklyMealPlan, weeklyWorkout,
      regenerateMealPlan, regenerateWorkout,
      completeOnboarding, onboardingDone,
      aiAnalysis, runAIAnalysis, isAILoading, aiError,
      isMealLoading, isWorkoutLoading, isDataLoading,
      importPDFBiomarkers,
    }}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within HealthProvider');
  return ctx;
}
