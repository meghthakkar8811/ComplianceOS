import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, catalogSearch } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, toast } from './context/ToastContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';

// Views
import DashboardView from './views/DashboardView';
import CalendarView from './views/CalendarView';
import FormsView from './views/FormsView';
import RoyaltyView from './views/RoyaltyView';
import ProductionView from './views/ProductionView';
import SalesView from './views/SalesView';
import BuyersView from './views/BuyersView';
import DocumentsView from './views/DocumentsView';
import DgmsView from './views/DgmsView';
import AlertsView from './views/AlertsView';
import StarRatingView from './views/StarRatingView';
import LoginView from './pages/LoginView';
import SignupView from './pages/SignupView';
import ForgotView from './pages/ForgotView';
import VerifyView from './pages/VerifyView';

// Modals
import AddMineModal from './components/modals/AddMineModal';
import FormBModal from './components/modals/FormBModal';
import FormCModal from './components/modals/FormCModal';
import FormJModal from './components/modals/FormJModal';
import FormAModal from './components/modals/FormAModal';
import AddDocModal from './components/modals/AddDocModal';
import StatutoryRatesModal from './components/modals/StatutoryRatesModal';
import ComplianceLoader from './components/layout/ComplianceLoader';

import './styles/dashboard.css';

const NAV_PAGES = ['dashboard', 'calendar', 'royalty', 'sales', 'buyers', 'forms', 'production', 'documents', 'dgms', 'alerts', 'star-rating'];

/** Mirrors AlertsView's own alert conditions, so the sidebar/topbar badge count matches what opening Alerts shows. */
function countActiveAlerts(dashboardData) {
  if (!dashboardData) return 0;
  const records = dashboardData.records || [];
  const now = Date.now();
  const totalActions = dashboardData?.dgms?.totalActions ?? 0;
  const completedActions = dashboardData?.dgms?.completedActions ?? 0;

  const docRecords = records.filter((r) => r.recordType === 'CLEARANCE' || r.recordType === 'STATUTORY_PLAN');
  const expiredDocs = docRecords.filter((r) => r.expiry && r.expiry < now);
  const expiringDocs = docRecords.filter((r) => r.status === 'VALID' && r.expiry >= now && r.expiry - now < 90 * 86400000);

  const filings = records.filter((r) => r.recordType !== 'REGISTER');
  const pendingFilings = filings.filter((r) => r.status === 'PENDING_SUBMISSION');
  const overdueFilings = pendingFilings.filter((r) => r.expiry < now);

  let count = 0;
  if (totalActions > 0 && completedActions / totalActions < 0.6) count += 1;
  if (overdueFilings.length > 0) count += 1;
  if (expiredDocs.length > 0) count += 1;
  if (pendingFilings.length > 0) count += 1;
  if (expiringDocs.length > 0) count += 1;
  return count;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authPage, setAuthPage] = useState('login'); // 'login' | 'signup' | 'forgot' | 'verify'
  const [pendingEmail, setPendingEmail] = useState('');
  const [activePage, setActivePageState] = useState(() => {
    const fromHash = window.location.hash.replace(/^#\/?/, '');
    return NAV_PAGES.includes(fromHash) ? fromHash : 'dashboard';
  });
  const setActivePage = useCallback((page) => {
    setActivePageState(page);
    window.location.hash = `/${page}`;
  }, []);
  useEffect(() => {
    const handleHashChange = () => {
      const fromHash = window.location.hash.replace(/^#\/?/, '');
      if (NAV_PAGES.includes(fromHash)) setActivePageState(fromHash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mines, setMines] = useState([]);
  const [mineralsByMineId, setMineralsByMineId] = useState({});
  const [activeMineId, setActiveMineId] = useState(null);
  const [isMinePickerOpen, setIsMinePickerOpen] = useState(false);
  const [chartType, setChartType] = useState('both');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showAddMineModal, setShowAddMineModal] = useState(false);
  const [showFormBModal, setShowFormBModal] = useState(false);
  const [showFormCModal, setShowFormCModal] = useState(false);
  const [showFormJModal, setShowFormJModal] = useState(false);
  const [showFormAModal, setShowFormAModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showStatutoryRatesModal, setShowStatutoryRatesModal] = useState(false);

  // A mine no longer has a single mineral field — it can produce several, each tracked as its
  // own Mineral record — so every mine's display label is the comma-joined list of those. The
  // Mineral lookup is scoped per mine via the mineId option, not a query filter, so one mine at a
  // time (small lists, so a handful of parallel requests is fine).
  const loadMineralsByMineId = useCallback(async (mineList) => {
    if (mineList.length === 0) {
      setMineralsByMineId({});
      return;
    }
    try {
      const results = await Promise.all(
        mineList.map((mine) => catalogSearch('Mineral', {}, { mineId: mine.id }).catch(() => ({ items: [] })))
      );
      const joined = {};
      mineList.forEach((mine, index) => {
        joined[mine.id] = (results[index].items || []).map((mineral) => mineral.mineral).join(', ');
      });
      setMineralsByMineId(joined);
    } catch (err) {
      // A display nicety; leave labels blank for unresolved mines rather than failing the page.
    }
  }, []);

  // Load Mines
  const loadMines = useCallback(async () => {
    try {
      const res = await catalogSearch('Mine', { filter: { field: 'active', op: 'EQ', values: [true] } });
      const mineList = res.items || [];
      setMines(mineList);
      loadMineralsByMineId(mineList);
      if (mineList.length > 0) {
        const savedMineId = localStorage.getItem('cos_active_mine') || localStorage.getItem('cos_mine_id');
        const defaultMine = mineList.find((m) => m.id === savedMineId) || mineList[0];
        setActiveMineId(defaultMine.id);
      }
    } catch (err) {
      console.error('Failed to load mines:', err);
    }
  }, [loadMineralsByMineId]);

  // Check Session Auth
  const checkAuth = useCallback(async () => {
    try {
      const me = await apiFetch('/auth/me');
      setUser(me.user || me);
      loadMines();
    } catch (err) {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, [loadMines]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Delete Mine
  const handleDeleteMine = async (id, name) => {
    const mine = mines.find((m) => m.id === id);
    const targetName = name || mine?.name || 'this mine lease';
    const leaseNo = mine?.leaseNumber ? ` (Lease #${mine.leaseNumber})` : '';

    if (
      !confirm(
        `⚠️ ARE YOU SURE YOU WANT TO PERMANENTLY DELETE LEASE:\n\n"${targetName}"${leaseNo}?\n\nThis will permanently delete this mining lease, along with its production entries, compliance calendar records, and royalty calculations.\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/mines/${id}`, { method: 'DELETE' });
      toast(`Lease "${targetName}" deleted successfully`, 'success');
      const remaining = mines.filter((m) => m.id !== id);
      setMines(remaining);
      if (activeMineId === id) {
        if (remaining.length > 0) {
          setActiveMineId(remaining[0].id);
        } else {
          setActiveMineId(null);
          toast('No leases remaining. Please add a new mine lease.', 'info');
          setShowAddMineModal(true);
        }
      }
    } catch (err) {
      toast(err.message || 'Failed to delete lease', 'error');
    }
  };

  // Load Dashboard Data
  const loadDashboardData = useCallback(async (mineId) => {
    if (!mineId) return;
    setLoading(true);
    try {
      const sixMonthsAgoStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).getTime();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      const todayStart = new Date().setHours(0, 0, 0, 0);

      const [recordsRes, entriesRes, salesRes, dgmsRes] = await Promise.all([
        catalogSearch('ComplianceRecord', { filter: { field: 'mineId', op: 'EQ', values: [mineId] } }).catch(() => ({ items: [] })),
        catalogSearch('ProductionEntry', {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [mineId] },
              { field: 'entryTime', op: 'GTE', values: [sixMonthsAgoStart] },
            ],
          },
        }).catch(() => ({ items: [] })),
        catalogSearch('Sale', {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [mineId] },
              { field: 'dispatchedOn', op: 'GTE', values: [sixMonthsAgoStart] },
            ],
          },
        }).catch(() => ({ items: [] })),
        apiFetch(`/mines/${mineId}/compliance/progress`, { method: 'POST', body: JSON.stringify(null) }).catch(() => null),
      ]);

      const entries = entriesRes.items || [];
      const sales = salesRes.items || [];

      // Calculate 6-month chart
      const chart = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        const start = monthDate.getTime();
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime();
        const inMonth = entries.filter((e) => e.entryTime >= start && e.entryTime < end);
        const dispatchedInMonth = sales.filter((s) => s.dispatchedOn >= start && s.dispatchedOn < end);
        chart.push({
          month: monthDate.toLocaleString('default', { month: 'short' }),
          produced: inMonth.reduce((s, e) => s + (e.quantity || 0), 0),
          dispatched: dispatchedInMonth.reduce((s, sale) => s + (sale.quantity || 0), 0),
        });
      }

      const monthProduced = entries.filter((e) => e.entryTime >= monthStart).reduce((s, e) => s + (e.quantity || 0), 0);
      const todayProduced = entries.filter((e) => e.entryTime >= todayStart).reduce((s, e) => s + (e.quantity || 0), 0);
      const extractedYtd = entries.reduce((s, e) => s + (e.quantity || 0), 0);

      // Royalty/DMF/NMET are computed and stored directly on each Sale's own liability at save
      // time — the current period's gross liability is just the sum of those fields across its
      // sales, already fetched above for the chart. Sale has no stored period fields of its own,
      // so the period key is derived from dispatchedOn here.
      const royaltyByPeriod = new Map();
      for (const sale of sales) {
        if (sale.dispatchedOn == null) continue;
        const dispatchedDate = new Date(sale.dispatchedOn);
        const key = dispatchedDate.getFullYear() * 12 + dispatchedDate.getMonth();
        const liability = sale.liability || {};
        const grossAmount =
          (royaltyByPeriod.get(key) || 0) + (liability.royaltyAmount || 0) + (liability.dmfAmount || 0) + (liability.nmetAmount || 0);
        royaltyByPeriod.set(key, grossAmount);
      }
      const latestPeriodKey = royaltyByPeriod.size > 0 ? Math.max(...royaltyByPeriod.keys()) : null;
      const currentGrossRoyalty = latestPeriodKey != null ? royaltyByPeriod.get(latestPeriodKey) : 0;

      setDashboardData({
        records: recordsRes.items || [],
        dgms: dgmsRes,
        chart: chart.length > 0 && chart.some((c) => c.produced > 0) ? chart : undefined,
        monthProduced,
        todayProduced,
        extractedYtd,
        grossRoyalty: latestPeriodKey != null ? `₹${currentGrossRoyalty.toLocaleString()}` : '₹0',
      });
    } catch (err) {
      console.warn('Dashboard data fetch fallback used:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeMineId) {
      localStorage.setItem('cos_active_mine', activeMineId);
      localStorage.setItem('cos_mine_id', activeMineId);
      loadDashboardData(activeMineId);
    }
  }, [activeMineId, loadDashboardData]);

  // Keyboard Shortcuts (Escape to close modals, Alt+1..8 to navigate)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAddMineModal(false);
        setShowFormBModal(false);
        setShowFormCModal(false);
        setShowFormJModal(false);
        setShowFormAModal(false);
        setShowAddDocModal(false);
        setShowStatutoryRatesModal(false);
        setIsMinePickerOpen(false);
      }
      if (e.altKey) {
        const navMap = {
          1: 'dashboard',
          2: 'calendar',
          3: 'royalty',
          4: 'forms',
          5: 'production',
          6: 'documents',
          7: 'dgms',
          8: 'alerts',
          9: 'sales',
          0: 'buyers',
        };
        if (navMap[e.key]) {
          e.preventDefault();
          setActivePage(navMap[e.key]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('cos_active_mine');
    localStorage.removeItem('cos_mine_id');
    setUser(null);
  };

  const activeMine = mines.find((m) => m.id === activeMineId) || mines[0];
  const activeMineMinerals = mineralsByMineId[activeMine?.id] || '';
  const dgmsTotalActions = dashboardData?.dgms?.totalActions ?? 0;
  const dgmsCompletedActions = dashboardData?.dgms?.completedActions ?? 0;
  const healthScore = dgmsTotalActions > 0 ? Math.round((dgmsCompletedActions / dgmsTotalActions) * 100) : 100;
  const alertCount = countActiveAlerts(dashboardData);

  if (!authChecked) {
    return <ComplianceLoader />;
  }

  if (!user) {
    return (
      <ThemeProvider>
        <ToastProvider>
          {authPage === 'signup' ? (
            <SignupView
              onNavigateToLogin={() => setAuthPage('login')}
              onNavigateToVerify={(em) => {
                setPendingEmail(em);
                setAuthPage('verify');
              }}
            />
          ) : authPage === 'forgot' ? (
            <ForgotView onNavigateToLogin={() => setAuthPage('login')} />
          ) : authPage === 'verify' ? (
            <VerifyView
              email={pendingEmail}
              onNavigateToLogin={() => setAuthPage('login')}
            />
          ) : (
            <LoginView
              onLoginSuccess={checkAuth}
              onNavigateToSignup={() => setAuthPage('signup')}
              onNavigateToForgot={() => setAuthPage('forgot')}
            />
          )}
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        {/* SIDEBAR */}
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          activeMine={activeMine}
          mines={mines}
          mineralsByMineId={mineralsByMineId}
          isMinePickerOpen={isMinePickerOpen}
          onToggleMinePicker={() => setIsMinePickerOpen(!isMinePickerOpen)}
          onSelectMine={(id) => {
            setActiveMineId(id);
            toast('Switched to ' + (mines.find((m) => m.id === id)?.name || 'mine'), 'success');
          }}
          onDeleteMine={handleDeleteMine}
          onOpenAddMine={() => setShowAddMineModal(true)}
          user={user}
          dgmsScore={healthScore}
          alertCount={alertCount}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={handleLogout}
        />

        {/* MAIN CONTAINER */}
        <main className="main" id="main">
          <Topbar
            activePage={activePage}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onNavigate={setActivePage}
            alertCount={alertCount}
            healthScore={healthScore}
            user={user}
          />

          {/* PAGE ROUTER */}
          {activePage === 'dashboard' && (
            <DashboardView
              dashboardData={dashboardData}
              activeMine={activeMine}
              activeMineMinerals={activeMineMinerals}
              chartType={chartType}
              onChartTypeChange={setChartType}
              onNavigate={setActivePage}
              onOpenLogProd={() => setActivePage('production')}
              onOpenFormB={() => setShowFormBModal(true)}
            />
          )}

          {activePage === 'calendar' && (
            <CalendarView activeMineId={activeMineId} />
          )}

          {activePage === 'forms' && (
            <FormsView
              onOpenForm={(type) => {
                if (type === 'formb') setShowFormBModal(true);
                else if (type === 'formc') setShowFormCModal(true);
                else if (type === 'formj') setShowFormJModal(true);
                else if (type === 'forma') setShowFormAModal(true);
              }}
            />
          )}

          {activePage === 'royalty' && (
            <RoyaltyView
              activeMine={activeMine}
              onOpenStatutoryRates={() => setShowStatutoryRatesModal(true)}
            />
          )}

          {activePage === 'production' && (
            <ProductionView activeMineId={activeMineId} />
          )}

          {activePage === 'sales' && (
            <SalesView activeMineId={activeMineId} activeMine={activeMine} />
          )}

          {activePage === 'buyers' && (
            <BuyersView />
          )}

          {activePage === 'documents' && (
            <DocumentsView
              activeMineId={activeMineId}
              onOpenUploadDoc={() => setShowAddDocModal(true)}
            />
          )}

          {activePage === 'dgms' && (
            <DgmsView activeMineId={activeMineId} activeMine={activeMine} activeMineMinerals={activeMineMinerals} />
          )}

          {activePage === 'alerts' && (
            <AlertsView dashboardData={dashboardData} onNavigate={setActivePage} />
          )}

          {activePage === 'star-rating' && (
            <StarRatingView activeMine={activeMine} />
          )}
        </main>

        {/* MODALS */}
        <AddMineModal
          isOpen={showAddMineModal}
          onClose={() => setShowAddMineModal(false)}
          onMineAdded={() => loadMines()}
        />

        <FormBModal
          isOpen={showFormBModal}
          onClose={() => setShowFormBModal(false)}
          activeMine={activeMine}
          activeMineMinerals={activeMineMinerals}
          user={user}
          onSubmitted={() => loadDashboardData(activeMineId)}
        />

        <FormCModal
          isOpen={showFormCModal}
          onClose={() => setShowFormCModal(false)}
          activeMine={activeMine}
          activeMineMinerals={activeMineMinerals}
          user={user}
          onSubmitted={() => loadDashboardData(activeMineId)}
        />

        <FormJModal
          isOpen={showFormJModal}
          onClose={() => setShowFormJModal(false)}
          activeMine={activeMine}
          activeMineMinerals={activeMineMinerals}
          user={user}
          onSubmitted={() => loadDashboardData(activeMineId)}
        />

        <FormAModal
          isOpen={showFormAModal}
          onClose={() => setShowFormAModal(false)}
          activeMine={activeMine}
          user={user}
          onSubmitted={() => loadDashboardData(activeMineId)}
        />

        <AddDocModal
          isOpen={showAddDocModal}
          onClose={() => setShowAddDocModal(false)}
          activeMineId={activeMineId}
          onDocAdded={() => loadDashboardData(activeMineId)}
        />

        <StatutoryRatesModal
          isOpen={showStatutoryRatesModal}
          onClose={() => setShowStatutoryRatesModal(false)}
          activeMineral={activeMineMinerals}
        />
      </ToastProvider>
    </ThemeProvider>
  );
}
