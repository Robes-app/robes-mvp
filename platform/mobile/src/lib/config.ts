import Constants from 'expo-constants';

// EXPO_PUBLIC_* values are inlined at build time; they are public config, never secrets.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3300';
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
