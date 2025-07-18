
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { DeliveryOrder, DOStatus, GoodsPreparationChecklist, ChecklistItem, ItemConditionStatus, ItemFunctionalityStatus, ChecklistOverallStatus, Item as MasterItem } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import { formatDate, generateId } from '../../utils/helpers';
import Spinner from '../../components/Spinner';
import { Link } from 'react-router-dom';

const WarehouseDOPreparationPage: React.FC = () => {
  const { user } = useAuth();
  const { deliveryOrders, getFRBById, getItemById, addChecklist, updateDO, logActivity, loading: dataLoading, users: allUsers } = useData();
  const { addNotification } = useNotifications();

  const [selectedDO, setSelectedDO] = useState<DeliveryOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<Omit<ChecklistItem, 'id' | 'photoIssue'>[]>([]);
  const [overallStatus, setOverallStatus] = useState<ChecklistOverallStatus>(ChecklistOverallStatus.READY_TO_SHIP);
  const [processing, setProcessing] = useState(false);

  if (!user) return null;

  const dosForPreparation = deliveryOrders
    .filter(d => d.status === DOStatus.CREATED)
    .sort((a,b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());

  const openPreparationModal = (deliveryOrder: DeliveryOrder) => {
    setSelectedDO(deliveryOrder);
    const initialChecklistItems = deliveryOrder.items.map(doItem => ({
      itemId: doItem.itemId,
      preparedQuantity: doItem.deliveredQuantity, // Default to full quantity from DO
      conditionStatus: ItemConditionStatus.GOOD,
      functionalityStatus: ItemFunctionalityStatus.WORKING,
      notes: '',
    }));
    setChecklistItems(initialChecklistItems);
    setOverallStatus(ChecklistOverallStatus.READY_TO_SHIP);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedDO(null);
    setIsModalOpen(false);
  };
  
  const handleChecklistItemChange = (index: number, field: keyof Omit<ChecklistItem, 'id' | 'photoIssue'>, value: string | number) => {
    const newItems = [...checklistItems];
    // @ts-ignore
    newItems[index][field] = value;
    setChecklistItems(newItems);
  };


  const handleSubmitChecklist = async () => {
    if (!selectedDO || !user) return;
    setProcessing(true);

    const finalChecklistItems: ChecklistItem[] = checklistItems.map(item => ({...item, id: generateId()}));

    const checklistData: Omit<GoodsPreparationChecklist, 'id' | 'checkDate'> = {
      doId: selectedDO.id,
      warehouseId: user.id,
      overallStatus,
      items: finalChecklistItems,
    };

    try {
      const newChecklist = await addChecklist(checklistData);
      logActivity(`Warehouse ${user.name} prepared DO ${selectedDO.id} (Checklist: ${newChecklist.id})`, newChecklist.id);
      
      // Update DO status
      await updateDO({ ...selectedDO, status: DOStatus.PREPARED_BY_WAREHOUSE });
      addNotification(`DO ${selectedDO.id} telah disiapkan dan stok diperbarui. Siap untuk pengantaran.`, user.id);
      
      // Notify Purchasing
      const purchasingUsers = allUsers.filter(u => u.role === 'Purchasing');
      purchasingUsers.forEach(purUser => addNotification(`Barang untuk DO ${selectedDO.id} telah disiapkan oleh gudang.`, purUser.id, '#'));


      closeModal();
    } catch (error) {
      console.error("Error submitting checklist:", error);
      addNotification('Gagal menyimpan checklist persiapan. Coba lagi.', user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const doColumns: Column<DeliveryOrder>[] = [
    { header: 'ID DO', accessor: 'id', className: "w-2/12" },
    { header: 'FRB ID', accessor: 'frbId', className: "w-2/12" },
    { header: 'Tgl. Dibuat', accessor: (item: DeliveryOrder) => formatDate(item.creationDate), className: "w-3/12" },
    { header: 'Jml. Item', accessor: (item: DeliveryOrder) => item.items.length, className: "w-2/12 text-center" },
    { 
      header: 'Aksi', 
      accessor: (item: DeliveryOrder) => item.id, // Dummy accessor
      render: (item: DeliveryOrder) => (
        <div className="space-x-2">
            <button onClick={() => openPreparationModal(item)} className={`px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 ${item.status !== DOStatus.CREATED ? 'opacity-50 cursor-not-allowed' : ''}`}
             disabled={item.status !== DOStatus.CREATED}
            >
            Siapkan Barang
            </button>
             <Link to={`/warehouse/ttb/${item.id}`} className={`px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600 ${item.status !== DOStatus.PREPARED_BY_WAREHOUSE ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => { if (item.status !== DOStatus.PREPARED_BY_WAREHOUSE) e.preventDefault(); }}
                aria-disabled={item.status !== DOStatus.PREPARED_BY_WAREHOUSE}
             >
                Buat TTB
            </Link>
        </div>
      ), className: "w-3/12"
    },
  ];
  
  // Show all DOs, but highlight actionable ones or filter. For now, showing only CREATED.
  // We can add a filter later or show all DOs with different action buttons.
  const allDeliveryOrders = deliveryOrders.sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Penyiapan Barang untuk Delivery Order (DO)</h1>
      
      <h2 className="text-xl font-semibold text-gray-700">DO Menunggu Penyiapan</h2>
      <DataTable
        columns={doColumns}
        data={dosForPreparation} // Only show those needing preparation
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Tidak ada DO yang menunggu penyiapan saat ini."
      />

      <h2 className="text-xl font-semibold text-gray-700 mt-8">Semua Delivery Order</h2>
       <DataTable
        columns={doColumns}
        data={allDeliveryOrders}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Belum ada Delivery Order."
      />


      {selectedDO && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={`Checklist Persiapan Barang untuk DO: ${selectedDO.id}`}
          size="xl"
          footer={
            <>
              <button 
                type="button" 
                onClick={closeModal} 
                disabled={processing} 
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleSubmitChecklist} 
                disabled={processing} 
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {processing ? <Spinner size="sm" /> : 'Simpan Checklist & Update Stok'}
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <p className="text-gray-900"><strong>FRB Terkait:</strong> {selectedDO.frbId} (Penerima: {getFRBById(selectedDO.frbId)?.recipientName})</p>
             <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-2 py-2 text-left font-medium text-gray-500">Barang</th>
                            <th className="px-2 py-2 text-center font-medium text-gray-500">Qty Siap</th>
                            <th className="px-2 py-2 text-center font-medium text-gray-500">Kondisi Fisik</th>
                            <th className="px-2 py-2 text-center font-medium text-gray-500">Fungsionalitas</th>
                            <th className="px-2 py-2 text-left font-medium text-gray-500">Catatan Item</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {checklistItems.map((item, index) => {
                            const masterItem = getItemById(item.itemId);
                            const doItemDetail = selectedDO.items.find(di => di.itemId === item.itemId);
                            const inputBaseClasses = "w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
                            return (
                                <tr key={item.itemId}>
                                    <td className="px-2 py-2 whitespace-nowrap text-gray-900">{masterItem?.itemName} <span className="text-xs text-gray-500">(Qty DO: {doItemDetail?.deliveredQuantity})</span></td>
                                    <td className="px-2 py-2">
                                        <input type="number" value={item.preparedQuantity} onChange={e => handleChecklistItemChange(index, 'preparedQuantity', parseInt(e.target.value))} className={`${inputBaseClasses} w-20 text-center`}/>
                                    </td>
                                    <td className="px-2 py-2">
                                        <select value={item.conditionStatus} onChange={e => handleChecklistItemChange(index, 'conditionStatus', e.target.value as ItemConditionStatus)} className={inputBaseClasses}>
                                            {Object.values(ItemConditionStatus).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                     <td className="px-2 py-2">
                                        <select value={item.functionalityStatus} onChange={e => handleChecklistItemChange(index, 'functionalityStatus', e.target.value as ItemFunctionalityStatus)} className={inputBaseClasses}>
                                            {Object.values(ItemFunctionalityStatus).map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-2 py-2">
                                        <input type="text" value={item.notes || ''} onChange={e => handleChecklistItemChange(index, 'notes', e.target.value)} className={inputBaseClasses} placeholder="Catatan..."/>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
             <div className="mt-4">
                <label htmlFor="overallStatus" className="block text-sm font-medium text-gray-700">Status Keseluruhan Persiapan:</label>
                <select
                    id="overallStatus"
                    value={overallStatus}
                    onChange={(e) => setOverallStatus(e.target.value as ChecklistOverallStatus)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-gray-900"
                >
                    {Object.values(ChecklistOverallStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <p className="mt-2 text-xs text-gray-500">Pastikan stok barang telah dikurangi sesuai dengan 'Qty Siap' setelah disimpan.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WarehouseDOPreparationPage;
    