import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Trip, Activity, Flight, Accommodation, Transportation } from '../types';
import PlaceSearch from '../components/Activities/PlaceSearch';
import MapView from '../components/Maps/MapView';
import ActivityList from '../components/Activities/ActivityList';
import ImportFromGoogleMaps from '../components/Maps/ImportFromGoogleMaps';
import TravelTimes from '../components/Smart Schedule/TravelTimes';
import WeatherForecast from '../components/Weather/WeatherForecast';
import ScheduleGenerator from '../components/Smart Schedule/ScheduleGenerator';
import TravelDetails from '../components/Smart Schedule/TravelDetails';

function TripDetailsPage() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    const [editingTrip, setEditingTrip] = useState(false);
    const [editForm, setEditForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    });

    // Helper function to format dates nicely
    const formatDateWithOrdinal = (dateString: string) => {
      const date = new Date(dateString + 'T00:00:00');
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const day = date.getDate();
      const year = date.getFullYear();
      
      // Add ordinal suffix (1st, 2nd, 3rd, etc.)
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };
      
      return `${dayOfWeek}, ${month} ${day}${getOrdinalSuffix(day)} ${year}`;
    };

    // ✅ Define loadTrip FIRST with useCallback
    const loadTrip = useCallback(async () => {
    if (!tripId) return;

    try {
        const docRef = doc(db, 'trips', tripId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
        const data = docSnap.data();
        setTrip({
            id: docSnap.id,
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
        } else {
        alert('Trip not found!');
        navigate('/');
        }
        setLoading(false);
    } catch (error) {
        console.error('Error loading trip:', error);
        setLoading(false);
    }
    }, [tripId, navigate]);

    // ✅ Then use it in useEffect
    useEffect(() => {
    loadTrip();
    }, [loadTrip]);


  const handleAddActivity = async (activity: Activity) => {
    if (!trip) {
      alert('Please select a trip first!');
      return;
    }

    try {
      const cleanActivity: any = {
        id: activity.id,
        placeId: activity.placeId,
        name: activity.name,
        address: activity.address,
        location: activity.location,
        type: activity.type,
      };

      if (activity.duration) cleanActivity.duration = activity.duration;
      if (activity.rating) cleanActivity.rating = activity.rating;
      if (activity.photoUrl) cleanActivity.photoUrl = activity.photoUrl;
      if (activity.openingHours) cleanActivity.openingHours = activity.openingHours;
      if (activity.phoneNumber) cleanActivity.phoneNumber = activity.phoneNumber;
      if (activity.website) cleanActivity.website = activity.website;

      const updatedActivities = [...trip.activities, cleanActivity];
      
      await updateDoc(doc(db, 'trips', trip.id), {
        activities: updatedActivities,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, activities: updatedActivities });
      alert(`Added ${activity.name}!`);
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Error adding activity. Check console.');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!trip) return;

    try {
      const updatedActivities = trip.activities.filter(a => a.id !== activityId);
      
      await updateDoc(doc(db, 'trips', trip.id), {
        activities: updatedActivities,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, activities: updatedActivities });
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleMoveActivityUp = async (index: number) => {
    if (!trip || index === 0) return;

    const newActivities = [...trip.activities];
    [newActivities[index - 1], newActivities[index]] = [newActivities[index], newActivities[index - 1]];

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        activities: newActivities,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, activities: newActivities });
    } catch (error) {
      console.error('Error moving activity:', error);
    }
  };

  const handleMoveActivityDown = async (index: number) => {
    if (!trip || index === trip.activities.length - 1) return;

    const newActivities = [...trip.activities];
    [newActivities[index], newActivities[index + 1]] = [newActivities[index + 1], newActivities[index]];

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        activities: newActivities,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, activities: newActivities });
    } catch (error) {
      console.error('Error moving activity:', error);
    }
  };

  const handleUpdateActivity = async (activityId: string, updates: Partial<Activity>) => {
    if (!trip) return;

    const updatedActivities = trip.activities.map(activity =>
      activity.id === activityId ? { ...activity, ...updates } : activity
    );

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        activities: updatedActivities,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, activities: updatedActivities });
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleReorderActivities = async (reorderedActivities: Activity[]) => {
    if (!trip) return;

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        activities: reorderedActivities,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, activities: reorderedActivities });
    } catch (error) {
      console.error('Error reordering activities:', error);
    }
  };

  const handleEditTrip = () => {
    if (!trip) return;
    setEditForm({
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
    });
    setEditingTrip(true);
  };

  const handleSaveEditTrip = async () => {
    if (!trip) return;

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        destination: editForm.destination,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        updatedAt: new Date(),
      });

      setTrip({
        ...trip,
        destination: editForm.destination,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
      });
      setEditingTrip(false);
      alert('Trip updated!');
    } catch (error) {
      console.error('Error updating trip:', error);
    }
  };

  const handleAddFlight = async (flight: Omit<Flight, 'id'>) => {
    if (!trip) return;

    const newFlight: Flight = {
      ...flight,
      id: Date.now().toString(),
    };

    const updatedFlights = [...trip.flights, newFlight];

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        flights: updatedFlights,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, flights: updatedFlights });
    } catch (error) {
      console.error('Error adding flight:', error);
    }
  };

  const handleDeleteFlight = async (flightId: string) => {
    if (!trip) return;

    const updatedFlights = trip.flights.filter(f => f.id !== flightId);

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        flights: updatedFlights,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, flights: updatedFlights });
    } catch (error) {
      console.error('Error deleting flight:', error);
    }
  };

  const handleAddAccommodation = async (accommodation: Omit<Accommodation, 'id'>) => {
    if (!trip) return;

    const newAccommodation: Accommodation = {
      ...accommodation,
      id: Date.now().toString(),
    };

    const updatedAccommodations = [...trip.accommodations, newAccommodation];

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        accommodations: updatedAccommodations,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, accommodations: updatedAccommodations });
    } catch (error) {
      console.error('Error adding accommodation:', error);
    }
  };

  const handleDeleteAccommodation = async (accommodationId: string) => {
    if (!trip) return;

    const updatedAccommodations = trip.accommodations.filter(a => a.id !== accommodationId);

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        accommodations: updatedAccommodations,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, accommodations: updatedAccommodations });
    } catch (error) {
      console.error('Error deleting accommodation:', error);
    }
  };

  // 👉 NEW HANDLER - Add this for editing accommodations
  const handleUpdateAccommodation = async (accommodationId: string, updatedData: Omit<Accommodation, 'id'>) => {
    if (!trip) return;

    const updatedAccommodations = trip.accommodations.map((hotel: Accommodation) =>
      hotel.id === accommodationId 
        ? { ...hotel, ...updatedData }
        : hotel
    );

    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        accommodations: updatedAccommodations,
        updatedAt: new Date(),
      });

      setTrip({ ...trip, accommodations: updatedAccommodations });
    } catch (error) {
      console.error('Error updating accommodation:', error);
      alert('Failed to update accommodation. Please try again.');
    }
  };

  const handleAddTransportation = async (transportation: Omit<Transportation, 'id'>) => {
    if (!trip) return;
    console.log('Transportation:', transportation);
  };

  const handleDeleteTransportation = async (transportationId: string) => {
    if (!trip) return;
    console.log('Delete transportation:', transportationId);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading trip...</div>;
  }

  if (!trip) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Trip not found!</div>;
  }

  return (
    <div>
      <header style={{ padding: '40px', backgroundColor: '#2B579A', color: 'white' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'white',
              color: '#2B579A',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ← Back to Trips
          </button>
          <div>
            <h1 style={{ margin: 0 }}>🗺️ {trip.destination}</h1>
            <p style={{ margin: '5px 0 0 0' }}>
              <strong>{formatDateWithOrdinal(trip.startDate)}</strong> to <strong>{formatDateWithOrdinal(trip.endDate)}</strong>
            </p>
          </div>
        </div>
      </header>

      <main style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button
            onClick={handleEditTrip}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✏️ Edit Trip Details
          </button>
        </div>

        {editingTrip && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
            }}>
              <h3 style={{ marginTop: 0 }}>Edit Trip Details</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Destination:
                </label>
                <input
                  type="text"
                  value={editForm.destination}
                  onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Start Date:
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: '2px solid #ddd',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    End Date:
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: '2px solid #ddd',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSaveEditTrip}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingTrip(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <TravelDetails
          flights={trip.flights}
          accommodations={trip.accommodations}
          transportation={trip.transportation || []}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          onAddFlight={handleAddFlight}
          onAddAccommodation={handleAddAccommodation}
          onAddTransportation={handleAddTransportation}
          onDeleteFlight={handleDeleteFlight}
          onDeleteAccommodation={handleDeleteAccommodation}
          onDeleteTransportation={handleDeleteTransportation}
          onUpdateAccommodation={handleUpdateAccommodation}
        />

        <PlaceSearch onPlaceSelect={handleAddActivity} />
        
        <ImportFromGoogleMaps 
          onPlacesImported={async (activities) => {
            const updatedActivities = [...trip.activities, ...activities];
            
            await updateDoc(doc(db, 'trips', trip.id), {
              activities: updatedActivities,
              updatedAt: new Date(),
            });

            setTrip({ ...trip, activities: updatedActivities });
          }}
        />
        
        <WeatherForecast 
          destination={trip.destination}
          startDate={trip.startDate}
          endDate={trip.endDate}
        />

        <ActivityList 
          activities={trip.activities} 
          onDelete={handleDeleteActivity}
          onMoveUp={handleMoveActivityUp}
          onMoveDown={handleMoveActivityDown}
        />

        <TravelTimes 
            activities={trip.activities}
            flights={trip.flights}
            accommodations={trip.accommodations}
            />

        <ScheduleGenerator 
          activities={trip.activities}
          flights={trip.flights}
          accommodations={trip.accommodations}
          startDate={trip.startDate}
          endDate={trip.endDate}
          onUpdateActivity={handleUpdateActivity}
          onReorderActivities={handleReorderActivities}
        />

        {trip.activities.length > 0 && (
          <MapView activities={trip.activities} />
        )}
      </main>
    </div>
  );
}

export default TripDetailsPage;
