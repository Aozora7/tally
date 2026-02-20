import { HashRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from '@/context/FinanceContext';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Triage } from '@/pages/Triage';
import { Accounts } from '@/pages/Accounts';
import { Categories } from '@/pages/Categories';
import { Rules } from '@/pages/Rules';
import { Settings } from '@/pages/Settings';

export default function App() {
  return (
    <FinanceProvider>
      <HashRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/triage" element={<Triage />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </MainLayout>
      </HashRouter>
    </FinanceProvider>
  );
}
