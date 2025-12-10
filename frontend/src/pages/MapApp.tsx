import { useState, useEffect, useRef } from 'react'
import { Navigation, Shield, AlertTriangle, Radio, X, Star } from 'lucide-react'
import Map from '../components/Map'
import { Modal } from '../components/ui/modal'
import {
  calculateRoute,
  checkSafetyStatus,
  activateSOS,
  updateLocation,
  deactivateSOS,
  healthCheck,
  submitRouteFeedback,
  Coordinate,
  RouteResponse,
  AlertResponse,
  SegmentInfo,
} from '../services/api'
import { geocodeLocation, searchLocations, GeocodingResult } from '../services/geocoding'
import clsx from 'clsx'

type RouteMode = 'safe' | 'balanced' | 'stealth' | 'escort'

export default function MapApp() {
  const [startLocation, setStartLocation] = useState<string>('')
  const [endLocation, setEndLocation] = useState<string>('')
  const [start, setStart] = useState<Coordinate | null>(null)
  const [end, setEnd] = useState<Coordinate | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [startSuggestions, setStartSuggestions] = useState<GeocodingResult[]>([])
  const [endSuggestions, setEndSuggestions] = useState<GeocodingResult[]>([])
  const [route, setRoute] = useState<Coordinate[]>([])
  const [mode, setMode] = useState<RouteMode>('safe')
  const [loading, setLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null)
  const [sosActive, setSosActive] = useState(false)
  const [sosToken, setSosToken] = useState<string | null>(null)
  const [alertResponse, setAlertResponse] = useState<AlertResponse | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; mode: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  
  // Journey tracking states
  const [journeyStarted, setJourneyStarted] = useState(false)
  const [journeyStartTime, setJourneyStartTime] = useState<Date | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [overallRating, setOverallRating] = useState(0)
  const [segmentReviews, setSegmentReviews] = useState<{ [key: number]: { hasIssue: boolean; rating: number } }>({})
  const [routeSegments, setRouteSegments] = useState<SegmentInfo[]>([])
  
  const monitoringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sosIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startSuggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endSuggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigationStartedRef = useRef<boolean>(false)

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
      setError('Please enter both start and end locations')
      setTimeout(() => setError(null), 5000)
      return
    }

    setLoading(true)
    setError(null)
    setRoute([]) // Clear previous route
    setRouteInfo(null)
    
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
      
      // Store segment information
      if (response.segments) {
        setRouteSegments(response.segments)
        console.log(`[FRONTEND] Route has ${response.segments.length} segments`)
      }
      
      startNavigation(response.route_coords, {
        distanceKm: response.distance_approx_km,
        mode,
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
      navigationStartedRef.current = false
    } finally {
      setLoading(false)
    }
  }

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  const calculateBearing = (a: Coordinate, b: Coordinate) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const dLon = toRad(b.lon - a.lon)
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    const bearing = (Math.atan2(y, x) * 180) / Math.PI
    return (bearing + 360) % 360
  }

  const bearingToDirection = (bearing: number) => {
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
    const index = Math.round(bearing / 45) % 8
    return directions[index]
  }

  const segmentDistanceKm = (a: Coordinate, b: Coordinate) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const R = 6371 // km
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lon - a.lon)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  }

  const startNavigation = (
    routeCoords: Coordinate[],
    summary?: { distanceKm?: number; mode?: RouteMode }
  ) => {
    if (!routeCoords.length) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    // Avoid restarting the prompt if the same route is re-set
    if (navigationStartedRef.current) {
      window.speechSynthesis.cancel()
    }

    navigationStartedRef.current = true
    const messages: string[] = []

    const distancePart = summary?.distanceKm
      ? `about ${summary.distanceKm.toFixed(1)} kilometers`
      : 'the planned route'

    messages.push(
      `Starting ${summary?.mode || 'safe'} navigation. Route is ${distancePart}.`
    )

    if (routeCoords.length >= 2) {
      const first = routeCoords[0]
      const second = routeCoords[1]
      const bearing = calculateBearing(first, second)
      const direction = bearingToDirection(bearing)
      const legDistance = segmentDistanceKm(first, second)
      messages.push(
        `Head ${direction} on the first segment for roughly ${legDistance.toFixed(2)} kilometers.`
      )
    }

    messages.push('Navigation voice prompts are active. Watch for safety alerts during your trip.')

    messages.forEach((text) => speak(text))
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
          setAlertResponse(alertResponse)
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

  const handleStartJourney = () => {
    setJourneyStarted(true)
    setJourneyStartTime(new Date())
    
    // Initialize segment reviews using actual segment IDs from the route
    const initialReviews: { [key: number]: { hasIssue: boolean; rating: number } } = {}
    routeSegments.forEach(segment => {
      initialReviews[segment.segment_id] = { hasIssue: false, rating: 0 }
    })
    setSegmentReviews(initialReviews)
    
    speak('Journey started. Stay safe!')
  }

  const handleEndJourney = () => {
    setJourneyStarted(false)
    setShowReviewModal(true)
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current)
    }
    
    speak('Journey ended. Please provide your feedback.')
  }

  const handleSubmitReview = async () => {
    try {
      // Prepare segment feedback only for segments with issues
      const segmentFeedback = Object.entries(segmentReviews)
        .filter(([_, data]) => data.hasIssue && data.rating > 0)
        .map(([segmentId, data]) => ({
          segment_id: parseInt(segmentId),
          rating: data.rating
        }))
      
      console.log('Overall Rating:', overallRating)
      console.log('Segment Feedback:', segmentFeedback)
      
      // Send feedback to backend using API service
      const result = await submitRouteFeedback({
        overall_rating: overallRating,
        segment_feedback: segmentFeedback,
        route_mode: mode
      })
      
      if (result.success) {
        alert(result.message)
        speak('Thank you for your feedback!')
      } else {
        throw new Error('Failed to submit feedback')
      }
      
      // Reset states
      setShowReviewModal(false)
      setOverallRating(0)
      setSegmentReviews({})
      setRouteSegments([])
      setRoute([])
      setRouteInfo(null)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    }
  }

  const toggleSegmentIssue = (segmentId: number) => {
    setSegmentReviews(prev => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        hasIssue: !prev[segmentId].hasIssue
      }
    }))
  }

  const updateSegmentRating = (segmentId: number, rating: number) => {
    setSegmentReviews(prev => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        rating
      }
    }))
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              SafeRoute Planner
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Intelligent safety routing with real-time hazard monitoring
            </p>
          </div>
          {backendConnected !== null && (
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${backendConnected ? 'bg-success-500' : 'bg-danger-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
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
      {alertResponse && alertResponse.alert_type && (
        <div className="mb-6 card bg-danger-50 border-danger-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-danger-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-danger-900">{alertResponse.alert_type}</h3>
                <p className="text-danger-700 mt-1">{alertResponse.message}</p>
                {alertResponse.action_required && (
                  <button
                    onClick={() => {
                      setAlertResponse(null)
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
              onClick={() => setAlertResponse(null)}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map Section - Full width on mobile, 8 cols on desktop */}
        <div className="lg:col-span-8 order-2 lg:order-1">
          <div className="card p-0 overflow-hidden relative z-0">
            <Map
              start={start}
              end={end}
              route={route}
              currentLocation={currentLocation}
              height="500px"
            />
          </div>
          
          {/* Route Info - Below map */}
          {routeInfo && (
            <div className="mt-4 card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
              <h3 className="font-semibold text-primary-900 dark:text-white mb-3 flex items-center">
                <Navigation className="h-5 w-5 mr-2" />
                Route Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Distance</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {routeInfo.distance.toFixed(2)} km
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Mode</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                    {routeInfo.mode}
                  </span>
                </div>
                {routeSegments.length > 0 && (
                  <>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Segments</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {routeSegments.length}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Avg Safety</span>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {(routeSegments.reduce((acc, seg) => acc + seg.score, 0) / routeSegments.length * 100).toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls Section - Full width on mobile, 4 cols on desktop */}
        <div className="lg:col-span-4 order-1 lg:order-2 space-y-4">
          {/* Route Mode Selection */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary-600" />
              Route Mode
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {modeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setMode(option.value)}
                    className={clsx(
                      'p-3 rounded-lg border-2 transition-all text-left',
                      mode === option.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <Icon className={clsx(
                      'h-4 w-4 mb-1',
                      mode === option.value ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
                    )} />
                    <div className={clsx(
                      'font-medium text-xs',
                      mode === option.value ? 'text-primary-900 dark:text-primary-200' : 'text-gray-900 dark:text-white'
                    )}>{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{option.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Start/End Points */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Navigation className="h-5 w-5 mr-2 text-primary-600" />
              Locations
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Point
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter start location (e.g., 'Marina Bay, Singapore')"
                      value={startLocation}
                      onChange={(e) => {
                        e.stopPropagation()
                        const value = e.target.value
                        setStartLocation(value)
                        if (startSuggestTimeout.current) clearTimeout(startSuggestTimeout.current)
                        if (!value.trim()) {
                          setStartSuggestions([])
                          return
                        }
                        startSuggestTimeout.current = setTimeout(async () => {
                          const results = await searchLocations(value)
                          setStartSuggestions(results)
                        }, 250)
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                      onKeyPress={(e) => e.stopPropagation()}
                      className="input w-full"
                      autoComplete="off"
                    />
                    {startSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {startSuggestions.map((s) => (
                          <button
                            key={`${s.lat}-${s.lon}`}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                            onClick={() => {
                              setStart({ lat: s.lat, lon: s.lon })
                              setStartLocation(s.name)
                              setStartSuggestions([])
                            }}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      setGeocodingLoading(true)
                      const result = await geocodeLocation(startLocation)
                      if (result) {
                        setStart({ lat: result.lat, lon: result.lon })
                        setStartLocation(result.name)
                        setStartSuggestions([])
                      } else {
                        setError('Location not found. Please try another search.')
                      }
                      setGeocodingLoading(false)
                    }}
                    disabled={geocodingLoading || !startLocation.trim()}
                    className="btn btn-secondary disabled:opacity-50 px-3 py-2"
                  >
                    Search
                  </button>
                </div>
                {currentLocation && (
                  <button
                    onClick={() => {
                      setStart(currentLocation)
                      setStartLocation('Current Location')
                      setStartSuggestions([])
                    }}
                    className="mt-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700"
                  >
                    📍 Use Current Location
                  </button>
                )}
                {start && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ ({start.lat.toFixed(4)}, {start.lon.toFixed(4)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Point
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter end location (e.g., 'Gardens by the Bay, Singapore')"
                      value={endLocation}
                      onChange={(e) => {
                        e.stopPropagation()
                        const value = e.target.value
                        setEndLocation(value)
                        if (endSuggestTimeout.current) clearTimeout(endSuggestTimeout.current)
                        if (!value.trim()) {
                          setEndSuggestions([])
                          return
                        }
                        endSuggestTimeout.current = setTimeout(async () => {
                          const results = await searchLocations(value)
                          setEndSuggestions(results)
                        }, 250)
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                      onKeyPress={(e) => e.stopPropagation()}
                      className="input w-full"
                      autoComplete="off"
                    />
                    {endSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {endSuggestions.map((s) => (
                          <button
                            key={`${s.lat}-${s.lon}`}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                            onClick={() => {
                              setEnd({ lat: s.lat, lon: s.lon })
                              setEndLocation(s.name)
                              setEndSuggestions([])
                            }}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      setGeocodingLoading(true)
                      const result = await geocodeLocation(endLocation)
                      if (result) {
                        setEnd({ lat: result.lat, lon: result.lon })
                        setEndLocation(result.name)
                        setEndSuggestions([])
                      } else {
                        setError('Location not found. Please try another search.')
                      }
                      setGeocodingLoading(false)
                    }}
                    disabled={geocodingLoading || !endLocation.trim()}
                    className="btn btn-secondary disabled:opacity-50 px-3 py-2"
                  >
                    Search
                  </button>
                </div>
                {end && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ ({end.lat.toFixed(4)}, {end.lon.toFixed(4)})
                  </p>
                )}
              </div>

              <button
                onClick={handleCalculateRoute}
                disabled={loading || !start || !end || backendConnected === false}
                className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 font-medium"
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

              {/* Journey Control Buttons */}
              {route.length > 0 && !journeyStarted && (
                <button
                  onClick={handleStartJourney}
                  className="w-full btn bg-green-600 hover:bg-green-700 text-white py-3 font-medium mt-3"
                >
                  🚀 Start Journey
                </button>
              )}
              
              {journeyStarted && (
                <button
                  onClick={handleEndJourney}
                  className="w-full btn bg-red-600 hover:bg-red-700 text-white py-3 font-medium mt-3"
                >
                  🏁 End Journey
                </button>
              )}
            </div>
          </div>

          {/* SOS Button */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Emergency SOS
            </h2>
            {!sosActive ? (
              <button
                onClick={handleActivateSOS}
                disabled={!currentLocation}
                className="w-full btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed py-3 font-medium"
              >
                <AlertTriangle className="h-5 w-5 inline mr-2" />
                Activate SOS
              </button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400">
                    🚨 SOS is active. Your location is being shared.
                  </p>
                </div>
                <button
                  onClick={handleDeactivateSOS}
                  className="w-full btn btn-secondary py-2"
                >
                  Deactivate SOS
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-2 hidden">
        </div>
      </div>

      {/* Journey Review Modal */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Rate Your Journey">
        <div className="space-y-6">
          {/* Journey Summary */}
          {journeyStartTime && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Journey Summary</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Duration: {Math.round((new Date().getTime() - journeyStartTime.getTime()) / 60000)} minutes</p>
                <p>Distance: {routeInfo?.distance.toFixed(2)} km</p>
                <p>Mode: {routeInfo?.mode}</p>
                <p>Segments: {routeSegments.length} street segments</p>
                {routeSegments.length > 0 && (
                  <p className="pt-1 border-t border-gray-200 dark:border-gray-700">
                    Average Safety Score: {' '}
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {(routeSegments.reduce((acc, seg) => acc + seg.score, 0) / routeSegments.length * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Overall Route Rating
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setOverallRating(rating)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      rating <= overallRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                {overallRating > 0 ? `${overallRating}/5` : 'Select rating'}
              </span>
            </div>
          </div>

          {/* Segment-by-Segment Review */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Segment-by-Segment Issues (Optional)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Check any segments that had issues and rate them separately
            </p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {routeSegments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No segment data available for this route
                </p>
              ) : (
                routeSegments.map((segment) => {
                  const scorePercentage = (segment.score * 100).toFixed(0)
                  const scoreColor = segment.score >= 0.8 ? 'text-green-600 dark:text-green-400' : 
                                    segment.score >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' : 
                                    'text-red-600 dark:text-red-400'
                  
                  return (
                    <div
                      key={segment.segment_id}
                      className={`border rounded-lg p-4 transition-all ${
                        segmentReviews[segment.segment_id]?.hasIssue
                          ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center space-x-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={segmentReviews[segment.segment_id]?.hasIssue || false}
                            onChange={() => toggleSegmentIssue(segment.segment_id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              Segment #{segment.segment_id}
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className={`text-xs font-semibold ${scoreColor}`}>
                                Safety: {scorePercentage}%
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                📊 {segment.num_feedback} {segment.num_feedback === 1 ? 'review' : 'reviews'}
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                      
                      {segmentReviews[segment.segment_id]?.hasIssue && (
                        <div className="mt-3 pl-7 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            How safe did you feel on this segment?
                          </label>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => updateSegmentRating(segment.segment_id, rating)}
                                className="focus:outline-none transition-transform hover:scale-110"
                                title={`${rating} star${rating > 1 ? 's' : ''}`}
                              >
                                <Star
                                  className={`w-6 h-6 ${
                                    rating <= (segmentReviews[segment.segment_id]?.rating || 0)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="ml-3 text-xs text-gray-600 dark:text-gray-400 font-medium">
                              {segmentReviews[segment.segment_id]?.rating > 0 
                                ? `${segmentReviews[segment.segment_id].rating}/5 ⭐` 
                                : 'Select rating'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={overallRating === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Review
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

