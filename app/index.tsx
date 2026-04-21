// Onboarding with Country + Language selection
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Language } from '@/constants/i18n';
import { COUNTRIES, CountryConfig } from '@/constants/countries';

const { width, height } = Dimensions.get('window');

const slides = [
  { image: require('@/assets/images/onboarding-1.png') },
  { image: require('@/assets/images/onboarding-2.png') },
  { image: require('@/assets/images/onboarding-3.png') },
];

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'عربي', flag: '🇹🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const FEATURED_COUNTRIES = ['TN', 'FR', 'MA', 'DZ', 'SA', 'AE', 'TR', 'GR', 'US', 'GB'];

export default function OnboardingScreen() {
  const [step, setStep] = useState<'language' | 'country' | 'slides'>('language');
  const [slideIndex, setSlideIndex] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useHealth();
  const { language, setLanguage, t, country, setCountry } = useLanguage();

  const titleKeys = ['onboarding_title_1', 'onboarding_title_2', 'onboarding_title_3'] as const;
  const subKeys = ['onboarding_sub_1', 'onboarding_sub_2', 'onboarding_sub_3'] as const;

  const handleNext = () => {
    if (slideIndex < slides.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  const featuredCountries = COUNTRIES.filter(c => FEATURED_COUNTRIES.includes(c.code));

  // Step 1: Language
  if (step === 'language') {
    return (
      <View style={[styles.langScreen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <View style={styles.langHeader}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.langTitle}>VitalCore AI</Text>
          <Text style={styles.langSubtitle}>Choose your language / Choisissez / اختر لغتك</Text>
        </View>
        <View style={styles.langOptions}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langCard, language === lang.code && styles.langCardActive]}
              onPress={() => setLanguage(lang.code)}
              activeOpacity={0.8}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>{lang.label}</Text>
              {language === lang.code && (
                <View style={styles.langCheck}><Text style={styles.langCheckText}>✓</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.continueBtn} onPress={() => setStep('country')} activeOpacity={0.9}>
          <Text style={styles.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Country
  if (step === 'country') {
    return (
      <View style={[styles.langScreen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <View style={styles.countryHeader}>
          <Text style={styles.countryTitle}>
            {language === 'ar' ? 'اختر بلدك' : language === 'fr' ? 'Choisissez votre pays' : 'Choose your country'}
          </Text>
          <Text style={styles.countrySub}>
            {language === 'ar'
              ? 'سيتم تكييف الوصفات والعملة والتوصيات وفقاً لذلك'
              : language === 'fr'
                ? 'Les recettes, la devise et les recommandations seront adaptées'
                : 'Recipes, currency and recommendations will be adapted'
            }
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.countryGrid} showsVerticalScrollIndicator={false}>
          {featuredCountries.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[styles.countryCard, country.code === c.code && styles.countryCardActive]}
              onPress={() => setCountry(c.code)}
              activeOpacity={0.8}
            >
              <Text style={styles.countryFlag}>{c.flag}</Text>
              <Text style={[styles.countryName, country.code === c.code && styles.countryNameActive]}>
                {language === 'fr' ? c.nameFr : language === 'ar' ? c.nameAr : c.name}
              </Text>
              <Text style={styles.countryCurrency}>{c.currencySymbol}</Text>
              {country.code === c.code && (
                <View style={styles.countryCheck}><MaterialIcons name="check" size={14} color={Colors.textInverse} /></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.countryActions}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('language')} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueBtn2} onPress={() => setStep('slides')} activeOpacity={0.9}>
            <Text style={styles.continueBtnText}>{language === 'ar' ? 'التالي →' : language === 'fr' ? 'Continuer →' : 'Continue →'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 3: Slides
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Image source={slides[slideIndex].image} style={styles.bgImage} contentFit="cover" transition={400} />
      <View style={styles.overlay} />

      <TouchableOpacity
        style={[styles.skipBtn, { top: insets.top + 16 }]}
        onPress={() => { completeOnboarding(); router.replace('/(tabs)'); }}
        activeOpacity={0.8}
      >
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>

      <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Evidence-Based Medicine</Text>
        </View>
        <Text style={styles.slideTitle}>{t(titleKeys[slideIndex])}</Text>
        <Text style={styles.slideSub}>{t(subKeys[slideIndex])}</Text>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.9}>
          <Text style={styles.nextText}>
            {slideIndex === slides.length - 1 ? t('get_started') : t('next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Import MaterialIcons for country check
import { MaterialIcons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgImage: { position: 'absolute', width, height, top: 0, left: 0 },
  overlay: { position: 'absolute', width, height, top: 0, left: 0, backgroundColor: 'rgba(11,20,38,0.72)' },
  skipBtn: { position: 'absolute', right: 24, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full },
  skipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28 },
  dots: { flexDirection: 'row', marginBottom: 28, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 28, backgroundColor: Colors.primary },
  badge: { backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, marginBottom: 16 },
  badgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.5 },
  slideTitle: { fontSize: FontSize.display, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, lineHeight: 42, marginBottom: 16 },
  slideSub: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 26, marginBottom: 36 },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  nextText: { color: Colors.textInverse, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  langScreen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 28 },
  langHeader: { marginBottom: 40, alignItems: 'center' },
  logoWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary, marginBottom: 12 },
  logoText: { fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.primary },
  langTitle: { fontSize: 36, fontWeight: FontWeight.extrabold, color: Colors.primary, letterSpacing: -1, marginBottom: 8 },
  langSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  langOptions: { gap: 14, marginBottom: 40 },
  langCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, borderWidth: 1.5, borderColor: Colors.surfaceBorder },
  langCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  langFlag: { fontSize: 30 },
  langLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary, flex: 1 },
  langLabelActive: { color: Colors.textPrimary },
  langCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  langCheckText: { color: Colors.textInverse, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  continueBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center' },
  continueBtnText: { color: Colors.textInverse, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  // Country
  countryHeader: { marginBottom: 20, alignItems: 'center', paddingHorizontal: 28 },
  countryTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  countrySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  countryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  countryCard: { width: '30%', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 12, borderWidth: 1.5, borderColor: Colors.surfaceBorder, position: 'relative' },
  countryCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  countryFlag: { fontSize: 28 },
  countryName: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', fontWeight: FontWeight.medium },
  countryNameActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  countryCurrency: { fontSize: 10, color: Colors.textMuted },
  countryCheck: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  countryActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8 },
  backBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  backBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  continueBtn2: { flex: 2, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
});
