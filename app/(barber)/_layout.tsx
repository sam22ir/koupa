import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { TabIcon } from '@/src/components/navigation/TabIcon';
import { useTabBarStyle } from '@/src/components/navigation/tabBarStyle';
import { t } from '@/src/i18n';
import { colors, typography } from '@/src/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[typography.tab, focused && typography.tabActive, { textAlign: 'center' }]}>
      {label}
    </Text>
  );
}

export default function BarberLayout() {
  const tabBarStyle = useTabBarStyle();
  return (
    <Tabs
      // Shop sub-screens are hidden tabs; history lets Back return to the
      // screen the barber came from instead of the first tab.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle,
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label={t('tabs.profile')} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('tabs.shop'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'storefront' : 'storefront-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label={t('tabs.shop')} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t('tabs.schedule'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'time' : 'time-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label={t('tabs.schedule')} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'today' : 'today-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label={t('tabs.today')} focused={focused} />,
        }}
      />
      <Tabs.Screen name="shop-search" options={{ href: null }} />
      <Tabs.Screen name="shop-create" options={{ href: null }} />
      <Tabs.Screen name="shop-details/[id]" options={{ href: null }} />
      <Tabs.Screen name="shop-member/[barberId]" options={{ href: null }} />
      <Tabs.Screen name="shop-activity/[id]" options={{ href: null }} />
    </Tabs>
  );
}
