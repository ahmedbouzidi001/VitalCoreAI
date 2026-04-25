import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
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

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeklyMealPlan, deficiencies, regenerateMealPlan, profile, isMealLoading } = useHealth();
  const { t, language } = useLanguage();
  const [selectedDay, setSelectedDay] = useState(0);
  const goToRecipes = useCallback(() => router.push('/recipes'), [router]);
  const goToFoodLogger = useCallback(() => router.push('/food-logger'), [router]);

  const dayLabels = t('days').split(',');
  const plan = weeklyMealPlan[selectedDay];

  const getMealName = (meal: Meal) => {
    if (language === 'ar' && meal.nameAr) return meal.nameAr;
    return meal.name;
  };

  const mealSections = plan ? [
    { key: 'breakfast', label: t('breakfast'), meal: plan.breakfast, icon: 'wb-sunny', color: Colors.gold },
    { key: 'lunch', label: t('lunch'), meal: plan.lunch, icon: 'restaurant', color: Colors.primary },
    { key: 'dinner', label: t('dinner'), meal: plan.dinner, icon: 'nightlight-round', color: Colors.purple },
    { key: 'snack', label: t('snack'), meal: plan.snack, icon: 'apple', color: Colors.success },
  ] : [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('meal_plan')}</Text>
            <View style={styles.navBtns}>
              <TouchableOpacity style={styles.logFoodBtn} onPress={goToFoodLogger} activeOpacity={0.8}>
                <MaterialIcons name="add-circle-outline" size={14} color={Colors.success} />
                <Text style={styles.logFoodText}>{language === 'ar' ? 'سجل طعام' : 'Logger'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recipesNavBtn} onPress={goToRecipes} activeOpacity={0.8}>
                <MaterialIcons name="public" size={14} color={Colors.gold} />
                <Text style={styles.recipesNavText}>Recettes mondiales</Text>
              </TouchableOpacity>
            </View>
          </View>
          {deficiencies.length > 0 && (
            <View style={styles.adaptedBadge}>
              <MaterialIcons name="biotech" size={10} color={Colors.primary} />
              <Text style={styles.adaptedText}>Adapté à vos analyses biologiques</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.genBtn, isMealLoading && styles.genBtnLoading]}
          onPress={regenerateMealPlan}
          activeOpacity={0.8}
          disabled={isMealLoading}
        >
          {isMealLoading
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <MaterialIcons name="auto-awesome" size={16} color={Colors.textInverse} />
          }
          <Text style={styles.genBtnText}>
            {isMealLoading ? 'Génération IA...' : 'Générer IA'}
          </Text>
        </TouchableOpacity>
      </View>

      {isMealLoading && (
        <View style={styles.aiLoadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.aiLoadingText}>
            L'IA génère votre plan nutritionnel personnalisé basé sur vos biomarqueurs...
          </Text>
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
        {/* Daily Summary */}
        {plan && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>{t('daily_calories')}</Text>
                <Text style={styles.summaryValue}>
                  {plan.totalCalories} <Text style={styles.summaryUnit}>{t('kcal')}</Text>
                </Text>
              </View>
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
            <View style={styles.macroSection}>
              <MacroBar label={t('protein')} value={plan.macros.protein} total={plan.macros.protein + 20} color={Colors.primary} />
              <MacroBar label={t('carbs')} value={plan.macros.carbs} total={plan.macros.carbs + 30} color={Colors.gold} />
              <MacroBar label={t('fat')} value={plan.macros.fat} total={plan.macros.fat + 20} color={Colors.purple} />
              <MacroBar label={t('fiber')} value={plan.macros.fiber} total={plan.macros.fiber + 10} color={Colors.success} />
            </View>
          </View>
        )}

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
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillText}>P {meal.protein}g</Text>
                  </View>
                  <View style={[styles.macroPill, { backgroundColor: Colors.goldMuted }]}>
                    <Text style={[styles.macroPillText, { color: Colors.gold }]}>G {meal.carbs}g</Text>
                  </View>
                  <View style={[styles.macroPill, { backgroundColor: Colors.purpleMuted }]}>
                    <Text style={[styles.macroPillText, { color: Colors.purple }]}>L {meal.fat}g</Text>
                  </View>
                </View>
              </View>
              <View style={styles.tagsRow}>
                {meal.tags.slice(0, 2).map(tag => (
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  titleRow: { flex: 1, gap: 4 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  navBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  logFoodBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successMuted, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.success + '44' },
  logFoodText: { fontSize: 10, color: Colors.success, fontWeight: FontWeight.semibold },
  recipesNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.goldMuted, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.gold + '44' },
  recipesNavText: { fontSize: 10, color: Colors.gold, fontWeight: FontWeight.semibold },
  adaptedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  adaptedText: { fontSize: 10, color: Colors.primary, fontWeight: FontWeight.semibold },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 11,
    ...Shadow.primary,
  },
  genBtnLoading: { backgroundColor: Colors.textMuted },
  genBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },

  aiLoadingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md,
    padding: 12, borderWidth: 1, borderColor: Colors.primary + '44',
  },
  aiLoadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },

  dayBar: { marginBottom: Spacing.md },
  dayBarInner: { paddingHorizontal: Spacing.md, gap: 8 },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayChipTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  scroll: { paddingHorizontal: Spacing.md },

  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 36, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  summaryUnit: { fontSize: FontSize.md, fontWeight: FontWeight.regular },
  macroRings: { flexDirection: 'row', gap: 12 },
  macroRing: { alignItems: 'center', gap: 4 },
  macroRingCircle: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  macroRingLetter: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  macroRingVal: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.semibold },
  macroSection: { gap: 2 },

  mealCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    marginBottom: Spacing.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    flexDirection: 'row', ...Shadow.sm,
  },
  mealImage: { width: 110, height: 140 },
  mealInfo: { flex: 1, padding: Spacing.sm, gap: 6 },
  mealMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  mealTypeText: { fontSize: 10, fontWeight: FontWeight.semibold },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  prepText: { fontSize: 10, color: Colors.textMuted },
  mealName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 18 },
  mealMacrosRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  mealCal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  macroPills: { flexDirection: 'row', gap: 4 },
  macroPill: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  macroPillText: { fontSize: 9, color: Colors.primary, fontWeight: FontWeight.semibold },
  tagsRow: { flexDirection: 'row', gap: 4 },
  tagPill: {},
  tagText: { fontSize: 9, color: Colors.textMuted },
  mealArrow: { padding: Spacing.sm, justifyContent: 'center' },
});
