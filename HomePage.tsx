import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Trip } from '../types';

function HomePage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'trips'));
      const loadedTrips: Trip[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedTrips.push({
          id: doc.id,
          destination: data.destination,
          startDate: data.startDate,
          endDate: data.endDate,
          activities: data.activities || [],
          flights: data.flights || [],
          accommodations: data.accommodations || [],
          transportation: data.transportation || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      setTrips(loadedTrips);
      setLoading(false);
    } catch (error) {
      console.error('Error loading trips:', error);
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!destination || !startDate || !endDate) {
      alert('Please fill in all fields!');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('End date must be after start date!');
      return;
    }

    try {
      const newTrip = {
        destination,
        startDate,
        endDate,
        activities: [],
        flights: [],
        accommodations: [],
        transportation: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'trips'), newTrip);
      
      setDestination('');
      setStartDate('');
      setEndDate('');
      
      // Navigate to the new trip page
      navigate(`/trip/${docRef.id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Error creating trip. Check console.');
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'trips', tripId));
      setTrips(trips.filter(t => t.id !== tripId));
      alert('Trip deleted!');
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div>
      <header style={{ padding: '40px', backgroundColor: '#2B579A', color: 'white' }}>
        <h1>🗺️ Travel Planner</h1>
        <p>Plan your perfect trip with Google Maps</p>
      </header>

      <main style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Create New Trip */}
        <section style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
          <h2>Create New Trip</h2>
          <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination (e.g., Paris, France)"
              style={{ padding: '12px', fontSize: '16px', border: '2px solid #2B579A', borderRadius: '8px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #2B579A', borderRadius: '8px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #2B579A', borderRadius: '8px' }}
                />
              </div>
            </div>
            <button
              onClick={handleCreateTrip}
              style={{
                padding: '14px',
                fontSize: '16px',
                backgroundColor: '#2B579A',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Create Trip ✈️
            </button>
          </div>
        </section>

        {/* Trip List */}
        <section style={{ marginBottom: '40px' }}>
          <h2>My Trips ({trips.length})</h2>
          {trips.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              No trips yet. Create your first trip above!
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    border: '2px solid #dee2e6',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2B579A';
                    e.currentTarget.style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#dee2e6';
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 8px 0' }}>✈️ {trip.destination}</h3>
                    <p style={{ margin: '4px 0', color: '#666' }}>
                      📅 {trip.startDate} to {trip.endDate}
                    </p>
                    <p style={{ margin: '4px 0', color: '#666' }}>
                      📍 {trip.activities.length} activities
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip.id);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default HomePage;