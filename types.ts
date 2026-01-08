// Trip represents a full travel plan
export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt: Date;
  updatedAt: Date;
  activities: Activity[];
  // NEW:
  flights: Flight[];
  accommodations: Accommodation[];
  transportation: Transportation[];
}

// Activity represents a place to visit
export interface Activity {
  id: string;
  placeId: string;  // Google Places ID
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  type: 'attraction' | 'restaurant' | 'hotel' | 'other';
  duration?: number;  // minutes
  rating?: number;
  photoUrl?: string;
  openingHours?: string[];
  phoneNumber?: string;
  website?: string;
}

// For Google Places search results
export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  rating?: number;
  photos?: any[];
  types?: string[];
}

export interface Activity {
  id: string;
  placeId: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  type: 'restaurant' | 'hotel' | 'attraction' | 'other';
  rating?: number;
  photoUrl?: string;
  openingHours?: string[];
  phoneNumber?: string;
  website?: string;
  duration?: number;
  // NEW: Manual scheduling
  manualSchedule?: {
    day: number;
    time: string; // "17:00" format
  };
}

export interface FlightSegment {
  id: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  departureDate: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalDate: string;
  arrivalTime: string;
  duration?: number;
  isLayover?: boolean;
}

export interface Flight {
  id: string;
  type: 'outbound' | 'return';
  segments: FlightSegment[];
  notes?: string;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string; // "2025-12-15"
  checkInTime: string; // "15:00"
  checkOut: string; // "2025-12-17"
  checkOutTime: string; // "11:00"
  confirmationNumber?: string;
}

export interface Transportation {
  id: string;
  type: 'rental_car' | 'train' | 'bus' | 'taxi' | 'other';
  date: string;
  time: string;
  from: string;
  to: string;
  confirmationNumber?: string;
  notes?: string;
}