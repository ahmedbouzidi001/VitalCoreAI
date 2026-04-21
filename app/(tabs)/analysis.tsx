import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useHealth, BiologicalMarker } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

function MarkerRow({ marker, t, language }: { marker: BiologicalMarker; t: any; language: string }) {
  const inRange = marker.value >= marker.normalMin && marker.value <= marker.normalMax;
  const isLow = marker.value < marker.normalMin;
  const isCritical = marker.value < marker.normalMin * 0.7 || marker.value > marker.normalMax * 1.3;
  const statusColor = isCritical ? Colors.danger : isLow ? Colors.warning : inRange ? Colors.success : Colors.warning;
  const statusLabel = isCritical ? t('critical') : isLow ? t('low') : inRange ? t('optimal') : t('high');

  const normalRangePct = ((marker.normalMax - marker.normalMin) / (marker.normalMax * 1.6)) * 100;
  const normalStartPct = (marker.normalMin / (marker.normalMax * 1.6)) * 100;
  const valueBarPct = Math.min(100, Math.max(0, (marker.value / (marker.normalMax * 1.6)) * 100));

  const recs: Record<string, { fr: string; ar: string; en: string; source: string }> = {
    vitamin_d: {
      fr: 'Exposez-vous au soleil 15-20 min/jour. Supplémentez avec 2000-4000 UI/jour de Vit D3+K2.',
      ar: 'تعرض للشمس 15-20 دقيقة يومياً. أضف مكمل فيتامين د3 2000-4000 وحدة يومياً مع ك2.',
      en: 'Sun exposure 15-20 min/day. Supplement with 2000-4000 IU/day Vit D3+K2.',
      source: 'Holick MF et al. J Clin Endocrinol Metab 2011',
    },
    magnesium: {
      fr: 'Augmentez graines de citrouille, légumes verts, amandes. Citrate de magnésium 300mg/soir.',
      ar: 'زد من بذور القرع والخضروات الورقية واللوز. سيترات المغنيسيوم 300مغ مساءً.',
      en: 'Increase pumpkin seeds, leafy greens, almonds. Magnesium citrate 300mg/evening.',
      source: 'Gröber U et al. Nutrients 2015',
    },
    testosterone: {
      fr: 'Optimisez le sommeil (7-9h), réduisez stress. Zinc + Vit D essentiels pour la synthèse.',
      ar: 'حسّن النوم 7-9 ساعات وقلل التوتر. الزنك وفيتامين د ضروريان.',
      en: 'Optimize sleep (7-9h), reduce stress. Zinc + Vit D essential for synthesis.',
      source: 'Leproult R, Van Cauter E. JAMA 2011',
    },
    cortisol: {
      fr: 'Méditation 10 min/jour. Évitez la caféine après 14h. Ashwagandha KSM-66 peut aider.',
      ar: 'تأمل 10 دقائق يومياً. تجنب الكافيين بعد 2 ظهراً. الأشواغاندا مفيدة.',
      en: 'Meditation 10 min/day. Avoid caffeine after 2pm. Ashwagandha KSM-66 may help.',
      source: 'Chandrasekhar K et al. IJAY 2012',
    },
    vitamin_b12: {
      fr: 'Consommez viandes rouges, poissons, œufs. En cas de déficit sévère: méthylcobalamine 1mg/j.',
      ar: 'تناول اللحوم الحمراء والأسماك والبيض. عند النقص الشديد: ميثيلكوبالامين 1مغ يومياً.',
      en: 'Eat red meat, fish, eggs. For severe deficit: methylcobalamin 1mg/day.',
      source: 'Stabler SP. NEJM 2013',
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

      {/* Range bar */}
      <View style={mStyles.barContainer}>
        <View style={mStyles.barBg}>
          <View style={[mStyles.normalZone, { left: `${normalStartPct}%`, width: `${normalRangePct}%` }]} />
          <View style={[mStyles.valueIndicator, { left: `${valueBarPct}%`, backgroundColor: statusColor }]} />
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
              {language === 'ar' ? 'توصية علمية' : 'Recommandation EBM'}
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
  value: { fontSize: 32, fontWeight: FontWeight.extrabold },
  unit: { fontSize: FontSize.sm, color: Colors.textSecondary },
  barContainer: { marginBottom: 8 },
  barBg: { height: 12, backgroundColor: Colors.surfaceBorder, borderRadius: 6, position: 'relative', overflow: 'hidden' },
  normalZone: { position: 'absolute', height: '100%', backgroundColor: Colors.success + '33' },
  valueIndicator: { position: 'absolute', width: 4, height: '100%', borderRadius: 2, marginLeft: -2 },
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
  const { biomarkers, deficiencies, addBiomarker, runAIAnalysis, aiAnalysis, isAILoading, aiError } = useHealth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'hormones' | 'vitamins' | 'metabolic'>('hormones');
  const [showInput, setShowInput] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState(biomarkers[0]?.id || '');
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const tabs: Array<{ key: 'hormones' | 'vitamins' | 'metabolic'; label: string; icon: string }> = [
    { key: 'hormones', label: t('hormones'), icon: 'water-drop' },
    { key: 'vitamins', label: t('vitamins'), icon: 'eco' },
    { key: 'metabolic', label: t('metabolic'), icon: 'monitor-heart' },
  ];

  const filtered = biomarkers.filter(b => b.category === activeTab);

  const handleSave = async () => {
    if (!inputValue) return;
    setSaving(true);
    const marker = biomarkers.find(b => b.id === selectedMarkerId);
    if (marker) {
      const val = parseFloat(inputValue);
      await addBiomarker({ ...marker, value: val, date: new Date().toISOString().split('T')[0] });
      setSaveSuccess(
        language === 'ar'
          ? `تم تحديث ${marker.name} إلى ${val} ${marker.unit}`
          : `${marker.name} mis à jour : ${val} ${marker.unit}`
      );
      setInputValue('');
      setShowInput(false);
      setTimeout(() => setSaveSuccess(''), 3000);
    }
    setSaving(false);
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
              ? `${deficiencies.length} carence(s) — Analyse IA recommandée`
              : 'Tous les marqueurs dans la norme'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowInput(!showInput)} activeOpacity={0.8}>
          <MaterialIcons name={showInput ? 'close' : 'add'} size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Success msg */}
      {saveSuccess !== '' && (
        <View style={styles.successBanner}>
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.successText}>{saveSuccess}</Text>
        </View>
      )}

      {/* AI Result panel */}
      {aiAnalysis && (
        <View style={styles.aiResultPanel}>
          <View style={styles.aiResultHeader}>
            <MaterialIcons name="psychology" size={16} color={Colors.primary} />
            <Text style={styles.aiResultTitle}>Analyse IA • Score Vitalité : {aiAnalysis.vitality_score}/100</Text>
          </View>
          {aiAnalysis.alerts?.slice(0, 2).map((a, i) => (
            <View key={i} style={styles.alertRow}>
              <MaterialIcons
                name="warning-amber" size={12}
                color={a.status === 'critical' ? Colors.danger : Colors.warning}
              />
              <Text style={styles.alertText}><Text style={styles.alertMarker}>{a.marker}</Text>: {a.recommendation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Input Panel */}
      {showInput && (
        <View style={styles.inputPanel}>
          <Text style={styles.inputTitle}>Saisir un résultat de laboratoire</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.markerChips}>
            {biomarkers.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.markerChip, selectedMarkerId === m.id && styles.markerChipActive]}
                onPress={() => setSelectedMarkerId(m.id)}
              >
                <Text style={[styles.markerChipText, selectedMarkerId === m.id && styles.markerChipTextActive]}>
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
              placeholder={`Valeur (${biomarkers.find(b => b.id === selectedMarkerId)?.unit || ''})`}
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.textInverse} />
                : <Text style={styles.saveBtnText}>Enregistrer</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Analyze Button */}
      <View style={styles.aiActionRow}>
        <TouchableOpacity
          style={[styles.aiAnalyzeBtn, isAILoading && styles.aiAnalyzeBtnLoading]}
          onPress={runAIAnalysis}
          disabled={isAILoading}
          activeOpacity={0.85}
        >
          {isAILoading
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <MaterialIcons name="auto-awesome" size={16} color={Colors.textInverse} />
          }
          <Text style={styles.aiAnalyzeBtnText}>
            {isAILoading ? 'Analyse IA...' : 'Analyse IA complète'}
          </Text>
        </TouchableOpacity>
        <View style={styles.ebmBadge}>
          <Text style={styles.ebmBadgeText}>EBM</Text>
        </View>
      </View>

      {aiError && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={14} color={Colors.danger} />
          <Text style={styles.errorText}>{aiError}</Text>
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
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.successMuted, borderRadius: Radius.md,
    padding: 10, borderWidth: 1, borderColor: Colors.success + '44',
  },
  successText: { fontSize: FontSize.sm, color: Colors.success },

  aiResultPanel: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '44',
  },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiResultTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary, flex: 1 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  alertText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  alertMarker: { fontWeight: FontWeight.semibold, color: Colors.textPrimary },

  inputPanel: {
    marginHorizontal: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
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
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', minWidth: 100,
  },
  saveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },

  aiActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  aiAnalyzeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12,
  },
  aiAnalyzeBtnLoading: { backgroundColor: Colors.textMuted },
  aiAnalyzeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
  ebmBadge: {
    backgroundColor: Colors.goldMuted, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: Colors.gold + '44',
  },
  ebmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.gold },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.dangerMuted, borderRadius: Radius.md,
    padding: 10,
  },
  errorText: { flex: 1, fontSize: FontSize.xs, color: Colors.danger },

  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, marginBottom: Spacing.md },
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
