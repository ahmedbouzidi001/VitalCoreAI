// VitalCore AI — Profile Screen v2 — Enterprise (GDPR, Subscription, Analytics)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  TextInput, Switch, ActivityIndicator, Modal, Pressable,
} from 'react-native';
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
import { requestDataExport, requestAccountDeletion, PRIVACY_POLICY_URL, TERMS_URL } from '@/services/gdpr';
import { trackScreenView, trackPDFExported } from '@/services/analytics';
import { Linking } from 'react-native';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'very_active', 'athlete'] as const;
const GOALS = ['muscle_gain', 'fat_loss', 'optimize_hormones', 'longevity', 'endurance', 'general_health'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, updateProfile, healthScore, biomarkers, deficiencies } = useHealth();
  const { t, language, setLanguage } = useLanguage();
  const { user, logout, subscription, isPremium, checkSubscription, openCustomerPortal } = useAuth();
  const { showAlert } = useAlert();

  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [notifications, setNotifications] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [userXP, setUserXP] = useState(0);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showGDPRModal, setShowGDPRModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    trackScreenView('profile');
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
      if (!ok) showAlert('Permission requise', 'Activez les notifications dans les paramètres de votre appareil.');
    } else {
      await cancelAllNotifications();
      setNotifications(false);
    }
    setNotifLoading(false);
  };

  const handleSave = () => { updateProfile(localProfile); setEditing(false); };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    trackPDFExported();
    const { success, error } = await generateHealthReportPDF({
      userName: displayName,
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      healthScore, profile, biomarkers,
      deficiencies: deficiencies.map(d => d.name),
      dailyStats: { calories: 0, water: 0, steps: 0, sleep: 0 },
      aiSummary: undefined,
    });
    setExportingPDF(false);
    if (!success) showAlert('Erreur', error || 'Export PDF échoué');
  };

  const handleLogout = () => {
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

  const handleDataExport = async () => {
    if (!user) return;
    setExportingData(true);
    const { success, error } = await requestDataExport(user.id);
    setExportingData(false);
    if (success) {
      showAlert(
        '📦 Export RGPD demandé',
        'Votre demande d\'export de données a été enregistrée. Vous recevrez vos données dans 72h conformément au RGPD (Art. 15).',
      );
    } else {
      showAlert('Erreur', error || 'Export impossible');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    const { success, error } = await requestAccountDeletion(user.id, deleteEmail, user.email);
    setDeletingAccount(false);
    if (success) {
      setShowGDPRModal(false);
      showAlert('Compte supprimé', 'Toutes vos données ont été effacées conformément au RGPD Art. 17.', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
    } else {
      showAlert('Erreur', error || 'Suppression impossible');
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    const { error } = await openCustomerPortal();
    setPortalLoading(false);
    if (error) showAlert('Erreur', error);
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
    muscle_gain: language === 'ar' ? 'بناء العضلات' : 'Prise de masse',
    fat_loss: language === 'ar' ? 'حرق الدهون' : 'Perte de graisse',
    optimize_hormones: language === 'ar' ? 'تحسين الهرمونات' : 'Optimiser les hormones',
    longevity: language === 'ar' ? 'طول العمر' : 'Longévité',
    endurance: language === 'ar' ? 'التحمل' : 'Endurance',
    general_health: language === 'ar' ? 'الصحة العامة' : 'Santé générale',
  };

  const scoreColor = healthScore >= 75 ? Colors.success : healthScore >= 50 ? Colors.warning : Colors.danger;
  const displayName = user ? user.email?.split('@')[0] || 'Utilisateur' : profile.name;
  const isUserPremium = isPremium();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* GDPR Modal */}
      <Modal visible={showGDPRModal} animationType="slide" transparent onRequestClose={() => setShowGDPRModal(false)}>
        <View style={styles.gdprOverlay}>
          <View style={styles.gdprPanel}>
            <View style={styles.gdprHandle} />
            <View style={styles.gdprHeader}>
              <MaterialIcons name="shield" size={24} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gdprTitle}>Vos droits RGPD</Text>
                <Text style={styles.gdprSub}>Règlement EU 2016/679 — Conforme</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGDPRModal(false)}>
                <MaterialIcons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Rights Summary */}
              <View style={styles.gdprRights}>
                {[
                  { icon: 'download', label: 'Art. 15 — Droit d\'accès', desc: 'Téléchargez toutes vos données santé' },
                  { icon: 'delete-forever', label: 'Art. 17 — Droit à l\'effacement', desc: 'Supprimez définitivement votre compte' },
                  { icon: 'block', label: 'Art. 18 — Limitation du traitement', desc: 'Limitez l\'utilisation de vos données' },
                  { icon: 'lock', label: 'Art. 32 — Sécurité', desc: 'Données chiffrées SSL 256-bit, stockage EU' },
                ].map((r, i) => (
                  <View key={i} style={styles.gdprRight}>
                    <MaterialIcons name={r.icon as any} size={16} color={Colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gdprRightLabel}>{r.label}</Text>
                      <Text style={styles.gdprRightDesc}>{r.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Export Data */}
              <View style={styles.gdprSection}>
                <Text style={styles.gdprSectionTitle}>📦 Télécharger mes données</Text>
                <Text style={styles.gdprSectionDesc}>
                  Exportez toutes vos données (biomarqueurs, repas, entraînements, chat IA) en format JSON dans les 72h.
                </Text>
                <TouchableOpacity style={styles.gdprExportBtn} onPress={handleDataExport} disabled={exportingData}>
                  {exportingData
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <MaterialIcons name="download" size={18} color={Colors.primary} />
                  }
                  <Text style={styles.gdprExportBtnText}>Demander l'export de mes données</Text>
                </TouchableOpacity>
              </View>

              {/* Links */}
              <View style={styles.gdprSection}>
                <Text style={styles.gdprSectionTitle}>📄 Documents légaux</Text>
                <TouchableOpacity style={styles.gdprLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                  <MaterialIcons name="privacy-tip" size={16} color={Colors.textSecondary} />
                  <Text style={styles.gdprLinkText}>Politique de confidentialité</Text>
                  <MaterialIcons name="open-in-new" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.gdprLink} onPress={() => Linking.openURL(TERMS_URL)}>
                  <MaterialIcons name="description" size={16} color={Colors.textSecondary} />
                  <Text style={styles.gdprLinkText}>Conditions d'utilisation</Text>
                  <MaterialIcons name="open-in-new" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Delete Account */}
              <View style={[styles.gdprSection, { borderColor: Colors.danger + '44', borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md }]}>
                <Text style={[styles.gdprSectionTitle, { color: Colors.danger }]}>⚠️ Supprimer mon compte</Text>
                <Text style={styles.gdprSectionDesc}>
                  Cette action est irréversible. Toutes vos données seront effacées définitivement (RGPD Art. 17 — Droit à l'oubli).
                </Text>
                <Text style={styles.gdprDeleteLabel}>Confirmez votre email pour supprimer :</Text>
                <TextInput
                  style={styles.gdprDeleteInput}
                  value={deleteEmail}
                  onChangeText={setDeleteEmail}
                  placeholder={user?.email || 'votre@email.com'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.gdprDeleteBtn, deleteEmail !== user?.email && { opacity: 0.4 }]}
                  onPress={handleDeleteAccount}
                  disabled={deleteEmail !== user?.email || deletingAccount}
                >
                  {deletingAccount
                    ? <ActivityIndicator size="small" color={Colors.textInverse} />
                    : <MaterialIcons name="delete-forever" size={18} color={Colors.textInverse} />
                  }
                  <Text style={styles.gdprDeleteBtnText}>Supprimer définitivement mon compte</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Auth Status */}
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

        {/* Subscription Status */}
        {user && (
          <Pressable
            style={({ pressed }) => [
              styles.subBanner,
              isUserPremium ? styles.subBannerPremium : styles.subBannerFree,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.push('/premium')}
          >
            <MaterialIcons
              name={isUserPremium ? 'workspace-premium' : 'star-outline'}
              size={20}
              color={isUserPremium ? Colors.gold : Colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.subBannerTitle, isUserPremium && { color: Colors.gold }]}>
                {isUserPremium
                  ? `Plan ${subscription.tier === 'pro' ? 'Pro' : 'Premium'} actif ✓`
                  : 'Plan Gratuit — Passez à Premium'
                }
              </Text>
              {isUserPremium && subscription.subscriptionEnd && (
                <Text style={styles.subBannerSub}>
                  Renouvellement: {new Date(subscription.subscriptionEnd).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </View>
            {isUserPremium ? (
              <TouchableOpacity
                style={styles.manageSubBtn}
                onPress={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.manageSubBtnText}>Gérer</Text>
                }
              </TouchableOpacity>
            ) : (
              <View style={styles.upgradeBadge}>
                <Text style={styles.upgradeBadgeText}>Upgrade</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* XP Banner */}
        <TouchableOpacity style={styles.xpBanner} onPress={() => router.push('/achievements')} activeOpacity={0.85}>
          <View style={styles.xpBannerLeft}>
            <Text style={styles.xpBannerIcon}>⭐</Text>
            <View>
              <Text style={styles.xpBannerTitle}>{userXP} XP · Niv.{levelData.level} — {levelData.title}</Text>
              <View style={styles.xpBannerBar}>
                <View style={[styles.xpBannerFill, { width: `${levelData.progress * 100}%` }]} />
              </View>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.gold} />
        </TouchableOpacity>

        {/* Profile Header */}
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

        {/* Quick Actions */}
        <View style={styles.actionBtnsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/chat')} activeOpacity={0.85}>
            <MaterialIcons name="psychology" size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Chat IA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.gold + '44', backgroundColor: Colors.goldMuted }]} onPress={() => router.push('/weight-tracker')} activeOpacity={0.85}>
            <MaterialIcons name="monitor-weight" size={18} color={Colors.gold} />
            <Text style={[styles.actionBtnText, { color: Colors.gold }]}>Poids</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.success + '44', backgroundColor: Colors.successMuted }]} onPress={handleExportPDF} disabled={exportingPDF} activeOpacity={0.85}>
            {exportingPDF ? <ActivityIndicator size="small" color={Colors.success} /> : <MaterialIcons name="picture-as-pdf" size={18} color={Colors.success} />}
            <Text style={[styles.actionBtnText, { color: Colors.success }]}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.purple + '44', backgroundColor: Colors.purpleMuted }]} onPress={() => router.push('/achievements')} activeOpacity={0.85}>
            <MaterialIcons name="emoji-events" size={18} color={Colors.purple} />
            <Text style={[styles.actionBtnText, { color: Colors.purple }]}>Succès</Text>
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

        {/* Edit Profile */}
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
                  <TouchableOpacity key={g} style={[styles.genderChip, localProfile.gender === g && styles.genderChipActive]} onPress={() => setLocalProfile(prev => ({ ...prev, gender: g }))}>
                    <Text style={[styles.genderChipText, localProfile.gender === g && styles.genderChipTextActive]}>{t(g)}</Text>
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
              <TouchableOpacity key={level} style={[styles.activityChip, profile.activityLevel === level && styles.activityChipActive]} onPress={() => updateProfile({ activityLevel: level })} activeOpacity={0.8}>
                <Text style={[styles.activityText, profile.activityLevel === level && styles.activityTextActive]}>{t(level)}</Text>
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
                  onPress={() => { const updated = isActive ? profile.goals.filter(g => g !== goal) : [...profile.goals, goal]; updateProfile({ goals: updated }); }}
                  activeOpacity={0.8}
                >
                  {isActive && <MaterialIcons name="check" size={12} color={Colors.primary} />}
                  <Text style={[styles.goalSelectText, isActive && styles.goalSelectTextActive]}>{goalLabels[goal]}</Text>
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
              <TouchableOpacity key={lang.code} style={[styles.langChip, language === lang.code && styles.langChipActive]} onPress={() => setLanguage(lang.code)} activeOpacity={0.8}>
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
            {notifLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : (
              <Switch value={notifications} onValueChange={handleToggleNotifications} trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }} thumbColor={Colors.textPrimary} />
            )}
          </View>
        </View>

        {/* Privacy & GDPR */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔒 Confidentialité & RGPD</Text>
          <Text style={styles.gdprInfoText}>
            Vos données de santé sont chiffrées SSL 256-bit et stockées conformément au RGPD (Règlement EU 2016/679).
            Vous disposez de droits d'accès, de rectification, d'effacement et de portabilité.
          </Text>
          <TouchableOpacity style={styles.gdprOpenBtn} onPress={() => setShowGDPRModal(true)} activeOpacity={0.85}>
            <MaterialIcons name="shield" size={18} color={Colors.primary} />
            <Text style={styles.gdprOpenBtnText}>Gérer mes droits RGPD</Text>
            <MaterialIcons name="arrow-forward-ios" size={12} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ℹ️ Application</Text>
          {[
            { label: 'Version', value: '2.3.0', icon: 'info-outline' },
            { label: 'Build', value: 'enterprise', icon: 'build' },
            { label: 'Backend', value: 'OnSpace Cloud (Supabase)', icon: 'cloud' },
            { label: 'IA Engine', value: 'Gemini 3 Flash + OnSpace AI', icon: 'psychology' },
            { label: 'Certifications', value: 'EBM · NSCA · ACSM · RGPD', icon: 'verified' },
          ].map((item, i) => (
            <View key={i} style={styles.fieldRow}>
              <View style={styles.infoLeft}>
                <MaterialIcons name={item.icon as any} size={14} color={Colors.textMuted} />
                <Text style={styles.fieldLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
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

  authBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: 10, marginTop: Spacing.md, marginBottom: Spacing.sm },
  authText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  syncText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },
  loginBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 10, marginTop: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '44' },
  loginBannerText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary },

  subBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, ...Shadow.sm },
  subBannerPremium: { backgroundColor: Colors.goldMuted, borderColor: Colors.gold + '44' },
  subBannerFree: { backgroundColor: Colors.surface, borderColor: Colors.surfaceBorder },
  subBannerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subBannerSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  manageSubBtn: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.primary + '44' },
  manageSubBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
  upgradeBadge: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  upgradeBadgeText: { fontSize: FontSize.xs, color: Colors.textInverse, fontWeight: FontWeight.extrabold },

  xpBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.goldMuted, borderRadius: Radius.xl, padding: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '33', ...Shadow.sm },
  xpBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  xpBannerIcon: { fontSize: 28 },
  xpBannerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 6 },
  xpBannerBar: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', width: 160 },
  xpBannerFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },

  profileHeader: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: Colors.primary, ...Shadow.primary },
  avatarText: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.primary },
  scoreRing: { position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  scoreRingText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  profileName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  profileSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  profileGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  goalChip: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.primary + '44' },
  goalText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },

  actionBtnsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  actionBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 5, backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: Colors.primary + '33' },
  actionBtnText: { fontSize: 10, color: Colors.primary, fontWeight: FontWeight.semibold, textAlign: 'center' },

  bioStatsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.sm },
  bioStat: { flex: 1, alignItems: 'center', padding: Spacing.sm, gap: 4 },
  bioStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  bioStatLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  deficiencyCard: { backgroundColor: Colors.warningMuted, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '44' },
  deficiencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  deficiencyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.warning },
  deficiencyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  deficiencyName: { fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1 },
  deficiencyValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.warning },
  deficiencyNormal: { fontSize: FontSize.xs, color: Colors.textMuted },

  sectionCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  editBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  fieldValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  fieldUnit: { fontWeight: '400', color: Colors.textMuted },
  fieldInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 6, color: Colors.textPrimary, fontSize: FontSize.sm, minWidth: 80, textAlign: 'right' },
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
  notifRow: { flexDirection: 'row', alignItems: 'center' },
  notifInfo: { flex: 1 },
  notifSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  gdprInfoText: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginBottom: Spacing.sm },
  gdprOpenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '44' },
  gdprOpenBtnText: { flex: 1, fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },

  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', flex: 1, marginLeft: 8 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.dangerMuted, borderRadius: Radius.xl, paddingVertical: 16, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.danger + '33' },
  logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.danger },

  // GDPR Modal
  gdprOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  gdprPanel: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.md, paddingBottom: 36, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, maxHeight: '90%' },
  gdprHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: Spacing.sm },
  gdprHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  gdprTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  gdprSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  gdprRights: { gap: 8, marginBottom: Spacing.md },
  gdprRight: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.sm },
  gdprRightLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  gdprRightDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  gdprSection: { marginBottom: Spacing.md },
  gdprSectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 6 },
  gdprSectionDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, marginBottom: 10 },
  gdprExportBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '44' },
  gdprExportBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  gdprLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  gdprLinkText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  gdprDeleteLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 8 },
  gdprDeleteInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 12, color: Colors.textPrimary, fontSize: FontSize.sm, borderWidth: 1.5, borderColor: Colors.danger + '44', marginBottom: 10 },
  gdprDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.danger, borderRadius: Radius.lg, paddingVertical: 14, ...Shadow.sm },
  gdprDeleteBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
});
