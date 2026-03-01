import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
import { db } from '@/db/database';

const colors: Record<string, MantineColorsTuple> = {
  dark: ['#C1C2C5', '#A6A7AB', '#909296', '#5C5F66', '#373A40', '#2C2E33', '#25262B', '#1A1B1E', '#141517', '#101113'],
  brand: ['#E0F7FF', '#B3E9FF', '#80D9FF', '#4DC8FF', '#2AB5FF', '#1A9FFF', '#1791E8', '#137CC9', '#0D67AB', '#08528D'],
  accent: ['#E6F4EA', '#C2E5CC', '#9AD4AB', '#6EC28A', '#4DB072', '#35A05C', '#2D8E50', '#247342', '#1C5C35', '#134528'],
  warning: ['#FDF5E6', '#F8E4B8', '#F2D08A', '#E9BA5C', '#DFA638', '#D4941F', '#C4841A', '#A56E14', '#88590F', '#6B440A'],
  danger: ['#FCE8E8', '#F5C4C4', '#EC9A9A', '#E07070', '#D45050', '#C43A3A', '#B33030', '#952828', '#782020', '#5C1818'],
  income: ['#E6F4EA', '#C2E5CC', '#9AD4AB', '#6EC28A', '#4DB072', '#35A05C', '#2D8E50', '#247342', '#1C5C35', '#134528'],
  expense: ['#FCE8E8', '#F5C4C4', '#EC9A9A', '#E07070', '#D45050', '#C43A3A', '#B33030', '#952828', '#782020', '#5C1818'],
};

export const SCALE_OPTIONS = [
  { value: 'xs', label: 'XS', description: 'Extra Small (0.8x)' },
  { value: 'sm', label: 'S', description: 'Small (0.9x)' },
  { value: 'md', label: 'M', description: 'Medium (1.0x)' },
  { value: 'lg', label: 'L', description: 'Large (1.15x)' },
  { value: 'xl', label: 'XL', description: 'Extra Large (1.3x)' },
] as const;

export type ScaleValue = (typeof SCALE_OPTIONS)[number]['value'];

export const SCALE_MAP: Record<ScaleValue, number> = {
  xs: 0.8,
  sm: 0.9,
  md: 1.0,
  lg: 1.15,
  xl: 1.3,
};

const DEFAULT_SCALE: ScaleValue = 'md';

interface AppContextValue {
  isLoaded: boolean;
  settings: Map<string, string>;
  setSetting: (key: string, value: string) => void;
  scale: ScaleValue;
  setScale: (size: ScaleValue) => void;
  reloadSettings: () => Promise<void>;
  clearSettings: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

function createAppTheme(scaleValue: ScaleValue) {
  const scale = SCALE_MAP[scaleValue];

  return createTheme({
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
    scale: scale,
    headings: {
      fontFamily: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
      fontWeight: '600',
    },
    components: {
      Button: {
        defaultProps: {
          size: scaleValue,
        },
      },
      TextInput: {
        defaultProps: {
          size: scaleValue,
        },
      },
      Select: {
        defaultProps: {
          size: scaleValue,
        },
      },
      Table: {
        defaultProps: {
          highlightOnHover: true,
          verticalSpacing: scaleValue,
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
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<Map<string, string>>(new Map());
  const [scale, setScale] = useState<ScaleValue>(DEFAULT_SCALE);

  const reloadSettings = useCallback(async () => {
    const loadedSettings = await db.settings.toArray();
    setSettings(new Map(loadedSettings.map((s) => [s.key, s.value])));
    const storedScale = loadedSettings.find((s) => s.key === 'fontSize')?.value;
    if (storedScale && storedScale in SCALE_MAP) {
      setScale(storedScale as ScaleValue);
    }
  }, []);

  useEffect(() => {
    reloadSettings().then(() => setIsLoaded(true));
  }, [reloadSettings]);

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
    db.settings.put({ key, value });
  }, []);

  const handleSetScale = useCallback((size: ScaleValue) => {
    setScale(size);
    db.settings.put({ key: 'fontSize', value: size });
  }, []);

  const clearSettings = useCallback(() => {
    setSettings(new Map());
    setScale(DEFAULT_SCALE);
  }, []);

  const theme = createAppTheme(scale);

  if (!isLoaded) {
    return null;
  }

  return (
    <AppContext.Provider
      value={{
        isLoaded,
        settings,
        setSetting,
        scale,
        setScale: handleSetScale,
        reloadSettings,
        clearSettings,
      }}
    >
      <MantineProvider theme={theme} defaultColorScheme="dark">
        {children}
      </MantineProvider>
    </AppContext.Provider>
  );
}

export { DEFAULT_SCALE as DEFAULT_FONT_SIZE };
