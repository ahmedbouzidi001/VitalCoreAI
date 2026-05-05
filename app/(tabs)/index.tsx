// VitalCore AI — Dashboard v4 — World-Class UI/UX
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';

function getGreeting(h: number, isAr: boolean) {
  if (h < 12) return isAr ? '☀️ صباح الخير' : '☀️ Bonjour';
  if (h < 17) return isAr ? '🌤 مساء الخير' : '🌤 Bon après-midi';
  return isAr ? '🌙 مساء النور' : '🌙 Bonsoir';
}

function RadialScore({ score, color }: { score: number; color: string }) {
  const label = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  return (
    <View style={radStyles.wrap}>
      <View style={[radStyles.outer, { borderColor: color + '44' }]}>
        <View style={[radStyles.inner, { borderColor: color, shadowColor: color }]}>
          <Text style={[radStyles.score, { color }]}>{score}</Text>
          <Text style={radStyles.max}>/100</Text>
          <Text style={radStyles.emoji}>{label}</Text>
        </View>
      </View>
    </View>
  );
}
const radStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  outer: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  score: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, lineHeight: 28 },
  max: { fontSize: FontSize.micro, color: Colors.textMuted },
  emoji: { fontSize: 11, marginTop: 1 },
});

function StatTile({ icon, color, label, value, total, progress, onPress }: any) {
  return (
    <Pressable style={({ pressed }) => [sTile.card, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={onPress}>
      <View style={[sTile.iconWrap, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <Text style={sTile.value}>{value}</Text>
      <Text style={sTile.total}>/ {total}</Text>
      <Text style={sTile.label} numberOfLines={2}>{label}</Text>
      <View style={sTile.barBg}><View style={[sTile.barFill, { width: `${Math.round(Math.min(1, progress) * 100)}%`, backgroundColor: color }]} /></View>
      <Text style={[sTile.hint, { color }]}>+ Ajouter</Text>
    </Pressable>
  );
}
const sTile = StyleSheet.create({
  card: { width: '47.5%', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  value: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  total: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 8, lineHeight: 16 },
  barBg: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
  barFill: { height: '100%', borderRadius: 2 },
  hint: { fontSize: FontSize.micro, fontWeight: FontWeight.semibold },
});

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    profile, healthScore, deficiencies, biomarkers, dailyStats,
    weeklyMealPlan, updateDailyStats, aiAnalysis, runAIAnalysis,
    isAILoading, aiError, isDataLoading,
  } = useHealth();
  const { t, language, isRTL } = useLanguage();
  const isAr = language === 'ar';

  const h = new Date().getHours();
  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayPlan = weeklyMealPlan[dayIndex];
  const tdee = todayPlan?.totalCalories || 2200;
  const scoreColor = healthScore >= 75 ? Colors.success : healthScore >= 50 ? Colors.warning : Colors.danger;
  const displayName = user?.email?.split('@')[0] || profile.name || 'Vitaler';
  const aiSummary = aiAnalysis?.summary || (deficiencies.length > 0
    ? `${deficiencies.length} carence(s) détectée(s) — Plan adapté automatiquement à vos biomarqueurs.`
    : 'Tous vos marqueurs biologiques sont dans la norme. Continuez votre programme actuel !');

  const quickActions = [
    { route: '/food-logger', icon: 'add-circle', color: Colors.success, label: isAr ? 'سجل طعام' : 'Logger repas', bg: Colors.successMuted },
    { route: '/chat', icon: 'psychology', color: Colors.primary, label: 'Chat IA', bg: Colors.primaryMuted },
    { route: '/weight-tracker', icon: 'monitor-weight', color: Colors.gold, label: isAr ? 'الوزن' : 'Poids', bg: Colors.goldMuted },
    { route: '/achievements', icon: 'emoji-events', color: Colors.purple, label: isAr ? 'إنجازات' : 'Succès', bg: Colors.purpleMuted },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting(h, isAr)}, {displayName}</Text>
            <Text style={styles.date}>{today.toLocaleDateString(isAr ? 'ar-TN' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            {deficiencies.length > 0 && <View style={styles.notifDot} />}
          </Pressable>
        </View>

        {isDataLoading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>{isAr ? 'جاري تحميل بياناتك...' : 'Chargement de vos données...'}</Text>
          </View>
        )}

        {/* ── Health Score Card ── */}
        <View style={styles.scoreCard}>
          <RadialScore score={healthScore} color={scoreColor} />
          <View style={styles.scoreDivider} />
          <View style={styles.scoreRight}>
            <Text style={styles.scoreTitle}>{isAr ? 'النقاط الصحية' : 'Score de Santé'}</Text>
            <Text style={styles.scoreDesc}>{isAr ? 'مبني على بياناتك البيولوجية' : 'Basé sur vos biomarqueurs'}</Text>
            <View style={styles.scoreStats}>
              {[
                { val: biomarkers.filter(b => b.value >= b.normalMin && b.value <= b.normalMax).length, label: isAr ? 'أمثل' : 'Optimaux', color: Colors.success },
                { val: deficiencies.length, label: isAr ? 'نقص' : 'Carences', color: Colors.warning },
                { val: biomarkers.length, label: isAr ? 'مؤشر' : 'Marqueurs', color: Colors.primary },
              ].map((s, i) => (
                <View key={i} style={styles.scoreStat}>
                  <Text style={[styles.scoreStatVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={styles.scoreStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickRow}>
          {quickActions.map((qa, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.quickCard, { backgroundColor: qa.bg, borderColor: qa.color + '33' }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }]}
              onPress={() => router.push(qa.route as any)}
            >
              <View style={[styles.quickIcon, { backgroundColor: qa.color + '22' }]}>
                <MaterialIcons name={qa.icon as any} size={22} color={qa.color} />
              </View>
              <Text style={[styles.quickLabel, { color: qa.color }]}>{qa.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── AI Analysis Card ── */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiAvatarWrap}>
              <MaterialIcons name="psychology" size={18} color={Colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiCardTitle}>{isAr ? 'توصية الذكاء الاصطناعي' : 'Recommandation IA'}</Text>
              <Text style={styles.aiCardSub}>EBM · Gemini 3 Flash · Personnalisé</Text>
            </View>
            <View style={styles.aiLiveBadge}>
              <View style={styles.aiLiveDot} />
              <Text style={styles.aiLiveText}>Live</Text>
            </View>
          </View>

          <Text style={styles.aiSummary}>{aiSummary}</Text>

          {aiAnalysis?.nutrition_adjustments?.length > 0 && (
            <View style={styles.aiTips}>
              {aiAnalysis.nutrition_adjustments.slice(0, 2).map((tip, i) => (
                <View key={i} style={styles.aiTipRow}>
                  <View style={styles.aiTipDot} />
                  <Text style={styles.aiTipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {aiAnalysis?.supplements?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suppRow}>
              {aiAnalysis.supplements.slice(0, 3).map((s, i) => (
                <View key={i} style={styles.suppChip}>
                  <Text style={styles.suppName}>{s.name}</Text>
                  <Text style={styles.suppDose}>{s.dose}</Text>
                  {s.evidence && <Text style={styles.suppEvidence}>📚 {s.evidence}</Text>}
                </View>
              ))}
            </ScrollView>
          )}

          {aiAnalysis?.local_foods?.length > 0 && (
            <View style={styles.localFoodsBox}>
              <Text style={styles.localFoodsTitle}>🇹🇳 {isAr ? 'أطعمة محلية موصى بها' : 'Aliments locaux recommandés'}</Text>
              <Text style={styles.localFoodsText}>{aiAnalysis.local_foods.join('  ·  ')}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.analyzeBtn, isAILoading && styles.analyzeBtnLoading]}
            onPress={runAIAnalysis} disabled={isAILoading} activeOpacity={0.85}
          >
            {isAILoading ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <MaterialIcons name="auto-awesome" size={18} color={Colors.textInverse} />}
            <Text style={styles.analyzeBtnText}>{isAILoading ? (isAr ? 'جارٍ التحليل...' : 'Analyse en cours...') : (isAr ? 'تشغيل تحليل IA' : 'Analyser avec IA')}</Text>
          </TouchableOpacity>

          {aiError ? <Text style={styles.aiErrorText}>{aiError}</Text> : null}
        </View>

        {/* ── Daily Stats ── */}
        <Text style={styles.sectionTitle}>{isAr ? '📊 تتبع اليوم' : '📊 Suivi du jour'}</Text>
        <View style={styles.statsGrid}>
          <StatTile icon="local-fire-department" color={Colors.gold} label={t('calories_consumed')} value={dailyStats.calories} total={tdee} progress={dailyStats.calories / tdee} onPress={() => updateDailyStats({ calories: dailyStats.calories + 100 })} />
          <StatTile icon="water-drop" color={Colors.primary} label={t('water_intake')} value={`${dailyStats.water}ml`} total="2500ml" progress={dailyStats.water / 2500} onPress={() => updateDailyStats({ water: dailyStats.water + 250 })} />
          <StatTile icon="directions-walk" color={Colors.success} label={t('steps_today')} value={dailyStats.steps.toLocaleString()} total="10,000" progress={dailyStats.steps / 10000} onPress={() => updateDailyStats({ steps: dailyStats.steps + 500 })} />
          <StatTile icon="bedtime" color={Colors.purple} label={t('sleep_quality')} value={`${dailyStats.sleep}h`} total="8h" progress={dailyStats.sleep / 8} onPress={() => updateDailyStats({ sleep: Math.min(12, dailyStats.sleep + 0.5) })} />
        </View>

        {/* ── Deficiency Alerts ── */}
        {deficiencies.length > 0 && (
          <Pressable style={({ pressed }) => [styles.defCard, pressed && { opacity: 0.9 }]} onPress={() => router.push('/(tabs)/analysis')}>
            <View style={styles.defCardHeader}>
              <MaterialIcons name="warning-amber" size={18} color={Colors.warning} />
              <Text style={styles.defCardTitle}>{deficiencies.length} {isAr ? 'نقص مكتشف' : 'carence(s) détectée(s)'}</Text>
              <MaterialIcons name="arrow-forward-ios" size={12} color={Colors.warning} style={{ marginLeft: 'auto' as any }} />
            </View>
            <View style={styles.defList}>
              {deficiencies.slice(0, 3).map(d => (
                <View key={d.id} style={styles.defRow}>
                  <View style={styles.defDot} />
                  <Text style={styles.defName}>{d.name}</Text>
                  <Text style={styles.defVal}>{d.value} <Text style={styles.defUnit}>{d.unit}</Text></Text>
                  <View style={styles.defBadge}><Text style={styles.defBadgeText}>Min: {d.normalMin}</Text></View>
                </View>
              ))}
            </View>
          </Pressable>
        )}

        {/* ── Biomarker Highlights ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{isAr ? '🔬 مؤشراتك الحيوية' : '🔬 Marqueurs clés'}</Text>
          <Pressable onPress={() => router.push('/(tabs)/analysis')}><Text style={styles.viewAll}>{isAr ? 'الكل' : 'Voir tout'}</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.markerScroll}>
          {biomarkers.slice(0, 6).map(b => {
            const isLow = b.value < b.normalMin;
            const isHigh = b.value > b.normalMax;
            const inRange = !isLow && !isHigh;
            const isCrit = b.value < b.normalMin * 0.7 || b.value > b.normalMax * 1.3;
            const c = isCrit ? Colors.danger : isLow ? Colors.warning : inRange ? Colors.success : Colors.warning;
            const pct = Math.min(1, Math.max(0, b.value / (b.normalMax * 1.3)));
            return (
              <Pressable key={b.id} style={({ pressed }) => [styles.markerCard, pressed && { transform: [{ scale: 0.96 }] }]} onPress={() => router.push('/(tabs)/analysis')}>
                <View style={styles.markerTop}>
                  <Text style={styles.markerName} numberOfLines={2}>{b.name}</Text>
                  <View style={[styles.markerStatus, { backgroundColor: c + '22' }]}>
                    <Text style={[styles.markerStatusText, { color: c }]}>{isCrit ? '⚠️' : isLow ? '↓' : isHigh ? '↑' : '✓'}</Text>
                  </View>
                </View>
                <Text style={[styles.markerVal, { color: c }]}>{b.value}</Text>
                <Text style={styles.markerUnit}>{b.unit}</Text>
                <View style={styles.markerBarBg}><View style={[styles.markerBarFill, { width: `${pct * 100}%`, backgroundColor: c }]} /></View>
                <Text style={styles.markerRange}>{b.normalMin}–{b.normalMax}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Today's Meals ── */}
        {todayPlan && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{isAr ? "🍽️ وجبات اليوم" : "🍽️ Repas d'aujourd'hui"}</Text>
              <Pressable onPress={() => router.push('/(tabs)/nutrition')}><Text style={styles.viewAll}>{isAr ? 'الكل' : 'Voir tout'}</Text></Pressable>
            </View>
            <View style={styles.mealsCard}>
              {[
                { meal: todayPlan.breakfast, label: isAr ? 'فطور' : 'Petit-déjeuner', icon: 'wb-sunny', color: Colors.gold },
                { meal: todayPlan.lunch, label: isAr ? 'غداء' : 'Déjeuner', icon: 'restaurant', color: Colors.primary },
                { meal: todayPlan.dinner, label: isAr ? 'عشاء' : 'Dîner', icon: 'nightlight-round', color: Colors.purple },
              ].map((item, i) => (
                <Pressable key={i} style={({ pressed }) => [styles.mealRow, i < 2 && styles.mealRowBorder, pressed && { backgroundColor: Colors.surfaceElevated }]} onPress={() => router.push('/(tabs)/nutrition')}>
                  <View style={[styles.mealIcon, { backgroundColor: item.color + '18' }]}>
                    <MaterialIcons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealLabel}>{item.label}</Text>
                    <Text style={styles.mealName} numberOfLines={1}>{item.meal.name}</Text>
                  </View>
                  <Text style={[styles.mealCal, { color: item.color }]}>{item.meal.calories} kcal</Text>
                  <MaterialIcons name="chevron-right" size={16} color={Colors.textMuted} />
                </Pressable>
              ))}
              <View style={styles.mealTotal}>
                <Text style={styles.mealTotalLabel}>{isAr ? 'الإجمالي اليومي' : 'Total journalier'}</Text>
                <Text style={styles.mealTotalVal}>{todayPlan.totalCalories} kcal</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Bottom Promo Card ── */}
        <Pressable
          style={({ pressed }) => [styles.promoCard, pressed && { opacity: 0.9 }]}
          onPress={() => router.push('/premium')}
        >
          <View style={styles.promoLeft}>
            <MaterialIcons name="workspace-premium" size={24} color={Colors.gold} />
            <View>
              <Text style={styles.promoTitle}>{isAr ? 'ترقية إلى بريميوم' : 'Passer à Premium'}</Text>
              <Text style={styles.promoDesc}>{isAr ? 'تحليلات غير محدودة · PDF · ذكاء اصطناعي' : 'Analyses illimitées · PDF · Chat IA'}</Text>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.gold} />
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  date: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  avatarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryMuted, borderWidth: 2, borderColor: Colors.primary + '55', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  notifDot: { position: 'absolute', top: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.danger, borderWidth: 2, borderColor: Colors.background },

  loadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.primary + '33' },
  loadingText: { fontSize: FontSize.sm, color: Colors.primary },

  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  scoreDivider: { width: 1, height: 80, backgroundColor: Colors.surfaceBorder },
  scoreRight: { flex: 1 },
  scoreTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  scoreDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 12 },
  scoreStats: { flexDirection: 'row', gap: 16 },
  scoreStat: { alignItems: 'center' },
  scoreStatVal: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  scoreStatLabel: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 2 },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  quickCard: { flex: 1, alignItems: 'center', gap: 7, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 4, borderWidth: 1 },
  quickIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: FontSize.micro, fontWeight: FontWeight.bold, textAlign: 'center' },

  aiCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30', ...Shadow.sm },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  aiAvatarWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.primary },
  aiCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  aiCardSub: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 1 },
  aiLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.successMuted, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.success + '44' },
  aiLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  aiLiveText: { fontSize: FontSize.micro, color: Colors.success, fontWeight: FontWeight.bold },
  aiSummary: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  aiTips: { gap: 7, marginBottom: 12 },
  aiTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  aiTipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 8, flexShrink: 0 },
  aiTipText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  suppRow: { gap: 8, paddingBottom: 12 },
  suppChip: { backgroundColor: Colors.goldMuted, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.gold + '33', minWidth: 120 },
  suppName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  suppDose: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 2 },
  suppEvidence: { fontSize: 9, color: Colors.textMuted, marginTop: 3, fontStyle: 'italic' },
  localFoodsBox: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  localFoodsTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 4 },
  localFoodsText: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, ...Shadow.primary },
  analyzeBtnLoading: { backgroundColor: Colors.textMuted },
  analyzeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
  aiErrorText: { fontSize: FontSize.xs, color: Colors.danger, textAlign: 'center', marginTop: 8 },

  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  viewAll: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },

  defCard: { backgroundColor: Colors.warningMuted, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.warning + '44', ...Shadow.sm },
  defCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  defCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning, flex: 1 },
  defList: { gap: 8 },
  defRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.warning },
  defName: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  defVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning },
  defUnit: { fontSize: FontSize.xs, fontWeight: FontWeight.regular, color: Colors.textMuted },
  defBadge: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  defBadgeText: { fontSize: FontSize.micro, color: Colors.textMuted },

  markerScroll: { paddingRight: Spacing.md, paddingBottom: Spacing.md, gap: 10 },
  markerCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, width: 140, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  markerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 4 },
  markerName: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 15 },
  markerStatus: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  markerStatusText: { fontSize: 12, fontWeight: FontWeight.bold },
  markerVal: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  markerUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 8 },
  markerBarBg: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  markerBarFill: { height: '100%', borderRadius: 2 },
  markerRange: { fontSize: FontSize.micro, color: Colors.textMuted },

  mealsCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.sm },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  mealRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  mealIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mealInfo: { flex: 1 },
  mealLabel: { fontSize: FontSize.micro, color: Colors.textMuted, fontWeight: FontWeight.medium },
  mealName: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold, marginTop: 2 },
  mealCal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  mealTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: Colors.surfaceElevated },
  mealTotalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  mealTotalVal: { fontSize: FontSize.lg, color: Colors.gold, fontWeight: FontWeight.extrabold },

  promoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.goldMuted, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.gold + '44', marginBottom: Spacing.md, ...Shadow.gold },
  promoLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  promoTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  promoDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
