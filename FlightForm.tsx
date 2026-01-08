import React, { useState } from 'react';
import { Flight, FlightSegment } from '../../types';

interface FlightFormProps {
  tripStartDate: string;
  tripEndDate: string;
  onSave: (flight: Omit<Flight, 'id'>) => void;
  onCancel: () => void;
  existingFlight?: Flight | null;
}

function FlightForm({ tripStartDate, tripEndDate, onSave, onCancel, existingFlight }: FlightFormProps) {
  const [flightType, setFlightType] = useState<'outbound' | 'return'>(
    existingFlight?.type || 'outbound'
  );
  const [segments, setSegments] = useState<Omit<FlightSegment, 'id'>[]>(
    existingFlight?.segments || [
    {
      flightNumber: '',
      airline: '',
      departureAirport: '',
      departureDate: tripStartDate,
      departureTime: '08:00',
      arrivalAirport: '',
      arrivalDate: tripStartDate,
      arrivalTime: '14:00',
      isLayover: false,
    },
  ]);
  const [notes, setNotes] = useState(existingFlight?.notes || '');

  const addSegment = () => {
    const lastSegment = segments[segments.length - 1];
    setSegments([
      ...segments,
      {
        flightNumber: '',
        airline: '',
        departureAirport: lastSegment.arrivalAirport, // Auto-fill from previous arrival
        departureDate: lastSegment.arrivalDate,
        departureTime: lastSegment.arrivalTime,
        arrivalAirport: '',
        arrivalDate: lastSegment.arrivalDate,
        arrivalTime: '18:00',
        isLayover: true,
      },
    ]);
  };

  const removeSegment = (index: number) => {
    if (segments.length > 1) {
      setSegments(segments.filter((_, i) => i !== index));
    }
  };

  const updateSegment = (index: number, field: keyof FlightSegment, value: any) => {
    const newSegments = [...segments];
    (newSegments[index] as any)[field] = value;
    setSegments(newSegments);
  };

  const handleSave = () => {
    const segmentsWithIds: FlightSegment[] = segments.map((seg, i) => ({
      ...seg,
      id: `${Date.now()}-${i}`,
    }));

    onSave({
      type: flightType,
      segments: segmentsWithIds,
      notes,
    });
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px', 
      marginBottom: '15px' 
    }}>
      <h4 style={{ marginTop: 0 }}>Add Flight Details</h4>

      {/* Flight Type */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Flight Type:
        </label>
        <select
          value={flightType}
          onChange={(e) => setFlightType(e.target.value as 'outbound' | 'return')}
          style={{ 
            width: '100%', 
            padding: '10px', 
            borderRadius: '6px', 
            border: '2px solid #ddd',
            fontSize: '16px',
          }}
        >
          <option value="outbound">Outbound (To Destination)</option>
          <option value="return">Return (Back Home)</option>
        </select>
      </div>

      {/* Flight Segments */}
      {segments.map((segment, index) => (
        <div
          key={index}
          style={{
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '8px',
            marginBottom: '15px',
            border: segment.isLayover ? '2px dashed #ffc107' : '2px solid #2B579A',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h5 style={{ margin: 0 }}>
              {segment.isLayover ? '✈️ Connection Flight' : '✈️ Main Flight'} {index + 1}
            </h5>
            {segments.length > 1 && (
              <button
                onClick={() => removeSegment(index)}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Remove
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Airline & Flight Number */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Airline:
              </label>
              <input
                type="text"
                value={segment.airline}
                onChange={(e) => updateSegment(index, 'airline', e.target.value)}
                placeholder="e.g., United"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Flight #:
              </label>
              <input
                type="text"
                value={segment.flightNumber}
                onChange={(e) => updateSegment(index, 'flightNumber', e.target.value)}
                placeholder="e.g., UA1234"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            {/* Departure */}
            <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', marginTop: '8px', color: '#2B579A' }}>
              🛫 Departure
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Airport:
              </label>
              <input
                type="text"
                value={segment.departureAirport}
                onChange={(e) => updateSegment(index, 'departureAirport', e.target.value)}
                placeholder="e.g., ORD"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Date:
              </label>
              <input
                type="date"
                value={segment.departureDate}
                onChange={(e) => updateSegment(index, 'departureDate', e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Time:
              </label>
              <input
                type="time"
                value={segment.departureTime}
                onChange={(e) => updateSegment(index, 'departureTime', e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            {/* Arrival */}
            <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', marginTop: '8px', color: '#28a745' }}>
              🛬 Arrival
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Airport:
              </label>
              <input
                type="text"
                value={segment.arrivalAirport}
                onChange={(e) => updateSegment(index, 'arrivalAirport', e.target.value)}
                placeholder="e.g., LAX"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Date:
              </label>
              <input
                type="date"
                value={segment.arrivalDate}
                onChange={(e) => updateSegment(index, 'arrivalDate', e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                Time:
              </label>
              <input
                type="time"
                value={segment.arrivalTime}
                onChange={(e) => updateSegment(index, 'arrivalTime', e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addSegment}
        style={{
          padding: '10px 20px',
          backgroundColor: '#ffc107',
          color: '#000',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '15px',
          fontWeight: 'bold',
        }}
      >
        + Add Connection/Layover
      </button>

      {/* Notes */}
      <div style={{ marginTop: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Notes (Optional):
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special notes about this flight..."
          rows={2}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSave}
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
          Save Flight
        </button>
        <button
          onClick={onCancel}
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
  );
}

export default FlightForm;