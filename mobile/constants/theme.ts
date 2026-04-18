/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const academyPrimary = '#3f51b5';
const academyBackground = '#f8f9fa';
const academySurface = '#ffffff';
const academyError = '#ff5252';
const academyTintDark = '#e8eaf6';

export const Colors = {
  light: {
    text: '#1f2937',
    background: academyBackground,
    tint: academyPrimary,
    icon: '#6b7280',
    tabIconDefault: '#8a94a6',
    tabIconSelected: academyPrimary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#101321',
    tint: academyTintDark,
    icon: '#A8B0C2',
    tabIconDefault: '#A8B0C2',
    tabIconSelected: academyTintDark,
  },
};

export const AcademyTheme = {
  colors: {
    primary: academyPrimary,
    background: academyBackground,
    surface: academySurface,
    error: academyError,
    textPrimary: '#1f2937',
    textMuted: '#6b7280',
    border: '#d5dbe5',
    inputFocus: academyPrimary,
    chipBg: '#e8edff',
    chipText: '#1f3d99',
    success: '#2e7d32',
    warning: '#f59e0b',
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: '#1f2937',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
