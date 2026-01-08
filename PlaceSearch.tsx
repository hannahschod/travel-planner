import React, { useState } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Activity } from '../../types';

const libraries: ("places")[] = ["places"];

interface PlaceSearchProps {
  onPlaceSelect: (activity: Activity) => void;
}

function PlaceSearch({ onPlaceSelect }: PlaceSearchProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = async () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      if (place.place_id && place.geometry?.location) {
        try {
          // ✅ Use the NEW Places API (google.maps.places.Place)
          const placeInstance = new google.maps.places.Place({
            id: place.place_id,
          });

          // Fetch photos using the new API
          await placeInstance.fetchFields({
            fields: ['photos'],
          });

          let photoUrl: string | undefined;
          
          if (placeInstance.photos && placeInstance.photos.length > 0) {
            const photo = placeInstance.photos[0];
            // The new API provides getURI() method for permanent URLs
            photoUrl = photo.getURI({ maxWidth: 400 });
            console.log('✅ Got photo URL from new API:', photoUrl);
          } else {
            console.log('❌ No photos available for this place');
          }

          // Create activity
          const activity: Activity = {
            id: Date.now().toString(),
            placeId: place.place_id,
            name: place.name || 'Unknown Place',
            address: place.formatted_address || '',
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            type: determineActivityType(place.types || []),
            rating: place.rating,
            photoUrl: photoUrl,
            openingHours: place.opening_hours?.weekday_text,
            phoneNumber: place.formatted_phone_number,
            website: place.website,
          };

          console.log('Created activity:', activity.name, 'with photo:', !!photoUrl);
          onPlaceSelect(activity);
          setSearchInput('');
        } catch (error) {
          console.error('Error fetching place details:', error);
          
          // Create activity without photo if error
          const activity: Activity = {
            id: Date.now().toString(),
            placeId: place.place_id,
            name: place.name || 'Unknown Place',
            address: place.formatted_address || '',
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            type: determineActivityType(place.types || []),
            rating: place.rating,
            openingHours: place.opening_hours?.weekday_text,
            phoneNumber: place.formatted_phone_number,
            website: place.website,
          };

          onPlaceSelect(activity);
          setSearchInput('');
        }
      }
    }
  };

  const determineActivityType = (types: string[]): Activity['type'] => {
    if (types.includes('restaurant') || types.includes('cafe') || types.includes('food')) {
      return 'restaurant';
    }
    if (types.includes('lodging') || types.includes('hotel')) {
      return 'hotel';
    }
    if (types.includes('tourist_attraction') || types.includes('museum') || types.includes('park')) {
      return 'attraction';
    }
    return 'other';
  };

  if (!isLoaded) {
    return <div>Loading Maps...</div>;
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>Search for Places</h3>
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search for restaurants, attractions, hotels..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #2B579A',
            borderRadius: '8px',
            boxSizing: 'border-box'
          }}
        />
      </Autocomplete>
      <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
        Start typing to search places using Google Maps
      </p>
    </div>
  );
}

export default PlaceSearch;
