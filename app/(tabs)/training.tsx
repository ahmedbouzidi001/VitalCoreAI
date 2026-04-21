import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useHealth, WorkoutSession } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

const TYPE_CONFIG: Record<string, { color: string; icon: string; gradient: string }> = {
  hypertrophy: { color: Colors.primary, icon: 'fitness-center', gradient: Colors.primaryMuted },
  strength: { color: Colors.gold, icon: 'bolt', gradient: Colors.goldMuted },
  endurance: { color: Colors.success, icon: 'directions-run', gradient: Colors.successMuted },
  longevity: { color: Colors.purple, icon: 'self-improvement', gradient: Colors.purpleMuted },
  recovery: { color: Colors.textSecondary, icon: 'spa', gradient: 'rgba(138,155,193,0.12)' },
};

const INTENSITY_CONFIG: Record<string, { color: string; label: string }> = {
  high: { color: Colors.danger, label: '🔥 Élevé' },
  medium: { color: Colors.warning, label: '⚡ Moyen' },
  low: { color: Colors.success, label: '✓ Léger' },
};

function WorkoutTimer({ isRunning, onStop }: { isRunning: boolean; onStop: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
      setSeconds(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={timerStyles.container}>
      <MaterialIcons name="timer" size={18} color={Colors.gold} />
      <Text style={timerStyles.time}>{mm}:{ss}</Text>
      <TouchableOpacity style={timerStyles.stopBtn} onPress={onStop} activeOpacity={0.8}>
        <MaterialIcons name="stop" size={14} color={Colors.textInverse} />
        <Text style={timerStyles.stopText}>Terminer</Text>
      </TouchableOpacity>
    </View>
  );
}
const timerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.goldMuted, borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.gold + '55',
  },
  time: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.gold, flex: 1 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.danger, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6,
  },
  stopText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textInverse },
});

export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const { weeklyWorkout, regenerateWorkout, profile, isWorkoutLoading } = useHealth();
  const { t, language } = useLanguage();
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeType, setActiveType] = useState<WorkoutSession['type']>('hypertrophy');
  const [workoutRunning, setWorkoutRunning] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const session = weeklyWorkout[selectedDay];
  const dayLabels = t('days').split(',');
  const cfg = session ? TYPE_CONFIG[session.type] || TYPE_CONFIG.recovery : TYPE_CONFIG.recovery;

  const typeFilters: Array<{ key: WorkoutSession['type']; label: string }> = [
    { key: 'hypertrophy', label: language === 'ar' ? 'تضخيم' : 'Hypertrophie' },
    { key: 'strength', label: language === 'ar' ? 'قوة' : 'Force' },
    { key: 'endurance', label: language === 'ar' ? 'تحمل' : 'Endurance' },
    { key: 'longevity', label: language === 'ar' ? 'طول عمر' : 'Longévité' },
  ];

  const getExerciseName = (ex: any) => {
    if (language === 'ar' && ex.nameAr) return ex.nameAr;
    return ex.name;
  };

  const scienceTip = session
    ? (language === 'ar' && session.scienceTipAr ? session.scienceTipAr : session.scienceTip)
    : '';

  const totalVolume = session?.exercises.reduce((sum, e) => sum + (e.sets * (parseInt(e.reps) || 8)), 0) || 0;
  const completionPct = session?.exercises.length
    ? (completedExercises.size / session.exercises.length) * 100
    : 0;

  const toggleExercise = (id: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('training_plan')}</Text>
        <View style={styles.volumeChip}>
          <MaterialIcons name="trending-up" size={14} color={Colors.gold} />
          <Text style={styles.volumeText}>{totalVolume} reps</Text>
        </View>
      </View>

      {/* Type Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilters}>
        {typeFilters.map(tf => {
          const tc = TYPE_CONFIG[tf.key];
          return (
            <TouchableOpacity
              key={tf.key}
              style={[styles.typeChip, activeType === tf.key && { backgroundColor: tc.color, borderColor: tc.color }]}
              onPress={() => {
                setActiveType(tf.key);
                regenerateWorkout(tf.key);
              }}
              activeOpacity={0.8}
              disabled={isWorkoutLoading}
            >
              {isWorkoutLoading && activeType === tf.key
                ? <ActivityIndicator size="small" color={Colors.textInverse} />
                : <MaterialIcons name={tc.icon as any} size={14} color={activeType === tf.key ? Colors.textInverse : Colors.textMuted} />
              }
              <Text style={[styles.typeChipText, activeType === tf.key && styles.typeChipTextActive]}>{tf.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isWorkoutLoading && (
        <View style={styles.aiLoadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.aiLoadingText}>L'IA génère votre plan d'entraînement personnalisé...</Text>
        </View>
      )}

      {/* Day Selector */}
      <View style={styles.dayBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarInner}>
          {weeklyWorkout.map((s, i) => {
            const sc = TYPE_CONFIG[s.type] || TYPE_CONFIG.recovery;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayChip, selectedDay === i && { backgroundColor: sc.color, borderColor: sc.color }]}
                onPress={() => { setSelectedDay(i); setCompletedExercises(new Set()); }}
              >
                <Text style={[styles.dayChipDay, selectedDay === i && styles.dayChipDayActive]}>
                  {dayLabels[i]}
                </Text>
                <MaterialIcons name={sc.icon as any} size={12} color={selectedDay === i ? Colors.textInverse : Colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {session && (
          <>
            {/* Session Header */}
            <View style={[styles.sessionCard, { backgroundColor: cfg.gradient, borderColor: cfg.color + '44' }]}>
              <View style={styles.sessionTop}>
                <View style={[styles.sessionIcon, { backgroundColor: cfg.color + '33' }]}>
                  <MaterialIcons name={cfg.icon as any} size={28} color={cfg.color} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={[styles.sessionType, { color: cfg.color }]}>{session.type.toUpperCase()}</Text>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <View style={styles.sessionMeta}>
                    <View style={styles.sessionMetaItem}>
                      <MaterialIcons name="schedule" size={14} color={Colors.textMuted} />
                      <Text style={styles.sessionMetaText}>{session.duration} min</Text>
                    </View>
                    <View style={styles.sessionMetaItem}>
                      <MaterialIcons name="repeat" size={14} color={Colors.textMuted} />
                      <Text style={styles.sessionMetaText}>{session.exercises.length} exercices</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Progress bar */}
              {session.exercises.length > 0 && (
                <View style={styles.progressWrap}>
                  <Text style={styles.progressLabel}>{completedExercises.size}/{session.exercises.length} exercices complétés</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${completionPct}%`, backgroundColor: cfg.color }]} />
                  </View>
                </View>
              )}

              {/* Timer */}
              {workoutRunning && (
                <WorkoutTimer isRunning={workoutRunning} onStop={() => { setWorkoutRunning(false); setCompletedExercises(new Set()); }} />
              )}

              {/* Science Tip */}
              <View style={styles.scienceBox}>
                <View style={styles.scienceHeader}>
                  <MaterialIcons name="science" size={14} color={cfg.color} />
                  <Text style={[styles.scienceLabel, { color: cfg.color }]}>{t('science_tip')}</Text>
                </View>
                <Text style={styles.scienceTip}>{scienceTip}</Text>
              </View>

              {!workoutRunning && (
                <TouchableOpacity
                  style={[styles.startBtn, { backgroundColor: cfg.color }]}
                  onPress={() => { setWorkoutRunning(true); setCompletedExercises(new Set()); }}
                  activeOpacity={0.9}
                >
                  <MaterialIcons name="play-arrow" size={20} color={Colors.textInverse} />
                  <Text style={styles.startBtnText}>{t('start_workout')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Exercises */}
            {session.exercises.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Exercices</Text>
                {session.exercises.map((ex, i) => {
                  const ic = INTENSITY_CONFIG[ex.intensity] || INTENSITY_CONFIG.low;
                  const done = completedExercises.has(ex.id);
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={[styles.exCard, done && styles.exCardDone]}
                      onPress={() => toggleExercise(ex.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.exNumber, done && { backgroundColor: Colors.success }]}>
                        {done
                          ? <MaterialIcons name="check" size={16} color={Colors.textInverse} />
                          : <Text style={styles.exNumberText}>{i + 1}</Text>
                        }
                      </View>
                      <View style={styles.exInfo}>
                        <Text style={[styles.exName, done && styles.exNameDone]}>{getExerciseName(ex)}</Text>
                        <Text style={styles.exMuscle}>{ex.muscleGroup}</Text>
                        {ex.technique && (
                          <Text style={styles.exTechnique}>{ex.technique}</Text>
                        )}
                        <View style={styles.exStats}>
                          <View style={styles.exStat}>
                            <Text style={styles.exStatLabel}>{t('sets')}</Text>
                            <Text style={styles.exStatValue}>{ex.sets}</Text>
                          </View>
                          <View style={styles.exStat}>
                            <Text style={styles.exStatLabel}>{t('reps')}</Text>
                            <Text style={styles.exStatValue}>{ex.reps}</Text>
                          </View>
                          {ex.rest > 0 && (
                            <View style={styles.exStat}>
                              <Text style={styles.exStatLabel}>{t('rest')}</Text>
                              <Text style={styles.exStatValue}>{ex.rest}s</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={[styles.intensityBadge, { backgroundColor: ic.color + '22' }]}>
                        <Text style={[styles.intensityText, { color: ic.color }]}>{ic.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={styles.restDay}>
                <Text style={styles.restIcon}>😴</Text>
                <Text style={styles.restTitle}>Jour de Repos</Text>
                <Text style={styles.restSub}>{scienceTip}</Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  volumeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.goldMuted, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  volumeText: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.semibold },
  typeFilters: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  typeChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  typeChipTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },
  aiLoadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12 },
  aiLoadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },
  dayBar: { marginBottom: Spacing.md },
  dayBarInner: { paddingHorizontal: Spacing.md, gap: 8 },
  dayChip: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  dayChipDay: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayChipDayActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },
  scroll: { paddingHorizontal: Spacing.md },
  sessionCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1 },
  sessionTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  sessionIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1 },
  sessionType: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1.5 },
  sessionName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginVertical: 4 },
  sessionMeta: { flexDirection: 'row', gap: 16 },
  sessionMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  progressWrap: { marginBottom: 12 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 6 },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  scienceBox: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
  scienceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  scienceLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  scienceTip: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, paddingVertical: 14 },
  startBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  exCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  exCardDone: { borderColor: Colors.success + '66', backgroundColor: Colors.successMuted },
  exNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  exNumberText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  exInfo: { flex: 1 },
  exName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  exNameDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  exMuscle: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  exTechnique: { fontSize: 10, color: Colors.primary, fontStyle: 'italic', marginBottom: 4, lineHeight: 14 },
  exStats: { flexDirection: 'row', gap: 12 },
  exStat: { alignItems: 'center' },
  exStatLabel: { fontSize: 9, color: Colors.textMuted },
  exStatValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  intensityBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  intensityText: { fontSize: 10, fontWeight: FontWeight.semibold },
  restDay: { alignItems: 'center', paddingVertical: 48 },
  restIcon: { fontSize: 48, marginBottom: 16 },
  restTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  restSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },
});
