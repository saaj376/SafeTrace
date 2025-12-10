export interface ItineraryDay {
  day: number
  title: string
  activities: {
    time: string
    activity: string
    location: string
    duration: string
  }[]
}

export interface Itinerary {
  destination: string
  days: number
  itinerary: ItineraryDay[]
  packingList: string[]
}

export async function generateItinerary(
  destination: string,
  days: number,
  interests: string[]
): Promise<Itinerary> {
  // Simulate AI generation with realistic travel itinerary
  await new Promise(resolve => setTimeout(resolve, 2000))

  const activities = {
    cultural: ['Visit museums', 'Explore temples', 'Historic sites tour', 'Art gallery visit'],
    food: ['Local food tour', 'Cooking class', 'Street food exploration', 'Fine dining experience'],
    adventure: ['Hiking', 'Water sports', 'Cycling tour', 'Rock climbing'],
    relaxation: ['Beach time', 'Spa visit', 'Yoga session', 'Sunset viewing'],
    shopping: ['Local markets', 'Shopping district', 'Souvenir hunting', 'Craft bazaar']
  }

  const itineraryDays: ItineraryDay[] = []
  
  for (let day = 1; day <= days; day++) {
    const dayActivities = [
      {
        time: '9:00 AM',
        activity: 'Breakfast at local café',
        location: `${destination} City Center`,
        duration: '1 hour'
      },
      {
        time: '10:30 AM',
        activity: interests.includes('cultural') ? 'Visit historic landmarks' : 'Explore local markets',
        location: `${destination} Old Town`,
        duration: '2 hours'
      },
      {
        time: '1:00 PM',
        activity: 'Lunch at recommended restaurant',
        location: `${destination} Downtown`,
        duration: '1.5 hours'
      },
      {
        time: '3:00 PM',
        activity: interests.includes('adventure') ? 'Adventure activity' : 'Museum visit',
        location: `${destination} Cultural District`,
        duration: '2 hours'
      },
      {
        time: '6:00 PM',
        activity: 'Sunset viewing at scenic spot',
        location: `${destination} Viewpoint`,
        duration: '1 hour'
      },
      {
        time: '7:30 PM',
        activity: 'Dinner and local entertainment',
        location: `${destination} Entertainment District`,
        duration: '2 hours'
      }
    ]

    itineraryDays.push({
      day,
      title: day === 1 ? 'Arrival & City Exploration' : 
             day === days ? 'Final Day & Departure' : 
             `${destination} Discovery - Day ${day}`,
      activities: dayActivities
    })
  }

  const packingList = [
    'Passport & Travel Documents',
    'Comfortable walking shoes',
    'Weather-appropriate clothing',
    'Phone charger & power bank',
    'Camera',
    'Sunscreen & sunglasses',
    'Reusable water bottle',
    'First aid kit',
    'Local currency/cards',
    'Travel adapter',
    ...interests.includes('adventure') ? ['Hiking gear', 'Sports wear'] : [],
    ...interests.includes('cultural') ? ['Modest clothing for temples', 'Guidebook'] : []
  ]

  return {
    destination,
    days,
    itinerary: itineraryDays,
    packingList
  }
}
