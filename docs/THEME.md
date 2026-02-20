# Theme & Color System

## Overview

This application uses a dark theme optimized for astigmatism-friendly viewing with carefully selected contrast ratios and color palettes.

## Base Theme

- **Color Scheme:** Dark mode (default)
- **Background Base:** `#141517` (dark gray, not pure black to reduce eye strain)
- **Text Base:** `#C1C2C5` (soft white, not pure white to reduce glare)
- **Border Color:** `#373A40` (subtle contrast for separation)

## Color Palette

### Brand Colors (Primary - Green)
Used for primary actions, success states, and positive indicators.

| Shade | Hex       | Usage                    |
|-------|-----------|--------------------------|
| 0     | `#E8F5E9` | Lightest tint            |
| 1     | `#C8E6C9` | Light tint               |
| 2     | `#A5D6A7` | Light                    |
| 3     | `#81C784` | Light mid                |
| 4     | `#66BB6A` | Mid light                |
| 5     | `#4CAF50` | Mid                      |
| 6     | `#43A047` | **Primary** (default)    |
| 7     | `#388E3C` | Primary dark             |
| 8     | `#2E7D32` | Dark                     |
| 9     | `#1B5E20` | Darkest                  |

### Accent Colors (Blue)
Used for links, information, and secondary actions.

| Shade | Hex       | Usage                    |
|-------|-----------|--------------------------|
| 0     | `#E3F2FD` | Lightest tint            |
| 1     | `#BBDEFB` | Light tint               |
| 2     | `#90CAF9` | Light                    |
| 3     | `#64B5F6` | Light mid                |
| 4     | `#42A5F5` | Mid light                |
| 5     | `#2196F3` | Mid                      |
| 6     | `#1E88E5` | **Accent** (default)     |
| 7     | `#1976D2` | Accent dark              |
| 8     | `#1565C0` | Dark                     |
| 9     | `#0D47A1` | Darkest                  |

### Warning Colors (Amber)
Used for warnings, cautions, and attention indicators.

| Shade | Hex       | Usage                    |
|-------|-----------|--------------------------|
| 0     | `#FFF8E1` | Lightest tint            |
| 1     | `#FFECB3` | Light tint               |
| 2     | `#FFE082` | Light                    |
| 3     | `#FFD54F` | Light mid                |
| 4     | `#FFCA28` | Mid light                |
| 5     | `#FFC107` | Mid                      |
| 6     | `#FFB300` | **Warning** (default)    |
| 7     | `#FFA000` | Warning dark             |
| 8     | `#FF8F00` | Dark                     |
| 9     | `#FF6F00` | Darkest                  |

### Danger Colors (Red)
Used for errors, destructive actions, and negative indicators.

| Shade | Hex       | Usage                    |
|-------|-----------|--------------------------|
| 0     | `#FFEBEE` | Lightest tint            |
| 1     | `#FFCDD2` | Light tint               |
| 2     | `#EF9A9A` | Light                    |
| 3     | `#E57373` | Light mid                |
| 4     | `#EF5350` | Mid light                |
| 5     | `#F44336` | Mid                      |
| 6     | `#E53935` | **Danger** (default)     |
| 7     | `#D32F2F` | Danger dark              |
| 8     | `#C62828` | Dark                     |
| 9     | `#B71C1C` | Darkest                  |

### Income Colors (Green)
Specifically for income/credit transactions and positive amounts.

- Same palette as Brand colors
- Usage: `color="income"` on components

### Expense Colors (Red)
Specifically for expense/debit transactions and negative amounts.

- Same palette as Danger colors
- Usage: `color="expense"` on components

## Semantic Color Usage

### Financial Data
```tsx
// Income/Positive amounts
<Text c="income.6">+$1,234.56</Text>

// Expense/Negative amounts
<Text c="expense.6">-$456.78</Text>
```

### Actions
```tsx
// Primary action
<Button>Save</Button>              // Uses brand.6

// Destructive action
<Button color="danger">Delete</Button>

// Warning action
<Button color="warning">Proceed with Caution</Button>

// Secondary/Info action
<Button color="accent">View Details</Button>
```

### Status Indicators
```tsx
// Success
<Badge color="brand">Active</Badge>

// Warning
<Badge color="warning">Pending</Badge>

// Error
<Badge color="danger">Failed</Badge>

// Info
<Badge color="accent">Processing</Badge>
```

## Typography

- **Font Family:** System font stack (SF Pro, Segoe UI, Roboto)
- **Monospace:** JetBrains Mono, Fira Code (for numbers/currency)
- **Headings:** 600 weight
- **Body:** 400 weight

## Accessibility Considerations

1. **Contrast Ratios:** All text colors meet WCAG AA standards against dark backgrounds
2. **Reduced Motion:** Theme respects `prefers-reduced-motion` setting
3. **Focus Indicators:** Automatic focus ring for keyboard navigation
4. **Not Pure Black/White:** Soft grays reduce eye strain for astigmatism
5. **Color Blindness:** Status indicators use both color and text/icons

## Component Defaults

All Mantine components use the following defaults:
- `size: "sm"` for inputs and buttons
- `radius: "md"` for rounded corners
- `highlightOnHover: true` for tables

## AG Grid Theme

AG Grid uses the Quartz theme customized to match the application's dark theme. The theme is defined in `src/utils/agGridTheme.ts` and should be imported by all AG Grid components.

### Usage Pattern

```tsx
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { agGridDarkTheme } from '@/utils/agGridTheme';

ModuleRegistry.registerModules([AllCommunityModule]);

// In component:
<AgGridReact<YourDataType>
  rowData={data}
  columnDefs={columnDefs}
  theme={agGridDarkTheme}
/>
```

### Theme Colors

The AG Grid theme uses the same color palette as the Mantine theme:

| AG Grid Param          | Value                         | Source           |
|------------------------|-------------------------------|------------------|
| backgroundColor        | `#1A1B1E`                     | Mantine dark.7   |
| foregroundColor        | `#C1C2C5`                     | Mantine dark.0   |
| chromeBackgroundColor  | `#25262B`                     | Mantine dark.6   |
| headerBackgroundColor  | `#25262B`                     | Mantine dark.6   |
| rowHoverColor          | `#2C2E33`                     | Mantine dark.5   |
| borderColor            | `#373A40`                     | Mantine dark.4   |
| accentColor            | `#43A047`                     | brand.6          |
| inputBackgroundColor   | `#25262B`                     | Mantine dark.6   |

### Cell Styling for Financial Data

For income/expense coloring in AG Grid cells, use the Mantine CSS variables:

```tsx
cellStyle: (params) => {
  if (params.value === null || params.value === undefined) return {};
  return {
    color: params.value >= 0
      ? 'var(--mantine-color-income-6)'
      : 'var(--mantine-color-expense-6)',
  };
},
```
