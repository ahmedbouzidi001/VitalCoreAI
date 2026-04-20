import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth, BiologicalMarker } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

function MarkerRow({ marker, t, language }: { marker: BiologicalMarker; t: any; language: string }) {
  const pct = Math.min(1, Math.max(0, (marker.value - 0) / Math.max(marker.normalMax * 1.5, 1)));
  const inRange = marker.value >= marker.normalMin && marker.value <= marker.normalMax;
  const isLow = marker.value < marker.normalMin;
  const isCritical = marker.value < marker.normalMin * 0.7 || marker.value > marker.normalMax * 1.3;

  const statusColor = isCritical ? Colors.danger : isLow ? Colors.warning : inRange ? Colors.success : Colors.warning;
  const statusLabel = isCritical ? t('critical') : isLow ? t('low') : inRange ? t('optimal') : t('high');

  // Marker position on bar
  const markerPct = Math.min(1, Math.max(0, (marker.value - 0) / (marker.normalMax * 1.5)));
  const normalMinPct = (marker.normalMin / (marker.normalMax * 1.5)) * 100;
  const normalMaxPct = (marker.normalMax / (marker.normalMax * 1.5)) * 100;

  const recs: Record<string, { fr: string; ar: string; en: string; source: string }> = {
    vitamin_d: {
      fr: 'Exposez-vous au soleil 15-20 min/jour. Supplémentez avec 2000-4000 UI/jour de Vit D3 + K2.',
      ar: 'تعرض للشمس 15-20 دقيقة يومياً. أضف مكمل فيتامين د3 2000-4000 وحدة يومياً مع ك2.',
      en: 'Expose to sunlight 15-20 min/day. Supplement with 2000-4000 IU/day Vit D3 + K2.',
      source: 'Holick MF et al. J Clin Endocrinol Metab 2011',
    },
    magnesium: {
      fr: 'Augmentez les graines de citrouille, légumes verts, amandes. Citrate de magnésium 300mg/soir.',
      ar: 'زد من بذور القرع والخضروات الورقية واللوز. سيترات المغنيسيوم 300مغ مساءً.',
      en: 'Increase pumpkin seeds, leafy greens, almonds. Magnesium citrate 300mg/evening.',
      source: 'Gröber U et al. Nutrients 2015',
    },
    testosterone: {
      fr: 'Optimisez le sommeil (7-9h), réduisez le stress (cortisol). Zinc + Vit D sont essentiels.',
      ar: 'حسّن النوم (7-9 ساعات)، قلل التوتر. الزنك وفيتامين د ضروريان.',
      en: 'Optimize sleep (7-9h), reduce stress (cortisol). Zinc + Vit D are essential.',
      source: 'Leproult R, Van Cauter E. JAMA 2011',
    },
    cortisol: {
      fr: 'Pratiquez la méditation (10 min/jour). Évitez la caféine après 14h. Ashwagandha peut aider.',
      ar: 'مارس التأمل 10 دقائق يومياً. تجنب الكافيين بعد الساعة 2 ظهراً. الأشواغاندا مفيدة.',
      en: 'Practice meditation (10 min/day). Avoid caffeine after 2pm. Ashwagandha may help.',
      source: 'Chandrasekhar K et al. IJAY 2012',
    },
  };

  const rec = recs[marker.id];
  const recText = rec ? (language === 'ar' ? rec.ar : language === 'fr' ? rec.fr : rec.en) : null;

  return (
    <View style={mStyles.card}>
      <View style={mStyles.top}>
        <View style={mStyles.nameWrap}>
          <Text style={mStyles.name}>{marker.name}</Text>
          <Text style={mStyles.date}>{marker.date}</Text>
        </View>
        <View style={[mStyles.badge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[mStyles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={mStyles.valueRow}>
        <Text style={[mStyles.value, { color: statusColor }]}>{marker.value}</Text>
        <Text style={mStyles.unit}> {marker.unit}</Text>
      </View>

      {/* Range Bar */}
      <View style={mStyles.barContainer}>
        <View style={mStyles.barBg}>
          {/* Normal range highlight */}
          <View style={[mStyles.normalZone, { left: `${normalMinPct}%`, width: `${normalMaxPct - normalMinPct}%` }]} />
          {/* Current value indicator */}
          <View style={[mStyles.valueIndicator, { left: `${markerPct * 100}%`, backgroundColor: statusColor }]} />
        </View>
        <View style={mStyles.rangeLabels}>
          <Text style={mStyles.rangeText}>{marker.normalMin}</Text>
          <Text style={mStyles.rangeCenter}>Normal: {marker.normalMin}–{marker.normalMax} {marker.unit}</Text>
          <Text style={mStyles.rangeText}>{marker.normalMax}</Text>
        </View>
      </View>

      {!inRange && recText && (
        <View style={mStyles.recBox}>
          <View style={mStyles.recHeader}>
            <MaterialIcons name="science" size={14} color={Colors.primary} />
            <Text style={mStyles.recLabel}>
              {language === 'ar' ? 'توصية علمية' : language === 'fr' ? 'Recommandation EBM' : 'EBM Recommendation'}
            </Text>
          </View>
          <Text style={mStyles.recText}>{recText}</Text>
          {rec && <Text style={mStyles.source}>📚 {rec.source}</Text>}
        </View>
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  nameWrap: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  date: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  badge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  value: { fontSize: 28, fontWeight: FontWeight.extrabold },
  unit: { fontSize: FontSize.sm, color: Colors.textSecondary },
  barContainer: { marginBottom: 8 },
  barBg: {
    height: 12, backgroundColor: Colors.surfaceBorder,
    borderRadius: 6, position: 'relative', overflow: 'hidden',
  },
  normalZone: {
    position: 'absolute', height: '100%',
    backgroundColor: Colors.success + '33',
  },
  valueIndicator: {
    position: 'absolute', width: 4, height: '100%',
    borderRadius: 2, marginLeft: -2,
  },
  rangeLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  rangeText: { fontSize: 10, color: Colors.textMuted },
  rangeCenter: { fontSize: 10, color: Colors.textMuted },
  recBox: {
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm,
    padding: Spacing.sm, marginTop: 8,
    borderWidth: 1, borderColor: Colors.primary + '33',
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  recLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  recText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  source: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
});

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { biomarkers, deficiencies, addBiomarker } = useHealth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'hormones' | 'vitamins' | 'metabolic'>('hormones');
  const [showInput, setShowInput] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(biomarkers[0]?.id || '');
  const [inputValue, setInputValue] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const tabs: Array<{ key: 'hormones' | 'vitamins' | 'metabolic'; label: string; icon: string }> = [
    { key: 'hormones', label: t('hormones'), icon: 'water-drop' },
    { key: 'vitamins', label: t('vitamins'), icon: 'eco' },
    { key: 'metabolic', label: t('metabolic'), icon: 'monitor-heart' },
  ];

  const filtered = biomarkers.filter(b => b.category === activeTab);

  const handleAnalyze = () => {
    if (!inputValue) return;
    setAnalyzing(true);
    const marker = biomarkers.find(b => b.id === selectedMarker);
    if (marker) {
      const val = parseFloat(inputValue);
      addBiomarker({ ...marker, value: val, date: new Date().toISOString().split('T')[0] });
      setTimeout(() => {
        const isLow = val < marker.normalMin;
        const isHigh = val > marker.normalMax;
        setAiResult(
          language === 'ar'
            ? `تحليل الذكاء الاصطناعي: قيمة ${marker.name} (${val} ${marker.unit}) ${isLow ? 'منخفضة' : isHigh ? 'مرتفعة' : 'ضمن المعدل الطبيعي'}. النطاق الطبيعي: ${marker.normalMin}-${marker.normalMax}.`
            : language === 'fr'
              ? `Analyse IA: Votre ${marker.name} (${val} ${marker.unit}) est ${isLow ? 'en dessous' : isHigh ? 'au-dessus' : 'dans'} de la plage normale (${marker.normalMin}-${marker.normalMax}). Plan nutritionnel adapté en conséquence.`
              : `AI Analysis: Your ${marker.name} (${val} ${marker.unit}) is ${isLow ? 'below' : isHigh ? 'above' : 'within'} the normal range (${marker.normalMin}-${marker.normalMax}). Meal plan updated accordingly.`
        );
        setAnalyzing(false);
        setShowInput(false);
        setInputValue('');
      }, 1800);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('blood_analysis')}</Text>
          <Text style={styles.headerSub}>
            {deficiencies.length > 0
              ? `${deficiencies.length} ${t('deficiencies_detected')}`
              : language === 'ar' ? 'جميع المؤشرات طبيعية' : language === 'fr' ? 'Tous les marqueurs normaux' : 'All markers normal'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowInput(!showInput)} activeOpacity={0.8}>
          <MaterialIcons name="add" size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Input Panel */}
      {showInput && (
        <View style={styles.inputPanel}>
          <Text style={styles.inputTitle}>{t('manual_entry')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.markerChips}>
            {biomarkers.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.markerChip, selectedMarker === m.id && styles.markerChipActive]}
                onPress={() => setSelectedMarker(m.id)}
              >
                <Text style={[styles.markerChipText, selectedMarker === m.id && styles.markerChipTextActive]}>
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={t('enter_value')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={analyzing}>
              <Text style={styles.analyzeBtnText}>{analyzing ? t('analyzing') : t('ai_interpretation')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Result */}
      {aiResult !== '' && (
        <View style={styles.aiResult}>
          <MaterialIcons name="psychology" size={16} color={Colors.primary} />
          <Text style={styles.aiResultText}>{aiResult}</Text>
        </View>
      )}

      {/* Category Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <MaterialIcons name={tab.icon as any} size={16} color={activeTab === tab.key ? Colors.textInverse : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filtered.map(marker => (
          <MarkerRow key={marker.id} marker={marker} t={t} language={language} />
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
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  inputPanel: {
    marginHorizontal: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  inputTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  markerChips: { gap: 8, paddingBottom: 12 },
  markerChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  markerChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  markerChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  markerChipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    paddingHorizontal: 14, paddingVertical: 10, color: Colors.textPrimary,
    fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  analyzeBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
  },
  analyzeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },

  aiResult: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '44',
  },
  aiResultText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  tabsRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    gap: 8, marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderRadius: Radius.sm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  tabTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  scroll: { paddingHorizontal: Spacing.md },
});
