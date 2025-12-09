import { Route, Clock, MapPin } from 'lucide-react'

export default function Trips() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Trips</h1>
          <p className="text-gray-600">View and manage your saved routes and trip history</p>
        </div>

        {/* Empty State */}
        <div className="card text-center py-12">
          <Route className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h2>
          <p className="text-gray-600 mb-6">
            Start planning your first safe route to see it here
          </p>
          <a href="/" className="btn btn-primary">
            Plan a Route
          </a>
        </div>

        {/* Sample Trip Cards (for future implementation) */}
        <div className="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Marina Beach to T Nagar</h3>
              <span className="text-xs bg-success-100 text-success-700 px-2 py-1 rounded">Completed</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Dec 8, 2025 • 3:45 PM</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>5.2 km • Safe mode</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
