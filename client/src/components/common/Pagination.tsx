import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Ensure totalPages is a valid positive integer
  const safeTotalPages = Math.max(0, Math.floor(Number.isFinite(totalPages) ? totalPages : 0));
  
  if (safeTotalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-12 pb-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-on-surface-variant"
      >
        <ChevronLeft size={20} />
      </button>
      
      <div className="flex items-center gap-1">
        {[...Array(Math.min(safeTotalPages, 1000))].map((_, i) => {
          const pageNum = i + 1;
          const isNear = Math.abs(pageNum - currentPage) <= 1;
          const isFirstOrLast = pageNum === 1 || pageNum === totalPages;
          
          if (!isNear && !isFirstOrLast) {
            if (pageNum === 2 && currentPage > 3) return <span key="ellipsis-start" className="px-2 opacity-40">...</span>;
            if (pageNum === totalPages - 1 && currentPage < totalPages - 2) return <span key="ellipsis-end" className="px-2 opacity-40">...</span>;
            return null;
          }

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[40px] h-10 rounded-xl font-bold text-sm transition-all ${
                currentPage === pageNum 
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105' 
                  : 'hover:bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-on-surface-variant"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
