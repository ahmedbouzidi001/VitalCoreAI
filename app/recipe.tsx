import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHealth, Meal } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

const MEAL_IMAGES: Record<string, any> = {
  'meal-1': require('@/assets/images/meal-1.png'),
  'meal-2': require('@/assets/images/meal-2.png'),
  'meal-3': require('@/assets/images/meal-3.png'),
};

export default function RecipeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mealKey, dayIndex } = useLocalSearchParams<{ mealKey: string; dayIndex: string }>();
  const { weeklyMealPlan } = useHealth();
  const { t, language } = useLanguage();

  const day = weeklyMealPlan[parseInt(dayIndex || '0')];
  const meal: Meal | null = day ? (day as any)[mealKey as string] || null : null;

  if (!meal) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.errorText}>Recette introuvable</Text>
      </View>
    );
  }

  const mealName = language === 'ar' && meal.nameAr ? meal.nameAr : meal.name;
  const ingredients = language === 'ar' && meal.ingredientsAr ? meal.ingredientsAr : meal.ingredients;
  const instructions = language === 'ar' && meal.instructionsAr ? meal.instructionsAr : meal.instructions;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* Hero Image */}
      <View style={styles.imageContainer}>
        <Image
          source={MEAL_IMAGES[meal.image] || MEAL_IMAGES['meal-1']}
          style={styles.heroImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.imageOverlay} />
        <TouchableOpacity style={[styles.closeBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Meal Name & Tags */}
        <Text style={styles.mealName}>{mealName}</Text>
        <View style={styles.tagsRow}>
          {meal.tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>

        {/* Macros Grid */}
        <View style={styles.macrosGrid}>
          {[
            { label: t('kcal'), value: `${meal.calories}`, icon: 'local-fire-department', color: Colors.gold },
            { label: t('protein'), value: `${meal.protein}g`, icon: 'fitness-center', color: Colors.primary },
            { label: t('carbs'), value: `${meal.carbs}g`, icon: 'grain', color: Colors.warning },
            { label: t('fat'), value: `${meal.fat}g`, icon: 'opacity', color: Colors.purple },
            { label: t('fiber'), value: `${meal.fiber}g`, icon: 'eco', color: Colors.success },
            { label: t('prep_time'), value: `${meal.prepTime}m`, icon: 'schedule', color: Colors.textSecondary },
          ].map((m, i) => (
            <View key={i} style={styles.macroCard}>
              <MaterialIcons name={m.icon as any} size={18} color={m.color} />
              <Text style={[styles.macroValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="shopping-basket" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('ingredients')}</Text>
          </View>
          {ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View style={styles.ingredientDot} />
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="menu-book" size={20} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t('instructions')}</Text>
          </View>
          {instructions.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Science Note */}
        <View style={styles.scienceNote}>
          <MaterialIcons name="science" size={16} color={Colors.primary} />
          <Text style={styles.scienceNoteText}>
            {language === 'ar'
              ? 'هذه الوصفة محسّنة وفق تحاليلك البيولوجية بفضل الذكاء الاصطناعي وأحدث الأبحاث العلمية.'
              : language === 'fr'
                ? 'Cette recette est optimisée selon vos analyses biologiques grâce à l\'IA et aux dernières recherches scientifiques.'
                : 'This recipe is optimized according to your biological analysis using AI and the latest scientific research.'}
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  imageContainer: { height: 260, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    backgroundColor: Colors.background,
    // faux gradient via borderRadius
  },
  closeBtn: {
    position: 'absolute', right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  errorText: { color: Colors.textPrimary, textAlign: 'center', marginTop: 100, fontSize: FontSize.lg },
  backBtn: { position: 'absolute', top: 60, left: 16, zIndex: 10, padding: 8 },

  scroll: { paddingHorizontal: Spacing.md },
  mealName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  tagChip: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: FontSize.xs, color: Colors.textMuted },

  macrosGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg,
  },
  macroCard: {
    width: '30%', backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  macroValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  macroLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  ingredientText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1, lineHeight: 22 },

  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stepNumber: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.goldMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumberText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  stepText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

  scienceNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  scienceNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 20 },
});
