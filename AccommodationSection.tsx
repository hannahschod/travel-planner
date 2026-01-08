import { useState } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Accommodation } from '../../types';

const libraries: ("places")[] = ["places"];

interface AccommodationSectionProps {
  accommodations: Accommodation[];
  tripStartDate: string;
  tripEndDate: string;
  onAddAccommodation: (accommodation: Omit<Accommodation, 'id'>) => void;
  onDeleteAccommodation: (id: string) => void;
  onUpdateAccommodation: (id: string, accommodation: Omit<Accommodation, 'id'>) => void;
}

function AccommodationSection({ 
  accommodations, 
  tripStartDate, 
  tripEndDate, 
  onAddAccommodation, 
  onDeleteAccommodation,
  onUpdateAccommodation
}: AccommodationSectionProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    checkIn: tripStartDate,
    checkInTime: '15:00',
    checkOut: tripEndDate,
    checkOutTime: '11:00',
    confirmationNumber: '',
  });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    checkIn: '',
    checkInTime: '',
    checkOut: '',
    checkOutTime: '',
    confirmationNumber: '',
  });

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      if (place.place_id && place.name && place.formatted_address) {
        if (editingId) {
          setEditForm({
            ...editForm,
            name: place.name,
            address: place.formatted_address,
          });
        } else {
          setHotelForm({
            ...hotelForm,
            name: place.name,
            address: place.formatted_address,
          });
        }
      }
    }
  };

  const handleAddHotel = () => {
    onAddAccommodation(hotelForm);
    setHotelForm({
      name: '',
      address: '',
      checkIn: tripStartDate,
      checkInTime: '15:00',
      checkOut: tripEndDate,
      checkOutTime: '11:00',
      confirmationNumber: '',
    });
    setShowHotelForm(false);
  };

  const handleStartEdit = (hotel: Accommodation) => {
    setEditingId(hotel.id);
    setEditForm({
      name: hotel.name,
      address: hotel.address,
      checkIn: hotel.checkIn,
      checkInTime: hotel.checkInTime,
      checkOut: hotel.checkOut,
      checkOutTime: hotel.checkOutTime,
      confirmationNumber: hotel.confirmationNumber || '',
    });
    setShowHotelForm(false); // Close add form if open
  };

  const handleSaveEdit = () => {
    if (editingId) {
      onUpdateAccommodation(editingId, editForm);
      setEditingId(null);
      setEditForm({
        name: '',
        address: '',
        checkIn: '',
        checkInTime: '',
        checkOut: '',
        checkOutTime: '',
        confirmationNumber: '',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      address: '',
      checkIn: '',
      checkInTime: '',
      checkOut: '',
      checkOutTime: '',
      confirmationNumber: '',
    });
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0 }}>🏨 Accommodations</h4>
        <button
          onClick={() => setShowHotelForm(!showHotelForm)}
          disabled={editingId !== null}
          style={{
            padding: '8px 16px',
            backgroundColor: editingId ? '#6c757d' : '#2B579A',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: editingId ? 'not-allowed' : 'pointer',
            opacity: editingId ? 0.5 : 1,
          }}
        >
          + Add Hotel
        </button>
      </div>

      {showHotelForm && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px', 
          marginBottom: '15px' 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Hotel Name:</label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={onLoad}
                  onPlaceChanged={onPlaceChanged}
                  options={{
                    types: ['lodging'],
                  }}
                >
                  <input
                    type="text"
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                    placeholder="Search for a hotel..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  value={hotelForm.name}
                  onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                  placeholder="Loading Google Maps..."
                  disabled
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              )}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Address:</label>
              <input
                type="text"
                value={hotelForm.address}
                onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                placeholder="123 Main St, City, State"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-In Date:</label>
              <input
                type="date"
                value={hotelForm.checkIn}
                onChange={(e) => setHotelForm({ ...hotelForm, checkIn: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-In Time:</label>
              <input
                type="time"
                value={hotelForm.checkInTime}
                onChange={(e) => setHotelForm({ ...hotelForm, checkInTime: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-Out Date:</label>
              <input
                type="date"
                value={hotelForm.checkOut}
                onChange={(e) => setHotelForm({ ...hotelForm, checkOut: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-Out Time:</label>
              <input
                type="time"
                value={hotelForm.checkOutTime}
                onChange={(e) => setHotelForm({ ...hotelForm, checkOutTime: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Confirmation #:</label>
              <input
                type="text"
                value={hotelForm.confirmationNumber}
                onChange={(e) => setHotelForm({ ...hotelForm, confirmationNumber: e.target.value })}
                placeholder="Optional"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAddHotel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Save Hotel
            </button>
            <button
              onClick={() => setShowHotelForm(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Accommodation Display */}
      {accommodations.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
          No accommodations added yet. Click "+ Add Hotel" to get started!
        </p>
      ) : (
        accommodations.map((hotel) => (
          <div
            key={hotel.id}
            style={{
              padding: '20px',
              backgroundColor: '#e7f3ff',
              borderRadius: '8px',
              marginBottom: '15px',
              border: '2px solid #2B579A',
            }}
          >
            {editingId === hotel.id ? (
              // EDIT MODE
              <div>
                <h4 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Accommodation</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Hotel Name:</label>
                    {isLoaded ? (
                      <Autocomplete
                        onLoad={onLoad}
                        onPlaceChanged={onPlaceChanged}
                        options={{
                          types: ['lodging'],
                        }}
                      >
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Search for a hotel..."
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Address:</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="123 Main St, City, State"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-In Date:</label>
                    <input
                      type="date"
                      value={editForm.checkIn}
                      onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-In Time:</label>
                    <input
                      type="time"
                      value={editForm.checkInTime}
                      onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-Out Date:</label>
                    <input
                      type="date"
                      value={editForm.checkOut}
                      onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Check-Out Time:</label>
                    <input
                      type="time"
                      value={editForm.checkOutTime}
                      onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Confirmation #:</label>
                    <input
                      type="text"
                      value={editForm.confirmationNumber}
                      onChange={(e) => setEditForm({ ...editForm, confirmationNumber: e.target.value })}
                      placeholder="Optional"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editForm.name || !editForm.address}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: editForm.name && editForm.address ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: editForm.name && editForm.address ? 'pointer' : 'not-allowed',
                      opacity: editForm.name && editForm.address ? 1 : 0.5,
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              
              
                // DISPLAY MODE
              <>
                {/* Hotel Name & Action Buttons Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                    🏨 {hotel.name}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleStartEdit(hotel)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#2B579A',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteAccommodation(hotel.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Address */}
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                  📍 {hotel.address}
                </div>

                {/* Check-in & Check-out Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                  {/* Check-in Card */}
                  <div style={{
                    padding: '15px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '2px solid #28a745',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                      CHECK-IN
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                      {new Date(hotel.checkIn + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        })}
                    </div>
                    <div style={{ fontSize: '16px', color: '#28a745' }}>
                      🕐 {hotel.checkInTime}
                    </div>
                  </div>

                  {/* Check-out Card */}
                  <div style={{
                    padding: '15px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '2px solid #dc3545',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                      CHECK-OUT
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                      {new Date(hotel.checkOut + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        })}
                    </div>
                    <div style={{ fontSize: '16px', color: '#dc3545' }}>
                      🕐 {hotel.checkOutTime}
                    </div>
                  </div>
                </div>

                {/* Confirmation Number */}
                {hotel.confirmationNumber && (
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#666', 
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    📋 Confirmation: <strong>{hotel.confirmationNumber}</strong>
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default AccommodationSection;
