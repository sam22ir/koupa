import { router } from 'expo-router';

/**
 * The shop sub-screens (details, member, create, search, activity) are hidden
 * tabs of the barber tab bar, not a stack, so `router.dismissTo` has nothing to
 * dismiss and silently does nothing. Tabs keep visit history instead
 * (`backBehavior="history"` in the barber layout).
 */
export const BARBER_SHOP_HREF = '/(barber)/shop' as const;

/** Back control: previous screen when there is one, otherwise the Shop tab. */
export function goBackFromShopScreen(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.navigate(BARBER_SHOP_HREF);
}

/** After a finished action (join, create, remove): land on the Shop tab. */
export function returnToShopTab(): void {
  router.navigate(BARBER_SHOP_HREF);
}
