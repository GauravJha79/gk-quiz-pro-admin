import React, { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Folder,
  FolderOpen,
  FileText,
  HelpCircle,
  Users,
  BarChart2,
  Trophy,
  Settings,
  Menu as MenuIcon,
  LogOut as LogoutIcon
} from 'lucide-react'
import { supabase } from './supabaseClient'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/exam-books', label: 'Exam Books', icon: <BookOpen size={20} /> },
  { to: '/sections', label: 'Sections', icon: <Layers size={20} /> },
  { to: '/categories', label: 'Categories', icon: <Folder size={20} /> },
  { to: '/subcategories', label: 'Subcategories', icon: <FolderOpen size={20} /> },
  { to: '/quizzes', label: 'Quizzes', icon: <FileText size={20} /> },
  { to: '/questions', label: 'Questions', icon: <HelpCircle size={20} /> },
  { to: '/users', label: 'Users', icon: <Users size={20} /> },
  { to: '/reports', label: 'Reports', icon: <BarChart2 size={20} /> },
  { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={20} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
]

function getPageTitle(pathname) {
  const found = navLinks.find(link => pathname.startsWith(link.to))
  return found ? found.label : 'Dashboard'
}

export default function DashboardLayout() {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const Sidebar = (
    <nav className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-8 px-2 pt-2">
        <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
          <span className="text-2xl font-black tracking-tight">GK</span>
        </div>
        <span className="text-xl font-bold tracking-wide ml-2">GK App Admin</span>
      </div>
      <div className="flex-1 space-y-1">
        {navLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-150 font-medium text-base ${isActive
                ? 'bg-blue-100 text-blue-700 shadow'
                : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
              }`
            }
            end
            onClick={() => setSidebarOpen(false)}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
      <Button
        variant="destructive"
        className="w-full mt-8 flex items-center gap-2"
        onClick={handleLogout}
      >
        <LogoutIcon size={18} /> Logout
      </Button>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex w-64 flex-col h-screen fixed left-0 top-0 z-30 bg-white border-r shadow-lg">
        {Sidebar}
      </aside>
      {/* Sidebar for mobile (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden absolute top-4 left-4 z-40">
            <MenuIcon size={28} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {Sidebar}
        </SheetContent>
      </Sheet>
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Top navbar */}
        <header className="flex items-center justify-between px-4 md:px-10 py-4 bg-white shadow-sm border-b sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <MenuIcon size={28} />
              </Button>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-blue-900 tracking-tight">{pageTitle}</h1>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
} 