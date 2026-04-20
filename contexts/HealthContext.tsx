import React, { createContext, useState, useContext, ReactNode } from 'react';

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
  region: 'tunisia' | 'france' | 'international';
  goals: string[];
}

export interface BiologicalMarker {
  id: string;
  name: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  category: 'hormones' | 'vitamins' | 'metabolic';
  date: string;
}

export interface MealPlanDay {
  day: string;
  dayIndex: number;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
  totalCalories: number;
  macros: { protein: number; carbs: number; fat: number; fiber: number };
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

export interface WorkoutSession {
  id: string;
  name: string;
  type: 'hypertrophy' | 'strength' | 'endurance' | 'longevity' | 'recovery';
  duration: number;
  exercises: Exercise[];
  scienceTip: string;
  scienceTipAr?: string;
}

export interface Exercise {
  id: string;
  name: string;
  nameAr?: string;
  sets: number;
  reps: string;
  rest: number;
  muscleGroup: string;
  intensity: 'low' | 'medium' | 'high';
}

export interface HealthContextType {
  profile: UserProfile;
  updateProfile: (p: Partial<UserProfile>) => void;
  biomarkers: BiologicalMarker[];
  updateBiomarkers: (markers: BiologicalMarker[]) => void;
  addBiomarker: (marker: BiologicalMarker) => void;
  weeklyMealPlan: MealPlanDay[];
  regenerateMealPlan: () => void;
  weeklyWorkout: WorkoutSession[];
  regenerateWorkout: (type: WorkoutSession['type']) => void;
  healthScore: number;
  deficiencies: BiologicalMarker[];
  dailyStats: { calories: number; water: number; steps: number; sleep: number };
  updateDailyStats: (stats: Partial<HealthContextType['dailyStats']>) => void;
  onboardingDone: boolean;
  completeOnboarding: () => void;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

const DEFAULT_PROFILE: UserProfile = {
  name: 'Alex',
  age: 32,
  weight: 78,
  height: 178,
  gender: 'male',
  activityLevel: 'moderate',
  region: 'tunisia',
  goals: ['muscle_gain', 'optimize_hormones'],
};

const MEAL_IMAGES = [
  require('@/assets/images/meal-1.png'),
  require('@/assets/images/meal-2.png'),
  require('@/assets/images/meal-3.png'),
];

function generateMealPlan(profile: UserProfile, biomarkers: BiologicalMarker[]): MealPlanDay[] {
  const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725, athlete: 1.9 };
  const bmr = profile.gender === 'male'
    ? 88.362 + 13.397 * profile.weight + 4.799 * profile.height - 5.677 * profile.age
    : 447.593 + 9.247 * profile.weight + 3.098 * profile.height - 4.330 * profile.age;
  const tdee = Math.round(bmr * activityMultipliers[profile.activityLevel]);

  const hasMgDeficiency = biomarkers.some(m => m.id === 'magnesium' && m.value < m.normalMin);
  const hasVitDDeficiency = biomarkers.some(m => m.id === 'vitamin_d' && m.value < m.normalMin);

  const breakfasts: Meal[] = [
    {
      id: 'b1', name: 'Scrambled Eggs & Avocado Bowl', nameAr: 'وعاء البيض المخفوق والأفوكادو',
      calories: Math.round(tdee * 0.25), protein: 28, carbs: 22, fat: 18, fiber: 6, prepTime: 12,
      image: 'meal-2', ingredients: ['3 oeufs bio', '1/2 avocat', '100g épinards', '1 tranche pain complet', hasMgDeficiency ? '30g graines de citrouille (Mg++)' : '30g noix', 'Huile d\'olive extra-vierge'],
      ingredientsAr: ['3 بيضات عضوية', 'نصف أفوكادو', '100غ سبانخ', 'شريحة خبز كامل', hasMgDeficiency ? '30غ بذور القرع (مغنيسيوم)' : '30غ مكسرات', 'زيت زيتون بكر'],
      instructions: ['Battre les oeufs avec sel et poivre noir', 'Faire revenir les épinards à feu moyen', 'Cuire les oeufs brouillés doucement', 'Disposer avec l\'avocat tranché'],
      instructionsAr: ['اخفقي البيض مع الملح والفلفل', 'قلي السبانخ على نار متوسطة', 'اطهي البيض المخفوق ببطء', 'رتبي مع شرائح الأفوكادو'],
      tags: ['high-protein', 'healthy-fats', hasMgDeficiency ? 'magnesium-boost' : 'balanced'],
    },
    {
      id: 'b2', name: 'Protein Smoothie Bowl', nameAr: 'وعاء سموثي البروتين',
      calories: Math.round(tdee * 0.22), protein: 32, carbs: 35, fat: 8, fiber: 8, prepTime: 8,
      image: 'meal-3', ingredients: ['30g whey protein vanille', '200g myrtilles congelées', '1 banane', '200ml lait d\'amande', hasVitDDeficiency ? '2cs graines de lin (Vit D source)' : '2cs granola', 'Miel de Manuka'],
      ingredientsAr: ['30غ بروتين مصل اللبن فانيليا', '200غ توت مجمد', 'موزة', '200مل حليب لوز', hasVitDDeficiency ? '2م بذور كتان' : '2م حبوب مقرمشة', 'عسل مانوكا'],
      instructions: ['Mixer tous les ingrédients sauf les toppings', 'Verser dans un bol', 'Garnir avec granola et fruits frais'],
      instructionsAr: ['خلطي جميع المكونات عدا الإضافات', 'صبي في وعاء', 'زيني بالحبوب والفواكه الطازجة'],
      tags: ['post-workout', 'antioxidants', 'quick'],
    },
  ];

  const lunches: Meal[] = [
    {
      id: 'l1', name: 'Salmon & Quinoa Power Bowl', nameAr: 'وعاء السلمون والكينوا',
      calories: Math.round(tdee * 0.35), protein: 42, carbs: 48, fat: 22, fiber: 10, prepTime: 25,
      image: 'meal-1', ingredients: ['180g saumon atlantique', '100g quinoa cuit', '150g brocoli vapeur', '80g tomates cerise', 'Citron, aneth, huile d\'olive', hasMgDeficiency ? 'Épinards (source Mg)' : 'Roquette'],
      ingredientsAr: ['180غ سمك السلمون', '100غ كينوا مطبوخ', '150غ بروكلي مطهو', '80غ طماطم كرزية', 'ليمون، شبت، زيت زيتون', hasMgDeficiency ? 'سبانخ (مصدر مغنيسيوم)' : 'جرجير'],
      instructions: ['Assaisonner le saumon avec citron et aneth', 'Cuire à la vapeur 15 min', 'Préparer le quinoa selon instructions', 'Assembler le bowl avec légumes'],
      instructionsAr: ['تبلي السلمون بالليمون والشبت', 'اطهيه على البخار 15 دقيقة', 'حضري الكينوا حسب التعليمات', 'رتبي الوعاء مع الخضروات'],
      tags: ['omega-3', 'complete-protein', 'anti-inflammatory'],
    },
    {
      id: 'l2', name: 'Grilled Chicken Couscous Tunisien', nameAr: 'كسكسي الدجاج المشوي التونسي',
      calories: Math.round(tdee * 0.33), protein: 38, carbs: 52, fat: 12, fiber: 9, prepTime: 30,
      image: 'meal-1', ingredients: ['200g filet poulet', '120g couscous', '2 carottes', '1 courgette', 'Pois chiches', 'Harissa légère', 'Cumin, coriandre'],
      ingredientsAr: ['200غ صدر دجاج', '120غ كسكسي', '2 جزر', 'كوسا', 'حمص', 'هريسة خفيفة', 'كمون، كزبرة'],
      instructions: ['Mariner le poulet avec épices 30 min', 'Griller à feu vif 6 min/côté', 'Cuire couscous selon instructions', 'Préparer légumes à la vapeur'],
      instructionsAr: ['تبلي الدجاج بالتوابل 30 دقيقة', 'اشوي على نار عالية 6 دقائق لكل جانب', 'اطهي الكسكسي حسب التعليمات', 'حضري الخضروات على البخار'],
      tags: ['tunisian', 'high-carb', 'traditional'],
    },
  ];

  const dinners: Meal[] = [
    {
      id: 'd1', name: 'Lentil & Vegetable Tagine', nameAr: 'طاجين العدس والخضروات',
      calories: Math.round(tdee * 0.28), protein: 24, carbs: 42, fat: 8, fiber: 14, prepTime: 35,
      image: 'meal-1', ingredients: ['200g lentilles vertes', '1 tomate', '1 poivron', '1 oignon', 'Gingembre frais', 'Curcuma, cumin', 'Coriandre fraîche'],
      ingredientsAr: ['200غ عدس أخضر', 'طماطمة', 'فليفلة', 'بصلة', 'زنجبيل طازج', 'كركم، كمون', 'كزبرة طازجة'],
      instructions: ['Faire revenir l\'oignon et gingembre', 'Ajouter épices et légumes', 'Incorporer lentilles et eau', 'Mijoter 25 min à feu doux'],
      instructionsAr: ['قلي البصل والزنجبيل', 'أضيفي التوابل والخضروات', 'أضيفي العدس والماء', 'اطهي على نار هادئة 25 دقيقة'],
      tags: ['plant-based', 'fiber-rich', 'anti-inflammatory', 'iron'],
    },
  ];

  const snacks: Meal[] = [
    {
      id: 's1', name: 'Greek Yogurt & Nuts', nameAr: 'زبادي يوناني مع مكسرات',
      calories: Math.round(tdee * 0.1), protein: 14, carbs: 12, fat: 9, fiber: 2, prepTime: 3,
      image: 'meal-3', ingredients: ['200g yaourt grec 0%', hasMgDeficiency ? '20g amandes (Mg++)' : '20g noix', '1cs miel', 'Quelques baies'],
      ingredientsAr: ['200غ زبادي يوناني', hasMgDeficiency ? '20غ لوز (مغنيسيوم)' : '20غ جوز', 'ملعقة عسل', 'قليل من التوت'],
      instructions: ['Mélanger yaourt et miel', 'Garnir avec noix et baies'],
      instructionsAr: ['امزجي الزبادي مع العسل', 'زيني بالمكسرات والتوت'],
      tags: ['probiotic', 'quick', 'protein'],
    },
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return dayNames.map((day, i) => {
    const b = breakfasts[i % breakfasts.length];
    const l = lunches[i % lunches.length];
    const d = dinners[i % dinners.length];
    const s = snacks[0];
    return {
      day, dayIndex: i,
      breakfast: b, lunch: l, dinner: d, snack: s,
      totalCalories: b.calories + l.calories + d.calories + s.calories,
      macros: {
        protein: b.protein + l.protein + d.protein + s.protein,
        carbs: b.carbs + l.carbs + d.carbs + s.carbs,
        fat: b.fat + l.fat + d.fat + s.fat,
        fiber: b.fiber + l.fiber + d.fiber + s.fiber,
      },
    };
  });
}

function generateWorkout(type: WorkoutSession['type'], profile: UserProfile): WorkoutSession[] {
  const hypertrophyTip = 'Research: 6-12 reps at 65-80% 1RM with 60-90s rest maximizes muscle protein synthesis (Schoenfeld 2017).';
  const strengthTip = 'Research: 1-5 reps at 85-100% 1RM with 3-5min rest optimizes neuromuscular adaptations (Kramer et al.).';
  const enduranceTip = 'Research: Zone 2 training (60-70% HRmax) for 30-60min/session improves mitochondrial density.';
  const longevityTip = 'Research: Combining resistance training 2x/week + Zone 2 cardio reduces all-cause mortality by 40% (Stamatakis 2018).';

  const days: WorkoutSession[] = [
    {
      id: 'w1', name: 'Push - Chest & Shoulders', type: 'hypertrophy', duration: 60,
      scienceTip: hypertrophyTip,
      scienceTipAr: 'بحث: 6-12 تكراراً بـ 65-80% من أقصى قدرة يزيد تخليق بروتين العضلات (شونفيلد 2017).',
      exercises: [
        { id: 'e1', name: 'Bench Press', nameAr: 'ضغط المقعد', sets: 4, reps: '8-10', rest: 90, muscleGroup: 'Chest', intensity: 'high' },
        { id: 'e2', name: 'Overhead Press', nameAr: 'ضغط فوق الرأس', sets: 4, reps: '8-10', rest: 90, muscleGroup: 'Shoulders', intensity: 'high' },
        { id: 'e3', name: 'Incline DB Press', nameAr: 'ضغط مائل', sets: 3, reps: '10-12', rest: 75, muscleGroup: 'Upper Chest', intensity: 'medium' },
        { id: 'e4', name: 'Lateral Raises', nameAr: 'رفع جانبي', sets: 4, reps: '12-15', rest: 60, muscleGroup: 'Lateral Delts', intensity: 'medium' },
        { id: 'e5', name: 'Tricep Dips', nameAr: 'غطس الترايسبس', sets: 3, reps: '10-12', rest: 60, muscleGroup: 'Triceps', intensity: 'medium' },
      ],
    },
    {
      id: 'w2', name: 'Pull - Back & Biceps', type: 'hypertrophy', duration: 60,
      scienceTip: hypertrophyTip,
      scienceTipAr: 'بحث: 6-12 تكراراً بـ 65-80% من أقصى قدرة يزيد تخليق بروتين العضلات.',
      exercises: [
        { id: 'e6', name: 'Deadlift', nameAr: 'رفع الحديد الميت', sets: 4, reps: '5-6', rest: 180, muscleGroup: 'Full Back', intensity: 'high' },
        { id: 'e7', name: 'Pull-ups', nameAr: 'عقلة', sets: 4, reps: '6-10', rest: 120, muscleGroup: 'Lats', intensity: 'high' },
        { id: 'e8', name: 'Barbell Row', nameAr: 'تجديف بالبار', sets: 4, reps: '8-10', rest: 90, muscleGroup: 'Mid Back', intensity: 'high' },
        { id: 'e9', name: 'Face Pulls', nameAr: 'سحب الوجه', sets: 3, reps: '15-20', rest: 60, muscleGroup: 'Rear Delts', intensity: 'low' },
        { id: 'e10', name: 'Hammer Curls', nameAr: 'تجعيد المطرقة', sets: 3, reps: '10-12', rest: 60, muscleGroup: 'Biceps', intensity: 'medium' },
      ],
    },
    {
      id: 'w3', name: 'Legs & Core Power', type: 'strength', duration: 70,
      scienceTip: strengthTip,
      scienceTipAr: 'بحث: 1-5 تكرارات بـ 85-100% من الحد الأقصى يحسن التكيفات العصبية العضلية.',
      exercises: [
        { id: 'e11', name: 'Squat', nameAr: 'قرفصاء', sets: 5, reps: '3-5', rest: 240, muscleGroup: 'Quadriceps', intensity: 'high' },
        { id: 'e12', name: 'Romanian Deadlift', nameAr: 'رفع ميت روماني', sets: 4, reps: '6-8', rest: 120, muscleGroup: 'Hamstrings', intensity: 'high' },
        { id: 'e13', name: 'Leg Press', nameAr: 'ضغط الساق', sets: 3, reps: '10-12', rest: 90, muscleGroup: 'Quads', intensity: 'medium' },
        { id: 'e14', name: 'Planks', nameAr: 'لوحة', sets: 3, reps: '45-60s', rest: 60, muscleGroup: 'Core', intensity: 'medium' },
        { id: 'e15', name: 'Calf Raises', nameAr: 'رفع الكاحل', sets: 4, reps: '15-20', rest: 45, muscleGroup: 'Calves', intensity: 'low' },
      ],
    },
    {
      id: 'w4', name: 'Zone 2 Cardio + Mobility', type: 'endurance', duration: 50,
      scienceTip: enduranceTip,
      scienceTipAr: 'بحث: التدريب في المنطقة 2 (60-70% من الحد الأقصى لمعدل ضربات القلب) يحسن كثافة الميتوكوندريا.',
      exercises: [
        { id: 'e16', name: 'Cycling Zone 2', nameAr: 'ركوب دراجة منطقة 2', sets: 1, reps: '35min', rest: 0, muscleGroup: 'Cardiovascular', intensity: 'low' },
        { id: 'e17', name: 'Hip Flexor Stretch', nameAr: 'مط ثنية الورك', sets: 3, reps: '45s each', rest: 30, muscleGroup: 'Hip Flexors', intensity: 'low' },
        { id: 'e18', name: 'Thoracic Rotation', nameAr: 'دوران الصدر', sets: 3, reps: '10 each', rest: 30, muscleGroup: 'Thoracic Spine', intensity: 'low' },
      ],
    },
    {
      id: 'w5', name: 'Full Body Longevity', type: 'longevity', duration: 55,
      scienceTip: longevityTip,
      scienceTipAr: 'بحث: الجمع بين التدريب المقاوم مرتين/أسبوع وتمارين هوائية يقلل الوفيات بنسبة 40%.',
      exercises: [
        { id: 'e19', name: 'Goblet Squat', nameAr: 'قرفصاء الكأس', sets: 3, reps: '12', rest: 60, muscleGroup: 'Full Lower', intensity: 'medium' },
        { id: 'e20', name: 'Push-up Variations', nameAr: 'تنويعات الضغط', sets: 3, reps: '10-15', rest: 60, muscleGroup: 'Chest/Triceps', intensity: 'medium' },
        { id: 'e21', name: 'Inverted Row', nameAr: 'تجديف مقلوب', sets: 3, reps: '10-12', rest: 60, muscleGroup: 'Back', intensity: 'medium' },
        { id: 'e22', name: 'Farmer Walk', nameAr: 'مشي الفلاح', sets: 4, reps: '30m', rest: 90, muscleGroup: 'Full Body', intensity: 'medium' },
        { id: 'e23', name: 'Breathing Meditation', nameAr: 'تأمل التنفس', sets: 1, reps: '10min', rest: 0, muscleGroup: 'Recovery', intensity: 'low' },
      ],
    },
    {
      id: 'w6', name: 'Active Recovery', type: 'recovery', duration: 40,
      scienceTip: 'Research: Active recovery at 30-40% HRmax accelerates lactate clearance by 2x vs passive rest (Monedero & Donne 2000).',
      scienceTipAr: 'بحث: الاستشفاء النشط بـ 30-40% من الحد الأقصى يسرع إزالة اللاكتات مرتين مقارنة بالراحة السلبية.',
      exercises: [
        { id: 'e24', name: 'Yoga Flow', nameAr: 'تدفق اليوغا', sets: 1, reps: '20min', rest: 0, muscleGroup: 'Full Body', intensity: 'low' },
        { id: 'e25', name: 'Foam Rolling', nameAr: 'دحرجة الإسفنج', sets: 1, reps: '10min', rest: 0, muscleGroup: 'Recovery', intensity: 'low' },
        { id: 'e26', name: 'Cold Contrast Shower', nameAr: 'دش التباين الحراري', sets: 1, reps: '3 cycles', rest: 0, muscleGroup: 'CNS Recovery', intensity: 'low' },
      ],
    },
    {
      id: 'w7', name: 'Rest Day', type: 'recovery', duration: 0,
      scienceTip: 'Research: 1-2 full rest days per week are essential for muscle protein synthesis and hormonal recovery (Damas et al. 2016).',
      scienceTipAr: 'بحث: يوم أو يومان راحة كاملة في الأسبوع ضروريان لتخليق البروتين العضلي والاستشفاء الهرموني.',
      exercises: [],
    },
  ];

  return days;
}

const DEFAULT_BIOMARKERS: BiologicalMarker[] = [
  { id: 'testosterone', name: 'Testosterone', value: 520, unit: 'ng/dL', normalMin: 300, normalMax: 1000, category: 'hormones', date: '2025-12-01' },
  { id: 'cortisol', name: 'Cortisol', value: 18, unit: 'µg/dL', normalMin: 6, normalMax: 23, category: 'hormones', date: '2025-12-01' },
  { id: 'insulin', name: 'Insulin', value: 8, unit: 'µU/mL', normalMin: 2, normalMax: 25, category: 'hormones', date: '2025-12-01' },
  { id: 'tsh', name: 'Thyroid (TSH)', value: 2.1, unit: 'mIU/L', normalMin: 0.4, normalMax: 4.0, category: 'hormones', date: '2025-12-01' },
  { id: 'vitamin_d', name: 'Vitamin D', value: 22, unit: 'ng/mL', normalMin: 30, normalMax: 80, category: 'vitamins', date: '2025-12-01' },
  { id: 'vitamin_b12', name: 'Vitamin B12', value: 410, unit: 'pg/mL', normalMin: 200, normalMax: 900, category: 'vitamins', date: '2025-12-01' },
  { id: 'magnesium', name: 'Magnesium', value: 1.6, unit: 'mg/dL', normalMin: 1.7, normalMax: 2.4, category: 'vitamins', date: '2025-12-01' },
  { id: 'ferritin', name: 'Ferritin', value: 85, unit: 'ng/mL', normalMin: 30, normalMax: 300, category: 'vitamins', date: '2025-12-01' },
  { id: 'glucose', name: 'Glucose', value: 92, unit: 'mg/dL', normalMin: 70, normalMax: 100, category: 'metabolic', date: '2025-12-01' },
  { id: 'cholesterol', name: 'Total Cholesterol', value: 195, unit: 'mg/dL', normalMin: 0, normalMax: 200, category: 'metabolic', date: '2025-12-01' },
];

export function HealthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [biomarkers, setBiomarkers] = useState<BiologicalMarker[]>(DEFAULT_BIOMARKERS);
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<MealPlanDay[]>(() => generateMealPlan(DEFAULT_PROFILE, DEFAULT_BIOMARKERS));
  const [weeklyWorkout, setWeeklyWorkout] = useState<WorkoutSession[]>(() => generateWorkout('hypertrophy', DEFAULT_PROFILE));
  const [dailyStats, setDailyStats] = useState({ calories: 1842, water: 1800, steps: 8340, sleep: 7.2 });
  const [onboardingDone, setOnboardingDone] = useState(false);

  const updateProfile = (p: Partial<UserProfile>) => {
    const updated = { ...profile, ...p };
    setProfile(updated);
    setWeeklyMealPlan(generateMealPlan(updated, biomarkers));
  };

  const updateBiomarkers = (markers: BiologicalMarker[]) => {
    setBiomarkers(markers);
    setWeeklyMealPlan(generateMealPlan(profile, markers));
  };

  const addBiomarker = (marker: BiologicalMarker) => {
    const updated = biomarkers.map(b => b.id === marker.id ? marker : b);
    if (!updated.find(b => b.id === marker.id)) updated.push(marker);
    updateBiomarkers(updated);
  };

  const regenerateMealPlan = () => setWeeklyMealPlan(generateMealPlan(profile, biomarkers));

  const regenerateWorkout = (type: WorkoutSession['type']) => setWeeklyWorkout(generateWorkout(type, profile));

  const deficiencies = biomarkers.filter(m => m.value < m.normalMin);

  const healthScore = Math.min(100, Math.round(
    80 - (deficiencies.length * 8) +
    (biomarkers.filter(m => m.value >= m.normalMin && m.value <= m.normalMax).length * 2)
  ));

  const updateDailyStats = (stats: Partial<typeof dailyStats>) => setDailyStats(prev => ({ ...prev, ...stats }));

  const completeOnboarding = () => setOnboardingDone(true);

  return (
    <HealthContext.Provider value={{
      profile, updateProfile, biomarkers, updateBiomarkers, addBiomarker,
      weeklyMealPlan, regenerateMealPlan, weeklyWorkout, regenerateWorkout,
      healthScore, deficiencies, dailyStats, updateDailyStats,
      onboardingDone, completeOnboarding,
    }}>
      {children}
    </HealthContext.Provider>
  );
}

export { HealthContext };
