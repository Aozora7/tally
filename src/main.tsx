import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
import App from './App';
import '@mantine/core/styles.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './styles/global.css';

const colors: Record<string, MantineColorsTuple> = {
  dark: [
    '#C1C2C5',
    '#A6A7AB',
    '#909296',
    '#5C5F66',
    '#373A40',
    '#2C2E33',
    '#25262B',
    '#1A1B1E',
    '#141517',
    '#101113',
  ],
  brand: [
    '#E8F5E9',
    '#C8E6C9',
    '#A5D6A7',
    '#81C784',
    '#66BB6A',
    '#4CAF50',
    '#43A047',
    '#388E3C',
    '#2E7D32',
    '#1B5E20',
  ],
  accent: [
    '#E3F2FD',
    '#BBDEFB',
    '#90CAF9',
    '#64B5F6',
    '#42A5F5',
    '#2196F3',
    '#1E88E5',
    '#1976D2',
    '#1565C0',
    '#0D47A1',
  ],
  warning: [
    '#FFF8E1',
    '#FFECB3',
    '#FFE082',
    '#FFD54F',
    '#FFCA28',
    '#FFC107',
    '#FFB300',
    '#FFA000',
    '#FF8F00',
    '#FF6F00',
  ],
  danger: [
    '#FFEBEE',
    '#FFCDD2',
    '#EF9A9A',
    '#E57373',
    '#EF5350',
    '#F44336',
    '#E53935',
    '#D32F2F',
    '#C62828',
    '#B71C1C',
  ],
  income: [
    '#E8F5E9',
    '#C8E6C9',
    '#A5D6A7',
    '#81C784',
    '#66BB6A',
    '#4CAF50',
    '#43A047',
    '#388E3C',
    '#2E7D32',
    '#1B5E20',
  ],
  expense: [
    '#FFEBEE',
    '#FFCDD2',
    '#EF9A9A',
    '#E57373',
    '#EF5350',
    '#F44336',
    '#E53935',
    '#D32F2F',
    '#C62828',
    '#B71C1C',
  ],
};

const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors,
  white: '#E8E8E8',
  black: '#0D0D0D',
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, Fira Code, monospace',
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'auto',
  respectReducedMotion: true,
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
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
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </StrictMode>
);
