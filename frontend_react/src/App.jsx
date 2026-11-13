import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, catalogSearch, catalogSearchAll, catalogAggregate } from './services/api';
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
import AlertsView, { buildAlerts } from './views/AlertsView';
import MineManagementView from './views/MineManagementView';
import LoginView from './pages/LoginView';
import SignupView from './pages/SignupView';
import ForgotView from './pages/ForgotView';
import VerifyView from './pages/VerifyView';

// Modals
import AddMineModal from './components/modals/AddMineModal';
import FormBModal from './components/modals/FormBModal';
import FormF2Modal from './components/modals/FormF2Modal';
import FormCModal from './components/modals/FormCModal';
import FormJModal from './components/modals/FormJModal';
import FormAModal from './components/modals/FormAModal';
import AddDocModal from './components/modals/AddDocModal';
import StatutoryRatesModal from './components/modals/StatutoryRatesModal';
import ComplianceLoader from './components/layout/ComplianceLoader';

import './styles/dashboard.css';

const NAV_PAGES = ['dashboard', 'calendar', 'royalty', 'sales', 'buyers', 'forms', 'production', 'mine', 'documents', 'dgms', 'alerts'];

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
  const [showFormF2Modal, setShowFormF2Modal] = useState(false);
  const [showFormCModal, setShowFormCModal] = useState(false);
  const [showFormJModal, setShowFormJModal] = useState(false);
  const [showFormAModal, setShowFormAModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  const [showStatutoryRatesModal, setShowStatutoryRatesModal] = useState(false);

  const loadMineralsByMineId = useCallback(async (mineList) => {
    if (mineList.length === 0) {
      setMineralsByMineId({});
      return;
    }
    try {
      const results = await Promise.all(
        mineList.map((mine) => catalogSearchAll('Mineral', {}, { mineId: mine.id }).catch(() => ({ items: [] })))
      );
      const joined = {};
      mineList.forEach((mine, index) => {
        joined[mine.id] = (results[index].items || []).map((mineral) => mineral.mineral).join(', ');
      });
      setMineralsByMineId(joined);
    } catch (err) {
      // Leave labels blank for unresolved mines rather than failing the page.
    }
  }, []);

  // Load Mines
  const loadMines = useCallback(async () => {
    try {
      const res = await catalogSearchAll('Mine', { filter: { field: 'active', op: 'EQ', values: [true] } });
      const mineList = res.items || [];
      setMines(mineList);
      loadMineralsByMineId(mineList);
      if (mineList.length > 0) {
        const savedMineId = localStorage.getItem('cos_active_mine') || localStorage.getItem('cos_mine_id');
        const defaultMine = mineList.find((m) => m.id === savedMineId) || mineList[0];
        setActiveMineId((prev) => prev && mineList.some((m) => m.id === prev) ? prev : defaultMine.id);
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

  // Load Dashboard Data via server-side Aggregations & compliance progress
  const loadDashboardData = useCallback(async (mineId) => {
    if (!mineId) return;
    setLoading(true);
    try {
      const now = new Date();
      const nowMs = now.getTime();
      const ninetyDaysMs = nowMs + 90 * 86400000;
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const sixMonthsAgoStart = new Date(currentYear, currentMonth - 5, 1).getTime();
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const fyStart = new Date(fyStartYear, 3, 1).getTime();

      const countMetric = [{ field: 'id', function: 'COUNT', alias: 'count' }];
      const aggCount = (filter) =>
        catalogAggregate('ComplianceRecord', { filter, metrics: countMetric }, { mineId })
          .then((r) => r?.buckets?.[0]?.count || 0)
          .catch(() => 0);

      const [
        totalProgressRes,
        dgmsRes,
        overdueFilingsCount,
        pendingFilingsCount,
        expiredDocsCount,
        expiringDocsCount,
        deadlinesRes,
        prodAggRes,
        salesAggRes,
        ytdAggRes,
        todayAggRes,
      ] = await Promise.all([
        apiFetch(`/mines/${mineId}/compliance/progress`, { method: 'POST', body: JSON.stringify(null) }).catch(() => null),
        apiFetch(`/mines/${mineId}/compliance/progress`, {
          method: 'POST',
          body: JSON.stringify({ filter: { field: 'recordType', op: 'EQ', values: ['REGISTER'] } }),
        }).catch(() => null),
        aggCount({
          op: 'AND',
          values: [
            { field: 'mineId', op: 'EQ', values: [mineId] },
            { field: 'recordType', op: 'NE', values: ['REGISTER'] },
            { field: 'status', op: 'EQ', values: ['PENDING_SUBMISSION'] },
            { field: 'expiry', op: 'GT', values: [0] },
            { field: 'expiry', op: 'LT', values: [nowMs] },
          ],
        }),
        aggCount({
          op: 'AND',
          values: [
            { field: 'mineId', op: 'EQ', values: [mineId] },
            { field: 'recordType', op: 'NE', values: ['REGISTER'] },
            { field: 'status', op: 'EQ', values: ['PENDING_SUBMISSION'] },
          ],
        }),
        aggCount({
          op: 'AND',
          values: [
            { field: 'mineId', op: 'EQ', values: [mineId] },
            { field: 'recordType', op: 'IN', values: ['CLEARANCE', 'STATUTORY_PLAN'] },
            { field: 'expiry', op: 'GT', values: [0] },
            { field: 'expiry', op: 'LT', values: [nowMs] },
          ],
        }),
        aggCount({
          op: 'AND',
          values: [
            { field: 'mineId', op: 'EQ', values: [mineId] },
            { field: 'recordType', op: 'IN', values: ['CLEARANCE', 'STATUTORY_PLAN'] },
            { field: 'status', op: 'EQ', values: ['VALID'] },
            { field: 'expiry', op: 'GTE', values: [nowMs] },
            { field: 'expiry', op: 'LT', values: [ninetyDaysMs] },
          ],
        }),
        catalogSearch('ComplianceRecord', {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [mineId] },
              { field: 'status', op: 'NE', values: ['SUBMITTED'] },
              { field: 'expiry', op: 'GT', values: [0] },
            ],
          },
          sorts: [{ field: 'expiry', order: 'ASC' }],
          page: { offset: 0, limit: 4 },
        }).catch(() => ({ items: [] })),
        catalogAggregate(
          'ProductionEntry',
          {
            filter: { field: 'entryTime', op: 'GTE', values: [sixMonthsAgoStart] },
            groupByFields: [
              { field: 'entryTime', alias: 'year', additional: { dateTruncUnit: 'YEARS' } },
              { field: 'entryTime', alias: 'month', additional: { dateTruncUnit: 'MONTHS' } },
            ],
            metrics: [{ field: 'quantity', function: 'SUM', alias: 'produced' }],
          },
          { mineId }
        ).catch(() => ({ buckets: [] })),
        catalogAggregate(
          'Sale',
          {
            filter: { field: 'dispatchedOn', op: 'GTE', values: [sixMonthsAgoStart] },
            groupByFields: [
              { field: 'dispatchedOn', alias: 'year', additional: { dateTruncUnit: 'YEARS' } },
              { field: 'dispatchedOn', alias: 'month', additional: { dateTruncUnit: 'MONTHS' } },
            ],
            metrics: [
              { field: 'quantity', function: 'SUM', alias: 'dispatched' },
              { field: 'liability.royaltyAmount', function: 'SUM', alias: 'royaltyAmount' },
              { field: 'liability.dmfAmount', function: 'SUM', alias: 'dmfAmount' },
              { field: 'liability.nmetAmount', function: 'SUM', alias: 'nmetAmount' },
            ],
          },
          { mineId }
        ).catch(() => ({ buckets: [] })),
        catalogAggregate(
          'ProductionEntry',
          {
            filter: { field: 'entryTime', op: 'GTE', values: [fyStart] },
            metrics: [{ field: 'quantity', function: 'SUM', alias: 'ytdProduced' }],
          },
          { mineId }
        ).catch(() => ({ buckets: [] })),
        catalogAggregate(
          'ProductionEntry',
          {
            filter: { field: 'entryTime', op: 'GTE', values: [todayStart] },
            metrics: [{ field: 'quantity', function: 'SUM', alias: 'todayProduced' }],
          },
          { mineId }
        ).catch(() => ({ buckets: [] })),
      ]);

      // Index buckets by "year-month"
      const prodByPeriod = new Map();
      for (const b of prodAggRes?.buckets || []) {
        prodByPeriod.set(`${b.year}-${b.month}`, b.produced || 0);
      }
      const salesByPeriod = new Map();
      let latestGrossRoyalty = 0;
      let latestRoyaltyBreakdown = { base: 0, dmf: 0, nmet: 0 };
      let latestSalePeriodKey = null;
      for (const b of salesAggRes?.buckets || []) {
        const key = `${b.year}-${b.month}`;
        salesByPeriod.set(key, b.dispatched || 0);
        const base = b.royaltyAmount || 0;
        const dmf = b.dmfAmount || 0;
        const nmet = b.nmetAmount || 0;
        const gross = base + dmf + nmet;
        const periodNum = (b.year || 0) * 12 + (b.month || 0);
        if (latestSalePeriodKey == null || periodNum >= latestSalePeriodKey) {
          latestSalePeriodKey = periodNum;
          latestGrossRoyalty = gross;
          latestRoyaltyBreakdown = { base, dmf, nmet };
        }
      }

      // Build 6-month chart directly from backend aggregated buckets
      const chart = [];
      let currentMonthProduced = 0;
      let currentMonthDispatched = 0;
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(currentYear, currentMonth - i, 1);
        const y = monthDate.getFullYear();
        const m = monthDate.getMonth() + 1; // 1-indexed to match backend MONTHS (1-12)
        const key = `${y}-${m}`;
        const produced = prodByPeriod.get(key) || 0;
        const dispatched = salesByPeriod.get(key) || 0;
        if (i === 0) {
          currentMonthProduced = produced;
          currentMonthDispatched = dispatched;
        }
        chart.push({
          month: monthDate.toLocaleString('default', { month: 'short' }),
          produced,
          dispatched,
        });
      }

      const extractedYtd = ytdAggRes?.buckets?.[0]?.ytdProduced || 0;
      const todayProduced = todayAggRes?.buckets?.[0]?.todayProduced || 0;

      setDashboardData({
        progress: totalProgressRes,
        dgms: dgmsRes,
        complianceCounts: {
          overdueFilingsCount,
          pendingFilingsCount,
          expiredDocsCount,
          expiringDocsCount,
        },
        upcomingDeadlines: deadlinesRes?.items || [],
        chart,
        monthProduced: currentMonthProduced,
        monthDispatched: currentMonthDispatched,
        todayProduced,
        extractedYtd,
        royaltyBreakdown: latestRoyaltyBreakdown,
        grossRoyalty: latestSalePeriodKey != null ? `₹${Math.round(latestGrossRoyalty).toLocaleString('en-IN')}` : '₹0',
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
        setShowFormF2Modal(false);
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
  const alertCount = buildAlerts(dashboardData).length;

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
          dgmsProgress={dashboardData?.dgms}
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
            complianceProgress={dashboardData?.progress}
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
            <CalendarView activeMineId={activeMineId} onDataChanged={() => loadDashboardData(activeMineId)} />
          )}

          {activePage === 'forms' && (
            <FormsView
              onOpenForm={(type) => {
                if (type === 'formb' || type === 'formf1') setShowFormBModal(true);
                else if (type === 'formf2') setShowFormF2Modal(true);
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
            <ProductionView activeMineId={activeMineId} onDataChanged={() => loadDashboardData(activeMineId)} />
          )}

          {activePage === 'mine' && (
            <MineManagementView
              activeMine={activeMine}
              onMineUpdated={() => {
                loadMines();
                loadDashboardData(activeMineId);
              }}
            />
          )}

          {activePage === 'sales' && (
            <SalesView activeMineId={activeMineId} activeMine={activeMine} onDataChanged={() => loadDashboardData(activeMineId)} />
          )}

          {activePage === 'buyers' && (
            <BuyersView />
          )}

          {activePage === 'documents' && (
            <DocumentsView
              activeMineId={activeMineId}
              refreshKey={documentsRefreshKey}
              onOpenUploadDoc={() => setShowAddDocModal(true)}
              onDataChanged={() => loadDashboardData(activeMineId)}
            />
          )}

          {activePage === 'dgms' && (
            <DgmsView
              activeMineId={activeMineId}
              onDataChanged={() => loadDashboardData(activeMineId)}
            />
          )}

          {activePage === 'alerts' && (
            <AlertsView dashboardData={dashboardData} onNavigate={setActivePage} />
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

        <FormF2Modal
          isOpen={showFormF2Modal}
          onClose={() => setShowFormF2Modal(false)}
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
          activeMineMinerals={activeMineMinerals}
          user={user}
          onSubmitted={() => loadDashboardData(activeMineId)}
        />

        <AddDocModal
          isOpen={showAddDocModal}
          onClose={() => setShowAddDocModal(false)}
          activeMineId={activeMineId}
          onDocAdded={() => {
            setDocumentsRefreshKey((k) => k + 1);
            loadDashboardData(activeMineId);
          }}
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
