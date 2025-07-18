
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { FRBStatus, PRStatus, FormRequestBarang, PurchaseRequest } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import { formatDate } from '../../utils/helpers';

const DirekturDashboard: React.FC = () => {
  const { user } = useAuth();
  const { frbs, purchaseRequests, getProjectById, getUserById } = useData();

  if (!user) return null;

  const frbsAwaitingApproval = frbs.filter(frb => frb.status === FRBStatus.SUBMITTED)
                                 .sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  const prsAwaitingApproval = purchaseRequests.filter(pr => pr.status === PRStatus.AWAITING_DIRECTOR_APPROVAL)
                                 .sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  
  const frbColumns: Column<FormRequestBarang>[] = [
    { header: 'ID FRB', accessor: (item: FormRequestBarang) => <Link to={`/director/frb-approval#${item.id}`} className="text-blue-600 hover:underline">{item.id}</Link> }, // Simplified navigation
    { header: 'Proyek', accessor: (item: FormRequestBarang) => getProjectById(item.projectId)?.projectName || 'N/A' },
    { header: 'Diajukan Oleh', accessor: (item: FormRequestBarang) => getUserById(item.pmId)?.name || 'N/A' },
    { header: 'Tgl. Pengajuan', accessor: (item: FormRequestBarang) => formatDate(item.submissionDate) },
    { header: 'Total Estimasi', accessor: (item: FormRequestBarang) => `Rp ${item.items.reduce((sum, i) => sum + i.requestedQuantity * i.estimatedUnitPrice, 0).toLocaleString('id-ID')}`},
  ];

  const prColumns: Column<PurchaseRequest>[] = [
    { header: 'ID PR', accessor: (item: PurchaseRequest) => <Link to={`/director/pr-approval#${item.id}`} className="text-blue-600 hover:underline">{item.id}</Link> },
    { header: 'FRB Terkait', accessor: (item: PurchaseRequest) => item.frbId || 'N/A' },
    { header: 'Diajukan Oleh', accessor: (item: PurchaseRequest) => getUserById(item.purchasingId)?.name || 'N/A' },
    { header: 'Tgl. Permintaan', accessor: (item: PurchaseRequest) => formatDate(item.requestDate) },
    { header: 'Jml. Item', accessor: (item: PurchaseRequest) => item.items.length },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Direktur</h1>
      <p className="text-gray-600">Selamat datang, {user.name}. Berikut daftar permintaan yang menunggu persetujuan Anda.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">FRB Menunggu Persetujuan</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">{frbsAwaitingApproval.length}</p>
          <Link to="/director/frb-approval" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Lihat Detail</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">PR Menunggu Persetujuan</h3>
          <p className="text-3xl font-bold text-purple-500 mt-2">{prsAwaitingApproval.length}</p>
          <Link to="/director/pr-approval" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Lihat Detail</Link>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">FRB Menunggu Persetujuan ({frbsAwaitingApproval.length})</h2>
        <DataTable
          columns={frbColumns}
          data={frbsAwaitingApproval.slice(0,5)} // Show top 5
          keyExtractor={(item) => item.id}
          emptyMessage="Tidak ada FRB yang menunggu persetujuan."
        />
        {frbsAwaitingApproval.length > 5 && <Link to="/director/frb-approval" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Lihat Semua FRB</Link>}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">PR Menunggu Persetujuan ({prsAwaitingApproval.length})</h2>
        <DataTable
          columns={prColumns}
          data={prsAwaitingApproval.slice(0,5)} // Show top 5
          keyExtractor={(item) => item.id}
          emptyMessage="Tidak ada PR yang menunggu persetujuan."
        />
         {prsAwaitingApproval.length > 5 && <Link to="/director/pr-approval" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Lihat Semua PR</Link>}
      </div>
    </div>
  );
};

export default DirekturDashboard;
