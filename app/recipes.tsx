// Country-based Recipe Module with AI
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useHealth } from '@/hooks/useHealth';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { COUNTRIES, CountryConfig } from '@/constants/countries';
import { generateCountryRecipes } from '@/services/vitalCore';

const MEAL_IMAGES: Record<string, any> = {
  'meal-1': require('@/assets/images/meal-1.png'),
  'meal-2': require('@/assets/images/meal-2.png'),
  'meal-3': require('@/assets/images/meal-3.png'),
};

const CATEGORIES = [
  { key: 'breakfast', label: 'Petit-déjeuner', labelAr: 'إفطار', icon: 'wb-sunny' },
  { key: 'lunch', label: 'Déjeuner', labelAr: 'غداء', icon: 'restaurant' },
  { key: 'dinner', label: 'Dîner', labelAr: 'عشاء', icon: 'nightlight-round' },
  { key: 'snack', label: 'Collation', labelAr: 'وجبة خفيفة', icon: 'apple' },
  { key: 'high_protein', label: 'High Protein', labelAr: 'عالي البروتين', icon: 'fitness-center' },
  { key: 'recovery', label: 'Récupération', labelAr: 'استشفاء', icon: 'spa' },
];

function RecipeCard({ recipe, onPress, language }: { recipe: any; onPress: () => void; language: string }) {
  const name = language === 'ar' && recipe.nameAr ? recipe.nameAr : recipe.name;
  return (
    <TouchableOpacity style={rcStyles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={MEAL_IMAGES[recipe.image] || MEAL_IMAGES['meal-1']}
        style={rcStyles.img}
        contentFit="cover"
        transition={200}
      />
      <View style={rcStyles.info}>
        <View style={rcStyles.topRow}>
          <Text style={rcStyles.name} numberOfLines={2}>{name}</Text>
          <View style={[rcStyles.diffBadge, {
            backgroundColor: recipe.difficulty === 'easy' ? Colors.successMuted : recipe.difficulty === 'hard' ? Colors.dangerMuted : Colors.goldMuted,
          }]}>
            <Text style={[rcStyles.diffText, {
              color: recipe.difficulty === 'easy' ? Colors.success : recipe.difficulty === 'hard' ? Colors.danger : Colors.gold,
            }]}>
              {recipe.difficulty === 'easy' ? 'Facile' : recipe.difficulty === 'hard' ? 'Avancé' : 'Moyen'}
            </Text>
          </View>
        </View>
        <View style={rcStyles.macroRow}>
          <Text style={[rcStyles.cal, { color: Colors.gold }]}>{recipe.calories} kcal</Text>
          <Text style={rcStyles.macro}>P:{recipe.protein}g</Text>
          <Text style={[rcStyles.macro, { color: Colors.gold }]}>G:{recipe.carbs}g</Text>
          <Text style={[rcStyles.macro, { color: Colors.purple }]}>L:{recipe.fat}g</Text>
        </View>
        <View style={rcStyles.prepRow}>
          <MaterialIcons name="schedule" size={12} color={Colors.textMuted} />
          <Text style={rcStyles.prepText}>{recipe.prepTime} min</Text>
          {recipe.healthBenefits?.[0] && (
            <Text style={rcStyles.benefitText} numberOfLines={1}> · {recipe.healthBenefits[0]}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const rcStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder, flexDirection: 'row' },
  img: { width: 100, height: 130 },
  info: { flex: 1, padding: 12, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 18 },
  diffBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { fontSize: 9, fontWeight: FontWeight.bold },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  macro: { fontSize: FontSize.xs, color: Colors.primary },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prepText: { fontSize: 10, color: Colors.textMuted },
  benefitText: { flex: 1, fontSize: 10, color: Colors.success },
});

function RecipeDetail({ recipe, language, onClose }: { recipe: any; language: string; onClose: () => void }) {
  const name = language === 'ar' && recipe.nameAr ? recipe.nameAr : recipe.name;
  const ingredients = language === 'ar' && recipe.ingredientsAr ? recipe.ingredientsAr : recipe.ingredients;
  const instructions = language === 'ar' && recipe.instructionsAr ? recipe.instructionsAr : recipe.instructions;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={dtStyles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Image source={MEAL_IMAGES[recipe.image] || MEAL_IMAGES['meal-1']} style={dtStyles.heroImage} contentFit="cover" />
        <View style={dtStyles.overlay} />
        <TouchableOpacity style={dtStyles.closeBtn} onPress={onClose}>
          <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <ScrollView style={dtStyles.scroll} contentContainerStyle={dtStyles.scrollContent}>
          <View style={dtStyles.titleBox}>
            <Text style={dtStyles.recipeName}>{name}</Text>
            <View style={dtStyles.metaRow}>
              <View style={dtStyles.metaItem}>
                <MaterialIcons name="schedule" size={14} color={Colors.textMuted} />
                <Text style={dtStyles.metaText}>{recipe.prepTime} min</Text>
              </View>
              <View style={dtStyles.metaItem}>
                <MaterialIcons name="local-fire-department" size={14} color={Colors.gold} />
                <Text style={[dtStyles.metaText, { color: Colors.gold }]}>{recipe.calories} kcal</Text>
              </View>
            </View>
          </View>

          {/* Macros */}
          <View style={dtStyles.macroGrid}>
            {[
              { label: 'Protéines', value: recipe.protein, unit: 'g', color: Colors.primary },
              { label: 'Glucides', value: recipe.carbs, unit: 'g', color: Colors.gold },
              { label: 'Lipides', value: recipe.fat, unit: 'g', color: Colors.purple },
              { label: 'Fibres', value: recipe.fiber, unit: 'g', color: Colors.success },
            ].map((m, i) => (
              <View key={i} style={dtStyles.macroCard}>
                <Text style={[dtStyles.macroVal, { color: m.color }]}>{m.value}{m.unit}</Text>
                <Text style={dtStyles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Science Note */}
          {recipe.nutritionNote && (
            <View style={dtStyles.scienceNote}>
              <MaterialIcons name="science" size={14} color={Colors.primary} />
              <Text style={dtStyles.scienceNoteText}>{recipe.nutritionNote}</Text>
            </View>
          )}

          {/* Health Benefits */}
          {recipe.healthBenefits?.length > 0 && (
            <View style={dtStyles.section}>
              <Text style={dtStyles.sectionTitle}>Bénéfices Santé</Text>
              {recipe.healthBenefits.map((b: string, i: number) => (
                <View key={i} style={dtStyles.benefitRow}>
                  <MaterialIcons name="check-circle" size={14} color={Colors.success} />
                  <Text style={dtStyles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ingredients */}
          <View style={dtStyles.section}>
            <Text style={dtStyles.sectionTitle}>Ingrédients</Text>
            {(ingredients || []).map((ing: string, i: number) => (
              <View key={i} style={dtStyles.ingRow}>
                <View style={dtStyles.ingDot} />
                <Text style={dtStyles.ingText}>{ing}</Text>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View style={dtStyles.section}>
            <Text style={dtStyles.sectionTitle}>Préparation</Text>
            {(instructions || []).map((step: string, i: number) => (
              <View key={i} style={dtStyles.stepRow}>
                <View style={dtStyles.stepNum}>
                  <Text style={dtStyles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={dtStyles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const dtStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  heroImage: { width: '100%', height: 220, position: 'absolute', top: 0 },
  overlay: { position: 'absolute', top: 0, width: '100%', height: 220, backgroundColor: 'rgba(11,20,38,0.5)' },
  closeBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10, backgroundColor: Colors.surface, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, marginTop: 200 },
  scrollContent: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.md, paddingTop: 20 },
  titleBox: { marginBottom: 16 },
  recipeName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  macroGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macroCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  macroVal: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  macroLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  scienceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
  scienceNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  benefitText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  ingText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },
  stepText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const { language, country, setCountry } = useLanguage();
  const { profile } = useHealth();
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(country);
  const [selectedCategory, setSelectedCategory] = useState('lunch');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const { result, error } = await generateCountryRecipes(
        selectedCountry.code,
        selectedCategory,
        language,
        profile
      );
      if (result && Array.isArray(result)) {
        setRecipes(result);
      } else if (error) {
        console.error('Recipe error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, selectedCategory, language, profile]);

  const handleSelectCountry = (c: CountryConfig) => {
    setSelectedCountry(c);
    setCountry(c.code);
    setShowCountryPicker(false);
    setRecipes([]);
  };

  const catLabel = (cat: any) => language === 'ar' ? cat.labelAr : cat.label;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recettes Mondiales</Text>
          <Text style={styles.headerSub}>Générées par IA selon votre profil</Text>
        </View>
        <TouchableOpacity style={styles.countryBtn} onPress={() => setShowCountryPicker(p => !p)} activeOpacity={0.8}>
          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
          <Text style={styles.countryCode}>{selectedCountry.code}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Country Picker */}
      {showCountryPicker && (
        <View style={styles.countryPickerPanel}>
          <Text style={styles.countryPickerTitle}>Choisir un pays</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryRow}>
            {COUNTRIES.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[styles.countryCard, selectedCountry.code === c.code && styles.countryCardActive]}
                onPress={() => handleSelectCountry(c)}
                activeOpacity={0.8}
              >
                <Text style={styles.countryCardFlag}>{c.flag}</Text>
                <Text style={[styles.countryCardName, selectedCountry.code === c.code && styles.countryCardNameActive]}>
                  {language === 'fr' ? c.nameFr : language === 'ar' ? c.nameAr : c.name}
                </Text>
                <Text style={styles.countryCardCurrency}>{c.currencySymbol}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Country Food Culture */}
      <View style={styles.foodCultureBar}>
        <Text style={styles.foodCultureLabel}>{selectedCountry.flag} Spécialités :</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foodCultureRow}>
          {selectedCountry.foodCulture.slice(0, 6).map(f => (
            <View key={f} style={styles.foodChip}>
              <Text style={styles.foodChipText}>{f}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Category Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.catChip, selectedCategory === cat.key && styles.catChipActive]}
            onPress={() => setSelectedCategory(cat.key)}
            activeOpacity={0.8}
          >
            <MaterialIcons name={cat.icon as any} size={14} color={selectedCategory === cat.key ? Colors.textInverse : Colors.textMuted} />
            <Text style={[styles.catText, selectedCategory === cat.key && styles.catTextActive]}>{catLabel(cat)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Generate Button */}
      <View style={styles.generateRow}>
        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.generateBtnLoading]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <MaterialIcons name="auto-awesome" size={16} color={Colors.textInverse} />
          }
          <Text style={styles.generateBtnText}>
            {loading ? 'Génération IA...' : `Recettes ${selectedCountry.flag} par IA`}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>
            L'IA génère des recettes authentiques de {language === 'fr' ? selectedCountry.nameFr : selectedCountry.name} adaptées à votre profil...
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {recipes.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{selectedCountry.flag}</Text>
            <Text style={styles.emptyTitle}>
              Découvrez la cuisine {language === 'fr' ? selectedCountry.nameFr : selectedCountry.name}
            </Text>
            <Text style={styles.emptySub}>
              Cliquez sur "Recettes par IA" pour générer des recettes authentiques adaptées à votre profil nutritionnel.
            </Text>
          </View>
        )}

        {recipes.map((recipe, i) => (
          <RecipeCard
            key={i}
            recipe={recipe}
            language={language}
            onPress={() => setSelectedRecipe(recipe)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          language={language}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  countryPickerPanel: { marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  countryPickerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  countryRow: { gap: 10, paddingBottom: 4 },
  countryCard: { alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 12, minWidth: 80, borderWidth: 1, borderColor: Colors.surfaceBorder },
  countryCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  countryCardFlag: { fontSize: 28 },
  countryCardName: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', fontWeight: FontWeight.medium },
  countryCardNameActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  countryCardCurrency: { fontSize: 10, color: Colors.textMuted },

  foodCultureBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: 8 },
  foodCultureLabel: { fontSize: FontSize.xs, color: Colors.textMuted, flexShrink: 0 },
  foodCultureRow: { gap: 6 },
  foodChip: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  foodChipText: { fontSize: 10, color: Colors.textSecondary },

  catRow: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  catTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  generateRow: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14 },
  generateBtnLoading: { backgroundColor: Colors.textMuted },
  generateBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },

  loadingBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12 },
  loadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },

  scroll: { paddingHorizontal: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
