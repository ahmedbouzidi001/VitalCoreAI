// VitalCore AI — Gamification Dashboard + Notifications Screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Switch, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useHealth } from '@/hooks/useHealth';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import {
  loadStreaks, loadAchievements, getXPLevel,
  ACHIEVEMENTS, StreakData,
} from '@/services/gamification';
import {
  enableAllNotifications, cancelAllNotifications,
  requestNotificationPermissions,
} from '@/services/notifications';
import { useAlert } from '@/template';

export default function GamificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { biomarkers, deficiencies, healthScore } = useHealth();
  const { showAlert } = useAlert();

  const [streaks, setStreaks] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, totalWorkouts: 0, totalLogs: 0, xp: 0 });
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingNotif, setTogglingNotif] = useState(false);

  const levelData = getXPLevel(streaks.xp);

  const isAr = language === 'ar';

  useEffect(() => {
    if (user) loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [s, a] = await Promise.all([
      loadStreaks(user.id),
      loadAchievements(user.id),
    ]);
    setStreaks(s);
    setEarnedAchievements(a);
    setLoading(false);
  };

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    setTogglingNotif(true);
    if (value) {
      const granted = await enableAllNotifications(language);
      if (granted) {
        setNotificationsEnabled(true);
        showAlert('✅ Notifications activées', isAr
          ? 'ستتلقى تذكيرات للماء والوجبات والتدريب والنوم'
          : 'Vous recevrez des rappels pour l\'eau, les repas, l\'entraînement et le sommeil.'
        );
      } else {
        showAlert('⚠️ Permission refusée', isAr
          ? 'تحتاج إلى إذن الإشعارات في الإعدادات'
          : 'Activez les notifications dans les paramètres de votre appareil.'
        );
      }
    } else {
      await cancelAllNotifications();
      setNotificationsEnabled(false);
    }
    setTogglingNotif(false);
  }, [language, isAr]);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentAch = ACHIEVEMENTS.filter(a => earnedAchievements.includes(a.type));
  const lockedAch = ACHIEVEMENTS.filter(a => !earnedAchievements.includes(a.type));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>{isAr ? 'الإنجازات والمكافآت' : 'Progression & Succès'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* XP Level Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNum}>{levelData.level}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>{isAr ? levelData.titleAr : levelData.title}</Text>
              <Text style={styles.xpText}>{streaks.xp} XP · Prochain niveau : {levelData.nextLevelXP} XP</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+XP</Text>
            </View>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${levelData.progress * 100}%` }]} />
          </View>
          <Text style={styles.xpProgress}>{Math.round(levelData.progress * 100)}% vers le niveau {levelData.level + 1}</Text>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakVal}>{streaks.currentStreak}</Text>
              <Text style={styles.streakLabel}>{isAr ? 'أيام متتالية' : 'Jours consécutifs'}</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakItem}>
              <Text style={styles.streakIcon}>⚡</Text>
              <Text style={styles.streakVal}>{streaks.longestStreak}</Text>
              <Text style={styles.streakLabel}>{isAr ? 'أفضل سجل' : 'Meilleur record'}</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakItem}>
              <Text style={styles.streakIcon}>💪</Text>
              <Text style={styles.streakVal}>{streaks.totalWorkouts}</Text>
              <Text style={styles.streakLabel}>{isAr ? 'تدريبات' : 'Entraînements'}</Text>
            </View>
          </View>
        </View>

        {/* Health Stats Summary */}
        <View style={styles.healthStatsCard}>
          <Text style={styles.sectionTitle}>{isAr ? 'إحصائياتك الصحية' : 'Vos Stats Santé'}</Text>
          <View style={styles.healthStatsRow}>
            {[
              { icon: 'favorite', val: healthScore, label: isAr ? 'نقاط الصحة' : 'Score Santé', color: Colors.success, unit: '/100' },
              { icon: 'biotech', val: biomarkers.length, label: isAr ? 'مؤشرات' : 'Marqueurs', color: Colors.primary, unit: '' },
              { icon: 'warning-amber', val: deficiencies.length, label: isAr ? 'نقص' : 'Carences', color: Colors.warning, unit: '' },
            ].map((s, i) => (
              <View key={i} style={styles.healthStatItem}>
                <MaterialIcons name={s.icon as any} size={20} color={s.color} />
                <Text style={[styles.healthStatVal, { color: s.color }]}>{s.val}{s.unit}</Text>
                <Text style={styles.healthStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.notifCard}>
          <View style={styles.notifHeader}>
            <MaterialIcons name="notifications" size={20} color={Colors.primary} />
            <Text style={styles.notifTitle}>{isAr ? 'الإشعارات الذكية' : 'Rappels Intelligents'}</Text>
          </View>
          <Text style={styles.notifDesc}>
            {isAr
              ? 'تذكيرات الترطيب (7/jour) · وقت الوجبة · التدريب · النوم'
              : 'Hydratation (7/jour) · Repas · Entraînement · Sommeil'}
          </Text>

          <View style={styles.notifTypes}>
            {[
              { icon: '💧', label: isAr ? 'ترطيب × 7' : 'Hydratation × 7', time: '9h→21h' },
              { icon: '🍽️', label: isAr ? 'وجبات × 3' : 'Repas × 3', time: '8h, 13h, 20h' },
              { icon: '🏋️', label: isAr ? 'تدريب' : 'Entraînement', time: '18h00' },
              { icon: '😴', label: isAr ? 'نوم' : 'Sommeil', time: '22h30' },
            ].map((n, i) => (
              <View key={i} style={styles.notifTypeRow}>
                <Text style={styles.notifTypeIcon}>{n.icon}</Text>
                <Text style={styles.notifTypeLabel}>{n.label}</Text>
                <Text style={styles.notifTypeTime}>{n.time}</Text>
                {notificationsEnabled && <MaterialIcons name="check-circle" size={14} color={Colors.success} />}
              </View>
            ))}
          </View>

          <View style={styles.notifToggleRow}>
            <Text style={styles.notifToggleLabel}>
              {notificationsEnabled
                ? (isAr ? 'الإشعارات مفعّلة ✅' : 'Notifications activées ✅')
                : (isAr ? 'تفعيل الإشعارات' : 'Activer les notifications')
              }
            </Text>
            {togglingNotif
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
                thumbColor={Colors.textPrimary}
              />
            }
          </View>
        </View>

        {/* Earned Achievements */}
        {currentAch.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {isAr ? `🏆 إنجازاتك (${currentAch.length})` : `🏆 Vos succès (${currentAch.length})`}
            </Text>
            <View style={styles.achGrid}>
              {currentAch.map((a, i) => (
                <View key={i} style={[styles.achCard, styles.achCardEarned]}>
                  <Text style={styles.achIcon}>{a.icon}</Text>
                  <Text style={styles.achTitle}>{isAr ? a.titleAr : a.title}</Text>
                  <Text style={styles.achDesc} numberOfLines={2}>{isAr ? a.descriptionAr : a.description}</Text>
                  {a.xpReward > 0 && (
                    <View style={styles.xpRewardBadge}>
                      <Text style={styles.xpRewardText}>+{a.xpReward} XP</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Locked Achievements */}
        {lockedAch.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {isAr ? `🔒 إنجازات قادمة (${lockedAch.length})` : `🔒 À débloquer (${lockedAch.length})`}
            </Text>
            <View style={styles.achGrid}>
              {lockedAch.map((a, i) => (
                <View key={i} style={[styles.achCard, styles.achCardLocked]}>
                  <Text style={[styles.achIcon, { opacity: 0.3 }]}>{a.icon}</Text>
                  <Text style={[styles.achTitle, { color: Colors.textMuted }]}>{isAr ? a.titleAr : a.title}</Text>
                  <Text style={[styles.achDesc, { color: Colors.textMuted }]} numberOfLines={2}>
                    {isAr ? a.descriptionAr : a.description}
                  </Text>
                  {a.xpReward > 0 && (
                    <View style={[styles.xpRewardBadge, { backgroundColor: Colors.surfaceElevated }]}>
                      <Text style={[styles.xpRewardText, { color: Colors.textMuted }]}>+{a.xpReward} XP</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {!user && (
          <TouchableOpacity style={styles.loginCTA} onPress={() => router.push('/login')} activeOpacity={0.85}>
            <MaterialIcons name="login" size={18} color={Colors.textInverse} />
            <Text style={styles.loginCTAText}>
              {isAr ? 'سجل الدخول لتتبع تقدمك' : 'Connectez-vous pour suivre vos progrès'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backBtn: { padding: 4 },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  scroll: { paddingHorizontal: Spacing.md },

  levelCard: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '44' },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  levelNum: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  levelInfo: { flex: 1 },
  levelTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  xpText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  xpBadge: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  xpBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },
  xpBarBg: { height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  xpBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  xpProgress: { fontSize: FontSize.xs, color: Colors.textSecondary },

  streakCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakItem: { flex: 1, alignItems: 'center', gap: 4 },
  streakIcon: { fontSize: 24 },
  streakVal: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  streakLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  streakDivider: { width: 1, height: 48, backgroundColor: Colors.surfaceBorder },

  healthStatsCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  healthStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  healthStatItem: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: Colors.background, borderRadius: Radius.md, padding: 10 },
  healthStatVal: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  healthStatLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },

  notifCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  notifTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  notifDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  notifTypes: { gap: 8, marginBottom: 14 },
  notifTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  notifTypeIcon: { fontSize: 18, width: 28 },
  notifTypeLabel: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  notifTypeTime: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  notifToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  notifToggleLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },

  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },
  achCard: { width: '47%', borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1 },
  achCardEarned: { backgroundColor: Colors.goldMuted, borderColor: Colors.gold + '66' },
  achCardLocked: { backgroundColor: Colors.surface, borderColor: Colors.surfaceBorder },
  achIcon: { fontSize: 32, marginBottom: 4 },
  achTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  achDesc: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', lineHeight: 14 },
  xpRewardBadge: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  xpRewardText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textInverse },

  loginCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, marginVertical: Spacing.md },
  loginCTAText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },
});
