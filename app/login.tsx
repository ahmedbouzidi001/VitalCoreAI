import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithPassword, signUpWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        showAlert('Erreur', 'Les mots de passe ne correspondent pas.');
        return;
      }
      if (password.length < 6) {
        showAlert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      const { error } = await signUpWithPassword(email.trim(), password, { username: name.trim() });
      if (error) { showAlert('Erreur inscription', error); return; }
      showAlert('Compte créé !', 'Bienvenue sur VitalCore AI. Votre parcours santé commence maintenant.', [
        { text: 'Commencer', onPress: () => router.replace('/(tabs)') }
      ]);
    } else {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) { showAlert('Erreur connexion', error); return; }
      router.replace('/(tabs)');
    }
  };

  const inputStyle = (field: string) => [
    styles.inputWrap,
    focusedField === field && styles.inputWrapFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo & Branding */}
        <View style={styles.header}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <MaterialIcons name="favorite" size={28} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.brand}>VitalCore AI</Text>
          <Text style={styles.tagline}>Evidence-Based Health Intelligence</Text>
          <View style={styles.taglineBadge}>
            <MaterialIcons name="verified" size={11} color={Colors.primary} />
            <Text style={styles.taglineBadgeText}>Médecine factuelle • IA Gemini</Text>
          </View>
        </View>

        {/* Mode Switcher */}
        <View style={styles.tabRow}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.tabBtn, mode === m && styles.tabBtnActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={m === 'login' ? 'login' : 'person-add'}
                size={14}
                color={mode === m ? Colors.textInverse : Colors.textSecondary}
              />
              <Text style={[styles.tabBtnText, mode === m && styles.tabBtnTextActive]}>
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet</Text>
              <View style={inputStyle('name')}>
                <MaterialIcons name="person-outline" size={18} color={focusedField === 'name' ? Colors.primary : Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ahmed Ben Ali"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={inputStyle('email')}>
              <MaterialIcons name="mail-outline" size={18} color={focusedField === 'email' ? Colors.primary : Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ahmed@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={inputStyle('password')}>
              <MaterialIcons name="lock-outline" size={18} color={focusedField === 'password' ? Colors.primary : Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name={showPass ? 'visibility' : 'visibility-off'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={inputStyle('confirm')}>
                <MaterialIcons name="lock-outline" size={18} color={focusedField === 'confirm' ? Colors.primary : Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          )}

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.submitBtn, operationLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={operationLoading}
            activeOpacity={0.87}
          >
            {operationLoading
              ? <Text style={styles.submitBtnText}>Chargement...</Text>
              : <>
                  <MaterialIcons name={mode === 'login' ? 'login' : 'person-add'} size={18} color={Colors.textInverse} />
                  <Text style={styles.submitBtnText}>
                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  </Text>
                </>
            }
          </TouchableOpacity>

          {/* Guest Mode */}
          <TouchableOpacity style={styles.guestBtn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.75}>
            <Text style={styles.guestText}>Continuer sans compte (mode démo)</Text>
            <MaterialIcons name="arrow-forward" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Feature Pills */}
        <View style={styles.features}>
          <Text style={styles.featuresLabel}>Fonctionnalités incluses</Text>
          <View style={styles.featurePills}>
            {[
              { icon: 'biotech', label: 'Biomarqueurs IA', color: Colors.primary },
              { icon: 'restaurant', label: 'Nutrition perso', color: Colors.gold },
              { icon: 'fitness-center', label: 'Entraînement', color: Colors.success },
              { icon: 'psychology', label: 'Chat IA', color: Colors.purple },
            ].map((f, i) => (
              <View key={i} style={[styles.featurePill, { backgroundColor: f.color + '15', borderColor: f.color + '30' }]}>
                <MaterialIcons name={f.icon as any} size={13} color={f.color} />
                <Text style={[styles.featurePillText, { color: f.color }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.xl },

  header: { alignItems: 'center', marginBottom: 32 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5, borderColor: Colors.primary + '55',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, backgroundColor: Colors.surface,
    ...Shadow.primary,
  },
  logoInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '33',
  },
  brand: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 },
  taglineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  taglineBadgeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: 4,
    marginBottom: 24,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.md,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadow.primary,
  },
  tabBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.textInverse },

  form: { gap: 14, marginBottom: 20 },
  inputGroup: { gap: 7 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, paddingLeft: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14, paddingVertical: 2,
    minHeight: 52,
  },
  inputWrapFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
    ...Shadow.sm,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, color: Colors.textPrimary, fontSize: FontSize.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  eyeBtn: { padding: 4, marginLeft: 6 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 17, marginTop: 6,
    ...Shadow.primary,
  },
  submitBtnDisabled: { backgroundColor: Colors.textMuted, shadowOpacity: 0 },
  submitBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse, letterSpacing: 0.2 },

  guestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14,
  },
  guestText: { fontSize: FontSize.sm, color: Colors.textMuted },

  features: { gap: 10 },
  featuresLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', letterSpacing: 0.5 },
  featurePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
  },
  featurePillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
