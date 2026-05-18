/**
 * VitalCore AI — Offline Cache Service
 * Covers: AsyncStorage caching, offline mode, sync queue
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@vitalcore_cache_';
const SYNC_QUEUE_KEY = '@vitalcore_sync_queue';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // seconds
}

// ── Generic Cache ─────────────────────────────────────────────────────────────
export async function cacheSet<T>(key: string, data: T, ttlSeconds = 3600): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (err) {
    console.warn('[Cache] Set failed:', key, err);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    const expired = Date.now() - entry.timestamp > entry.ttl;
    if (expired) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch { }
}

export async function cacheClearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch { }
}

// ── Specific Cache Keys ───────────────────────────────────────────────────────
export const CacheKeys = {
  mealPlan: (userId: string) => `meal_plan_${userId}`,
  workouts: (userId: string) => `workouts_${userId}`,
  biomarkers: (userId: string) => `biomarkers_${userId}`,
  profile: (userId: string) => `profile_${userId}`,
  aiAnalysis: (userId: string) => `ai_analysis_${userId}`,
  dailyStats: (userId: string, date: string) => `daily_stats_${userId}_${date}`,
  weightHistory: (userId: string) => `weight_history_${userId}`,
  healthScore: (userId: string) => `health_score_${userId}`,
  subscription: (userId: string) => `subscription_${userId}`,
  featureFlags: 'feature_flags',
};

// ── Sync Queue (for offline writes) ──────────────────────────────────────────
interface SyncItem {
  id: string;
  table: string;
  operation: 'insert' | 'upsert' | 'update';
  data: any;
  timestamp: number;
  retries: number;
}

export async function enqueueSyncItem(table: string, operation: SyncItem['operation'], data: any): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncItem[] = raw ? JSON.parse(raw) : [];
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      table, operation, data,
      timestamp: Date.now(),
      retries: 0,
    });
    // Keep max 200 items
    const trimmed = queue.slice(-200);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[SyncQueue] Enqueue failed:', err);
  }
}

export async function getSyncQueue(): Promise<SyncItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncItem[] = raw ? JSON.parse(raw) : [];
    const updated = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
  } catch { }
}

export async function clearSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  } catch { }
}

// ── User Preferences ──────────────────────────────────────────────────────────
const PREFS_KEY = '@vitalcore_preferences';

interface UserPreferences {
  language: string;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light' | 'auto';
  onboardingDone: boolean;
  lastSyncAt: number | null;
  offlineModeEnabled: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  language: 'fr',
  notificationsEnabled: false,
  theme: 'dark',
  onboardingDone: false,
  lastSyncAt: null,
  offlineModeEnabled: true,
};

export async function getPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): Promise<void> {
  try {
    const current = await getPreferences();
    const updated = { ...current, [key]: value };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  } catch { }
}

export async function updateLastSync(): Promise<void> {
  await setPreference('lastSyncAt', Date.now());
}
