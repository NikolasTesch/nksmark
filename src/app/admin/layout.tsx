import * as React from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-nks-gray-100 text-nks-black font-sans">
      <AdminSidebar />
      
      <main className="flex-grow p-8 md:p-12 overflow-y-auto max-h-screen">
        <div className="container mx-auto max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  )
}
