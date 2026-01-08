import React from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Activity } from '../../types';

const libraries: ("places")[] = ["places"];

interface MapViewProps {
  activities: Activity[];
  center?: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 40.7128, // New York City
  lng: -74.0060,
};

function MapView({ activities, center }: MapViewProps) {
  const [selectedActivity, setSelectedActivity] = React.useState<Activity | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  // Calculate center from activities if not provided
  const mapCenter = React.useMemo(() => {
    if (center) return center;
    if (activities.length === 0) return defaultCenter;
    
    // Average of all activity locations
    const avgLat = activities.reduce((sum, a) => sum + a.location.lat, 0) / activities.length;
    const avgLng = activities.reduce((sum, a) => sum + a.location.lng, 0) / activities.length;
    return { lat: avgLat, lng: avgLng };
  }, [activities, center]);

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  return (
    <div style={{ marginTop: '30px' }}>
      <h3>Map View</h3>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={12}
        center={mapCenter}
      >
        {activities.map((activity) => (
          <Marker
            key={activity.id}
            position={activity.location}
            onClick={() => setSelectedActivity(activity)}
            icon={{
              url: getMarkerIcon(activity.type),
              scaledSize: new window.google.maps.Size(40, 40),
            }}
          />
        ))}

        {selectedActivity && (
          <InfoWindow
            position={selectedActivity.location}
            onCloseClick={() => setSelectedActivity(null)}
          >
            <div style={{ maxWidth: '200px' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>{selectedActivity.name}</h4>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>{selectedActivity.address}</p>
              {selectedActivity.rating && (
                <p style={{ margin: '4px 0', fontSize: '13px' }}>
                  ⭐ {selectedActivity.rating}
                </p>
              )}
              {selectedActivity.photoUrl && (
                <img 
                  src={selectedActivity.photoUrl} 
                  alt={selectedActivity.name}
                  style={{ width: '100%', marginTop: '8px', borderRadius: '4px' }}
                />
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

// Get appropriate marker icon based on activity type
function getMarkerIcon(type: Activity['type']): string {
  const icons = {
    attraction: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    restaurant: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    hotel: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    other: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  };
  return icons[type];
}

export default MapView;