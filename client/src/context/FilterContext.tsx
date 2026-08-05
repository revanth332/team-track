import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Assignee {
  username: string;
  name: string;
}

interface FilterContextType {
  selectedAssignee: Assignee | null;
  setSelectedAssignee: (assignee: Assignee | null) => void;
  selectedLeadId: string | null;
  setSelectedLeadId: (leadId: string | null) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedAssignee, setSelectedAssignee] = useState<Assignee | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <FilterContext.Provider value={{ selectedAssignee, setSelectedAssignee, selectedLeadId, setSelectedLeadId }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
