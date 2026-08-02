import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { TabIcon } from '@/src/components/navigation/TabIcon';
import { t } from '@/src/i18n';
import { colors, typography } from '@/src/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[typography.tab, focused && typography.tabActive, { textAlign: 'center' }]}>
      {label}
    </Text>
  );
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
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
        name="appointments"
        options={{
          title: t('tabs.appointments'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel label={t('tabs.appointments')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="find"
        options={{
          title: t('tabs.find'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label={t('tabs.find')} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label={t('tabs.home')} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
