import React, { useState } from 'react';
import { Activity } from '../../types';
import axios from 'axios';

interface ImportFromGoogleMapsProps {
  onPlacesImported: (activities: Activity[]) => void;
}

function ImportFromGoogleMaps({ onPlacesImported }: ImportFromGoogleMapsProps) {
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!googleMapsUrl.trim()) {
      setError('Please enter a Google Maps link');
      return;
    }

    if (!googleMapsUrl.includes('google.com/maps') && !googleMapsUrl.includes('maps.app.goo.gl')) {
      setError('Invalid link. Must be a Google Maps shared list link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Fetching Google Maps URL:', googleMapsUrl);

      // Try to fetch with CORS proxy
      let html = '';
      try {
        // First try: AllOrigins
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleMapsUrl)}`;
        const response = await axios.get(proxyUrl, { timeout: 10000 });
        html = response.data.contents;
        console.log('Got response from AllOrigins');
      } catch (proxyError) {
        console.log('AllOrigins failed, trying corsproxy...');
        // Fallback: Try cors-anywhere alternative
        try {
          const fallbackUrl = `https://corsproxy.io/?${encodeURIComponent(googleMapsUrl)}`;
          const response = await axios.get(fallbackUrl, { timeout: 10000 });
          html = response.data;
          console.log('Got response from corsproxy');
        } catch (err) {
          throw new Error('Both CORS proxies failed. Try using the full Google Maps URL instead of a shortened link.');
        }
      }

      // Extract place IDs from HTML
      const placeIdRegex = /ChIJ[\w-]+/g;
      const matches = html.match(placeIdRegex);

      if (!matches || matches.length === 0) {
        setError('No places found in this link. Make sure the list is public or unlisted.');
        setLoading(false);
        return;
      }

      const uniquePlaceIds = Array.from(new Set(matches)).slice(0, 20) as string[];
      console.log(`Found ${uniquePlaceIds.length} place IDs`);

      // Now fetch details from Google Places API for each place
      const activities: Activity[] = [];
      
      for (const placeId of uniquePlaceIds as string[]) {
        try {
          // ✅ Use the NEW Places API (google.maps.places.Place)
          const placeInstance = new google.maps.places.Place({
            id: placeId,
          });

          // Fetch all the details we need
          await placeInstance.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'types', 'rating', 'photos', 'regularOpeningHours', 'nationalPhoneNumber', 'websiteURI'],
          });

          if (placeInstance.location) {
            // Get photo URL using new API
            let photoUrl: string | undefined;
            if (placeInstance.photos && placeInstance.photos.length > 0) {
              photoUrl = placeInstance.photos[0].getURI({ maxWidth: 400 });
              console.log(`✅ Got photo URL for ${placeInstance.displayName}`);
            } else {
              console.log(`❌ No photos available for ${placeInstance.displayName}`);
            }

            const activity: Activity = {
              id: Date.now().toString() + Math.random(),
              placeId: placeId,
              name: placeInstance.displayName || 'Unknown Place',
              address: placeInstance.formattedAddress || '',
              location: {
                lat: placeInstance.location.lat(),
                lng: placeInstance.location.lng(),
              },
              type: determineActivityType(placeInstance.types || []),
              rating: placeInstance.rating ?? undefined, // Convert null to undefined
              photoUrl: photoUrl,
              openingHours: placeInstance.regularOpeningHours?.weekdayDescriptions,
              phoneNumber: placeInstance.nationalPhoneNumber ?? undefined, // Convert null to undefined
              website: placeInstance.websiteURI ?? undefined, // Convert null to undefined
            };

            activities.push(activity);
            console.log(`Added: ${activity.name}`);
          }
        } catch (err) {
          console.error(`Error fetching details for ${placeId}:`, err);
        }
      }

      if (activities.length > 0) {
        onPlacesImported(activities);
        setGoogleMapsUrl('');
        alert(`✅ Successfully imported ${activities.length} places!`);
      } else {
        setError('Found place IDs but could not fetch details. Try again.');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError('Failed to import. The link might not be accessible or the list is private.');
    } finally {
      setLoading(false);
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

  return (
    <div style={{ 
      marginBottom: '30px', 
      padding: '20px', 
      backgroundColor: '#fff3cd', 
      borderRadius: '12px',
      border: '2px solid #ffc107'
    }}>
      <h3 style={{ marginTop: 0 }}>🔗 Import from Google Maps</h3>
      <p style={{ color: '#856404', marginBottom: '15px' }}>
        Paste a link to your Google Maps saved list (must be public or unlisted)
      </p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input
          type="text"
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
          placeholder="https://www.google.com/maps/placelists/list/..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #ffc107',
            borderRadius: '8px',
          }}
        />
        <button
          onClick={handleImport}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: loading ? '#6c757d' : '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '6px',
          marginTop: '10px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <details style={{ marginTop: '15px', fontSize: '14px', color: '#856404' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          📖 How to get your Google Maps list link
        </summary>
        <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Open Google Maps on your computer</li>
          <li>Click "Saved" in the left menu</li>
          <li>Select the list you want to import</li>
          <li>Click the Share button</li>
          <li>Make sure it's set to "Anyone with the link"</li>
          <li>Copy the link and paste it above</li>
        </ol>
      </details>
    </div>
  );
}

export default ImportFromGoogleMaps;
