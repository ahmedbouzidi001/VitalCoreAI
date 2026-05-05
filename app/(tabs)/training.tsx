// VitalCore AI — Training Screen v5 — Science-Based AI Generation + Manual Entry
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, Vibration, Platform, TextInput, Modal, Dimensions,
  Alert,
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

// ── Exercise Images (Unsplash) ─────────────────────────────────────────────────
const EXERCISE_IMAGES: Record<string, string> = {
  bench: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  squat: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
  deadlift: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  pullup: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a07?w=400&q=80',
  shoulder: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
  row: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  lunge: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80',
};

function getExerciseImage(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('bench') || n.includes('pec') || n.includes('presse') || n.includes('développé cou')) return EXERCISE_IMAGES.bench;
  if (n.includes('squat') || n.includes('goblet') || n.includes('accroupi')) return EXERCISE_IMAGES.squat;
  if (n.includes('deadlift') || n.includes('soulevé') || n.includes('terra')) return EXERCISE_IMAGES.deadlift;
  if (n.includes('pull') || n.includes('traction') || n.includes('chin') || n.includes('lat')) return EXERCISE_IMAGES.pullup;
  if (n.includes('shoulder') || n.includes('épaul') || n.includes('militaire') || n.includes('overhead')) return EXERCISE_IMAGES.shoulder;
  if (n.includes('row') || n.includes('tirage') || n.includes('rowing') || n.includes('rameur')) return EXERCISE_IMAGES.row;
  if (n.includes('lunge') || n.includes('fente') || n.includes('bulgare')) return EXERCISE_IMAGES.lunge;
  return EXERCISE_IMAGES.default;
}

// ── Science-based exercise tips ────────────────────────────────────────────────
const EXERCISE_TIPS: Record<string, { cues: string[]; mistakes: string[]; breathing: string; science: string }> = {
  bench: {
    cues: ['Omoplates rétractées et déprimées sur le banc', 'Grip 81cm (repères annulaires sur les lignes)', 'Descente contrôlée 3s, coudes à ~75°', 'Poussez en arc — pieds plantés, hanches sur banc'],
    mistakes: ['Coudes à 90° (surcharge épaules)', 'Rebond sur la poitrine', 'Dos en hyperextension excessive', 'Grip trop large ou trop étroit'],
    breathing: 'Inspirez avant descente, blocage de Valsalva, expirez au lock-out',
    science: 'Schoenfeld et al. 2017 — angle de barre optimal à 75° pour maximiser recrutement pectoral',
  },
  squat: {
    cues: ['Stance à largeur d\'épaules, orteils 15-30° vers l\'ext.', 'Genoux dans l\'axe des orteils (external cue)', 'Profondeur ≥ parallèle (hanches sous genoux)', 'Chest up — regard neutre ou légèrement haut'],
    mistakes: ['Valgus des genoux (effondrement médial)', 'Talons décollés (manque dorsiflexion)', 'Penché excessif (trop quad ou dos dominant)', 'Demi-squat — ROM incomplet'],
    breathing: 'Inspirez, pression intra-abdominale (Valsalva), expirez en passant le sticking point',
    science: 'Wretenberg 1996 — squats profonds activent 25% plus les ischio que parallèle',
  },
  deadlift: {
    cues: ['Barre sur milieu du pied (par-dessus les lacets)', 'Tibia vertical, hanche en arrière', 'Latissimus engagés avant de tirer (protect the armpits)', 'Drive le sol, barre près du corps'],
    mistakes: ['Dos rond lombaire (hernie disque)', 'Barre s\'éloigne du corps', 'Hips qui montent avant la barre', 'Hyperextension en lock-out'],
    breathing: 'Grande inspiration abdominale, Valsalva strict, exhale seulement après lock-out',
    science: 'Escamilla et al. 2002 — sumo vs. conventionnel: similaire pour L4-L5, sumo réduit charge lombaire',
  },
  pullup: {
    cues: ['Grip pronation ou supination (chin-up)', 'Dépression scapulaire avant de tirer', 'Coudes vers les hanches — pas derrière la tête', 'Full extension en bas (dead hang) pour ROM complet'],
    mistakes: ['Kipping (momentum au lieu de force)', 'ROM incomplet (pas de full hang)', 'Trapèzes qui hausse au lieu de dorsaux', 'Tête vers l\'avant'],
    breathing: 'Expirez à la montée, inspirez à la descente',
    science: 'Youdas et al. 2010 — chin-up active 11% plus de biceps brachii; pull-up: activation dorsale similaire',
  },
  default: {
    cues: ['Contrôle excentrique 3 secondes', 'Poussez/tirez de façon explosive en concentrique', 'Gainage abdominal constant (intra-abdominal pressure)', 'Amplitude complète sauf douleur articulaire'],
    mistakes: ['Momentum excessif (triche le ROM)', 'Repos insuffisants entre les séries', 'Trop lourd, forme sacrifiée', 'Échauffement insuffisant'],
    breathing: 'Inspirez pendant la phase excentrique, expirez pendant la phase concentrique',
    science: 'Schoenfeld 2010 — le contrôle excentrique est critique pour l\'hypertrophie musculaire',
  },
};

function getExerciseTips(name: string) {
  const n = name.toLowerCase();
  if (n.includes('bench') || n.includes('pec') || n.includes('développé cou')) return EXERCISE_TIPS.bench;
  if (n.includes('squat') || n.includes('goblet')) return EXERCISE_TIPS.squat;
  if (n.includes('deadlift') || n.includes('soulevé') || n.includes('tierra')) return EXERCISE_TIPS.deadlift;
  if (n.includes('pull') || n.includes('traction') || n.includes('chin')) return EXERCISE_TIPS.pullup;
  return EXERCISE_TIPS.default;
}

// ── Workout Type Config ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { color: string; icon: string; gradient: string; label: string; desc: string; science: string }> = {
  hypertrophy: {
    color: Colors.primary, icon: 'fitness-center', gradient: Colors.primaryMuted,
    label: 'Hypertrophie', desc: '8-12 reps · 65-85% 1RM',
    science: 'Schoenfeld 2010',
  },
  strength: {
    color: Colors.gold, icon: 'bolt', gradient: Colors.goldMuted,
    label: 'Force', desc: '3-6 reps · 85-95% 1RM',
    science: 'Kraemer & Ratamess 2004',
  },
  endurance: {
    color: Colors.success, icon: 'directions-run', gradient: Colors.successMuted,
    label: 'Endurance', desc: '15-25 reps · Circuit',
    science: 'ACSM 2019',
  },
  longevity: {
    color: Colors.purple, icon: 'self-improvement', gradient: Colors.purpleMuted,
    label: 'Longévité', desc: '10-15 reps · Fonctionnel',
    science: 'Fiatarone-Singh 2014',
  },
  recovery: {
    color: Colors.textSecondary, icon: 'spa', gradient: 'rgba(138,155,193,0.12)',
    label: 'Récupération', desc: 'Mobilité · Léger',
    science: 'Monedero 2000',
  },
};

const SPLIT_TYPES = [
  { key: 'upper_lower', label: 'Upper/Lower', icon: 'swap-vert', desc: '4j/sem', detail: 'Haut + Bas du corps alternés — optimal débutant/intermédiaire' },
  { key: 'ppl', label: 'Push/Pull/Legs', icon: 'repeat', desc: '6j/sem', detail: 'Push · Pull · Legs — fréquence 2x/muscle' },
  { key: 'arnold', label: 'Arnold Split', icon: 'star', desc: '6j/sem', detail: 'Chest+Back · Épaules+Bras · Jambes' },
  { key: 'anterior_posterior', label: 'Ant/Post', icon: 'compare-arrows', desc: '4j/sem', detail: 'Chaînes antérieure et postérieure' },
  { key: 'full_body', label: 'Full Body', icon: 'accessibility-new', desc: '3j/sem', detail: 'Corps entier — fréquence max par muscle' },
  { key: 'bro_split', label: 'Bro Split', icon: 'sports-gymnastics', desc: '5j/sem', detail: '1 groupe musculaire/jour — volume élevé' },
] as const;

// ── Manual Exercise Entry Modal ────────────────────────────────────────────────
const MANUAL_MUSCLE_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdominaux', 'Avant-bras'];

function ManualExerciseModal({
  visible, onAdd, onClose, color, isAr,
}: {
  visible: boolean; onAdd: (ex: any) => void; onClose: () => void; color: string; isAr: boolean;
}) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Pectoraux');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [rest, setRest] = useState('90');
  const [technique, setTechnique] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      id: `manual_${Date.now()}`,
      name: name.trim(),
      nameAr: name.trim(),
      muscleGroup,
      sets: parseInt(sets) || 3,
      reps,
      rest: parseInt(rest) || 90,
      intensity: 'medium',
      technique: technique || 'Contrôle à la descente, amplitude complète',
      tempo: '2-0-2-0',
      rir: 2,
      progression: '+2.5kg quand toutes les séries complètes avec bonne forme',
      equipement: 'libre',
      category: 'compound',
      isManual: true,
    });
    setName(''); setTechnique('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={manStyles.overlay}>
        <View style={manStyles.panel}>
          <View style={manStyles.handle} />
          <View style={manStyles.header}>
            <View style={[manStyles.icon, { backgroundColor: color + '22' }]}>
              <MaterialIcons name="add-circle" size={22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={manStyles.title}>{isAr ? 'إضافة تمرين يدوي' : 'Ajouter un exercice'}</Text>
              <Text style={manStyles.sub}>{isAr ? 'أضف تمريناً مخصصاً لبرنامجك' : 'Personnalisez votre programme'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={manStyles.closeX}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            <Text style={manStyles.label}>{isAr ? 'اسم التمرين *' : 'Nom de l\'exercice *'}</Text>
            <TextInput
              style={[manStyles.input, { borderColor: name ? color : Colors.surfaceBorder }]}
              value={name} onChangeText={setName}
              placeholder={isAr ? 'مثال: ضغط الصدر' : 'Ex: Développé couché haltères'}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={manStyles.label}>{isAr ? 'المجموعة العضلية' : 'Groupe musculaire'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={manStyles.muscleRow}>
              {MANUAL_MUSCLE_GROUPS.map(mg => (
                <TouchableOpacity
                  key={mg}
                  style={[manStyles.muscleChip, muscleGroup === mg && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setMuscleGroup(mg)} activeOpacity={0.8}
                >
                  <Text style={[manStyles.muscleChipText, muscleGroup === mg && { color: Colors.textInverse }]}>{mg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={manStyles.row3}>
              {[
                { label: isAr ? 'الجلسات' : 'Séries', val: sets, set: setSets, kbType: 'numeric' as const },
                { label: isAr ? 'التكرارات' : 'Reps', val: reps, set: setReps, kbType: 'default' as const },
                { label: isAr ? 'الراحة (ث)' : 'Repos (s)', val: rest, set: setRest, kbType: 'numeric' as const },
              ].map((f, i) => (
                <View key={i} style={{ flex: 1 }}>
                  <Text style={manStyles.label}>{f.label}</Text>
                  <TextInput
                    style={manStyles.smallInput}
                    value={f.val} onChangeText={f.set}
                    keyboardType={f.kbType} selectTextOnFocus
                  />
                </View>
              ))}
            </View>

            <Text style={manStyles.label}>{isAr ? 'نقاط الأداء (اختياري)' : 'Points techniques (optionnel)'}</Text>
            <TextInput
              style={[manStyles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              value={technique} onChangeText={setTechnique}
              placeholder={isAr ? 'مثال: أبقِ الظهر مستقيماً...' : 'Ex: Gardez le dos droit, coudes près du corps...'}
              placeholderTextColor={Colors.textMuted}
              multiline numberOfLines={3}
            />

            <View style={manStyles.scienceNote}>
              <MaterialIcons name="science" size={13} color={Colors.gold} />
              <Text style={manStyles.scienceNoteText}>
                {isAr
                  ? 'تقنية جيدة = نتائج أفضل. أضف ملاحظات للأداء السليم.'
                  : 'Une bonne technique = meilleurs résultats. La progression suivra automatiquement.'
                }
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[manStyles.addBtn, { backgroundColor: name.trim() ? color : Colors.textMuted }]}
            onPress={handleAdd} disabled={!name.trim()} activeOpacity={0.85}
          >
            <MaterialIcons name="check-circle" size={20} color={Colors.textInverse} />
            <Text style={manStyles.addBtnText}>{isAr ? 'إضافة التمرين' : 'Ajouter l\'exercice'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const manStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  panel: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.md, paddingBottom: 36, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  closeX: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 12, color: Colors.textPrimary, fontSize: FontSize.sm, borderWidth: 1.5, borderColor: Colors.surfaceBorder },
  muscleRow: { gap: 6, paddingVertical: 4 },
  muscleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.surfaceBorder },
  muscleChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  row3: { flexDirection: 'row', gap: 10 },
  smallInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: 10, color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  scienceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.goldMuted, borderRadius: Radius.sm, padding: 10, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '33' },
  scienceNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 17 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, paddingVertical: 18, marginTop: Spacing.md, ...Shadow.primary },
  addBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
});

// ── Exercise Detail Modal ──────────────────────────────────────────────────────
function ExerciseDetailModal({ exercise, color, onClose, isAr }: {
  exercise: any; color: string; onClose: () => void; isAr: boolean;
}) {
  const tips = getExerciseTips(exercise.name);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <View style={edStyles.panel}>
          <View style={edStyles.handle} />
          <View style={edStyles.imgWrap}>
            <Image source={{ uri: getExerciseImage(exercise.name) }} style={edStyles.img} contentFit="cover" transition={300} />
            <View style={[edStyles.imgOverlay, { backgroundColor: color + '33' }]} />
            <View style={edStyles.imgBadge}>
              <MaterialIcons name="fitness-center" size={12} color={color} />
              <Text style={[edStyles.imgBadgeText, { color }]}>{exercise.muscleGroup}</Text>
            </View>
            {exercise.isManual && (
              <View style={edStyles.manualBadge}>
                <MaterialIcons name="edit" size={10} color={Colors.gold} />
                <Text style={edStyles.manualBadgeText}>Manuel</Text>
              </View>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <Text style={edStyles.exName}>{exercise.name}</Text>
            {exercise.technique ? (
              <View style={[edStyles.infoBox, { backgroundColor: color + '15', borderColor: color + '33' }]}>
                <MaterialIcons name="tips-and-updates" size={14} color={color} />
                <Text style={[edStyles.techniqueText, { color: color + 'CC' }]}>{exercise.technique}</Text>
              </View>
            ) : null}

            <Text style={edStyles.sectionLabel}>✅ {isAr ? 'نقاط الأداء الصحيح' : 'Points clés d\'exécution'}</Text>
            {tips.cues.map((cue, i) => (
              <View key={i} style={edStyles.cueRow}>
                <View style={[edStyles.cueDot, { backgroundColor: color }]} />
                <Text style={edStyles.cueText}>{cue}</Text>
              </View>
            ))}

            <Text style={[edStyles.sectionLabel, { marginTop: Spacing.sm }]}>⚠️ {isAr ? 'الأخطاء الشائعة' : 'Erreurs courantes à éviter'}</Text>
            {tips.mistakes.map((m, i) => (
              <View key={i} style={edStyles.cueRow}>
                <View style={[edStyles.cueDot, { backgroundColor: Colors.warning }]} />
                <Text style={[edStyles.cueText, { color: Colors.textSecondary }]}>{m}</Text>
              </View>
            ))}

            <View style={edStyles.breathRow}>
              <MaterialIcons name="air" size={14} color={Colors.primary} />
              <Text style={edStyles.breathText}>{tips.breathing}</Text>
            </View>

            {tips.science && (
              <View style={edStyles.scienceRow}>
                <MaterialIcons name="science" size={12} color={Colors.gold} />
                <Text style={edStyles.scienceText}>📚 {tips.science}</Text>
              </View>
            )}

            <View style={edStyles.statsRow}>
              {[
                { label: isAr ? 'جلسات' : 'Séries', val: String(exercise.sets) },
                { label: isAr ? 'تكرارات' : 'Reps', val: exercise.reps },
                { label: isAr ? 'راحة' : 'Repos', val: `${exercise.rest}s` },
                { label: 'Tempo', val: exercise.tempo || '2-0-2' },
              ].map((s, i) => (
                <View key={i} style={edStyles.statItem}>
                  <Text style={[edStyles.statVal, { color }]}>{s.val}</Text>
                  <Text style={edStyles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {exercise.progression && (
              <View style={edStyles.progressionBox}>
                <MaterialIcons name="trending-up" size={13} color={Colors.success} />
                <Text style={edStyles.progressionText}>{exercise.progression}</Text>
              </View>
            )}
            {exercise.equipement && (
              <View style={edStyles.equipRow}>
                <MaterialIcons name="sports-gymnastics" size={13} color={Colors.textMuted} />
                <Text style={edStyles.equipText}>{exercise.equipement}</Text>
              </View>
            )}
            <View style={{ height: 8 }} />
          </ScrollView>
          <TouchableOpacity style={edStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={edStyles.closeBtnText}>{isAr ? 'إغلاق' : 'Fermer'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const edStyles = StyleSheet.create({
  panel: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.md, paddingBottom: 28, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: Spacing.sm },
  imgWrap: { width: '100%', height: 170, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgOverlay: { position: 'absolute', inset: 0 },
  imgBadge: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.glass, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  imgBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  manualBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.goldMuted, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.gold + '55' },
  manualBadgeText: { fontSize: 10, color: Colors.gold, fontWeight: FontWeight.bold },
  exName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm, borderWidth: 1 },
  techniqueText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18, fontStyle: 'italic' },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8 },
  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  cueDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  cueText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  breathRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm, padding: 10, marginVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '33' },
  breathText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 17 },
  scienceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.goldMuted, borderRadius: Radius.sm, padding: 8, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '33' },
  scienceText: { flex: 1, fontSize: 10, color: Colors.gold, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  statItem: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 10, alignItems: 'center', gap: 3 },
  statVal: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  progressionBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.successMuted, borderRadius: Radius.sm, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.success + '33' },
  progressionText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, lineHeight: 17 },
  equipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  equipText: { fontSize: FontSize.xs, color: Colors.textMuted },
  closeBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, paddingVertical: 14, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  closeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});

// ── Weight Input Modal ─────────────────────────────────────────────────────────
function WeightInputModal({ visible, exerciseName, setNum, previousWeight, onConfirm, onSkip, color, isAr }: {
  visible: boolean; exerciseName: string; setNum: number; previousWeight: number | null;
  onConfirm: (weight: number, reps: number) => void; onSkip: () => void; color: string; isAr: boolean;
}) {
  const [weight, setWeight] = useState(previousWeight ? String(previousWeight) : '');
  const [reps, setReps] = useState('10');
  const adjWeight = (d: number) => {
    const v = Math.max(0, (parseFloat(weight) || 0) + d);
    setWeight(String(Number.isInteger(v) ? v : v.toFixed(1)));
  };
  const adjReps = (d: number) => setReps(String(Math.max(1, (parseInt(reps) || 10) + d)));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={[wStyles.panel, { borderTopColor: color }]}>
          <View style={wStyles.handle} />
          <Text style={wStyles.exName}>{exerciseName}</Text>
          <Text style={[wStyles.setInfo, { color }]}>
            {isAr ? `الجلسة ${setNum}` : `Série ${setNum}`}
            {previousWeight ? `  ·  PR: ${previousWeight} kg` : '  ·  Premier essai'}
          </Text>
          <View style={wStyles.adjustRow}>
            <View style={wStyles.adjustCol}>
              <Text style={wStyles.adjustLabel}>{isAr ? 'الوزن (كغ)' : 'POIDS (kg)'}</Text>
              <View style={wStyles.adjRow}>
                <TouchableOpacity onPress={() => adjWeight(-2.5)} style={wStyles.adjBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={wStyles.adjBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput style={[wStyles.adjInput, { color, borderColor: color + '66' }]} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted} selectTextOnFocus />
                <TouchableOpacity onPress={() => adjWeight(2.5)} style={wStyles.adjBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={wStyles.adjBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={wStyles.adjustCol}>
              <Text style={wStyles.adjustLabel}>{isAr ? 'التكرارات' : 'REPS'}</Text>
              <View style={wStyles.adjRow}>
                <TouchableOpacity onPress={() => adjReps(-1)} style={wStyles.adjBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={wStyles.adjBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput style={[wStyles.adjInput, { color: Colors.textPrimary, borderColor: Colors.surfaceBorder }]} value={reps} onChangeText={setReps} keyboardType="number-pad" selectTextOnFocus />
                <TouchableOpacity onPress={() => adjReps(1)} style={wStyles.adjBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={wStyles.adjBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity style={[wStyles.confirmBtn, { backgroundColor: color, shadowColor: color }]} onPress={() => onConfirm(parseFloat(weight) || 0, parseInt(reps) || 10)} activeOpacity={0.85}>
            <MaterialIcons name="check-circle" size={24} color={Colors.textInverse} />
            <Text style={wStyles.confirmText}>{isAr ? 'تأكيد الجلسة' : 'Série confirmée'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={wStyles.skipBtn} hitSlop={{ top: 8, bottom: 8, left: 32, right: 32 }}>
            <Text style={wStyles.skipText}>{isAr ? 'تخطي' : 'Passer sans peser'}</Text>
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
  adjBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  adjBtnText: { fontSize: 24, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  adjInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 8, fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center', borderWidth: 2, minWidth: 80 },
  confirmBtn: { borderRadius: Radius.lg, paddingVertical: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexDirection: 'row', gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  confirmText: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: FontSize.sm, color: Colors.textMuted },
});

// ── Advanced Timer ─────────────────────────────────────────────────────────────
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

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const volumeKg = allSetLogs.reduce((sum, l) => sum + (l.weight_kg * l.reps), 0);

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
    if (weight > 0) setPreviousWeights(prev => ({ ...prev, [exercise?.id]: weight }));
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
        <Text style={timerStyles.doneTime}>{fmt(totalSeconds)}</Text>
        {volumeKg > 0 && <View style={timerStyles.volumeBox}><Text style={timerStyles.volumeLabel}>Volume total</Text><Text style={timerStyles.volumeVal}>{volumeKg.toFixed(0)} kg</Text></View>}
        {allSetLogs.length > 0 && (
          <ScrollView style={{ maxHeight: 160, width: '100%' }} showsVerticalScrollIndicator={false}>
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
      <WeightInputModal visible={showWeightModal} exerciseName={exercise?.name || ''} setNum={currentSet} previousWeight={previousWeights[exercise?.id] ?? null} onConfirm={handleWeightConfirm} onSkip={() => handleWeightConfirm(0, parseInt(exercise?.reps) || 10)} color={color} isAr={isAr} />
      <View style={timerStyles.totalRow}>
        <MaterialIcons name="timer" size={14} color={Colors.textMuted} />
        <Text style={timerStyles.totalTime}>{fmt(totalSeconds)}</Text>
        {volumeKg > 0 && <Text style={timerStyles.volumeInline}>· {volumeKg.toFixed(0)}kg soulevés</Text>}
      </View>

      {phase === 'rest' ? (
        <View style={timerStyles.restPhase}>
          <View style={[timerStyles.phasePill, { backgroundColor: Colors.warning + '22', borderColor: Colors.warning + '55' }]}>
            <Text style={[timerStyles.phaseLabel, { color: Colors.warning }]}>⏸ {isAr ? 'فترة الراحة' : 'REPOS'}</Text>
          </View>
          <Text style={[timerStyles.countdownBig, { color: Colors.warning }]}>{fmt(restSeconds)}</Text>
          <Text style={timerStyles.nextLabel}>{isAr ? `الجلسة ${currentSet}/${totalSets}` : `Série suivante: ${currentSet}/${totalSets}`}</Text>
          <TouchableOpacity style={timerStyles.skipRestBtn} onPress={() => { clearInterval(restInterval.current); setPhase('work'); }} activeOpacity={0.8}>
            <MaterialIcons name="skip-next" size={20} color={Colors.textSecondary} />
            <Text style={timerStyles.skipRestText}>{isAr ? 'تخطي الراحة' : 'Passer le repos'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={timerStyles.workPhase}>
          <View style={[timerStyles.phasePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[timerStyles.phaseLabel, { color }]}>💪 {isAr ? 'جاري التدريب' : 'EN COURS'}</Text>
          </View>
          <View style={timerStyles.exPhotoWrap}>
            <Image source={{ uri: getExerciseImage(exercise?.name || '') }} style={timerStyles.exPhoto} contentFit="cover" />
            <View style={[timerStyles.exPhotoOverlay, { backgroundColor: color + '33' }]} />
          </View>
          <Text style={timerStyles.exerciseName} numberOfLines={2}>{exercise?.name}</Text>
          <View style={timerStyles.setsRow}>
            {Array.from({ length: totalSets }).map((_, i) => (
              <View key={i} style={[timerStyles.setDot, i < currentSet - 1 && { backgroundColor: Colors.success }, i === currentSet - 1 && { backgroundColor: color, width: 22, borderRadius: 5 }]} />
            ))}
          </View>
          <Text style={timerStyles.setLabel}>{isAr ? `الجلسة ${currentSet}/${totalSets} · ${exercise?.reps} تكرار` : `Série ${currentSet}/${totalSets} · ${exercise?.reps} reps`}</Text>
          {previousWeights[exercise?.id] != null && previousWeights[exercise?.id]! > 0 && (
            <View style={timerStyles.prevWeightRow}>
              <MaterialIcons name="history" size={13} color={Colors.gold} />
              <Text style={[timerStyles.prevWeightText, { color: Colors.gold }]}>PR: {previousWeights[exercise?.id]} kg</Text>
            </View>
          )}
          <TouchableOpacity style={[timerStyles.doneSetBtn, { backgroundColor: color }]} onPress={() => setShowWeightModal(true)} activeOpacity={0.8}>
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
  skipRestBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  skipRestText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  workPhase: { gap: 10 },
  exPhotoWrap: { width: '100%', height: 130, borderRadius: Radius.lg, overflow: 'hidden', position: 'relative' },
  exPhoto: { width: '100%', height: '100%' },
  exPhotoOverlay: { position: 'absolute', inset: 0 },
  exerciseName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  setsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' },
  setDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.surfaceBorder },
  setLabel: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', fontWeight: FontWeight.semibold },
  prevWeightRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: Colors.goldMuted, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.gold + '44' },
  prevWeightText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  doneSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: Radius.xl, paddingVertical: 22, marginTop: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  doneSetText: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  doneCard: { alignItems: 'center', padding: Spacing.xl, gap: 12, width: '100%' },
  doneIcon: { fontSize: 56 },
  doneTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  doneTime: { fontSize: FontSize.lg, color: Colors.textSecondary },
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
  const [activeSplit, setActiveSplit] = useState('upper_lower');
  const [workoutRunning, setWorkoutRunning] = useState(false);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>({});
  const [workoutSummary, setWorkoutSummary] = useState<{ totalTime: number; logs: any[]; volumeKg: number } | null>(null);
  const [showSplitPicker, setShowSplitPicker] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [customOrder, setCustomOrder] = useState<any[] | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualExercises, setManualExercises] = useState<any[]>([]);
  const [workoutId] = useState(() => `workout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [aiError, setAiError] = useState<string | null>(null);

  const session = weeklyWorkout[selectedDay];
  const aiExercises = customOrder ?? (session?.exercises || []);
  const displayExercises = [...aiExercises, ...manualExercises];
  const dayLabels = t('days').split(',');
  const cfg = session ? TYPE_CONFIG[session.type] || TYPE_CONFIG.recovery : TYPE_CONFIG.recovery;

  useEffect(() => {
    setCustomOrder(null);
    setManualExercises([]);
  }, [selectedDay, session?.name]);

  const moveExercise = useCallback((fromIdx: number, dir: 'up' | 'down') => {
    const toIdx = dir === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= displayExercises.length) return;
    const arr = [...displayExercises];
    [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
    // Split manual vs ai
    const aiPart = arr.filter(e => !e.isManual);
    const manPart = arr.filter(e => e.isManual);
    setCustomOrder(aiPart);
    setManualExercises(manPart);
  }, [displayExercises]);

  const handleAddManual = (ex: any) => setManualExercises(prev => [...prev, ex]);
  const handleRemoveManual = (id: string) => setManualExercises(prev => prev.filter(e => e.id !== id));

  const handleGenerateAI = useCallback(async () => {
    setAiError(null);
    try {
      await regenerateWorkout(activeType, activeSplit);
      setCustomOrder(null);
      setManualExercises([]);
      setShowSplitPicker(false);
    } catch (e: any) {
      setAiError(e.message || 'Erreur de génération IA');
    }
  }, [activeType, activeSplit, regenerateWorkout]);

  const handleExerciseComplete = (idx: number) => {
    if (displayExercises[idx]) setCompletedExercises(prev => new Set([...prev, displayExercises[idx].id]));
    if (idx < displayExercises.length - 1) setCurrentExerciseIdx(idx + 1);
  };

  const handleFinish = (totalTime: number, logs: any[]) => {
    setWorkoutRunning(false);
    const vol = logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps || 0), 0);
    setWorkoutSummary({ totalTime, logs, volumeKg: vol });
    if (user) addXP(user.id, 'complete_workout').catch(console.error);
  };

  const startWorkout = () => {
    if (displayExercises.length === 0) {
      Alert.alert(isAr ? 'لا يوجد تمارين' : 'Aucun exercice', isAr ? 'أضف تمارين أولاً' : 'Générez un programme IA ou ajoutez des exercices manuellement');
      return;
    }
    setCompletedExercises(new Set());
    setCompletedSets({});
    setCurrentExerciseIdx(0);
    setWorkoutSummary(null);
    setWorkoutRunning(true);
  };

  const completionPct = displayExercises.length ? (completedExercises.size / displayExercises.length) * 100 : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {selectedExercise && <ExerciseDetailModal exercise={selectedExercise} color={cfg.color} onClose={() => setSelectedExercise(null)} isAr={isAr} />}
      <ManualExerciseModal visible={showManualModal} onAdd={handleAddManual} onClose={() => setShowManualModal(false)} color={cfg.color} isAr={isAr} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('training_plan')}</Text>
          <Text style={styles.headerSub}>{isAr ? 'مبني على الدراسات العلمية' : 'Basé sur la science (NSCA · JAMA · ACSM)'}</Text>
        </View>
        <TouchableOpacity style={styles.splitPickerBtn} onPress={() => setShowSplitPicker(p => !p)} activeOpacity={0.8}>
          <MaterialIcons name="tune" size={16} color={Colors.primary} />
          <Text style={styles.splitPickerBtnText}>{SPLIT_TYPES.find(s => s.key === activeSplit)?.label || 'Split'}</Text>
          <MaterialIcons name={showSplitPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── AI Generator Panel ── */}
      {showSplitPicker && (
        <View style={styles.splitPanel}>
          <Text style={styles.splitPanelTitle}>{isAr ? '🧬 البرنامج العلمي' : '🧬 Programme scientifique'}</Text>
          <Text style={styles.splitPanelSub}>{isAr ? 'اختر نوع التقسيم — الذكاء الاصطناعي سيولّد برنامجاً مخصصاً' : "Choisissez le split — l'IA générera un programme personnalisé basé sur votre profil"}</Text>

          {/* Split Grid */}
          <View style={styles.splitGrid}>
            {SPLIT_TYPES.map(sp => (
              <TouchableOpacity key={sp.key} style={[styles.splitCard, activeSplit === sp.key && styles.splitCardActive]} onPress={() => setActiveSplit(sp.key)} activeOpacity={0.8}>
                <View style={[styles.splitCardIcon, activeSplit === sp.key && { backgroundColor: Colors.primary + '22' }]}>
                  <MaterialIcons name={sp.icon as any} size={20} color={activeSplit === sp.key ? Colors.primary : Colors.textMuted} />
                </View>
                <Text style={[styles.splitCardLabel, activeSplit === sp.key && styles.splitCardLabelActive]}>{sp.label}</Text>
                <Text style={styles.splitCardDesc}>{sp.detail}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Type selector */}
          <Text style={styles.splitPanelTitle}>{isAr ? '🎯 نوع التدريب' : '🎯 Type d\'entraînement'}</Text>
          <View style={styles.typeGridInPanel}>
            {Object.entries(TYPE_CONFIG).map(([key, c]) => (
              <TouchableOpacity
                key={key}
                style={[styles.typeCardInPanel, activeType === key && { borderColor: c.color, backgroundColor: c.gradient }]}
                onPress={() => setActiveType(key as any)} activeOpacity={0.8}
              >
                <MaterialIcons name={c.icon as any} size={18} color={activeType === key ? c.color : Colors.textMuted} />
                <View>
                  <Text style={[styles.typeCardLabel, activeType === key && { color: c.color }]}>{c.label}</Text>
                  <Text style={styles.typeCardDesc}>{c.science}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {aiError && (
            <View style={styles.aiErrorBanner}>
              <MaterialIcons name="error-outline" size={14} color={Colors.danger} />
              <Text style={styles.aiErrorText}>{aiError}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.generateBtn, isWorkoutLoading && { opacity: 0.6 }]} onPress={handleGenerateAI} disabled={isWorkoutLoading} activeOpacity={0.85}>
            {isWorkoutLoading ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <MaterialIcons name="auto-awesome" size={20} color={Colors.textInverse} />}
            <Text style={styles.generateBtnText}>
              {isWorkoutLoading ? (isAr ? 'الذكاء الاصطناعي يولّد...' : 'L\'IA génère votre programme...') : (isAr ? `توليد برنامج ${SPLIT_TYPES.find(s => s.key === activeSplit)?.label}` : `Générer ${SPLIT_TYPES.find(s => s.key === activeSplit)?.label} avec IA`)}
            </Text>
          </TouchableOpacity>

          {isWorkoutLoading && (
            <View style={styles.aiLoadingDetail}>
              <MaterialIcons name="science" size={14} color={Colors.primary} />
              <Text style={styles.aiLoadingDetailText}>
                {isAr ? 'يحلل الذكاء الاصطناعي ملفك الرياضي ويطبّق بروتوكولات NSCA و ACSM...' : "L'IA analyse votre profil athlétique et applique les protocoles NSCA, ACSM, et JAMA pour créer votre programme optimal..."}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Type Filter Bar — LARGE ── */}
      <View style={styles.typeFiltersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilters}>
          {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'recovery').map(([key, c]) => {
            const isActive = activeType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.typeChip, isActive && { backgroundColor: c.color, borderColor: c.color, ...Shadow.sm }]}
                onPress={() => setActiveType(key as any)}
                activeOpacity={0.8}
              >
                <MaterialIcons name={c.icon as any} size={18} color={isActive ? Colors.textInverse : c.color} />
                <View>
                  <Text style={[styles.typeChipLabel, isActive && styles.typeChipLabelActive]}>{c.label}</Text>
                  <Text style={[styles.typeChipDesc, isActive && { color: Colors.textInverse + 'BB' }]}>{c.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isWorkoutLoading && !showSplitPicker && (
        <View style={styles.aiLoadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.aiLoadingText}>{isAr ? 'الذكاء الاصطناعي يولّد برنامجك العلمي...' : "L'IA génère votre programme scientifique personnalisé..."}</Text>
        </View>
      )}

      {/* ── Day Selector ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarInner} style={styles.dayBar}>
        {weeklyWorkout.map((s, i) => {
          const sc = TYPE_CONFIG[s.type] || TYPE_CONFIG.recovery;
          const isActive = selectedDay === i;
          return (
            <TouchableOpacity key={i} style={[styles.dayChip, isActive && { backgroundColor: sc.color, borderColor: sc.color }]}
              onPress={() => { setSelectedDay(i); setWorkoutRunning(false); setWorkoutSummary(null); setCompletedExercises(new Set()); }} activeOpacity={0.8}>
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
            <View style={[styles.sessionCard, { backgroundColor: cfg.gradient, borderColor: cfg.color + '55' }]}>
              <View style={styles.sessionTop}>
                <View style={[styles.sessionIcon, { backgroundColor: cfg.color + '33' }]}>
                  <MaterialIcons name={cfg.icon as any} size={28} color={cfg.color} />
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionTypeRow}>
                    <Text style={[styles.sessionType, { color: cfg.color }]}>{session.type.toUpperCase()}</Text>
                    <View style={[styles.scienceBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '44' }]}>
                      <MaterialIcons name="science" size={10} color={cfg.color} />
                      <Text style={[styles.scienceBadgeText, { color: cfg.color }]}>{cfg.science}</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <View style={styles.sessionMeta}>
                    <View style={styles.sessionMetaItem}><MaterialIcons name="schedule" size={14} color={Colors.textMuted} /><Text style={styles.sessionMetaText}>{session.duration} min</Text></View>
                    <View style={styles.sessionMetaItem}><MaterialIcons name="repeat" size={14} color={Colors.textMuted} /><Text style={styles.sessionMetaText}>{displayExercises.length} ex.</Text></View>
                    {manualExercises.length > 0 && <View style={styles.sessionMetaItem}><MaterialIcons name="edit" size={14} color={Colors.gold} /><Text style={[styles.sessionMetaText, { color: Colors.gold }]}>{manualExercises.length} manuel(s)</Text></View>}
                  </View>
                </View>
              </View>

              {displayExercises.length > 0 && (
                <View style={styles.progressWrap}>
                  <Text style={styles.progressLabel}>{completedExercises.size}/{displayExercises.length} exercices</Text>
                  <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${completionPct}%`, backgroundColor: cfg.color }]} /></View>
                </View>
              )}

              {session.scienceTip ? (
                <View style={styles.scienceBox}>
                  <MaterialIcons name="science" size={14} color={cfg.color} />
                  <Text style={[styles.scienceTip, { color: cfg.color + 'CC' }]}>
                    {language === 'ar' && session.scienceTipAr ? session.scienceTipAr : session.scienceTip}
                  </Text>
                </View>
              ) : null}

              {session.warmup ? (
                <View style={styles.warmupBox}>
                  <Text style={styles.warmupLabel}>🔥 {isAr ? 'الإحماء' : 'Échauffement'}</Text>
                  <Text style={styles.warmupText}>{session.warmup}</Text>
                </View>
              ) : null}

              {!workoutRunning && !workoutSummary && (
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: cfg.color, shadowColor: cfg.color }]} onPress={startWorkout} activeOpacity={0.85}>
                  <MaterialIcons name="play-circle-filled" size={28} color={Colors.textInverse} />
                  <Text style={styles.startBtnText}>{isAr ? 'بدء التدريب' : 'Démarrer la séance'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Workout Summary */}
            {workoutSummary && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>🏆 {isAr ? 'انتهت الجلسة!' : 'Séance terminée !'}</Text>
                <Text style={styles.summaryDetail}>{completedExercises.size}/{displayExercises.length} ex. · {Math.floor(workoutSummary.totalTime / 60)} min</Text>
                {workoutSummary.volumeKg > 0 && <Text style={styles.summaryVolume}>Volume: {workoutSummary.volumeKg.toFixed(0)} kg</Text>}
                <TouchableOpacity style={styles.newSessionBtn} onPress={startWorkout} activeOpacity={0.8}>
                  <Text style={styles.newSessionText}>{isAr ? 'إعادة' : 'Recommencer'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Timer */}
            {workoutRunning && displayExercises.length > 0 && (
              <AdvancedTimer exercises={displayExercises} currentExerciseIdx={currentExerciseIdx} onExerciseComplete={handleExerciseComplete} onFinish={handleFinish} onSetComplete={(ei, si) => { const exId = displayExercises[ei]?.id || ''; setCompletedSets(prev => ({ ...prev, [exId]: [...(prev[exId] || []), si] })); }} color={cfg.color} workoutId={workoutId} userId={user?.id || null} isAr={isAr} />
            )}

            {/* Exercise List */}
            <View style={styles.exerciseListHeader}>
              <Text style={styles.sectionTitle}>
                {isAr ? `البرنامج (${displayExercises.length} تمرين)` : `Programme (${displayExercises.length} exercices)`}
              </Text>
              {!workoutRunning && (
                <View style={styles.exerciseActions}>
                  <TouchableOpacity style={styles.addManualBtn} onPress={() => setShowManualModal(true)} activeOpacity={0.8}>
                    <MaterialIcons name="add" size={16} color={cfg.color} />
                    <Text style={[styles.addManualText, { color: cfg.color }]}>{isAr ? 'إضافة' : 'Ajouter'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {displayExercises.length === 0 && !isWorkoutLoading && (
              <View style={styles.emptyExercises}>
                <MaterialIcons name="fitness-center" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyExTitle}>{isAr ? 'لا يوجد تمارين بعد' : 'Aucun exercice'}</Text>
                <Text style={styles.emptyExDesc}>{isAr ? 'اضغط على "IA توليد" أو أضف تمارين يدوياً' : "Générez un programme IA ou ajoutez des exercices manuellement"}</Text>
                <View style={styles.emptyExBtns}>
                  <TouchableOpacity style={[styles.emptyExBtn, { backgroundColor: Colors.primary }]} onPress={() => setShowSplitPicker(true)} activeOpacity={0.85}>
                    <MaterialIcons name="auto-awesome" size={16} color={Colors.textInverse} />
                    <Text style={styles.emptyExBtnText}>{isAr ? 'توليد IA' : 'Générer IA'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.emptyExBtn, { backgroundColor: Colors.goldMuted, borderWidth: 1, borderColor: Colors.gold + '44' }]} onPress={() => setShowManualModal(true)} activeOpacity={0.85}>
                    <MaterialIcons name="edit" size={16} color={Colors.gold} />
                    <Text style={[styles.emptyExBtnText, { color: Colors.gold }]}>{isAr ? 'يدوي' : 'Manuel'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {displayExercises.map((ex, i) => {
              const isActive = workoutRunning && i === currentExerciseIdx;
              const done = completedExercises.has(ex.id);
              const setsCompleted = completedSets[ex.id]?.length || 0;
              const ic = ex.intensity === 'high' ? Colors.danger : ex.intensity === 'medium' ? Colors.warning : Colors.success;

              return (
                <View key={`${ex.id}-${i}`} style={[styles.exCard, done && styles.exCardDone, isActive && { borderColor: cfg.color, borderWidth: 2 }, ex.isManual && { borderColor: Colors.gold + '55', borderStyle: 'dashed' as const }]}>
                  <TouchableOpacity onPress={() => setSelectedExercise(ex)} activeOpacity={0.85}>
                    <View style={styles.exPhotoWrap}>
                      <Image source={{ uri: getExerciseImage(ex.name) }} style={styles.exPhoto} contentFit="cover" transition={200} />
                      <View style={[styles.exPhotoOverlay, { backgroundColor: isActive ? cfg.color + '44' : 'rgba(8,15,30,0.45)' }]} />
                      {ex.isManual && (
                        <View style={styles.manualTag}>
                          <MaterialIcons name="edit" size={10} color={Colors.gold} />
                          <Text style={styles.manualTagText}>Manuel</Text>
                        </View>
                      )}
                      {done && <View style={styles.exPhotoDone}><MaterialIcons name="check-circle" size={26} color={Colors.success} /></View>}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.exBody}>
                    <View style={styles.exTopRow}>
                      <View style={[styles.exNumber, isActive && { backgroundColor: cfg.color }]}>
                        {done ? <MaterialIcons name="check" size={14} color={Colors.success} /> : isActive ? <MaterialIcons name="play-arrow" size={14} color={Colors.textInverse} /> : <Text style={[styles.exNumberText, { color: cfg.color }]}>{i + 1}</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.exName, done && styles.exNameDone]} numberOfLines={2}>{language === 'ar' && ex.nameAr ? ex.nameAr : ex.name}</Text>
                        <Text style={styles.exMuscle}>{ex.muscleGroup}</Text>
                      </View>
                      <View style={[styles.intensityBadge, { backgroundColor: ic + '22' }]}>
                        <Text style={{ fontSize: 11 }}>{ex.intensity === 'high' ? '🔥' : ex.intensity === 'medium' ? '⚡' : '✓'}</Text>
                      </View>
                    </View>

                    <View style={styles.exStats}>
                      {[
                        { label: 'Séries', val: String(ex.sets) },
                        { label: 'Reps', val: ex.reps },
                        { label: 'Repos', val: `${ex.rest}s` },
                        ...(ex.tempo ? [{ label: 'Tempo', val: ex.tempo }] : []),
                        ...(ex.rir !== undefined ? [{ label: 'RIR', val: String(ex.rir) }] : []),
                      ].map((s, idx) => (
                        <View key={idx} style={styles.exStatItem}>
                          <Text style={[styles.exStatVal, { color: isActive ? cfg.color : Colors.textPrimary }]}>{s.val}</Text>
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

                    {!workoutRunning && (
                      <View style={styles.reorderBtns}>
                        <TouchableOpacity style={[styles.reorderBtn, i === 0 && styles.reorderBtnDisabled]} onPress={() => moveExercise(i, 'up')} disabled={i === 0} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MaterialIcons name="keyboard-arrow-up" size={18} color={i === 0 ? Colors.textMuted : Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.reorderBtn, i === displayExercises.length - 1 && styles.reorderBtnDisabled]} onPress={() => moveExercise(i, 'down')} disabled={i === displayExercises.length - 1} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MaterialIcons name="keyboard-arrow-down" size={18} color={i === displayExercises.length - 1 ? Colors.textMuted : Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.reorderBtn, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary + '33' }]} onPress={() => setSelectedExercise(ex)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MaterialIcons name="info-outline" size={16} color={cfg.color} />
                        </TouchableOpacity>
                        {ex.isManual && (
                          <TouchableOpacity style={[styles.reorderBtn, { backgroundColor: Colors.dangerMuted, borderColor: Colors.danger + '33' }]} onPress={() => handleRemoveManual(ex.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <MaterialIcons name="delete-outline" size={16} color={Colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {session.cooldown && !workoutRunning && (
              <View style={styles.cooldownBox}>
                <MaterialIcons name="self-improvement" size={16} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cooldownLabel}>{isAr ? '❄️ العودة للهدوء' : '❄️ Retour au calme'}</Text>
                  <Text style={styles.cooldownText}>{session.cooldown}</Text>
                </View>
              </View>
            )}

            {displayExercises.length === 0 && isWorkoutLoading && (
              <View style={styles.restDay}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={[styles.restTitle, { color: Colors.primary, marginTop: 16 }]}>{isAr ? 'الذكاء الاصطناعي يولّد...' : "L'IA génère votre programme..."}</Text>
              </View>
            )}

            {session.type === 'recovery' && displayExercises.length === 0 && !isWorkoutLoading && (
              <View style={styles.restDay}>
                <Text style={styles.restIcon}>😴</Text>
                <Text style={styles.restTitle}>{isAr ? 'يوم الراحة' : 'Jour de Repos'}</Text>
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
  headerSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  splitPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary + '44' },
  splitPickerBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },

  splitPanel: { marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '33', ...Shadow.sm },
  splitPanelTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4, marginTop: Spacing.sm },
  splitPanelSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, lineHeight: 17 },
  splitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  splitCard: { width: (width - 48 - 16) / 2 - 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 4 },
  splitCardActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primaryMuted },
  splitCardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  splitCardLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  splitCardLabelActive: { color: Colors.primary },
  splitCardDesc: { fontSize: FontSize.micro, color: Colors.textMuted, lineHeight: 14 },

  typeGridInPanel: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  typeCardInPanel: { width: (width - 64 - 16) / 2 - 4, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1.5, borderColor: Colors.surfaceBorder },
  typeCardLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  typeCardDesc: { fontSize: FontSize.micro, color: Colors.textMuted },

  aiErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerMuted, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.danger + '33' },
  aiErrorText: { flex: 1, fontSize: FontSize.xs, color: Colors.danger },

  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: 18, ...Shadow.primary, marginBottom: Spacing.sm },
  generateBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  aiLoadingDetail: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm, padding: 10, borderWidth: 1, borderColor: Colors.primary + '33' },
  aiLoadingDetailText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 17 },

  typeFiltersWrap: { marginBottom: Spacing.sm },
  typeFilters: { paddingHorizontal: Spacing.md, gap: 10, paddingVertical: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.surfaceBorder, minHeight: 58 },
  typeChipLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  typeChipLabelActive: { color: Colors.textInverse },
  typeChipDesc: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 1 },

  aiLoadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.primary + '33' },
  aiLoadingText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary },

  dayBar: { marginBottom: Spacing.md },
  dayBarInner: { paddingHorizontal: Spacing.md, gap: 8 },
  dayChip: { alignItems: 'center', gap: 3, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  dayChipDay: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayChipDayActive: { color: Colors.textInverse, fontWeight: FontWeight.bold },

  scroll: { paddingHorizontal: Spacing.md },

  sessionCard: { borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, ...Shadow.md },
  sessionTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  sessionIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sessionInfo: { flex: 1 },
  sessionTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sessionType: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1.5 },
  scienceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  scienceBadgeText: { fontSize: FontSize.micro, fontWeight: FontWeight.bold },
  sessionName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 6, lineHeight: 22 },
  sessionMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  sessionMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },

  progressWrap: { marginBottom: Spacing.sm },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 6 },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  scienceBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  scienceTip: { flex: 1, fontSize: FontSize.xs, lineHeight: 18, fontStyle: 'italic' },

  warmupBox: { backgroundColor: 'rgba(255,152,0,0.08)', borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '22' },
  warmupLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning, marginBottom: 3 },
  warmupText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: Radius.xl, paddingVertical: 22, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 },
  startBtnText: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textInverse },

  summaryCard: { backgroundColor: Colors.goldMuted, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '44', alignItems: 'center', gap: 8, ...Shadow.sm },
  summaryTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  summaryDetail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryVolume: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.gold },
  newSessionBtn: { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: 28, paddingVertical: 14, ...Shadow.gold },
  newSessionText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },

  exerciseListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  exerciseActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addManualBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.surfaceBorder },
  addManualText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  emptyExercises: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyExTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptyExDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  emptyExBtns: { flexDirection: 'row', gap: 12, marginTop: Spacing.sm },
  emptyExBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 20 },
  emptyExBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },

  exCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden', ...Shadow.sm },
  exCardDone: { borderColor: Colors.success + '66', backgroundColor: Colors.successMuted },
  exPhotoWrap: { width: 90, height: 120, position: 'relative' },
  exPhoto: { width: 90, height: 120 },
  exPhotoOverlay: { position: 'absolute', inset: 0 },
  manualTag: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.goldMuted, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: Colors.gold + '55' },
  manualTagText: { fontSize: 9, color: Colors.gold, fontWeight: FontWeight.bold },
  exPhotoDone: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  exBody: { flex: 1, padding: Spacing.sm, gap: 6 },
  exTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  exNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exNumberText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  exName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 18 },
  exNameDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  exMuscle: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 1 },
  intensityBadge: { borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  exStats: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  exStatItem: { alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.xs, paddingHorizontal: 7, paddingVertical: 4 },
  exStatVal: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  exStatLabel: { fontSize: FontSize.micro, color: Colors.textMuted },
  miniSetsRow: { flexDirection: 'row', gap: 5 },
  miniSetDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceBorder },
  reorderBtns: { flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap' },
  reorderBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  reorderBtnDisabled: { opacity: 0.3 },

  cooldownBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.successMuted, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.success + '33' },
  cooldownLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.success, marginBottom: 3 },
  cooldownText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  restDay: { alignItems: 'center', paddingVertical: 48 },
  restIcon: { fontSize: 48, marginBottom: 16 },
  restTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  restSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },
});
