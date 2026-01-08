import React, { useState } from 'react';
import { Activity } from '../../types';

interface ActivityListProps {
  activities: Activity[];
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function ActivityList({ activities, onDelete, onMoveUp, onMoveDown }: ActivityListProps) {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  const handleImageError = (activityId: string) => {
    setBrokenImages(prev => new Set(prev).add(activityId));
  };

  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      attraction: '🎭',
      restaurant: '🍽️',
      hotel: '🏨',
      other: '📍',
    };
    return icons[type];
  };

  if (activities.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0 }}>📝 Activity List ({activities.length})</h3>
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
      
      {isExpanded && (
        <div style={{
          display: 'grid',
          gap: '15px',
        }}>
          {activities.map((activity, index) => (
          <div
            key={activity.id}
            style={{
              display: 'flex',
              gap: '15px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '2px solid #e9ecef',
              alignItems: 'center',
            }}
          >
            {/* Photo or placeholder */}
            {activity.photoUrl && !brokenImages.has(activity.id) ? (
              <img
                src={activity.photoUrl}
                alt={activity.name}
                onError={() => handleImageError(activity.id)}
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  flexShrink: 0,
                }}
              >
                {getActivityIcon(activity.type)}
              </div>
            )}

            {/* Activity details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                {getActivityIcon(activity.type)} {activity.name}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                📍 {activity.address}
              </div>
              {activity.rating && (
                <div style={{ fontSize: '14px', color: '#666' }}>
                  ⭐ {activity.rating} / 5
                </div>
              )}
              {activity.phoneNumber && (
                <div style={{ fontSize: '14px', color: '#666' }}>
                  📞 {activity.phoneNumber}
                </div>
              )}
              {activity.website && (
                <div style={{ fontSize: '14px' }}>
                  🔗 <a href={activity.website} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                style={{
                  padding: '8px 12px',
                  backgroundColor: index === 0 ? '#e9ecef' : '#2B579A',
                  color: index === 0 ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                ▲
              </button>
              <button
                onClick={() => onMoveDown(index)}
                disabled={index === activities.length - 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: index === activities.length - 1 ? '#e9ecef' : '#2B579A',
                  color: index === activities.length - 1 ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: index === activities.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                ▼
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${activity.name}?`)) {
                    onDelete(activity.id);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

export default ActivityList;
