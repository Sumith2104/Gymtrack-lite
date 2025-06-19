import { formatInTimeZone } from 'date-fns-tz';
import { isValid, parseISO as dateFnsParseISO } from 'date-fns'; 

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
      return "Invalid Date"; 
    }
    return formatInTimeZone(dateObj, 'Asia/Kolkata', formatString);
  } catch (error) {
    console.error("Error formatting date for IST:", error);
    return "Invalid Date"; 
  }
}
