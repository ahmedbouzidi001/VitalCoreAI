import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
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
    low: { bg: Colors.warningMuted, text: Colors.warning, label: 'Low' },
    high: { bg: Colors.dangerMuted, text: Colors.danger, label: 'High' },
    critical: { bg: Colors.dangerMuted, text: Colors.danger, label: 'Critical' },
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
  const { profile, healthScore, deficiencies, biomarkers, dailyStats, weeklyMealPlan } = useHealth();
  const { t, language, isRTL } = useLanguage();

  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayPlan = weeklyMealPlan[dayIndex];
  const tdee = todayPlan ? todayPlan.totalCalories : 2200;

  const calorieProgress = Math.min(1, dailyStats.calories / tdee);
  const waterProgress = Math.min(1, dailyStats.water / 2500);
  const stepProgress = Math.min(1, dailyStats.steps / 10000);

  const hormones = biomarkers.filter(b => b.category === 'hormones');
  const getStatus = (b: typeof biomarkers[0]) => {
    if (b.value < b.normalMin * 0.7 || b.value > b.normalMax * 1.3) return 'critical';
    if (b.value < b.normalMin) return 'low';
    if (b.value > b.normalMax) return 'high';
    return 'optimal';
  };

  const scoreColor = healthScore >= 75 ? Colors.success : healthScore >= 50 ? Colors.warning : Colors.danger;

  const aiRec = deficiencies.length > 0
    ? (language === 'ar'
      ? `تم اكتشاف ${deficiencies.length} نقص. يُنصح بتناول ${deficiencies.map(d => d.name).join('، ')} مع تعديل خطتك الغذائية.`
      : language === 'fr'
        ? `${deficiencies.length} carence(s) détectée(s). Augmentez votre apport en ${deficiencies.map(d => d.name).join(', ')} via votre alimentation.`
        : `${deficiencies.length} deficiency detected. Increase ${deficiencies.map(d => d.name).join(', ')} intake through diet.`)
    : (language === 'ar'
      ? 'جميع المؤشرات البيولوجية في النطاق الأمثل. استمر في خطتك الحالية!'
      : language === 'fr'
        ? 'Tous vos marqueurs biologiques sont dans la plage optimale. Continuez votre plan actuel !'
        : 'All biological markers are in optimal range. Keep up your current plan!');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <View>
            <Text style={styles.greeting}>{getGreeting(t)}, {profile.name} 👋</Text>
            <Text style={styles.headerSub}>
              {language === 'ar' ? 'تقريرك الصحي لليوم' : language === 'fr' ? 'Votre bilan santé du jour' : 'Your health report today'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <MaterialIcons name="notifications-none" size={24} color={Colors.textSecondary} />
            {deficiencies.length > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

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
            {deficiencies.length > 0 ? (
              <View style={styles.alertBox}>
                <MaterialIcons name="warning-amber" size={14} color={Colors.warning} />
                <Text style={styles.alertText}>
                  {deficiencies.length} {t('deficiencies_detected')}
                </Text>
              </View>
            ) : (
              <View style={[styles.alertBox, { backgroundColor: Colors.successMuted }]}>
                <MaterialIcons name="check-circle" size={14} color={Colors.success} />
                <Text style={[styles.alertText, { color: Colors.success }]}>
                  {language === 'ar' ? 'كل شيء مثالي' : language === 'fr' ? 'Tout est optimal' : 'All optimal'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* AI Recommendation */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIconWrap}>
              <MaterialIcons name="psychology" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.aiLabel}>{t('ai_recommendation')}</Text>
            <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>EBM</Text></View>
          </View>
          <Text style={styles.aiText}>{aiRec}</Text>
        </View>

        {/* Daily Stats */}
        <Text style={styles.sectionTitle}>{t('today_summary')}</Text>
        <View style={styles.statsGrid}>
          {[
            { label: t('calories_consumed'), value: `${dailyStats.calories}`, total: `${tdee}`, icon: 'local-fire-department', color: Colors.gold, progress: calorieProgress },
            { label: t('water_intake'), value: `${dailyStats.water}ml`, total: '2500ml', icon: 'water-drop', color: Colors.primary, progress: waterProgress },
            { label: t('steps_today'), value: `${dailyStats.steps.toLocaleString()}`, total: '10,000', icon: 'directions-walk', color: Colors.success, progress: stepProgress },
            { label: t('sleep_quality'), value: `${dailyStats.sleep}h`, total: '8h', icon: 'bedtime', color: Colors.purple, progress: dailyStats.sleep / 8 },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '22' }]}>
                <MaterialIcons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTotal}>/ {stat.total}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>{stat.label}</Text>
              <View style={styles.statBarBg}>
                <View style={[styles.statBarFill, { width: `${Math.round(stat.progress * 100)}%`, backgroundColor: stat.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Hormones Overview */}
        <View style={[styles.sectionRow, isRTL && styles.rtlRow]}>
          <Text style={styles.sectionTitle}>{t('hormones_overview')}</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.viewAll}>{t('view_all')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hormoneScroll}>
          {hormones.map(h => {
            const status = getStatus(h);
            return (
              <View key={h.id} style={styles.hormoneCard}>
                <Text style={styles.hormoneName}>{h.name}</Text>
                <Text style={styles.hormoneValue}>{h.value}</Text>
                <Text style={styles.hormoneUnit}>{h.unit}</Text>
                <StatusBadge status={status} />
                <Text style={styles.hormoneRange}>{h.normalMin}–{h.normalMax}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Today's Meal Snapshot */}
        {todayPlan && (
          <>
            <View style={[styles.sectionRow, isRTL && styles.rtlRow]}>
              <Text style={styles.sectionTitle}>
                {language === 'ar' ? 'وجبة اليوم' : language === 'fr' ? "Repas d'aujourd'hui" : "Today's Meals"}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition')}>
                <Text style={styles.viewAll}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mealSnap}>
              {[
                { meal: todayPlan.breakfast, label: t('breakfast'), icon: 'wb-sunny' },
                { meal: todayPlan.lunch, label: t('lunch'), icon: 'restaurant' },
                { meal: todayPlan.dinner, label: t('dinner'), icon: 'nightlight-round' },
              ].map((item, i) => (
                <View key={i} style={styles.mealSnapRow}>
                  <View style={[styles.mealSnapIcon, { backgroundColor: Colors.primaryMuted }]}>
                    <MaterialIcons name={item.icon as any} size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.mealSnapInfo}>
                    <Text style={styles.mealSnapLabel}>{item.label}</Text>
                    <Text style={styles.mealSnapName} numberOfLines={1}>{item.meal.name}</Text>
                  </View>
                  <Text style={styles.mealSnapCal}>{item.meal.calories} {t('kcal')}</Text>
                </View>
              ))}
              <View style={styles.mealTotal}>
                <Text style={styles.mealTotalLabel}>
                  {language === 'ar' ? 'الإجمالي' : language === 'fr' ? 'Total' : 'Total'}
                </Text>
                <Text style={styles.mealTotalValue}>{todayPlan.totalCalories} {t('kcal')}</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
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
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  notifBtn: { padding: 8, position: 'relative' },
  notifDot: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
    borderRadius: 4, backgroundColor: Colors.danger,
  },

  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', gap: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  scoreLeft: { alignItems: 'center', width: 80 },
  scoreLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4, textAlign: 'center' },
  scoreValue: { fontSize: 40, fontWeight: FontWeight.extrabold },
  scoreMax: { fontSize: FontSize.sm, color: Colors.textMuted },
  scoreRight: { flex: 1, justifyContent: 'center', gap: 12 },
  scoreBarBg: { height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.warningMuted, borderRadius: Radius.sm, padding: 8,
  },
  alertText: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.medium },

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
  aiBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textInverse },
  aiText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

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
  statBarBg: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2 },

  hormoneScroll: { paddingRight: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  hormoneCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, width: 130, borderWidth: 1, borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  hormoneName: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  hormoneValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hormoneUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 8 },
  hormoneRange: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },

  badge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: FontWeight.semibold },

  mealSnap: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  mealSnapRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  mealSnapIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mealSnapInfo: { flex: 1 },
  mealSnapLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.medium },
  mealSnapName: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  mealSnapCal: { fontSize: FontSize.sm, color: Colors.gold, fontWeight: FontWeight.bold },
  mealTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, backgroundColor: Colors.surfaceElevated,
  },
  mealTotalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  mealTotalValue: { fontSize: FontSize.lg, color: Colors.gold, fontWeight: FontWeight.extrabold },
});
