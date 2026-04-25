import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';

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
    critical: { bg: Colors.dangerStrong, text: Colors.danger, label: 'Critique' },
  };
  const c = cfg[status] || cfg.optimal;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
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
              {language === 'ar' ? 'تقريرك الصحي لليوم' : 'Votre bilan santé du jour'}
            </Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/login')}>
            <Text style={styles.avatarText}>{(user?.email?.[0] || 'V').toUpperCase()}</Text>
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
          <View style={styles.scoreDivider} />
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

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          {[
            { route: '/food-logger', icon: 'add-circle', color: Colors.success, label: language === 'ar' ? 'سجل طعام' : 'Logger repas' },
            { route: '/chat', icon: 'psychology', color: Colors.primary, label: 'Chat IA' },
            { route: '/weight-tracker', icon: 'monitor-weight', color: Colors.gold, label: language === 'ar' ? 'الوزن' : 'Poids' },
            { route: '/achievements', icon: 'emoji-events', color: Colors.purple, label: language === 'ar' ? 'إنجازات' : 'Succès' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickAction}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: item.color + '18' }]}>
                <MaterialIcons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[styles.quickActionText, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Analysis Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIconWrap}>
              <MaterialIcons name="psychology" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiLabel}>{t('ai_recommendation')}</Text>
            </View>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.supplementsRow}>
              {aiSupplements.slice(0, 3).map((s, i) => (
                <View key={i} style={styles.supplementChip}>
                  <Text style={styles.supplementName}>{s.name}</Text>
                  <Text style={styles.supplementDose}>{s.dose}</Text>
                </View>
              ))}
            </ScrollView>
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

        {/* Daily Stats Grid */}
        <Text style={styles.sectionTitle}>Suivi du jour</Text>
        <View style={styles.statsGrid}>
          {[
            { label: t('calories_consumed'), value: `${dailyStats.calories}`, total: `${tdee}`, icon: 'local-fire-department', color: Colors.gold, progress: calorieProgress, onPress: () => updateDailyStats({ calories: dailyStats.calories + 100 }) },
            { label: t('water_intake'), value: `${dailyStats.water}ml`, total: '2500ml', icon: 'water-drop', color: Colors.primary, progress: waterProgress, onPress: () => updateDailyStats({ water: dailyStats.water + 250 }) },
            { label: t('steps_today'), value: `${dailyStats.steps.toLocaleString()}`, total: '10,000', icon: 'directions-walk', color: Colors.success, progress: stepProgress, onPress: () => updateDailyStats({ steps: dailyStats.steps + 500 }) },
            { label: t('sleep_quality'), value: `${dailyStats.sleep}h`, total: '8h', icon: 'bedtime', color: Colors.purple, progress: dailyStats.sleep / 8, onPress: () => updateDailyStats({ sleep: Math.min(12, dailyStats.sleep + 0.5) }) },
          ].map((stat, i) => (
            <TouchableOpacity key={i} style={styles.statCard} onPress={stat.onPress} activeOpacity={0.8}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '18' }]}>
                <MaterialIcons name={stat.icon as any} size={19} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTotal}>/ {stat.total}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>{stat.label}</Text>
              <View style={styles.statBarBg}>
                <View style={[styles.statBarFill, { width: `${Math.round(stat.progress * 100)}%`, backgroundColor: stat.color }]} />
              </View>
              <Text style={[styles.statTapHint, { color: stat.color }]}>+ Ajouter</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hormones */}
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
              <TouchableOpacity key={h.id} style={styles.hormoneCard} onPress={() => router.push('/(tabs)/analysis')} activeOpacity={0.85}>
                <View style={styles.hormoneTopRow}>
                  <Text style={styles.hormoneName} numberOfLines={2}>{h.name}</Text>
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
              <MaterialIcons name="warning-amber" size={16} color={Colors.warning} />
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

        {/* Today's Meals */}
        {todayPlan && (
          <>
            <View style={[styles.sectionRow, isRTL && styles.rtlRow]}>
              <Text style={styles.sectionTitle}>{language === 'fr' ? "Repas d'aujourd'hui" : "Today's Meals"}</Text>
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
                <TouchableOpacity key={i} style={styles.mealSnapRow} onPress={() => router.push('/(tabs)/nutrition')} activeOpacity={0.8}>
                  <View style={[styles.mealSnapIcon, { backgroundColor: item.color + '18' }]}>
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryMuted, borderWidth: 1.5, borderColor: Colors.primary + '55',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  notifDot: { position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger, borderWidth: 2, borderColor: Colors.background },

  loadingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm,
    padding: 12, marginBottom: 12,
  },
  loadingText: { fontSize: FontSize.sm, color: Colors.primary },

  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.md, flexDirection: 'row', gap: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  scoreLeft: { alignItems: 'center', width: 88, gap: 2 },
  scoreLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },
  scoreValue: { fontSize: 48, fontWeight: FontWeight.extrabold, lineHeight: 52 },
  scoreMax: { fontSize: FontSize.xs, color: Colors.textMuted },
  scoreDivider: { width: 1, backgroundColor: Colors.surfaceBorder },
  scoreRight: { flex: 1, justifyContent: 'center', gap: 12 },
  scoreBarBg: { height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreStats: { flexDirection: 'row', justifyContent: 'space-around' },
  scoreStat: { alignItems: 'center', gap: 2 },
  scoreStatVal: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  scoreStatLabel: { fontSize: FontSize.micro, color: Colors.textMuted, letterSpacing: 0.3 },

  quickActionsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  quickAction: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingVertical: 12, paddingHorizontal: 4,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  quickActionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { fontSize: FontSize.micro, fontWeight: FontWeight.semibold, textAlign: 'center' },

  aiCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary + '30',
    ...Shadow.sm,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  aiIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '33' },
  aiLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  aiBadge: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { fontSize: FontSize.micro, fontWeight: FontWeight.bold, color: Colors.textInverse, letterSpacing: 0.5 },
  aiText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  aiTipsList: { gap: 6, marginBottom: 12 },
  aiTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  aiTipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 7, flexShrink: 0 },
  aiTipText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  supplementsRow: { gap: 8, paddingBottom: 12 },
  supplementChip: {
    backgroundColor: Colors.goldMuted, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.gold + '30',
  },
  supplementName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.gold },
  supplementDose: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 1 },
  localFoodsBox: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 10, marginBottom: 12 },
  localFoodsLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 3 },
  localFoodsText: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  analyzeNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 13,
    ...Shadow.primary,
  },
  analyzeNowBtnLoading: { backgroundColor: Colors.textMuted, shadowOpacity: 0 },
  analyzeNowText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
  aiErrorText: { fontSize: FontSize.xs, color: Colors.danger, marginTop: 8, textAlign: 'center' },

  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  viewAll: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    width: '47.5%', backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  statTotal: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 8, lineHeight: 16 },
  statBarBg: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
  statBarFill: { height: '100%', borderRadius: 2 },
  statTapHint: { fontSize: FontSize.micro, fontWeight: FontWeight.semibold },

  hormoneScroll: { paddingRight: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  hormoneCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, width: 150, borderWidth: 1, borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md, ...Shadow.sm,
  },
  hormoneTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 4 },
  hormoneName: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  hormoneValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  hormoneUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 8 },
  hormoneBarBg: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  hormoneBarFill: { height: '100%', borderRadius: 2 },
  hormoneRange: { fontSize: FontSize.micro, color: Colors.textMuted },

  badge: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: FontSize.micro, fontWeight: FontWeight.bold },

  defAlert: {
    backgroundColor: Colors.warningMuted, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '30',
  },
  defAlertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  defAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.warning },
  defRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  defDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  defName: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  defVal: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.warning },
  defNormal: { fontSize: FontSize.xs, color: Colors.textMuted },

  mealSnap: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.sm },
  mealSnapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  mealSnapIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mealSnapInfo: { flex: 1 },
  mealSnapLabel: { fontSize: FontSize.micro, color: Colors.textMuted, fontWeight: FontWeight.medium },
  mealSnapName: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  mealSnapRight: { alignItems: 'flex-end' },
  mealSnapCal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  mealSnapKcal: { fontSize: FontSize.micro, color: Colors.textMuted },
  mealTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: Colors.surfaceElevated },
  mealTotalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  mealTotalValue: { fontSize: FontSize.lg, color: Colors.gold, fontWeight: FontWeight.extrabold },
});
