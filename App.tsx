
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout';
import NotFoundPage from './pages/NotFoundPage';

// PM Pages
import FRBListPage from './pages/pm/FRBListPage';
import FRBFormPage from './pages/pm/FRBFormPage';
import PMProjectManagementPage from './pages/pm/PMProjectManagementPage';
import PMAddItemPage from './pages/pm/PMAddItemPage';


// Director Pages
import DirectorFRBApprovalListPage from './pages/director/DirectorFRBApprovalListPage';
import DirectorPRApprovalListPage from './pages/director/DirectorPRApprovalListPage';

// Purchasing Pages
import PurchasingFRBValidationListPage from './pages/purchasing/PurchasingFRBValidationListPage';
import PurchasingPRManagementPage from './pages/purchasing/PurchasingPRManagementPage';
import PurchasingPOPage from './pages/purchasing/PurchasingPOPage';


// Warehouse Pages
import WarehouseGoodsReceiptPage from './pages/warehouse/WarehouseGoodsReceiptPage';
import WarehouseDOPreparationPage from './pages/warehouse/WarehouseDOPreparationPage';
import WarehouseTTBPage from './pages/warehouse/WarehouseTTBPage';
import WarehouseAddItemPage from './pages/warehouse/WarehouseAddItemPage';
import WarehouseStockManagementPage from './pages/warehouse/WarehouseStockManagementPage';


// Admin Pages
import AdminUserManagementPage from './pages/admin/AdminUserManagementPage';
import AdminItemManagementPage from './pages/admin/AdminItemManagementPage';
import AdminProjectManagementPage from './pages/admin/AdminProjectManagementPage';
import AdminSupplierManagementPage from './pages/admin/AdminSupplierManagementPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminActivityLogPage from './pages/admin/AdminActivityLogPage';

// Reconciliation Pages
import ReconciliationReportListPage from './pages/reconciliation/ReconciliationReportListPage';


const ProtectedRoute: React.FC<{ allowedRoles?: string[] }> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // Or a specific "Unauthorized" page
  }

  return <Layout><Outlet /></Layout>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Project Manager', 'Admin']} />}>
        <Route path="/pm/frb" element={<FRBListPage />} />
        <Route path="/pm/frb/new" element={<FRBFormPage />} />
        <Route path="/pm/frb/edit/:id" element={<FRBFormPage />} />
        <Route path="/pm/projects" element={<PMProjectManagementPage />} />
        <Route path="/pm/add-item" element={<PMAddItemPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Direktur', 'Admin']} />}>
        <Route path="/director/frb-approval" element={<DirectorFRBApprovalListPage />} />
        <Route path="/director/pr-approval" element={<DirectorPRApprovalListPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Purchasing', 'Admin']} />}>
        <Route path="/purchasing/frb-validation" element={<PurchasingFRBValidationListPage />} />
        <Route path="/purchasing/pr-management" element={<PurchasingPRManagementPage />} />
        <Route path="/purchasing/po-management" element={<PurchasingPOPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Warehouse', 'Admin']} />}>
        <Route path="/warehouse/goods-receipt" element={<WarehouseGoodsReceiptPage />} />
        <Route path="/warehouse/do-preparation" element={<WarehouseDOPreparationPage />} />
        <Route path="/warehouse/ttb/:doId" element={<WarehouseTTBPage />} />
        <Route path="/warehouse/add-item" element={<WarehouseAddItemPage />} />
        <Route path="/warehouse/stock-management" element={<WarehouseStockManagementPage />} />
      </Route>
      
      <Route element={<ProtectedRoute allowedRoles={['Project Manager', 'Purchasing', 'Warehouse', 'Admin']} />}>
        <Route path="/reconciliation/reports" element={<ReconciliationReportListPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
        <Route path="/admin/users" element={<AdminUserManagementPage />} />
        <Route path="/admin/items" element={<AdminItemManagementPage />} />
        <Route path="/admin/projects" element={<AdminProjectManagementPage />} />
        <Route path="/admin/suppliers" element={<AdminSupplierManagementPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/activity-log" element={<AdminActivityLogPage />} />
      </Route>
      
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;