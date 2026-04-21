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
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

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
      if (error) {
        showAlert('Erreur inscription', error);
        return;
      }
      showAlert('Compte créé !', 'Bienvenue sur VitalCore AI. Votre parcours santé commence maintenant.', [
        { text: 'Commencer', onPress: () => router.replace('/(tabs)') }
      ]);
    } else {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) {
        showAlert('Erreur connexion', error);
        return;
      }
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <MaterialIcons name="favorite" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.brand}>VitalCore AI</Text>
          <Text style={styles.tagline}>Evidence-Based Health Intelligence</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.tabBtn, mode === m && styles.tabBtnActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
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
              <View style={styles.inputWrap}>
                <MaterialIcons name="person" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ahmed Ben Ali"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="email" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ahmed@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <MaterialIcons name={showPass ? 'visibility' : 'visibility-off'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.inputWrap}>
                <MaterialIcons name="lock-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, operationLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={operationLoading}
            activeOpacity={0.9}
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

          {/* Guest mode */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.guestText}>Continuer sans compte (mode démo)</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: 'biotech', label: 'Analyse biomarqueurs IA' },
            { icon: 'restaurant', label: 'Plan nutritionnel personnalisé' },
            { icon: 'fitness-center', label: 'Entraînement basé sur la science' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialIcons name={f.icon as any} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, flexGrow: 1, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 36 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary,
    marginBottom: 16,
  },
  brand: { fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.primary, letterSpacing: -1 },
  tagline: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: 4, marginBottom: 28,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.textInverse },

  form: { gap: 16, marginBottom: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14, paddingVertical: 2,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, color: Colors.textPrimary, fontSize: FontSize.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  eyeBtn: { padding: 4 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: Colors.textMuted },
  submitBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textInverse },

  guestBtn: { alignItems: 'center', paddingVertical: 12 },
  guestText: { fontSize: FontSize.sm, color: Colors.textMuted, textDecorationLine: 'underline' },

  features: { gap: 12, paddingTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
