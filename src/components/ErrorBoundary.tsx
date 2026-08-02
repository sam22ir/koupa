import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, space, typography } from '@/src/theme';

type Props = { readonly children: ReactNode };
type State = { readonly error: Error | null };

/** Keeps Expo Go from going fully blank when a render crash occurs. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>حدث خطأ في التطبيق</Text>
        <ScrollView style={styles.box} contentContainerStyle={styles.boxContent}>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: space[5],
    justifyContent: 'center',
    gap: space[3],
  },
  title: {
    ...typography.titleSm,
    color: colors.danger,
    textAlign: 'right',
  },
  box: {
    maxHeight: 320,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxContent: {
    padding: space[4],
    gap: space[2],
  },
  message: {
    ...typography.bodyStrong,
    textAlign: 'left',
  },
  stack: {
    ...typography.caption,
    textAlign: 'left',
  },
});
