import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Stack, Title, Text, Button, Paper } from '@mantine/core';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Stack align="center" justify="center" h="100vh" p="xl">
          <Paper p="xl" withBorder maw={500} w="100%">
            <Stack gap="md" align="center">
              <Title order={3}>Something went wrong</Title>
              <Text c="dimmed" ta="center" size="sm">
                {this.state.error?.message ?? 'An unexpected error occurred.'}
              </Text>
              <Button onClick={() => window.location.reload()}>Reload</Button>
            </Stack>
          </Paper>
        </Stack>
      );
    }

    return this.props.children;
  }
}
