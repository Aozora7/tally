import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';
import '@fontsource-variable/inter';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles/global.css';

const colors: Record<string, MantineColorsTuple> = {
  dark: ['#C1C2C5', '#A6A7AB', '#909296', '#5C5F66', '#373A40', '#2C2E33', '#25262B', '#1A1B1E', '#141517', '#101113'],
  brand: ['#E0F7FF', '#B3E9FF', '#80D9FF', '#4DC8FF', '#2AB5FF', '#1A9FFF', '#1791E8', '#137CC9', '#0D67AB', '#08528D'],
  accent: ['#E6F4EA', '#C2E5CC', '#9AD4AB', '#6EC28A', '#4DB072', '#35A05C', '#2D8E50', '#247342', '#1C5C35', '#134528'],
  warning: ['#FDF5E6', '#F8E4B8', '#F2D08A', '#E9BA5C', '#DFA638', '#D4941F', '#C4841A', '#A56E14', '#88590F', '#6B440A'],
  danger: ['#FCE8E8', '#F5C4C4', '#EC9A9A', '#E07070', '#D45050', '#C43A3A', '#B33030', '#952828', '#782020', '#5C1818'],
  income: ['#E6F4EA', '#C2E5CC', '#9AD4AB', '#6EC28A', '#4DB072', '#35A05C', '#2D8E50', '#247342', '#1C5C35', '#134528'],
  expense: ['#FCE8E8', '#F5C4C4', '#EC9A9A', '#E07070', '#D45050', '#C43A3A', '#B33030', '#952828', '#782020', '#5C1818'],
};

const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors,
  white: '#D5D7DA',
  black: '#0D0D0D',
  fontFamily: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  fontFamilyMonospace: 'JetBrains Mono, Fira Code, monospace',
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'auto',
  respectReducedMotion: false,
  headings: {
    fontFamily: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.3' },
      h2: { fontSize: '1.75rem', lineHeight: '1.35' },
      h3: { fontSize: '1.5rem', lineHeight: '1.4' },
      h4: { fontSize: '1.25rem', lineHeight: '1.45' },
    },
  },
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
    Table: {
      defaultProps: {
        highlightOnHover: true,
        verticalSpacing: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        overlayProps: { backgroundOpacity: 0.55, blur: 3 },
      },
    },
    ActionIcon: {
      defaultProps: {
        variant: 'subtle',
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: 'var(--mantine-radius-md)',
        },
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </StrictMode>
);
