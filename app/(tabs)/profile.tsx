import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Language } from '@/constants/i18n';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'very_active', 'athlete'] as const;
const GOALS = ['muscle_gain', 'fat_loss', 'optimize_hormones', 'longevity', 'endurance', 'general_health'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, healthScore, biomarkers } = useHealth();
  const { t, language, setLanguage } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    updateProfile(localProfile);
    setEditing(false);
  };

  const bmr = profile.gender === 'male'
    ? 88.362 + 13.397 * profile.weight + 4.799 * profile.height - 5.677 * profile.age
    : 447.593 + 9.247 * profile.weight + 3.098 * profile.height - 4.330 * profile.age;
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725, athlete: 1.9 };
  const tdee = Math.round(bmr * multipliers[profile.activityLevel]);
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);

  const LANGS: Array<{ code: Language; label: string; flag: string }> = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'عربي', flag: '🇹🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const goalLabels: Record<string, string> = {
    muscle_gain: language === 'ar' ? 'بناء العضلات' : language === 'fr' ? 'Prise de masse' : 'Muscle Gain',
    fat_loss: language === 'ar' ? 'حرق الدهون' : language === 'fr' ? 'Perte de graisse' : 'Fat Loss',
    optimize_hormones: language === 'ar' ? 'تحسين الهرمونات' : language === 'fr' ? 'Optimiser les hormones' : 'Optimize Hormones',
    longevity: language === 'ar' ? 'طول العمر' : language === 'fr' ? 'Longévité' : 'Longevity',
    endurance: language === 'ar' ? 'التحمل' : language === 'fr' ? 'Endurance' : 'Endurance',
    general_health: language === 'ar' ? 'الصحة العامة' : language === 'fr' ? 'Santé générale' : 'General Health',
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.scoreRing}>
              <Text style={styles.scoreRingText}>{healthScore}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>
            {profile.age} {t('age')} · {profile.weight}{t('g').replace('g','kg')} · {profile.height}cm
          </Text>
          <View style={styles.profileGoals}>
            {profile.goals.slice(0, 3).map(g => (
              <View key={g} style={styles.goalChip}>
                <Text style={styles.goalText}>{goalLabels[g] || g}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bio Stats */}
        <View style={styles.bioStatsRow}>
          {[
            { label: t('bmi'), value: bmi, icon: 'monitor-weight', color: parseFloat(bmi) < 18.5 || parseFloat(bmi) > 25 ? Colors.warning : Colors.success },
            { label: t('bmr'), value: `${Math.round(bmr)}`, icon: 'whatshot', color: Colors.gold },
            { label: t('tdee'), value: `${tdee}`, icon: 'local-fire-department', color: Colors.primary },
          ].map((stat, i) => (
            <View key={i} style={styles.bioStat}>
              <MaterialIcons name={stat.icon as any} size={20} color={stat.color} />
              <Text style={[styles.bioStatValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.bioStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Deficiency Summary */}
        {biomarkers.filter(b => b.value < b.normalMin).length > 0 && (
          <View style={styles.deficiencyCard}>
            <View style={styles.deficiencyHeader}>
              <MaterialIcons name="warning-amber" size={18} color={Colors.warning} />
              <Text style={styles.deficiencyTitle}>{t('deficiencies_detected')}</Text>
            </View>
            {biomarkers.filter(b => b.value < b.normalMin).map(b => (
              <View key={b.id} style={styles.deficiencyRow}>
                <Text style={styles.deficiencyName}>{b.name}</Text>
                <Text style={styles.deficiencyValue}>{b.value} {b.unit}</Text>
                <Text style={styles.deficiencyNormal}>(min: {b.normalMin})</Text>
              </View>
            ))}
          </View>
        )}

        {/* Edit Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('personal_info')}</Text>
            <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
              <Text style={styles.editBtn}>{editing ? t('save') : t('edit')}</Text>
            </TouchableOpacity>
          </View>
          {[
            { label: t('age'), key: 'age', value: localProfile.age, unit: 'ans' },
            { label: t('weight'), key: 'weight', value: localProfile.weight, unit: 'kg' },
            { label: t('height'), key: 'height', value: localProfile.height, unit: 'cm' },
          ].map(field => (
            <View key={field.key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={String(field.value)}
                  onChangeText={v => setLocalProfile(prev => ({ ...prev, [field.key]: Number(v) } as any))}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.fieldValue}>{field.value} <Text style={styles.fieldUnit}>{field.unit}</Text></Text>
              )}
            </View>
          ))}

          {/* Gender */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('gender')}</Text>
            {editing ? (
              <View style={styles.genderPicker}>
                {(['male', 'female'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, localProfile.gender === g && styles.genderChipActive]}
                    onPress={() => setLocalProfile(prev => ({ ...prev, gender: g }))}
                  >
                    <Text style={[styles.genderChipText, localProfile.gender === g && styles.genderChipTextActive]}>
                      {t(g)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.fieldValue}>{t(profile.gender)}</Text>
            )}
          </View>
        </View>

        {/* Activity Level */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('activity_level')}</Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.activityChip, profile.activityLevel === level && styles.activityChipActive]}
                onPress={() => updateProfile({ activityLevel: level })}
                activeOpacity={0.8}
              >
                <Text style={[styles.activityText, profile.activityLevel === level && styles.activityTextActive]}>
                  {t(level)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goals */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('health_goals')}</Text>
          <View style={styles.goalsGrid}>
            {GOALS.map(goal => {
              const isActive = profile.goals.includes(goal);
              return (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalSelectChip, isActive && styles.goalSelectChipActive]}
                  onPress={() => {
                    const updated = isActive ? profile.goals.filter(g => g !== goal) : [...profile.goals, goal];
                    updateProfile({ goals: updated });
                  }}
                  activeOpacity={0.8}
                >
                  {isActive && <MaterialIcons name="check" size={12} color={Colors.primary} />}
                  <Text style={[styles.goalSelectText, isActive && styles.goalSelectTextActive]}>
                    {goalLabels[goal]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('app_language')}</Text>
          <View style={styles.langOptions}>
            {LANGS.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langChip, language === lang.code && styles.langChipActive]}
                onPress={() => setLanguage(lang.code)}
                activeOpacity={0.8}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>{lang.label}</Text>
                {language === lang.code && <MaterialIcons name="check-circle" size={16} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.sectionCard}>
          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.sectionTitle}>{t('notifications')}</Text>
              <Text style={styles.notifSub}>
                {language === 'ar' ? 'تنبيهات الوجبات والتدريب' : language === 'fr' ? 'Rappels repas & entraînement' : 'Meal & workout reminders'}
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.md },

  profileHeader: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary,
  },
  avatarText: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.primary },
  scoreRing: {
    position: 'absolute', bottom: -4, right: -4,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  scoreRingText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  profileName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  profileSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  profileGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  goalChip: {
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.primary + '44',
  },
  goalText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },

  bioStatsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  bioStat: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: 4 },
  bioStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  bioStatLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  deficiencyCard: {
    backgroundColor: Colors.warningMuted, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '44',
  },
  deficiencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  deficiencyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.warning },
  deficiencyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  deficiencyName: { fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1 },
  deficiencyValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.warning },
  deficiencyNormal: { fontSize: FontSize.xs, color: Colors.textMuted },

  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  editBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },

  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  fieldValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  fieldUnit: { fontWeight: FontWeight.regular, color: Colors.textMuted },
  fieldInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 6, color: Colors.textPrimary,
    fontSize: FontSize.sm, minWidth: 80, textAlign: 'right',
  },
  genderPicker: { flexDirection: 'row', gap: 8 },
  genderChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  genderChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  genderChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  genderChipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  activityChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  activityText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  activityTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalSelectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  goalSelectChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  goalSelectText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  goalSelectTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  langOptions: { gap: 8 },
  langChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  langChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  langLabelActive: { color: Colors.textPrimary },

  notifRow: { flexDirection: 'row', alignItems: 'center' },
  notifInfo: { flex: 1 },
  notifSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
