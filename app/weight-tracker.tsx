// VitalCore AI — Daily Weight Tracker
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useHealth } from '@/hooks/useHealth';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { saveWeightEntry, loadWeightHistory } from '@/services/vitalCore';
import { useAlert } from '@/template';
import { addXP } from '@/services/gamification';

const { width } = Dimensions.get('window');

function MiniLineChart({ data, color, height = 80 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length < 2) return null;
  const chartWidth = width - 64;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * chartWidth,
    y: height - ((v - min) / range) * (height - 12) - 4,
  }));

  return (
    <View style={{ height, width: '100%', position: 'relative', marginTop: 8 }}>
      {points.slice(1).map((pt, i) => {
        const prev = points[i];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute', left: prev.x, top: prev.y,
            width: len, height: 2.5, backgroundColor: color, opacity: 0.8,
            borderRadius: 2, transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
            transformOrigin: '0 50%',
          }} />
        );
      })}
      {points.map((pt, i) => (
        <View key={i} style={{
          position: 'absolute', left: pt.x - 4, top: pt.y - 4,
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: i === points.length - 1 ? color : Colors.surface,
          borderWidth: 2, borderColor: color,
        }} />
      ))}
    </View>
  );
}

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

export default function WeightTrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { profile, updateProfile } = useHealth();
  const { showAlert } = useAlert();
  const isAr = language === 'ar';

  const [weightInput, setWeightInput] = useState(String(profile.weight));
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const currentWeight = history.length > 0 ? history[history.length - 1].weight : profile.weight;
  const firstWeight = history.length > 0 ? history[0].weight : profile.weight;
  const totalChange = currentWeight - firstWeight;
  const weeklyData = history.slice(-7).map(h => h.weight);
  const monthlyData = history.slice(-30).map(h => h.weight);

  const bmi = currentWeight / Math.pow(profile.height / 100, 2);
  const bmiColor = bmi < 18.5 ? Colors.warning : bmi > 25 ? Colors.danger : Colors.success;
  const bmiLabel = bmi < 18.5
    ? (isAr ? 'نقص الوزن' : 'Insuffisance pondérale')
    : bmi > 30 ? (isAr ? 'سمنة' : 'Obésité')
      : bmi > 25 ? (isAr ? 'زيادة الوزن' : 'Surpoids')
        : (isAr ? 'وزن طبيعي' : 'Poids normal');

  // Ideal weight (Devine formula)
  const idealWeightMin = profile.gender === 'male'
    ? 50 + 2.3 * ((profile.height - 152.4) / 2.54)
    : 45.5 + 2.3 * ((profile.height - 152.4) / 2.54);
  const idealWeightMax = idealWeightMin + 10;
  const toIdeal = currentWeight - (idealWeightMin + idealWeightMax) / 2;

  useEffect(() => {
    if (user) loadHistory();
    else setLoading(false);
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await loadWeightHistory(user.id, 90);
    if (data && data.length > 0) {
      setHistory(data.map((d: any) => ({ id: d.id, weight: Number(d.weight), date: d.date })));
    }
    setLoading(false);
  };

  const handleSave = useCallback(async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val < 20 || val > 300) {
      showAlert(isAr ? 'خطأ' : 'Erreur', isAr ? 'أدخل وزناً صحيحاً (20-300 كغ)' : 'Entrez un poids valide (20-300 kg)');
      return;
    }

    if (!user) {
      showAlert(isAr ? 'تسجيل الدخول مطلوب' : 'Connexion requise', '');
      router.push('/login');
      return;
    }

    setSaving(true);
    const error = await saveWeightEntry(user.id, val);
    if (error) {
      showAlert(isAr ? 'خطأ' : 'Erreur', error);
    } else {
      await updateProfile({ weight: val });
      await addXP(user.id, 'daily_login');
      await loadHistory();
      showAlert(
        isAr ? '✅ تم التسجيل' : '✅ Enregistré',
        isAr ? `الوزن: ${val} كغ` : `Poids: ${val} kg`
      );
    }
    setSaving(false);
  }, [weightInput, user, isAr]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-TN' : 'en-US', {
      month: 'short', day: 'numeric',
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{isAr ? 'متابعة الوزن' : 'Suivi du Poids'}</Text>
          <Text style={styles.headerSub}>{isAr ? 'سجّل وزنك يومياً' : 'Enregistrez votre poids quotidiennement'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Current Weight & Input */}
        <View style={styles.inputCard}>
          <Text style={styles.currentLabel}>{isAr ? 'الوزن الحالي' : 'Poids actuel'}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.adjBtn}
              onPress={() => setWeightInput(v => String(Math.max(20, parseFloat(v) - 0.5).toFixed(1)))}
            >
              <MaterialIcons name="remove" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.weightInput}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.unitLabel}>kg</Text>
            </View>
            <TouchableOpacity
              style={styles.adjBtn}
              onPress={() => setWeightInput(v => String((parseFloat(v) + 0.5).toFixed(1)))}
            >
              <MaterialIcons name="add" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.saveWeightBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <MaterialIcons name="save" size={18} color={Colors.textInverse} />
            }
            <Text style={styles.saveWeightText}>{isAr ? 'تسجيل الوزن' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            {
              label: isAr ? 'التغيير' : 'Variation',
              value: `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)} kg`,
              icon: totalChange < 0 ? 'trending-down' : 'trending-up',
              color: totalChange <= 0 ? Colors.success : Colors.warning,
            },
            {
              label: 'IMC',
              value: bmi.toFixed(1),
              icon: 'monitor-weight',
              color: bmiColor,
            },
            {
              label: isAr ? 'المثالي' : 'Idéal',
              value: `${toIdeal >= 0 ? '+' : ''}${toIdeal.toFixed(1)} kg`,
              icon: 'flag',
              color: Math.abs(toIdeal) < 3 ? Colors.success : Colors.warning,
            },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <MaterialIcons name={s.icon as any} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* BMI Card */}
        <View style={[styles.bmiCard, { borderColor: bmiColor + '44' }]}>
          <View style={styles.bmiHeader}>
            <MaterialIcons name="info-outline" size={16} color={bmiColor} />
            <Text style={[styles.bmiLabel, { color: bmiColor }]}>IMC: {bmi.toFixed(1)} — {bmiLabel}</Text>
          </View>
          <View style={styles.bmiBar}>
            {[
              { label: isAr ? 'نقص' : 'Maigreur', max: 18.5, color: '#60A5FA' },
              { label: isAr ? 'طبيعي' : 'Normal', max: 25, color: Colors.success },
              { label: isAr ? 'زيادة' : 'Surpoids', max: 30, color: Colors.warning },
              { label: isAr ? 'سمنة' : 'Obésité', max: 40, color: Colors.danger },
            ].map((zone, i) => (
              <View key={i} style={[styles.bmiZone, { backgroundColor: zone.color + '44', flex: 1 }]}>
                <Text style={[styles.bmiZoneText, { color: zone.color }]}>{zone.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.bmiScale}>
            {[18.5, 25, 30].map(v => (
              <Text key={v} style={styles.bmiScaleNum}>{v}</Text>
            ))}
          </View>
        </View>

        {/* Weekly Chart */}
        {weeklyData.length > 1 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{isAr ? '📉 تطور الوزن (7 أيام)' : '📉 Évolution du Poids (7 jours)'}</Text>
            <View style={styles.chartMeta}>
              <Text style={styles.chartMetaText}>{weeklyData[0].toFixed(1)} kg</Text>
              <Text style={[styles.chartMetaText, { color: weeklyData[weeklyData.length - 1] <= weeklyData[0] ? Colors.success : Colors.warning }]}>
                {weeklyData[weeklyData.length - 1].toFixed(1)} kg
              </Text>
            </View>
            <MiniLineChart data={weeklyData} color={Colors.primary} height={80} />
          </View>
        )}

        {/* Monthly Chart */}
        {monthlyData.length > 3 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{isAr ? '📈 تطور 30 يوماً' : '📈 Évolution 30 jours'}</Text>
            <View style={styles.chartMeta}>
              <Text style={styles.chartMetaText}>{monthlyData[0].toFixed(1)} kg</Text>
              <Text style={[styles.chartMetaText, { color: monthlyData[monthlyData.length - 1] <= monthlyData[0] ? Colors.success : Colors.warning }]}>
                {monthlyData[monthlyData.length - 1].toFixed(1)} kg
              </Text>
            </View>
            <MiniLineChart data={monthlyData} color={Colors.gold} height={80} />
          </View>
        )}

        {/* Goal Zone */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <MaterialIcons name="flag" size={18} color={Colors.gold} />
            <Text style={styles.goalTitle}>{isAr ? 'الوزن المثالي' : 'Poids Idéal (Formule Devine)'}</Text>
          </View>
          <Text style={styles.goalRange}>
            {idealWeightMin.toFixed(1)} — {idealWeightMax.toFixed(1)} kg
          </Text>
          <Text style={styles.goalDesc}>
            {isAr
              ? `بناءً على طولك ${profile.height} سم وجنسك. المدى الموصى به طبياً.`
              : `Basé sur votre taille ${profile.height} cm et votre sexe. Fourchette médicalement recommandée.`
            }
          </Text>
        </View>

        {/* History List */}
        {history.length > 0 && (
          <>
            <Text style={styles.historyTitle}>{isAr ? 'السجل الأخير' : 'Historique récent'}</Text>
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              history.slice().reverse().slice(0, 10).map((entry, i) => {
                const prev = history.slice().reverse()[i + 1];
                const diff = prev ? entry.weight - prev.weight : 0;
                return (
                  <View key={entry.id} style={styles.historyRow}>
                    <View style={[styles.historyDot, { backgroundColor: diff <= 0 ? Colors.success : Colors.warning }]} />
                    <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                    <Text style={styles.historyWeight}>{entry.weight.toFixed(1)} kg</Text>
                    {diff !== 0 && (
                      <Text style={[styles.historyDiff, { color: diff <= 0 ? Colors.success : Colors.warning }]}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {!user && (
          <TouchableOpacity style={styles.loginCTA} onPress={() => router.push('/login')} activeOpacity={0.85}>
            <MaterialIcons name="login" size={18} color={Colors.textInverse} />
            <Text style={styles.loginCTAText}>
              {isAr ? 'سجل الدخول لحفظ بيانات وزنك' : 'Connectez-vous pour sauvegarder votre historique'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backBtn: { padding: 4 },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  scroll: { paddingHorizontal: Spacing.md },

  inputCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: 'center',
  },
  currentLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: Spacing.md },
  adjBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  inputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  weightInput: {
    fontSize: 52, fontWeight: FontWeight.extrabold, color: Colors.primary,
    minWidth: 100, textAlign: 'center',
  },
  unitLabel: { fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  saveWeightBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  saveWeightText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  bmiCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1,
  },
  bmiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bmiLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  bmiBar: { flexDirection: 'row', borderRadius: Radius.sm, overflow: 'hidden', height: 28, marginBottom: 4 },
  bmiZone: { alignItems: 'center', justifyContent: 'center' },
  bmiZoneText: { fontSize: 9, fontWeight: FontWeight.bold },
  bmiScale: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: '25%' },
  bmiScaleNum: { fontSize: 10, color: Colors.textMuted },

  chartCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chartTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  chartMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  chartMetaText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold },

  goalCard: {
    backgroundColor: Colors.goldMuted, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '44',
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  goalTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  goalRange: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.gold, marginBottom: 4 },
  goalDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  historyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyDate: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  historyWeight: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  historyDiff: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, minWidth: 44, textAlign: 'right' },

  loginCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, marginVertical: Spacing.md,
  },
  loginCTAText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },
});
