import React from 'react';
import { Flight, Accommodation, Transportation } from '../../types';
import FlightSection from '../Flights/FlightSection';
import AccommodationSection from '../Accommodation/AccommodationSection';

interface TravelDetailsProps {
  flights: Flight[];
  accommodations: Accommodation[];
  transportation: Transportation[];
  tripStartDate: string;
  tripEndDate: string;
  onAddFlight: (flight: Omit<Flight, 'id'>) => void;
  onAddAccommodation: (accommodation: Omit<Accommodation, 'id'>) => void;
  onAddTransportation: (transportation: Omit<Transportation, 'id'>) => void;
  onDeleteFlight: (id: string) => void;
  onDeleteAccommodation: (id: string) => void;
  onDeleteTransportation: (id: string) => void;
  onUpdateAccommodation: (id: string, accommodation: Omit<Accommodation, 'id'>) => void;
}

function TravelDetails({ 
  flights, 
  accommodations, 
  transportation,
  tripStartDate,
  tripEndDate,
  onAddFlight, 
  onAddAccommodation, 
  onAddTransportation,
  onDeleteFlight,
  onDeleteAccommodation,
  onDeleteTransportation,
  onUpdateAccommodation,
}: TravelDetailsProps) {
  return (
    <div style={{ marginTop: '30px' }}>
      <h3>✈️ Travel & Accommodations</h3>

      <FlightSection
        flights={flights}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        onAddFlight={onAddFlight}
        onDeleteFlight={onDeleteFlight}
      />

      <AccommodationSection
        accommodations={accommodations}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        onAddAccommodation={onAddAccommodation}
        onDeleteAccommodation={onDeleteAccommodation}
        onUpdateAccommodation={onUpdateAccommodation}
      />
    </div>
  );
}

export default TravelDetails;
