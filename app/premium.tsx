// VitalCore AI — Premium Screen v2 — Full Stripe Integration
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useAlert } from '@/template/ui';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { trackPremiumViewed, trackCheckoutStarted, trackManageSubscription } from '@/services/analytics';

const PLANS = [
  {
    key: 'free' as const,
    label: 'Gratuit',
    labelAr: 'مجاني',
    price: '0',
    currency: '',
    period: '',
    color: Colors.textSecondary,
    icon: 'star-outline',
    features: [
      { label: '3 analyses IA / mois', included: true },
      { label: 'Plan repas de base', included: true },
      { label: '1 programme sport', included: true },
      { label: 'Biomarqueurs limités (5)', included: true },
      { label: 'Scan PDF analyses', included: false },
      { label: 'Chat IA illimité', included: false },
      { label: 'Recettes mondiales IA', included: false },
      { label: 'Export PDF bilan', included: false },
      { label: 'Historique biomarqueurs', included: false },
    ],
  },
  {
    key: 'premium' as const,
    label: 'Premium',
    labelAr: 'بريميوم',
    price: '9.99',
    currency: '€',
    period: '/mois',
    color: Colors.primary,
    badge: 'RECOMMANDÉ',
    icon: 'workspace-premium',
    features: [
      { label: 'Analyses IA illimitées', included: true },
      { label: 'Plan repas personnalisé', included: true },
      { label: 'Tous les programmes + IA', included: true },
      { label: 'Biomarqueurs illimités', included: true },
      { label: 'Scan PDF analyses', included: true },
      { label: 'Chat IA illimité + mémoire', included: true },
      { label: 'Recettes mondiales IA', included: true },
      { label: 'Export PDF bilan santé', included: true },
      { label: 'Historique + tendances', included: true },
    ],
  },
  {
    key: 'pro' as const,
    label: 'Pro Tunisie',
    labelAr: 'احترافي تونس',
    price: '29',
    currency: 'DT',
    period: '/mois',
    color: Colors.gold,
    icon: 'diamond',
    features: [
      { label: 'Tout Premium inclus', included: true },
      { label: 'Paiement Konnect/ClickToPay', included: true },
      { label: 'Support WhatsApp prioritaire', included: true },
      { label: 'Partenariats labos Tunisie', included: true },
      { label: 'Mode B2B médecin/coach (bientôt)', included: true },
    ],
  },
];

const FEATURES_LIST = [
  { icon: 'psychology', color: Colors.primary, title: 'IA Gemini 3 Flash', desc: 'Analyses biologiques basées sur les preuves (EBM)' },
  { icon: 'restaurant-menu', color: Colors.gold, title: 'Nutrition personnalisée', desc: 'Plans repas adaptés à vos carences et préférences culinaires' },
  { icon: 'fitness-center', color: Colors.success, title: 'Entraînement scientifique', desc: 'Protocoles NSCA · ACSM · JAMA avec suivi de charges' },
  { icon: 'biotech', color: Colors.purple, title: 'Analyse biomarqueurs', desc: 'Interprétation clinique de vos bilans sanguins' },
  { icon: 'picture-as-pdf', color: Colors.danger, title: 'Export PDF médecin', desc: 'Rapport complet à partager avec votre praticien' },
  { icon: 'chat', color: Colors.primary, title: 'Chat IA avec mémoire', desc: 'Historique persistant de vos conversations santé' },
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, subscription, startCheckout, openCustomerPortal, checkSubscription, isPremium } = useAuth();
  const { language } = useLanguage();
  const { showAlert } = useAlert();
  const isAr = language === 'ar';

  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'pro'>('premium');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    trackPremiumViewed();
  }, []);

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      router.back();
      return;
    }

    if (!user) {
      showAlert(
        isAr ? 'تسجيل الدخول مطلوب' : 'Connexion requise',
        isAr ? 'يرجى تسجيل الدخول للاشتراك' : 'Connectez-vous pour accéder aux plans premium',
        [
          { text: isAr ? 'إلغاء' : 'Annuler', style: 'cancel' },
          { text: isAr ? 'تسجيل الدخول' : 'Se connecter', onPress: () => router.push('/login') },
        ]
      );
      return;
    }

    trackCheckoutStarted(selectedPlan);
    setCheckoutLoading(true);

    try {
      const { error } = await startCheckout(selectedPlan);
      if (error) {
        showAlert(isAr ? 'خطأ' : 'Erreur', error);
      }
      // After returning from Stripe, check subscription
      setTimeout(() => checkSubscription(), 3000);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    trackManageSubscription();
    setPortalLoading(true);
    try {
      const { error } = await openCustomerPortal();
      if (error) showAlert(isAr ? 'خطأ' : 'Erreur', error);
      // After returning from portal, refresh subscription
      setTimeout(() => checkSubscription(), 2000);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    await checkSubscription();
    setRefreshing(false);
  };

  const currentPlan = PLANS.find(p => p.key === selectedPlan)!;
  const isCurrentlyPremium = isPremium();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isAr ? 'الاشتراك المميز' : 'Abonnement Premium'}</Text>
          <Text style={styles.headerSub}>{isAr ? 'اختر خطتك الصحية' : 'Débloquez votre potentiel santé'}</Text>
        </View>
        <TouchableOpacity onPress={handleRefreshSubscription} style={styles.refreshBtn} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <MaterialIcons name="refresh" size={20} color={Colors.textMuted} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Current Subscription Status */}
        {subscription.isLoading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.statusText}>{isAr ? 'جاري التحقق من الاشتراك...' : 'Vérification de l\'abonnement...'}</Text>
          </View>
        ) : isCurrentlyPremium ? (
          <View style={[styles.statusCard, styles.statusCardPremium]}>
            <View style={styles.statusLeft}>
              <MaterialIcons name="verified" size={24} color={Colors.gold} />
              <View>
                <Text style={styles.statusPremiumTitle}>
                  {isAr ? 'أنت مشترك!' : `Abonné ${subscription.tier === 'pro' ? 'Pro' : 'Premium'} ✓`}
                </Text>
                {subscription.subscriptionEnd && (
                  <Text style={styles.statusPremiumSub}>
                    {isAr ? 'ينتهي:' : 'Renouvellement:'} {new Date(subscription.subscriptionEnd).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.manageBtn, pressed && { opacity: 0.8 }]}
              onPress={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.manageBtnText}>{isAr ? 'إدارة' : 'Gérer'}</Text>
              }
            </Pressable>
          </View>
        ) : user ? (
          <View style={styles.statusCard}>
            <MaterialIcons name="star-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.statusText}>{isAr ? 'الخطة المجانية' : 'Plan Gratuit — Passez à Premium pour plus de fonctionnalités'}</Text>
          </View>
        ) : (
          <View style={[styles.statusCard, { borderColor: Colors.warning + '44' }]}>
            <MaterialIcons name="info-outline" size={18} color={Colors.warning} />
            <Text style={[styles.statusText, { color: Colors.warning }]}>
              {isAr ? 'قم بتسجيل الدخول للاشتراك' : 'Connectez-vous pour accéder aux plans premium'}
            </Text>
          </View>
        )}

        {/* Trust Badges */}
        <View style={styles.trustRow}>
          {[
            { icon: 'verified-user', label: 'SSL 256-bit', color: Colors.success },
            { icon: 'lock', label: 'RGPD', color: Colors.primary },
            { icon: 'cancel', label: 'Sans engagement', color: Colors.gold },
            { icon: 'support-agent', label: 'Support 24/7', color: Colors.purple },
          ].map((b, i) => (
            <View key={i} style={styles.trustBadge}>
              <MaterialIcons name={b.icon as any} size={14} color={b.color} />
              <Text style={[styles.trustLabel, { color: b.color }]}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* Plan Cards */}
        <Text style={styles.sectionTitle}>{isAr ? '📋 اختر خطتك' : '📋 Choisissez votre plan'}</Text>

        {PLANS.map(plan => {
          const isSelected = selectedPlan === plan.key;
          const isCurrentActive = subscription.tier === plan.key && subscription.subscribed;
          return (
            <Pressable
              key={plan.key}
              style={({ pressed }) => [
                styles.planCard,
                isSelected && { borderColor: plan.color, borderWidth: 2 },
                isCurrentActive && { borderColor: Colors.success, borderWidth: 2 },
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => setSelectedPlan(plan.key)}
            >
              {plan.badge && !isCurrentActive && (
                <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}
              {isCurrentActive && (
                <View style={[styles.planBadge, { backgroundColor: Colors.success }]}>
                  <Text style={styles.planBadgeText}>VOTRE PLAN</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planSelector, isSelected && { backgroundColor: plan.color, borderColor: plan.color }]}>
                  {isSelected ? (
                    <MaterialIcons name="check" size={14} color={Colors.textInverse} />
                  ) : (
                    <MaterialIcons name={plan.icon as any} size={14} color={Colors.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planLabel, isSelected && { color: plan.color }]}>
                    {isAr ? plan.labelAr : plan.label}
                  </Text>
                </View>
                <View style={styles.planPriceWrap}>
                  <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                  <Text style={[styles.planCurrency, { color: plan.color }]}>{plan.currency}{plan.period}</Text>
                </View>
              </View>

              <View style={styles.planFeatures}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <MaterialIcons
                      name={f.included ? 'check-circle' : 'remove-circle-outline'}
                      size={16}
                      color={f.included ? Colors.success : Colors.textMuted + '88'}
                    />
                    <Text style={[styles.featureText, !f.included && styles.featureTextOff]}>{f.label}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}

        {/* Features Showcase */}
        <Text style={styles.sectionTitle}>{isAr ? '⚡ المميزات المتقدمة' : '⚡ Fonctionnalités Premium'}</Text>
        <View style={styles.featuresGrid}>
          {FEATURES_LIST.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={[styles.featureCardIcon, { backgroundColor: f.color + '18' }]}>
                <MaterialIcons name={f.icon as any} size={22} color={f.color} />
              </View>
              <Text style={styles.featureCardTitle}>{f.title}</Text>
              <Text style={styles.featureCardDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>{isAr ? '💳 طرق الدفع' : '💳 Moyens de paiement acceptés'}</Text>
        <View style={styles.paymentGrid}>
          {[
            { icon: '💳', label: 'Stripe (CB, Visa, Mastercard)', color: Colors.primary, desc: 'International' },
            { icon: '🟢', label: 'Konnect', color: Colors.success, desc: 'Tunisie — Pro seulement' },
            { icon: '📱', label: 'ClickToPay', color: Colors.gold, desc: 'Tunisie — Pro seulement' },
            { icon: '🏦', label: 'Virement + WhatsApp', color: Colors.purple, desc: 'Après confirmation' },
          ].map((m, i) => (
            <View key={i} style={[styles.paymentCard, { borderColor: m.color + '44' }]}>
              <Text style={styles.paymentIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>{m.label}</Text>
                <Text style={styles.paymentDesc}>{m.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        {!isCurrentlyPremium && (
          <Pressable
            style={({ pressed }) => [
              styles.subscribeBtn,
              { backgroundColor: currentPlan.color },
              checkoutLoading && { opacity: 0.7 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSubscribe}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <MaterialIcons name="lock-open" size={22} color={Colors.textInverse} />
            )}
            <Text style={styles.subscribeBtnText}>
              {selectedPlan === 'free'
                ? (isAr ? 'الاستمرار مجاناً' : 'Continuer gratuitement')
                : checkoutLoading
                  ? (isAr ? 'جاري التحضير...' : 'Préparation...')
                  : (isAr ? 'الاشتراك الآن' : `S'abonner — ${currentPlan.price}${currentPlan.currency}${currentPlan.period}`)
              }
            </Text>
          </Pressable>
        )}

        {/* Manage existing subscription */}
        {isCurrentlyPremium && (
          <Pressable
            style={({ pressed }) => [styles.manageFullBtn, pressed && { opacity: 0.85 }]}
            onPress={handleManageSubscription}
            disabled={portalLoading}
          >
            {portalLoading
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <MaterialIcons name="settings" size={20} color={Colors.primary} />
            }
            <Text style={styles.manageFullBtnText}>
              {isAr ? 'إدارة اشتراكي (إلغاء، تعديل)' : 'Gérer mon abonnement (annuler, modifier)'}
            </Text>
          </Pressable>
        )}

        <Text style={styles.disclaimer}>
          {isAr
            ? '• بدون التزام • إلغاء في أي وقت • بيانات مؤمّنة SSL 256-bit • RGPD compliant'
            : '• Sans engagement • Annulation à tout moment • Données chiffrées SSL 256-bit • Conforme RGPD'
          }
        </Text>

        {/* Testimonials */}
        <View style={styles.testimonials}>
          {[
            { name: 'Ahmed B.', country: '🇹🇳', rating: 5, text: 'Mon score santé est passé de 45 à 78 en 3 mois grâce aux analyses IA ! Le plan repas adapté à la cuisine tunisienne est incroyable.' },
            { name: 'Sara K.', country: '🇲🇦', rating: 5, text: 'Le plan repas IA est enfin adapté à ma cuisine marocaine. Les biomarqueurs + recommandations suppléments ont tout changé.' },
            { name: 'Mohamed T.', country: '🇩🇿', rating: 5, text: 'Premier app qui comprend vraiment mes analyses de labo algériennes. L\'IA m\'a permis de corriger ma carence en Vitamine D.' },
          ].map((t, i) => (
            <View key={i} style={styles.testimonialCard}>
              <View style={styles.testimonialHeader}>
                <Text style={styles.testimonialAvatar}>{t.country}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <MaterialIcons key={si} name="star" size={12} color={Colors.gold} />
                    ))}
                  </View>
                </View>
                <MaterialIcons name="verified" size={16} color={Colors.success} />
              </View>
              <Text style={styles.testimonialText}>"{t.text}"</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { val: '10K+', label: isAr ? 'مستخدم نشط' : 'Utilisateurs actifs', icon: 'people', color: Colors.primary },
            { val: '50K+', label: isAr ? 'تحليل ذكاء' : 'Analyses IA', icon: 'analytics', color: Colors.gold },
            { val: '4.8★', label: isAr ? 'تقييم' : 'Note moy.', icon: 'star', color: Colors.success },
            { val: '98%', label: isAr ? 'رضا' : 'Satisfaction', icon: 'favorite', color: Colors.danger },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <MaterialIcons name={s.icon as any} size={16} color={s.color} />
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 8 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  statusCardPremium: { borderColor: Colors.gold + '44', backgroundColor: Colors.goldMuted },
  statusLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  statusPremiumTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  statusPremiumSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  manageBtn: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primary + '44' },
  manageBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },

  trustRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: Spacing.lg },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.surfaceBorder },
  trustLabel: { fontSize: 10, fontWeight: FontWeight.semibold },

  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },

  planCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, position: 'relative', ...Shadow.sm },
  planBadge: { position: 'absolute', top: -1, right: 16, borderBottomLeftRadius: Radius.xs, borderBottomRightRadius: Radius.xs, paddingHorizontal: 12, paddingVertical: 4 },
  planBadgeText: { fontSize: 10, fontWeight: FontWeight.extrabold, color: Colors.textInverse, letterSpacing: 1 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.sm },
  planSelector: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated },
  planLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, lineHeight: 28 },
  planCurrency: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  planFeatures: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  featureTextOff: { color: Colors.textMuted, textDecorationLine: 'line-through' },

  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },
  featureCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 6, ...Shadow.sm },
  featureCardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  featureCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  featureCardDesc: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },

  paymentGrid: { gap: 8, marginBottom: Spacing.lg },
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1 },
  paymentIcon: { fontSize: 24 },
  paymentLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  paymentDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },

  subscribeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: Radius.xl, paddingVertical: 20, marginBottom: Spacing.sm, ...Shadow.primary },
  subscribeBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Colors.textInverse },

  manageFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primaryMuted, borderRadius: Radius.xl, paddingVertical: 18, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '44' },
  manageFullBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },

  disclaimer: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 18 },

  testimonials: { gap: Spacing.sm, marginBottom: Spacing.md },
  testimonialCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 8 },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testimonialAvatar: { fontSize: 28 },
  testimonialName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  testimonialText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 19, fontStyle: 'italic' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  statVal: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
});
