import { useDisclosure } from '@mantine/hooks';
import { TransactionsGrid } from '@/components/TransactionsGrid/TransactionsGrid';
import { RulePreviewModal } from '@/components/RulePreviewModal/RulePreviewModal';
import { Button, Group, Title, Stack } from '@mantine/core';
import { useFinance } from '@/context/FinanceContext';

export function Transactions() {
  const { rules } = useFinance();
  const [rulesModalOpened, rulesModalHandlers] = useDisclosure(false);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Transactions</Title>
        {rules.length > 0 && (
          <Button variant="light" onClick={() => rulesModalHandlers.open()}>
            Apply Rules
          </Button>
        )}
      </Group>
      <TransactionsGrid />
      <RulePreviewModal
        opened={rulesModalOpened}
        onClose={() => rulesModalHandlers.close()}
        source="transaction"
      />
    </Stack>
  );
}
