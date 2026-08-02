/**
 * IBM Plex Sans Arabic — app typeface.
 * Each weight is a separate family name (React Native custom-font pattern).
 */
export const fonts = {
  thin: 'IBMPlexSansArabic-Thin',
  extraLight: 'IBMPlexSansArabic-ExtraLight',
  light: 'IBMPlexSansArabic-Light',
  regular: 'IBMPlexSansArabic-Regular',
  medium: 'IBMPlexSansArabic-Medium',
  semiBold: 'IBMPlexSansArabic-SemiBold',
  bold: 'IBMPlexSansArabic-Bold',
} as const;

/** Default UI face (regular). */
export const fontFamily = fonts.regular;

/** Map for expo-font useFonts(). Keep requires here only. */
export function getFontAssets() {
  return {
    [fonts.thin]: require('../../assets/fonts/IBMPlexSansArabic-Thin.ttf'),
    [fonts.extraLight]: require('../../assets/fonts/IBMPlexSansArabic-ExtraLight.ttf'),
    [fonts.light]: require('../../assets/fonts/IBMPlexSansArabic-Light.ttf'),
    [fonts.regular]: require('../../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
    [fonts.medium]: require('../../assets/fonts/IBMPlexSansArabic-Medium.ttf'),
    [fonts.semiBold]: require('../../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
    [fonts.bold]: require('../../assets/fonts/IBMPlexSansArabic-Bold.ttf'),
  } as const;
}
