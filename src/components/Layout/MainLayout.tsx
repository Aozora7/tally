import { AppShell, Burger, Group, NavLink, ScrollArea, Text } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { NavLink as RouterNavLink } from 'react-router-dom';
import {
  IconDashboard,
  IconTable,
  IconReceipt,
  IconChecklist,
  IconBuildingBank,
  IconTags,
  IconRobot,
  IconSettings,
  IconChartLine,
  IconArrowsExchange,
  IconDownload,
  IconBriefcase,
} from '@tabler/icons-react';
import type { ReactNode, ComponentType } from 'react';
import { SyncIndicator } from '@/components/SyncIndicator';

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
      { label: 'Import', path: '/import', icon: IconDownload },
    ],
  },
  {
    label: 'PORTFOLIO',
    items: [
      { label: 'Portfolio', path: '/portfolio', icon: IconBriefcase },
      { label: 'Securities', path: '/securities', icon: IconChartLine },
      { label: 'Trades', path: '/trades', icon: IconArrowsExchange },
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
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <AppShell
      header={{ height: 48, collapsed: !isMobile }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="sm">
          <Burger opened={opened} onClick={toggle} size="sm" aria-label="Toggle navigation" />
          <Text fw={700} size="sm">
            Tally
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
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
                  mb={3}
                />
              ))}
            </div>
          ))}
        </AppShell.Section>
        <AppShell.Section>
          <SyncIndicator />
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100vh' }}>
        {children}
        <div style={{ flexShrink: 0, height: '1rem' }} />
      </AppShell.Main>
    </AppShell>
  );
}
