import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth, Meal, MealPlanDay } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

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
  value: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semibold, width: 36, textAlign: 'right' },
});

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeklyMealPlan, deficiencies, regenerateMealPlan, profile } = useHealth();
  const { t, language, isRTL } = useLanguage();
  const [selectedDay, setSelectedDay] = useState(0);
  const [generating, setGenerating] = useState(false);

  const dayLabels = t('days').split(',');
  const plan = weeklyMealPlan[selectedDay];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      regenerateMealPlan();
      setGenerating(false);
    }, 1500);
  };

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
        <Text style={styles.title}>{t('meal_plan')}</Text>
        <TouchableOpacity
          style={[styles.genBtn, generating && styles.genBtnLoading]}
          onPress={handleGenerate}
          activeOpacity={0.8}
          disabled={generating}
        >
          <MaterialIcons name="auto-awesome" size={16} color={Colors.textInverse} />
          <Text style={styles.genBtnText}>{generating ? t('ai_analyzing') : t('generate_plan')}</Text>
        </TouchableOpacity>
      </View>

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
                <Text style={styles.summaryValue}>{plan.totalCalories} <Text style={styles.summaryUnit}>{t('kcal')}</Text></Text>
              </View>
              {deficiencies.length > 0 && (
                <View style={styles.adaptedBadge}>
                  <MaterialIcons name="biotech" size={12} color={Colors.primary} />
                  <Text style={styles.adaptedText}>{t('adapted_to_analysis')}</Text>
                </View>
              )}
            </View>
            <View style={styles.macroSection}>
              <MacroBar label={t('protein')} value={plan.macros.protein} total={plan.macros.protein + 20} color={Colors.primary} />
              <MacroBar label={t('carbs')} value={plan.macros.carbs} total={plan.macros.carbs + 20} color={Colors.gold} />
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
            onPress={() => router.push({ pathname: '/recipe', params: { mealId: meal.id, mealKey: key, dayIndex: selectedDay } })}
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
                <Text style={styles.mealCal}>{meal.calories} {t('kcal')}</Text>
                <View style={styles.macroPills}>
                  <View style={styles.macroPill}><Text style={styles.macroPillText}>P {meal.protein}{t('g')}</Text></View>
                  <View style={[styles.macroPill, { backgroundColor: Colors.goldMuted }]}><Text style={[styles.macroPillText, { color: Colors.gold }]}>C {meal.carbs}{t('g')}</Text></View>
                  <View style={[styles.macroPill, { backgroundColor: Colors.purpleMuted }]}><Text style={[styles.macroPillText, { color: Colors.purple }]}>F {meal.fat}{t('g')}</Text></View>
                </View>
              </View>
              {meal.tags.map(tag => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              )).slice(0, 2)}
            </View>
            <View style={styles.mealArrow}>
              <MaterialIcons name="arrow-forward-ios" size={16} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
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
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  genBtnLoading: { backgroundColor: Colors.textMuted },
  genBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },

  dayBar: { marginBottom: Spacing.md },
  dayBarInner: { paddingHorizontal: Spacing.md, gap: 8 },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayChipTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  scroll: { paddingHorizontal: Spacing.md },

  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: Spacing.md },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  summaryUnit: { fontSize: FontSize.md, fontWeight: FontWeight.regular },
  adaptedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  adaptedText: { fontSize: 10, color: Colors.primary, fontWeight: FontWeight.semibold },
  macroSection: { gap: 2 },

  mealCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: Spacing.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
  },
  mealImage: { width: 110, height: 130 },
  mealInfo: { flex: 1, padding: Spacing.sm, gap: 6 },
  mealMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  mealTypeText: { fontSize: 10, fontWeight: FontWeight.semibold },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  prepText: { fontSize: 10, color: Colors.textMuted },
  mealName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 18 },
  mealMacrosRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  mealCal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  macroPills: { flexDirection: 'row', gap: 4 },
  macroPill: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  macroPillText: { fontSize: 9, color: Colors.primary, fontWeight: FontWeight.semibold },
  tagPill: { alignSelf: 'flex-start' },
  tagText: { fontSize: 9, color: Colors.textMuted },
  mealArrow: { padding: Spacing.sm, justifyContent: 'center' },
});
