// Utility functions for checking availability conflicts

export interface AvailabilityConflict {
  hasConflict: boolean;
  conflictingTimes: string[];
  conflictingDays: string[];
}

/**
 * Parse lab days string and return array of day names
 * Examples: "Monday", "Monday, Wednesday", "MWF" -> ["Monday", "Wednesday", "Friday"]
 */
export function parseLabDays(labDays: string): string[] {
  if (!labDays) return [];
  
  // Handle full day names
  if (labDays.includes(',')) {
    return labDays.split(',').map(day => day.trim());
  }
  
  // Handle abbreviated formats like "MWF"
  const dayMap: { [key: string]: string } = {
    'M': 'Monday',
    'T': 'Tuesday', 
    'W': 'Wednesday',
    'R': 'Thursday', // R is commonly used for Thursday
    'F': 'Friday'
  };
  
  if (labDays.length <= 5 && /^[MTWRF]+$/.test(labDays)) {
    return labDays.split('').map(abbrev => dayMap[abbrev]).filter(Boolean);
  }
  
  // Default: treat as single day
  return [labDays.trim()];
}

/**
 * Convert time string to hour index (8:00 -> 0, 9:00 -> 1, etc.)
 */
export function timeToHourIndex(timeStr: string): number {
  if (!timeStr) return -1;
  
  // Handle formats like "9:00", "09:00", "9:00 AM", etc.
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?/);
  if (!match) return -1;
  
  let hour = parseInt(match[1]);
  // const minute = parseInt(match[2] || '0'); // Not used in hourly grid
  
  // Convert to 24-hour format if needed
  if (timeStr.toLowerCase().includes('pm') && hour !== 12) {
    hour += 12;
  } else if (timeStr.toLowerCase().includes('am') && hour === 12) {
    hour = 0;
  }
  
  // Our availability grid starts at 8:00 AM (index 0)
  return hour - 8;
}

/**
 * Get array of hour indices that a lab session spans
 */
export function getLabTimeRange(startTime: string, endTime: string): number[] {
  const startIndex = timeToHourIndex(startTime);
  const endIndex = timeToHourIndex(endTime);
  
  if (startIndex === -1 || endIndex === -1) return [];
  
  const range: number[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    if (i >= 0 && i < 10) { // Our grid is 8:00-17:00 (10 hours)
      range.push(i);
    }
  }
  
  return range;
}

/**
 * Check if student's availability conflicts with lab section times
 */
export function checkAvailabilityConflict(
  studentAvailability: string,
  labDays: string,
  labStartTime: string,
  labEndTime: string
): AvailabilityConflict {
  const result: AvailabilityConflict = {
    hasConflict: false,
    conflictingTimes: [],
    conflictingDays: []
  };
  
  if (!studentAvailability) {
    return result; // No availability data means no conflict
  }
  
  try {
    // Parse the availability grid - handle different formats
    let availabilityGrid: boolean[][];
    
    if (typeof studentAvailability === 'string') {
      // Try to parse as JSON
      try {
        availabilityGrid = JSON.parse(studentAvailability);
      } catch (parseError) {
        console.error('JSON parse error for availability:', parseError);
        console.log('Raw availability data:', studentAvailability);
        return result; // Return no conflict on parse error
      }
    } else {
      // Assume it's already parsed
      availabilityGrid = studentAvailability as boolean[][];
    }
    
    if (!Array.isArray(availabilityGrid)) {
      console.error('Availability data is not an array:', availabilityGrid);
      return result;
    }
    
    // Get lab session details
    const labDayNames = parseLabDays(labDays);
    const labTimeIndices = getLabTimeRange(labStartTime, labEndTime);
    
    if (labDayNames.length === 0 || labTimeIndices.length === 0) {
      return result;
    }
    
    // Day mapping for our grid
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const hourNames = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`);
    
    // Check each lab day and time slot
    for (const labDay of labDayNames) {
      const dayIndex = dayNames.indexOf(labDay);
      if (dayIndex === -1) continue;
      
      for (const timeIndex of labTimeIndices) {
        // Check if this time slot is marked as unavailable (true in our new system)
        if (availabilityGrid[timeIndex] && availabilityGrid[timeIndex][dayIndex]) {
          result.hasConflict = true;
          const timeSlot = hourNames[timeIndex];
          const conflictTime = `${labDay} ${timeSlot}`;
          
          if (!result.conflictingTimes.includes(conflictTime)) {
            result.conflictingTimes.push(conflictTime);
          }
          
          if (!result.conflictingDays.includes(labDay)) {
            result.conflictingDays.push(labDay);
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing availability data:', error);
    return result; // Return no conflict on parse error
  }
}

/**
 * Format conflict information for display
 */
export function formatConflictMessage(conflict: AvailabilityConflict): string {
  if (!conflict.hasConflict) return '';
  
  if (conflict.conflictingTimes.length === 1) {
    return `Student marked themselves as unavailable during ${conflict.conflictingTimes[0]}`;
  } else {
    return `Student marked themselves as unavailable during: ${conflict.conflictingTimes.join(', ')}`;
  }
}
