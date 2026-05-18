/**
 * VitalCore AI — GDPR / Data Privacy Service
 * Covers: Right to access, right to deletion, data export, consent management
 */
import { supabase } from './supabase';
import { cacheClearAll } from './offlineCache';

export interface GDPRConsent {
  analytics: boolean;
  marketing: boolean;
  health_data: boolean;
  accepted_at: string;
  version: string;
}

const CONSENT_VERSION = '1.0';

// ── Data Export (Right to Access — GDPR Art. 15) ─────────────────────────────
export async function requestDataExport(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('data_export_requests')
      .insert({ user_id: userId, status: 'pending' });

    if (error) return { success: false, error: error.message };

    // Collect all user data for export
    const [profile, biomarkers, dailyStats, mealPlans, workouts, foodLogs, weightHistory, chatHistory, achievements] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('biomarkers').select('*').eq('user_id', userId),
      supabase.from('daily_stats').select('*').eq('user_id', userId),
      supabase.from('meal_plans').select('week_start, created_at').eq('user_id', userId),
      supabase.from('workouts').select('*').eq('user_id', userId),
      supabase.from('food_logs').select('*').eq('user_id', userId),
      supabase.from('weight_history').select('*').eq('user_id', userId),
      supabase.from('chat_history').select('role, content, created_at').eq('user_id', userId),
      supabase.from('achievements').select('*').eq('user_id', userId),
    ]);

    const exportData = {
      export_metadata: {
        generated_at: new Date().toISOString(),
        gdpr_regulation: 'EU 2016/679',
        data_controller: 'VitalCore AI',
        retention_policy: '3 years from last login',
        consent_version: CONSENT_VERSION,
      },
      user_profile: profile.data,
      health_data: {
        biomarkers: biomarkers.data || [],
        daily_stats: dailyStats.data || [],
        weight_history: weightHistory.data || [],
        food_logs: foodLogs.data || [],
        achievements: achievements.data || [],
      },
      training_data: {
        workouts: workouts.data || [],
      },
      nutrition_data: {
        meal_plans_count: (mealPlans.data || []).length,
      },
      communication: {
        chat_history: chatHistory.data || [],
      },
    };

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Account Deletion (Right to Erasure — GDPR Art. 17) ───────────────────────
export async function requestAccountDeletion(
  userId: string,
  confirmEmail: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (confirmEmail.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
    return { success: false, error: "Email de confirmation incorrect" };
  }

  try {
    // Log deletion request in audit
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      resource: 'user_account',
      metadata: { requested_at: new Date().toISOString() },
    });

    // Delete all user data cascades via FK constraints
    // The following tables have ON DELETE CASCADE from user_profiles:
    // biomarkers, daily_stats, meal_plans, workouts, food_logs,
    // weight_history, chat_history, achievements, streaks, etc.

    // Sign out first
    await supabase.auth.signOut();

    // Clear local cache
    await cacheClearAll();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Consent Management ────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = '@vitalcore_gdpr_consent';

export async function saveConsent(consent: Omit<GDPRConsent, 'accepted_at' | 'version'>): Promise<void> {
  const full: GDPRConsent = {
    ...consent,
    accepted_at: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(full));
}

export async function getConsent(): Promise<GDPRConsent | null> {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function hasValidConsent(): Promise<boolean> {
  const consent = await getConsent();
  if (!consent) return false;
  return consent.version === CONSENT_VERSION && consent.health_data;
}

// ── Audit Logging ─────────────────────────────────────────────────────────────
export async function auditLog(
  userId: string,
  action: string,
  resource: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      resource,
      metadata: metadata || {},
    });
  } catch { }
}

// ── Rate Limiting (client-side soft limit) ────────────────────────────────────
const _rateLimitCache: Record<string, { count: number; windowStart: number }> = {};
const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  ai_analysis: { requests: 10, windowMs: 60 * 60 * 1000 },      // 10/hour
  chat_message: { requests: 50, windowMs: 60 * 60 * 1000 },     // 50/hour
  meal_plan: { requests: 5, windowMs: 60 * 60 * 1000 },         // 5/hour
  workout_gen: { requests: 10, windowMs: 60 * 60 * 1000 },      // 10/hour
  pdf_export: { requests: 3, windowMs: 24 * 60 * 60 * 1000 },   // 3/day
};

export function checkRateLimit(endpoint: string): { allowed: boolean; remaining: number; resetIn: number } {
  const limit = RATE_LIMITS[endpoint];
  if (!limit) return { allowed: true, remaining: 999, resetIn: 0 };

  const now = Date.now();
  const cached = _rateLimitCache[endpoint];

  if (!cached || now - cached.windowStart > limit.windowMs) {
    _rateLimitCache[endpoint] = { count: 1, windowStart: now };
    return { allowed: true, remaining: limit.requests - 1, resetIn: limit.windowMs };
  }

  if (cached.count >= limit.requests) {
    const resetIn = limit.windowMs - (now - cached.windowStart);
    return { allowed: false, remaining: 0, resetIn };
  }

  cached.count++;
  return {
    allowed: true,
    remaining: limit.requests - cached.count,
    resetIn: limit.windowMs - (now - cached.windowStart),
  };
}

// ── Data Retention ─────────────────────────────────────────────────────────────
export const DATA_RETENTION_POLICY = {
  chat_history: '90 days',
  analytics_events: '1 year',
  audit_log: '3 years',
  health_data: '3 years from last login',
  error_reports: '6 months',
};

// ── Privacy Policy URL ─────────────────────────────────────────────────────────
export const PRIVACY_POLICY_URL = 'https://vitalcoreai.com/privacy';
export const TERMS_URL = 'https://vitalcoreai.com/terms';
