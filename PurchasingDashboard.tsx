
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { FRBStatus, PRStatus, POStatus } from '../../types';

const PurchasingDashboard: React.FC = () => {
  const { user } = useAuth();
  const { frbs, purchaseRequests, purchaseOrders } = useData();

  if (!user) return null;

  const frbsForValidation = frbs.filter(frb => frb.status === FRBStatus.APPROVED_BY_DIRECTOR || frb.status === FRBStatus.IN_PURCHASING_VALIDATION).length;
  const prsAwaitingDirectorApproval = purchaseRequests.filter(pr => pr.status === PRStatus.AWAITING_DIRECTOR_APPROVAL).length;
  const posOrdered = purchaseOrders.filter(po => po.status === POStatus.ORDERED || po.status === POStatus.SHIPPED).length;
  const posFullyReceived = purchaseOrders.filter(po => po.status === POStatus.FULLY_RECEIVED).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Purchasing</h1>
      <p className="text-gray-600">Selamat datang, {user.name}! Berikut ringkasan tugas Anda.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">FRB Validasi</h3>
          <p className="text-3xl font-bold text-yellow-500 mt-2">{frbsForValidation}</p>
          <Link to="/purchasing/frb-validation" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Proses</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">PR Tunggu Direktur</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">{prsAwaitingDirectorApproval}</p>
           {/* No direct link for Purchasing here, this is for Director's action */}
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">PO Aktif</h3>
          <p className="text-3xl font-bold text-blue-500 mt-2">{posOrdered}</p>
          <Link to="/purchasing/po-management" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Manajemen PO</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">PO Selesai Diterima</h3>
          <p className="text-3xl font-bold text-green-500 mt-2">{posFullyReceived}</p>
           <Link to="/purchasing/po-management" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Lihat PO</Link>
        </div>
      </div>

      {/* Placeholder for recent notifications or tasks */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Notifikasi Terbaru</h2>
        <p className="text-gray-500">Fitur notifikasi akan menampilkan pemberitahuan penting di sini. (Contoh: Barang diterima dari supplier, penolakan barang oleh penerima).</p>
        {/* Actual notification list would go here */}
      </div>
    </div>
  );
};

export default PurchasingDashboard;
