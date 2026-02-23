import { AppShell, Divider, Group, NavLink, ScrollArea, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavLink as RouterNavLink } from 'react-router-dom';
import {
  IconDashboard,
  IconTable,
  IconReceipt,
  IconChecklist,
  IconUpload,
  IconBuildingBank,
  IconTags,
  IconRobot,
  IconSettings,
  IconWallet,
  IconChartLine,
  IconArrowsExchange,
} from '@tabler/icons-react';
import type { ReactNode, ComponentType } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

interface NavSection {
  label: string;
  items: { label: string; path: string; icon: ComponentType<{ size?: number; stroke?: number }> }[];
}

const navSections: NavSection[] = [
  {
    label: 'VIEWS',
    items: [
      { label: 'Dashboard', path: '/', icon: IconDashboard },
      { label: 'Pivot Table', path: '/pivot', icon: IconTable },
    ],
  },
  {
    label: 'DATA',
    items: [
      { label: 'Transactions', path: '/transactions', icon: IconReceipt },
      { label: 'Triage', path: '/triage', icon: IconChecklist },
      { label: 'Import', path: '/import', icon: IconUpload },
    ],
  },
  {
    label: 'PORTFOLIO',
    items: [
      { label: 'Securities', path: '/securities', icon: IconChartLine },
      { label: 'Trades', path: '/securities/transactions', icon: IconArrowsExchange },
    ],
  },
  {
    label: 'SETUP',
    items: [
      { label: 'Accounts', path: '/accounts', icon: IconBuildingBank },
      { label: 'Categories', path: '/categories', icon: IconTags },
      { label: 'Rules', path: '/rules', icon: IconRobot },
    ],
  },
  {
    label: 'APP',
    items: [{ label: 'Settings', path: '/settings', icon: IconSettings }],
  },
];

export function MainLayout({ children }: MainLayoutProps) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Group gap="xs" mb="md" px="xs">
            <IconWallet size={24} stroke={1.5} color="var(--mantine-color-brand-6)" />
            <Text fw={700} size="lg">
              Finance
            </Text>
          </Group>
          <Divider mb="sm" />
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          {navSections.map((section) => (
            <div key={section.label}>
              <Text size="xs" c="dimmed" fw={500} px="xs" mt="sm" mb={4}>
                {section.label}
              </Text>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  component={RouterNavLink}
                  to={item.path}
                  label={item.label}
                  leftSection={<item.icon size={18} stroke={1.5} />}
                  onClick={() => opened && toggle()}
                />
              ))}
            </div>
          ))}
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100vh' }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
