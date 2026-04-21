// VitalCore AI — Countries, Currencies & Food Cultures

export interface CountryConfig {
  code: string;
  name: string;
  nameAr: string;
  nameFr: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  region: string;
  foodCulture: string[];
  language: 'ar' | 'fr' | 'en';
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'TN', name: 'Tunisia', nameAr: 'تونس', nameFr: 'Tunisie',
    flag: '🇹🇳', currency: 'TND', currencySymbol: 'DT',
    region: 'Maghreb', language: 'ar',
    foodCulture: ['Couscous', 'Lablabi', 'Ojja', 'Brik', 'Tajine', 'Harissa', 'Merguez', 'Chorba'],
  },
  {
    code: 'FR', name: 'France', nameAr: 'فرنسا', nameFr: 'France',
    flag: '🇫🇷', currency: 'EUR', currencySymbol: '€',
    region: 'Europe', language: 'fr',
    foodCulture: ['Ratatouille', 'Quiche', 'Cassoulet', 'Bouillabaisse', 'Crêpes', 'Salade Niçoise'],
  },
  {
    code: 'MA', name: 'Morocco', nameAr: 'المغرب', nameFr: 'Maroc',
    flag: '🇲🇦', currency: 'MAD', currencySymbol: 'DH',
    region: 'Maghreb', language: 'ar',
    foodCulture: ['Tagine', 'Pastilla', 'Harira', 'Mechoui', 'Couscous Marocain', 'Rfissa'],
  },
  {
    code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', nameFr: 'Algérie',
    flag: '🇩🇿', currency: 'DZD', currencySymbol: 'DA',
    region: 'Maghreb', language: 'ar',
    foodCulture: ['Chakhchoukha', 'Rechta', 'Méchoui', 'Berkoukes', 'Couscous Algérien'],
  },
  {
    code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', nameFr: 'Arabie Saoudite',
    flag: '🇸🇦', currency: 'SAR', currencySymbol: 'ر.س',
    region: 'Middle East', language: 'ar',
    foodCulture: ['Kabsa', 'Mandi', 'Jareesh', 'Mutabbaq', 'Saleeg', 'Harees'],
  },
  {
    code: 'AE', name: 'UAE', nameAr: 'الإمارات', nameFr: 'Émirats Arabes Unis',
    flag: '🇦🇪', currency: 'AED', currencySymbol: 'د.إ',
    region: 'Middle East', language: 'ar',
    foodCulture: ['Machboos', 'Harees', 'Luqaimat', 'Thareed', 'Al Harees'],
  },
  {
    code: 'TR', name: 'Turkey', nameAr: 'تركيا', nameFr: 'Turquie',
    flag: '🇹🇷', currency: 'TRY', currencySymbol: '₺',
    region: 'Mediterranean', language: 'en',
    foodCulture: ['Kebab', 'Meze', 'Baklava', 'Dolma', 'Pide', 'Kofte', 'Menemen'],
  },
  {
    code: 'GR', name: 'Greece', nameAr: 'اليونان', nameFr: 'Grèce',
    flag: '🇬🇷', currency: 'EUR', currencySymbol: '€',
    region: 'Mediterranean', language: 'en',
    foodCulture: ['Souvlaki', 'Moussaka', 'Tzatziki', 'Spanakopita', 'Horiatiki', 'Gyros'],
  },
  {
    code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', nameFr: 'États-Unis',
    flag: '🇺🇸', currency: 'USD', currencySymbol: '$',
    region: 'Americas', language: 'en',
    foodCulture: ['BBQ', 'Burger', 'Mac and Cheese', 'Clam Chowder', 'Buffalo Wings'],
  },
  {
    code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', nameFr: 'Royaume-Uni',
    flag: '🇬🇧', currency: 'GBP', currencySymbol: '£',
    region: 'Europe', language: 'en',
    foodCulture: ['Fish and Chips', 'Sunday Roast', 'Shepherd\'s Pie', 'Full English'],
  },
];

export function getCountryByCode(code: string): CountryConfig {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
}

export function formatCurrency(amount: number, currencySymbol: string): string {
  return `${amount.toLocaleString()} ${currencySymbol}`;
}

// Subscription prices per country/currency
export const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  TND: { monthly: 29, yearly: 249 },
  EUR: { monthly: 9.99, yearly: 79 },
  MAD: { monthly: 99, yearly: 799 },
  DZD: { monthly: 1290, yearly: 10990 },
  SAR: { monthly: 39, yearly: 329 },
  AED: { monthly: 39, yearly: 329 },
  TRY: { monthly: 149, yearly: 1290 },
  USD: { monthly: 9.99, yearly: 79 },
  GBP: { monthly: 7.99, yearly: 64 },
};
