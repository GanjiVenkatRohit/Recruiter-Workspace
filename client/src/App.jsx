import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Activity,
  Users,
  Search,
  Cpu,
  BarChart3,
  History,
  Settings,
  User,
  LogOut,
  Bell,
  Menu,
  ChevronLeft,
  ChevronUp
} from 'lucide-react';
import config from './config';
import CandidateList from './components/CandidateList';
import FilterBar from './components/FilterBar';
import CandidateDetailPanel from './components/CandidateDetailPanel';
import AddCandidateForm from './components/AddCandidateForm';
import MetricsDashboardPage from './components/MetricsDashboardPage';
import { useWebSocket } from './contexts/WebSocketContext.jsx';
import ConnectionStatus from './components/ConnectionStatus';
import UploadStatusTracker from './components/UploadStatusTracker';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage, RegisterPage } from './components/AuthPages';
import { clearToken, getCurrentUser } from './auth';
import { apiClient } from './apiClient';
import SearchPage from './components/SearchPage';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import { PanelRight } from './components/PanelRight';
import ToastContainer from './components/ToastContainer';
import { showToast } from './utils/toast';
import './App.css';

// Candidates Directory view component
function DashboardPage({
  selectedCandidateId,
  setSelectedCandidateId,
  lastUpdatedCandidate,
  setLastUpdatedCandidate,
  newCandidate,
  setNewCandidate,
  isAddModalOpen,
  setIsAddModalOpen,
  totalRows,
  setTotalRows
}) {
  const [filters, setFilters] = useState({ search: '', status: '', location: '', skills: [], hasResume: false });
  const [isListLoading, setIsListLoading] = useState(false);

  const wsClient = useWebSocket();

  // Subscribe to real-time events via WebSocket
  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.onEvent((event) => {
      if (event.eventType === 'candidate_created') {
        setNewCandidate(event.payload);
        setTotalRows((prev) => prev + 1);
      } else if (event.eventType === 'candidate_updated') {
        setLastUpdatedCandidate(event.payload);
      } else if (event.eventType === 'candidate_deleted') {
        if (selectedCandidateId === event.payload.id) {
          if (event.payload.mergedInto) {
            console.log(`[App] Current draft candidate ${event.payload.id} merged into existing candidate ${event.payload.mergedInto}. Switching view...`);
            setSelectedCandidateId(event.payload.mergedInto);
          } else {
            setSelectedCandidateId(null);
          }
        }
        setLastUpdatedCandidate({ id: event.payload.id, isDeleted: true });
        setTotalRows((prev) => Math.max(0, prev - 1));
      }
    });

    return () => unsubscribe();
  }, [wsClient]);

  // Fetch page callback passed to the virtualized list
  const fetchPage = async (cursor) => {
    setIsListLoading(true);
    try {
      // Unified endpoint: /api/candidates handles both search (via search_vector) and plain filters
      let url = `${config.apiBaseUrl}/api/candidates?limit=100`;

      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }
      if (filters.status) {
        url += `&status=${encodeURIComponent(filters.status)}`;
      }
      if (filters.skills && filters.skills.length > 0) {
        url += `&skills=${encodeURIComponent(filters.skills.join(','))}`;
      }
      if (filters.location) {
        url += `&location=${encodeURIComponent(filters.location)}`;
      }
      if (filters.hasResume) {
        url += `&hasResume=true`;
      }
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const res = await apiClient(url);
      if (!res.ok) {
        throw new Error('Failed to fetch candidates');
      }
      const data = await res.json();

      // Only update total row count on the initial (non-cursor) page load
      if (!cursor && data.totalCount !== undefined) {
        setTotalRows(data.totalCount);
      }
      return data;
    } catch (err) {
      console.error(err);
      return { candidates: [], nextCursor: null, totalCount: 0 };
    } finally {
      setIsListLoading(false);
    }
  };

  return (
    <div className="workspace-main">
      {/* Left Side: Controls & List */}
      <section className="list-section">
        {/* Section Title with Add CTA Button & Controls inline */}
        <div className="list-section-header">
          <div className="list-title-wrap">
            <h3>Candidates Directory</h3>
            <span className="count-badge">{totalRows.toLocaleString()} total</span>
          </div>
          <div className="list-header-actions">
            <FilterBar onChange={setFilters} isLoading={isListLoading} />
            <button className="add-candidate-trigger-btn" onClick={() => setIsAddModalOpen(true)}>
              + Add Candidate
            </button>
          </div>
        </div>

        {/* Keyset Virtualized Candidate List */}
        <CandidateList
          key={`list-${filters.status}-${filters.location}-${filters.skills.join(',')}-${filters.search}-${filters.hasResume}`}
          totalRows={totalRows}
          fetchPage={fetchPage}
          onSelectCandidate={setSelectedCandidateId}
          updatedCandidate={lastUpdatedCandidate}
          newCandidate={newCandidate}
          searchQuery={filters.search}
        />
      </section>

      {/* Detailed Profile Viewer & Editor Popup Modal */}
      {selectedCandidateId && (
        <CandidateDetailPanel
          candidateId={selectedCandidateId}
          onSaveSuccess={setLastUpdatedCandidate}
          lastUpdatedCandidate={lastUpdatedCandidate}
          onClose={() => setSelectedCandidateId(null)}
        />
      )}

      {/* Creation Modal Overlay */}
      <AddCandidateForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(cand) => {
          setNewCandidate(cand);
          setTotalRows((prev) => prev + 1);
        }}
        onSelectCandidate={setSelectedCandidateId}
      />
    </div>
  );
}

function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const user = getCurrentUser() || { name: 'Recruiter Admin', email: 'admin@workspace.com' };

  // Lifted States
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [lastUpdatedCandidate, setLastUpdatedCandidate] = useState(null);
  const [newCandidate, setNewCandidate] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [totalRows, setTotalRows] = useState(10000);

  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    showToast('Logged out successfully.', 'logout');
    navigate('/login');
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Resume', icon: Upload, action: () => { setActiveTab('candidates'); setIsAddModalOpen(true); } },
    { id: 'candidates', label: 'Candidates', icon: Users },
  ];

  return (
    <div className="app-workspace-split">
      {/* Sidebar Navigation */}
      {isSidebarVisible && (
        <aside className="dashboard-sidebar animate-fade-in">
          <div className="sidebar-logo" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users className="sidebar-logo-icon" size={26} />
              <h2>Recruiter Workspace</h2>
            </div>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setIsSidebarVisible(false)}
              title="Hide menu bar"
            >
              <PanelRight animateOnHover size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
          <nav className="sidebar-nav">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div
            className="sidebar-footer-profile-container"
            onMouseEnter={() => setIsProfileDropdownOpen(true)}
            onMouseLeave={() => setIsProfileDropdownOpen(false)}
          >
            {isProfileDropdownOpen && (
              <div className="profile-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => { setActiveTab('profile'); setIsProfileDropdownOpen(false); }}
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => { setActiveTab('settings'); setIsProfileDropdownOpen(false); }}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item logout"
                  onClick={() => { handleLogout(); setIsProfileDropdownOpen(false); }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
            <div
              className="sidebar-profile-trigger"
              onClick={() => setIsProfileDropdownOpen(prev => !prev)}
            >
              <div className="profile-avatar">
                {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User size={18} />}
              </div>
              <div className="profile-details">
                <span className="profile-name">{user.name || 'Recruiter Admin'}</span>
                <span className="profile-email">{user.email || 'admin@workspace.com'}</span>
              </div>
              <ChevronUp size={16} className="profile-chevron" />
            </div>
          </div>
        </aside>
      )}

      {/* Main Panel */}
      <div className="dashboard-main-container" style={{ position: 'relative' }}>
        {!isSidebarVisible && (
          <button
            className="floating-menu-btn"
            onClick={() => setIsSidebarVisible(true)}
            title="Show menu bar"
          >
            <PanelRight animateOnHover size={20} />
          </button>
        )}

        {/* Scrollable Content Body */}
        <main className={`dashboard-content-body ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}>
          {activeTab === 'dashboard' && <MetricsDashboardPage />}

          {activeTab === 'candidates' && (
            <DashboardPage
              selectedCandidateId={selectedCandidateId}
              setSelectedCandidateId={setSelectedCandidateId}
              lastUpdatedCandidate={lastUpdatedCandidate}
              setLastUpdatedCandidate={setLastUpdatedCandidate}
              newCandidate={newCandidate}
              setNewCandidate={setNewCandidate}
              isAddModalOpen={isAddModalOpen}
              setIsAddModalOpen={setIsAddModalOpen}
              totalRows={totalRows}
              setTotalRows={setTotalRows}
            />
          )}

          {activeTab === 'queue' && (
            <div className="tracker-page-container">
              <div className="tracker-page-header">
                <h2>Upload Status Queue</h2>
                <p className="tracker-subtitle">Monitor real-time resume uploads and pipeline processing stages.</p>
              </div>
              <UploadStatusTracker />
            </div>
          )}

          {activeTab === 'search' && (
            <SearchPage
              lastUpdatedCandidate={lastUpdatedCandidate}
              setLastUpdatedCandidate={setLastUpdatedCandidate}
            />
          )}

          {activeTab === 'profile' && <ProfilePage user={user} />}

          {activeTab === 'settings' && <SettingsPage />}

          {activeTab === 'logs' && (
            <div className="mock-section-container">
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel</h2>
              <p className="mock-subtitle">This panel is currently in draft. Real metrics are active under the **Dashboard** and **Candidates** tabs.</p>
              <div className="mock-illustration-card">
                <LayoutDashboard size={48} className="mock-icon" />
                <p>Data orchestration details will populate here in the next sprint.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
