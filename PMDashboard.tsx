
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { FRBStatus, FormRequestBarang } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import { formatDate, truncateText } from '../../utils/helpers';

const PMDashboard: React.FC = () => {
  const { user } = useAuth();
  const { frbs, getProjectById } = useData();

  if (!user) return null;

  const myFrbs = frbs.filter(frb => frb.pmId === user.id).sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  const recentFrbs = myFrbs.slice(0, 5);

  const frbStatusCounts = myFrbs.reduce((acc, frb) => {
    acc[frb.status] = (acc[frb.status] || 0) + 1;
    return acc;
  }, {} as Record<FRBStatus, number>);

  const frbColumns: Column<FormRequestBarang>[] = [
    { header: 'ID', accessor: (item: FormRequestBarang) => <Link to={`/pm/frb/edit/${item.id}`} className="text-blue-600 hover:underline">{item.id}</Link> },
    { header: 'Proyek', accessor: (item: FormRequestBarang) => getProjectById(item.projectId)?.projectName || 'N/A' },
    { header: 'Tgl. Pengajuan', accessor: (item: FormRequestBarang) => formatDate(item.submissionDate) },
    { 
      header: 'Status', 
      accessor: (item: FormRequestBarang) => item.status, // Can be a simple accessor if render handles display logic
      render: (item: FormRequestBarang) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          item.status === FRBStatus.APPROVED_BY_DIRECTOR ? 'bg-green-100 text-green-700' :
          item.status === FRBStatus.REJECTED_BY_DIRECTOR ? 'bg-red-100 text-red-700' :
          item.status === FRBStatus.COMPLETED ? 'bg-blue-100 text-blue-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>{item.status}</span>
      )
    },
    { header: 'Deadline', accessor: (item: FormRequestBarang) => formatDate(item.deliveryDeadline) },
  ];


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Project Manager</h1>
      <p className="text-gray-600">Selamat datang, {user.name}! Berikut ringkasan aktivitas Anda.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total FRB Diajukan</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{myFrbs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">Menunggu Persetujuan</h3>
          <p className="text-3xl font-bold text-yellow-500 mt-2">{frbStatusCounts[FRBStatus.SUBMITTED] || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">FRB Disetujui</h3>
          <p className="text-3xl font-bold text-green-500 mt-2">{frbStatusCounts[FRBStatus.APPROVED_BY_DIRECTOR] || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700">FRB Ditolak</h3>
          <p className="text-3xl font-bold text-red-500 mt-2">{frbStatusCounts[FRBStatus.REJECTED_BY_DIRECTOR] || 0}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">FRB Terbaru Saya</h2>
            <Link to="/pm/frb" className="text-sm text-blue-600 hover:underline">Lihat Semua</Link>
        </div>
        <DataTable
          columns={frbColumns}
          data={recentFrbs}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => window.location.hash = `/pm/frb/edit/${item.id}`} // Using hash for navigation
          emptyMessage="Belum ada FRB yang Anda ajukan."
        />
      </div>

      <div className="mt-6">
        <Link 
            to="/pm/frb/new"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-150 shadow-md hover:shadow-lg"
        >
            Buat Form Request Barang Baru
        </Link>
      </div>
    </div>
  );
};

export default PMDashboard;
