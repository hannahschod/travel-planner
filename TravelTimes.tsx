import React, { useEffect, useState } from 'react';
import { Activity, Flight, Accommodation } from '../../types';

interface TravelTimesProps {
  activities: Activity[];
  flights: Flight[];
  accommodations: Accommodation[];
  scheduledItems?: ScheduledItem[]; // Optional: for integrated schedule view
}

interface ScheduledItem {
  type: 'activity' | 'flight' | 'accommodation';
  location?: { lat: number; lng: number };
  name: string;
  time: string;
  day: number;
}

interface TravelTime {
  from: string;
  to: string;
  duration: string;
  durationValue: number; // in seconds
  distance: string;
  mode: string;
}

function TravelTimes({ activities, flights, accommodations, scheduledItems }: TravelTimesProps) {
  const [travelTimes, setTravelTimes] = useState<TravelTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'TRANSIT'>('DRIVING');
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  useEffect(() => {
    // Build ordered list of locations from scheduled items
    const getOrderedLocations = () => {
      if (scheduledItems) {
        // Use provided scheduled items
        return scheduledItems
          .filter(item => item.location)
          .map(item => ({
            name: item.name,
            location: item.location!,
          }));
      } else {
        // Fall back to activities only
        return activities.map(a => ({
          name: a.name,
          location: a.location,
        }));
      }
    };

    const locations = getOrderedLocations();
    
    if (locations.length < 2) {
      setTravelTimes([]);
      return;
    }

    const calculateTravelTimes = async () => {
      if (!window.google || !window.google.maps) {
        console.log('Google Maps not loaded yet');
        return;
      }

      setLoading(true);
      const times: TravelTime[] = [];
      const directionsService = new google.maps.DirectionsService();

      for (let i = 0; i < locations.length - 1; i++) {
        const origin = locations[i].location;
        const destination = locations[i + 1].location;

        try {
          const result = await directionsService.route({
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            travelMode: google.maps.TravelMode[travelMode],
          });

          if (result.routes[0]) {
            const leg = result.routes[0].legs[0];
            times.push({
              from: locations[i].name,
              to: locations[i + 1].name,
              duration: leg.duration?.text || 'Unknown',
              durationValue: leg.duration?.value || 0,
              distance: leg.distance?.text || 'Unknown',
              mode: travelMode === 'DRIVING' ? 'car' : 'transit',
            });
          }
        } catch (error) {
          console.error('Error calculating travel time:', error);
          // Add placeholder for failed calculation
          times.push({
            from: locations[i].name,
            to: locations[i + 1].name,
            duration: 'N/A',
            durationValue: 0,
            distance: 'N/A',
            mode: travelMode === 'DRIVING' ? 'car' : 'transit',
          });
        }
      }

      setTravelTimes(times);
      setLoading(false);
    };

    const timer = setTimeout(calculateTravelTimes, 500);
    return () => clearTimeout(timer);
  }, [activities, flights, accommodations, travelMode, scheduledItems]);

  // Build ordered list for the early return check
  const locations = scheduledItems 
    ? scheduledItems.filter(item => item.location)
    : activities;
  
  if (locations.length < 2) {
    return null;
  }

  const totalDuration = travelTimes.reduce((sum, time) => sum + time.durationValue, 0);
  const formatTotalTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h3 style={{ margin: 0 }}>🚗 Travel Times Between Locations</h3>
          {!loading && travelTimes.length > 0 && (
            <span style={{ fontSize: '14px', color: '#666' }}>
              Total: {formatTotalTime(totalDuration)}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2B579A',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {isExpanded ? '▼ Collapse' : '▶ Expand'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '8px', marginBottom: '15px' }}>
            <button
              onClick={() => setTravelMode('DRIVING')}
              style={{
                padding: '8px 16px',
                backgroundColor: travelMode === 'DRIVING' ? '#2B579A' : 'white',
                color: travelMode === 'DRIVING' ? 'white' : '#666',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: travelMode === 'DRIVING' ? 'bold' : 'normal',
                fontSize: '14px',
              }}
            >
              🚗 By Car
            </button>
            <button
              onClick={() => setTravelMode('TRANSIT')}
              style={{
                padding: '8px 16px',
                backgroundColor: travelMode === 'TRANSIT' ? '#2B579A' : 'white',
                color: travelMode === 'TRANSIT' ? 'white' : '#666',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: travelMode === 'TRANSIT' ? 'bold' : 'normal',
                fontSize: '14px',
              }}
            >
              🚇 Public Transit
            </button>
          </div>

          {loading ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              color: '#666'
            }}>
              <div style={{ marginBottom: '10px' }}>⏳</div>
              Calculating travel times via {travelMode === 'DRIVING' ? 'car' : 'public transit'}...
            </div>
          ) : (
            <>
              {/* Summary */}
              {totalDuration > 0 && (
                <div style={{
                  padding: '15px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  marginBottom: '15px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1565c0' }}>
                Total Travel Time: {formatTotalTime(totalDuration)}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                Via {travelMode === 'DRIVING' ? 'car 🚗' : 'public transit 🚇'}
              </div>
            </div>
          )}

          {/* Travel Time Details */}
          <div style={{ marginTop: '15px' }}>
            {travelTimes.map((time, index) => (
              <div
                key={index}
                style={{
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${travelMode === 'DRIVING' ? '#28a745' : '#2B579A'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>📍 {time.from}</span>
                  <span style={{ color: '#666', fontSize: '18px' }}>→</span>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>📍 {time.to}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#666', display: 'flex', gap: '15px' }}>
                  <span>{travelMode === 'DRIVING' ? '🚗' : '🚇'} {time.duration}</span>
                  <span>📏 {time.distance}</span>
                </div>
              </div>
            ))}
          </div>

          {travelTimes.length === 0 && !loading && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#fff3cd',
              borderRadius: '8px',
              color: '#856404',
            }}>
              Unable to calculate travel times. Please check your locations have valid addresses.
            </div>
          )}
        </>
      )}
      </>
    )}
    </div>
  );
}

export default TravelTimes;
