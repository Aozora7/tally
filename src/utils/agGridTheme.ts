import { themeQuartz } from 'ag-grid-community';

export const agGridDarkTheme = themeQuartz.withParams({
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
});
