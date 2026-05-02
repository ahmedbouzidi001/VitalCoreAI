// VitalCore AI — Nutrition Screen v3 with Meal Preferences
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, Modal, TextInput, Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth, Meal, MealPlanDay } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';

const MEAL_IMAGES: Record<string, any> = {
  'meal-1': require('@/assets/images/meal-1.png'),
  'meal-2': require('@/assets/images/meal-2.png'),
  'meal-3': require('@/assets/images/meal-3.png'),
};

// ── Meal Preference Modal ──────────────────────────────────────────────────────
const PROTEIN_OPTIONS = ['Poulet', 'Boeuf', 'Poisson', 'Agneau', 'Thon', 'Oeufs', 'Légumineuses'];
const CARB_OPTIONS = ['Riz', 'Pâtes', 'Pain', 'Couscous', 'Pomme de terre', 'Lentilles', 'Quinoa'];
const CUISINE_OPTIONS = ['Tunisienne', 'Méditerranéenne', 'Française', 'Libanaise', 'Italienne', 'Internationale'];
const RESTRICTION_OPTIONS = ['Sans gluten', 'Sans lactose', 'Végétarien', 'Végétalien', 'Halal', 'Sans porc'];

interface MealPreferences {
  preferredProteins: string[];
  preferredCarbs: string[];
  cuisineStyle: string[];
  restrictions: string[];
  dislikedFoods: string;
  mealsPerDay: number;
  includeSnacks: boolean;
}

function MealPrefsModal({
  visible, onClose, onGenerate, language,
}: {
  visible: boolean; onClose: () => void;
  onGenerate: (prefs: MealPreferences) => void; language: string;
}) {
  const isAr = language === 'ar';
  const [prefs, setPrefs] = useState<MealPreferences>({
    preferredProteins: ['Poulet', 'Poisson'],
    preferredCarbs: ['Riz', 'Couscous'],
    cuisineStyle: ['Tunisienne', 'Méditerranéenne'],
    restrictions: [],
    dislikedFoods: '',
    mealsPerDay: 3,
    includeSnacks: true,
  });

  const toggle = (field: keyof Pick<MealPreferences, 'preferredProteins' | 'preferredCarbs' | 'cuisineStyle' | 'restrictions'>, value: string) => {
    setPrefs(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const ChipGroup = ({ title, field, options, color }: { title: string; field: keyof Pick<MealPreferences, 'preferredProteins' | 'preferredCarbs' | 'cuisineStyle' | 'restrictions'>; options: string[]; color: string }) => (
    <View style={mpStyles.group}>
      <Text style={mpStyles.groupLabel}>{title}</Text>
      <View style={mpStyles.chipRow}>
        {options.map(opt => {
          const active = (prefs[field] as string[]).includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[mpStyles.chip, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => toggle(field, opt)}
              activeOpacity={0.8}
            >
              {active && <MaterialIcons name="check" size={11} color={Colors.textInverse} />}
              <Text style={[mpStyles.chipText, active && mpStyles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mpStyles.overlay}>
        <View style={mpStyles.panel}>
          <View style={mpStyles.handle} />
          <View style={mpStyles.panelHeader}>
            <View style={mpStyles.panelIcon}>
              <MaterialIcons name="restaurant-menu" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={mpStyles.panelTitle}>{isAr ? 'تفضيلاتك الغذائية' : 'Vos préférences alimentaires'}</Text>
              <Text style={mpStyles.panelSub}>{isAr ? 'أخبرنا ما تحب لنخصص خطتك' : "Dites-nous ce que vous aimez pour personnaliser votre plan"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={mpStyles.closeX}>
              <MaterialIcons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            <ChipGroup title={isAr ? '🥩 Protéines préférées' : '🥩 Protéines préférées'} field="preferredProteins" options={PROTEIN_OPTIONS} color={Colors.primary} />
            <ChipGroup title={isAr ? '🌾 Glucides préférés' : '🌾 Glucides préférés'} field="preferredCarbs" options={CARB_OPTIONS} color={Colors.gold} />
            <ChipGroup title={isAr ? '🌍 Style de cuisine' : '🌍 Style de cuisine'} field="cuisineStyle" options={CUISINE_OPTIONS} color={Colors.success} />
            <ChipGroup title={isAr ? '🚫 Restrictions' : '🚫 Restrictions alimentaires'} field="restrictions" options={RESTRICTION_OPTIONS} color={Colors.warning} />

            {/* Meals per day */}
            <View style={mpStyles.group}>
              <Text style={mpStyles.groupLabel}>{isAr ? '🍽️ Repas par jour' : '🍽️ Repas par jour'}</Text>
              <View style={mpStyles.mealCountRow}>
                {[2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[mpStyles.mealCountBtn, prefs.mealsPerDay === n && mpStyles.mealCountBtnActive]}
                    onPress={() => setPrefs(p => ({ ...p, mealsPerDay: n }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[mpStyles.mealCountText, prefs.mealsPerDay === n && mpStyles.mealCountTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Include Snacks */}
            <View style={mpStyles.group}>
              <View style={mpStyles.switchRow}>
                <Text style={mpStyles.switchLabel}>{isAr ? 'إضافة وجبات خفيفة' : 'Inclure des collations'}</Text>
                <Switch
                  value={prefs.includeSnacks}
                  onValueChange={v => setPrefs(p => ({ ...p, includeSnacks: v }))}
                  trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
                  thumbColor={Colors.textPrimary}
                />
              </View>
            </View>

            {/* Disliked foods */}
            <View style={mpStyles.group}>
              <Text style={mpStyles.groupLabel}>{isAr ? '❌ Aliments à éviter' : '❌ Aliments à éviter'}</Text>
              <TextInput
                style={mpStyles.textInput}
                value={prefs.dislikedFoods}
                onChangeText={v => setPrefs(p => ({ ...p, dislikedFoods: v }))}
                placeholder={isAr ? 'مثال: حلويات، دهون مشبعة...' : 'Ex: fromage fondu, choux de Bruxelles...'}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* AI Guidance Tips */}
            <View style={mpStyles.guidanceBox}>
              <MaterialIcons name="lightbulb" size={14} color={Colors.gold} />
              <Text style={mpStyles.guidanceText}>
                {isAr
                  ? 'كلما زادت التفاصيل، كلما كانت خطتك الغذائية أكثر دقة وتخصيصًا لاحتياجاتك.'
                  : "Plus vous donnez de détails, plus votre plan sera précis et adapté à vos goûts, votre culture et vos objectifs biologiques."
                }
              </Text>
            </View>
            <View style={{ height: 8 }} />
          </ScrollView>

          <TouchableOpacity
            style={mpStyles.generateBtn}
            onPress={() => { onClose(); onGenerate(prefs); }}
            activeOpacity={0.87}
          >
            <MaterialIcons name="auto-awesome" size={20} color={Colors.textInverse} />
            <Text style={mpStyles.generateBtnText}>
              {isAr ? 'توليد خطة غذائية مخصصة' : 'Générer mon plan sur mesure'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const mpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  panel: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.md, paddingBottom: 40, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: Spacing.sm },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  panelIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '33' },
  panelTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  panelSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  closeX: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  group: { marginBottom: Spacing.md },
  groupLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  chipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },
  mealCountRow: { flexDirection: 'row', gap: 10 },
  mealCountBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.surfaceBorder, alignItems: 'center' },
  mealCountBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mealCountText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  mealCountTextActive: { color: Colors.textInverse },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  textInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 12,
    color: Colors.textPrimary, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.surfaceBorder,
    lineHeight: 20, minHeight: 60, textAlignVertical: 'top',
  },
  guidanceBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.goldMuted, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.gold + '33' },
  guidanceText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 18 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 18, marginTop: Spacing.md,
    ...Shadow.primary,
  },
  generateBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
});

// ── MacroBar ──────────────────────────────────────────────────────────────────
function MacroBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.min(1, value / Math.max(total, 1));
  return (
    <View style={macroStyles.row}>
      <Text style={macroStyles.label}>{label}</Text>
      <View style={macroStyles.barBg}>
        <View style={[macroStyles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={macroStyles.value}>{value}g</Text>
    </View>
  );
}
const macroStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, width: 70 },
  barBg: { flex: 1, height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  value: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semibold, width: 40, textAlign: 'right' },
});

// ── Nutrition Score Badge ─────────────────────────────────────────────────────
function NutritionScoreBadge({ plan }: { plan: MealPlanDay }) {
  // Calculate score based on macro balance
  const totalMacroGrams = plan.macros.protein + plan.macros.carbs + plan.macros.fat;
  const proteinPct = (plan.macros.protein * 4 / plan.totalCalories) * 100;
  const carbPct = (plan.macros.carbs * 4 / plan.totalCalories) * 100;
  const fatPct = (plan.macros.fat * 9 / plan.totalCalories) * 100;
  // Ideal: P 25-35%, C 40-55%, F 20-35%
  const pScore = proteinPct >= 20 && proteinPct <= 40 ? 100 : 60;
  const cScore = carbPct >= 35 && carbPct <= 60 ? 100 : 60;
  const fScore = fatPct >= 15 && fatPct <= 40 ? 100 : 60;
  const fiberScore = plan.macros.fiber >= 25 ? 100 : (plan.macros.fiber / 25) * 100;
  const score = Math.round((pScore + cScore + fScore + fiberScore) / 4);
  const scoreColor = score >= 80 ? Colors.success : score >= 60 ? Colors.warning : Colors.danger;
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Correct' : 'À améliorer';

  return (
    <View style={[nsStyles.badge, { borderColor: scoreColor + '44', backgroundColor: scoreColor + '15' }]}>
      <Text style={[nsStyles.score, { color: scoreColor }]}>{score}</Text>
      <View>
        <Text style={nsStyles.label}>Score Nutrition</Text>
        <Text style={[nsStyles.sublabel, { color: scoreColor }]}>{scoreLabel}</Text>
      </View>
    </View>
  );
}
const nsStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  score: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  label: { fontSize: FontSize.micro, color: Colors.textMuted },
  sublabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});

// ── Main Nutrition Screen ─────────────────────────────────────────────────────
export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeklyMealPlan, deficiencies, regenerateMealPlan, profile, isMealLoading } = useHealth();
  const { t, language } = useLanguage();
  const [selectedDay, setSelectedDay] = useState(0);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [lastPrefs, setLastPrefs] = useState<any>(null);

  const goToRecipes = useCallback(() => router.push('/recipes'), [router]);
  const goToFoodLogger = useCallback(() => router.push('/food-logger'), [router]);

  const dayLabels = t('days').split(',');
  const plan = weeklyMealPlan[selectedDay];
  const isAr = language === 'ar';

  const getMealName = (meal: Meal) => {
    if (language === 'ar' && meal.nameAr) return meal.nameAr;
    return meal.name;
  };

  const handleGenerate = useCallback(async (prefs: any) => {
    setLastPrefs(prefs);
    // Build context string for the AI
    const prefsContext = [
      `Protéines préférées: ${prefs.preferredProteins.join(', ')}`,
      `Glucides préférés: ${prefs.preferredCarbs.join(', ')}`,
      `Style cuisine: ${prefs.cuisineStyle.join(', ')}`,
      `Restrictions: ${prefs.restrictions.join(', ') || 'Aucune'}`,
      `Aliments exclus: ${prefs.dislikedFoods || 'Aucun'}`,
      `Repas/jour: ${prefs.mealsPerDay}`,
      `Collations: ${prefs.includeSnacks ? 'Oui' : 'Non'}`,
    ].join(' | ');
    await regenerateMealPlan(prefsContext);
  }, [regenerateMealPlan]);

  const mealSections = plan ? [
    { key: 'breakfast', label: t('breakfast'), meal: plan.breakfast, icon: 'wb-sunny', color: Colors.gold },
    { key: 'lunch', label: t('lunch'), meal: plan.lunch, icon: 'restaurant', color: Colors.primary },
    { key: 'dinner', label: t('dinner'), meal: plan.dinner, icon: 'nightlight-round', color: Colors.purple },
    { key: 'snack', label: t('snack'), meal: plan.snack, icon: 'apple', color: Colors.success },
  ] : [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Meal Preferences Modal */}
      <MealPrefsModal
        visible={showPrefsModal}
        onClose={() => setShowPrefsModal(false)}
        onGenerate={handleGenerate}
        language={language}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('meal_plan')}</Text>
          <View style={styles.navBtns}>
            <TouchableOpacity style={styles.logFoodBtn} onPress={goToFoodLogger} activeOpacity={0.8}>
              <MaterialIcons name="add-circle-outline" size={13} color={Colors.success} />
              <Text style={styles.logFoodText}>{isAr ? 'سجل طعام' : 'Logger'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recipesNavBtn} onPress={goToRecipes} activeOpacity={0.8}>
              <MaterialIcons name="public" size={13} color={Colors.gold} />
              <Text style={styles.recipesNavText}>{isAr ? 'وصفات' : 'Recettes'}</Text>
            </TouchableOpacity>
          </View>
          {deficiencies.length > 0 && (
            <View style={styles.adaptedBadge}>
              <MaterialIcons name="biotech" size={10} color={Colors.primary} />
              <Text style={styles.adaptedText}>{isAr ? 'متكيف مع تحاليلك البيولوجية' : 'Adapté à vos analyses biologiques'}</Text>
            </View>
          )}
        </View>

        {/* Generate with Prefs button */}
        <TouchableOpacity
          style={[styles.genBtn, isMealLoading && styles.genBtnLoading]}
          onPress={() => setShowPrefsModal(true)}
          activeOpacity={0.8}
          disabled={isMealLoading}
        >
          {isMealLoading
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <MaterialIcons name="tune" size={16} color={Colors.textInverse} />
          }
          <Text style={styles.genBtnText}>
            {isMealLoading ? (isAr ? 'توليد...' : 'Génération...') : (isAr ? 'خصص + توليد' : 'Personnaliser')}
          </Text>
        </TouchableOpacity>
      </View>

      {isMealLoading && (
        <View style={styles.aiLoadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.aiLoadingText}>
            {isAr
              ? 'الذكاء الاصطناعي يولّد خطتك الغذائية المخصصة بناءً على تفضيلاتك وبياناتك البيولوجية...'
              : "L'IA génère votre plan nutritionnel basé sur vos préférences et biomarqueurs..."
            }
          </Text>
        </View>
      )}

      {/* Last prefs summary */}
      {lastPrefs && !isMealLoading && (
        <View style={styles.prefsSummaryBar}>
          <MaterialIcons name="check-circle" size={13} color={Colors.success} />
          <Text style={styles.prefsSummaryText} numberOfLines={1}>
            {lastPrefs.preferredProteins.slice(0, 2).join(', ')} · {lastPrefs.cuisineStyle[0]}
            {lastPrefs.restrictions.length > 0 ? ` · ${lastPrefs.restrictions[0]}` : ''}
          </Text>
          <TouchableOpacity onPress={() => setShowPrefsModal(true)}>
            <Text style={styles.editPrefsText}>{isAr ? 'تعديل' : 'Modifier'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Day Selector */}
      <View style={styles.dayBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarInner}>
          {dayLabels.map((day, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
              onPress={() => setSelectedDay(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {plan && (
          <>
            {/* Daily Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>{t('daily_calories')}</Text>
                  <Text style={styles.summaryValue}>
                    {plan.totalCalories} <Text style={styles.summaryUnit}>{t('kcal')}</Text>
                  </Text>
                </View>
                <View style={styles.summaryRight}>
                  <NutritionScoreBadge plan={plan} />
                  <View style={styles.macroRings}>
                    {[
                      { color: Colors.primary, label: 'P', value: plan.macros.protein },
                      { color: Colors.gold, label: 'G', value: plan.macros.carbs },
                      { color: Colors.purple, label: 'L', value: plan.macros.fat },
                    ].map((m, i) => (
                      <View key={i} style={styles.macroRing}>
                        <View style={[styles.macroRingCircle, { borderColor: m.color }]}>
                          <Text style={[styles.macroRingLetter, { color: m.color }]}>{m.label}</Text>
                        </View>
                        <Text style={styles.macroRingVal}>{m.value}g</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              <View style={styles.macroSection}>
                <MacroBar label={t('protein')} value={plan.macros.protein} total={plan.macros.protein + 20} color={Colors.primary} />
                <MacroBar label={t('carbs')} value={plan.macros.carbs} total={plan.macros.carbs + 30} color={Colors.gold} />
                <MacroBar label={t('fat')} value={plan.macros.fat} total={plan.macros.fat + 20} color={Colors.purple} />
                <MacroBar label={t('fiber')} value={plan.macros.fiber} total={plan.macros.fiber + 10} color={Colors.success} />
              </View>
            </View>

            {/* Meal Cards */}
            {mealSections.map(({ key, label, meal, icon, color }) => (
              <TouchableOpacity
                key={key}
                style={styles.mealCard}
                onPress={() => router.push({ pathname: '/recipe', params: { mealKey: key, dayIndex: selectedDay } })}
                activeOpacity={0.85}
              >
                <Image
                  source={MEAL_IMAGES[meal.image] || MEAL_IMAGES['meal-1']}
                  style={styles.mealImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={[styles.mealImageOverlay, { backgroundColor: color + '22' }]} />
                <View style={styles.mealInfo}>
                  <View style={styles.mealMeta}>
                    <View style={[styles.mealTypeChip, { backgroundColor: color + '22' }]}>
                      <MaterialIcons name={icon as any} size={12} color={color} />
                      <Text style={[styles.mealTypeText, { color }]}>{label}</Text>
                    </View>
                    <View style={styles.prepRow}>
                      <MaterialIcons name="schedule" size={12} color={Colors.textMuted} />
                      <Text style={styles.prepText}>{meal.prepTime} min</Text>
                    </View>
                  </View>
                  <Text style={styles.mealName}>{getMealName(meal)}</Text>
                  <View style={styles.mealMacrosRow}>
                    <Text style={[styles.mealCal, { color }]}>{meal.calories} {t('kcal')}</Text>
                    <View style={styles.macroPills}>
                      <View style={styles.macroPill}><Text style={styles.macroPillText}>P {meal.protein}g</Text></View>
                      <View style={[styles.macroPill, { backgroundColor: Colors.goldMuted }]}><Text style={[styles.macroPillText, { color: Colors.gold }]}>G {meal.carbs}g</Text></View>
                      <View style={[styles.macroPill, { backgroundColor: Colors.purpleMuted }]}><Text style={[styles.macroPillText, { color: Colors.purple }]}>L {meal.fat}g</Text></View>
                    </View>
                  </View>
                  <View style={styles.tagsRow}>
                    {meal.tags.slice(0, 3).map(tag => (
                      <View key={tag} style={styles.tagPill}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.mealArrow}>
                  <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Empty state */}
        {!plan && !isMealLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>{isAr ? 'لا يوجد خطة غذائية بعد' : 'Aucun plan nutritionnel'}</Text>
            <Text style={styles.emptyDesc}>
              {isAr ? 'اضغط على "تخصيص + توليد" لإنشاء خطتك الغذائية الشخصية مع الذكاء الاصطناعي'
                : 'Appuyez sur "Personnaliser" pour créer votre plan avec l\'IA'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPrefsModal(true)} activeOpacity={0.85}>
              <MaterialIcons name="auto-awesome" size={18} color={Colors.textInverse} />
              <Text style={styles.emptyBtnText}>{isAr ? 'إنشاء خطتي' : 'Créer mon plan'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Generation Guidance */}
        <View style={styles.aiGuide}>
          <MaterialIcons name="psychology" size={16} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiGuideTitle}>{isAr ? 'كيف يعمل الذكاء الاصطناعي؟' : 'Comment fonctionne l\'IA ?'}</Text>
            <Text style={styles.aiGuideDesc}>
              {isAr
                ? 'الذكاء الاصطناعي يجمع تفضيلاتك الغذائية + بياناتك البيولوجية (نقص الفيتامينات، الهرمونات) + هدفك الصحي لإنشاء خطة مخصصة 100% لك.'
                : "L'IA combine vos préférences alimentaires + vos biomarqueurs (carences, hormones) + vos objectifs pour créer un plan 100% personnalisé et culturellement adapté."
              }
            </Text>
            {deficiencies.length > 0 && (
              <Text style={styles.aiGuideNote}>
                ⚡ {deficiencies.length} {isAr ? 'نقص مكتشف — سيتم تعديل الخطة لتعويضها' : 'carence(s) détectée(s) — le plan sera adapté pour les corriger'}
              </Text>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  navBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  logFoodBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successMuted, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.success + '44' },
  logFoodText: { fontSize: 10, color: Colors.success, fontWeight: FontWeight.semibold },
  recipesNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.goldMuted, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.gold + '44' },
  recipesNavText: { fontSize: 10, color: Colors.gold, fontWeight: FontWeight.semibold },
  adaptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryMuted, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  adaptedText: { fontSize: 9, color: Colors.primary, fontWeight: FontWeight.semibold },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 12, flexShrink: 0,
    ...Shadow.primary,
  },
  genBtnLoading: { backgroundColor: Colors.textMuted },
  genBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },

  aiLoadingBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.primary + '44' },
  aiLoadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },

  prefsSummaryBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.successMuted, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.success + '33' },
  prefsSummaryText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },
  editPrefsText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },

  dayBar: { marginBottom: Spacing.md },
  dayBarInner: { paddingHorizontal: Spacing.md, gap: 8 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayChipTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  scroll: { paddingHorizontal: Spacing.md },

  summaryCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md, gap: Spacing.sm },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 36, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  summaryUnit: { fontSize: FontSize.md, fontWeight: FontWeight.regular },
  summaryRight: { alignItems: 'flex-end', gap: 8 },
  macroRings: { flexDirection: 'row', gap: 10 },
  macroRing: { alignItems: 'center', gap: 3 },
  macroRingCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated },
  macroRingLetter: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  macroRingVal: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.semibold },
  macroSection: { gap: 2 },

  mealCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, marginBottom: Spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder, flexDirection: 'row', ...Shadow.sm, position: 'relative' },
  mealImage: { width: 110, height: 150 },
  mealImageOverlay: { position: 'absolute', left: 0, top: 0, width: 110, height: 150 },
  mealInfo: { flex: 1, padding: Spacing.sm, gap: 6 },
  mealMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  mealTypeText: { fontSize: 10, fontWeight: FontWeight.semibold },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  prepText: { fontSize: 10, color: Colors.textMuted },
  mealName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 19 },
  mealMacrosRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  mealCal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  macroPills: { flexDirection: 'row', gap: 4 },
  macroPill: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  macroPillText: { fontSize: 9, color: Colors.primary, fontWeight: FontWeight.semibold },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  tagPill: {},
  tagText: { fontSize: 9, color: Colors.textMuted },
  mealArrow: { padding: Spacing.sm, justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, paddingHorizontal: 28, ...Shadow.primary },
  emptyBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },

  aiGuide: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '33' },
  aiGuideTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary, marginBottom: 4 },
  aiGuideDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  aiGuideNote: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semibold },

  purple: Colors.purple as any,
});
