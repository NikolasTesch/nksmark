import * as React from 'react'

interface LoadingGridProps {
  count?: number
}

export function LoadingGrid({ count = 8 }: LoadingGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900"
        >
          {/* Preview Image Skeleton */}
          <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 animate-pulse w-full" />
          
          {/* Info Area Skeleton */}
          <div className="p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-16" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-12" />
            </div>
            <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full" />
            
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-24" />
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
