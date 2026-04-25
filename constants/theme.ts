// VitalCore AI — Enhanced Design System v3
export const Colors = {
  // === BACKGROUNDS ===
  background: '#080F1E',
  surface: '#0F1A2E',
  surfaceElevated: '#152238',
  surfaceHighlight: '#1A2A42',
  surfaceBorder: '#1E2F4A',

  // === BRAND ===
  primary: '#00D4FF',
  primaryMuted: 'rgba(0, 212, 255, 0.12)',
  primaryStrong: 'rgba(0, 212, 255, 0.25)',
  primaryDim: '#0099BB',
  gold: '#FFB800',
  goldMuted: 'rgba(255, 184, 0, 0.12)',
  goldStrong: 'rgba(255, 184, 0, 0.25)',

  // === SEMANTIC ===
  success: '#00E676',
  successMuted: 'rgba(0, 230, 118, 0.10)',
  successStrong: 'rgba(0, 230, 118, 0.22)',
  warning: '#FF9800',
  warningMuted: 'rgba(255, 152, 0, 0.10)',
  danger: '#FF5252',
  dangerMuted: 'rgba(255, 82, 82, 0.10)',
  dangerStrong: 'rgba(255, 82, 82, 0.20)',
  purple: '#A78BFA',
  purpleMuted: 'rgba(167, 139, 250, 0.12)',
  purpleStrong: 'rgba(167, 139, 250, 0.22)',

  // === TEXT ===
  textPrimary: '#F0F4FF',
  textSecondary: '#7A8FAD',
  textMuted: '#3D5070',
  textInverse: '#080F1E',
  textAccent: '#00D4FF',

  // === TABS & NAV ===
  tabActive: '#00D4FF',
  tabInactive: '#3D5070',
  tabBar: '#0A1220',
  tabBorder: '#141E32',

  // === OVERLAYS ===
  overlay: 'rgba(8,15,30,0.85)',
  overlayLight: 'rgba(8,15,30,0.55)',
  glass: 'rgba(15,26,46,0.92)',
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const FontSize = {
  micro: 9,
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 36,
  hero: 44,
};

export const FontWeight: Record<string, '400' | '500' | '600' | '700' | '800'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  primary: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gold: {
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

// === REUSABLE BUTTON PRESETS ===
export const ButtonPresets = {
  // Primary CTA — filled cyan, large
  primary: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      backgroundColor: Colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: 16,
      paddingHorizontal: 24,
      ...Shadow.primary,
    },
    text: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: Colors.textInverse,
      letterSpacing: 0.3,
    },
  },
  // Secondary — bordered
  secondary: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      backgroundColor: Colors.primaryMuted,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: Colors.primary + '44',
    },
    text: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: Colors.primary,
    },
  },
  // Danger
  danger: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      backgroundColor: Colors.dangerMuted,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: Colors.danger + '44',
    },
    text: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: Colors.danger,
    },
  },
  // Gold accent
  gold: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      backgroundColor: Colors.gold,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      paddingHorizontal: 20,
      ...Shadow.gold,
    },
    text: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: Colors.textInverse,
    },
  },
  // Ghost (text only)
  ghost: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    text: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
      color: Colors.textSecondary,
    },
  },
};
