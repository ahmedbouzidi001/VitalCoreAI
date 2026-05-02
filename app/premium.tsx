// VitalCore AI — Premium Screen with Stripe skeleton
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';

const PLANS = [
  {
    key: 'free',
    label: 'Gratuit',
    labelAr: 'مجاني',
    price: '0',
    currency: '',
    period: '',
    color: Colors.textSecondary,
    features: [
      { label: '3 analyses IA / mois', included: true },
      { label: 'Plan repas de base', included: true },
      { label: '1 programme sport', included: true },
      { label: 'Biomarqueurs limités (5)', included: true },
      { label: 'Scan PDF analyses', included: false },
      { label: 'Chat IA illimité', included: false },
      { label: 'Recettes mondiales IA', included: false },
      { label: 'Export PDF bilan', included: false },
    ],
  },
  {
    key: 'premium',
    label: 'Premium',
    labelAr: 'بريميوم',
    price: '9.99',
    currency: '€',
    period: '/mois',
    color: Colors.primary,
    badge: 'RECOMMANDÉ',
    features: [
      { label: 'Analyses IA illimitées', included: true },
      { label: 'Plan repas personnalisé', included: true },
      { label: 'Tous les programmes', included: true },
      { label: 'Biomarqueurs illimités', included: true },
      { label: 'Scan PDF analyses', included: true },
      { label: 'Chat IA illimité', included: true },
      { label: 'Recettes mondiales IA', included: true },
      { label: 'Export PDF bilan santé', included: true },
    ],
  },
  {
    key: 'pro',
    label: 'Pro (Tunisie)',
    labelAr: 'احترافي (تونس)',
    price: '29',
    currency: 'DT',
    period: '/mois',
    color: Colors.gold,
    features: [
      { label: 'Tout Premium inclus', included: true },
      { label: 'Paiement Konnect/ClickToPay', included: true },
      { label: 'Support WhatsApp prioritaire', included: true },
      { label: 'Partenariats labos Tunisie', included: true },
      { label: 'Mode B2B médecin/coach', included: true },
    ],
  },
];

const PAYMENT_METHODS = [
  { icon: '💳', label: 'Carte bancaire (Stripe)', color: Colors.primary },
  { icon: '🟢', label: 'Konnect (Tunisie)', color: Colors.success },
  { icon: '📱', label: 'ClickToPay (Tunisie)', color: Colors.gold },
  { icon: '🏦', label: 'Virement + Preuve WhatsApp', color: Colors.purple },
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [selectedPlan, setSelectedPlan] = useState('premium');

  const handleSubscribe = () => {
    // Stripe integration placeholder
    // TODO: Call Stripe checkout when API key is configured
    // For now, show WhatsApp contact
    const plan = PLANS.find(p => p.key === selectedPlan);
    const msg = encodeURIComponent(
      `Bonjour, je souhaite m'abonner au plan ${plan?.label} (${plan?.price}${plan?.currency}${plan?.period}) sur VitalCore AI. Email: ${user?.email || 'non connecté'}`
    );
    // Linking.openURL(`whatsapp://send?phone=+21698000000&text=${msg}`);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{isAr ? 'الاشتراك المميز' : 'Abonnement Premium'}</Text>
          <Text style={styles.headerSub}>{isAr ? 'اختر خطتك الصحية' : 'Choisissez votre plan santé'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image
            source={require('@/assets/images/premium-hero.png')}
            style={styles.heroImg}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <MaterialIcons name="verified" size={14} color={Colors.gold} />
              <Text style={styles.heroBadgeText}>Médecine factuelle (EBM)</Text>
            </View>
            <View style={styles.heroBadge}>
              <MaterialIcons name="psychology" size={14} color={Colors.primary} />
              <Text style={styles.heroBadgeText}>IA Gemini 3 Flash</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: 'people', val: '10K+', label: isAr ? 'مستخدم نشط' : 'Utilisateurs actifs' },
            { icon: 'biotech', val: '50K+', label: isAr ? 'تحليل ذكاء' : 'Analyses IA' },
            { icon: 'star', val: '4.8', label: isAr ? 'تقييم' : 'Note' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <MaterialIcons name={s.icon as any} size={18} color={Colors.primary} />
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Plan Cards */}
        <Text style={styles.sectionTitle}>{isAr ? 'اختر خطتك' : 'Choisissez votre plan'}</Text>

        {PLANS.map(plan => {
          const isSelected = selectedPlan === plan.key;
          return (
            <TouchableOpacity
              key={plan.key}
              style={[styles.planCard, isSelected && { borderColor: plan.color, borderWidth: 2 }]}
              onPress={() => setSelectedPlan(plan.key)}
              activeOpacity={0.85}
            >
              {plan.badge && (
                <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planSelector, isSelected && { backgroundColor: plan.color, borderColor: plan.color }]}>
                  {isSelected && <MaterialIcons name="check" size={14} color={Colors.textInverse} />}
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
                      name={f.included ? 'check-circle' : 'cancel'}
                      size={16}
                      color={f.included ? Colors.success : Colors.textMuted}
                    />
                    <Text style={[styles.featureText, !f.included && styles.featureTextOff]}>{f.label}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>{isAr ? 'طرق الدفع' : 'Moyens de paiement'}</Text>
        <View style={styles.paymentMethods}>
          {PAYMENT_METHODS.map((m, i) => (
            <View key={i} style={[styles.paymentMethod, { borderColor: m.color + '44' }]}>
              <Text style={styles.paymentIcon}>{m.icon}</Text>
              <Text style={styles.paymentLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[
            styles.subscribeBtn,
            { backgroundColor: PLANS.find(p => p.key === selectedPlan)?.color || Colors.primary }
          ]}
          onPress={handleSubscribe}
          activeOpacity={0.87}
        >
          <MaterialIcons name="lock-open" size={20} color={Colors.textInverse} />
          <Text style={styles.subscribeBtnText}>
            {isAr ? 'الاشتراك الآن' : `S'abonner — ${PLANS.find(p => p.key === selectedPlan)?.price}${PLANS.find(p => p.key === selectedPlan)?.currency}${PLANS.find(p => p.key === selectedPlan)?.period || ' GRATUIT'}`}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          {isAr
            ? '• بدون التزام • إلغاء في أي وقت • بيانات مؤمّنة SSL'
            : '• Sans engagement • Annulation à tout moment • Données chiffrées SSL'
          }
        </Text>

        {/* Testimonials */}
        <View style={styles.testimonials}>
          {[
            { name: 'Ahmed B.', country: '🇹🇳', text: 'Mon score santé est passé de 45 à 78 en 3 mois grâce aux analyses IA !' },
            { name: 'Sara K.', country: '🇲🇦', text: 'Le plan repas IA est enfin adapté à ma cuisine marocaine. Impressionnant.' },
          ].map((t, i) => (
            <View key={i} style={styles.testimonialCard}>
              <View style={styles.testimonialHeader}>
                <Text style={styles.testimonialAvatar}>{t.country}</Text>
                <View>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: 5 }).map((_, si) => (
                      <MaterialIcons key={si} name="star" size={12} color={Colors.gold} />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.testimonialText}>{t.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  scroll: { paddingHorizontal: Spacing.md },

  heroWrap: { borderRadius: Radius.xl, overflow: 'hidden', height: 180, marginBottom: Spacing.md, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(8,15,30,0.55)' },
  heroBadges: { position: 'absolute', bottom: 12, left: 12, gap: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.glass, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  heroBadgeText: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semibold },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.sm },
  statVal: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.primary },
  statLabel: { fontSize: FontSize.micro, color: Colors.textMuted, textAlign: 'center' },

  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },

  planCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
    position: 'relative', ...Shadow.sm,
  },
  planBadge: { position: 'absolute', top: -1, right: 16, borderBottomLeftRadius: Radius.xs, borderBottomRightRadius: Radius.xs, paddingHorizontal: 12, paddingVertical: 4 },
  planBadgeText: { fontSize: FontSize.micro, fontWeight: FontWeight.extrabold, color: Colors.textInverse, letterSpacing: 1 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.sm },
  planSelector: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated },
  planLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  planCurrency: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  planFeatures: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  featureTextOff: { color: Colors.textMuted, textDecorationLine: 'line-through' },

  paymentMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  paymentIcon: { fontSize: 18 },
  paymentLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: Radius.xl, paddingVertical: 20, marginBottom: Spacing.sm,
    ...Shadow.primary,
  },
  subscribeBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Colors.textInverse },

  disclaimer: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.lg },

  testimonials: { gap: Spacing.sm, marginBottom: Spacing.md },
  testimonialCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 8 },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testimonialAvatar: { fontSize: 28 },
  testimonialName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: 2 },
  testimonialText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },
});
