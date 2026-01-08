import { useState } from 'react';
import { Flight } from '../../types';
import FlightForm from './FlightForm';

interface FlightSectionProps {
  flights: Flight[];
  tripStartDate: string;
  tripEndDate: string;
  onAddFlight: (flight: Omit<Flight, 'id'>) => void;
  onDeleteFlight: (id: string) => void;
}

function FlightSection({ 
  flights, 
  tripStartDate, 
  tripEndDate, 
  onAddFlight, 
  onDeleteFlight 
}: FlightSectionProps) {
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);

  // Calculate total journey duration
  const calculateTotalDuration = (flight: Flight) => {
    if (!flight.segments || flight.segments.length === 0) return null;
    
    const firstSegment = flight.segments[0];
    const lastSegment = flight.segments[flight.segments.length - 1];
    
    const startTime = new Date(`${firstSegment.departureDate}T${firstSegment.departureTime}`);
    const endTime = new Date(`${lastSegment.arrivalDate}T${lastSegment.arrivalTime}`);
    
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    return { hours, minutes };
  };

  // Calculate layover time between segments
  const calculateLayoverTime = (currentSegment: any, nextSegment: any) => {
    const arrivalTime = new Date(`${currentSegment.arrivalDate}T${currentSegment.arrivalTime}`);
    const departureTime = new Date(`${nextSegment.departureDate}T${nextSegment.departureTime}`);
    
    const layoverMinutes = Math.floor((departureTime.getTime() - arrivalTime.getTime()) / 60000);
    const hours = Math.floor(layoverMinutes / 60);
    const minutes = layoverMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  };

  const handleSaveFlight = (flight: Omit<Flight, 'id'>) => {
    if (editingFlight) {
      onDeleteFlight(editingFlight.id);
      onAddFlight(flight);
      setEditingFlight(null);
    } else {
      onAddFlight(flight);
    }
    setShowFlightForm(false);
  };

  const handleEditFlight = (flight: Flight) => {
    setEditingFlight(flight);
    setShowFlightForm(true);
  };

  const handleCancelFlightForm = () => {
    setShowFlightForm(false);
    setEditingFlight(null);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0 }}>✈️ Flights</h4>
        <button
          onClick={() => setShowFlightForm(!showFlightForm)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2B579A',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          + Add Flight
        </button>
      </div>

      {showFlightForm && (
        <FlightForm
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          onSave={handleSaveFlight}
          onCancel={handleCancelFlightForm}
          existingFlight={editingFlight}
        />
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px' 
      }}>
        {/* OUTBOUND FLIGHTS */}
        {flights?.filter(f => f && f.segments && f.segments.length > 0 && f.type === 'outbound').map((flight) => {
          const totalDuration = calculateTotalDuration(flight);
          const firstSegment = flight.segments[0];
          const lastSegment = flight.segments[flight.segments.length - 1];
          
          return (
            <div
              key={flight.id}
              style={{
                padding: '15px',
                backgroundColor: '#d4edda',
                borderRadius: '8px',
              }}
            >
              {/* Header with journey overview */}
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '20px', 
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                🛫 Outbound Flight
              </div>
              
              {/* Journey summary */}
              <div style={{
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                marginBottom: '12px',
                border: '2px solid #28a745',
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2B579A' }}>
                      {firstSegment.departureAirport}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(`${firstSegment.departureDate}T${firstSegment.departureTime}`).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '32px', 
                    padding: '0 20px',
                    color: '#28a745'
                  }}>
                    →
                  </div>
                  
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2B579A' }}>
                      {lastSegment.arrivalAirport}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(`${lastSegment.arrivalDate}T${lastSegment.arrivalTime}`).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                
                {totalDuration && (
                  <div style={{
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#28a745',
                    paddingTop: '8px',
                    borderTop: '1px solid #e0e0e0',
                  }}>
                    ⏱️ Total Duration: {totalDuration.hours}h {totalDuration.minutes}m
                    {flight.segments.length > 1 && ` • ${flight.segments.length} flights`}
                  </div>
                )}
              </div>

              {/* Individual segments */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#666', 
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  Flight Details:
                </div>
                
                {flight.segments?.map((segment, index) => (
                  <div key={segment.id}>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        border: segment.isLayover ? '2px dashed #ffc107' : '1px solid #ddd',
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#2B579A' }}>
                        {segment.isLayover && '🔄 '}
                        {segment.airline} {segment.flightNumber}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Depart</div>
                          <div style={{ fontWeight: 'bold' }}>{segment.departureAirport}</div>
                          <div style={{ color: '#666', fontSize: '13px' }}>
                            {new Date(`${segment.departureDate}T${segment.departureTime}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        
                        <div style={{ alignSelf: 'center', fontSize: '20px', color: '#2B579A' }}>
                          ✈️
                        </div>
                        
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Arrive</div>
                          <div style={{ fontWeight: 'bold' }}>{segment.arrivalAirport}</div>
                          <div style={{ color: '#666', fontSize: '13px' }}>
                            {new Date(`${segment.arrivalDate}T${segment.arrivalTime}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Layover time indicator */}
                    {index < flight.segments.length - 1 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '8px',
                        fontSize: '13px',
                        color: '#666',
                        fontStyle: 'italic',
                        backgroundColor: '#fff3cd',
                        borderRadius: '4px',
                        marginBottom: '8px',
                      }}>
                        🕐 Layover in {segment.arrivalAirport}: {calculateLayoverTime(segment, flight.segments[index + 1])}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {flight.notes && (
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666', 
                  marginBottom: '12px', 
                  fontStyle: 'italic',
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                }}>
                  📝 {flight.notes}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  onClick={() => handleEditFlight(flight)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2B579A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteFlight(flight.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {/* RETURN FLIGHTS */}
        {flights?.filter(f => f && f.segments && f.segments.length > 0 && f.type === 'return').map((flight) => {
          const totalDuration = calculateTotalDuration(flight);
          const firstSegment = flight.segments[0];
          const lastSegment = flight.segments[flight.segments.length - 1];
          
          return (
            <div
              key={flight.id}
              style={{
                padding: '15px',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
              }}
            >
              {/* Header with journey overview */}
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '20px', 
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                🛬 Return Flight
              </div>
              
              {/* Journey summary */}
              <div style={{
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                marginBottom: '12px',
                border: '2px solid #ffc107',
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2B579A' }}>
                      {firstSegment.departureAirport}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(`${firstSegment.departureDate}T${firstSegment.departureTime}`).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '32px', 
                    padding: '0 20px',
                    color: '#ffc107'
                  }}>
                    →
                  </div>
                  
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2B579A' }}>
                      {lastSegment.arrivalAirport}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(`${lastSegment.arrivalDate}T${lastSegment.arrivalTime}`).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                
                {totalDuration && (
                  <div style={{
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#f0ad4e',
                    paddingTop: '8px',
                    borderTop: '1px solid #e0e0e0',
                  }}>
                    ⏱️ Total Duration: {totalDuration.hours}h {totalDuration.minutes}m
                    {flight.segments.length > 1 && ` • ${flight.segments.length} flights`}
                  </div>
                )}
              </div>

              {/* Individual segments */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#666', 
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  Flight Details:
                </div>
                
                {flight.segments?.map((segment, index) => (
                  <div key={segment.id}>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        border: segment.isLayover ? '2px dashed #ffc107' : '1px solid #ddd',
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#2B579A' }}>
                        {segment.isLayover && '🔄 '}
                        {segment.airline} {segment.flightNumber}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Depart</div>
                          <div style={{ fontWeight: 'bold' }}>{segment.departureAirport}</div>
                          <div style={{ color: '#666', fontSize: '13px' }}>
                            {new Date(`${segment.departureDate}T${segment.departureTime}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        
                        <div style={{ alignSelf: 'center', fontSize: '20px', color: '#2B579A' }}>
                          ✈️
                        </div>
                        
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Arrive</div>
                          <div style={{ fontWeight: 'bold' }}>{segment.arrivalAirport}</div>
                          <div style={{ color: '#666', fontSize: '13px' }}>
                            {new Date(`${segment.arrivalDate}T${segment.arrivalTime}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Layover time indicator */}
                    {index < flight.segments.length - 1 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '8px',
                        fontSize: '13px',
                        color: '#666',
                        fontStyle: 'italic',
                        backgroundColor: '#fff3cd',
                        borderRadius: '4px',
                        marginBottom: '8px',
                      }}>
                        🕐 Layover in {segment.arrivalAirport}: {calculateLayoverTime(segment, flight.segments[index + 1])}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {flight.notes && (
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666', 
                  marginBottom: '12px', 
                  fontStyle: 'italic',
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                }}>
                  📝 {flight.notes}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  onClick={() => handleEditFlight(flight)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2B579A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteFlight(flight.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FlightSection;
