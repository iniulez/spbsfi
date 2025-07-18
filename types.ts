import { Timestamp } from 'firebase/firestore';

export enum UserRole {
  PROJECT_MANAGER = 'Project Manager',
  DIREKTUR = 'Direktur',
  PURCHASING = 'Purchasing',
  WAREHOUSE = 'Warehouse',
  ADMIN = 'Admin',
}

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Only used for creation, never stored in Firestore
}

export interface Project {
  id: string;
  projectName: string;
  pmId: string; // User ID of Project Manager
  projectPO?: string; // File name or path/URL from Storage
}

export interface Item {
  id: string;
  itemName: string;
  description: string;
  unit: string;
  currentStock: number;
  estimatedUnitPrice: number;
}

export interface Supplier {
  id: string;
  supplierName: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export enum FRBStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  AWAITING_DIRECTOR_APPROVAL = 'Awaiting Director Approval',
  APPROVED_BY_DIRECTOR = 'Approved by Director',
  REJECTED_BY_DIRECTOR = 'Rejected by Director',
  IN_PURCHASING_VALIDATION = 'In Purchasing Validation',
  IN_PURCHASING_PROCESS = 'In Purchasing Process',
  PARTIALLY_STOCKED = 'Partially Stocked', // DO created for some items
  FULLY_STOCKED = 'Fully Stocked', // DO created for all items
  COMPLETED = 'Completed', // All related DOs are Delivered/TTB Accepted
  REJECTED_BY_RECIPIENT = 'Rejected by Recipient', // From TTB
}

export interface FRBItem {
  id: string; // Unique ID for this line item in FRB
  itemId: string;
  requestedQuantity: number;
  approvedQuantity?: number; // Can be adjusted by Purchasing/Director
  estimatedUnitPrice: number; // Snapshot from Item master at time of FRB
}

export interface FormRequestBarang {
  id: string;
  projectId: string;
  pmId: string;
  submissionDate: Timestamp;
  deliveryDeadline: Timestamp;
  recipientName: string;
  recipientContact: string;
  deliveryAddress: string;
  status: FRBStatus;
  items: FRBItem[];
  projectPOFile?: string; // File URL from Storage
  directorApprovalDate?: Timestamp;
  directorRejectionReason?: string;
  purchasingValidationDate?: Timestamp;
  purchasingValidationNotes?: string;
}

export enum PRStatus {
  AWAITING_DIRECTOR_APPROVAL = 'Awaiting Director Approval',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PROCESSED = 'Processed', // PO Created
}

export interface PRItem {
  id: string;
  itemId: string;
  quantityToPurchase: number;
}

export interface PurchaseRequest {
  id: string;
  frbId?: string; // Optional, if PR derived from FRB
  pmId: string; // User who initiated the need, could be PM or Purchasing
  purchasingId: string; // User in Purchasing who created PR
  requestDate: Timestamp;
  status: PRStatus;
  items: PRItem[];
  directorApprovalDate?: Timestamp;
  directorRejectionReason?: string;
}

export enum POStatus {
  ORDERED = 'Ordered',
  SHIPPED = 'Shipped',
  PARTIALLY_RECEIVED = 'Partially Received',
  FULLY_RECEIVED = 'Fully Received',
  CANCELED = 'Canceled',
}

export interface PurchaseOrder {
  id: string;
  prId: string;
  supplierId: string;
  orderDate: Timestamp;
  expectedDeliveryDate: Timestamp;
  actualDeliveryDate?: Timestamp;
  totalPrice: number; // Calculated based on PR items and supplier prices
  status: POStatus;
  // POItems implicitly derived from PRItems associated with prId
}

export enum DOStatus {
  CREATED = 'Created', // By Purchasing from available stock
  PREPARED_BY_WAREHOUSE = 'Prepared by Warehouse',
  SENT = 'Sent', // Out for delivery
  DELIVERED = 'Delivered', // TTB Accepted
  REJECTED_BY_RECIPIENT = 'Rejected by Recipient', // TTB Rejected
}

export interface DOItem {
  id: string;
  itemId: string;
  deliveredQuantity: number; // Quantity from FRB to be delivered via this DO
}

export interface DeliveryOrder {
  id: string;
  frbId: string;
  purchasingId: string; // User in Purchasing who created DO
  creationDate: Timestamp;
  status: DOStatus;
  items: DOItem[];
}

export enum GRNCondition {
  GOOD = 'Good',
  DAMAGED = 'Damaged',
  PARTIALLY_DAMAGED = 'Partially Damaged',
}

export enum ItemConditionAtReceipt {
  GOOD = 'Good',
  MINOR_DAMAGE = 'Minor Damage',
  MAJOR_DAMAGE = 'Major Damage',
  MISMATCHED_SPEC = 'Mismatched Spec',
}

export enum ActionTaken {
  ACCEPTED = 'Accepted',
  RETURNED_TO_SUPPLIER = 'Returned to Supplier',
  TO_BE_REPAIRED = 'To be Repaired',
}
export interface GRNItem {
  id: string;
  itemId: string;
  receivedQuantity: number;
  conditionAtReceipt: ItemConditionAtReceipt;
  quantityDamaged: number;
  actionTaken: ActionTaken;
  photoDamaged?: string; // File URL from Storage
}

export interface GoodsReceipt { // Goods Receipt Note (GRN)
  id: string;
  poId: string;
  warehouseId: string; // User in Warehouse
  receiptDate: Timestamp;
  overallCondition: GRNCondition;
  notes?: string;
  items: GRNItem[];
}

export enum ChecklistOverallStatus {
  READY_TO_SHIP = 'Ready to Ship',
  NOT_READY = 'Not Ready',
}

export enum ItemConditionStatus {
    GOOD = 'Good',
    MINOR_DAMAGE = 'Minor Damage',
    MAJOR_DAMAGE = 'Major Damage',
}

export enum ItemFunctionalityStatus {
    WORKING = 'Working',
    NOT_WORKING = 'Not Working',
}

export interface ChecklistItem {
  id: string;
  itemId: string;
  preparedQuantity: number;
  conditionStatus: ItemConditionStatus;
  functionalityStatus: ItemFunctionalityStatus;
  notes?: string;
  photoIssue?: string; // File URL from Storage
}

export interface GoodsPreparationChecklist {
  id: string;
  doId: string;
  warehouseId: string;
  checkDate: Timestamp;
  overallStatus: ChecklistOverallStatus;
  items: ChecklistItem[];
}

export enum TTBStatus {
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
}

export interface TTBItem {
  id: string;
  itemId: string;
  deliveredQuantity: number; // As per DO
  conditionAtAcceptance: ItemConditionStatus; // Simplified
}

export interface TandaTerimaBarang {
  id: string;
  doId: string;
  warehouseId: string; // User performing delivery/getting signature
  recipientName: string; // From FRB, confirmed or updated
  recipientContact: string; // From FRB, confirmed or updated
  deliveryAddress: string; // From FRB
  recipientSignature?: string; // URL of signature image from Storage
  photoOfDelivery?: string[]; // Array of URLs from Storage
  recipientStatement: string; // e.g., "Seluruh barang telah diterima dalam kondisi baik."
  acceptanceDate: Timestamp; // DateTime
  status: TTBStatus;
  items: TTBItem[]; // Items as per DO, with their condition at acceptance
}

export enum RejectionReason {
  DAMAGED = 'Damaged',
  WRONG_QUANTITY = 'Wrong Quantity',
  WRONG_ITEM = 'Wrong Item',
  LATE_DELIVERY = 'Late Delivery',
  OTHER = 'Other',
}

export enum ReconciliationStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
}

export interface RejectionReport {
  id: string;
  ttbId: string; // Link to the TTB that was rejected
  warehouseId: string; // User reporting (usually who handled TTB)
  reportingDate: Timestamp;
  reasonForRejection: RejectionReason;
  detailedReason: string;
  photosOfDamage?: string[]; // Array of URLs from Storage
  reconciliationStatus: ReconciliationStatus;
  resolutionNotes?: string;
  resolutionDate?: Timestamp;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string; // denormalized for easy display
  userRole: UserRole; // denormalized
  action: string; // e.g., "Created FRB FRB-001", "Approved PR PR-002"
  timestamp: Timestamp;
  relatedDocumentId?: string; // e.g., FRBID, PRID
  details?: Record<string, any>;
}

export interface Notification {
  id: string;
  userId: string; // Target user
  message: string;
  link?: string; // Optional link to relevant page
  isRead: boolean;
  timestamp: Timestamp;
}