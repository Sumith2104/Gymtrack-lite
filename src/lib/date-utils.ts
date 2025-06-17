// src/lib/date-utils.ts

import { formatInTimeZone } from 'date-fns-tz';
import { isValid, parseISO as dateFnsParseISO } from 'date-fns'; // Added parseISO for robust parsing

// Wrapper for parseISO to handle potential invalid dates gracefully
export function parseValidISO(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    const parsed = dateFnsParseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}


export function formatDateIST(date: Date | string | number, formatString: string = 'PPpp'): string {
  try {
    let dateObj: Date | null;

    if (typeof date === 'string') {
      dateObj = parseValidISO(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = null;
    }
    
    if (!dateObj || !isValid(dateObj)) {
      // console.warn('Invalid date value provided to formatDateIST:', date);
      return "Invalid Date"; // Or "N/A" or throw error
    }
    return formatInTimeZone(dateObj, 'Asia/Kolkata', formatString);
  } catch (error) {
    console.error("Error formatting date for IST:", error);
    return "Invalid Date"; 
  }
}
