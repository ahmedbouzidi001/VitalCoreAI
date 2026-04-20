// VitalCore AI — Design System Tokens
export const Colors = {
  // Core Palette
  background: '#0B1426',
  surface: '#111D35',
  surfaceElevated: '#162040',
  surfaceBorder: '#1E2D4A',

  // Brand
  primary: '#00D4FF',
  primaryMuted: 'rgba(0, 212, 255, 0.15)',
  gold: '#FFB800',
  goldMuted: 'rgba(255, 184, 0, 0.15)',

  // Semantic
  success: '#00E676',
  successMuted: 'rgba(0, 230, 118, 0.12)',
  warning: '#FF9800',
  warningMuted: 'rgba(255, 152, 0, 0.12)',
  danger: '#FF5252',
  dangerMuted: 'rgba(255, 82, 82, 0.12)',
  purple: '#A78BFA',
  purpleMuted: 'rgba(167, 139, 250, 0.12)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8A9BC1',
  textMuted: '#4A5E80',
  textInverse: '#0B1426',

  // Tabs & Nav
  tabActive: '#00D4FF',
  tabInactive: '#4A5E80',
  tabBar: '#0D1830',
  tabBorder: '#1A2845',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 34,
};

export const FontWeight: Record<string, '400' | '500' | '600' | '700' | '800'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};
