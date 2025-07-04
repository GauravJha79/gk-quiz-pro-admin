import React, { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Users,
  Settings,
  Menu as MenuIcon,
  LogOut as LogoutIcon
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useAuth } from './hooks/useAuth'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/exam-books', label: 'Exam Books', icon: <BookOpen size={20} /> },
  { to: '/question-reports', label: 'Question Reports', icon: <HelpCircle size={20} /> },
  { to: '/users', label: 'Users', icon: <Users size={20} /> },
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
  const auth = useAuth()

  const handleLogout = async () => {
    await auth.signOut()
    navigate('/login', { replace: true })
  }

  const Sidebar = (
    <nav className="flex flex-col h-full px-3 py-4 bg-white border-r shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 px-2 pt-2">
        <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
          <span className="text-2xl font-black tracking-tight text-white">GK</span>
        </div>
        <span className="text-xl font-bold tracking-wide ml-2 text-blue-900">GK App Admin</span>
      </div>
      {/* Nav Links */}
      <div className="flex-1 space-y-1">
        {navLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-150 font-medium text-base focus:outline-none focus:ring-2 focus:ring-blue-400/60 ${isActive
                ? 'bg-blue-100 text-blue-700 shadow'
                : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
              }`
            }
            end
            onClick={() => setSidebarOpen(false)}
            tabIndex={0}
            aria-label={link.label}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
      {/* User/Logout Section */}
      <div className="mt-8 border-t pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700">
            {auth.user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-blue-900">Admin</span>
            <span className="text-xs text-gray-500">{auth.user?.email || 'admin@gkapp.com'}</span>
          </div>
        </div>
        <Button
          variant="destructive"
          className="w-full flex items-center gap-2 mt-2"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogoutIcon size={18} /> Logout
        </Button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex w-64 flex-col h-screen fixed left-0 top-0 z-30">
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
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
                <MenuIcon size={28} />
              </Button>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-blue-900 tracking-tight">{pageTitle}</h1>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 bg-gray-50">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
} 