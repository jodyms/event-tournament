export function isDemoMode() {
  if (process.env.EXPO_PUBLIC_API_URL) return false;
  return typeof __DEV__ === 'boolean' ? __DEV__ || process.env.NODE_ENV === 'test' : process.env.NODE_ENV !== 'production';
}
