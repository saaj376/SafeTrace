import { Book, Plus, Calendar } from 'lucide-react'

export default function Journal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Safety Journal</h1>
              <p className="text-gray-600">Track your experiences and share safety insights</p>
            </div>
            <button className="btn btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              New Entry
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="card text-center py-12">
          <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No journal entries yet</h2>
          <p className="text-gray-600 mb-6">
            Document your trips, safety observations, and experiences
          </p>
          <button className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Create First Entry
          </button>
        </div>

        {/* Sample Journal Entries (for future implementation) */}
        <div className="hidden space-y-4 mt-6">
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Evening walk through Anna Nagar</h3>
              <span className="text-xs text-gray-500 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Dec 8, 2025
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Felt very safe walking through this area. Well-lit streets and plenty of people around. 
              Would recommend for evening routes.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-success-100 text-success-700 px-2 py-1 rounded">Safe</span>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">Well-lit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
