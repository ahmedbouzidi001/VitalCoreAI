/**
 * VitalCore AI — Analytics & Instrumentation Service
 * Covers: Conversion tracking, retention, churn, feature usage, error reporting
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const APP_VERSION = '2.3.0';
const SESSION_KEY = '@vitalcore_session_id';

let _sessionId: string | null = null;
let _userId: string | null = null;
let _eventQueue: Array<{ name: string; properties: any; timestamp: number }> = [];
let _flushTimeout: any = null;

// ── Session Management ────────────────────────────────────────────────────────
async function getSessionId(): Promise<string> {
  if (_sessionId) return _sessionId;
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) {
      const { id, timestamp } = JSON.parse(stored);
      // New session if >30 min since last activity
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        _sessionId = id;
        return id;
      }
    }
  } catch { }
  _sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ id: _sessionId, timestamp: Date.now() }));
  return _sessionId;
}

export function setAnalyticsUser(userId: string | null) {
  _userId = userId;
}

// ── Event Tracking ────────────────────────────────────────────────────────────
export async function track(eventName: string, properties?: Record<string, any>) {
  if (!_userId) return; // Only track authenticated users

  _eventQueue.push({
    name: eventName,
    properties: {
      platform: Platform.OS,
      app_version: APP_VERSION,
      ...properties,
    },
    timestamp: Date.now(),
  });

  // Debounce flush
  if (_flushTimeout) clearTimeout(_flushTimeout);
  _flushTimeout = setTimeout(flushEvents, 2000);

  // Immediate flush if queue is large
  if (_eventQueue.length >= 10) await flushEvents();
}

async function flushEvents() {
  if (!_userId || _eventQueue.length === 0) return;

  const events = [..._eventQueue];
  _eventQueue = [];

  try {
    const sessionId = await getSessionId();
    const rows = events.map(e => ({
      user_id: _userId,
      event_name: e.name,
      properties: e.properties,
      session_id: sessionId,
      platform: Platform.OS,
      app_version: APP_VERSION,
    }));

    await supabase.from('analytics_events').insert(rows);
  } catch (err) {
    // Re-queue failed events (max 50)
    _eventQueue = [...events.slice(-50), ..._eventQueue];
  }
}

// ── Predefined Event Helpers ──────────────────────────────────────────────────

// Auth
export const trackSignUp = () => track('user_signed_up');
export const trackLogin = (method: string) => track('user_logged_in', { method });
export const trackLogout = () => track('user_logged_out');

// Onboarding (Conversion)
export const trackOnboardingStart = () => track('onboarding_started');
export const trackOnboardingComplete = (profile: any) => track('onboarding_completed', {
  age: profile.age, gender: profile.gender, goals: profile.goals,
});

// AI Features (Retention drivers)
export const trackAIAnalysis = (biomarkerCount: number) => track('ai_analysis_run', { biomarker_count: biomarkerCount });
export const trackChatMessage = () => track('chat_message_sent');
export const trackMealPlanGenerated = (withPreferences: boolean) => track('meal_plan_generated', { with_preferences: withPreferences });
export const trackWorkoutGenerated = (type: string, split: string) => track('workout_generated', { type, split });

// Food Tracking (Retention)
export const trackFoodLogged = (method: 'search' | 'barcode' | 'manual') => track('food_logged', { method });

// Premium (Monetization + Churn)
export const trackPremiumViewed = () => track('premium_screen_viewed');
export const trackCheckoutStarted = (plan: string) => track('checkout_started', { plan });
export const trackCheckoutCompleted = (plan: string) => track('checkout_completed', { plan });
export const trackCheckoutAbandoned = (plan: string) => track('checkout_abandoned', { plan });
export const trackSubscriptionChecked = (subscribed: boolean, tier: string) => track('subscription_checked', { subscribed, tier });
export const trackManageSubscription = () => track('manage_subscription_clicked');

// Health Score (Engagement)
export const trackHealthScoreViewed = (score: number) => track('health_score_viewed', { score });
export const trackBiomarkerAdded = (category: string) => track('biomarker_added', { category });
export const trackPDFExported = () => track('pdf_exported');
export const trackWeightLogged = (weight: number) => track('weight_logged', { weight });

// Training (Retention)
export const trackWorkoutStarted = (type: string) => track('workout_started', { type });
export const trackWorkoutCompleted = (duration: number, exercises: number) => track('workout_completed', { duration, exercises });
export const trackSetCompleted = (weight: number) => track('set_completed', { weight_kg: weight });

// Screen Views (UX)
export const trackScreenView = (screen: string) => track('screen_viewed', { screen });

// Feature Flags (A/B testing)
export const trackFeatureExposure = (flagKey: string, enabled: boolean) => track('feature_flag_exposure', { flag_key: flagKey, enabled });

// ── Error Reporting ───────────────────────────────────────────────────────────
export async function reportError(
  errorType: string,
  message: string,
  context?: Record<string, any>,
  stackTrace?: string
) {
  if (!_userId) return;
  try {
    await supabase.from('error_reports').insert({
      user_id: _userId,
      error_type: errorType,
      error_message: message,
      stack_trace: stackTrace,
      context: context || {},
      platform: Platform.OS,
      app_version: APP_VERSION,
    });
  } catch { }
}

// ── Idempotency ───────────────────────────────────────────────────────────────
const _dedupeCache = new Set<string>();

export async function trackOnce(eventName: string, properties?: Record<string, any>) {
  const key = `${_userId}_${eventName}`;
  if (_dedupeCache.has(key)) return;
  _dedupeCache.add(key);
  await track(eventName, properties);
}

// ── Feature Flags ─────────────────────────────────────────────────────────────
const _flagCache: Record<string, boolean> = {};

export async function isFeatureEnabled(flagKey: string, defaultValue = false): Promise<boolean> {
  if (flagKey in _flagCache) return _flagCache[flagKey];

  try {
    const { data } = await supabase
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag_key', flagKey)
      .single();

    if (!data) {
      _flagCache[flagKey] = defaultValue;
      return defaultValue;
    }

    // Rollout percentage check (deterministic per user)
    let enabled = data.enabled;
    if (enabled && data.rollout_percentage < 100) {
      const userHash = _userId ? parseInt(_userId.replace(/-/g, '').slice(0, 8), 16) : 0;
      enabled = (userHash % 100) < data.rollout_percentage;
    }

    _flagCache[flagKey] = enabled;
    trackFeatureExposure(flagKey, enabled);
    return enabled;
  } catch {
    _flagCache[flagKey] = defaultValue;
    return defaultValue;
  }
}

// ── Offline Cache Support ─────────────────────────────────────────────────────
const OFFLINE_QUEUE_KEY = '@vitalcore_offline_events';

export async function saveOfflineEvent(eventName: string, properties?: Record<string, any>) {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ eventName, properties, timestamp: Date.now() });
    // Keep max 100 offline events
    const trimmed = queue.slice(-100);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
  } catch { }
}

export async function flushOfflineEvents() {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue: any[] = JSON.parse(raw);
    if (queue.length === 0) return;
    for (const e of queue) {
      await track(e.eventName, e.properties);
    }
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch { }
}
