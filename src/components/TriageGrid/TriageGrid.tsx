import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type RowClickedEvent,
} from 'ag-grid-community';
import { useFinance } from '@/context/FinanceContext';
import { agGridDarkTheme } from '@/utils/agGridTheme';
import { centsToDisplay } from '@/utils/currency';
import type { TriageTransaction } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TriageGridProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function dateValueFormatter(params: { value: string | null | undefined }): string {
  if (!params.value) return '';
  const [year, month, day] = params.value.split('-');
  return `${month}/${day}/${year}`;
}

function currencyValueFormatter(params: { value: number | null | undefined }): string {
  if (params.value === null || params.value === undefined) return '';
  return centsToDisplay(params.value);
}

export function TriageGrid({ selectedId, onSelect }: TriageGridProps) {
  const { triageTransactions } = useFinance();

  const columnDefs = useMemo<ColDef<TriageTransaction>[]>(
    () => [
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        valueFormatter: dateValueFormatter,
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 120,
        valueFormatter: currencyValueFormatter,
        cellStyle: (params) => {
          if (params.value === null || params.value === undefined) return {};
          return {
            color:
              params.value >= 0
                ? 'var(--mantine-color-income-6)'
                : 'var(--mantine-color-expense-6)',
          };
        },
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 200,
      },
    ],
    []
  );

  const getRowStyle = useCallback(
    (params: { data: TriageTransaction | undefined }) => {
      if (params.data && params.data.id === selectedId) {
        return { backgroundColor: 'rgba(67, 160, 71, 0.2)' };
      }
      return {};
    },
    [selectedId]
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<TriageTransaction>) => {
      if (event.data) {
        onSelect(event.data.id);
      }
    },
    [onSelect]
  );

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <AgGridReact<TriageTransaction>
          rowData={triageTransactions}
          columnDefs={columnDefs}
          theme={agGridDarkTheme}
          onRowClicked={onRowClicked}
          getRowStyle={getRowStyle}
          animateRows={false}
          domLayout="normal"
        />
      </div>
    </div>
  );
}
