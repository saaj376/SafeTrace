import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Coordinate } from '../services/api'

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface MapProps {
  start?: Coordinate | null
  end?: Coordinate | null
  route?: Coordinate[]
  currentLocation?: Coordinate | null
  onMapClick?: (lat: number, lon: number) => void
  height?: string
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom || map.getZoom())
  }, [center, zoom, map])
  
  return null
}

// Component to fit map bounds to route
function FitBounds({ route }: { route: Coordinate[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(
        route.map(coord => [coord.lat, coord.lon] as [number, number])
      )
      // Add padding
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [route, map])
  
  return null
}

export default function Map({
  start,
  end,
  route,
  currentLocation,
  onMapClick,
  height = '600px',
}: MapProps) {
  const defaultCenter: [number, number] = [40.7128, -74.0060] // NYC default
  const defaultZoom = 13

  // Determine map center
  const mapCenter: [number, number] = 
    currentLocation 
      ? [currentLocation.lat, currentLocation.lon]
      : start 
      ? [start.lat, start.lon]
      : end
      ? [end.lat, end.lon]
      : defaultCenter

  const mapZoom = start || currentLocation || end ? 14 : defaultZoom

  // Polyline color based on route mode
  const getRouteColor = () => {
    // Default safe route color (green)
    return '#22c55e'
  }

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-lg border border-gray-200" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        {route && route.length > 0 && <FitBounds route={route} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {start && (
          <Marker
            position={[start.lat, start.lon]}
            icon={DefaultIcon}
          />
        )}
        
        {end && (
          <Marker
            position={[end.lat, end.lon]}
            icon={L.icon({
              ...DefaultIcon.options,
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
                  <path fill="#ef4444" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.1 12.5 28.5 12.5 28.5S25 20.6 25 12.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
                </svg>
              `),
            })}
          />
        )}
        
        {currentLocation && (
          <Marker
            position={[currentLocation.lat, currentLocation.lon]}
            icon={L.icon({
              ...DefaultIcon.options,
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="#0ea5e9" opacity="0.8"/>
                  <circle cx="10" cy="10" r="4" fill="#ffffff"/>
                </svg>
              `),
            })}
          />
        )}
        
        {route && route.length > 0 && (
          <Polyline
            positions={route.map(coord => [coord.lat, coord.lon] as [number, number])}
            color={getRouteColor()}
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  )
}

