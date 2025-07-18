
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { DOStatus, POStatus } from '../../types';

const WarehouseDashboard: React.FC = () => {
  const { user } = useAuth();
  const { deliveryOrders, purchaseOrders, rejectionReports } = useData();

  if (!user) return null;

  const dosForPreparation = deliveryOrders.filter(d => d.status === DOStatus.CREATED).length;
  const posAwaitingReceipt = purchaseOrders.filter(p => p.status === POStatus.ORDERED || p.status === POStatus.SHIPPED).length;
  const openRejectionReports = rejectionReports.filter(r => r.reconciliationStatus !== 'Resolved').length;


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Warehouse</h1>
      <p className="text-gray-600">Selamat datang, {user.name}! Berikut ringkasan tugas Anda.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">DO Tunggu Penyiapan</h3>
          <p className="text-3xl font-bold text-indigo-500 mt-2">{dosForPreparation}</p>
          <Link to="/warehouse/do-preparation" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Siapkan Barang</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">PO Tunggu Penerimaan</h3>
          <p className="text-3xl font-bold text-teal-500 mt-2">{posAwaitingReceipt}</p>
          <Link to="/warehouse/goods-receipt" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Terima Barang</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">Laporan Penolakan Aktif</h3>
          <p className="text-3xl font-bold text-red-500 mt-2">{openRejectionReports}</p>
          <Link to="/reconciliation/reports" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Lihat Laporan</Link>
        </div>
      </div>

      {/* Placeholder for list of DOs to prepare or POs to receive */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Tugas Mendesak</h2>
        {dosForPreparation > 0 && 
            <p className="text-gray-600 mb-2">Ada <span className="font-bold">{dosForPreparation}</span> Delivery Order menunggu untuk disiapkan.</p>}
        {posAwaitingReceipt > 0 && 
            <p className="text-gray-600">Ada <span className="font-bold">{posAwaitingReceipt}</span> Purchase Order menunggu penerimaan barang dari supplier.</p>}
        {(dosForPreparation === 0 && posAwaitingReceipt === 0) &&
            <p className="text-gray-500">Tidak ada tugas mendesak saat ini.</p>}
      </div>
    </div>
  );
};

export default WarehouseDashboard;
