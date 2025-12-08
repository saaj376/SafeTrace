import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, Shield, AlertTriangle, Radio, X } from 'lucide-react'
import Map from '../components/Map'
import {
  calculateRoute,
  checkSafetyStatus,
  activateSOS,
  updateLocation,
  deactivateSOS,
  healthCheck,
  Coordinate,
  RouteResponse,
  AlertResponse,
} from '../services/api'
import clsx from 'clsx'

type RouteMode = 'safe' | 'balanced' | 'stealth' | 'escort'

export default function Home() {
  const [start, setStart] = useState<Coordinate | null>(null)
  const [end, setEnd] = useState<Coordinate | null>(null)
  const [route, setRoute] = useState<Coordinate[]>([])
  const [mode, setMode] = useState<RouteMode>('safe')
  const [loading, setLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null)
  const [sosActive, setSosActive] = useState(false)
  const [sosToken, setSosToken] = useState<string | null>(null)
  const [alert, setAlert] = useState<AlertResponse | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; mode: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sosIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck()
        setBackendConnected(true)
      } catch (error) {
        setBackendConnected(false)
        setError('Backend server is not reachable. Please ensure it is running on http://localhost:8000')
      }
    }
    checkBackend()
  }, [])

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
          if (!start) {
            setStart({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            })
          }
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }, [])

  const handleCalculateRoute = async () => {
    if (!start || !end) {
      setError('Please set both start and end points')
      setTimeout(() => setError(null), 5000)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      console.log(`[FRONTEND] Calculating ${mode} route from (${start.lat}, ${start.lon}) to (${end.lat}, ${end.lon})`)
      
      const response: RouteResponse = await calculateRoute(mode, {
        start_lat: start.lat,
        start_lon: start.lon,
        end_lat: end.lat,
        end_lon: end.lon,
      })
      
      console.log(`[FRONTEND] Route received: ${response.route_coords.length} waypoints, ${response.distance_approx_km} km, mode: ${response.mode_used}`)
      
      if (!response.route_coords || response.route_coords.length === 0) {
        throw new Error('Route calculation returned empty coordinates')
      }
      
      setRoute(response.route_coords)
      setRouteInfo({
        distance: response.distance_approx_km,
        mode: response.mode_used,
      })
      
      // Start monitoring if route is active
      startMonitoring(response.route_coords)
    } catch (error: any) {
      console.error('[FRONTEND] Error calculating route:', error)
      const errorMessage = error.response?.data?.detail 
        || error.message 
        || 'Failed to calculate route. Please check if the backend server is running.'
      setError(errorMessage)
      setRoute([]) // Clear any previous route
      setRouteInfo(null)
    } finally {
      setLoading(false)
    }
  }

  const startMonitoring = (routeCoords: Coordinate[]) => {
    // Clear existing interval
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current)
    }

    // Check safety status every 10 seconds
    monitoringIntervalRef.current = setInterval(async () => {
      if (!currentLocation || routeCoords.length === 0) return

      try {
        const alertResponse = await checkSafetyStatus({
          user_id: 'user_123', // In real app, get from auth
          current_lat: currentLocation.lat,
          current_lon: currentLocation.lon,
          planned_route_coords: routeCoords.map(c => [c.lat, c.lon] as [number, number]),
          planned_route_nodes: [], // Would need to be calculated from route
          mode_used: mode,
        })

        if (alertResponse.alert_type) {
          setAlert(alertResponse)
        }
      } catch (error) {
        console.error('Error checking safety status:', error)
      }
    }, 10000)
  }

  const handleActivateSOS = async () => {
    if (!currentLocation) {
      alert('Unable to get your location. Please enable location services.')
      return
    }

    try {
      const response = await activateSOS({
        user_id: 'user_123',
        current_lat: currentLocation.lat,
        current_lon: currentLocation.lon,
      })

      setSosActive(true)
      setSosToken(response.token)

      // Start sending location updates
      sosIntervalRef.current = setInterval(async () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const newLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              }
              setCurrentLocation(newLocation)
              
              try {
                await updateLocation({
                  token: response.token,
                  lat: newLocation.lat,
                  lon: newLocation.lon,
                  is_stationary: false,
                })
              } catch (error) {
                console.error('Error updating location:', error)
              }
            },
            (error) => console.error('Error getting location:', error)
          )
        }
      }, 5000) // Update every 5 seconds
    } catch (error: any) {
      console.error('Error activating SOS:', error)
      alert(error.response?.data?.detail || 'Failed to activate SOS')
    }
  }

  const handleDeactivateSOS = async () => {
    if (!sosToken) return

    try {
      await deactivateSOS(sosToken)
      setSosActive(false)
      setSosToken(null)
      
      if (sosIntervalRef.current) {
        clearInterval(sosIntervalRef.current)
      }
    } catch (error: any) {
      console.error('Error deactivating SOS:', error)
    }
  }

  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current)
      }
      if (sosIntervalRef.current) {
        clearInterval(sosIntervalRef.current)
      }
    }
  }, [])

  const modeOptions: { value: RouteMode; label: string; description: string; icon: any }[] = [
    { value: 'safe', label: 'Safe', description: 'Maximum safety priority', icon: Shield },
    { value: 'balanced', label: 'Balanced', description: 'Balance safety and speed', icon: Navigation },
    { value: 'stealth', label: 'Stealth', description: 'Minimize visibility', icon: Radio },
    { value: 'escort', label: 'Escort', description: 'Maximum protection mode', icon: Shield },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              SafeRoute Planner
            </h1>
            <p className="text-gray-600">
              Intelligent safety routing with real-time hazard monitoring
            </p>
          </div>
          {backendConnected !== null && (
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${backendConnected ? 'bg-success-500' : 'bg-danger-500'}`} />
              <span className="text-sm text-gray-600">
                {backendConnected ? 'Backend Connected' : 'Backend Offline'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 card bg-danger-50 border-danger-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-danger-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-danger-900">Error</h3>
                <p className="text-danger-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-danger-600 hover:text-danger-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Alert Banner */}
      {alert && alert.alert_type && (
        <div className="mb-6 card bg-danger-50 border-danger-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-danger-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-danger-900">{alert.alert_type}</h3>
                <p className="text-danger-700 mt-1">{alert.message}</p>
                {alert.action_required && (
                  <button
                    onClick={() => {
                      setAlert(null)
                      // Trigger reroute logic here
                    }}
                    className="mt-2 btn btn-danger text-sm"
                  >
                    Reroute Now
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="text-danger-600 hover:text-danger-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* SOS Status */}
      {sosActive && sosToken && (
        <div className="mb-6 card bg-danger-50 border-danger-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-danger-600 rounded-full animate-pulse" />
              <div>
                <h3 className="font-semibold text-danger-900">SOS Active</h3>
                <p className="text-sm text-danger-700">
                  Share this link with guardians: {window.location.origin}/guardian/{sosToken}
                </p>
              </div>
            </div>
            <button onClick={handleDeactivateSOS} className="btn btn-danger">
              Deactivate
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Route Mode Selection */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Route Mode</h2>
            <div className="grid grid-cols-2 gap-3">
              {modeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setMode(option.value)}
                    className={clsx(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      mode === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon className="h-5 w-5 mb-2 text-primary-600" />
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Start/End Points */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Route Points</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Point
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={start?.lat || ''}
                    onChange={(e) =>
                      setStart((prev) => ({
                        lat: parseFloat(e.target.value) || 0,
                        lon: prev?.lon || 0,
                      }))
                    }
                    className="input"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={start?.lon || ''}
                    onChange={(e) =>
                      setStart((prev) => ({
                        lat: prev?.lat || 0,
                        lon: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="input"
                  />
                </div>
                {currentLocation && (
                  <button
                    onClick={() => setStart(currentLocation)}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    Use Current Location
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Point
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={end?.lat || ''}
                    onChange={(e) =>
                      setEnd((prev) => ({
                        lat: parseFloat(e.target.value) || 0,
                        lon: prev?.lon || 0,
                      }))
                    }
                    className="input"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={end?.lon || ''}
                    onChange={(e) =>
                      setEnd((prev) => ({
                        lat: prev?.lat || 0,
                        lon: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculateRoute}
                disabled={loading || !start || !end || backendConnected === false}
                className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating...
                  </span>
                ) : backendConnected === false ? (
                  'Backend Offline'
                ) : (
                  'Calculate Route'
                )}
              </button>
            </div>
          </div>

          {/* Route Info */}
          {routeInfo && (
            <div className="card bg-primary-50 border-primary-200">
              <h3 className="font-semibold text-primary-900 mb-2">Route Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary-700">Distance:</span>
                  <span className="font-medium text-primary-900">
                    {routeInfo.distance.toFixed(2)} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Mode:</span>
                  <span className="font-medium text-primary-900 capitalize">
                    {routeInfo.mode}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SOS Button */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Emergency SOS</h2>
            {!sosActive ? (
              <button
                onClick={handleActivateSOS}
                disabled={!currentLocation}
                className="w-full btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="h-5 w-5 inline mr-2" />
                Activate SOS
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-danger-50 rounded-lg">
                  <p className="text-sm text-danger-700">
                    SOS is active. Your location is being shared with guardians.
                  </p>
                </div>
                <button
                  onClick={handleDeactivateSOS}
                  className="w-full btn btn-secondary"
                >
                  Deactivate SOS
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-2">
          <Map
            start={start}
            end={end}
            route={route}
            currentLocation={currentLocation}
            height="800px"
          />
        </div>
      </div>
    </div>
  )
}

