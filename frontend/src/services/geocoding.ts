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
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) throw new Error('Geocoding request failed')

    const results = await response.json()
    return (results || []).map((result: any) => ({
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      name: result.display_name || locationText,
    }))
  } catch (error) {
    console.error('Geocoding search error:', error)
    return []
  }
}

export async function geocodeLocation(locationText: string): Promise<GeocodingResult | null> {
  if (!locationText.trim()) return null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) throw new Error('Geocoding request failed')

    const results = await response.json()
    if (results.length === 0) return null

    const result = results[0]
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      name: result.display_name || locationText,
    }
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
