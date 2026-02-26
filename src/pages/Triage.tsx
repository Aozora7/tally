import { useState, useMemo, useCallback, useEffect } from 'react';
import { Stack, Title, Text, Button, Group, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlaylistAdd } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { TriageGrid } from '@/components/TriageGrid/TriageGrid';
import { TriageDetailPanel } from '@/components/TriageDetailPanel/TriageDetailPanel';
import { RulePreviewModal } from '@/components/RulePreviewModal/RulePreviewModal';

export function Triage() {
  const { triageTransactions } = useFinance();
  const [rulesModalOpened, rulesModalHandlers] = useDisclosure(false);
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

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <Group justify="space-between">
        <Title order={3}>Triage</Title>
        <Button variant="light" leftSection={<IconPlaylistAdd size={16} />} onClick={() => rulesModalHandlers.open()}>
          Apply Rules
        </Button>
      </Group>

      <TriageDetailPanel selectedTransaction={selectedTransaction} onSaved={handleSaved} onDeleted={handleDeleted} />

      <Text size="sm" c="dimmed">
        {triageTransactions.length} transaction{triageTransactions.length !== 1 ? 's' : ''} remaining
      </Text>

      <Box flex={1} style={{ minHeight: 0 }}>
        <TriageGrid selectedId={selectedId} onSelect={handleSelect} />
      </Box>

      <RulePreviewModal opened={rulesModalOpened} onClose={() => rulesModalHandlers.close()} source="triage" />
    </Stack>
  );
}
