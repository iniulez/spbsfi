
import React, { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode); // Accessor can be a key or a function returning ReactNode
  render?: (item: T) => ReactNode; // Optional custom render function for the cell
  className?: string; // Optional class for TH and TD
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
}

const DataTable = <T extends object,>({
  columns,
  data,
  onRowClick,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No data available."
}: DataTableProps<T>): React.ReactElement => {

  const renderCellContent = (item: T, column: Column<T>): React.ReactNode => {
    if (column.render) {
      return column.render(item);
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    const value = item[column.accessor as keyof T];
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value instanceof Date) {
        return value.toLocaleDateString();
    }
    // Ensure value is not an object or array before converting to string, or handle specific object types.
    if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
        // This is a basic catch-all. You might want more specific rendering for certain object types.
        return JSON.stringify(value);
    }
    return String(value ?? ''); // Handle null or undefined gracefully
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Loading data...</p>
        </div>
    );
  }

  if (data.length === 0 && !isLoading) {
    return <div className="text-center py-10 text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`${onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
            >
              {columns.map((col, index) => (
                <td key={index} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${col.className || ''}`}>
                  {renderCellContent(item, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
