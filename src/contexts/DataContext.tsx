import { createContext, useContext, useState, ReactNode } from 'react';

export interface DengoDataRow {
  calendarYear: number;
  calendarMonth: string;
  nom: string;
  clientMacroCategory: string;
  macroFamilyName: string;
  familyName: string;
  nameSalesReport: string;
  frItemCode: string;
  quantitySoldTotal: number;
  netSales: number;
  cogs: number;
  margin: number;
  volumeKg: number;
  yearMonth: string;
  month: string;
  monthYear: string;
  pl: string;
}

interface DataContextType {
  data: DengoDataRow[];
  setData: (data: DengoDataRow[]) => void;
  isDataLoaded: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<DengoDataRow[]>([]);

  return (
    <DataContext.Provider value={{ 
      data, 
      setData,
      isDataLoaded: data.length > 0 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
