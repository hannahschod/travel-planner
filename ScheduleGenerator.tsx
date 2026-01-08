import React, { useState, useEffect } from 'react';
import { Activity, Flight, Accommodation } from '../../types';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScheduleGeneratorProps {
  activities: Activity[];
  flights: Flight[];
  accommodations: Accommodation[];
  startDate: string;
  endDate: string;
  onUpdateActivity: (activityId: string, updates: Partial<Activity>) => void;
  onReorderActivities: (reorderedActivities: Activity[]) => void;
}

interface ScheduledActivity {
  activity: Activity;
  day: number;
  time: string;
  dayOfWeek: number;
  openingNote?: string;
  isManual: boolean;
}

interface EditModalState {
  isOpen: boolean;
  activity: Activity | null;
  currentDay: number;
  currentTime: string;
}

interface TravelTimeResult {
  duration: string;
  distance: string;
  durationMinutes: number;
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function ScheduleGenerator({ 
  activities, 
  flights,
  accommodations,
  startDate, 
  endDate, 
  onUpdateActivity, 
  onReorderActivities 
}: ScheduleGeneratorProps) {
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    activity: null,
    currentDay: 1,
    currentTime: '09:00',
  });

  const [travelMode, setTravelMode] = useState<'DRIVING' | 'TRANSIT'>('DRIVING');
  const [travelTimes, setTravelTimes] = useState<Map<string, TravelTimeResult>>(new Map());
  const [calculatingTravel, setCalculatingTravel] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Calculate travel times between consecutive items including flights and accommodations
  useEffect(() => {
    const calculateTravelTimes = async () => {
      if (!window.google || !window.google.maps) return;
      
      const schedule = generateSchedule();
      if (schedule.length === 0) return;

      setCalculatingTravel(true);
      const times = new Map<string, TravelTimeResult>();
      const directionsService = new google.maps.DirectionsService();
      const geocoder = new google.maps.Geocoder();

      // Helper function to get location from address
      const geocodeAddress = async (address: string): Promise<google.maps.LatLng | null> => {
        try {
          const result = await geocoder.geocode({ address });
          if (result.results[0]?.geometry?.location) {
            return result.results[0].geometry.location;
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
        return null;
      };

      // Group by day
      const scheduleByDay: { [key: number]: ScheduledActivity[] } = {};
      schedule.forEach(item => {
        if (!scheduleByDay[item.day]) scheduleByDay[item.day] = [];
        scheduleByDay[item.day].push(item);
      });

      // Calculate for each day
      for (const [day, items] of Object.entries(scheduleByDay)) {
        // Build complete list with locations for each item
        const itemsWithLocations: Array<{
          location?: google.maps.LatLng;
          name: string;
          index: number;
        }> = [];

        // Check for flights this day
        const dayNum = Number(day);
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const currentDayDate = new Date(startYear, startMonth - 1, startDay);
        currentDayDate.setDate(currentDayDate.getDate() + dayNum - 1);

        // Add flight locations
        for (const flight of (flights || [])) {
          if (!flight?.segments) continue;
          
          const relevantSegment = flight.type === 'outbound' 
            ? flight.segments[flight.segments.length - 1] 
            : flight.segments[0];
          
          const dateToCheck = flight.type === 'outbound' 
            ? relevantSegment.arrivalDate 
            : relevantSegment.departureDate;
          
          const [segYear, segMonth, segDay] = dateToCheck.split('-').map(Number);
          const segDate = new Date(segYear, segMonth - 1, segDay);
          
          if (segDate.getTime() === currentDayDate.getTime()) {
            const airportCode = flight.type === 'outbound' 
              ? relevantSegment.arrivalAirport 
              : relevantSegment.departureAirport;
            
            const airportLocation = await geocodeAddress(`${airportCode} Airport`);
            itemsWithLocations.push({
              location: airportLocation || undefined,
              name: `${airportCode} Airport`,
              index: itemsWithLocations.length,
            });
          }
        }

        // Add accommodation locations
        for (const accommodation of (accommodations || [])) {
          const [checkInYear, checkInMonth, checkInDay] = accommodation.checkIn.split('-').map(Number);
          const checkInDate = new Date(checkInYear, checkInMonth - 1, checkInDay);
          
          const [checkOutYear, checkOutMonth, checkOutDay] = accommodation.checkOut.split('-').map(Number);
          const checkOutDate = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);
          
          if (checkInDate.getTime() === currentDayDate.getTime()) {
            const hotelLocation = await geocodeAddress(accommodation.address);
            itemsWithLocations.push({
              location: hotelLocation || undefined,
              name: accommodation.name,
              index: itemsWithLocations.length,
            });
          }
          
          if (checkOutDate.getTime() === currentDayDate.getTime()) {
            const hotelLocation = await geocodeAddress(accommodation.address);
            itemsWithLocations.push({
              location: hotelLocation || undefined,
              name: accommodation.name,
              index: itemsWithLocations.length,
            });
          }
        }

        // Add activity locations
        for (const item of items) {
          if (item.activity.location) {
            itemsWithLocations.push({
              location: new google.maps.LatLng(item.activity.location.lat, item.activity.location.lng),
              name: item.activity.name,
              index: itemsWithLocations.length,
            });
          }
        }

        // Calculate travel times between consecutive items with locations
        for (let i = 0; i < itemsWithLocations.length - 1; i++) {
          const from = itemsWithLocations[i];
          const to = itemsWithLocations[i + 1];

          if (from.location && to.location) {
            try {
              const result = await directionsService.route({
                origin: from.location,
                destination: to.location,
                travelMode: google.maps.TravelMode[travelMode],
              });

              if (result.routes[0]?.legs[0]) {
                const leg = result.routes[0].legs[0];
                const key = `${day}-${i}`;
                times.set(key, {
                  duration: leg.duration?.text || 'N/A',
                  distance: leg.distance?.text || 'N/A',
                  durationMinutes: Math.round((leg.duration?.value || 0) / 60),
                });
              }
            } catch (error) {
              console.error(`Travel time error from ${from.name} to ${to.name}:`, error);
            }
          }
        }
      }

      setTravelTimes(times);
      setCalculatingTravel(false);
    };

    const timer = setTimeout(calculateTravelTimes, 1500); // Longer delay for geocoding
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, flights, accommodations, startDate, travelMode]);

  const parseOpeningHours = (openingHours: string[] | undefined, dayOfWeek: number): { opens: number; closes: number; isClosed: boolean } => {
    if (!openingHours || openingHours.length === 0) {
      return { opens: 9, closes: 20, isClosed: false };
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    const dayHours = openingHours.find(h => h.startsWith(dayName));
    
    if (!dayHours) {
      return { opens: 9, closes: 20, isClosed: false };
    }

    if (dayHours.toLowerCase().includes('closed')) {
      return { opens: 0, closes: 0, isClosed: true };
    }

    let timeMatch = dayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);

    if (!timeMatch) {
      const singleAmPmMatch = dayHours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (singleAmPmMatch) {
        timeMatch = [
          singleAmPmMatch[0],
          singleAmPmMatch[1],
          singleAmPmMatch[2],
          singleAmPmMatch[5],
          singleAmPmMatch[3],
          singleAmPmMatch[4],
          singleAmPmMatch[5]
        ];
      }
    }

    if (!timeMatch) {
      timeMatch = dayHours.match(/(\d{1,2})\s*(AM|PM)\s*[–-]\s*(\d{1,2})\s*(AM|PM)/i);
      if (timeMatch) {
        timeMatch = [
          timeMatch[0],
          timeMatch[1], '00', timeMatch[2],
          timeMatch[3], '00', timeMatch[4]
        ];
      }
    }

    if (!timeMatch) {
      return { opens: 9, closes: 20, isClosed: false };
    }

    let opensHour = parseInt(timeMatch[1]);
    const opensMinute = parseInt(timeMatch[2]);
    const opensAmPm = timeMatch[3].toUpperCase();
    
    let closesHour = parseInt(timeMatch[4]);
    const closesMinute = parseInt(timeMatch[5]);
    const closesAmPm = timeMatch[6].toUpperCase();

    if (opensAmPm === 'PM' && opensHour !== 12) opensHour += 12;
    if (opensAmPm === 'AM' && opensHour === 12) opensHour = 0;
    if (closesAmPm === 'PM' && closesHour !== 12) closesHour += 12;
    if (closesAmPm === 'AM' && closesHour === 12) closesHour = 0;

    return {
      opens: opensHour + opensMinute / 60,
      closes: closesHour + closesMinute / 60,
      isClosed: false,
    };
  };

  const generateSchedule = (): ScheduledActivity[] => {
    if (activities.length === 0 || !startDate || !endDate) return [];

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0); // Noon to avoid timezone issues
    
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0); // Noon to avoid timezone issues
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log('Date calculation:', {
      startDate,
      endDate,
      start: start.toISOString(),
      end: end.toISOString(),
      daysDiff: (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      totalDays
    });

    const schedule: ScheduledActivity[] = [];
    const daySchedules: { [day: number]: number } = {};
    const flightConstraints: { [day: number]: { earliestStart?: number; latestEnd?: number } } = {};

    flights?.forEach(flight => {
      flight.segments?.forEach(segment => {
        const [year, month, day] = segment.arrivalDate.split('-').map(Number);
        const arrivalDate = new Date(year, month - 1, day);
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const tripStartDate = new Date(startYear, startMonth - 1, startDay);
        
        const dayNumber = Math.floor((arrivalDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (flight.type === 'outbound' && dayNumber >= 1 && dayNumber <= totalDays) {
          const [hour, minute] = segment.arrivalTime.split(':').map(Number);
          const arrivalTimeDecimal = hour + minute / 60 + 1;
          
          if (!flightConstraints[dayNumber]) {
            flightConstraints[dayNumber] = {};
          }
          flightConstraints[dayNumber].earliestStart = Math.max(
            flightConstraints[dayNumber].earliestStart || 0,
            arrivalTimeDecimal
          );
        }
        
        const [depYear, depMonth, depDay] = segment.departureDate.split('-').map(Number);
        const departureDate = new Date(depYear, depMonth - 1, depDay);
        const depDayNumber = Math.floor((departureDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (flight.type === 'return' && depDayNumber >= 1 && depDayNumber <= totalDays) {
          const [hour, minute] = segment.departureTime.split(':').map(Number);
          const departureTimeDecimal = hour + minute / 60 - 3;
          
          if (!flightConstraints[depDayNumber]) {
            flightConstraints[depDayNumber] = {};
          }
          flightConstraints[depDayNumber].latestEnd = Math.min(
            flightConstraints[depDayNumber].latestEnd || 24,
            departureTimeDecimal
          );
        }
      });
    });

    for (let i = 1; i <= totalDays; i++) {
      daySchedules[i] = 9;
    }

    Object.entries(flightConstraints).forEach(([day, constraints]) => {
      const dayNum = parseInt(day);
      if (constraints.earliestStart) {
        daySchedules[dayNum] = Math.max(daySchedules[dayNum], constraints.earliestStart);
      }
    });

    // Apply check-in constraints - activities can't start until after check-in
    accommodations?.forEach(accommodation => {
      const [checkInYear, checkInMonth, checkInDay] = accommodation.checkIn.split('-').map(Number);
      const checkInDate = new Date(checkInYear, checkInMonth - 1, checkInDay);
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const tripStartDate = new Date(startYear, startMonth - 1, startDay);
      
      const checkInDayNumber = Math.floor((checkInDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (checkInDayNumber >= 1 && checkInDayNumber <= totalDays) {
        // Calculate check-in time: flight arrival + 1.5 hours (or default 3 PM)
        let checkInTimeDecimal = 15; // Default 3 PM
        
        const outboundFlight = flights?.find(f => f.type === 'outbound');
        if (outboundFlight?.segments) {
          const lastSegment = outboundFlight.segments[outboundFlight.segments.length - 1];
          const [arrYear, arrMonth, arrDay] = lastSegment.arrivalDate.split('-').map(Number);
          const arrDate = new Date(arrYear, arrMonth - 1, arrDay);
          
          if (arrDate.getTime() === checkInDate.getTime()) {
            const [hour, minute] = lastSegment.arrivalTime.split(':').map(Number);
            checkInTimeDecimal = hour + minute / 60 + 1.5;
          }
        }
        
        // Activities can't start until 1 hour after check-in
        daySchedules[checkInDayNumber] = Math.max(daySchedules[checkInDayNumber], checkInTimeDecimal + 1);
      }
    });

    const targetActivitiesPerDay = Math.ceil(activities.length / totalDays);

    console.log('Activity distribution:', {
      totalActivities: activities.length,
      totalDays,
      targetActivitiesPerDay,
      shouldSpreadAcross: `${activities.length} activities across ${totalDays} days`
    });

    activities.forEach((activity, activityIndex) => {
      // Handle manually scheduled activities
      if (activity.manualSchedule) {
        schedule.push({
          activity,
          day: activity.manualSchedule.day,
          time: activity.manualSchedule.time,
          dayOfWeek: 0,
          isManual: true,
        });
        console.log(`Activity "${activity.name}" manually scheduled on day ${activity.manualSchedule.day}`);
        return;
      }

      const targetDay = Math.floor(activityIndex / targetActivitiesPerDay) + 1;
      console.log(`Activity #${activityIndex} "${activity.name}" targeting day ${targetDay} of ${totalDays}`);
      
      let bestDay = null;
      const daysToTry = [targetDay];
      for (let d = 1; d <= totalDays; d++) {
        if (d !== targetDay) daysToTry.push(d);
      }

      for (const day of daysToTry) {
        if (day > totalDays) continue;
        
        const [year, month, dayNum] = startDate.split('-').map(Number);
        const scheduleDate = new Date(year, month - 1, dayNum);
        scheduleDate.setDate(scheduleDate.getDate() + day - 1);
        const dayOfWeek = scheduleDate.getDay();

        const hours = parseOpeningHours(activity.openingHours, dayOfWeek);
        
        const dayLatestEnd = flightConstraints[day]?.latestEnd || 20;
        if (!hours.isClosed && daySchedules[day] < dayLatestEnd) {
          let earliestTime = Math.max(hours.opens, daySchedules[day]);
          const duration = activity.type === 'restaurant' ? 1.5 : activity.type === 'hotel' ? 0 : 2;
          
          // Smart restaurant scheduling: if it's a restaurant and we're approaching meal time, schedule it then
          if (activity.type === 'restaurant') {
            const currentTime = daySchedules[day];
            
            // If we're before lunch time (12pm) and approaching it, schedule at lunch
            if (currentTime < 11.5 && earliestTime < 12) {
              earliestTime = Math.max(12, hours.opens, currentTime);
            }
            // If we're before dinner time (6pm) and approaching it, schedule at dinner
            else if (currentTime >= 14 && currentTime < 17.5 && earliestTime < 18) {
              earliestTime = Math.max(18, hours.opens, currentTime);
            }
          }
          
          if (earliestTime + duration <= hours.closes && earliestTime + duration <= dayLatestEnd) {
            bestDay = { day, time: earliestTime, hours, dayOfWeek };
            break;
          }
        }
      }

      if (bestDay) {
        const hour = Math.floor(bestDay.time);
        const minutes = Math.round((bestDay.time - hour) * 60);
        const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        let openingNote = undefined;
        if (bestDay.time === bestDay.hours.opens && bestDay.hours.opens > 9) {
          openingNote = `Opens at ${formatTime(bestDay.hours.opens)}`;
        }
        // Add meal time note for restaurants
        if (activity.type === 'restaurant') {
          if (bestDay.time >= 11.5 && bestDay.time < 14) {
            openingNote = openingNote ? `${openingNote} • Lunch time` : 'Lunch time';
          } else if (bestDay.time >= 17.5 && bestDay.time < 20) {
            openingNote = openingNote ? `${openingNote} • Dinner time` : 'Dinner time';
          }
        }

        schedule.push({
          activity,
          day: bestDay.day,
          time: timeString,
          dayOfWeek: bestDay.dayOfWeek,
          openingNote,
          isManual: false,
        });

        const duration = activity.type === 'restaurant' ? 1.5 : activity.type === 'hotel' ? 0 : 2;
        daySchedules[bestDay.day] = bestDay.time + duration;
      } else {
        schedule.push({
          activity,
          day: 1,
          time: '—',
          dayOfWeek: 0,
          openingNote: 'Unable to schedule - check opening hours',
          isManual: false,
        });
      }
    });

    console.log('=== SCHEDULE GENERATION DEBUG ===');
    console.log('Total days:', totalDays);
    console.log('Total activities:', activities.length);
    console.log('Target activities per day:', targetActivitiesPerDay);
    console.log('Generated schedule:', schedule.map(s => ({ 
      name: s.activity.name, 
      day: s.day, 
      time: s.time 
    })));
    console.log('Day schedules (end times):', daySchedules);

    return schedule;
  };

  const formatTime = (time: number): string => {
    const hour = Math.floor(time);
    const minutes = Math.round((time - hour) * 60);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activities.findIndex(a => a.id === active.id);
      const newIndex = activities.findIndex(a => a.id === over.id);

      const reordered = arrayMove(activities, oldIndex, newIndex);
      onReorderActivities(reordered);
    }
  };

  const openEditModal = (activity: Activity, day: number, time: string) => {
    setEditModal({
      isOpen: true,
      activity,
      currentDay: day,
      currentTime: time === '—' ? '09:00' : time,
    });
  };

  const saveManualSchedule = () => {
    if (!editModal.activity) return;

    // Validate against opening hours
    const [year, month, dayNum] = startDate.split('-').map(Number);
    const scheduleDate = new Date(year, month - 1, dayNum);
    scheduleDate.setDate(scheduleDate.getDate() + editModal.currentDay - 1);
    const dayOfWeek = scheduleDate.getDay();
    
    const hours = parseOpeningHours(editModal.activity.openingHours, dayOfWeek);
    
    if (hours.isClosed) {
      alert(`⚠️ ${editModal.activity.name} is closed on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}s. Please choose a different day.`);
      return;
    }
    
    // Check if selected time is within opening hours
    const [hour, minute] = editModal.currentTime.split(':').map(Number);
    const selectedTimeDecimal = hour + minute / 60;
    
    if (selectedTimeDecimal < hours.opens || selectedTimeDecimal > hours.closes - 1) {
      const openTime = formatTime(hours.opens);
      const closeTime = formatTime(hours.closes);
      
      const confirmed = window.confirm(
        `⚠️ Warning: ${editModal.activity.name} is open ${openTime} - ${closeTime} on this day.\n\n` +
        `You selected ${editModal.currentTime}, which is outside operating hours.\n\n` +
        `Do you want to schedule it anyway?`
      );
      
      if (!confirmed) return;
    }

    onUpdateActivity(editModal.activity.id, {
      manualSchedule: {
        day: editModal.currentDay,
        time: editModal.currentTime,
      },
    });

    setEditModal({ isOpen: false, activity: null, currentDay: 1, currentTime: '09:00' });
  };

  const clearManualSchedule = () => {
    if (!editModal.activity) return;

    // Set to null instead of undefined to ensure Firestore clears the field
    onUpdateActivity(editModal.activity.id, {
      manualSchedule: null as any,
    });

    setEditModal({ isOpen: false, activity: null, currentDay: 1, currentTime: '09:00' });
  };

  const schedule = generateSchedule();

  if (schedule.length === 0) {
    return null;
  }

  const scheduleByDay: { [key: number]: ScheduledActivity[] } = {};
  schedule.forEach(item => {
    if (!scheduleByDay[item.day]) {
      scheduleByDay[item.day] = [];
    }
    scheduleByDay[item.day].push(item);
  });

  console.log('=== SCHEDULE BY DAY ===');
  console.log('Days with activities:', Object.keys(scheduleByDay));
  Object.entries(scheduleByDay).forEach(([day, items]) => {
    console.log(`Day ${day}:`, items.map(i => i.activity.name));
  });

  const formatDayDate = (dayNumber: number) => {
    const [year, month, day] = startDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
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

  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>📅 Smart Schedule (Drag to Reorder)</h3>
        
        {/* Travel Mode Toggle */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {calculatingTravel && (
            <span style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
              ⏳ Calculating travel times...
            </span>
          )}
          <div style={{ display: 'flex', gap: '10px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '8px' }}>
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
        </div>
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
          <div style={{ marginTop: '20px' }}>
            {/* Render all days of the trip, not just days with activities */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
              const items = scheduleByDay[day] || [];
              
              // Build dayItems array
              const dayItems: Array<{
                type: 'flight' | 'activity' | 'accommodation';
                time: string;
                timeDecimal: number;
                data: any;
              }> = [];

              flights?.filter(f => f && f.segments && f.segments.length > 0).forEach(flight => {
                // Check if any segment of this flight is on this day
                const flightOnThisDay = flight.segments.some(segment => {
                  const dateToCheck = flight.type === 'outbound' 
                    ? segment.arrivalDate 
                    : segment.departureDate;
                  const [segYear, segMonth, segDay] = dateToCheck.split('-').map(Number);
                  const segDate = new Date(segYear, segMonth - 1, segDay);
                  const [dayYear, dayMonth, dayDay] = startDate.split('-').map(Number);
                  const currentDayDate = new Date(dayYear, dayMonth - 1, dayDay);
                  currentDayDate.setDate(currentDayDate.getDate() + day - 1);
                  return segDate.getTime() === currentDayDate.getTime();
                });
                
                if (flightOnThisDay) {
                  // Use first segment's departure time for sorting
                  const timeSegment = flight.type === 'outbound' 
                    ? flight.segments[0] 
                    : flight.segments[flight.segments.length - 1];
                  const timeToShow = timeSegment.departureTime;
                  
                  const [hour, minute] = timeToShow.split(':').map(Number);
                  const timeDecimal = hour + minute / 60;
                  
                  // Add entire flight as one item with all segments
                  dayItems.push({
                    type: 'flight',
                    time: timeToShow,
                    timeDecimal,
                    data: { flight, allSegments: flight.segments },
                  });
                }
              });
                      
                    // Add accommodations (check-in and check-out)
                    accommodations?.forEach(accommodation => {
                      const [checkInYear, checkInMonth, checkInDay] = accommodation.checkIn.split('-').map(Number);
                      const checkInDate = new Date(checkInYear, checkInMonth - 1, checkInDay);
                      
                      const [checkOutYear, checkOutMonth, checkOutDay] = accommodation.checkOut.split('-').map(Number);
                      const checkOutDate = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);
                      
                      const [dayYear, dayMonth, dayDay] = startDate.split('-').map(Number);
                      const currentDayDate = new Date(dayYear, dayMonth - 1, dayDay);
                      currentDayDate.setDate(currentDayDate.getDate() + day - 1);
                      
                      // Check-in on arrival day
                      if (checkInDate.getTime() === currentDayDate.getTime()) {
                        let checkInTimeDecimal = 15; // Default 3 PM
                        
                        // Find outbound flight arrival on this day
                        const outboundFlight = flights?.find(f => f.type === 'outbound');
                        if (outboundFlight?.segments) {
                          const lastSegment = outboundFlight.segments[outboundFlight.segments.length - 1];
                          const [arrYear, arrMonth, arrDay] = lastSegment.arrivalDate.split('-').map(Number);
                          const arrDate = new Date(arrYear, arrMonth - 1, arrDay);
                          
                          if (arrDate.getTime() === currentDayDate.getTime()) {
                            const [hour, minute] = lastSegment.arrivalTime.split(':').map(Number);
                            // Flight arrival + 1 hour + 30 min travel = 1.5 hours
                            checkInTimeDecimal = hour + minute / 60 + 1.5;
                          }
                        }
                        
                        const checkInHour = Math.floor(checkInTimeDecimal);
                        const checkInMinute = Math.round((checkInTimeDecimal - checkInHour) * 60);
                        const checkInTime = `${checkInHour.toString().padStart(2, '0')}:${checkInMinute.toString().padStart(2, '0')}`;
                        
                        dayItems.push({
                          type: 'accommodation',
                          time: checkInTime,
                          timeDecimal: checkInTimeDecimal,
                          data: { accommodation, eventType: 'checkin' },
                        });
                      }
                      
                      // Check-out on departure day
                      if (checkOutDate.getTime() === currentDayDate.getTime()) {
                        const [hour, minute] = accommodation.checkOutTime.split(':').map(Number);
                        const checkOutTimeDecimal = hour + minute / 60;
                        
                        dayItems.push({
                          type: 'accommodation',
                          time: accommodation.checkOutTime,
                          timeDecimal: checkOutTimeDecimal,
                          data: { accommodation, eventType: 'checkout' },
                        });
                      }
                    });

                    items.forEach(item => {
                      let timeDecimal = 0;
                      if (item.time !== '—') {
                        const [hour, minute] = item.time.split(':').map(Number);
                        timeDecimal = hour + minute / 60;
                      } else {
                        timeDecimal = 999;
                      }
                      
                      dayItems.push({
                        type: 'activity',
                        time: item.time,
                        timeDecimal,
                        data: item,
                      });
                    });

              dayItems.sort((a, b) => a.timeDecimal - b.timeDecimal);

              // Render the day
              return (
                <div key={day} style={{ marginBottom: '30px' }}>
                  <div style={{
                    padding: '15px',
                    backgroundColor: '#2B579A',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '18px',
                  }}>
                    Day {day} - {formatDayDate(day)}
                  </div>
                  
                  <div style={{ marginTop: '10px' }}>
                    {dayItems.length === 0 ? (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        color: '#666',
                        fontStyle: 'italic'
                      }}>
                        No activities scheduled for this day
                      </div>
                    ) : (
                      <>
                        {dayItems.map((item, index) => {
                          // Get travel time between this item and next (regardless of type)
                          const hasNextItem = index < dayItems.length - 1;
                          const travelTimeKey = `${day}-${index}`;
                          const travelTime = hasNextItem ? travelTimes.get(travelTimeKey) : null;

                          return (
                            <React.Fragment key={`item-${day}-${index}`}>
                              {/* Render the item */}
                              {item.type === 'flight' ? (
                                <div
                                  key={`flight-${item.data.flight.id}-${day}`}
                                  style={{
                                    padding: '0',
                                    marginBottom: travelTime ? '5px' : '15px',
                                    backgroundColor: item.data.flight.type === 'outbound' ? '#d4edda' : '#fff3cd',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${item.data.flight.type === 'outbound' ? '#28a745' : '#ffc107'}`,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {/* Flight Header with Total Duration */}
                                  <div style={{
                                    padding: '12px 15px',
                                    backgroundColor: item.data.flight.type === 'outbound' ? '#c3e6cb' : '#ffeeba',
                                    borderBottom: '2px solid ' + (item.data.flight.type === 'outbound' ? '#b1dfbb' : '#ffe8a1'),
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                      {item.data.flight.type === 'outbound' ? '🛫 Outbound Flight' : '🛬 Return Flight'}
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                                      {(() => {
                                        const firstSeg = item.data.allSegments[0];
                                        const lastSeg = item.data.allSegments[item.data.allSegments.length - 1];
                                        const startTime = new Date(`${firstSeg.departureDate}T${firstSeg.departureTime}`);
                                        const endTime = new Date(`${lastSeg.arrivalDate}T${lastSeg.arrivalTime}`);
                                        const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
                                        const hours = Math.floor(durationMinutes / 60);
                                        const minutes = durationMinutes % 60;
                                        return `⏱️ ${firstSeg.departureAirport} → ${lastSeg.arrivalAirport} • ${hours}h ${minutes}m total`;
                                      })()}
                                    </div>
                                  </div>

                                  {/* All Flight Segments */}
                                  {item.data.allSegments.map((segment: any, segIndex: number) => (
                                    <React.Fragment key={segment.id}>
                                      <div style={{
                                        padding: '15px',
                                        display: 'flex',
                                        gap: '15px',
                                        alignItems: 'center',
                                        backgroundColor: segment.isLayover ? 'rgba(255, 193, 7, 0.1)' : 'transparent',
                                      }}>
                                        <div style={{
                                          fontSize: '18px',
                                          fontWeight: 'bold',
                                          color: item.data.flight.type === 'outbound' ? '#28a745' : '#f0ad4e',
                                          minWidth: '70px',
                                        }}>
                                          {segment.departureTime}
                                        </div>
                                        
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                            ✈️ {segment.airline} {segment.flightNumber}
                                            {segment.isLayover && ' 🔄 (Connection)'}
                                          </div>
                                          <div style={{ fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{segment.departureAirport}</span>
                                            <span style={{ color: '#999' }}>→</span>
                                            <span>{segment.arrivalAirport}</span>
                                            <span style={{ color: '#999' }}>•</span>
                                            <span>Arrives {segment.arrivalTime}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Layover indicator between segments */}
                                      {segIndex < item.data.allSegments.length - 1 && (
                                        <div style={{
                                          padding: '8px 15px',
                                          backgroundColor: '#fff3cd',
                                          borderTop: '1px dashed #ffc107',
                                          borderBottom: '1px dashed #ffc107',
                                          fontSize: '13px',
                                          color: '#856404',
                                          fontStyle: 'italic',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                        }}>
                                          <span>🕐</span>
                                          <span>
                                            Layover in {segment.arrivalAirport}: {(() => {
                                              const nextSeg = item.data.allSegments[segIndex + 1];
                                              const arrivalTime = new Date(`${segment.arrivalDate}T${segment.arrivalTime}`);
                                              const departureTime = new Date(`${nextSeg.departureDate}T${nextSeg.departureTime}`);
                                              const layoverMinutes = Math.floor((departureTime.getTime() - arrivalTime.getTime()) / 60000);
                                              const hours = Math.floor(layoverMinutes / 60);
                                              const minutes = layoverMinutes % 60;
                                              return `${hours}h ${minutes}m`;
                                            })()}
                                          </span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  ))}
                                  
                                  {/* Footer Note */}
                                  <div style={{
                                    padding: '10px 15px',
                                    backgroundColor: item.data.flight.type === 'outbound' ? '#e8f5e9' : '#fffbf0',
                                    fontSize: '13px',
                                    color: '#666',
                                    fontStyle: 'italic',
                                    borderTop: '1px solid ' + (item.data.flight.type === 'outbound' ? '#c8e6c9' : '#ffecb3'),
                                  }}>
                                    {item.data.flight.type === 'outbound' 
                                      ? 'ℹ️ Activities start 1hr after final landing'
                                      : 'ℹ️ Finish activities 3hrs before first departure'
                                    }
                                  </div>
                                </div>
                              ) : item.type === 'accommodation' ? (
                                <div
                                  key={`accommodation-${item.data.accommodation.id}-${item.data.eventType}-${day}`}
                                  style={{
                                    padding: '15px',
                                    marginBottom: travelTime ? '5px' : '10px',
                                    backgroundColor: '#e7f3ff',
                                    borderLeft: `4px solid ${item.data.eventType === 'checkin' ? '#28a745' : '#dc3545'}`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '15px',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div style={{
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    color: item.data.eventType === 'checkin' ? '#28a745' : '#dc3545',
                                    minWidth: '70px',
                                  }}>
                                    {item.time}
                                  </div>
                                  
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                      {item.data.eventType === 'checkin' ? '🏨 Check-in' : '🧳 Check-out'} - {item.data.accommodation.name}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                      📍 {item.data.accommodation.address}
                                    </div>
                                    {item.data.eventType === 'checkin' && (
                                      <div style={{ 
                                        fontSize: '13px', 
                                        color: '#28a745',
                                        marginTop: '4px',
                                        fontStyle: 'italic'
                                      }}>
                                        ℹ️ 1hr after flight + 30min travel • Activities start 1hr after check-in
                                      </div>
                                    )}
                                    {item.data.accommodation.confirmationNumber && (
                                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                        📋 Confirmation: {item.data.accommodation.confirmationNumber}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <SortableItem key={item.data.activity.id} id={item.data.activity.id}>
                                  <div
                                    style={{
                                      padding: '15px',
                                      marginBottom: travelTime ? '5px' : '10px',
                                      backgroundColor: item.data.time === '—' ? '#fff3cd' : '#f8f9fa',
                                      borderRadius: '8px',
                                      borderLeft: `4px solid ${item.data.isManual ? '#28a745' : item.data.time === '—' ? '#ffc107' : '#2B579A'}`,
                                      display: 'flex',
                                      gap: '15px',
                                      alignItems: 'center',
                                      cursor: 'grab',
                                    }}
                                  >
                                    <div style={{ fontSize: '18px', color: '#999' }}>
                                      ⋮⋮
                                    </div>

                                    <div style={{
                                      fontSize: '20px',
                                      fontWeight: 'bold',
                                      color: item.data.time === '—' ? '#856404' : '#2B579A',
                                      minWidth: '70px',
                                    }}>
                                      {item.data.time}
                                      {item.data.isManual && <span style={{ marginLeft: '5px' }}>🔒</span>}
                                    </div>
                                    
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                        {getActivityIcon(item.data.activity.type)} {item.data.activity.name}
                                      </div>
                                      <div style={{ fontSize: '14px', color: '#666' }}>
                                        📍 {item.data.activity.address}
                                      </div>
                                      {item.data.openingNote && (
                                        <div style={{ 
                                          fontSize: '13px', 
                                          color: item.data.time === '—' ? '#856404' : '#2B579A',
                                          marginTop: '4px',
                                          fontStyle: 'italic'
                                        }}>
                                          ℹ️ {item.data.openingNote}
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(item.data.activity, day, item.data.time);
                                      }}
                                      style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#2B579A',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                      }}
                                    >
                                      ✏️ Edit Time
                                    </button>
                                  </div>
                                </SortableItem>
                              )}

                              {/* Travel Time Indicator */}
                              {travelTime && (
                                <div
                                  style={{
                                    padding: '8px 15px',
                                    marginBottom: '10px',
                                    backgroundColor: travelMode === 'DRIVING' ? '#e8f5e9' : '#e3f2fd',
                                    borderRadius: '6px',
                                    borderLeft: `3px solid ${travelMode === 'DRIVING' ? '#4caf50' : '#2196f3'}`,
                                    fontSize: '13px',
                                    color: '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                  }}
                                >
                                  <span>{travelMode === 'DRIVING' ? '🚗' : '🚇'}</span>
                                  <span style={{ fontWeight: 'bold' }}>{travelTime.duration}</span>
                                  <span style={{ color: '#999' }}>•</span>
                                  <span>{travelTime.distance}</span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1565c0',
      }}>
        💡 <strong>Smart Scheduling:</strong> Drag activities to reorder, or click "Edit Time" to set a specific time. 🔒 = Manually scheduled.
      </div>

      {editModal.isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
            }}
            onClick={() => setEditModal({ ...editModal, isOpen: false })}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              zIndex: 1000,
              minWidth: '400px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Edit Schedule Time</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {editModal.activity?.name}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Day:
              </label>
              <select
                value={editModal.currentDay}
                onChange={(e) => setEditModal({ ...editModal, currentDay: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '2px solid #ddd',
                }}
              >
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNum => (
                  <option key={dayNum} value={dayNum}>
                    Day {dayNum} - {formatDayDate(dayNum)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Time:
              </label>
              <input
                type="time"
                value={editModal.currentTime}
                onChange={(e) => setEditModal({ ...editModal, currentTime: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '2px solid #ddd',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={saveManualSchedule}
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
                Save
              </button>
              {editModal.activity?.manualSchedule && (
                <button
                  onClick={clearManualSchedule}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  Reset to Auto
                </button>
              )}
              <button
                onClick={() => setEditModal({ ...editModal, isOpen: false })}
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
        </>
      )}
    </div>
  );
}

export default ScheduleGenerator;
