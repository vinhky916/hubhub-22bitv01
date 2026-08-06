import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, HelpCircle, X } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'warning' | 'error' | 'danger';

export interface AlertOptions {
  title?: string;
  type?: ModalType;
  confirmText?: string;
}

export interface ConfirmOptions {
  title?: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
}

export interface PromptOptions {
  title?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ModalState {
  isOpen: boolean;
  mode: 'alert' | 'confirm' | 'prompt';
  message: string;
  title: string;
  type: ModalType;
  confirmText: string;
  cancelText: string;
  promptValue: string;
  placeholder: string;
  resolveRef?: (value: any) => void;
}

interface ModalContextType {
  showAlert: (message: string, options?: AlertOptions | string, type?: ModalType) => Promise<void>;
  showConfirm: (message: string, options?: ConfirmOptions | string, type?: ModalType) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, placeholder?: string, title?: string) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | null>(null);

let globalModalMethods: ModalContextType | null = null;

export const customAlert = (message: string, options?: AlertOptions | string, type?: ModalType): Promise<void> => {
  if (globalModalMethods) {
    return globalModalMethods.showAlert(message, options, type);
  }
  alert(message);
  return Promise.resolve();
};

export const customConfirm = (message: string, options?: ConfirmOptions | string, type?: ModalType): Promise<boolean> => {
  if (globalModalMethods) {
    return globalModalMethods.showConfirm(message, options, type);
  }
  return Promise.resolve(window.confirm(message));
};

export const customPrompt = (message: string, defaultValue?: string, placeholder?: string, title?: string): Promise<string | null> => {
  if (globalModalMethods) {
    return globalModalMethods.showPrompt(message, defaultValue, placeholder, title);
  }
  return Promise.resolve(window.prompt(message, defaultValue));
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'alert',
    message: '',
    title: '',
    type: 'info',
    confirmText: 'Đồng ý',
    cancelText: 'Hủy bỏ',
    promptValue: '',
    placeholder: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (modalState.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalState.isOpen]);

  const closeModal = useCallback((result: any) => {
    setModalState((prev) => {
      if (prev.resolveRef) {
        prev.resolveRef(result);
      }
      return { ...prev, isOpen: false, resolveRef: undefined };
    });
  }, []);

  const showAlert = useCallback((message: string, options?: AlertOptions | string, type?: ModalType): Promise<void> => {
    return new Promise((resolve) => {
      let title = 'Thông báo';
      let modalType: ModalType = type || 'info';
      let confirmText = 'Đồng ý';

      if (typeof options === 'string') {
        title = options;
      } else if (options) {
        if (options.title) title = options.title;
        if (options.type) modalType = options.type;
        if (options.confirmText) confirmText = options.confirmText;
      }

      setModalState({
        isOpen: true,
        mode: 'alert',
        message,
        title,
        type: modalType,
        confirmText,
        cancelText: '',
        promptValue: '',
        placeholder: '',
        resolveRef: () => resolve(),
      });
    });
  }, []);

  const showConfirm = useCallback((message: string, options?: ConfirmOptions | string, type?: ModalType): Promise<boolean> => {
    return new Promise((resolve) => {
      let title = 'Xác nhận';
      let modalType: ModalType = type || 'warning';
      let confirmText = 'Đồng ý';
      let cancelText = 'Hủy bỏ';

      if (typeof options === 'string') {
        title = options;
      } else if (options) {
        if (options.title) title = options.title;
        if (options.type) modalType = options.type;
        if (options.confirmText) confirmText = options.confirmText;
        if (options.cancelText) cancelText = options.cancelText;
      }

      setModalState({
        isOpen: true,
        mode: 'confirm',
        message,
        title,
        type: modalType,
        confirmText,
        cancelText,
        promptValue: '',
        placeholder: '',
        resolveRef: (val: boolean) => resolve(val),
      });
    });
  }, []);

  const showPrompt = useCallback((message: string, defaultValue = '', placeholder = '', title = 'Nhập thông tin'): Promise<string | null> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        mode: 'prompt',
        message,
        title,
        type: 'info',
        confirmText: 'Xác nhận',
        cancelText: 'Hủy bỏ',
        promptValue: defaultValue,
        placeholder: placeholder || 'Nhập vào đây...',
        resolveRef: (val: string | null) => resolve(val),
      });

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    });
  }, []);

  const methods = { showAlert, showConfirm, showPrompt };
  globalModalMethods = methods;

  const renderIcon = () => {
    switch (modalState.type) {
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-7 h-7" />
          </div>
        );
      case 'danger':
      case 'error':
        return (
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
            <XCircle className="w-7 h-7" />
          </div>
        );
      case 'info':
      default:
        if (modalState.mode === 'prompt' || modalState.mode === 'confirm') {
          return (
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <HelpCircle className="w-7 h-7" />
            </div>
          );
        }
        return (
          <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/10">
            <Info className="w-7 h-7" />
          </div>
        );
    }
  };

  const getConfirmBtnColor = () => {
    switch (modalState.type) {
      case 'danger':
      case 'error':
        return 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-500/25';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/25';
      case 'success':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25';
      default:
        return 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25';
    }
  };

  return (
    <ModalContext.Provider value={methods}>
      {children}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                if (modalState.mode === 'alert') closeModal(undefined);
                else if (modalState.mode === 'confirm') closeModal(false);
                else if (modalState.mode === 'prompt') closeModal(null);
              }}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 z-10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  if (modalState.mode === 'alert') closeModal(undefined);
                  else if (modalState.mode === 'confirm') closeModal(false);
                  else if (modalState.mode === 'prompt') closeModal(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                {renderIcon()}

                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">
                  {modalState.title}
                </h3>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {modalState.message}
                </p>

                {/* Input for Prompt */}
                {modalState.mode === 'prompt' && (
                  <div className="w-full mt-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={modalState.promptValue}
                      placeholder={modalState.placeholder}
                      onChange={(e) =>
                        setModalState((prev) => ({ ...prev, promptValue: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          closeModal(modalState.promptValue);
                        } else if (e.key === 'Escape') {
                          closeModal(null);
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-inner"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-3 w-full">
                  {(modalState.mode === 'confirm' || modalState.mode === 'prompt') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalState.mode === 'confirm') closeModal(false);
                        else closeModal(null);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {modalState.cancelText}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (modalState.mode === 'alert') closeModal(undefined);
                      else if (modalState.mode === 'confirm') closeModal(true);
                      else closeModal(modalState.promptValue);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm shadow-md transition-all duration-200 transform active:scale-95 ${getConfirmBtnColor()}`}
                  >
                    {modalState.confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
