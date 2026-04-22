// VitalCore AI — Gamification Service (Streaks, XP, Badges)
import { supabase } from './supabase';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalLogs: number;
  xp: number;
}

export interface Achievement {
  type: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  xpReward: number;
  condition: (stats: StreakData & { biomarkerCount: number; analysisCount: number }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    type: 'first_login', title: 'Premier Pas', titleAr: 'الخطوة الأولى',
    description: 'Bienvenue dans VitalCore AI !', descriptionAr: 'مرحباً في VitalCore AI!',
    icon: '🎯', xpReward: 50,
    condition: () => true,
  },
  {
    type: 'first_biomarker', title: 'Scientifique', titleAr: 'عالم',
    description: 'Votre premier bilan sanguin ajouté.', descriptionAr: 'تمت إضافة أول تحليل دم.',
    icon: '🔬', xpReward: 100,
    condition: (s) => s.biomarkerCount >= 1,
  },
  {
    type: 'first_workout', title: 'Athlète', titleAr: 'رياضي',
    description: 'Première séance d\'entraînement complétée.', descriptionAr: 'اكتملت أول جلسة تدريب.',
    icon: '💪', xpReward: 100,
    condition: (s) => s.totalWorkouts >= 1,
  },
  {
    type: 'streak_7', title: '7 jours d\'affilée', titleAr: '7 أيام متتالية',
    description: 'Actif 7 jours consécutifs.', descriptionAr: '7 أيام متتالية من النشاط.',
    icon: '🔥', xpReward: 300,
    condition: (s) => s.currentStreak >= 7,
  },
  {
    type: 'streak_30', title: 'Warrior du Mois', titleAr: 'محارب الشهر',
    description: '30 jours consécutifs — incroyable !', descriptionAr: '30 يوماً متتالياً - رائع!',
    icon: '⚡', xpReward: 1000,
    condition: (s) => s.currentStreak >= 30,
  },
  {
    type: 'workout_10', title: '10 Séances', titleAr: '10 جلسات',
    description: '10 entraînements complétés.', descriptionAr: 'اكتمال 10 جلسات تدريب.',
    icon: '🏋️', xpReward: 200,
    condition: (s) => s.totalWorkouts >= 10,
  },
  {
    type: 'ai_analysis', title: 'Data Scientist', titleAr: 'عالم البيانات',
    description: 'Première analyse IA lancée.', descriptionAr: 'إطلاق أول تحليل ذكاء اصطناعي.',
    icon: '🤖', xpReward: 150,
    condition: (s) => s.analysisCount >= 1,
  },
  {
    type: 'xp_500', title: 'VitalCore Pro', titleAr: 'VitalCore Pro',
    description: '500 XP gagnés.', descriptionAr: 'تم اكتساب 500 XP.',
    icon: '⭐', xpReward: 0,
    condition: (s) => s.xp >= 500,
  },
];

export const XP_REWARDS: Record<string, number> = {
  daily_login: 10,
  log_food: 15,
  complete_workout: 50,
  add_biomarker: 30,
  run_ai_analysis: 40,
  drink_water: 5,
  log_sleep: 20,
  import_pdf: 80,
};

export async function loadStreaks(userId: string): Promise<StreakData> {
  const { data } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) return { currentStreak: 0, longestStreak: 0, totalWorkouts: 0, totalLogs: 0, xp: 0 };
  return {
    currentStreak: data.current_streak || 0,
    longestStreak: data.longest_streak || 0,
    totalWorkouts: data.total_workouts || 0,
    totalLogs: data.total_logs || 0,
    xp: data.xp || 0,
  };
}

export async function addXP(userId: string, action: keyof typeof XP_REWARDS): Promise<number> {
  const amount = XP_REWARDS[action] || 0;
  if (!amount) return 0;

  const { data: current } = await supabase.from('streaks').select('xp').eq('user_id', userId).single();
  const currentXP = current?.xp || 0;
  const newXP = currentXP + amount;

  await supabase.from('streaks').upsert({ user_id: userId, xp: newXP }, { onConflict: 'user_id' });
  return newXP;
}

export async function updateDailyStreak(userId: string): Promise<{ newStreak: number; xpGained: number }> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const { data } = await supabase.from('streaks').select('*').eq('user_id', userId).single();

  let currentStreak = data?.current_streak || 0;
  let longestStreak = data?.longest_streak || 0;
  let xp = data?.xp || 0;
  const lastDate = data?.last_activity_date;

  let xpGained = 0;

  if (lastDate === today) {
    return { newStreak: currentStreak, xpGained: 0 };
  } else if (lastDate === yesterday) {
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    xpGained = XP_REWARDS.daily_login;
    xp += xpGained;
  } else {
    currentStreak = 1;
    xpGained = XP_REWARDS.daily_login;
    xp += xpGained;
  }

  await supabase.from('streaks').upsert({
    user_id: userId,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_activity_date: today,
    xp,
  }, { onConflict: 'user_id' });

  return { newStreak: currentStreak, xpGained };
}

export async function loadAchievements(userId: string): Promise<string[]> {
  const { data } = await supabase.from('achievements').select('type').eq('user_id', userId);
  return (data || []).map((a: any) => a.type);
}

export async function checkAndUnlockAchievements(
  userId: string,
  stats: StreakData & { biomarkerCount: number; analysisCount: number }
): Promise<Achievement[]> {
  const earned = await loadAchievements(userId);
  const newlyUnlocked: Achievement[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (!earned.includes(ach.type) && ach.condition(stats)) {
      await supabase.from('achievements').insert({
        user_id: userId,
        type: ach.type,
        title: ach.title,
        description: ach.description,
      }).catch(() => {});

      if (ach.xpReward > 0) {
        await addXP(userId, 'daily_login'); // Just to trigger XP update
      }
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

export function getXPLevel(xp: number): { level: number; title: string; titleAr: string; nextLevelXP: number; progress: number } {
  const levels = [
    { xp: 0, title: 'Débutant', titleAr: 'مبتدئ' },
    { xp: 100, title: 'Actif', titleAr: 'نشيط' },
    { xp: 300, title: 'Motivé', titleAr: 'متحمس' },
    { xp: 600, title: 'Avancé', titleAr: 'متقدم' },
    { xp: 1000, title: 'Expert', titleAr: 'خبير' },
    { xp: 2000, title: 'Elite', titleAr: 'نخبة' },
    { xp: 5000, title: 'VitalCore Pro', titleAr: 'VitalCore Pro' },
  ];

  let level = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) { level = i; break; }
  }

  const current = levels[level];
  const next = levels[Math.min(level + 1, levels.length - 1)];
  const rangeXP = next.xp - current.xp;
  const earnedInRange = xp - current.xp;
  const progress = rangeXP > 0 ? Math.min(1, earnedInRange / rangeXP) : 1;

  return { level: level + 1, title: current.title, titleAr: current.titleAr, nextLevelXP: next.xp, progress };
}
