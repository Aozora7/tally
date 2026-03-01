import { themeQuartz } from 'ag-grid-community';
import { useApp, type ScaleValue } from '@/context/AppContext';
import { SCALE_MAP } from '@/context/AppContext';

const BASE_FONT_SIZE = 14;

function createAgGridTheme(scale: ScaleValue) {
  const scaleFactor = SCALE_MAP[scale];
  const fontSize = BASE_FONT_SIZE * scaleFactor;

  return themeQuartz.withParams({
    browserColorScheme: 'dark',
    backgroundColor: '#1A1B1E',
    foregroundColor: '#C1C2C5',
    chromeBackgroundColor: '#25262B',
    headerBackgroundColor: '#25262B',
    oddRowBackgroundColor: '#1A1B1E',
    rowHoverColor: '#2C2E33',
    borderColor: '#373A40',
    accentColor: '#2D8E50',
    selectedRowBackgroundColor: 'rgba(45, 142, 80, 0.15)',
    rangeSelectionBackgroundColor: 'rgba(45, 142, 80, 0.2)',
    inputBackgroundColor: '#25262B',
    columnBorder: true,
    headerColumnBorder: true,
    fontSize,
  });
}

export function useAgGridTheme() {
  const { scale } = useApp();
  return createAgGridTheme(scale);
}
