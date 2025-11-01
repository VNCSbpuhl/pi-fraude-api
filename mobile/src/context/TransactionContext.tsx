import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ClassificationResponse } from '../services/api';

interface TransactionContextType {
  transactions: ClassificationResponse[];
  addTransaction: (transaction: ClassificationResponse) => void;
  clearTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [transactions, setTransactions] = useState<ClassificationResponse[]>(
    []
  );

  const addTransaction = (transaction: ClassificationResponse) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        clearTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within TransactionProvider');
  }
  return context;
};

