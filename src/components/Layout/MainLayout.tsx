import { AppShell, Burger, Group, NavLink, ScrollArea, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavLink as RouterNavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Triage', path: '/triage' },
  { label: 'Import', path: '/import' },
  { label: 'Accounts', path: '/accounts' },
  { label: 'Categories', path: '/categories' },
  { label: 'Rules', path: '/rules' },
  { label: 'Pivot Table', path: '/pivot' },
  { label: 'Settings', path: '/settings' },
];

export function MainLayout({ children }: MainLayoutProps) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text size="lg" fw={600}>
            Impersonal Finance
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              component={RouterNavLink}
              to={item.path}
              label={item.label}
              onClick={() => toggle()}
            />
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
