import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

function getGreeting(t: (k: any) => string) {
  const h = new Date().getHours();
  if (h < 12) return t('good_morning');
  if (h < 17) return t('good_afternoon');
  return t('good_evening');
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    optimal: { bg: Colors.successMuted, text: Colors.success, label: 'Optimal' },
    low: { bg: Colors.warningMuted, text: Colors.warning, label: 'Bas' },
    high: { bg: Colors.dangerMuted, text: Colors.danger, label: 'Élevé' },
    critical: { bg: Colors.dangerMuted, text: Colors.danger, label: 'Critique' },
  };
  const c = cfg[status] || cfg.optimal;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function CircleProgress({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(1, Math.max(0, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.circleBg, { width: size, height: size, borderRadius: size / 2, borderColor: Colors.surfaceBorder }]} />
      <View style={[styles.circleArc, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, borderColor: color, borderTopColor: color, opacity: pct > 0 ? 1 : 0 }]} />
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    profile, healthScore, deficiencies, biomarkers, dailyStats,
    weeklyMealPlan, updateDailyStats,
    aiAnalysis, runAIAnalysis, isAILoading, aiError, isDataLoading,
  } = useHealth();
  const { t, language, isRTL } = useLanguage();

  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayPlan = weeklyMealPlan[dayIndex];
  const tdee = todayPlan ? todayPlan.totalCalories : 2200;

  const calorieProgress = Math.min(1, dailyStats.calories / tdee);
  const waterProgress = Math.min(1, dailyStats.water / 2500);
  const stepProgress = Math.min(1, dailyStats.steps / 10000);

  const hormones = biomarkers.filter(b => b.category === 'hormones').slice(0, 4);
  const getStatus = (b: any) => {
    if (b.value < b.normalMin * 0.7 || b.value > b.normalMax * 1.3) return 'critical';
    if (b.value < b.normalMin) return 'low';
    if (b.value > b.normalMax) return 'high';
    return 'optimal';
  };

  const scoreColor = healthScore >= 75 ? Colors.success : healthScore >= 50 ? Colors.warning : Colors.danger;

  // Use AI analysis if available, fallback to local
  const aiSummary = aiAnalysis?.summary || (
    deficiencies.length > 0
      ? `${deficiencies.length} carence(s) détectée(s). Plan nutritionnel adapté en conséquence.`
      : 'Tous vos marqueurs biologiques sont optimaux. Continuez votre plan actuel !'
  );

  const aiSupplements = aiAnalysis?.supplements || [];
  const aiLocalFoods = aiAnalysis?.local_foods || [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting(t)}, {user ? user.email?.split('@')[0] : profile.name} 👋</Text>
            <Text style={styles.headerSub}>
              {language === 'ar' ? 'تقريرك الصحي لليوم' : language === 'fr' ? 'Votre bilan santé du jour' : 'Your health report today'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/login')}>
            <MaterialIcons name={user ? 'person' : 'login'} size={24} color={Colors.textSecondary} />
            {deficiencies.length > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        {isDataLoading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Chargement de vos données...</Text>
          </View>
        )}

        {/* Health Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>{t('health_score')}</Text>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{healthScore}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.scoreRight}>
            <View style={styles.scoreBarBg}>
              <View style={[styles.scoreBarFill, { width: `${healthScore}%`, backgroundColor: scoreColor }]} />
            </View>
            <View style={styles.scoreStats}>
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatVal, { color: Colors.success }]}>{biomarkers.filter(b => b.value >= b.normalMin && b.value <= b.normalMax).length}</Text>
                <Text style={styles.scoreStatLabel}>Optimaux</Text>
              </View>
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatVal, { color: Colors.warning }]}>{deficiencies.length}</Text>
                <Text style={styles.scoreStatLabel}>Carences</Text>
              </View>
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatVal, { color: Colors.primary }]}>{biomarkers.length}</Text>
                <Text style={styles.scoreStatLabel}>Marqueurs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Analysis Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIconWrap}>
              <MaterialIcons name="psychology" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.aiLabel}>{t('ai_recommendation')}</Text>
            <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>EBM • IA</Text></View>
          </View>
          <Text style={styles.aiText}>{aiSummary}</Text>

          {aiAnalysis && aiAnalysis.nutrition_adjustments?.length > 0 && (
            <View style={styles.aiTipsList}>
              {aiAnalysis.nutrition_adjustments.slice(0, 2).map((tip, i) => (
                <View key={i} style={styles.aiTipRow}>
                  <View style={styles.aiTipDot} />
                  <Text style={styles.aiTipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {aiSupplements.length > 0 && (
            <View style={styles.supplementsRow}>
              {aiSupplements.slice(0, 3).map((s, i) => (
                <View key={i} style={styles.supplementChip}>
                  <Text style={styles.supplementName}>{s.name}</Text>
                  <Text style={styles.supplementDose}>{s.dose}</Text>
                </View>
              ))}
            </View>
          )}

          {aiLocalFoods.length > 0 && (
            <View style={styles.localFoodsBox}>
              <Text style={styles.localFoodsLabel}>🇹🇳 Aliments locaux recommandés :</Text>
              <Text style={styles.localFoodsText}>{aiLocalFoods.join(' · ')}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.analyzeNowBtn, isAILoading && styles.analyzeNowBtnLoading]}
            onPress={runAIAnalysis}
            disabled={isAILoading}
            activeOpacity={0.85}
          >
            {isAILoading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <MaterialIcons name="auto-awesome" size={16} color={Colors.textInverse} />
            }
            <Text style={styles.analyzeNowText}>
              {isAILoading ? 'Analyse en cours...' : 'Analyser avec IA'}
            </Text>
          </TouchableOpacity>

          {aiError && <Text style={styles.aiErrorText}>{aiError}</Text>}
        </View>

        {/* Daily Stats */}
        <Text style={styles.sectionTitle}>{t('today_summary')}</Text>
        <View style={styles.statsGrid}>
          {[
            {
              label: t('calories_consumed'), value: `${dailyStats.calories}`,
              total: `${tdee}`, icon: 'local-fire-department', color: Colors.gold, progress: calorieProgress,
              onPress: () => updateDailyStats({ calories: dailyStats.calories + 100 }),
            },
            {
              label: t('water_intake'), value: `${dailyStats.water}ml`,
              total: '2500ml', icon: 'water-drop', color: Colors.primary, progress: waterProgress,
              onPress: () => updateDailyStats({ water: dailyStats.water + 250 }),
            },
            {
              label: t('steps_today'), value: `${dailyStats.steps.toLocaleString()}`,
              total: '10,000', icon: 'directions-walk', color: Colors.success, progress: stepProgress,
              onPress: () => updateDailyStats({ steps: dailyStats.steps + 500 }),
            },
            {
              label: t('sleep_quality'), value: `${dailyStats.sleep}h`,
              total: '8h', icon: 'bedtime', color: Colors.purple, progress: dailyStats.sleep / 8,
              onPress: () => updateDailyStats({ sleep: Math.min(12, dailyStats.sleep + 0.5) }),
            },
          ].map((stat, i) => (
            <TouchableOpacity key={i} style={styles.statCard} onPress={stat.onPress} activeOpacity={0.8}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '22' }]}>
                <MaterialIcons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTotal}>/ {stat.total}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>{stat.label}</Text>
              <View style={styles.statBarBg}>
                <View style={[styles.statBarFill, { width: `${Math.round(stat.progress * 100)}%`, backgroundColor: stat.color }]} />
              </View>
              <Text style={styles.statTapHint}>+ Ajouter</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hormones Overview */}
        <View style={[styles.sectionRow, isRTL && styles.rtlRow]}>
          <Text style={styles.sectionTitle}>{t('hormones_overview')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/analysis')}>
            <Text style={styles.viewAll}>{t('view_all')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hormoneScroll}>
          {hormones.map(h => {
            const status = getStatus(h);
            const pct = Math.min(1, Math.max(0, h.value / (h.normalMax * 1.2)));
            const statusColors: Record<string, string> = { optimal: Colors.success, low: Colors.warning, high: Colors.warning, critical: Colors.danger };
            const sc = statusColors[status] || Colors.success;
            return (
              <TouchableOpacity
                key={h.id}
                style={styles.hormoneCard}
                onPress={() => router.push('/(tabs)/analysis')}
                activeOpacity={0.85}
              >
                <View style={styles.hormoneTopRow}>
                  <Text style={styles.hormoneName}>{h.name}</Text>
                  <StatusBadge status={status} />
                </View>
                <Text style={[styles.hormoneValue, { color: sc }]}>{h.value}</Text>
                <Text style={styles.hormoneUnit}>{h.unit}</Text>
                <View style={styles.hormoneBarBg}>
                  <View style={[styles.hormoneBarFill, { width: `${pct * 100}%`, backgroundColor: sc }]} />
                </View>
                <Text style={styles.hormoneRange}>{h.normalMin}–{h.normalMax}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Deficiency Alerts */}
        {deficiencies.length > 0 && (
          <View style={styles.defAlert}>
            <View style={styles.defAlertHeader}>
              <MaterialIcons name="warning-amber" size={18} color={Colors.warning} />
              <Text style={styles.defAlertTitle}>Carences détectées</Text>
            </View>
            {deficiencies.map(d => (
              <View key={d.id} style={styles.defRow}>
                <View style={styles.defDot} />
                <Text style={styles.defName}>{d.name}</Text>
                <Text style={styles.defVal}>{d.value} {d.unit}</Text>
                <Text style={styles.defNormal}>(min {d.normalMin})</Text>
              </View>
            ))}
          </View>
        )}

        {/* Today's Meals Snapshot */}
        {todayPlan && (
          <>
            <View style={[styles.sectionRow, isRTL && styles.rtlRow]}>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? "Repas d'aujourd'hui" : "Today's Meals"}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition')}>
                <Text style={styles.viewAll}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mealSnap}>
              {[
                { meal: todayPlan.breakfast, label: t('breakfast'), icon: 'wb-sunny', color: Colors.gold },
                { meal: todayPlan.lunch, label: t('lunch'), icon: 'restaurant', color: Colors.primary },
                { meal: todayPlan.dinner, label: t('dinner'), icon: 'nightlight-round', color: Colors.purple },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.mealSnapRow}
                  onPress={() => router.push('/(tabs)/nutrition')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.mealSnapIcon, { backgroundColor: item.color + '22' }]}>
                    <MaterialIcons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <View style={styles.mealSnapInfo}>
                    <Text style={styles.mealSnapLabel}>{item.label}</Text>
                    <Text style={styles.mealSnapName} numberOfLines={1}>{item.meal.name}</Text>
                  </View>
                  <View style={styles.mealSnapRight}>
                    <Text style={[styles.mealSnapCal, { color: item.color }]}>{item.meal.calories}</Text>
                    <Text style={styles.mealSnapKcal}>kcal</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={styles.mealTotal}>
                <Text style={styles.mealTotalLabel}>Total journalier</Text>
                <Text style={styles.mealTotalValue}>{todayPlan.totalCalories} kcal</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  rtlRow: { flexDirection: 'row-reverse' },

  loadingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm,
    padding: 12, marginBottom: 12,
  },
  loadingText: { fontSize: FontSize.sm, color: Colors.primary },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  notifBtn: { padding: 8, position: 'relative' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },

  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', gap: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  scoreLeft: { alignItems: 'center', width: 90 },
  scoreLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4, textAlign: 'center' },
  scoreValue: { fontSize: 44, fontWeight: FontWeight.extrabold, lineHeight: 50 },
  scoreMax: { fontSize: FontSize.sm, color: Colors.textMuted },
  scoreRight: { flex: 1, justifyContent: 'center', gap: 10 },
  scoreBarBg: { height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreStats: { flexDirection: 'row', justifyContent: 'space-around' },
  scoreStat: { alignItems: 'center' },
  scoreStatVal: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  scoreStatLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },

  aiCard: {
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  aiLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary, flex: 1 },
  aiBadge: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textInverse },
  aiText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },

  aiTipsList: { gap: 6, marginBottom: 12 },
  aiTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  aiTipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6, flexShrink: 0 },
  aiTipText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  supplementsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  supplementChip: {
    backgroundColor: Colors.goldMuted, borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.gold + '44',
  },
  supplementName: { fontSize: 11, fontWeight: FontWeight.semibold, color: Colors.gold },
  supplementDose: { fontSize: 10, color: Colors.textMuted },

  localFoodsBox: {
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: Radius.sm,
    padding: 10, marginBottom: 12,
  },
  localFoodsLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 4 },
  localFoodsText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  analyzeNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12,
  },
  analyzeNowBtnLoading: { backgroundColor: Colors.textMuted },
  analyzeNowText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
  aiErrorText: { fontSize: FontSize.xs, color: Colors.danger, marginTop: 8, textAlign: 'center' },

  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  viewAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    width: '47.5%', backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statTotal: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 8, lineHeight: 16 },
  statBarBg: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  statBarFill: { height: '100%', borderRadius: 2 },
  statTapHint: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },

  hormoneScroll: { paddingRight: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  hormoneCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, width: 155, borderWidth: 1, borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
  },
  hormoneTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  hormoneName: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, marginRight: 4 },
  hormoneValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  hormoneUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 8 },
  hormoneBarBg: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  hormoneBarFill: { height: '100%', borderRadius: 2 },
  hormoneRange: { fontSize: 10, color: Colors.textMuted },

  badge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 9, fontWeight: FontWeight.semibold },

  defAlert: {
    backgroundColor: Colors.warningMuted, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '44',
  },
  defAlertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  defAlertTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.warning },
  defRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  defDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  defName: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  defVal: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.warning },
  defNormal: { fontSize: FontSize.xs, color: Colors.textMuted },

  mealSnap: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  mealSnapRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  mealSnapIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mealSnapInfo: { flex: 1 },
  mealSnapLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.medium },
  mealSnapName: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  mealSnapRight: { alignItems: 'flex-end' },
  mealSnapCal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  mealSnapKcal: { fontSize: 9, color: Colors.textMuted },
  mealTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, backgroundColor: Colors.surfaceElevated,
  },
  mealTotalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  mealTotalValue: { fontSize: FontSize.lg, color: Colors.gold, fontWeight: FontWeight.extrabold },

  circleBg: { position: 'absolute', borderWidth: 4 },
  circleArc: {
    position: 'absolute', borderWidth: 4,
    borderBottomColor: 'transparent', borderLeftColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
});
