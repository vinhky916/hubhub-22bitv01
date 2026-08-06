import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, Edit3 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode | string;
  description?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowCustomInput?: boolean;
  customInputPlaceholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Chọn một tùy chọn...',
  required = false,
  className = '',
  allowCustomInput = false,
  customInputPlaceholder = 'Tự nhập giá trị khác...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: SelectOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Check if current value is custom (not in predefined options)
  useEffect(() => {
    if (allowCustomInput && value && !normalizedOptions.some(opt => opt.value === value) && value !== 'OTHER') {
      setIsCustomMode(true);
    }
  }, [value, allowCustomInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative flex flex-col gap-1 text-left ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button matching reference image */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full bg-white text-slate-800 rounded-xl py-3 px-4 flex items-center justify-between text-xs font-extrabold transition-all duration-200 outline-none select-none ${
          isOpen
            ? 'border-2 border-blue-500 ring-4 ring-blue-500/10 shadow-sm'
            : 'border border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <span className="truncate pr-2 font-bold text-slate-800 text-[13px]">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
            </span>
          ) : isCustomMode && value ? (
            <span className="flex items-center gap-2 text-blue-700">
              <Edit3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{value}</span>
            </span>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </span>

        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-blue-600 shrink-0 transition-transform duration-200" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200" />
        )}
      </button>

      {/* Write-in custom input field when custom mode active */}
      {allowCustomInput && isCustomMode && (
        <div className="mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <input
            type="text"
            value={value === 'OTHER' ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customInputPlaceholder}
            className="w-full bg-white border border-blue-400 text-slate-800 rounded-xl py-2.5 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
            autoFocus
          />
        </div>
      )}

      {/* Popover Menu Card floating below */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-full w-max max-w-[320px] bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 max-h-[260px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {normalizedOptions.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (opt.value === 'OTHER') {
                    setIsCustomMode(true);
                    onChange('');
                  } else {
                    setIsCustomMode(false);
                    onChange(opt.value);
                  }
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between gap-2 select-none ${
                  isSelected
                    ? 'bg-blue-50/80 text-blue-700 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {opt.icon && <span className="text-sm shrink-0">{opt.icon}</span>}
                  <div className="truncate">
                    <span className="block text-[13px]">{opt.label}</span>
                    {opt.description && (
                      <span className="block text-[10px] font-medium text-slate-400 truncate mt-0.5">
                        {opt.description}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
