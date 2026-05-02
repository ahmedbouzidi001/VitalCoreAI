
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Language } from '@/constants/i18n';
import { enableAllNotifications, cancelAllNotifications } from '@/services/notifications';
import { loadStreaks, getXPLevel } from '@/services/gamification';
import { generateHealthReportPDF } from '@/services/pdfReport';
// import { useAlert } from '@/template'; // Duplicate import, removed

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'very_active', 'athlete'] as const;
const GOALS = ['muscle_gain', 'fat_loss', 'optimize_hormones', 'longevity', 'endurance', 'general_health'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, updateProfile, healthScore, biomarkers, deficiencies } = useHealth();
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [notifications, setNotifications] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [userXP, setUserXP] = useState(0);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    if (user) {
      loadStreaks(user.id).then(s => setUserXP(s.xp));
    }
  }, [user?.id]);

  const levelData = getXPLevel(userXP);

  const handleToggleNotifications = async (value: boolean) => {
    setNotifLoading(true);
    if (value) {
      const ok = await enableAllNotifications(language);
      setNotifications(ok);
      if (!ok) {
        showAlert('Permission requise', 'Activez les notifications dans les paramètres de votre appareil.');
      }
    } else {
      await cancelAllNotifications();
      setNotifications(false);
    }
    setNotifLoading(false);
  };

  const handleSave = () => {
    updateProfile(localProfile);
    setEditing(false);
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    const { success, error } = await generateHealthReportPDF({
      userName: displayName,
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      healthScore,
      profile,
      biomarkers,
      deficiencies: deficiencies.map(d => d.name),
      dailyStats: { calories: 0, water: 0, steps: 0, sleep: 0 },
      aiSummary: undefined,
    });
    setExportingPDF(false);
    if (!success) showAlert('Erreur', error || 'Export PDF échoué');
  };

  const handleLogout = async () => {
    showAlert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/login');
        }
      }
    ]);
  };

  const bmr = profile.gender === 'male'
    ? 88.362 + 13.397 * profile.weight + 4.799 * profile.height - 5.677 * profile.age
    : 447.593 + 9.247 * profile.weight + 3.098 * profile.height - 4.330 * profile.age;
  const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725, athlete: 1.9 };
  const tdee = Math.round(bmr * (multipliers[profile.activityLevel] || 1.55));
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
  const bmiFloat = parseFloat(bmi);
  const bmiColor = bmiFloat < 18.5 ? Colors.warning : bmiFloat > 25 ? Colors.danger : Colors.success;

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

  const scoreColor = healthScore >= 75 ? Colors.success : healthScore >= 50 ? Colors.warning : Colors.danger;
  const displayName = user ? user.email?.split('@')[0] || 'Utilisateur' : profile.name;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Auth Status Banner */}
        {user ? (
          <View style={styles.authBanner}>
            <MaterialIcons name="verified-user" size={16} color={Colors.success} />
            <Text style={styles.authText}>{user.email}</Text>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Synchronisé</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.loginBanner} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <MaterialIcons name="login" size={16} color={Colors.primary} />
            <Text style={styles.loginBannerText}>Connectez-vous pour synchroniser vos données</Text>
            <MaterialIcons name="arrow-forward-ios" size={12} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {/* XP & Achievements Banner */}
        <TouchableOpacity style={styles.xpBanner} onPress={() => router.push('/achievements')} activeOpacity={0.85}>
          <View style={styles.xpBannerLeft}>
            <Text style={styles.xpBannerIcon}>⭐</Text>
            <View>
              <Text style={styles.xpBannerTitle}>{userXP} XP · Niveau {levelData.level} — {levelData.title}</Text>
              <View style={styles.xpBannerBar}>
                <View style={[styles.xpBannerFill, { width: `${levelData.progress * 100}%` }]} />
              </View>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.gold} />
        </TouchableOpacity>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.scoreRing, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreRingText}>{healthScore}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileSub}>{profile.age} ans · {profile.weight}kg · {profile.height}cm</Text>
          <View style={styles.profileGoals}>
            {profile.goals.slice(0, 3).map(g => (
              <View key={g} style={styles.goalChip}>
                <Text style={styles.goalText}>{goalLabels[g] || g}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Premium Banner */}
        <TouchableOpacity style={styles.premiumBanner} onPress={() => router.push('/premium')} activeOpacity={0.87}>
          <View style={styles.premiumLeft}>
            <MaterialIcons name="workspace-premium" size={20} color={Colors.gold} />
            <View>
              <Text style={styles.premiumTitle}>{language === 'ar' ? 'ترقية إلى بريميوم' : 'Passer à Premium'}</Text>
              <Text style={styles.premiumSub}>{language === 'ar' ? 'تحليلات غير محدودة · PDF · ذكاء اصطناعي' : 'Analyses illimitées · PDF · Chat IA · Recettes'}</Text>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.gold} />
        </TouchableOpacity>

        {/* Chat IA + Weight Tracker buttons */}
        <View style={styles.actionBtnsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/chat')} activeOpacity={0.85}>
            <MaterialIcons name="psychology" size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>{language === 'ar' ? 'ذكاء اصطناعي' : 'Chat IA'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.gold + '44', backgroundColor: Colors.goldMuted }]} onPress={() => router.push('/weight-tracker')} activeOpacity={0.85}>
            <MaterialIcons name="monitor-weight" size={18} color={Colors.gold} />
            <Text style={[styles.actionBtnText, { color: Colors.gold }]}>{language === 'ar' ? 'متابعة الوزن' : 'Suivi poids'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.success + '44', backgroundColor: Colors.successMuted }]} onPress={handleExportPDF} disabled={exportingPDF} activeOpacity={0.85}>
            {exportingPDF
              ? <ActivityIndicator size="small" color={Colors.success} />
              : <MaterialIcons name="picture-as-pdf" size={18} color={Colors.success} />
            }
            <Text style={[styles.actionBtnText, { color: Colors.success }]}>Export PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Bio Stats */}
        <View style={styles.bioStatsRow}>
          {[
            { label: 'IMC', value: bmi, icon: 'monitor-weight', color: bmiColor },
            { label: 'BMR', value: `${Math.round(bmr)}`, icon: 'whatshot', color: Colors.gold },
            { label: 'TDEE', value: `${tdee}`, icon: 'local-fire-department', color: Colors.primary },
            { label: 'Marqueurs', value: `${biomarkers.length}`, icon: 'biotech', color: Colors.success },
          ].map((stat, i) => (
            <View key={i} style={styles.bioStat}>
              <MaterialIcons name={stat.icon as any} size={18} color={stat.color} />
              <Text style={[styles.bioStatValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.bioStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Deficiency Summary */}
        {deficiencies.length > 0 && (
          <View style={styles.deficiencyCard}>
            <View style={styles.deficiencyHeader}>
              <MaterialIcons name="warning-amber" size={18} color={Colors.warning} />
              <Text style={styles.deficiencyTitle}>{deficiencies.length} carence(s) détectée(s)</Text>
            </View>
            {deficiencies.slice(0, 3).map(b => (
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
              <Text style={styles.notifSub}>Eau, repas, entraînement, sommeil</Text>
            </View>
            {notifLoading
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Switch
                value={notifications}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
                thumbColor={Colors.textPrimary}
              />
            }
          </View>
        </View>

        {/* Logout */}
        {user && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <MaterialIcons name="logout" size={18} color={Colors.danger} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.md },

  authBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.successMuted, borderRadius: Radius.md,
    padding: 10, marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  authText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  syncText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },
  loginBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md,
    padding: 10, marginTop: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  loginBannerText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary },

  xpBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.goldMuted, borderRadius: Radius.xl, padding: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '33', ...Shadow.sm },
  xpBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  xpBannerIcon: { fontSize: 28 },
  xpBannerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 6 },
  xpBannerBar: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', width: 160 },
  xpBannerFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: Colors.primary, ...Shadow.primary,
  },
  avatarText: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.primary },
  scoreRing: {
    position: 'absolute', bottom: -4, right: -4,
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
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
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.sm,
  },
  bioStat: { flex: 1, alignItems: 'center', padding: Spacing.sm, gap: 4 },
  bioStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
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
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  editBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  fieldValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  fieldUnit: { fontWeight: '400', color: Colors.textMuted },
  fieldInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 6, color: Colors.textPrimary,
    fontSize: FontSize.sm, minWidth: 80, textAlign: 'right',
  },
  genderPicker: { flexDirection: 'row', gap: 8 },
  genderChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  genderChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  genderChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  genderChipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  activityChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  activityText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  activityTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalSelectChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  goalSelectChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  goalSelectText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  goalSelectTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  langOptions: { gap: 8 },
  langChip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  langChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  langLabelActive: { color: Colors.textPrimary },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.goldMuted, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.gold + '55', ...Shadow.gold,
  },
  premiumLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  premiumSub: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 2 },
  actionBtnsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  actionBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 5, backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: Colors.primary + '33' },
  actionBtnText: { fontSize: 10, color: Colors.primary, fontWeight: FontWeight.semibold, textAlign: 'center' },
  notifRow: { flexDirection: 'row', alignItems: 'center' },
  notifInfo: { flex: 1 },
  notifSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.dangerMuted, borderRadius: Radius.xl,
    paddingVertical: 16, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.danger + '33',
  },
  logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.danger },
});
