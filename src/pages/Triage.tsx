import { useState, useMemo, useCallback, useEffect } from 'react';
import { Stack, Title, Text, Collapse, Button, Group, Center, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useFinance } from '@/context/FinanceContext';
import { ImportWizard } from '@/components/ImportWizard/ImportWizard';
import { TriageGrid } from '@/components/TriageGrid/TriageGrid';
import { TriageDetailPanel } from '@/components/TriageDetailPanel/TriageDetailPanel';

export function Triage() {
  const { triageTransactions } = useFinance();
  const [importOpened, importHandlers] = useDisclosure(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIndex = useMemo(
    () => (selectedId ? triageTransactions.findIndex((t) => t.id === selectedId) : -1),
    [triageTransactions, selectedId]
  );

  useEffect(() => {
    if (triageTransactions.length > 0 && selectedId === null) {
      setSelectedId(triageTransactions[0]?.id ?? null);
    }
  }, [triageTransactions, selectedId]);

  const selectedTransaction = useMemo(
    () => triageTransactions.find((t) => t.id === selectedId) ?? null,
    [triageTransactions, selectedId]
  );

  const handleSaved = useCallback(() => {
    if (triageTransactions.length <= 1 || selectedIndex < 0) {
      setSelectedId(null);
      return;
    }

    const isLastItem = selectedIndex === triageTransactions.length - 1;
    const nextIdx = isLastItem ? selectedIndex - 1 : selectedIndex + 1;

    const nextTransaction = triageTransactions[nextIdx];
    if (nextTransaction && nextTransaction.id !== selectedId) {
      setSelectedId(nextTransaction.id);
    } else {
      setSelectedId(null);
    }
  }, [selectedIndex, triageTransactions, selectedId]);

  const handleDeleted = useCallback(() => {
    if (triageTransactions.length <= 1 || selectedIndex < 0) {
      setSelectedId(null);
      return;
    }

    const isLastItem = selectedIndex === triageTransactions.length - 1;
    const nextIdx = isLastItem ? selectedIndex - 1 : selectedIndex + 1;

    const nextTransaction = triageTransactions[nextIdx];
    if (nextTransaction && nextTransaction.id !== selectedId) {
      setSelectedId(nextTransaction.id);
    } else {
      setSelectedId(null);
    }
  }, [selectedIndex, triageTransactions, selectedId]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  if (triageTransactions.length === 0) {
    return (
      <Stack gap="md">
        <Title order={3}>Triage</Title>
        <Center h={200}>
          <Stack align="center" gap="md">
            <Text c="dimmed">No transactions to triage</Text>
            <Text size="sm" c="dimmed">
              Import a CSV file to get started
            </Text>
            <ImportWizard />
          </Stack>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <Group justify="space-between">
        <Title order={3}>Triage</Title>
        <Button variant="subtle" onClick={() => importHandlers.toggle()}>
          {importOpened ? 'Hide Import' : 'Import CSV'}
        </Button>
      </Group>

      <Collapse in={importOpened}>
        <ImportWizard />
      </Collapse>

      <TriageDetailPanel
        selectedTransaction={selectedTransaction}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <Text size="sm" c="dimmed">
        {triageTransactions.length} transaction{triageTransactions.length !== 1 ? 's' : ''}{' '}
        remaining
      </Text>

      <Box flex={1} style={{ minHeight: 200 }}>
        <TriageGrid selectedId={selectedId} onSelect={handleSelect} />
      </Box>
    </Stack>
  );
}
