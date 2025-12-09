// Simple geocoding service - converts location text to coordinates
// Using Open Street Map's Nominatim API (free, no key required)

export interface GeocodingResult {
  lat: number
  lon: number
  name: string
}

export async function searchLocations(locationText: string, limit = 5): Promise<GeocodingResult[]> {
  if (!locationText.trim()) return []

  try {
    // Bias search towards Chennai, Tamil Nadu, India
    const searchQuery = locationText.toLowerCase().includes('chennai') || 
                       locationText.toLowerCase().includes('tamil nadu') || 
                       locationText.toLowerCase().includes('india')
      ? locationText
      : `${locationText}, Chennai, Tamil Nadu, India`
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=${limit}&bounded=1&viewbox=80.14,13.23,80.33,12.85`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) throw new Error('Geocoding request failed')

    const results = await response.json()
    
    // Filter results to only include those within Chennai bounds (with some tolerance)
    const chennaiResults = (results || [])
      .map((result: any) => ({
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        name: result.display_name || locationText,
      }))
      .filter((result: GeocodingResult) => 
        result.lat >= 12.80 && result.lat <= 13.28 && 
        result.lon >= 80.10 && result.lon <= 80.38
      )
    
    return chennaiResults
  } catch (error) {
    console.error('Geocoding search error:', error)
    return []
  }
}

export async function geocodeLocation(locationText: string): Promise<GeocodingResult | null> {
  if (!locationText.trim()) return null

  try {
    // Bias search towards Chennai, Tamil Nadu, India
    const searchQuery = locationText.toLowerCase().includes('chennai') || 
                       locationText.toLowerCase().includes('tamil nadu') || 
                       locationText.toLowerCase().includes('india')
      ? locationText
      : `${locationText}, Chennai, Tamil Nadu, India`
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&bounded=1&viewbox=80.14,13.23,80.33,12.85`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) throw new Error('Geocoding request failed')

    const results = await response.json()
    if (results.length === 0) return null

    // Find the first result within Chennai bounds
    for (const result of results) {
      const lat = parseFloat(result.lat)
      const lon = parseFloat(result.lon)
      
      // Check if within Chennai bounds (with some tolerance)
      if (lat >= 12.80 && lat <= 13.28 && lon >= 80.10 && lon <= 80.38) {
        return {
          lat,
          lon,
          name: result.display_name || locationText,
        }
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) throw new Error('Reverse geocoding request failed')

    const result = await response.json()
    return result.address?.city || result.address?.town || result.display_name || null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
