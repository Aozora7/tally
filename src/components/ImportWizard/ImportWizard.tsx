import { useState, useMemo } from 'react';
import {
  Button,
  Group,
  Stack,
  Text,
  FileInput,
  Select,
  Table,
  Alert,
  Stepper,
  Paper,
  ScrollArea,
} from '@mantine/core';
import { IconUpload, IconDownload } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { parseCsvFile, applyMapping, type ParseResult } from '@/utils/csvParser';
import { useCurrency } from '@/utils/currency';
import { generateId } from '@/utils/uuid';
import { filterDuplicateTransactions } from '@/utils/rulesEngine';
import type { ColumnMapping, ImportableField, ParsedImportRow } from '@/types/import';
import type { TriageTransaction } from '@/types';

type Step = 'upload' | 'mapping' | 'preview' | 'complete';

const FIELD_OPTIONS: { value: ImportableField | 'none'; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'description', label: 'Description' },
  { value: 'none', label: '(ignore)' },
];

interface UploadStepProps {
  onUpload: (file: File | null) => void;
}

function UploadStep({ onUpload }: UploadStepProps) {
  return (
    <Stack gap="md">
      <Text>Upload a CSV file from your bank statement to import transactions.</Text>
      <FileInput placeholder="Click to select a CSV file" accept=".csv,.tsv" onChange={onUpload} />
    </Stack>
  );
}

interface MappingStepProps {
  parseResult: ParseResult;
  mapping: ColumnMapping[];
  canProceed: boolean;
  onMappingChange: (csvColumn: string, targetField: ImportableField | 'none') => void;
  onCancel: () => void;
  onContinue: () => void;
}

function MappingStep({
  parseResult,
  mapping,
  canProceed,
  onMappingChange,
  onCancel,
  onContinue,
}: MappingStepProps) {
  return (
    <Stack gap="md">
      <Text>Map the CSV columns to transaction fields. Date and Amount are required.</Text>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>CSV Column</Table.Th>
              <Table.Th>Map To</Table.Th>
              <Table.Th>Sample Values</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {mapping.map((m) => (
              <MappingRow
                key={m.csvColumn}
                mapping={m}
                sampleValues={parseResult.rows.slice(0, 3).map((r) => r[m.csvColumn])}
                onChange={onMappingChange}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!canProceed} onClick={onContinue}>
          Continue
        </Button>
      </Group>
    </Stack>
  );
}

interface MappingRowProps {
  mapping: ColumnMapping;
  sampleValues: (string | undefined)[];
  onChange: (csvColumn: string, targetField: ImportableField | 'none') => void;
}

function MappingRow({ mapping, sampleValues, onChange }: MappingRowProps) {
  return (
    <Table.Tr>
      <Table.Td>{mapping.csvColumn}</Table.Td>
      <Table.Td>
        <Select
          data={FIELD_OPTIONS}
          value={mapping.targetField ?? 'none'}
          onChange={(value) =>
            onChange(mapping.csvColumn, (value ?? 'none') as ImportableField | 'none')
          }
        />
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {sampleValues.join(', ')}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

interface PreviewStepProps {
  validRows: ParsedImportRow[];
  invalidRows: ParsedImportRow[];
  totalRows: number;
  onBack: () => void;
  onImport: () => void;
  format: (cents: number) => string;
}

function PreviewStep({
  validRows,
  invalidRows,
  totalRows,
  onBack,
  onImport,
  format,
}: PreviewStepProps) {
  const hasInvalid = invalidRows.length > 0;

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <Group justify="space-between">
        <Text>
          Found <strong>{validRows.length}</strong> valid transactions out of{' '}
          <strong>{totalRows}</strong> total rows.
        </Text>
        <Group>
          <Button variant="subtle" onClick={onBack}>
            Back
          </Button>
          <Button leftSection={<IconDownload size={16} />} onClick={onImport}>
            Import {validRows.length} Transactions
          </Button>
        </Group>
      </Group>

      {validRows.length > 0 && (
        <PreviewTable title="Valid Rows" rows={validRows} fillSpace format={format} />
      )}
      {hasInvalid && (
        <PreviewTable
          title={`Invalid Rows (${invalidRows.length} - missing date or amount)`}
          rows={invalidRows}
          isInvalid
          fillSpace
          format={format}
        />
      )}
    </Stack>
  );
}

interface PreviewTableProps {
  title: string;
  rows: ParsedImportRow[];
  isInvalid?: boolean;
  fillSpace?: boolean;
  format: (cents: number) => string;
}

function PreviewTable({
  title,
  rows,
  isInvalid = false,
  fillSpace = false,
  format,
}: PreviewTableProps) {
  return (
    <Stack
      gap="xs"
      flex={fillSpace ? 1 : undefined}
      style={fillSpace ? { minHeight: 0 } : undefined}
    >
      <Text fw={500} c={isInvalid ? 'warning.6' : 'dimmed'}>
        {title}
      </Text>
      <Paper
        withBorder
        flex={fillSpace ? 1 : undefined}
        style={fillSpace ? { minHeight: 0 } : undefined}
      >
        <ScrollArea h={fillSpace ? '100%' : undefined} offsetScrollbars={!fillSpace}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Description</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row, index) => (
                <PreviewRow key={index} row={row} isInvalid={isInvalid} format={format} />
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}

interface PreviewRowProps {
  row: ParsedImportRow;
  isInvalid: boolean;
  format: (cents: number) => string;
}

function PreviewRow({ row, isInvalid, format }: PreviewRowProps) {
  if (isInvalid) {
    return (
      <Table.Tr>
        <Table.Td c={row.date ? 'dimmed' : 'danger.6'}>{row.date ?? '(missing)'}</Table.Td>
        <Table.Td c={row.amount !== null ? 'expense.6' : 'danger.6'}>
          {row.amount !== null ? format(row.amount) : '(missing)'}
        </Table.Td>
        <Table.Td>
          <Text lineClamp={1}>{row.description}</Text>
        </Table.Td>
      </Table.Tr>
    );
  }

  return (
    <Table.Tr>
      <Table.Td>{row.date}</Table.Td>
      <Table.Td c={row.amount! >= 0 ? 'income.6' : 'expense.6'}>{format(row.amount!)}</Table.Td>
      <Table.Td>
        <Text lineClamp={1}>{row.description}</Text>
      </Table.Td>
    </Table.Tr>
  );
}

interface CompleteStepProps {
  importedCount: number;
  duplicateCount: number;
  onReset: () => void;
}

function CompleteStep({ importedCount, duplicateCount, onReset }: CompleteStepProps) {
  return (
    <Stack gap="md">
      <Alert color="brand" title="Import Complete">
        Successfully imported {importedCount} transactions to Triage.
      </Alert>
      {duplicateCount > 0 && (
        <Alert color="warning">
          {duplicateCount} duplicate transaction{duplicateCount !== 1 ? 's' : ''} were skipped.
        </Alert>
      )}
      <Group>
        <Button leftSection={<IconUpload size={16} />} onClick={onReset}>
          Import Another File
        </Button>
      </Group>
    </Stack>
  );
}

export function ImportWizard() {
  const { addTriageTransactions, triageTransactions, transactions } = useFinance();
  const { format } = useCurrency();
  const [activeStep, setActiveStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const result = await parseCsvFile(file);
      setParseResult(result);
      setMapping(result.detectedMapping);
      setActiveStep('mapping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleMappingChange = (csvColumn: string, targetField: ImportableField | 'none') => {
    setMapping((prev) =>
      prev.map((m) =>
        m.csvColumn === csvColumn
          ? { ...m, targetField: targetField === 'none' ? null : targetField }
          : m
      )
    );
  };

  const parsedRows = useMemo<ParsedImportRow[]>(() => {
    if (!parseResult) return [];
    return applyMapping(parseResult.rows, mapping);
  }, [parseResult, mapping]);

  const validRows = useMemo<ParsedImportRow[]>(() => {
    return parsedRows.filter((row) => row.date && row.amount !== null);
  }, [parsedRows]);

  const invalidRows = useMemo<ParsedImportRow[]>(() => {
    return parsedRows.filter((row) => !row.date || row.amount === null);
  }, [parsedRows]);

  const canProceed = useMemo(() => {
    const hasDate = mapping.some((m) => m.targetField === 'date');
    const hasAmount = mapping.some((m) => m.targetField === 'amount');
    return hasDate && hasAmount && validRows.length > 0;
  }, [mapping, validRows]);

  const handleImport = () => {
    const pendingTransactions: TriageTransaction[] = validRows.map((row) => ({
      id: generateId(),
      date: row.date!,
      amount: row.amount!,
      description: row.description,
    }));

    const { unique, duplicates } = filterDuplicateTransactions(pendingTransactions, [
      ...triageTransactions,
      ...transactions,
    ]);

    setDuplicateCount(duplicates.length);
    setImportedCount(unique.length);
    addTriageTransactions(unique);
    setActiveStep('complete');
  };

  const handleReset = () => {
    setActiveStep('upload');
    setParseResult(null);
    setMapping([]);
    setError(null);
    setDuplicateCount(0);
  };

  const stepIndex =
    activeStep === 'upload' ? 0 : activeStep === 'mapping' ? 1 : activeStep === 'preview' ? 2 : 3;

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <Stepper active={stepIndex}>
        <Stepper.Step label="Upload" description="Select CSV file" />
        <Stepper.Step label="Map Columns" description="Match columns to fields" />
        <Stepper.Step label="Preview" description="Review data" />
        <Stepper.Step label="Complete" description="Import finished" />
      </Stepper>

      {error && (
        <Alert color="danger" title="Error">
          {error}
        </Alert>
      )}

      {activeStep === 'upload' && <UploadStep onUpload={handleFileUpload} />}

      {activeStep === 'mapping' && parseResult && (
        <MappingStep
          parseResult={parseResult}
          mapping={mapping}
          canProceed={canProceed}
          onMappingChange={handleMappingChange}
          onCancel={handleReset}
          onContinue={() => setActiveStep('preview')}
        />
      )}

      {activeStep === 'preview' && (
        <PreviewStep
          validRows={validRows}
          invalidRows={invalidRows}
          totalRows={parsedRows.length}
          onBack={() => setActiveStep('mapping')}
          onImport={handleImport}
          format={format}
        />
      )}

      {activeStep === 'complete' && (
        <CompleteStep
          importedCount={importedCount}
          duplicateCount={duplicateCount}
          onReset={handleReset}
        />
      )}
    </Stack>
  );
}
