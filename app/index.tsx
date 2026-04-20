import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealth } from '@/hooks/useHealth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Language } from '@/constants/i18n';

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

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [langSelected, setLangSelected] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useHealth();
  const { language, setLanguage, t } = useLanguage();

  const titleKeys = ['onboarding_title_1', 'onboarding_title_2', 'onboarding_title_3'] as const;
  const subKeys = ['onboarding_sub_1', 'onboarding_sub_2', 'onboarding_sub_3'] as const;

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  if (!langSelected) {
    return (
      <View style={[styles.langScreen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <View style={styles.langHeader}>
          <Text style={styles.langTitle}>VitalCore AI</Text>
          <Text style={styles.langSubtitle}>Choose your language / Choisissez votre langue / اختر لغتك</Text>
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
              {language === lang.code && <View style={styles.langCheck}><Text style={styles.langCheckText}>✓</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.langContinueBtn} onPress={() => setLangSelected(true)} activeOpacity={0.9}>
          <Text style={styles.langContinueText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Image
        source={slides[step].image}
        style={styles.bgImage}
        contentFit="cover"
        transition={400}
      />
      <View style={styles.overlay} />

      {/* Skip */}
      <TouchableOpacity
        style={[styles.skipBtn, { top: insets.top + 16 }]}
        onPress={handleSkip}
        activeOpacity={0.8}
      >
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Evidence-Based Medicine</Text>
        </View>

        <Text style={styles.title}>{t(titleKeys[step])}</Text>
        <Text style={styles.subtitle}>{t(subKeys[step])}</Text>

        {/* Buttons */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.9}>
          <Text style={styles.nextText}>
            {step === slides.length - 1 ? t('get_started') : t('next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgImage: { position: 'absolute', width, height, top: 0, left: 0 },
  overlay: {
    position: 'absolute', width, height, top: 0, left: 0,
    backgroundColor: 'rgba(11, 20, 38, 0.72)',
  },
  skipBtn: {
    position: 'absolute', right: 24, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
  },
  skipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  content: {
    flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28,
  },
  dots: { flexDirection: 'row', marginBottom: 28, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 28, backgroundColor: Colors.primary },
  badge: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1, borderColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full, marginBottom: 16,
  },
  badgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.5 },
  title: {
    fontSize: FontSize.display, fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary, lineHeight: 42, marginBottom: 16,
  },
  subtitle: {
    fontSize: FontSize.base, color: Colors.textSecondary,
    lineHeight: 26, marginBottom: 36,
  },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
  },
  nextText: { color: Colors.textInverse, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  // Language screen
  langScreen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 28 },
  langHeader: { marginBottom: 48, alignItems: 'center' },
  langTitle: {
    fontSize: 38, fontWeight: FontWeight.extrabold,
    color: Colors.primary, letterSpacing: -1, marginBottom: 12,
  },
  langSubtitle: {
    fontSize: FontSize.sm, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  langOptions: { gap: 16, marginBottom: 48 },
  langCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 20, borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  langCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  langFlag: { fontSize: 32 },
  langLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary, flex: 1 },
  langLabelActive: { color: Colors.textPrimary },
  langCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  langCheckText: { color: Colors.textInverse, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  langContinueBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 18, alignItems: 'center',
  },
  langContinueText: { color: Colors.textInverse, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
