import { HashRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from '@/context/FinanceContext';
import { SecuritiesProvider } from '@/context/SecuritiesContext';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Triage } from '@/pages/Triage';
import { Accounts } from '@/pages/Accounts';
import { Categories } from '@/pages/Categories';
import { Rules } from '@/pages/Rules';
import { PivotTable } from '@/pages/PivotTable';
import { Settings } from '@/pages/Settings';
import { ImportWizard } from './components/ImportWizard/ImportWizard';
import { Securities } from '@/pages/Securities';
import { SecuritiesTransactions } from '@/pages/SecuritiesTransactions';
import { Portfolio } from '@/pages/Portfolio';

export default function App() {
  return (
    <FinanceProvider>
      <SecuritiesProvider>
        <HashRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/import" element={<ImportWizard />} />
              <Route path="/triage" element={<Triage />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/pivot" element={<PivotTable />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/securities" element={<Securities />} />
              <Route path="/trades" element={<SecuritiesTransactions />} />
              <Route path="/portfolio" element={<Portfolio />} />
            </Routes>
          </MainLayout>
        </HashRouter>
      </SecuritiesProvider>
    </FinanceProvider>
  );
}
