
import React from 'react';
import { useData } from '../../hooks/useData';
import { ActivityLog } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import { formatDate, truncateText } from '../../utils/helpers';

const AdminActivityLogPage: React.FC = () => {
  const { activityLogs, loading: dataLoading } = useData();

  const columns: Column<ActivityLog>[] = [
    { 
      header: 'Timestamp', 
      accessor: (log: ActivityLog) => formatDate(log.timestamp, true), 
      className: "w-2/12" 
    },
    { 
      header: 'Pengguna', 
      accessor: (log: ActivityLog) => `${log.userName} (${log.userRole})`, 
      className: "w-3/12" 
    },
    { 
      header: 'Aksi', 
      accessor: (log: ActivityLog) => truncateText(log.action, 100), 
      className: "w-5/12" 
    },
    { 
      header: 'ID Dok. Terkait', 
      accessor: (log: ActivityLog) => log.relatedDocumentId || '-', 
      className: "w-2/12" 
    },
    // Future column: Details (e.g., view changed data)
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Log Aktivitas Sistem</h1>
      <p className="text-gray-600">Mencatat semua tindakan penting yang dilakukan pengguna dalam sistem.</p>

      <DataTable
        columns={columns}
        data={activityLogs} // DataContext already sorts by newest first
        keyExtractor={(log) => log.id}
        isLoading={dataLoading}
        emptyMessage="Belum ada aktivitas yang tercatat dalam sistem."
      />
    </div>
  );
};

export default AdminActivityLogPage;
