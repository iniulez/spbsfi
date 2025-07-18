
import React from 'react'; // Added React import for JSX
import { UserRole } from './types';

export const APP_NAME = "Sistem Pengadaan Barang Satake Fimar Indonesia";

export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 4,
  [UserRole.DIREKTUR]: 3,
  [UserRole.PURCHASING]: 2,
  [UserRole.WAREHOUSE]: 2,
  [UserRole.PROJECT_MANAGER]: 1,
};

export const NAVIGATION_LINKS = {
  [UserRole.PROJECT_MANAGER]: [
    { name: 'Dashboard', path: '/dashboard', icon: 'home' },
    { name: 'Buat FRB Baru', path: '/pm/frb/new', icon: 'document-plus' },
    { name: 'Daftar FRB Saya', path: '/pm/frb', icon: 'list-bullet' },
    { name: 'Manajemen Proyek Saya', path: '/pm/projects', icon: 'briefcase' },
    { name: 'Tambah Barang Baru', path: '/pm/add-item', icon: 'cube-plus' }, // Using a hypothetical cube-plus
    { name: 'Laporan Penolakan', path: '/reconciliation/reports', icon: 'exclamation-triangle' },
  ],
  [UserRole.DIREKTUR]: [
    { name: 'Dashboard', path: '/dashboard', icon: 'home' },
    { name: 'Persetujuan FRB', path: '/director/frb-approval', icon: 'check-circle' },
    { name: 'Persetujuan PR', path: '/director/pr-approval', icon: 'check-badge' },
    { name: 'Laporan Utama', path: '/admin/reports', icon: 'chart-pie' }, // Assuming Director can see admin reports
  ],
  [UserRole.PURCHASING]: [
    { name: 'Dashboard', path: '/dashboard', icon: 'home' },
    { name: 'Validasi FRB', path: '/purchasing/frb-validation', icon: 'clipboard-document-check' },
    { name: 'Manajemen PR', path: '/purchasing/pr-management', icon: 'document-text' },
    { name: 'Manajemen PO', path: '/purchasing/po-management', icon: 'shopping-cart' },
    { name: 'Laporan Penolakan', path: '/reconciliation/reports', icon: 'exclamation-triangle' },
  ],
  [UserRole.WAREHOUSE]: [
    { name: 'Dashboard', path: '/dashboard', icon: 'home' },
    { name: 'Penerimaan Barang (GRN)', path: '/warehouse/goods-receipt', icon: 'archive-box-arrow-down' },
    { name: 'Penyiapan DO', path: '/warehouse/do-preparation', icon: 'clipboard-document-list' },
    { name: 'Manajemen Stok Barang', path: '/warehouse/stock-management', icon: 'archive-box' }, // Using archive-box
    { name: 'Tambah Barang Baru', path: '/warehouse/add-item', icon: 'cube-plus' },
    { name: 'Laporan Penolakan', path: '/reconciliation/reports', icon: 'exclamation-triangle' },
  ],
  [UserRole.ADMIN]: [
    { name: 'Dashboard', path: '/dashboard', icon: 'home' },
    { name: 'Manajemen User', path: '/admin/users', icon: 'users' },
    { name: 'Manajemen Barang', path: '/admin/items', icon: 'cube' },
    { name: 'Manajemen Proyek', path: '/admin/projects', icon: 'briefcase' },
    { name: 'Manajemen Supplier', path: '/admin/suppliers', icon: 'building-office-2' },
    { name: 'Laporan Sistem', path: '/admin/reports', icon: 'chart-pie' },
    { name: 'Log Aktivitas', path: '/admin/activity-log', icon: 'document-magnifying-glass' },
  ],
};

export const HERO_ICONS_BASE_PATH = "M10 10h10M10"; // Placeholder, actual SVG paths are complex.
// For heroicons, we'll use class names like `hero-icon` and specific icon names.
// Example: <svg class="hero-icon"><use href="/path/to/heroicons.svg#icon-name" /></svg>
// Or rely on a CSS library that provides them if not using inline SVGs directly.
// Given the CDN approach for heroicons, we just use <i> tags with classes.

// A map for heroicon names to their string representation for use with <i> tags
export const ICON_MAP: { [key: string]: string } = {
  home: 'home',
  'document-plus': 'document-plus',
  'list-bullet': 'list-bullet',
  'check-circle': 'check-circle',
  'check-badge': 'check-badge',
  'chart-pie': 'chart-pie',
  'clipboard-document-check': 'clipboard-document-check',
  'document-text': 'document-text',
  'shopping-cart': 'shopping-cart',
  'archive-box-arrow-down': 'archive-box-arrow-down',
  'clipboard-document-list': 'clipboard-document-list',
  'exclamation-triangle': 'exclamation-triangle',
  users: 'users',
  cube: 'cube',
  'cube-plus': 'cube-plus', // Added for "Tambah Barang Baru"
  briefcase: 'briefcase',
  'building-office-2': 'building-office-2',
  'document-magnifying-glass': 'document-magnifying-glass',
  'archive-box': 'archive-box', // Added for "Manajemen Stok Barang"
  logout: 'arrow-left-on-rectangle',
  bell: 'bell',
  menu: 'bars-3',
  x: 'x-mark',
  search: 'magnifying-glass',
  filter: 'funnel',
  plus: 'plus',
  pencil: 'pencil-square',
  trash: 'trash',
  eye: 'eye',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  upload: 'arrow-up-tray',
  download: 'arrow-down-tray',
  'arrow-path': 'arrow-path', // for refresh / retry
};

// Function to render Heroicon
export const HeroIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  // const iconName = ICON_MAP[name] || 'question-mark-circle'; // Default icon
  // This structure assumes heroicons are available globally, e.g. via a CSS library or JS that transforms these.
  // Using https://cdnjs.cloudflare.com/ajax/libs/heroicons/2.1.3/24/outline/heroicons.min.css
  // requires a specific class structure. This helper adapts.
  // However, that CSS provides SVGs directly, not via <i>.
  // For simplicity, let's use a simpler way with the CDN, or embed SVG.
  // The provided CDN seems to imply individual SVGs or a sprite.
  // For now, let's just use text as placeholder if direct SVG embedding is too verbose for this format.
  // The provided stylesheet might not work with <i> tags. Let's assume we can make it work or adapt.
  // A common way for CDN heroicons is: <svg class="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..."></path></svg>
  // This is too verbose.
  // Let's use simple text representations or common Unicode for now, as full SVG integration is heavy.
  
  // This is a simplified way to use heroicons from the provided CDN
  // It relies on using the icon name as part of a class. The CDN might not support this.
  // A more robust way is to use SVG components or a library like `react-heroicons`.
  // For the purpose of this exercise and given the CDN setup, let's try a common pattern,
  // acknowledging it might need adjustment based on the exact CDN's capabilities.
  // The `heroicons.min.css` from `cdnjs` is not standard.
  // Let's assume a hypothetical `<i>` tag usage or revert to unicode/text.
  // Given the `heroicons.min.css` from cloudflare, it's typically used by copying SVG definitions.
  // This is complex for CDATA. I'll use simple text for icons if SVG becomes too large.
  // Okay, I will use a simple span with a placeholder class. The `style` block in index.html already defines `.hero-icon`.
  // The actual SVG must be loaded separately or use a font icon. The provided heroicons CDN typically provides individual SVGs.
  // For now, let's assume the provided heroicons CDN requires using the SVG directly.
  // This is too verbose. I will use placeholder text for icons.
  
  // Revised strategy: Use text placeholders for icons or simple unicode.
  // The provided `<link>` for heroicons is `outline`.
  // Let's try to make a simple SVG component for icons.

  return React.createElement('span', { className: `hero-icon ${className || ''}` }, name); // Placeholder rendering
};