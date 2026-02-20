import { Stack } from '@mantine/core';
import { ImportWizard } from '@/components/ImportWizard/ImportWizard';

export function Triage() {
  return (
    <Stack gap="md">
      <ImportWizard />
    </Stack>
  );
}
