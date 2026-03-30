import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Navbar           from "./components/Navbar.jsx";
import LoginPage        from "./pages/LoginPage.jsx";
import RegisterPage     from "./pages/RegisterPage.jsx";
import Dashboard        from "./pages/Dashboard.jsx";
import CreateRide       from "./pages/CreateRide.jsx";
import SearchRides      from "./pages/SearchRides.jsx";
import RideDetail       from "./pages/RideDetail.jsx";
import MyBookings       from "./pages/MyBookings.jsx";
import ProviderBookings from "./pages/ProviderBookings.jsx";
import KYCPage          from "./pages/KYCPage.jsx";
import AdminDashboard   from "./pages/AdminDashboard.jsx";
import RatingsPage      from "./pages/RatingsPage.jsx";
import LiveTracking     from "./pages/LiveTracking.jsx";
import CommunityPage    from "./pages/CommunityPage.jsx";
import RouteAlerts      from "./pages/RouteAlerts.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import IncidentReport   from "./pages/IncidentReport.jsx";
import AdminSettings    from "./pages/AdminSettings.jsx";

const PUBLIC_PAGES = ["login", "register"];

// Pages accessible by regular users
const USER_PAGE_MAP = {
  dashboard:           Dashboard,
  "create-ride":       CreateRide,
  "search-rides":      SearchRides,
  "ride-detail":       RideDetail,
  "my-bookings":       MyBookings,
  "provider-bookings": ProviderBookings,
  "kyc":               KYCPage,
  "ratings":           RatingsPage,
  "live-tracking":     LiveTracking,
  "community":         CommunityPage,
  "route-alerts":      RouteAlerts,
  "notifications":     NotificationsPage,
  "incident-report":   IncidentReport,
};

// Pages accessible by admin
const ADMIN_PAGE_MAP = {
  admin:             AdminDashboard,
  "incident-report": IncidentReport,
  "admin-settings":  AdminSettings,
};

function Router() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [page,      setPage]      = useState(() => {
    if (!user) return 'login';
    return isAdmin ? 'admin' : 'dashboard';
  });
  const [pageProps, setPageProps] = useState({});

  const navigate = (to, props = {}) => {
    // Admin: only allow admin pages
    if (isAdmin) {
      if (to === 'kyc') {
        setPage('admin'); setPageProps({ defaultTab: 'KYC Review' });
        window.scrollTo({ top: 0, behavior: 'smooth' }); return;
      }
      if (!ADMIN_PAGE_MAP[to]) {
        // Redirect any non-admin page to admin dashboard
        setPage('admin'); setPageProps({});
        window.scrollTo({ top: 0, behavior: 'smooth' }); return;
      }
    }
    setPage(to); setPageProps(props);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isPublic = PUBLIC_PAGES.includes(page);

  if (!user && !isPublic) return <LoginPage navigate={navigate} />;

  if (user && isPublic) {
    const startPage  = isAdmin ? 'admin' : 'dashboard';
    const StartComp  = isAdmin ? AdminDashboard : Dashboard;
    return (
      <>
        <Navbar navigate={navigate} currentPage={startPage} />
        <main className="with-nav"><StartComp navigate={navigate} /></main>
      </>
    );
  }

  // Choose component
  let PageComponent;
  if (page === 'login')    PageComponent = LoginPage;
  else if (page === 'register') PageComponent = RegisterPage;
  else if (isAdmin)        PageComponent = ADMIN_PAGE_MAP[page]    || AdminDashboard;
  else                     PageComponent = USER_PAGE_MAP[page]     || Dashboard;

  const showNav = !isPublic;

  return (
    <div className="app-shell">
      {showNav && <Navbar navigate={navigate} currentPage={page} />}
      <main className={showNav ? "with-nav" : ""}>
        <PageComponent navigate={navigate} {...pageProps} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
