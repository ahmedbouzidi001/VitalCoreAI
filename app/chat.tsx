// VitalCore AI — Conversational AI Chat Screen
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useHealth } from '@/hooks/useHealth';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { addXP } from '@/services/gamification';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  { fr: 'Pourquoi ma Vitamine D est faible ?', ar: 'لماذا فيتامين د منخفض ؟' },
  { fr: 'Quel impact sur mes entraînements ?', ar: 'ما تأثير هذا على تدريباتي ؟' },
  { fr: 'Quels aliments pour mes carences ?', ar: 'ما الأطعمة لعلاج نقصي ؟' },
  { fr: 'Comment améliorer mon score santé ?', ar: 'كيف أحسن نقاط صحتي ؟' },
  { fr: 'Quels suppléments recommandes-tu ?', ar: 'ما المكملات التي توصي بها ؟' },
];

function MessageBubble({ msg, isAr }: { msg: Message; isAr: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <MaterialIcons name="psychology" size={16} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {msg.content}
        </Text>
        <Text style={[styles.bubbleTime, isUser ? { color: 'rgba(255,255,255,0.6)' } : {}]}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { biomarkers, profile, deficiencies, healthScore } = useHealth();
  const isAr = language === 'ar';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: isAr
        ? `مرحباً! أنا VitalCore AI، مساعدك الصحي الشخصي. لديّ وصول إلى بياناتك البيولوجية وأستطيع الإجابة على أسئلتك الصحية بدقة علمية. كيف يمكنني مساعدتك اليوم؟`
        : `Bonjour ! Je suis VitalCore AI, votre assistant santé personnel. J'ai accès à vos données biologiques (${biomarkers.length} marqueurs, score santé : ${healthScore}/100) et je peux répondre à vos questions avec une précision médicale basée sur les preuves. Comment puis-je vous aider ?`,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildSystemContext = useCallback(() => {
    const defList = deficiencies.map(d => `${d.name}: ${d.value} ${d.unit} (min: ${d.normalMin})`).join(', ');
    const markerList = biomarkers.slice(0, 8).map(b => {
      const status = b.value < b.normalMin ? 'DÉFICIENT' : b.value > b.normalMax ? 'ÉLEVÉ' : 'OPTIMAL';
      return `${b.name}: ${b.value} ${b.unit} [${status}]`;
    }).join('\n');

    return `Tu es VitalCore AI, un assistant santé expert en médecine factuelle (EBM), nutrition sportive et biologie.
Réponds en ${language === 'ar' ? 'arabe' : language === 'en' ? 'anglais' : 'français'}. Sois précis, scientifique, chaleureux et actionnable.

DONNÉES BIOLOGIQUES DE L'UTILISATEUR:
- Profil: ${profile.age} ans, ${profile.gender}, ${profile.weight}kg, ${profile.height}cm
- Activité: ${profile.activityLevel}
- Objectifs: ${profile.goals.join(', ')}
- Score Santé: ${healthScore}/100
- Carences: ${defList || 'Aucune'}
- Marqueurs:
${markerList}

INSTRUCTIONS:
- Réponds directement aux questions en te basant sur les données biologiques de l'utilisateur
- Cite des sources scientifiques quand c'est pertinent (ex: Holick 2011, Schoenfeld 2010)
- Donne des conseils pratiques et personnalisés basés sur ces biomarqueurs
- Évite les généralités — sois spécifique à ce profil
- Si la question dépasse tes capacités, recommande de consulter un médecin`;
  }, [biomarkers, profile, deficiencies, healthScore, language]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const conversationHistory = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('vital-ai', {
        body: {
          type: 'chat',
          message: trimmed,
          history: conversationHistory,
          systemContext: buildSystemContext(),
          language,
        },
      });

      let aiContent = '';
      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const textContent = await error.context?.text();
            errorMessage = textContent || error.message;
          } catch { }
        }
        aiContent = isAr
          ? `عذراً، حدث خطأ: ${errorMessage}`
          : `Désolé, une erreur s'est produite: ${errorMessage}`;
      } else {
        aiContent = data?.data?.content || data?.content || (isAr ? 'لم أتمكن من توليد رد.' : 'Je n\'ai pas pu générer une réponse.');
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
      if (user) addXP(user.id, 'run_ai_analysis').catch(() => { });
    } catch (e: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isAr ? 'حدث خطأ في الاتصال.' : 'Erreur de connexion. Vérifiez votre réseau.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [isLoading, messages, buildSystemContext, language, user, isAr, scrollToBottom]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: isAr ? 'تم مسح المحادثة. كيف يمكنني مساعدتك ؟' : 'Conversation effacée. Comment puis-je vous aider ?',
      timestamp: new Date(),
    }]);
  }, [isAr]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.aiAvatarLarge}>
              <MaterialIcons name="psychology" size={20} color={Colors.textInverse} />
            </View>
            <View>
              <Text style={styles.headerTitle}>VitalCore AI</Text>
              <Text style={styles.headerStatus}>
                {isAr ? `${biomarkers.length} مؤشر · نقاط: ${healthScore}` : `${biomarkers.length} marqueurs · Score: ${healthScore}/100`}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
            <MaterialIcons name="delete-sweep" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Context Bar */}
        {deficiencies.length > 0 && (
          <View style={styles.contextBar}>
            <MaterialIcons name="warning-amber" size={14} color={Colors.warning} />
            <Text style={styles.contextBarText} numberOfLines={1}>
              {isAr
                ? `${deficiencies.length} نقص مكتشف: ${deficiencies.map(d => d.name).slice(0, 2).join('، ')}`
                : `${deficiencies.length} carence(s): ${deficiencies.map(d => d.name).slice(0, 2).join(', ')}`
              }
            </Text>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} isAr={isAr} />
          ))}

          {isLoading && (
            <View style={styles.bubbleRow}>
              <View style={styles.aiAvatar}>
                <MaterialIcons name="psychology" size={16} color={Colors.primary} />
              </View>
              <View style={[styles.bubble, styles.bubbleAI, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>{isAr ? 'يفكر...' : 'En réflexion...'}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Quick Questions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
          style={styles.quickScrollView}
        >
          {QUICK_QUESTIONS.map((q, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickChip}
              onPress={() => sendMessage(isAr ? q.ar : q.fr)}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={styles.quickChipText}>{isAr ? q.ar : q.fr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isAr ? 'اسأل عن صحتك...' : 'Posez votre question santé...'}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <MaterialIcons name="send" size={20} color={Colors.textInverse} />
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiAvatarLarge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadow.primary,
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerStatus: { fontSize: FontSize.xs, color: Colors.textMuted },
  clearBtn: { padding: 4 },

  contextBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.md, marginBottom: 4,
    backgroundColor: Colors.warningMuted, borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  contextBarText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning },

  messageList: { flex: 1 },
  messageContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAI: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
    ...Shadow.primary,
  },
  bubbleAI: {
    backgroundColor: Colors.surfaceElevated,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  bubbleText: { fontSize: FontSize.sm, lineHeight: 20 },
  bubbleTextUser: { color: Colors.textInverse },
  bubbleTextAI: { color: Colors.textPrimary },
  bubbleTime: { fontSize: 10, color: Colors.textMuted, alignSelf: 'flex-end' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: FontSize.xs, color: Colors.textMuted },

  quickScrollView: { maxHeight: 44, marginBottom: 4 },
  quickRow: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center' },
  quickChip: {
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.primary + '44',
    flexShrink: 0,
  },
  quickChipText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: Spacing.md, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, paddingTop: 10,
    color: Colors.textPrimary, fontSize: FontSize.sm,
    maxHeight: 100, borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    lineHeight: 20,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadow.primary,
  },
  sendBtnDisabled: { backgroundColor: Colors.textMuted },
});
