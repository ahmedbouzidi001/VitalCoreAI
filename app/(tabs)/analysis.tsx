import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  TextInput, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useHealth, BiologicalMarker } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/contexts/AuthContext';
import { loadWeightHistory, loadHealthScoreHistory } from '@/services/vitalCore';

const { width } = Dimensions.get('window');

// Simple SVG-free line chart using React Native Views
function MiniLineChart({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (width - 80),
    y: height - ((v - min) / range) * (height - 8),
  }));

  return (
    <View style={{ height, width: '100%', position: 'relative', marginTop: 4 }}>
      {points.slice(1).map((pt, i) => {
        const prev = points[i];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y,
              width: len,
              height: 2,
              backgroundColor: color,
              opacity: 0.7,
              borderRadius: 1,
              transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
              transformOrigin: '0 50%',
            }}
          />
        );
      })}
      {points.map((pt, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: pt.x - 3,
            top: pt.y - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

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

      <View style={mStyles.barContainer}>
        <View style={mStyles.barBg}>
          <View style={[mStyles.normalZone, { left: `${normalStartPct}%` as any, width: `${normalRangePct}%` as any }]} />
          <View style={[mStyles.valueIndicator, { left: `${valueBarPct}%` as any, backgroundColor: statusColor }]} />
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
            <Text style={mStyles.recLabel}>{language === 'ar' ? 'توصية علمية' : 'Recommandation EBM'}</Text>
          </View>
          <Text style={mStyles.recText}>{recText}</Text>
          {rec && <Text style={mStyles.source}>📚 {rec.source}</Text>}
        </View>
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
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
  recBox: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: 8, borderWidth: 1, borderColor: Colors.primary + '33' },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  recLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  recText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  source: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
});

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { biomarkers, deficiencies, addBiomarker, runAIAnalysis, aiAnalysis, isAILoading, aiError, importPDFBiomarkers } = useHealth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'hormones' | 'vitamins' | 'metabolic'>('hormones');
  const [showInput, setShowInput] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState(biomarkers[0]?.id || '');
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState<any>(null);
  const [showEvolution, setShowEvolution] = useState(false);

  // Real data from Supabase
  const [weightHistory, setWeightHistory] = useState<number[]>([]);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    if (!user) return;
    setChartsLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([
        loadWeightHistory(user.id, 30),
        loadHealthScoreHistory(user.id, 14),
      ]);
      if (wRes.data && wRes.data.length > 0) {
        setWeightHistory(wRes.data.map((d: any) => d.weight));
      } else {
        setWeightHistory([]);
      }
      if (sRes.data && sRes.data.length > 0) {
        setScoreHistory(sRes.data.map((d: any) => d.score));
      } else {
        setScoreHistory([]);
      }
    } finally {
      setChartsLoading(false);
    }
  };

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
      setSaveSuccess(language === 'ar'
        ? `تم تحديث ${marker.name} إلى ${val} ${marker.unit}`
        : `${marker.name} mis à jour : ${val} ${marker.unit}`
      );
      setInputValue('');
      setShowInput(false);
      setTimeout(() => setSaveSuccess(''), 3000);
    }
    setSaving(false);
  };

  const handleImportPDF = async () => {
    try {
      setPdfLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        setPdfLoading(false);
        return;
      }

      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });

      // Call AI via context
      const analysis = await importPDFBiomarkers(base64, language);
      if (analysis) {
        setPdfResult(analysis);
      }
    } catch (e: any) {
      console.error('PDF import error:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const applyPDFMarkers = async () => {
    if (!pdfResult?.markers) return;
    for (const m of pdfResult.markers) {
      await addBiomarker({
        id: m.name.toLowerCase().replace(/\s+/g, '_'),
        name: m.name,
        nameAr: m.nameAr,
        category: m.category || 'metabolic',
        value: m.value,
        unit: m.unit,
        normalMin: m.normalMin,
        normalMax: m.normalMax,
        date: pdfResult.lab_date || new Date().toISOString().split('T')[0],
      });
    }
    setPdfResult(null);
    setSaveSuccess(language === 'ar' ? 'تم استيراد التحاليل بنجاح!' : 'Analyses importées avec succès !');
    setTimeout(() => setSaveSuccess(''), 3000);
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.pdfBtn} onPress={handleImportPDF} disabled={pdfLoading} activeOpacity={0.8}>
            {pdfLoading
              ? <ActivityIndicator size="small" color={Colors.gold} />
              : <MaterialIcons name="picture-as-pdf" size={18} color={Colors.gold} />
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowInput(!showInput)} activeOpacity={0.8}>
            <MaterialIcons name={showInput ? 'close' : 'add'} size={20} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Success msg */}
      {saveSuccess !== '' && (
        <View style={styles.successBanner}>
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.successText}>{saveSuccess}</Text>
        </View>
      )}

      {/* PDF Result Panel */}
      {pdfResult && (
        <View style={styles.pdfResultPanel}>
          <View style={styles.pdfResultHeader}>
            <MaterialIcons name="picture-as-pdf" size={16} color={Colors.gold} />
            <Text style={styles.pdfResultTitle}>
              {language === 'ar' ? 'نتائج PDF' : 'Résultats PDF'} — {pdfResult.markers?.length || 0} marqueurs détectés
            </Text>
          </View>
          {pdfResult.summary && <Text style={styles.pdfSummary}>{pdfResult.summary}</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
            {(pdfResult.markers || []).slice(0, 6).map((m: any, i: number) => (
              <View key={i} style={[styles.pdfMarkerChip, { borderColor: m.status === 'critical' ? Colors.danger : m.status === 'low' || m.status === 'high' ? Colors.warning : Colors.success }]}>
                <Text style={styles.pdfMarkerName}>{m.name}</Text>
                <Text style={[styles.pdfMarkerValue, { color: m.status === 'optimal' ? Colors.success : Colors.warning }]}>{m.value} {m.unit}</Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.applyPDFBtn} onPress={applyPDFMarkers} activeOpacity={0.8}>
            <MaterialIcons name="save" size={16} color={Colors.textInverse} />
            <Text style={styles.applyPDFText}>{language === 'ar' ? 'تطبيق النتائج' : 'Appliquer les résultats'}</Text>
          </TouchableOpacity>
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
              <MaterialIcons name="warning-amber" size={12} color={a.status === 'critical' ? Colors.danger : Colors.warning} />
              <Text style={styles.alertText}><Text style={styles.alertMarker}>{a.marker}</Text>: {a.recommendation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Evolution Charts */}
      <TouchableOpacity style={styles.evolutionToggle} onPress={() => setShowEvolution(p => !p)} activeOpacity={0.8}>
        <MaterialIcons name={showEvolution ? 'keyboard-arrow-up' : 'show-chart'} size={16} color={Colors.primary} />
        <Text style={styles.evolutionToggleText}>{showEvolution ? 'Masquer' : 'Graphiques d\'évolution'}</Text>
      </TouchableOpacity>

      {showEvolution && (
        <View style={styles.evolutionPanel}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📉 Évolution du Poids (30 jours)</Text>
            {weightHistory.length > 1 ? (
              <>
                <View style={styles.chartStats}>
                  <Text style={styles.chartStat}>Actuel: {weightHistory[weightHistory.length - 1].toFixed(1)} kg</Text>
                  <Text style={[styles.chartStat, { color: weightHistory[0] > weightHistory[weightHistory.length - 1] ? Colors.success : Colors.warning }]}>
                    {weightHistory[0] > weightHistory[weightHistory.length - 1] ? '↓' : '↑'}
                    {Math.abs(weightHistory[0] - weightHistory[weightHistory.length - 1]).toFixed(1)} kg
                  </Text>
                </View>
                <MiniLineChart data={weightHistory} color={Colors.primary} height={80} />
              </>
            ) : (
              <Text style={styles.chartEmpty}>Enregistrez votre poids dans le profil pour voir l'évolution</Text>
            )}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>💚 Score de Santé (14 jours)</Text>
            {scoreHistory.length > 1 ? (
              <>
                <View style={styles.chartStats}>
                  <Text style={styles.chartStat}>Actuel: {scoreHistory[scoreHistory.length - 1]}/100</Text>
                  <Text style={[styles.chartStat, { color: Colors.success }]}>
                    {scoreHistory[scoreHistory.length - 1] >= scoreHistory[0] ? '+' : ''}{scoreHistory[scoreHistory.length - 1] - scoreHistory[0]} pts
                  </Text>
                </View>
                <MiniLineChart data={scoreHistory} color={Colors.success} height={60} />
              </>
            ) : (
              <Text style={styles.chartEmpty}>Lancez des analyses IA pour historiser votre score santé</Text>
            )}
          </View>

          {/* Biomarker trend */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🔬 Tendance Biomarqueurs</Text>
            <View style={styles.bioTrendRow}>
              {deficiencies.slice(0, 3).map(d => (
                <View key={d.id} style={styles.bioTrendItem}>
                  <Text style={styles.bioTrendName}>{d.name.split(' ')[0]}</Text>
                  <Text style={[styles.bioTrendVal, { color: Colors.warning }]}>{d.value} {d.unit}</Text>
                  <Text style={styles.bioTrendNorm}>Norme: {d.normalMin}</Text>
                </View>
              ))}
              {biomarkers.filter(b => b.value >= b.normalMin && b.value <= b.normalMax).slice(0, 2).map(b => (
                <View key={b.id} style={styles.bioTrendItem}>
                  <Text style={styles.bioTrendName}>{b.name.split(' ')[0]}</Text>
                  <Text style={[styles.bioTrendVal, { color: Colors.success }]}>{b.value} {b.unit}</Text>
                  <Text style={styles.bioTrendNorm}>✓ Optimal</Text>
                </View>
              ))}
            </View>
          </View>
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
                <Text style={[styles.markerChipText, selectedMarkerId === m.id && styles.markerChipTextActive]}>{m.name}</Text>
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
              {saving ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Analyze + EBM */}
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
          <Text style={styles.aiAnalyzeBtnText}>{isAILoading ? 'Analyse IA...' : 'Analyse IA complète'}</Text>
        </TouchableOpacity>
        <View style={styles.pdfActionBtn}>
          <TouchableOpacity onPress={handleImportPDF} disabled={pdfLoading} activeOpacity={0.8}>
            {pdfLoading
              ? <ActivityIndicator size="small" color={Colors.gold} />
              : <MaterialIcons name="upload-file" size={20} color={Colors.gold} />
            }
          </TouchableOpacity>
          <Text style={styles.pdfActionText}>PDF</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  pdfBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.goldMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.gold + '44' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: 10 },
  successText: { fontSize: FontSize.sm, color: Colors.success },

  pdfResultPanel: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.goldMuted, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '44' },
  pdfResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pdfResultTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.gold },
  pdfSummary: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 8, lineHeight: 16 },
  pdfMarkerChip: { backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  pdfMarkerName: { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  pdfMarkerValue: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  applyPDFBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.gold, borderRadius: Radius.md, paddingVertical: 10, marginTop: 8 },
  applyPDFText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },

  aiResultPanel: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '44' },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiResultTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary, flex: 1 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  alertText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  alertMarker: { fontWeight: FontWeight.semibold, color: Colors.textPrimary },

  evolutionToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.primary + '33' },
  evolutionToggleText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },

  evolutionPanel: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm },
  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden' },
  chartTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8 },
  chartStats: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  chartStat: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  chartEmpty: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  bioTrendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  bioTrendItem: { alignItems: 'center', minWidth: 70 },
  bioTrendName: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.semibold },
  bioTrendVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  bioTrendNorm: { fontSize: 9, color: Colors.textMuted },

  inputPanel: { marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  inputTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  markerChips: { gap: 8, paddingBottom: 12 },
  markerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  markerChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  markerChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  markerChipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 10, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  saveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },

  aiActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  aiAnalyzeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12 },
  aiAnalyzeBtnLoading: { backgroundColor: Colors.textMuted },
  aiAnalyzeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
  pdfActionBtn: { alignItems: 'center', gap: 2, backgroundColor: Colors.goldMuted, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.gold + '44' },
  pdfActionText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.gold },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: 10 },
  errorText: { flex: 1, fontSize: FontSize.xs, color: Colors.danger },

  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, marginBottom: Spacing.md },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  tabTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },
  scroll: { paddingHorizontal: Spacing.md },
});
