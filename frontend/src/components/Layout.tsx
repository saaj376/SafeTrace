import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MapPin, Shield, Home as HomeIcon, LogOut, User, Map, BookOpen, Users } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isGuardianPage = location.pathname.startsWith('/guardian')
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  const userEmail = localStorage.getItem('userEmail')

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    navigate('/')
  }

  if (isGuardianPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-20">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-orange-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">SafeTrace X</span>
            </div>
            <div className="flex items-center space-x-2">
              {isAuthenticated && (
                <>
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{userEmail}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="pb-4">{children}</main>
      
      {/* Bottom Tab Navigation */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-4 gap-1">
              <Link
                to="/app/trips"
                className={`flex flex-col items-center justify-center py-3 transition-colors ${
                  location.pathname === '/app/trips'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                <HomeIcon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Trips</span>
              </Link>
              
              <Link
                to="/app/map"
                className={`flex flex-col items-center justify-center py-3 transition-colors ${
                  location.pathname === '/app/map'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                <Map className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Map</span>
              </Link>
              
              <Link
                to="/app/journal"
                className={`flex flex-col items-center justify-center py-3 transition-colors ${
                  location.pathname === '/app/journal'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                <BookOpen className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Journal</span>
              </Link>
              
              <Link
                to="/app/community"
                className={`flex flex-col items-center justify-center py-3 transition-colors ${
                  location.pathname === '/app/community'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                <Users className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Community</span>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </div>
  )
}

