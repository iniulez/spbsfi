
import React from 'react';
import { useData } from '../../hooks/useData';
import { FRBStatus } from '../../types'; // For potential filtering

const AdminReportsPage: React.FC = () => {
  const { frbs, purchaseRequests, purchaseOrders, deliveryOrders, items } = useData();

  // Example data for reports
  const totalFrbs = frbs.length;
  const frbsCompleted = frbs.filter(f => f.status === FRBStatus.COMPLETED).length;
  const totalPrs = purchaseRequests.length;
  const totalPos = purchaseOrders.length;
  const totalDos = deliveryOrders.length;
  const lowStockItems = items.filter(i => i.currentStock < 5).length; // Example: stock < 5 is low

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Laporan Sistem</h1>
      <p className="text-gray-600">Halaman ini akan menampilkan berbagai analitik dan ringkasan data penting dari sistem pengadaan barang.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-blue-700">Form Request Barang (FRB)</h2>
          <p className="mt-2">Total FRB Dibuat: <span className="font-bold">{totalFrbs}</span></p>
          <p>FRB Selesai (Completed): <span className="font-bold">{frbsCompleted}</span></p>
          {/* Add more FRB stats here: e.g., by status, by project */}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-700">Purchase Request (PR) & Order (PO)</h2>
          <p className="mt-2">Total PR Dibuat: <span className="font-bold">{totalPrs}</span></p>
          <p>Total PO Dibuat: <span className="font-bold">{totalPos}</span></p>
          {/* Add more PR/PO stats: e.g., average approval time, total spending */}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-indigo-700">Delivery Order (DO)</h2>
          <p className="mt-2">Total DO Dibuat: <span className="font-bold">{totalDos}</span></p>
          {/* Add more DO stats: e.g., on-time delivery rate */}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-yellow-700">Manajemen Stok</h2>
          <p className="mt-2">Total Jenis Barang: <span className="font-bold">{items.length}</span></p>
          <p>Barang dengan Stok Rendah (&lt;5): <span className="font-bold text-red-600">{lowStockItems}</span></p>
          {/* Add more stock stats: e.g., total stock value */}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-md">
        <p className="text-sm text-gray-500 text-center">
          Fitur laporan ini akan dikembangkan lebih lanjut dengan grafik, filter, dan kemampuan ekspor data.
        </p>
      </div>
    </div>
  );
};

export default AdminReportsPage;
