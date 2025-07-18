
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

import PMDashboard from './dashboards/PMDashboard';
import DirekturDashboard from './dashboards/DirekturDashboard';
import PurchasingDashboard from './dashboards/PurchasingDashboard';
import WarehouseDashboard from './dashboards/WarehouseDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <p>Loading user data...</p>; // Or redirect to login
  }

  switch (user.role) {
    case UserRole.PROJECT_MANAGER:
      return <PMDashboard />;
    case UserRole.DIREKTUR:
      return <DirekturDashboard />;
    case UserRole.PURCHASING:
      return <PurchasingDashboard />;
    case UserRole.WAREHOUSE:
      return <WarehouseDashboard />;
    case UserRole.ADMIN:
      return <AdminDashboard />;
    default:
      return <p>Unknown user role. Access denied.</p>;
  }
};

export default DashboardPage;
