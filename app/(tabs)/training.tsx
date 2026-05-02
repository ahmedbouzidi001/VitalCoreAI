// VitalCore AI — Advanced Training Screen v4
// Features: Large readable filters, exercise photos+instructions, reorder, AI guidance
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, Vibration, Platform, TextInput, Modal, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useHealth, WorkoutSession } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { addXP } from '@/services/gamification';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ── Exercise Images (Unsplash real photos) ─────────────────────────────────────
const EXERCISE_IMAGES: Record<string, string> = {
  bench_press: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  squat: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
  deadlift: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  pull_up: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a07?w=400&q=80',
  shoulder_press: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
  row: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80',
};

function getExerciseImage(exerciseName: string): string {
  const name = exerciseName.toLowerCase();
  if (name.includes('bench') || name.includes('pec') || name.includes('presse')) return EXERCISE_IMAGES.bench_press;
  if (name.includes('squat') || name.includes('leg press') || name.includes('jambe')) return EXERCISE_IMAGES.squat;
  if (name.includes('deadlift') || name.includes('soulevé') || name.includes('terre')) return EXERCISE_IMAGES.deadlift;
  if (name.includes('pull') || name.includes('traction') || name.includes('chin')) return EXERCISE_IMAGES.pull_up;
  if (name.includes('press') && (name.includes('shoulder') || name.includes('épaul') || name.includes('overhead'))) return EXERCISE_IMAGES.shoulder_press;
  if (name.includes('row') || name.includes('tirage') || name.includes('rameur')) return EXERCISE_IMAGES.row;
  return EXERCISE_IMAGES.default;
}

// ── Exercise instructions database ────────────────────────────────────────────
const EXERCISE_TIPS: Record<string, { cues: string[]; common_mistakes: string[]; breathing: string }> = {
  default: {
    cues: ['Contrôle la descente (3 sec)', 'Poussez le sol / la barre explosément', 'Gardez le gainage abdominal'],
    common_mistakes: ['Ne pas aller assez bas', 'Repos trop courts entre séries', 'Charge trop lourde au détriment de la forme'],
    breathing: 'Inspirez à la descente, expirez à l\'effort',
  },
  bench: {
    cues: ['Omoplates rétractées sur le banc', 'Pieds bien à plat sur le sol', 'Grip légèrement plus large que les épaules', 'Descente contrôlée sur 3s'],
    common_mistakes: ['Dos en hyperextension', 'Coudes trop ouverts à 90°', 'Rebond sur la poitrine'],
    breathing: 'Inspirez à la descente, bloquez et expirez à la montée',
  },
  squat: {
    cues: ['Pieds à largeur d\'épaules, orteils légèrement vers l\'extérieur', 'Genoux dans l\'axe des orteils', 'Descente jusqu\'au parallèle minimum', 'Poitrine haute, regard devant'],
    common_mistakes: ['Valgus des genoux (effondrement vers l\'intérieur)', 'Talon décollé du sol', 'Dos arrondi'],
    breathing: 'Inspirez avant de descendre (Valsalva), expirez en montant',
  },
  deadlift: {
    cues: ['Barre sur le dessus des pieds', 'Hanche en arrière, dos droit', 'Engager les dorsaux avant de tirer', 'Poussez le sol'],
    common_mistakes: ['Dos rond (risque lombaire)', 'Barre trop loin du corps', 'Hyperextension en haut'],
    breathing: 'Inspirez, bloquez (Valsalva), expirez au sommet',
  },
};

function getExerciseTips(name: string) {
  const n = name.toLowerCase();
  if (n.includes('bench') || n.includes('pec')) return EXERCISE_TIPS.bench;
  if (n.includes('squat') || n.includes('goblet')) return EXERCISE_TIPS.squat;
  if (n.includes('deadlift') || n.includes('soulevé')) return EXERCISE_TIPS.deadlift;
  return EXERCISE_TIPS.default;
}

// ── Type Config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { color: string; icon: string; gradient: string; label: string; desc: string }> = {
  hypertrophy: { color: Colors.primary, icon: 'fitness-center', gradient: Colors.primaryMuted, label: 'Hypertrophie', desc: '8-12 reps · Force musculaire' },
  strength: { color: Colors.gold, icon: 'bolt', gradient: Colors.goldMuted, label: 'Force', desc: '3-6 reps · Charge maximale' },
  endurance: { color: Colors.success, icon: 'directions-run', gradient: Colors.successMuted, label: 'Endurance', desc: '15-20 reps · Cardio-musculaire' },
  longevity: { color: Colors.purple, icon: 'self-improvement', gradient: Colors.purpleMuted, label: 'Longévité', desc: '10-15 reps · Santé globale' },
  recovery: { color: Colors.textSecondary, icon: 'spa', gradient: 'rgba(138,155,193,0.12)', label: 'Récup', desc: 'Repos actif · Mobilité' },
};

const SPLIT_TYPES = [
  { key: 'upper_lower', label: 'Upper/Lower', icon: 'swap-vert', desc: '4j/sem · Haut + Bas' },
  { key: 'ppl', label: 'PPL', icon: 'repeat', desc: '6j/sem · Push/Pull/Legs' },
  { key: 'arnold', label: 'Arnold Split', icon: 'star', desc: '6j/sem · Chest+Back / Shoulders+Arms / Legs' },
  { key: 'anterior_posterior', label: 'Ant/Post', icon: 'compare-arrows', desc: '4j/sem · Antérieur/Postérieur' },
  { key: 'full_body', label: 'Full Body', icon: 'accessibility-new', desc: '3j/sem · Corps entier' },
  { key: 'bro_split', label: 'Bro Split', icon: 'sports-gymnastics', desc: '5j/sem · 1 muscle/séance' },
] as const;

// ── Weight Input Modal ────────────────────────────────────────────────────────
function WeightInputModal({ visible, exerciseName, setNum, previousWeight, onConfirm, onSkip, color, isAr }: {
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
  const adjustReps = (delta: number) => setReps(String(Math.max(1, (parseInt(reps) || 10) + delta)));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={[wStyles.panel, { borderTopColor: color }]}>
          <View style={wStyles.handle} />
          <Text style={wStyles.exName}>{exerciseName}</Text>
          <Text style={[wStyles.setInfo, { color }]}>
            {isAr ? `الجلسة ${setNum}` : `Série ${setNum}`}
            {previousWeight ? `  ·  ${isAr ? 'السابق' : 'Précédent'}: ${previousWeight} kg` : ''}
          </Text>

          <View style={wStyles.adjustRow}>
            {/* Weight */}
            <View style={wStyles.adjustCol}>
              <Text style={wStyles.adjustLabel}>{isAr ? 'الوزن (كغ)' : 'POIDS (kg)'}</Text>
              <View style={wStyles.adjRow}>
                <TouchableOpacity onPress={() => adjustWeight(-2.5)} style={wStyles.adjBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={wStyles.adjBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={[wStyles.adjInput, { color, borderColor: color + '66' }]}
                  value={weight} onChangeText={setWeight}
                  keyboardType="decimal-pad" placeholder="0"
                  placeholderTextColor={Colors.textMuted} selectTextOnFocus
                />
                <TouchableOpacity onPress={() => adjustWeight(2.5)} style={wStyles.adjBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={wStyles.adjBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Reps */}
            <View style={wStyles.adjustCol}>
              <Text style={wStyles.adjustLabel}>{isAr ? 'التكرارات' : 'REPS'}</Text>
              <View style={wStyles.adjRow}>
                <TouchableOpacity onPress={() => adjustReps(-1)} style={wStyles.adjBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={wStyles.adjBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={[wStyles.adjInput, { color: Colors.textPrimary, borderColor: Colors.surfaceBorder }]}
                  value={reps} onChangeText={setReps}
                  keyboardType="number-pad" selectTextOnFocus
                />
                <TouchableOpacity onPress={() => adjustReps(1)} style={wStyles.adjBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={wStyles.adjBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[wStyles.confirmBtn, { backgroundColor: color, shadowColor: color }]}
            onPress={() => onConfirm(parseFloat(weight) || 0, parseInt(reps) || 10)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check-circle" size={24} color={Colors.textInverse} />
            <Text style={wStyles.confirmText}>{isAr ? 'تأكيد الجلسة' : 'Confirmer la série'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={wStyles.skipBtn} hitSlop={{ top: 8, bottom: 8, left: 32, right: 32 }}>
            <Text style={wStyles.skipText}>{isAr ? 'تخطي بدون وزن' : 'Passer sans peser'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const wStyles = StyleSheet.create({
  panel: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: 48, borderTopWidth: 2 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: Spacing.md },
  exName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  setInfo: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'center', marginBottom: Spacing.lg },
  adjustRow: { flexDirection: 'row', gap: 16, marginBottom: Spacing.lg },
  adjustCol: { flex: 1, alignItems: 'center', gap: 10 },
  adjustLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 1 },
  adjRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adjBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  adjBtnText: { fontSize: 22, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  adjInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 8, fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center', borderWidth: 2, minWidth: 76 },
  confirmBtn: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexDirection: 'row', gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  confirmText: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: FontSize.sm, color: Colors.textMuted },
});

// ── Exercise Detail Modal (Photo + Instructions) ───────────────────────────────
function ExerciseDetailModal({ exercise, color, onClose, isAr }: {
  exercise: any; color: string; onClose: () => void; isAr: boolean;
}) {
  const tips = getExerciseTips(exercise.name);
  const imgUri = getExerciseImage(exercise.name);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <View style={edStyles.panel}>
          <View style={edStyles.handle} />

          {/* Photo */}
          <View style={edStyles.imgWrap}>
            <Image source={{ uri: imgUri }} style={edStyles.img} contentFit="cover" transition={300} />
            <View style={[edStyles.imgOverlay, { backgroundColor: color + '22' }]} />
            <View style={edStyles.imgBadge}>
              <MaterialIcons name="fitness-center" size={12} color={color} />
              <Text style={[edStyles.imgBadgeText, { color }]}>
                {exercise.muscleGroup}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            <Text style={edStyles.exName}>{exercise.name}</Text>
            {exercise.technique ? (
              <View style={[edStyles.infoBox, { backgroundColor: color + '15', borderColor: color + '33' }]}>
                <MaterialIcons name="tips-and-updates" size={14} color={color} />
                <Text style={[edStyles.techniqueText, { color: color + 'CC' }]}>{exercise.technique}</Text>
              </View>
            ) : null}

            {/* Cues */}
            <Text style={edStyles.sectionLabel}>{isAr ? '✅ نقاط الأداء' : '✅ Points clés d\'exécution'}</Text>
            {tips.cues.map((cue, i) => (
              <View key={i} style={edStyles.cueRow}>
                <View style={[edStyles.cueDot, { backgroundColor: color }]} />
                <Text style={edStyles.cueText}>{cue}</Text>
              </View>
            ))}

            {/* Mistakes */}
            <Text style={[edStyles.sectionLabel, { marginTop: Spacing.sm }]}>
              {isAr ? '⚠️ الأخطاء الشائعة' : '⚠️ Erreurs courantes'}
            </Text>
            {tips.common_mistakes.map((m, i) => (
              <View key={i} style={edStyles.cueRow}>
                <View style={[edStyles.cueDot, { backgroundColor: Colors.warning }]} />
                <Text style={[edStyles.cueText, { color: Colors.textSecondary }]}>{m}</Text>
              </View>
            ))}

            {/* Breathing */}
            <View style={edStyles.breathRow}>
              <MaterialIcons name="air" size={14} color={Colors.primary} />
              <Text style={edStyles.breathText}>{tips.breathing}</Text>
            </View>

            {/* Stats */}
            <View style={edStyles.statsRow}>
              {[
                { label: isAr ? 'الجلسات' : 'Séries', val: String(exercise.sets) },
                { label: isAr ? 'التكرارات' : 'Répétitions', val: exercise.reps },
                { label: isAr ? 'الراحة' : 'Repos', val: `${exercise.rest}s` },
                { label: 'Tempo', val: exercise.tempo || '2-0-2' },
              ].map((s, i) => (
                <View key={i} style={edStyles.statItem}>
                  <Text style={[edStyles.statVal, { color }]}>{s.val}</Text>
                  <Text style={edStyles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {exercise.progression ? (
              <View style={edStyles.progressionBox}>
                <MaterialIcons name="trending-up" size={13} color={Colors.success} />
                <Text style={edStyles.progressionText}>{exercise.progression}</Text>
              </View>
            ) : null}
            <View style={{ height: 8 }} />
          </ScrollView>

          <TouchableOpacity style={edStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <MaterialIcons name="close" size={18} color={Colors.textInverse} />
            <Text style={edStyles.closeBtnText}>{isAr ? 'إغلاق' : 'Fermer'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const edStyles = StyleSheet.create({
  panel: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.md, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: Spacing.sm },
  imgWrap: { width: '100%', height: 180, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgOverlay: { position: 'absolute', inset: 0 },
  imgBadge: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.glass, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  imgBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  exName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm, borderWidth: 1 },
  techniqueText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18, fontStyle: 'italic' },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8 },
  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  cueDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  cueText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  breathRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm, padding: 10, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  breathText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  statItem: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 10, alignItems: 'center', gap: 3 },
  statVal: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  progressionBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.successMuted, borderRadius: Radius.sm, padding: 10, marginTop: Spacing.sm },
  progressionText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, lineHeight: 17 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, paddingVertical: 14, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  closeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});

// ── Advanced Timer ────────────────────────────────────────────────────────────
function AdvancedTimer({ exercises, currentExerciseIdx, onExerciseComplete, onFinish, onSetComplete, color, workoutId, userId, isAr }: {
  exercises: any[]; currentExerciseIdx: number;
  onExerciseComplete: (idx: number) => void;
  onFinish: (totalTime: number, logs: any[]) => void;
  onSetComplete: (exerciseIdx: number, setIdx: number) => void;
  color: string; workoutId: string; userId: string | null; isAr: boolean;
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

  useEffect(() => {
    totalInterval.current = setInterval(() => setTotalSeconds(s => s + 1), 1000);
    return () => clearInterval(totalInterval.current);
  }, []);

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

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const volumeKg = allSetLogs.reduce((sum, l) => sum + (l.weight_kg * l.reps), 0);

  const handleSetDone = useCallback(() => setShowWeightModal(true), []);

  const handleWeightConfirm = async (weight: number, reps: number) => {
    setShowWeightModal(false);
    const log = {
      workout_id: workoutId, exercise_id: exercise?.id || 'unknown',
      exercise_name: exercise?.name || '', set_number: currentSet,
      reps, weight_kg: weight, date: new Date().toISOString().split('T')[0],
    };
    const newLogs = [...allSetLogs, log];
    setAllSetLogs(newLogs);
    if (userId) {
      supabase.from('workout_logs').insert({ user_id: userId, ...log }).catch(console.error);
      addXP(userId, 'complete_workout').catch(console.error);
    }
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
          <ScrollView style={{ maxHeight: 180, width: '100%' }} showsVerticalScrollIndicator={false}>
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
        visible={showWeightModal} exerciseName={exercise?.name || ''}
        setNum={currentSet} previousWeight={previousWeights[exercise?.id] ?? null}
        onConfirm={handleWeightConfirm} onSkip={() => handleWeightConfirm(0, parseInt(exercise?.reps) || 10)}
        color={color} isAr={isAr}
      />
      <View style={timerStyles.totalRow}>
        <MaterialIcons name="timer" size={14} color={Colors.textMuted} />
        <Text style={timerStyles.totalTime}>{formatTime(totalSeconds)}</Text>
        {volumeKg > 0 && <Text style={timerStyles.volumeInline}>· {volumeKg.toFixed(0)}kg</Text>}
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
            activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
          >
            <MaterialIcons name="skip-next" size={20} color={Colors.textSecondary} />
            <Text style={timerStyles.skipRestText}>{isAr ? 'تخطي الراحة' : 'Passer le repos'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={timerStyles.workPhase}>
          <View style={[timerStyles.phasePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[timerStyles.phaseLabel, { color }]}>💪 {isAr ? 'جاري التدريب' : 'EN COURS'}</Text>
          </View>

          {/* Exercise photo mini */}
          <View style={timerStyles.exPhotoWrap}>
            <Image source={{ uri: getExerciseImage(exercise?.name || '') }} style={timerStyles.exPhoto} contentFit="cover" />
            <View style={[timerStyles.exPhotoOverlay, { backgroundColor: color + '33' }]} />
          </View>

          <Text style={timerStyles.exerciseName} numberOfLines={2}>{exercise?.name}</Text>

          <View style={timerStyles.setsRow}>
            {Array.from({ length: totalSets }).map((_, i) => (
              <View
                key={i}
                style={[
                  timerStyles.setDot,
                  i < currentSet - 1 && { backgroundColor: Colors.success, transform: [{ scale: 1.1 }] },
                  i === currentSet - 1 && { backgroundColor: color, width: 22, borderRadius: 5 },
                ]}
              />
            ))}
          </View>

          <Text style={timerStyles.setLabel}>
            {isAr ? `الجلسة ${currentSet} / ${totalSets}  ·  ${exercise?.reps} تكرار` : `Série ${currentSet} / ${totalSets}  ·  ${exercise?.reps} reps`}
          </Text>

          {previousWeights[exercise?.id] != null && previousWeights[exercise?.id]! > 0 && (
            <View style={timerStyles.prevWeightRow}>
              <MaterialIcons name="history" size={13} color={Colors.gold} />
              <Text style={[timerStyles.prevWeightText, { color: Colors.gold }]}>
                {isAr ? `السابق: ${previousWeights[exercise?.id]} kg` : `Précédent: ${previousWeights[exercise?.id]} kg`}
              </Text>
            </View>
          )}

          <TouchableOpacity style={[timerStyles.doneSetBtn, { backgroundColor: color }]} onPress={handleSetDone} activeOpacity={0.8}>
            <MaterialIcons name="check-circle" size={28} color={Colors.textInverse} />
            <Text style={timerStyles.doneSetText}>{isAr ? 'انتهت الجلسة' : 'Série terminée'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 12, borderWidth: 1 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  totalTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  volumeInline: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },
  phasePill: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, marginBottom: 6 },
  phaseLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, letterSpacing: 1.2, textAlign: 'center' },
  restPhase: { alignItems: 'center', gap: 14 },
  countdownBig: { fontSize: 68, fontWeight: FontWeight.extrabold, letterSpacing: -2 },
  nextLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  skipRestBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, marginTop: 4, borderWidth: 1, borderColor: Colors.surfaceBorder },
  skipRestText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  workPhase: { gap: 10 },
  exPhotoWrap: { width: '100%', height: 120, borderRadius: Radius.lg, overflow: 'hidden', position: 'relative' },
  exPhoto: { width: '100%', height: '100%' },
  exPhotoOverlay: { position: 'absolute', inset: 0 },
  exerciseName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  setsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' },
  setDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.surfaceBorder },
  setLabel: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', fontWeight: FontWeight.semibold },
  prevWeightRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: Colors.goldMuted, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full },
  prevWeightText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  doneSetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: Radius.lg, paddingVertical: 22, marginTop: 4,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  doneSetText: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
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
});

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
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
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [customExerciseOrder, setCustomExerciseOrder] = useState<any[] | null>(null);
  const [workoutId] = useState(() => `workout_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const session = weeklyWorkout[selectedDay];
  const displayExercises = customExerciseOrder ?? (session?.exercises || []);
  const dayLabels = t('days').split(',');
  const cfg = session ? TYPE_CONFIG[session.type] || TYPE_CONFIG.recovery : TYPE_CONFIG.recovery;

  // Reset custom order when day/session changes
  useEffect(() => { setCustomExerciseOrder(null); }, [selectedDay, session?.name]);

  const moveExercise = useCallback((fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= displayExercises.length) return;
    const newOrder = [...displayExercises];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    setCustomExerciseOrder(newOrder);
  }, [displayExercises]);

  const handleExerciseComplete = (idx: number) => {
    if (displayExercises[idx]) {
      setCompletedExercises(prev => new Set([...prev, displayExercises[idx].id]));
      if (idx < displayExercises.length - 1) setCurrentExerciseIdx(idx + 1);
    }
  };

  const handleSetComplete = (exerciseIdx: number, setIdx: number) => {
    const exId = displayExercises[exerciseIdx]?.id || '';
    setCompletedSets(prev => ({ ...prev, [exId]: [...(prev[exId] || []), setIdx] }));
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

  const completionPct = displayExercises.length
    ? (completedExercises.size / displayExercises.length) * 100 : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          color={cfg.color}
          onClose={() => setSelectedExercise(null)}
          isAr={isAr}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('training_plan')}</Text>
        <TouchableOpacity style={styles.splitPickerBtn} onPress={() => setShowSplitPicker(p => !p)} activeOpacity={0.8}>
          <MaterialIcons name="tune" size={16} color={Colors.primary} />
          <Text style={styles.splitPickerBtnText}>{SPLIT_TYPES.find(s => s.key === activeSplit)?.label || 'Split'}</Text>
          <MaterialIcons name={showSplitPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Split Picker Panel ── */}
      {showSplitPicker && (
        <View style={styles.splitPanel}>
          <Text style={styles.splitPanelTitle}>{isAr ? 'اختر البرنامج' : 'Choisissez votre programme'}</Text>
          <View style={styles.splitGrid}>
            {SPLIT_TYPES.map(sp => (
              <TouchableOpacity
                key={sp.key}
                style={[styles.splitCard, activeSplit === sp.key && styles.splitCardActive]}
                onPress={() => setActiveSplit(sp.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.splitCardIcon, activeSplit === sp.key && { backgroundColor: Colors.primary + '22' }]}>
                  <MaterialIcons name={sp.icon as any} size={20} color={activeSplit === sp.key ? Colors.primary : Colors.textMuted} />
                </View>
                <Text style={[styles.splitCardLabel, activeSplit === sp.key && styles.splitCardLabelActive]}>{sp.label}</Text>
                <Text style={styles.splitCardDesc}>{sp.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.generateBtn, isWorkoutLoading && { opacity: 0.6 }]}
            onPress={() => { regenerateWorkout(activeType, activeSplit); setShowSplitPicker(false); }}
            disabled={isWorkoutLoading} activeOpacity={0.85}
          >
            {isWorkoutLoading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <MaterialIcons name="auto-awesome" size={18} color={Colors.textInverse} />
            }
            <Text style={styles.generateBtnText}>
              {isWorkoutLoading ? 'Génération IA...' : `Générer ${SPLIT_TYPES.find(s => s.key === activeSplit)?.label}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Workout Type Filters — LARGE, readable ── */}
      <View style={styles.typeFiltersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilters}>
          {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'recovery').map(([key, cfg]) => {
            const isActive = activeType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.typeChip, isActive && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                onPress={() => setActiveType(key as WorkoutSession['type'])}
                activeOpacity={0.8}
              >
                <MaterialIcons name={cfg.icon as any} size={18} color={isActive ? Colors.textInverse : cfg.color} />
                <View>
                  <Text style={[styles.typeChipLabel, isActive && styles.typeChipLabelActive]}>{cfg.label}</Text>
                  <Text style={[styles.typeChipDesc, isActive && { color: Colors.textInverse + 'AA' }]}>{cfg.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isWorkoutLoading && (
        <View style={styles.aiLoadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.aiLoadingText}>IA génère votre programme {SPLIT_TYPES.find(s => s.key === activeSplit)?.label}...</Text>
        </View>
      )}

      {/* ── Day Selector ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarInner} style={styles.dayBar}>
        {weeklyWorkout.map((s, i) => {
          const sc = TYPE_CONFIG[s.type] || TYPE_CONFIG.recovery;
          const isActive = selectedDay === i;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, isActive && { backgroundColor: sc.color, borderColor: sc.color }]}
              onPress={() => { setSelectedDay(i); setWorkoutRunning(false); setWorkoutSummary(null); setCompletedExercises(new Set()); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayChipDay, isActive && styles.dayChipDayActive]}>{dayLabels[i]}</Text>
              <MaterialIcons name={sc.icon as any} size={12} color={isActive ? Colors.textInverse : Colors.textMuted} />
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
                      <Text style={styles.sessionMetaText}>{displayExercises.length} ex.</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Progress */}
              {displayExercises.length > 0 && (
                <View style={styles.progressWrap}>
                  <Text style={styles.progressLabel}>{completedExercises.size}/{displayExercises.length} exercices</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${completionPct}%`, backgroundColor: cfg.color }]} />
                  </View>
                </View>
              )}

              {/* Science Tip */}
              <View style={styles.scienceBox}>
                <MaterialIcons name="science" size={14} color={cfg.color} />
                <Text style={[styles.scienceTip, { color: cfg.color + 'CC' }]}>
                  {language === 'ar' && session.scienceTipAr ? session.scienceTipAr : session.scienceTip}
                </Text>
              </View>

              {!workoutRunning && !workoutSummary && (
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: cfg.color, shadowColor: cfg.color }]} onPress={startWorkout} activeOpacity={0.85}>
                  <MaterialIcons name="play-circle-filled" size={26} color={Colors.textInverse} />
                  <Text style={styles.startBtnText}>{t('start_workout')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Workout Summary */}
            {workoutSummary && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>🏆 {isAr ? 'انتهت!' : 'Séance terminée !'}</Text>
                <Text style={styles.summaryDetail}>
                  {completedExercises.size}/{displayExercises.length} ex. · {Math.floor(workoutSummary.totalTime / 60)}:{String(workoutSummary.totalTime % 60).padStart(2, '0')} min
                </Text>
                {workoutSummary.volumeKg > 0 && (
                  <Text style={styles.summaryVolume}>Volume: {workoutSummary.volumeKg.toFixed(0)} kg</Text>
                )}
                <TouchableOpacity style={styles.newSessionBtn} onPress={startWorkout} activeOpacity={0.8}>
                  <Text style={styles.newSessionText}>{isAr ? 'إعادة' : 'Recommencer'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Advanced Timer */}
            {workoutRunning && displayExercises.length > 0 && (
              <AdvancedTimer
                exercises={displayExercises}
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

            {/* Exercise List with Reorder + Photo */}
            {displayExercises.length > 0 && (
              <>
                <View style={styles.exerciseListHeader}>
                  <Text style={styles.sectionTitle}>Programme ({displayExercises.length} exercices)</Text>
                  {!workoutRunning && (
                    <View style={styles.reorderHint}>
                      <MaterialIcons name="swap-vert" size={14} color={Colors.textMuted} />
                      <Text style={styles.reorderHintText}>{isAr ? 'إعادة الترتيب' : 'Réorganiser'}</Text>
                    </View>
                  )}
                </View>

                {displayExercises.map((ex, i) => {
                  const isActive = workoutRunning && i === currentExerciseIdx;
                  const done = completedExercises.has(ex.id);
                  const setsCompleted = completedSets[ex.id]?.length || 0;
                  const intensityColors: Record<string, string> = { high: Colors.danger, medium: Colors.warning, low: Colors.success };
                  const ic = intensityColors[ex.intensity] || Colors.success;
                  const imgUri = getExerciseImage(ex.name);

                  return (
                    <View
                      key={`${ex.id}-${i}`}
                      style={[
                        styles.exCard,
                        done && styles.exCardDone,
                        isActive && { borderColor: cfg.color, borderWidth: 2 },
                      ]}
                    >
                      {/* Exercise Photo */}
                      <TouchableOpacity onPress={() => setSelectedExercise(ex)} activeOpacity={0.85}>
                        <View style={styles.exPhotoWrap}>
                          <Image source={{ uri: imgUri }} style={styles.exPhoto} contentFit="cover" transition={200} />
                          <View style={[styles.exPhotoOverlay, { backgroundColor: isActive ? cfg.color + '44' : 'rgba(8,15,30,0.4)' }]} />
                          <View style={styles.exPhotoInfoIcon}>
                            <MaterialIcons name="info" size={16} color="#fff" />
                          </View>
                          {done && (
                            <View style={styles.exPhotoDone}>
                              <MaterialIcons name="check-circle" size={24} color={Colors.success} />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.exBody}>
                        <View style={styles.exTopRow}>
                          <View style={styles.exNumber}>
                            {done
                              ? <MaterialIcons name="check" size={14} color={Colors.success} />
                              : isActive
                                ? <MaterialIcons name="play-arrow" size={14} color={cfg.color} />
                                : <Text style={[styles.exNumberText, { color: cfg.color }]}>{i + 1}</Text>
                            }
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.exName, done && styles.exNameDone]}>
                              {language === 'ar' && ex.nameAr ? ex.nameAr : ex.name}
                            </Text>
                            <Text style={styles.exMuscle}>{ex.muscleGroup}</Text>
                          </View>
                          <View style={[styles.intensityBadge, { backgroundColor: ic + '22' }]}>
                            <Text style={{ fontSize: 12 }}>{ex.intensity === 'high' ? '🔥' : ex.intensity === 'medium' ? '⚡' : '✓'}</Text>
                          </View>
                        </View>

                        <View style={styles.exStats}>
                          {[
                            { label: isAr ? 'جلسات' : 'Séries', val: String(ex.sets) },
                            { label: isAr ? 'تكرار' : 'Reps', val: ex.reps },
                            { label: isAr ? 'راحة' : 'Repos', val: `${ex.rest}s` },
                            ...(ex.tempo ? [{ label: 'Tempo', val: ex.tempo }] : []),
                            ...(ex.rir !== undefined ? [{ label: 'RIR', val: String(ex.rir) }] : []),
                          ].map((s, idx) => (
                            <View key={idx} style={styles.exStatItem}>
                              <Text style={styles.exStatVal}>{s.val}</Text>
                              <Text style={styles.exStatLabel}>{s.label}</Text>
                            </View>
                          ))}
                        </View>

                        {workoutRunning && isActive && (
                          <View style={styles.miniSetsRow}>
                            {Array.from({ length: ex.sets }).map((_, si) => (
                              <View key={si} style={[styles.miniSetDot, si < setsCompleted && { backgroundColor: cfg.color }]} />
                            ))}
                          </View>
                        )}

                        {/* Reorder buttons */}
                        {!workoutRunning && (
                          <View style={styles.reorderBtns}>
                            <TouchableOpacity
                              style={[styles.reorderBtn, i === 0 && styles.reorderBtnDisabled]}
                              onPress={() => moveExercise(i, 'up')}
                              disabled={i === 0}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialIcons name="keyboard-arrow-up" size={18} color={i === 0 ? Colors.textMuted : Colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.reorderBtn, i === displayExercises.length - 1 && styles.reorderBtnDisabled]}
                              onPress={() => moveExercise(i, 'down')}
                              disabled={i === displayExercises.length - 1}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialIcons name="keyboard-arrow-down" size={18} color={i === displayExercises.length - 1 ? Colors.textMuted : Colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.infoBtn}
                              onPress={() => setSelectedExercise(ex)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialIcons name="info-outline" size={18} color={cfg.color} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {displayExercises.length === 0 && (
              <View style={styles.restDay}>
                <Text style={styles.restIcon}>😴</Text>
                <Text style={styles.restTitle}>Jour de Repos</Text>
                <Text style={styles.restSub}>{session.scienceTip}</Text>
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
  splitPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary + '44' },
  splitPickerBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },

  // Split panel
  splitPanel: { marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  splitPanelTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  splitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  splitCard: { width: (width - 48 - 16) / 2 - 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 4 },
  splitCardActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primaryMuted },
  splitCardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  splitCardLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  splitCardLabelActive: { color: Colors.primary },
  splitCardDesc: { fontSize: FontSize.micro, color: Colors.textMuted, lineHeight: 13 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16,
    ...Shadow.primary,
  },
  generateBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },

  // ── Type Filters — LARGE & READABLE ──
  typeFiltersWrap: { marginBottom: Spacing.sm },
  typeFilters: { paddingHorizontal: Spacing.md, gap: 10, paddingVertical: 2 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    minHeight: 58,
    ...Shadow.sm,
  },
  typeChipLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  typeChipLabelActive: { color: Colors.textInverse },
  typeChipDesc: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 1 },

  aiLoadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12 },
  aiLoadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary },

  dayBar: { marginBottom: Spacing.md },
  dayBarInner: { paddingHorizontal: Spacing.md, gap: 8 },
  dayChip: { alignItems: 'center', gap: 3, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  dayChipDay: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayChipDayActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  scroll: { paddingHorizontal: Spacing.md },

  sessionCard: { borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, ...Shadow.sm },
  sessionTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  sessionIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1 },
  sessionType: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1.5 },
  sessionName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginVertical: 4 },
  sessionMeta: { flexDirection: 'row', gap: 12 },
  sessionMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },

  progressWrap: { marginBottom: Spacing.sm },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 6 },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  scienceBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
  scienceTip: { flex: 1, fontSize: FontSize.xs, lineHeight: 18 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: Radius.xl, paddingVertical: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  startBtnText: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textInverse },

  summaryCard: { backgroundColor: Colors.goldMuted, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '33', alignItems: 'center', gap: 8, ...Shadow.sm },
  summaryTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  summaryDetail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryVolume: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.gold },
  newSessionBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: 28, paddingVertical: 14, ...Shadow.gold },
  newSessionText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },

  exerciseListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  reorderHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reorderHintText: { fontSize: FontSize.xs, color: Colors.textMuted },

  // Exercise Card — horizontal with photo thumbnail
  exCard: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden', ...Shadow.sm,
  },
  exCardDone: { borderColor: Colors.success + '66', backgroundColor: Colors.successMuted },
  exPhotoWrap: { width: 90, height: 110, position: 'relative' },
  exPhoto: { width: 90, height: 110 },
  exPhotoOverlay: { position: 'absolute', inset: 0 },
  exPhotoInfoIcon: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  exPhotoDone: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },

  exBody: { flex: 1, padding: Spacing.sm, gap: 6 },
  exTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  exNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exNumberText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  exName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 18 },
  exNameDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  exMuscle: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 1 },
  intensityBadge: { borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },

  exStats: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  exStatItem: { alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.xs, paddingHorizontal: 8, paddingVertical: 4 },
  exStatVal: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  exStatLabel: { fontSize: FontSize.micro, color: Colors.textMuted },

  miniSetsRow: { flexDirection: 'row', gap: 5 },
  miniSetDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceBorder },

  reorderBtns: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  reorderBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  reorderBtnDisabled: { opacity: 0.3 },
  infoBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '33', marginLeft: 4 },

  restDay: { alignItems: 'center', paddingVertical: 48 },
  restIcon: { fontSize: 48, marginBottom: 16 },
  restTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  restSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },
});
