import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse bg-on-surface-variant/10 rounded-lg ${className}`} />
);

export const DashboardSkeleton = () => (
  <div className="space-y-12">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24 rounded-[1.5rem]" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Skeleton className="h-[400px] rounded-[2rem]" />
      <Skeleton className="h-[400px] rounded-[2rem]" />
    </div>
  </div>
);

export const TasksSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="bg-surface-container-lowest p-6 rounded-[1.5rem] border border-outline-variant/10 space-y-4">
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-3/4 h-8" />
        <Skeleton className="w-full h-12" />
        <div className="flex gap-2">
          <Skeleton className="w-12 h-6" />
          <Skeleton className="w-12 h-6" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex gap-4 mb-8">
      <Skeleton className="w-48 h-10" />
      <Skeleton className="w-48 h-10" />
    </div>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="w-32 h-6" />
          <Skeleton className="w-48 h-4" />
        </div>
        <Skeleton className="w-24 h-8 rounded-full" />
      </div>
    ))}
  </div>
);

export const TeamSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
      <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 flex flex-col items-center space-y-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <Skeleton className="w-24 h-6" />
        <Skeleton className="w-20 h-4" />
      </div>
    ))}
  </div>
);
