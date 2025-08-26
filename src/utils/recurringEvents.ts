import { Event } from '../types';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isValidRecurrenceDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function getNextRecurrenceDate(
  baseDate: Date,
  type: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number,
  occurrenceCount: number
): Date | null {
  const result = new Date(baseDate);
  
  switch (type) {
    case 'daily':
      result.setDate(result.getDate() + (interval * occurrenceCount));
      return result;
      
    case 'weekly':
      result.setDate(result.getDate() + (7 * interval * occurrenceCount));
      return result;
      
    case 'monthly': {
      const originalDay = baseDate.getDate();
      const totalMonths = result.getMonth() + (interval * occurrenceCount);
      const targetYear = result.getFullYear() + Math.floor(totalMonths / 12);
      const targetMonth = (totalMonths % 12) + 1; // +1 because month is 1-based for isValidRecurrenceDate
      
      // 먼저 유효성을 검사한 후 날짜를 설정
      if (!isValidRecurrenceDate(targetYear, targetMonth, originalDay)) {
        return null;
      }
      
      result.setFullYear(targetYear);
      result.setMonth(targetMonth - 1); // -1 because setMonth expects 0-based month
      result.setDate(originalDay);
      return result;
    }
    
    case 'yearly': {
      const originalMonth = baseDate.getMonth() + 1;
      const originalDay = baseDate.getDate();
      const targetYear = result.getFullYear() + (interval * occurrenceCount);
      
      if (!isValidRecurrenceDate(targetYear, originalMonth, originalDay)) {
        return null;
      }
      
      result.setFullYear(targetYear);
      return result;
    }
    
    default:
      return null;
  }
}

export function generateRecurringEvents(baseEvent: Event): Event[] {
  if (baseEvent.repeat.type === 'none') {
    return [baseEvent];
  }

  const events: Event[] = [baseEvent];
  const startDate = new Date(baseEvent.date);
  const endDate = baseEvent.repeat.endDate ? new Date(baseEvent.repeat.endDate) : null;
  
  let occurrenceCount = 1;
  let currentDate: Date | null;
  
  while (true) {
    currentDate = getNextRecurrenceDate(
      startDate,
      baseEvent.repeat.type as 'daily' | 'weekly' | 'monthly' | 'yearly',
      baseEvent.repeat.interval,
      occurrenceCount
    );
    
    occurrenceCount++;
    
    if (!currentDate) {
      // 무효한 날짜인 경우 다음 occurrence를 시도
      if (occurrenceCount > 1000) {
        break;
      }
      continue;
    }
    
    if (endDate && currentDate > endDate) {
      break;
    }
    
    const recurringEvent: Event = {
      ...baseEvent,
      id: `${baseEvent.id}-${occurrenceCount}`,
      date: currentDate.toISOString().split('T')[0]
    };
    
    events.push(recurringEvent);
    
    if (occurrenceCount > 1000) {
      break;
    }
  }
  
  return events;
}