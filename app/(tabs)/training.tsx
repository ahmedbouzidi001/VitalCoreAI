// Advanced Workout Timer Screen
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, Vibration, Platform, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useHealth, WorkoutSession } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { addXP } from '@/services/gamification';
import { useRouter } from 'expo-router';

const TYPE_CONFIG: Record<string, { color: string; icon: string; gradient: string }> = {
  hypertrophy: { color: Colors.primary, icon: 'fitness-center', gradient: Colors.primaryMuted },
  strength: { color: Colors.gold, icon: 'bolt', gradient: Colors.goldMuted },
  endurance: { color: Colors.success, icon: 'directions-run', gradient: Colors.successMuted },
  longevity: { color: Colors.purple, icon: 'self-improvement', gradient: Colors.purpleMuted },
  recovery: { color: Colors.textSecondary, icon: 'spa', gradient: 'rgba(138,155,193,0.12)' },
};

const SPLIT_TYPES = [
  { key: 'upper_lower', label: 'Upper/Lower', icon: 'swap-vert' },
  { key: 'ppl', label: 'PPL', icon: 'repeat' },
  { key: 'arnold', label: 'Arnold', icon: 'star' },
  { key: 'anterior_posterior', label: 'Ant/Post', icon: 'compare-arrows' },
  { key: 'full_body', label: 'Full Body', icon: 'accessibility-new' },
  { key: 'bro_split', label: 'Bro Split', icon: 'sports-gymnastics' },
] as const;

const WORKOUT_TYPES: Array<{ key: WorkoutSession['type']; label: string; labelFr: string }> = [
  { key: 'hypertrophy', label: 'Hypertrophie', labelFr: 'Hypertrophie' },
  { key: 'strength', label: 'Force', labelFr: 'Force' },
  { key: 'endurance', label: 'Endurance', labelFr: 'Endurance' },
  { key: 'longevity', label: 'Longévité', labelFr: 'Longévité' },
];

// ---- Weight Input Modal ----
function WeightInputModal({
  visible, exerciseName, setNum, previousWeight, onConfirm, onSkip, color, isAr,
}: {
  visible: boolean; exerciseName: string; setNum: number; previousWeight: number | null;
  onConfirm: (weight: number, reps: number) => void; onSkip: () => void; color: string; isAr: boolean;
}) {
  const [weight, setWeight] = useState(previousWeight ? String(previousWeight) : '');
  const [reps, setReps] = useState('10');

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    const next = Math.max(0, current + delta);
    setWeight(String(Number.isInteger(next) ? next : next.toFixed(1)));
  };
  const adjustReps = (delta: number) => {
    const current = parseInt(reps) || 10;
    setReps(String(Math.max(1, current + delta)));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: 48, borderTopWidth: 2, borderTopColor: color }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: Spacing.md }} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2, textAlign: 'center' }}>
            {exerciseName}
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: color, marginBottom: Spacing.lg, textAlign: 'center', fontWeight: FontWeight.semibold }}>
            {isAr ? `الجلسة ${setNum}` : `Série ${setNum}`}{previousWeight ? ` · ${isAr ? 'السابق' : 'Précédent'}: ${previousWeight} kg` : ''}
          </Text>

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: Spacing.lg }}>
            {/* Weight adjuster */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold, letterSpacing: 1 }}>{isAr ? 'الوزن (كغ)' : 'POIDS (kg)'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => adjustWeight(-2.5)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder }}
                >
                  <Text style={{ fontSize: 20, color: Colors.textPrimary, fontWeight: FontWeight.bold }}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={{ backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, color: color, fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center', borderWidth: 2, borderColor: color + '66', minWidth: 80 }}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  selectTextOnFocus
                />
                <TouchableOpacity
                  onPress={() => adjustWeight(2.5)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder }}
                >
                  <Text style={{ fontSize: 20, color: Colors.textPrimary, fontWeight: FontWeight.bold }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reps adjuster */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold, letterSpacing: 1 }}>{isAr ? 'التكرارات' : 'RÉPÉTITIONS'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => adjustReps(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder }}
                >
                  <Text style={{ fontSize: 20, color: Colors.textPrimary, fontWeight: FontWeight.bold }}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={{ backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center', borderWidth: 2, borderColor: Colors.surfaceBorder, minWidth: 64 }}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  onPress={() => adjustReps(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder }}
                >
                  <Text style={{ fontSize: 20, color: Colors.textPrimary, fontWeight: FontWeight.bold }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Confirm — large prominent button */}
          <TouchableOpacity
            style={{ backgroundColor: color, borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexDirection: 'row', gap: 10, shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
            onPress={() => {
              const w = parseFloat(weight) || 0;
              const r = parseInt(reps) || 10;
              onConfirm(w, r);
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check-circle" size={24} color={Colors.textInverse} />
            <Text style={{ fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textInverse }}>
              {isAr ? 'تأكيد الجلسة' : 'Confirmer la série'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSkip}
            style={{ alignItems: 'center', paddingVertical: 14 }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 32, right: 32 }}
          >
            <Text style={{ fontSize: FontSize.sm, color: Colors.textMuted }}>{isAr ? 'تخطي بدون وزن' : 'Passer sans peser'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---- Advanced Timer Component ----
function AdvancedTimer({
  exercises,
  currentExerciseIdx,
  onExerciseComplete,
  onFinish,
  onSetComplete,
  color,
  workoutId,
  userId,
  isAr,
}: {
  exercises: any[];
  currentExerciseIdx: number;
  onExerciseComplete: (idx: number) => void;
  onFinish: (totalTime: number, logs: any[]) => void;
  onSetComplete: (exerciseIdx: number, setIdx: number) => void;
  color: string;
  workoutId: string;
  userId: string | null;
  isAr: boolean;
}) {
  const [phase, setPhase] = useState<'work' | 'rest' | 'done'>('work');
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [allSetLogs, setAllSetLogs] = useState<any[]>([]);
  const [previousWeights, setPreviousWeights] = useState<Record<string, number | null>>({});
  const totalInterval = useRef<any>(null);
  const restInterval = useRef<any>(null);

  const exercise = exercises[currentExerciseIdx];
  const totalSets = exercise?.sets || 3;
  const restTime = exercise?.rest || 90;

  // Total elapsed timer
  useEffect(() => {
    totalInterval.current = setInterval(() => setTotalSeconds(s => s + 1), 1000);
    return () => clearInterval(totalInterval.current);
  }, []);

  // Rest countdown
  useEffect(() => {
    if (phase === 'rest') {
      setRestSeconds(restTime);
      restInterval.current = setInterval(() => {
        setRestSeconds(prev => {
          if (prev <= 1) {
            clearInterval(restInterval.current);
            Vibration.vibrate(Platform.OS === 'android' ? [0, 500, 100, 500] : 500);
            setPhase('work');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(restInterval.current);
    }
  }, [phase, restTime]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleSetDone = useCallback(() => {
    // Show weight input modal before logging the set
    setShowWeightModal(true);
  }, []);

  const handleWeightConfirm = async (weight: number, reps: number) => {
    setShowWeightModal(false);
    const log = {
      workout_id: workoutId,
      exercise_id: exercise?.id || 'unknown',
      exercise_name: exercise?.name || '',
      set_number: currentSet,
      reps,
      weight_kg: weight,
      date: new Date().toISOString().split('T')[0],
    };
    const newLogs = [...allSetLogs, log];
    setAllSetLogs(newLogs);
    if (userId) {
      supabase.from('workout_logs').insert({ user_id: userId, ...log }).catch(console.error);
      addXP(userId, 'complete_workout').catch(console.error);
    }
    // Track previous weight for this exercise
    setPreviousWeights(prev => ({ ...prev, [exercise?.id]: weight }));

    onSetComplete(currentExerciseIdx, currentSet);
    Vibration.vibrate(200);
    if (currentSet >= totalSets) {
      onExerciseComplete(currentExerciseIdx);
      setCurrentSet(1);
      if (currentExerciseIdx >= exercises.length - 1) {
        clearInterval(totalInterval.current);
        setPhase('done');
        onFinish(totalSeconds, newLogs);
      } else {
        setPhase('rest');
      }
    } else {
      setCurrentSet(s => s + 1);
      if (restTime > 0) setPhase('rest');
    }
  };

  const handleWeightSkip = () => {
    setShowWeightModal(false);
    handleWeightConfirm(0, parseInt(exercise?.reps) || 10);
  };

  const volumeKg = allSetLogs.reduce((sum, l) => sum + (l.weight_kg * l.reps), 0);

  if (phase === 'done') {
    return (
      <View style={timerStyles.doneCard}>
        <Text style={timerStyles.doneIcon}>🏆</Text>
        <Text style={timerStyles.doneTitle}>{isAr ? 'انتهت الجلسة!' : 'Séance Terminée !'}</Text>
        <Text style={timerStyles.doneTime}>{isAr ? 'الوقت الكلي' : 'Temps total'}: {formatTime(totalSeconds)}</Text>
        {volumeKg > 0 && (
          <View style={timerStyles.volumeBox}>
            <Text style={timerStyles.volumeLabel}>{isAr ? 'الحجم الكلي' : 'Volume total'}</Text>
            <Text style={timerStyles.volumeVal}>{volumeKg.toFixed(0)} kg</Text>
          </View>
        )}
        {allSetLogs.length > 0 && (
          <ScrollView style={{ maxHeight: 200, width: '100%' }} showsVerticalScrollIndicator={false}>
            {allSetLogs.map((l, i) => (
              <View key={i} style={timerStyles.logRow}>
                <Text style={timerStyles.logEx} numberOfLines={1}>{l.exercise_name}</Text>
                <Text style={timerStyles.logDetail}>S{l.set_number} · {l.reps} reps{l.weight_kg > 0 ? ` · ${l.weight_kg}kg` : ''}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={[timerStyles.container, { borderColor: color + '44' }]}>
      <WeightInputModal
        visible={showWeightModal}
        exerciseName={exercise?.name || ''}
        setNum={currentSet}
        previousWeight={previousWeights[exercise?.id] ?? null}
        onConfirm={handleWeightConfirm}
        onSkip={handleWeightSkip}
        color={color}
        isAr={isAr}
      />
      {/* Total elapsed */}
      <View style={timerStyles.totalRow}>
        <MaterialIcons name="timer" size={14} color={Colors.textMuted} />
        <Text style={timerStyles.totalTime}>{formatTime(totalSeconds)}</Text>
        {volumeKg > 0 && <Text style={timerStyles.volumeInline}>· {volumeKg.toFixed(0)}kg volume</Text>}
      </View>

      {phase === 'rest' ? (
        <View style={timerStyles.restPhase}>
          <View style={[timerStyles.phasePill, { backgroundColor: Colors.warning + '22', borderColor: Colors.warning + '55' }]}>
            <Text style={[timerStyles.phaseLabel, { color: Colors.warning }]}>⏸ {isAr ? 'فترة الراحة' : 'REPOS'}</Text>
          </View>
          <Text style={[timerStyles.countdownBig, { color: Colors.warning }]}>{formatTime(restSeconds)}</Text>
          <Text style={timerStyles.nextLabel}>
            {isAr ? `الجلسة القادمة: ${currentSet}/${totalSets}` : `Prochaine: Série ${currentSet}/${totalSets}`}
          </Text>
          <TouchableOpacity
            style={timerStyles.skipRestBtn}
            onPress={() => { clearInterval(restInterval.current); setPhase('work'); }}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <MaterialIcons name="skip-next" size={18} color={Colors.textSecondary} />
            <Text style={timerStyles.skipRestText}>{isAr ? 'تخطي الراحة' : 'Passer le repos'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={timerStyles.workPhase}>
          <View style={[timerStyles.phasePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[timerStyles.phaseLabel, { color }]}>💪 {isAr ? 'جاري التدريب' : 'EN COURS'}</Text>
          </View>

          <Text style={timerStyles.exerciseName} numberOfLines={2}>{exercise?.name}</Text>

          {/* Set progress dots */}
          <View style={timerStyles.setsRow}>
            {Array.from({ length: totalSets }).map((_, i) => (
              <View
                key={i}
                style={[
                  timerStyles.setDot,
                  i < currentSet - 1 && { backgroundColor: Colors.success, transform: [{ scale: 1.1 }] },
                  i === currentSet - 1 && { backgroundColor: color, width: 20, borderRadius: 4 },
                ]}
              />
            ))}
          </View>

          <Text style={timerStyles.setLabel}>
            {isAr
              ? `الجلسة ${currentSet} / ${totalSets}  ·  ${exercise?.reps} تكرار`
              : `Série ${currentSet} / ${totalSets}  ·  ${exercise?.reps} reps`
            }
          </Text>

          {previousWeights[exercise?.id] != null && previousWeights[exercise?.id]! > 0 && (
            <View style={timerStyles.prevWeightRow}>
              <MaterialIcons name="history" size={13} color={Colors.gold} />
              <Text style={[timerStyles.prevWeightText, { color: Colors.gold }]}>
                {isAr ? `السابق: ${previousWeights[exercise?.id]} kg` : `Précédent: ${previousWeights[exercise?.id]} kg`}
              </Text>
            </View>
          )}

          {exercise?.technique && (
            <View style={timerStyles.techniqueBox}>
              <MaterialIcons name="tips-and-updates" size={12} color={color} />
              <Text style={[timerStyles.techniqueText, { color: color + 'CC' }]}>{exercise.technique}</Text>
            </View>
          )}

          {/* PRIMARY ACTION — large, unmissable */}
          <TouchableOpacity
            style={[timerStyles.doneSetBtn, { backgroundColor: color }]}
            onPress={handleSetDone}
            activeOpacity={0.8}
          >
            <MaterialIcons name="check-circle" size={26} color={Colors.textInverse} />
            <Text style={timerStyles.doneSetText}>
              {isAr ? 'انتهت الجلسة' : 'Série terminée'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 12,
    borderWidth: 1,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  totalTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  phasePill: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, marginBottom: 4 },
  phaseLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1.5, textAlign: 'center' },
  restPhase: { alignItems: 'center', gap: 12 },
  countdownBig: { fontSize: 64, fontWeight: FontWeight.extrabold, letterSpacing: -2 },
  nextLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  skipRestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.surfaceBorder, borderRadius: Radius.full, marginTop: 4 },
  skipRestText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  workPhase: { gap: 12 },
  exerciseName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  setsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' },
  setDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.surfaceBorder },
  setLabel: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', fontWeight: FontWeight.semibold },
  techniqueBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 10 },
  techniqueText: { flex: 1, fontSize: FontSize.xs, fontStyle: 'italic', lineHeight: 17 },
  // PRIMARY ACTION BUTTON — large, 64px+ height, unmissable
  doneSetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: Radius.lg, paddingVertical: 20, marginTop: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  doneSetText: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textInverse, letterSpacing: 0.3 },
  doneCard: { alignItems: 'center', padding: Spacing.xl, gap: 12, width: '100%' },
  doneIcon: { fontSize: 56 },
  doneTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  doneTime: { fontSize: FontSize.md, color: Colors.textSecondary },
  volumeBox: { backgroundColor: Colors.goldMuted, borderRadius: Radius.md, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.gold + '44' },
  volumeLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  volumeVal: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  logRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: 8 },
  logEx: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  logDetail: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  volumeInline: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },
  prevWeightRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: Colors.goldMuted, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  prevWeightText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});

export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeklyWorkout, regenerateWorkout, profile, isWorkoutLoading } = useHealth();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === 'ar';
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeType, setActiveType] = useState<WorkoutSession['type']>('hypertrophy');
  const [activeSplit, setActiveSplit] = useState<string>('upper_lower');
  const [workoutRunning, setWorkoutRunning] = useState(false);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>({});
  const [workoutSummary, setWorkoutSummary] = useState<{ totalTime: number; logs: any[]; volumeKg: number } | null>(null);
  const [showSplitPicker, setShowSplitPicker] = useState(false);
  const [workoutId] = useState(() => `workout_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const session = weeklyWorkout[selectedDay];
  const dayLabels = t('days').split(',');
  const cfg = session ? TYPE_CONFIG[session.type] || TYPE_CONFIG.recovery : TYPE_CONFIG.recovery;

  const handleExerciseComplete = (idx: number) => {
    if (session?.exercises[idx]) {
      setCompletedExercises(prev => new Set([...prev, session.exercises[idx].id]));
      if (idx < session.exercises.length - 1) {
        setCurrentExerciseIdx(idx + 1);
      }
    }
  };

  const handleSetComplete = (exerciseIdx: number, setIdx: number) => {
    const exId = session?.exercises[exerciseIdx]?.id || '';
    setCompletedSets(prev => ({
      ...prev,
      [exId]: [...(prev[exId] || []), setIdx],
    }));
  };

  const handleFinish = (totalTime: number, logs: any[]) => {
    setWorkoutRunning(false);
    const vol = logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps || 0), 0);
    setWorkoutSummary({ totalTime, logs, volumeKg: vol });
    if (user) addXP(user.id, 'complete_workout').catch(console.error);
  };

  const startWorkout = useCallback(() => {
    setCompletedExercises(new Set());
    setCompletedSets({});
    setCurrentExerciseIdx(0);
    setWorkoutSummary(null);
    setWorkoutRunning(true);
  }, []);

  const handleGenerateWithSplit = useCallback(() => {
    regenerateWorkout(activeType, activeSplit);
    setShowSplitPicker(false);
  }, [activeType, activeSplit, regenerateWorkout]);

  const totalVolume = session?.exercises.reduce((sum, e) => sum + (e.sets * (parseInt(e.reps) || 8)), 0) || 0;
  const completionPct = session?.exercises.length
    ? (completedExercises.size / session.exercises.length) * 100 : 0;

  const scienceTip = session
    ? (language === 'ar' && session.scienceTipAr ? session.scienceTipAr : session.scienceTip) : '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('training_plan')}</Text>
        <TouchableOpacity style={styles.splitPickerBtn} onPress={() => setShowSplitPicker(p => !p)} activeOpacity={0.8}>
          <MaterialIcons name="tune" size={16} color={Colors.textSecondary} />
          <Text style={styles.splitPickerText}>{SPLIT_TYPES.find(s => s.key === activeSplit)?.label || 'Split'}</Text>
        </TouchableOpacity>
      </View>

      {/* Split Picker */}
      {showSplitPicker && (
        <View style={styles.splitPickerPanel}>
          <Text style={styles.splitPickerTitle}>Programme d'entraînement</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.splitScrollRow}>
            {SPLIT_TYPES.map(sp => (
              <TouchableOpacity
                key={sp.key}
                style={[styles.splitChip, activeSplit === sp.key && styles.splitChipActive]}
                onPress={() => setActiveSplit(sp.key)}
                activeOpacity={0.8}
              >
                <MaterialIcons name={sp.icon as any} size={14} color={activeSplit === sp.key ? Colors.textInverse : Colors.textMuted} />
                <Text style={[styles.splitChipText, activeSplit === sp.key && styles.splitChipTextActive]}>{sp.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.generateSplitBtn} onPress={handleGenerateWithSplit} disabled={isWorkoutLoading}>
            {isWorkoutLoading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <MaterialIcons name="auto-awesome" size={16} color={Colors.textInverse} />
            }
            <Text style={styles.generateSplitText}>
              {isWorkoutLoading ? 'Génération...' : `Générer ${SPLIT_TYPES.find(s => s.key === activeSplit)?.label}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Workout Type Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilters}>
        {WORKOUT_TYPES.map(tf => {
          const tc = TYPE_CONFIG[tf.key];
          return (
            <TouchableOpacity
              key={tf.key}
              style={[styles.typeChip, activeType === tf.key && { backgroundColor: tc.color, borderColor: tc.color }]}
              onPress={() => setActiveType(tf.key)}
              activeOpacity={0.8}
            >
              <MaterialIcons name={tc.icon as any} size={14} color={activeType === tf.key ? Colors.textInverse : Colors.textMuted} />
              <Text style={[styles.typeChipText, activeType === tf.key && styles.typeChipTextActive]}>{tf.labelFr}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isWorkoutLoading && (
        <View style={styles.aiLoadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.aiLoadingText}>IA génère votre plan {SPLIT_TYPES.find(s => s.key === activeSplit)?.label} personnalisé...</Text>
        </View>
      )}

      {/* Day Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarInner} style={styles.dayBar}>
        {weeklyWorkout.map((s, i) => {
          const sc = TYPE_CONFIG[s.type] || TYPE_CONFIG.recovery;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, selectedDay === i && { backgroundColor: sc.color, borderColor: sc.color }]}
              onPress={() => { setSelectedDay(i); setWorkoutRunning(false); setWorkoutSummary(null); setCompletedExercises(new Set()); }}
            >
              <Text style={[styles.dayChipDay, selectedDay === i && styles.dayChipDayActive]}>{dayLabels[i]}</Text>
              <MaterialIcons name={sc.icon as any} size={12} color={selectedDay === i ? Colors.textInverse : Colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {session && (
          <>
            {/* Session Info Card */}
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
                      <Text style={styles.sessionMetaText}>{session.exercises.length} ex.</Text>
                    </View>
                    <View style={styles.sessionMetaItem}>
                      <MaterialIcons name="trending-up" size={14} color={Colors.textMuted} />
                      <Text style={styles.sessionMetaText}>{totalVolume} reps</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Warmup tip */}
              {(session as any).warmup && (
                <View style={styles.warmupBox}>
                  <MaterialIcons name="whatshot" size={12} color={Colors.gold} />
                  <Text style={styles.warmupText}>Échauffement: {(session as any).warmup}</Text>
                </View>
              )}

              {/* Progress bar */}
              {session.exercises.length > 0 && (
                <View style={styles.progressWrap}>
                  <Text style={styles.progressLabel}>{completedExercises.size}/{session.exercises.length} exercices</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${completionPct}%`, backgroundColor: cfg.color }]} />
                  </View>
                </View>
              )}

              {/* Science Tip */}
              <View style={styles.scienceBox}>
                <View style={styles.scienceHeader}>
                  <MaterialIcons name="science" size={14} color={cfg.color} />
                  <Text style={[styles.scienceLabel, { color: cfg.color }]}>{t('science_tip')}</Text>
                </View>
                <Text style={styles.scienceTip}>{scienceTip}</Text>
              </View>

              {/* Start/Stop Button */}
              {!workoutRunning && !workoutSummary && (
                <TouchableOpacity
                  style={[styles.startBtn, { backgroundColor: cfg.color, shadowColor: cfg.color }]}
                  onPress={startWorkout}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="play-circle-filled" size={24} color={Colors.textInverse} />
                  <Text style={styles.startBtnText}>{t('start_workout')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Workout Summary */}
            {workoutSummary && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>🏆 {isAr ? 'انتهت الجلسة!' : 'Séance terminée !'}</Text>
                <Text style={styles.summaryDetail}>
                  {completedExercises.size}/{session.exercises.length} {isAr ? 'تمرين' : 'exercices'} · {Math.floor(workoutSummary.totalTime / 60)}:{String(workoutSummary.totalTime % 60).padStart(2, '0')} min
                </Text>
                {workoutSummary.volumeKg > 0 && (
                  <Text style={styles.summaryVolume}>{isAr ? 'الحجم الكلي' : 'Volume'}: {workoutSummary.volumeKg.toFixed(0)} kg</Text>
                )}
                <TouchableOpacity style={styles.newSessionBtn} onPress={startWorkout} activeOpacity={0.8}>
                  <Text style={styles.newSessionText}>{isAr ? 'إعادة التدريب' : 'Recommencer'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Advanced Timer */}
            {workoutRunning && session.exercises.length > 0 && (
              <AdvancedTimer
                exercises={session.exercises}
                currentExerciseIdx={currentExerciseIdx}
                onExerciseComplete={handleExerciseComplete}
                onFinish={handleFinish}
                onSetComplete={handleSetComplete}
                color={cfg.color}
                workoutId={workoutId}
                userId={user?.id || null}
                isAr={isAr}
              />
            )}

            {/* Exercise List */}
            {session.exercises.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Programme ({session.exercises.length} exercices)</Text>
                {session.exercises.map((ex, i) => {
                  const isActive = workoutRunning && i === currentExerciseIdx;
                  const done = completedExercises.has(ex.id);
                  const setsCompleted = completedSets[ex.id]?.length || 0;
                  const intensityColors: Record<string, string> = { high: Colors.danger, medium: Colors.warning, low: Colors.success };
                  const ic = intensityColors[ex.intensity] || Colors.success;
                  return (
                    <View
                      key={ex.id}
                      style={[
                        styles.exCard,
                        done && styles.exCardDone,
                        isActive && { borderColor: cfg.color, borderWidth: 2 },
                      ]}
                    >
                      <View style={[styles.exNumber, done && { backgroundColor: Colors.success }, isActive && { backgroundColor: cfg.color }]}>
                        {done
                          ? <MaterialIcons name="check" size={16} color={Colors.textInverse} />
                          : isActive
                            ? <MaterialIcons name="play-arrow" size={16} color={Colors.textInverse} />
                            : <Text style={styles.exNumberText}>{i + 1}</Text>
                        }
                      </View>
                      <View style={styles.exInfo}>
                        <Text style={[styles.exName, done && styles.exNameDone]}>
                          {language === 'ar' && ex.nameAr ? ex.nameAr : ex.name}
                        </Text>
                        <Text style={styles.exMuscle}>{ex.muscleGroup}</Text>
                        {(ex as any).muscleGroupSecondary && (
                          <Text style={styles.exMuscleSecondary}>+ {(ex as any).muscleGroupSecondary}</Text>
                        )}
                        {ex.technique && <Text style={styles.exTechnique}>{ex.technique}</Text>}
                        <View style={styles.exStats}>
                          <View style={styles.exStat}>
                            <Text style={styles.exStatLabel}>{t('sets')}</Text>
                            <Text style={styles.exStatValue}>{ex.sets}</Text>
                          </View>
                          <View style={styles.exStat}>
                            <Text style={styles.exStatLabel}>{t('reps')}</Text>
                            <Text style={styles.exStatValue}>{ex.reps}</Text>
                          </View>
                          <View style={styles.exStat}>
                            <Text style={styles.exStatLabel}>{t('rest')}</Text>
                            <Text style={styles.exStatValue}>{ex.rest}s</Text>
                          </View>
                          {(ex as any).tempo && (
                            <View style={styles.exStat}>
                              <Text style={styles.exStatLabel}>Tempo</Text>
                              <Text style={styles.exStatValue}>{(ex as any).tempo}</Text>
                            </View>
                          )}
                          {(ex as any).rir !== undefined && (
                            <View style={styles.exStat}>
                              <Text style={styles.exStatLabel}>RIR</Text>
                              <Text style={styles.exStatValue}>{(ex as any).rir}</Text>
                            </View>
                          )}
                        </View>
                        {/* Mini set progress */}
                        {workoutRunning && isActive && (
                          <View style={styles.miniSetsRow}>
                            {Array.from({ length: ex.sets }).map((_, si) => (
                              <View key={si} style={[styles.miniSetDot, si < setsCompleted && { backgroundColor: cfg.color }]} />
                            ))}
                          </View>
                        )}
                        {(ex as any).progression && (
                          <Text style={styles.progressionText}>📈 {(ex as any).progression}</Text>
                        )}
                      </View>
                      <View style={[styles.intensityBadge, { backgroundColor: ic + '22' }]}>
                        <Text style={[styles.intensityText, { color: ic }]}>
                          {ex.intensity === 'high' ? '🔥' : ex.intensity === 'medium' ? '⚡' : '✓'}
                        </Text>
                      </View>
                    </View>
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
  splitPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  splitPickerText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  splitPickerPanel: { marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  splitPickerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  splitScrollRow: { gap: 8, paddingBottom: 12 },
  splitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  splitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  splitChipText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  splitChipTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },
  generateSplitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, marginTop: 8 },
  generateSplitText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },

  typeFilters: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  typeChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  typeChipTextActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  aiLoadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12 },
  aiLoadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },

  dayBar: { marginBottom: Spacing.md },
  dayBarInner: { paddingHorizontal: Spacing.md, gap: 8 },
  dayChip: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  dayChipDay: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayChipDayActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  scroll: { paddingHorizontal: Spacing.md },
  sessionCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1 },
  sessionTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  sessionIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1 },
  sessionType: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1.5 },
  sessionName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginVertical: 4 },
  sessionMeta: { flexDirection: 'row', gap: 12 },
  sessionMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },

  warmupBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.goldMuted, borderRadius: Radius.sm, padding: 8, marginBottom: Spacing.sm },
  warmupText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 16 },

  progressWrap: { marginBottom: 12 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 6 },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  scienceBox: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
  scienceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  scienceLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  scienceTip: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: Radius.lg, paddingVertical: 18,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  startBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  // Override for summary card
  summaryCard: { backgroundColor: Colors.goldMuted, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '44', alignItems: 'center', gap: 8 },

  summaryCard: { backgroundColor: Colors.goldMuted, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '44', alignItems: 'center', gap: 8 },
  summaryTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  summaryDetail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryVolume: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.gold },
  newSessionBtn: { backgroundColor: Colors.gold, borderRadius: Radius.md, paddingHorizontal: 24, paddingVertical: 14 },
  newSessionText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },

  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  exCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  exCardDone: { borderColor: Colors.success + '66', backgroundColor: Colors.successMuted },
  exNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exNumberText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  exInfo: { flex: 1 },
  exName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  exNameDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  exMuscle: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  exMuscleSecondary: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  exTechnique: { fontSize: 10, color: Colors.primary, fontStyle: 'italic', marginBottom: 4, lineHeight: 14 },
  exStats: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  exStat: { alignItems: 'center' },
  exStatLabel: { fontSize: 9, color: Colors.textMuted },
  exStatValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  miniSetsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  miniSetDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.surfaceBorder },
  progressionText: { fontSize: 10, color: Colors.success, marginTop: 4 },
  intensityBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  intensityText: { fontSize: 14 },

  restDay: { alignItems: 'center', paddingVertical: 48 },
  restIcon: { fontSize: 48, marginBottom: 16 },
  restTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  restSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },
});
