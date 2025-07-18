
import React, { ChangeEvent, FocusEvent, ReactNode } from 'react';

type InputType = 'text' | 'email' | 'password' | 'number' | 'date' | 'file';

interface FormFieldProps {
  id: string;
  label: string;
  type?: InputType;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  rows?: number; // For textarea
  options?: { value: string | number; label: string }[]; // For select
  className?: string;
  inputClassName?: string;
  children?: ReactNode; // For custom inputs like file upload preview
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  required = false,
  disabled = false,
  rows,
  options,
  className = 'mb-4',
  inputClassName = '',
  children,
}) => {
  // Standard classes for all input types, including focus styling and general text size
  const standardInputStyle = 'mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
  
  // Dynamic classes based on state (disabled, error, normal)
  let stateSpecificClasses = '';
  if (disabled) {
    // Disabled: light gray background, black text, gray border, not-allowed cursor
    stateSpecificClasses = 'bg-gray-100 text-gray-900 border-gray-300 cursor-not-allowed';
  } else if (error) {
    // Error: white background, black text, red border
    stateSpecificClasses = 'bg-white text-gray-900 border-red-500';
  } else {
    // Normal (enabled, no error): white background, black text, gray border
    stateSpecificClasses = 'bg-gray-200 text-gray-900 border-gray-300';
  }

  // Combine all classes, including any custom inputClassName and explicit placeholder color
  const finalInputClasses = `${standardInputStyle} ${stateSpecificClasses} placeholder-gray-500 ${inputClassName}`;

  const renderInput = () => {
    if (type === 'file') {
      return (
          <>
            <input
                id={id}
                name={id}
                type={type}
                // value is not set for file inputs for security reasons
                onChange={onChange}
                onBlur={onBlur}
                required={required}
                disabled={disabled}
                className={finalInputClasses}
            />
            {children}
          </>
      );
    } else if (options) { // Select dropdown
      return (
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          className={finalInputClasses}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    } else if (rows) { // Textarea
      return (
        <textarea
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={finalInputClasses}
        />
      );
    } else { // Standard input
      return (
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={finalInputClasses}
        />
      );
    }
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {renderInput()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default FormField;
