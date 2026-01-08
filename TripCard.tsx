import React from 'react';

// Define the shape of props using TypeScript interface
interface TripCardProps {
  destination: string;
  onDelete: () => void;
}

// Component with typed props
function TripCard({ destination, onDelete }: TripCardProps) {
  return (
    <div
      style={{
        padding: '15px',
        marginBottom: '10px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        borderLeft: '4px solid #2B579A',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <span>✈️ {destination}</span>
      <button
        onClick={onDelete}
        style={{
          padding: '5px 15px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Delete
      </button>
    </div>
  );
}

export default TripCard;