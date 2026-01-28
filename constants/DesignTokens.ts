/**
 * Design System Constants
 * Centralized design tokens for consistent UI across the admin app
 * Uses red theme to distinguish from merchant app (blue)
 */

// Color Palette
export const Colors = {
  // Primary Brand Colors (Red for Admin)
  primary: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Main brand color
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Secondary Colors
  secondary: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },

  // Semantic Colors
  success: {
    50: '#F0FFF4',
    100: '#C6F6D5',
    200: '#9AE6B4',
    300: '#68D391',
    400: '#48BB78',
    500: '#38A169',
    600: '#2F855A',
    700: '#276749',
    800: '#22543D',
    900: '#1C4532',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutral Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#374151',
    tertiary: '#6B7280',
    inverse: '#FFFFFF',
    disabled: '#9CA3AF',
  },

  // Border Colors
  border: {
    light: '#F3F4F6',
    default: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
    focus: '#DC2626',
  },
};

// Typography Scale
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    mono: 'Courier',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 52,
    '6xl': 64,
  },

  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

// Spacing Scale (in pixels)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
};

// Layout Dimensions
export const Layout = {
  header: {
    height: 64,
    paddingHorizontal: 20,
  },

  tabBar: {
    height: 70,
    paddingBottom: 12,
  },

  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },

  button: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  input: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
};

// Business-Specific Color Mappings for Admin
export const BusinessColors = {
  merchant: {
    pending: Colors.warning[500],
    approved: Colors.success[500],
    rejected: Colors.error[500],
    suspended: Colors.gray[500],
  },

  order: {
    pending: Colors.warning[500],
    confirmed: Colors.info[500],
    preparing: Colors.warning[600],
    ready: Colors.success[400],
    delivered: Colors.success[500],
    cancelled: Colors.error[500],
    refunded: Colors.gray[500],
  },

  coinReward: {
    pending: Colors.warning[500],
    approved: Colors.success[500],
    rejected: Colors.error[500],
    credited: Colors.success[600],
  },

  adminRole: {
    support: Colors.success[500],
    operator: Colors.info[500],
    admin: Colors.primary[500],
    super_admin: Colors.primary[700],
  },
};

// Icon Sizes
export const IconSizes = {
  xs: 12,
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};
