
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { FormRequestBarang, FRBStatus } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import { formatDate, truncateText } from '../../utils/helpers';

const FRBListPage: React.FC = () => {
  const { user } = useAuth();
  const { frbs, getProjectById, loading: dataLoading } = useData();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<FRBStatus | ''>('');

  if (!user) {
    // This should ideally be handled by ProtectedRoute, but good for safety
    navigate('/login');
    return null; 
  }

  const myFrbs = frbs
    .filter(frb => frb.pmId === user.id && (filterStatus ? frb.status === filterStatus : true))
    .sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const columns: Column<FormRequestBarang>[] = [ 
    { header: 'ID FRB', accessor: (item: FormRequestBarang) => <Link to={`/pm/frb/edit/${item.id}`} className="text-blue-600 hover:underline">{item.id}</Link>, className: "w-1/12" },
    { header: 'Proyek', accessor: (item: FormRequestBarang) => truncateText(getProjectById(item.projectId)?.projectName, 20) || 'N/A', className: "w-2/12" },
    { header: 'Tgl. Pengajuan', accessor: (item: FormRequestBarang) => formatDate(item.submissionDate), className: "w-2/12" },
    { header: 'Deadline Pengiriman', accessor: (item: FormRequestBarang) => formatDate(item.deliveryDeadline), className: "w-2/12" },
    { header: 'Penerima', accessor: (item: FormRequestBarang) => truncateText(item.recipientName, 15), className: "w-2/12" },
    { 
      header: 'Status', 
      accessor: (item: FormRequestBarang) => item.status, 
      className: "w-2/12", 
      render: (item: FormRequestBarang) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        item.status === FRBStatus.APPROVED_BY_DIRECTOR ? 'bg-green-100 text-green-700' :
        item.status === FRBStatus.REJECTED_BY_DIRECTOR ? 'bg-red-100 text-red-700' :
        item.status === FRBStatus.COMPLETED ? 'bg-blue-100 text-blue-700' :
        item.status === FRBStatus.SUBMITTED || item.status === FRBStatus.AWAITING_DIRECTOR_APPROVAL ? 'bg-yellow-100 text-yellow-700' :
        'bg-gray-100 text-gray-700' // Default for other statuses
      }`}>{item.status}</span>
    )},
    { header: 'Aksi', render: (item: FormRequestBarang) => (
      <button 
        onClick={() => navigate(`/pm/frb/edit/${item.id}`)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        Lihat Detail
      </button>
    ), className: "w-1/12",
    accessor: (item: FormRequestBarang) => item.id // Dummy accessor for render-only column
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Daftar Form Request Barang Saya</h1>
        <Link 
          to="/pm/frb/new" 
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow"
        >
          Buat FRB Baru
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Filter berdasarkan Status:</label>
        <select
          id="statusFilter"
          name="statusFilter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FRBStatus | '')}
          className="mt-1 block w-full md:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="">Semua Status</option>
          {Object.values(FRBStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={myFrbs}
        keyExtractor={(item) => item.id}
        onRowClick={(item) => navigate(`/pm/frb/edit/${item.id}`)}
        isLoading={dataLoading}
        emptyMessage="Anda belum mengajukan FRB, atau tidak ada FRB yang cocok dengan filter saat ini."
      />
    </div>
  );
};

export default FRBListPage;
