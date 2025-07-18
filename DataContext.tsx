import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import {
  User, UserRole, Project, Item, Supplier, FormRequestBarang, FRBItem, FRBStatus,
  PurchaseRequest, PRItem, PRStatus, PurchaseOrder, POStatus, DeliveryOrder, DOItem, DOStatus,
  GoodsReceipt, GRNItem, GoodsPreparationChecklist, TandaTerimaBarang, RejectionReport, ActivityLog,
} from '../types';
import { useAuth } from '../hooks/useAuth'; 
import { useNotifications } from '../hooks/useNotifications';
import { db, auth, storage } from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, 
  query, orderBy, limit 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';


// --- CONTEXT DEFINITION ---
interface DataContextType {
  // Data states
  users: User[];
  projects: Project[];
  items: Item[];
  suppliers: Supplier[];
  frbs: FormRequestBarang[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  deliveryOrders: DeliveryOrder[];
  goodsReceipts: GoodsReceipt[];
  checklists: GoodsPreparationChecklist[];
  ttbs: TandaTerimaBarang[];
  rejectionReports: RejectionReport[];
  activityLogs: ActivityLog[];
  loading: boolean;

  // CRUD Functions
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  getUserById: (userId: string) => User | undefined;

  addProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  updateProject: (project: Project) => Promise<Project>;
  getProjectById: (projectId: string) => Project | undefined;
  
  addItem: (item: Omit<Item, 'id'>) => Promise<Item>;
  updateItem: (item: Item) => Promise<Item>;
  getItemById: (itemId: string) => Item | undefined;
  updateItemStock: (itemId: string, quantityChange: number, operation: 'add' | 'subtract') => Promise<boolean>;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (supplier: Supplier) => Promise<Supplier>;
  getSupplierById: (supplierId: string) => Supplier | undefined;

  addFRB: (frbData: Omit<FormRequestBarang, 'id' | 'submissionDate' | 'status' | 'items' | 'deliveryDeadline'> & { items: Omit<FRBItem, 'id'>[], deliveryDeadline: string }, isDraft?: boolean) => Promise<FormRequestBarang>;
  updateFRB: (frb: FormRequestBarang) => Promise<FormRequestBarang>;
  getFRBById: (frbId: string) => FormRequestBarang | undefined;
  approveFRBByDirector: (frbId: string, directorId: string) => Promise<void>;
  rejectFRBByDirector: (frbId: string, directorId: string, reason: string) => Promise<void>;
  
  addPR: (prData: Omit<PurchaseRequest, 'id' | 'requestDate' | 'status'>) => Promise<PurchaseRequest>;
  updatePR: (pr: PurchaseRequest) => Promise<PurchaseRequest>;
  getPRById: (prId: string) => PurchaseRequest | undefined;
  approvePRByDirector: (prId: string, directorId: string) => Promise<void>;
  rejectPRByDirector: (prId: string, directorId: string, reason: string) => Promise<void>;
  
  addPO: (poData: Omit<PurchaseOrder, 'id' | 'orderDate' | 'status' | 'expectedDeliveryDate'> & { expectedDeliveryDate: string }) => Promise<PurchaseOrder>;
  updatePO: (po: PurchaseOrder) => Promise<PurchaseOrder>;
  getPOById: (poId: string) => PurchaseOrder | undefined;
  
  addDO: (doData: Omit<DeliveryOrder, 'id' | 'creationDate' | 'status'>) => Promise<DeliveryOrder>;
  updateDO: (deliveryOrder: DeliveryOrder) => Promise<DeliveryOrder>;
  getDOById: (doId: string) => DeliveryOrder | undefined;

  addGRN: (grnData: Omit<GoodsReceipt, 'id' | 'receiptDate'>) => Promise<GoodsReceipt>;
  addChecklist: (checklistData: Omit<GoodsPreparationChecklist, 'id' | 'checkDate'>) => Promise<GoodsPreparationChecklist>;
  
  addTTB: (ttbData: Omit<TandaTerimaBarang, 'id' | 'acceptanceDate'>) => Promise<TandaTerimaBarang>;
  getTTBById: (ttbId: string) => TandaTerimaBarang | undefined;

  addRejectionReport: (reportData: Omit<RejectionReport, 'id' | 'reportingDate' | 'reconciliationStatus'>) => Promise<RejectionReport>;
  updateRejectionReport: (report: RejectionReport) => Promise<RejectionReport>;

  logActivity: (action: string, relatedDocumentId?: string, details?: Record<string, any>) => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

// Generic function to create a Firestore listener
const createCollectionListener = <T,>(collectionName: string, setState: React.Dispatch<React.SetStateAction<T[]>>, orderField: string = 'timestamp', orderDir: 'desc' | 'asc' = 'desc') => {
  const q = query(collection(db, collectionName), orderBy(orderField, orderDir));
  return onSnapshot(q, (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    setState(data);
  }, (error) => {
    console.error(`Error fetching ${collectionName}: `, error);
  });
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const { addNotification } = useNotifications();

  // --- STATES FOR EACH ENTITY ---
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [frbs, setFrbs] = useState<FormRequestBarang[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [checklists, setChecklists] = useState<GoodsPreparationChecklist[]>([]);
  const [ttbs, setTtbs] = useState<TandaTerimaBarang[]>([]);
  const [rejectionReports, setRejectionReports] = useState<RejectionReport[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- FIRESTORE REAL-TIME LISTENERS ---
  useEffect(() => {
    setLoading(true);
    const listeners = [
      createCollectionListener<User>('users', setUsers, 'name', 'asc'),
      createCollectionListener<Project>('projects', setProjects, 'projectName', 'asc'),
      createCollectionListener<Item>('items', setItems, 'itemName', 'asc'),
      createCollectionListener<Supplier>('suppliers', setSuppliers, 'supplierName', 'asc'),
      createCollectionListener<FormRequestBarang>('frbs', setFrbs, 'submissionDate', 'desc'),
      createCollectionListener<PurchaseRequest>('purchaseRequests', setPurchaseRequests, 'requestDate', 'desc'),
      createCollectionListener<PurchaseOrder>('purchaseOrders', setPurchaseOrders, 'orderDate', 'desc'),
      createCollectionListener<DeliveryOrder>('deliveryOrders', setDeliveryOrders, 'creationDate', 'desc'),
      createCollectionListener<GoodsReceipt>('goodsReceipts', setGoodsReceipts, 'receiptDate', 'desc'),
      createCollectionListener<GoodsPreparationChecklist>('checklists', setChecklists, 'checkDate', 'desc'),
      createCollectionListener<TandaTerimaBarang>('ttbs', setTtbs, 'acceptanceDate', 'desc'),
      createCollectionListener<RejectionReport>('rejectionReports', setRejectionReports, 'reportingDate', 'desc'),
      onSnapshot(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(200)), (snapshot) => {
         setActivityLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));
      }),
    ];
    setLoading(false);
    // Unsubscribe from all listeners on cleanup
    return () => listeners.forEach(unsubscribe => unsubscribe());
  }, []);

  // --- ACTIVITY LOG ---
  const logActivity = useCallback(async (action: string, relatedDocumentId?: string, details?: Record<string, any>) => {
    if (!currentUser) return;
    const logEntry = {
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      timestamp: Timestamp.now(),
      relatedDocumentId,
      details
    };
    await addDoc(collection(db, 'activityLogs'), logEntry);
  }, [currentUser]);

  // --- CRUD FUNCTIONS ---
  // Users
  const addUser = async (userData: Omit<User, 'id'>) => {
    if (!userData.password) throw new Error("Password is required to create a user.");
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const { uid } = userCredential.user;
    const userProfile = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
    };
    await addDoc(collection(db, 'users'), { id: uid, ...userProfile });
    await logActivity(`Admin created new user: ${userData.name} (${userData.role})`, uid);
  };
  const updateUser = async (updatedUser: User) => {
    const userRef = doc(db, 'users', updatedUser.id);
    await updateDoc(userRef, { ...updatedUser });
    logActivity(`Admin updated user: ${updatedUser.name}`, updatedUser.id);
    return updatedUser;
  };
  const deleteUser = async (userId: string) => {
    // IMPORTANT: This only deletes the user from Firestore, not from Firebase Auth.
    // Deleting from Auth requires admin privileges, typically via a Cloud Function.
    const userToDelete = users.find(u => u.id === userId);
    await deleteDoc(doc(db, 'users', userId));
    if (userToDelete) {
        logActivity(`Admin deleted user profile: ${userToDelete.name}`, userId);
    }
  };
  const getUserById = (userId: string) => users.find(u => u.id === userId);

  // Projects
  const addProject = async (projectData: Omit<Project, 'id'>) => {
    const docRef = await addDoc(collection(db, 'projects'), projectData);
    logActivity(`Created new project: ${projectData.projectName}`, docRef.id);
    return { id: docRef.id, ...projectData };
  };
  const updateProject = async (updatedProject: Project) => {
    const projectRef = doc(db, 'projects', updatedProject.id);
    await updateDoc(projectRef, { ...updatedProject });
    logActivity(`Updated project: ${updatedProject.projectName}`, updatedProject.id);
    return updatedProject;
  };
  const getProjectById = (projectId: string) => projects.find(p => p.id === projectId);

  // Items
  const addItem = async (itemData: Omit<Item, 'id'>) => {
    const docRef = await addDoc(collection(db, 'items'), itemData);
    logActivity(`Created new item: ${itemData.itemName}`, docRef.id);
    return { id: docRef.id, ...itemData };
  };
  const updateItem = async (updatedItem: Item) => {
    const itemRef = doc(db, 'items', updatedItem.id);
    await updateDoc(itemRef, { ...updatedItem });
    logActivity(`Updated item: ${updatedItem.itemName}`, updatedItem.id);
    return updatedItem;
  };
  const updateItemStock = async (itemId: string, quantityChange: number, operation: 'add' | 'subtract') => {
    const item = items.find(i => i.id === itemId);
    if (!item) return false;
    const newStock = operation === 'add' ? item.currentStock + quantityChange : item.currentStock - quantityChange;
    if (newStock < 0) return false;
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, { currentStock: newStock });
    logActivity(`Stock updated for item ${item.itemName}: ${operation === 'add' ? '+' : '-'}${quantityChange}. New stock: ${newStock}`);
    return true;
  };
  const getItemById = (itemId: string) => items.find(i => i.id === itemId);

  // Suppliers
  const addSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
    const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
    logActivity(`Created new supplier: ${supplierData.supplierName}`, docRef.id);
    return { id: docRef.id, ...supplierData };
  };
  const updateSupplier = async (updatedSupplier: Supplier) => {
    const supplierRef = doc(db, 'suppliers', updatedSupplier.id);
    await updateDoc(supplierRef, { ...updatedSupplier });
    logActivity(`Updated supplier: ${updatedSupplier.supplierName}`, updatedSupplier.id);
    return updatedSupplier;
  };
  const getSupplierById = (supplierId: string) => suppliers.find(s => s.id === supplierId);
  
  // FRB
  const addFRB = async (frbData, isDraft = false) => {
    const docData = {
      ...frbData,
      submissionDate: Timestamp.now(),
      deliveryDeadline: Timestamp.fromDate(new Date(frbData.deliveryDeadline)),
      status: isDraft ? FRBStatus.DRAFT : FRBStatus.AWAITING_DIRECTOR_APPROVAL,
    };
    const docRef = await addDoc(collection(db, 'frbs'), docData);
    logActivity(`PM submitted new FRB, Status: ${docData.status}`, docRef.id);
    if (!isDraft) {
        const directors = users.filter(u => u.role === UserRole.DIREKTUR);
        directors.forEach(dir => addNotification(`New FRB requires approval.`, dir.id, `/director/frb-approval`));
    }
    return { id: docRef.id, ...docData };
  };
  const updateFRB = async (updatedFRB: FormRequestBarang) => {
    const frbRef = doc(db, 'frbs', updatedFRB.id);
    await updateDoc(frbRef, { ...updatedFRB });
    logActivity(`FRB updated: ${updatedFRB.id}, Status: ${updatedFRB.status}`, updatedFRB.id);
    return updatedFRB;
  };
  const getFRBById = (frbId: string) => frbs.find(f => f.id === frbId);
  const approveFRBByDirector = async (frbId: string, directorId: string) => {
    const frbRef = doc(db, 'frbs', frbId);
    await updateDoc(frbRef, {
      status: FRBStatus.APPROVED_BY_DIRECTOR,
      directorApprovalDate: Timestamp.now(),
    });
    const frb = frbs.find(f => f.id === frbId);
    if (frb) {
      addNotification(`Your FRB ${frbId} has been approved.`, frb.pmId, `/pm/frb/edit/${frbId}`);
      const purchasingUsers = users.filter(u => u.role === UserRole.PURCHASING);
      purchasingUsers.forEach(pUser => {
        addNotification(`FRB ${frbId} approved, ready for validation.`, pUser.id, `/purchasing/frb-validation`);
      });
    }
  };
  const rejectFRBByDirector = async (frbId: string, directorId: string, reason: string) => {
    const frbRef = doc(db, 'frbs', frbId);
    await updateDoc(frbRef, {
      status: FRBStatus.REJECTED_BY_DIRECTOR,
      directorRejectionReason: reason,
      directorApprovalDate: Timestamp.now(),
    });
    const frb = frbs.find(f => f.id === frbId);
    if (frb) {
      addNotification(`Your FRB ${frbId} was rejected. Reason: ${reason}`, frb.pmId, `/pm/frb/edit/${frbId}`);
    }
  };

  // PR
  const addPR = async (prData) => {
    const docData = {
      ...prData,
      requestDate: Timestamp.now(),
      status: PRStatus.AWAITING_DIRECTOR_APPROVAL,
    };
    const docRef = await addDoc(collection(db, 'purchaseRequests'), docData);
    logActivity(`Purchasing created new PR (from FRB: ${prData.frbId || 'N/A'})`, docRef.id);
    const directors = users.filter(u => u.role === UserRole.DIREKTUR);
    directors.forEach(dir => addNotification(`New PR requires approval.`, dir.id, `/director/pr-approval`));
    return { id: docRef.id, ...docData };
  };
  const updatePR = async (updatedPR) => {
    const prRef = doc(db, 'purchaseRequests', updatedPR.id);
    await updateDoc(prRef, { ...updatedPR });
    logActivity(`PR updated: ${updatedPR.id}, Status: ${updatedPR.status}`, updatedPR.id);
    return updatedPR;
  };
  const getPRById = (prId: string) => purchaseRequests.find(p => p.id === prId);
  const approvePRByDirector = async (prId: string, directorId: string) => {
    const prRef = doc(db, 'purchaseRequests', prId);
    await updateDoc(prRef, {
      status: PRStatus.APPROVED,
      directorApprovalDate: Timestamp.now(),
    });
    const pr = purchaseRequests.find(p => p.id === prId);
    if (pr) {
      addNotification(`Your PR ${prId} has been approved.`, pr.purchasingId, `/purchasing/pr-management`);
    }
  };
  const rejectPRByDirector = async (prId: string, directorId: string, reason: string) => {
    const prRef = doc(db, 'purchaseRequests', prId);
    await updateDoc(prRef, {
      status: PRStatus.REJECTED,
      directorRejectionReason: reason,
      directorApprovalDate: Timestamp.now(),
    });
    const pr = purchaseRequests.find(p => p.id === prId);
    if (pr) {
      addNotification(`Your PR ${prId} was rejected. Reason: ${reason}`, pr.purchasingId, `/purchasing/pr-management`);
    }
  };


  // PO
  const addPO = async (poData) => {
    const docData = {
      ...poData,
      orderDate: Timestamp.now(),
      expectedDeliveryDate: Timestamp.fromDate(new Date(poData.expectedDeliveryDate)),
      status: POStatus.ORDERED,
    };
    const docRef = await addDoc(collection(db, 'purchaseOrders'), docData);
    const pr = purchaseRequests.find(p => p.id === docData.prId);
    if (pr) await updatePR({ ...pr, status: PRStatus.PROCESSED });
    logActivity(`Purchasing created new PO (from PR: ${docData.prId})`, docRef.id);
    return { id: docRef.id, ...docData };
  };
  const updatePO = async (updatedPO) => {
    const poRef = doc(db, 'purchaseOrders', updatedPO.id);
    await updateDoc(poRef, { ...updatedPO });
    logActivity(`PO updated: ${updatedPO.id}, Status: ${updatedPO.status}`, updatedPO.id);
    return updatedPO;
  };
  const getPOById = (poId: string) => purchaseOrders.find(p => p.id === poId);

  // DO
  const addDO = async (doData) => {
    const docData = {
      ...doData,
      creationDate: Timestamp.now(),
      status: DOStatus.CREATED,
    };
    const docRef = await addDoc(collection(db, 'deliveryOrders'), docData);
    // ... rest of notification and FRB status update logic
    return { id: docRef.id, ...docData };
  };
  const updateDO = async (updatedDO) => {
    const doRef = doc(db, 'deliveryOrders', updatedDO.id);
    await updateDoc(doRef, { ...updatedDO });
    return updatedDO;
  };
  const getDOById = (doId: string) => deliveryOrders.find(d => d.id === doId);
  
  // GRN
  const addGRN = async (grnData) => {
    const docData = {
      ...grnData,
      receiptDate: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'goodsReceipts'), docData);
    // ... rest of stock and PO update logic
    return { id: docRef.id, ...docData };
  };

  // Checklist
  const addChecklist = async (checklistData) => {
    const docData = {
      ...checklistData,
      checkDate: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'checklists'), docData);
    // ... rest of stock and DO update logic
    return { id: docRef.id, ...docData };
  };

  // TTB
  const addTTB = async (ttbData) => {
    // Handle file uploads for signature and photos
    let signatureUrl = ttbData.recipientSignature;
    if (signatureUrl && signatureUrl.startsWith('data:image')) {
      const storageRef = ref(storage, `signatures/${Date.now()}.png`);
      const uploadResult = await uploadString(storageRef, signatureUrl, 'data_url');
      signatureUrl = await getDownloadURL(uploadResult.ref);
    }

    const photoUrls = [];
    if (ttbData.photoOfDelivery && ttbData.photoOfDelivery.length > 0) {
      for (const file of ttbData.photoOfDelivery) {
        // This part needs adjustment in the component to pass File objects
        // Assuming for now it's handled and we get URLs
      }
    }

    const docData = {
      ...ttbData,
      acceptanceDate: Timestamp.now(),
      recipientSignature: signatureUrl,
      // photoOfDelivery: photoUrls
    };
    const docRef = await addDoc(collection(db, 'ttbs'), docData);
    // ... rest of logic
    return { id: docRef.id, ...docData };
  };
  const getTTBById = (ttbId: string) => ttbs.find(t => t.id === ttbId);
  
  // RejectionReport
  const addRejectionReport = async (reportData) => {
    const docData = {
      ...reportData,
      reportingDate: Timestamp.now(),
      reconciliationStatus: 'Pending',
    };
    const docRef = await addDoc(collection(db, 'rejectionReports'), docData);
    return { id: docRef.id, ...docData };
  };
  const updateRejectionReport = async (updatedReport) => {
    const reportRef = doc(db, 'rejectionReports', updatedReport.id);
    await updateDoc(reportRef, { ...updatedReport });
    return updatedReport;
  };


  return (
    <DataContext.Provider value={{
      users, addUser, updateUser, deleteUser, getUserById,
      projects, addProject, updateProject, getProjectById,
      items, addItem, updateItem, getItemById, updateItemStock,
      suppliers, addSupplier, updateSupplier, getSupplierById,
      frbs, addFRB, updateFRB, getFRBById, approveFRBByDirector, rejectFRBByDirector,
      purchaseRequests, addPR, updatePR, getPRById, approvePRByDirector, rejectPRByDirector,
      purchaseOrders, addPO, updatePO, getPOById,
      deliveryOrders, addDO, updateDO, getDOById,
      goodsReceipts, addGRN,
      checklists, addChecklist,
      ttbs, addTTB, getTTBById,
      rejectionReports, addRejectionReport, updateRejectionReport,
      activityLogs, logActivity,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};