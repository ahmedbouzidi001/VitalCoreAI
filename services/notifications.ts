// VitalCore AI — Real Push Notifications Service
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleHydrationReminders(language: string = 'fr'): Promise<void> {
  const messages: Record<string, { title: string; body: string }> = {
    fr: { title: '💧 Hydratation', body: 'Pensez à boire un verre d\'eau ! Objectif : 2.5L/jour.' },
    ar: { title: '💧 ترطيب', body: 'تذكر شرب الماء! الهدف: 2.5 لتر يومياً.' },
    en: { title: '💧 Hydration', body: 'Time to drink water! Goal: 2.5L/day.' },
  };
  const msg = messages[language] || messages.fr;
  const hours = [9, 11, 13, 15, 17, 19, 21];

  for (const hour of hours) {
    await Notifications.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, sound: true },
      trigger: { hour, minute: 0, repeats: true, type: Notifications.SchedulableTriggerInputTypes.DAILY },
    });
  }
}

export async function scheduleMealReminders(language: string = 'fr'): Promise<void> {
  const schedules = [
    {
      hour: 8, minute: 0,
      fr: { title: '🌅 Petit-déjeuner', body: 'Commencez la journée avec un petit-déjeuner riche en protéines !' },
      ar: { title: '🌅 الإفطار', body: 'ابدأ يومك بإفطار غني بالبروتين!' },
      en: { title: '🌅 Breakfast', body: 'Start your day with a protein-rich breakfast!' },
    },
    {
      hour: 13, minute: 0,
      fr: { title: '🍽️ Déjeuner', body: 'Il est l\'heure du déjeuner. Suivez votre plan nutritionnel !' },
      ar: { title: '🍽️ الغداء', body: 'حان وقت الغداء. اتبع خطتك الغذائية!' },
      en: { title: '🍽️ Lunch', body: 'Lunch time! Follow your nutrition plan.' },
    },
    {
      hour: 20, minute: 0,
      fr: { title: '🌙 Dîner', body: 'Dernier repas : privilégiez les protéines et les légumes.' },
      ar: { title: '🌙 العشاء', body: 'الوجبة الأخيرة: ركز على البروتين والخضروات.' },
      en: { title: '🌙 Dinner', body: 'Last meal: focus on proteins and vegetables.' },
    },
  ];

  for (const s of schedules) {
    const msg = (s as any)[language] || s.fr;
    await Notifications.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, sound: true },
      trigger: { hour: s.hour, minute: s.minute, repeats: true, type: Notifications.SchedulableTriggerInputTypes.DAILY },
    });
  }
}

export async function scheduleWorkoutReminder(language: string = 'fr', hour: number = 18): Promise<void> {
  const messages: Record<string, { title: string; body: string }> = {
    fr: { title: '🏋️ Entraînement', body: 'Votre séance du jour vous attend ! Restez cohérent, c\'est la clé.' },
    ar: { title: '🏋️ تدريب', body: 'جلسة تدريبك تنتظرك! الاتساق هو المفتاح.' },
    en: { title: '🏋️ Workout', body: 'Your training session awaits! Consistency is the key.' },
  };
  const msg = messages[language] || messages.fr;

  await Notifications.scheduleNotificationAsync({
    content: { title: msg.title, body: msg.body, sound: true },
    trigger: { hour, minute: 0, repeats: true, type: Notifications.SchedulableTriggerInputTypes.DAILY },
  });
}

export async function scheduleSleepReminder(language: string = 'fr'): Promise<void> {
  const messages: Record<string, { title: string; body: string }> = {
    fr: { title: '😴 Heure de dormir', body: '8h de sommeil = récupération optimale. Posez votre téléphone !' },
    ar: { title: '😴 وقت النوم', body: '8 ساعات نوم = تعافي أمثل. ضع هاتفك جانباً!' },
    en: { title: '😴 Sleep Time', body: '8h sleep = optimal recovery. Put down your phone!' },
  };
  const msg = messages[language] || messages.fr;

  await Notifications.scheduleNotificationAsync({
    content: { title: msg.title, body: msg.body, sound: true },
    trigger: { hour: 22, minute: 30, repeats: true, type: Notifications.SchedulableTriggerInputTypes.DAILY },
  });
}

export async function sendBiomarkerAlert(markerName: string, status: string, language: string = 'fr'): Promise<void> {
  const statusLabels: Record<string, Record<string, string>> = {
    fr: { low: 'Déficient', high: 'Élevé', critical: 'Critique' },
    ar: { low: 'منخفض', high: 'مرتفع', critical: 'حرج' },
    en: { low: 'Deficient', high: 'High', critical: 'Critical' },
  };
  const labels = statusLabels[language] || statusLabels.fr;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Biomarqueur ${labels[status] || status}`,
      body: `${markerName} est ${labels[status] || status}. Consultez vos recommandations VitalCore.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function enableAllNotifications(language: string = 'fr'): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;
  await cancelAllNotifications();
  await Promise.all([
    scheduleHydrationReminders(language),
    scheduleMealReminders(language),
    scheduleWorkoutReminder(language),
    scheduleSleepReminder(language),
  ]);
  return true;
}
