import { useState, useMemo } from 'react';
import {
  Button,
  Group,
  Stack,
  Title,
  Text,
  FileInput,
  Select,
  Table,
  Alert,
  Stepper,
  ScrollArea,
} from '@mantine/core';
import { useFinance } from '@/context/FinanceContext';
import { parseCsvFile, applyMapping, type ParseResult } from '@/utils/csvParser';
import { centsToDisplay } from '@/utils/currency';
import { generateId } from '@/utils/uuid';
import type { ColumnMapping, ImportableField, ParsedImportRow } from '@/types/import';
import type { TriageTransaction } from '@/types';

type Step = 'upload' | 'mapping' | 'preview' | 'complete';

const FIELD_OPTIONS: { value: ImportableField | 'none'; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'description', label: 'Description' },
  { value: 'none', label: '(ignore)' },
];

export function ImportWizard() {
  const { addTriageTransactions } = useFinance();
  const [activeStep, setActiveStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const canProceed = useMemo(() => {
    const hasDate = mapping.some((m) => m.targetField === 'date');
    const hasAmount = mapping.some((m) => m.targetField === 'amount');
    return hasDate && hasAmount && validRows.length > 0;
  }, [mapping, validRows]);

  const handleImport = () => {
    const triageTransactions: TriageTransaction[] = validRows.map((row) => ({
      id: generateId(),
      date: row.date!,
      amount: row.amount!,
      description: row.description,
    }));

    addTriageTransactions(triageTransactions);
    setActiveStep('complete');
  };

  const handleReset = () => {
    setActiveStep('upload');
    setParseResult(null);
    setMapping([]);
    setError(null);
  };

  return (
    <Stack gap="md">
      <Title order={3}>Import Transactions</Title>

      <Stepper
        active={
          activeStep === 'upload'
            ? 0
            : activeStep === 'mapping'
              ? 1
              : activeStep === 'preview'
                ? 2
                : 3
        }
      >
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

      {activeStep === 'upload' && (
        <Stack gap="md">
          <Text>Upload a CSV file from your bank statement to import transactions.</Text>
          <FileInput
            placeholder="Click to select a CSV file"
            accept=".csv,.tsv"
            onChange={handleFileUpload}
          />
        </Stack>
      )}

      {activeStep === 'mapping' && parseResult && (
        <Stack gap="md">
          <Text>Map the CSV columns to transaction fields. Date and Amount are required.</Text>

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
                <Table.Tr key={m.csvColumn}>
                  <Table.Td>{m.csvColumn}</Table.Td>
                  <Table.Td>
                    <Select
                      data={FIELD_OPTIONS}
                      value={m.targetField ?? 'none'}
                      onChange={(value) =>
                        handleMappingChange(
                          m.csvColumn,
                          (value ?? 'none') as ImportableField | 'none'
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {parseResult.rows
                        .slice(0, 3)
                        .map((r) => r[m.csvColumn])
                        .join(', ')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleReset}>
              Cancel
            </Button>
            <Button disabled={!canProceed} onClick={() => setActiveStep('preview')}>
              Continue
            </Button>
          </Group>
        </Stack>
      )}

      {activeStep === 'preview' && (
        <Stack gap="md">
          <Text>
            Found <strong>{validRows.length}</strong> valid transactions out of{' '}
            <strong>{parsedRows.length}</strong> total rows.
          </Text>

          {parsedRows.length !== validRows.length && (
            <Alert color="warning">
              {parsedRows.length - validRows.length} rows have missing date or amount and will be
              skipped.
            </Alert>
          )}

          <ScrollArea h={400}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {validRows.slice(0, 100).map((row, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>{row.date}</Table.Td>
                    <Table.Td c={row.amount! >= 0 ? 'income.6' : 'expense.6'}>
                      {centsToDisplay(row.amount!)}
                    </Table.Td>
                    <Table.Td>
                      <Text lineClamp={1}>{row.description}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setActiveStep('mapping')}>
              Back
            </Button>
            <Button onClick={handleImport}>Import {validRows.length} Transactions</Button>
          </Group>
        </Stack>
      )}

      {activeStep === 'complete' && (
        <Stack gap="md">
          <Alert color="brand" title="Import Complete">
            Successfully imported {validRows.length} transactions to Triage.
          </Alert>
          <Group>
            <Button onClick={handleReset}>Import Another File</Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
