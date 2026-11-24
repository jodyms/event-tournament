export const colors = {
  canvas: '#0A0A0F',
  nav: '#0D0D18',
  surface: '#141420',
  surfaceRaised: '#1E1E2E',
  input: '#272B30',
  border: '#303044',
  borderInput: '#4F575E',
  brand: '#3EBF5F',
  brandPressed: '#38A956',
  live: '#E8FF4A',
  error: '#F04444',
  warning: '#FFB547',
  text: '#FFFFFF',
  muted: '#A0A0B0',
  subtle: '#6B6B80',
  successSurface: '#123325',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;
