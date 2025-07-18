
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { ICON_MAP } from '../../constants';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { users, items, projects, suppliers, activityLogs } = useData();

  if (!user) return null;
  
  const Icon = ({ name, className }: { name: string, className?: string }) => {
    // Basic text icon placeholder for admin dashboard
    const iconChar = ICON_MAP[name]?.charAt(0).toUpperCase() || '?';
    return <span className={`text-3xl ${className}`}>{iconChar}</span>;
  };


  const summaryCards = [
    { title: 'Total Pengguna', count: users.length, link: '/admin/users', icon: 'users', color: 'bg-blue-500' },
    { title: 'Total Barang', count: items.length, link: '/admin/items', icon: 'cube', color: 'bg-green-500' },
    { title: 'Total Proyek', count: projects.length, link: '/admin/projects', icon: 'briefcase', color: 'bg-yellow-500' },
    { title: 'Total Supplier', count: suppliers.length, link: '/admin/suppliers', icon: 'building-office-2', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
      <p className="text-gray-600">Selamat datang, {user.name}! Kelola data master dan pantau aktivitas sistem.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map(card => (
          <Link key={card.title} to={card.link} className={`block p-6 rounded-lg shadow text-white hover:opacity-90 transition-opacity ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="text-3xl font-bold mt-1">{card.count}</p>
              </div>
              <Icon name={card.icon} className="opacity-75" />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Aktivitas Sistem Terbaru</h2>
        {activityLogs.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {activityLogs.slice(0, 10).map(log => (
              <li key={log.id} className="py-3">
                <p className="text-sm text-gray-800">{log.action}</p>
                <p className="text-xs text-gray-500">Oleh: {log.userName} ({log.userRole}) pada {new Date(log.timestamp).toLocaleString('id-ID')}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Belum ada aktivitas tercatat.</p>
        )}
        {activityLogs.length > 10 && (
            <Link to="/admin/activity-log" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Lihat Semua Log Aktivitas</Link>
        )}
      </div>

       <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Akses Cepat Manajemen Data</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link to="/admin/users" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-md text-center text-blue-600 font-medium">Manajemen User</Link>
            <Link to="/admin/items" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-md text-center text-blue-600 font-medium">Manajemen Barang</Link>
            <Link to="/admin/projects" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-md text-center text-blue-600 font-medium">Manajemen Proyek</Link>
            <Link to="/admin/suppliers" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-md text-center text-blue-600 font-medium">Manajemen Supplier</Link>
            <Link to="/admin/reports" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-md text-center text-blue-600 font-medium">Laporan Sistem</Link>
        </div>
       </div>
    </div>
  );
};

export default AdminDashboard;
