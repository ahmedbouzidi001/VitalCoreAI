// VitalCore AI — Food Logger Screen (Real Food Tracking + Barcode)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useHealth } from '@/hooks/useHealth';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import {
  FoodItem, FoodLog,
  searchFoods, LOCAL_FOODS_DB,
  saveFoodLog, loadTodayFoodLogs, deleteFoodLog,
} from '@/services/foodLogger';
import { addXP } from '@/services/gamification';
import { useAlert } from '@/template';

const MEAL_TYPES: Array<{ key: FoodLog['meal_type']; labelFr: string; labelAr: string; icon: string; color: string }> = [
  { key: 'breakfast', labelFr: 'Petit-déjeuner', labelAr: 'إفطار', icon: 'wb-sunny', color: Colors.gold },
  { key: 'lunch', labelFr: 'Déjeuner', labelAr: 'غداء', icon: 'restaurant', color: Colors.primary },
  { key: 'dinner', labelFr: 'Dîner', labelAr: 'عشاء', icon: 'nightlight-round', color: '#7C3AED' },
  { key: 'snack', labelFr: 'Collation', labelAr: 'وجبة خفيفة', icon: 'apple', color: Colors.success },
];

function FoodCard({ item, onAdd, language }: { item: FoodItem; onAdd: (item: FoodItem) => void; language: string }) {
  return (
    <TouchableOpacity style={fcStyles.card} onPress={() => onAdd(item)} activeOpacity={0.85}>
      <View style={fcStyles.info}>
        <Text style={fcStyles.name} numberOfLines={1}>{item.name}</Text>
        {item.brandName ? <Text style={fcStyles.brand}>{item.brandName}</Text> : null}
        <View style={fcStyles.macros}>
          <Text style={[fcStyles.cal, { color: Colors.gold }]}>{item.calories} kcal</Text>
          <Text style={fcStyles.macro}>P {item.protein}g</Text>
          <Text style={[fcStyles.macro, { color: Colors.gold }]}>G {item.carbs}g</Text>
          <Text style={[fcStyles.macro, { color: Colors.purple }]}>L {item.fat}g</Text>
        </View>
        <Text style={fcStyles.per}>pour 100g</Text>
      </View>
      <View style={fcStyles.addBtn}>
        <MaterialIcons name="add" size={20} color={Colors.textInverse} />
      </View>
    </TouchableOpacity>
  );
}

const fcStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  info: { flex: 1 },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  brand: { fontSize: 10, color: Colors.textMuted, marginBottom: 4 },
  macros: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  cal: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  macro: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  per: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

function AddFoodModal({ item, mealType, onConfirm, onClose, language }: {
  item: FoodItem; mealType: FoodLog['meal_type'];
  onConfirm: (log: FoodLog) => void; onClose: () => void; language: string;
}) {
  const [quantity, setQuantity] = useState('100');
  const qty = parseInt(quantity) || 100;
  const ratio = qty / 100;

  const mealLabel = MEAL_TYPES.find(m => m.key === mealType);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={amStyles.overlay}>
          <View style={amStyles.panel}>
            <View style={amStyles.header}>
              <Text style={amStyles.title} numberOfLines={2}>{item.name}</Text>
              <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={22} color={Colors.textSecondary} /></TouchableOpacity>
            </View>

            <Text style={amStyles.mealLabel}>
              {language === 'ar' ? mealLabel?.labelAr : mealLabel?.labelFr}
            </Text>

            <View style={amStyles.qtyRow}>
              <Text style={amStyles.qtyLabel}>{language === 'ar' ? 'الكمية (غ)' : 'Quantité (g)'}</Text>
              <View style={amStyles.qtyControls}>
                <TouchableOpacity style={amStyles.qtyBtn} onPress={() => setQuantity(String(Math.max(10, qty - 25)))}>
                  <MaterialIcons name="remove" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  style={amStyles.qtyInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={amStyles.qtyBtn} onPress={() => setQuantity(String(qty + 25))}>
                  <MaterialIcons name="add" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={amStyles.macroGrid}>
              {[
                { label: 'Calories', val: Math.round(item.calories * ratio), unit: 'kcal', color: Colors.gold },
                { label: 'Protéines', val: Math.round(item.protein * ratio * 10) / 10, unit: 'g', color: Colors.primary },
                { label: 'Glucides', val: Math.round(item.carbs * ratio * 10) / 10, unit: 'g', color: Colors.gold },
                { label: 'Lipides', val: Math.round(item.fat * ratio * 10) / 10, unit: 'g', color: '#7C3AED' },
              ].map((m, i) => (
                <View key={i} style={amStyles.macroCard}>
                  <Text style={[amStyles.macroVal, { color: m.color }]}>{m.val}{m.unit}</Text>
                  <Text style={amStyles.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={amStyles.confirmBtn}
              onPress={() => onConfirm({
                meal_type: mealType,
                food_name: item.name,
                calories: Math.round(item.calories * ratio),
                protein: Math.round(item.protein * ratio * 10) / 10,
                carbs: Math.round(item.carbs * ratio * 10) / 10,
                fat: Math.round(item.fat * ratio * 10) / 10,
                fiber: Math.round(item.fiber * ratio * 10) / 10,
                quantity_g: qty,
              })}
              activeOpacity={0.9}
            >
              <MaterialIcons name="add-circle" size={18} color={Colors.textInverse} />
              <Text style={amStyles.confirmText}>
                {language === 'ar' ? 'إضافة' : 'Ajouter'} — {Math.round(item.calories * ratio)} kcal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const amStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  panel: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  mealLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold, marginBottom: 16 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  qtyLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  qtyInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, width: 64, textAlign: 'center', color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, paddingVertical: 6, borderWidth: 1, borderColor: Colors.surfaceBorder },
  macroGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  macroCard: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  macroVal: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  macroLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16 },
  confirmText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },
});

export default function FoodLoggerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language, country } = useLanguage();
  const { updateDailyStats, dailyStats } = useHealth();
  const { showAlert } = useAlert();
  const [activeMeal, setActiveMeal] = useState<FoodLog['meal_type']>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showLocal, setShowLocal] = useState(true);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (user) loadLogs();
  }, [user]);

  const loadLogs = async () => {
    if (!user) return;
    setLoadingLogs(true);
    const { data } = await loadTodayFoodLogs(user.id);
    setTodayLogs(data);
    setLoadingLogs(false);
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowLocal(true); return; }
    setSearching(true);
    setShowLocal(false);
    const results = await searchFoods(searchQuery, country.code);
    if (results.length === 0) {
      // Fallback to local database
      const local = LOCAL_FOODS_DB.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(local.length > 0 ? local : LOCAL_FOODS_DB.slice(0, 8));
    } else {
      setSearchResults(results);
    }
    setSearching(false);
  }, [searchQuery, country.code]);

  const handleAddFood = async (log: FoodLog) => {
    if (!user) { router.push('/login'); return; }
    const error = await saveFoodLog(user.id, log);
    if (error) { showAlert('Erreur', error); return; }
    await updateDailyStats({ calories: dailyStats.calories + log.calories });
    await addXP(user.id, 'log_food');
    setSelectedFood(null);
    await loadLogs();
    showAlert('✅ Ajouté', `${log.food_name} — ${log.calories} kcal`);
  };

  const handleDeleteLog = async (logId: string, calories: number) => {
    showAlert('Supprimer ?', 'Retirer cet aliment du journal ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          await deleteFoodLog(logId);
          await updateDailyStats({ calories: Math.max(0, dailyStats.calories - calories) });
          await loadLogs();
        }
      }
    ]);
  };

  const todayTotals = todayLogs.reduce((acc, l) => ({
    calories: acc.calories + (l.calories || 0),
    protein: acc.protein + (l.protein || 0),
    carbs: acc.carbs + (l.carbs || 0),
    fat: acc.fat + (l.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const mealLabel = (m: typeof MEAL_TYPES[0]) => language === 'ar' ? m.labelAr : m.labelFr;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{language === 'ar' ? 'سجل الطعام' : 'Journal Alimentaire'}</Text>
          <Text style={styles.headerSub}>{new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-TN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <View style={styles.totalCalBadge}>
          <Text style={styles.totalCalVal}>{todayTotals.calories}</Text>
          <Text style={styles.totalCalUnit}>kcal</Text>
        </View>
      </View>

      {/* Today macros summary */}
      <View style={styles.macroSummary}>
        {[
          { label: 'P', val: Math.round(todayTotals.protein), color: Colors.primary },
          { label: 'G', val: Math.round(todayTotals.carbs), color: Colors.gold },
          { label: 'L', val: Math.round(todayTotals.fat), color: '#7C3AED' },
        ].map((m, i) => (
          <View key={i} style={styles.macroSumItem}>
            <Text style={[styles.macroSumVal, { color: m.color }]}>{m.val}g</Text>
            <Text style={styles.macroSumLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Meal Type Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealTabs}>
        {MEAL_TYPES.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.mealTab, activeMeal === m.key && { backgroundColor: m.color, borderColor: m.color }]}
            onPress={() => setActiveMeal(m.key)}
            activeOpacity={0.8}
          >
            <MaterialIcons name={m.icon as any} size={14} color={activeMeal === m.key ? Colors.textInverse : Colors.textMuted} />
            <Text style={[styles.mealTabText, activeMeal === m.key && styles.mealTabTextActive]}>{mealLabel(m)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholder={language === 'ar' ? 'ابحث عن طعام...' : 'Rechercher un aliment...'}
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={Colors.primary} />}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowLocal(true); }}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
          <MaterialIcons name="search" size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Today's logs for this meal */}
        {todayLogs.filter(l => l.meal_type === activeMeal).length > 0 && (
          <View style={styles.loggedSection}>
            <Text style={styles.sectionTitle}>
              {language === 'ar' ? 'مُسجَّل اليوم' : 'Déjà enregistré'}
            </Text>
            {todayLogs.filter(l => l.meal_type === activeMeal).map((log, i) => (
              <View key={log.id || i} style={styles.logRow}>
                <View style={styles.logInfo}>
                  <Text style={styles.logName} numberOfLines={1}>{log.food_name}</Text>
                  <Text style={styles.logMacros}>
                    {log.calories} kcal · P{log.protein}g · G{log.carbs}g · L{log.fat}g
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteLog(log.id, log.calories)} style={styles.deleteBtn}>
                  <MaterialIcons name="delete-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {language === 'ar' ? 'نتائج البحث' : 'Résultats'} ({searchResults.length})
            </Text>
            {searchResults.map((item, i) => (
              <FoodCard key={i} item={item} language={language} onAdd={(f) => setSelectedFood(f)} />
            ))}
          </>
        )}

        {/* Local popular foods */}
        {showLocal && (
          <>
            <Text style={styles.sectionTitle}>
              {language === 'ar' ? '🇹🇳 أطعمة شائعة' : `${country.flag} Aliments populaires`}
            </Text>
            {LOCAL_FOODS_DB.slice(0, 12).map((item, i) => (
              <FoodCard key={i} item={item} language={language} onAdd={(f) => setSelectedFood(f)} />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {selectedFood && (
        <AddFoodModal
          item={selectedFood}
          mealType={activeMeal}
          language={language}
          onConfirm={handleAddFood}
          onClose={() => setSelectedFood(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backBtn: { padding: 4 },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  totalCalBadge: { marginLeft: 'auto' as any, alignItems: 'center', backgroundColor: Colors.goldMuted, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold + '44' },
  totalCalVal: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.gold },
  totalCalUnit: { fontSize: 9, color: Colors.gold },
  macroSummary: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 12, marginBottom: Spacing.sm },
  macroSumItem: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  macroSumVal: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  macroSumLabel: { fontSize: 10, color: Colors.textMuted },
  mealTabs: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  mealTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  mealTabText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  mealTabTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },
  searchRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, marginBottom: Spacing.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.surfaceBorder },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  searchBtn: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  loggedSection: { marginBottom: Spacing.md },
  logRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: 6, borderWidth: 1, borderColor: Colors.success + '33' },
  logInfo: { flex: 1 },
  logName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  logMacros: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },
  purple: { color: '#7C3AED' },
});
