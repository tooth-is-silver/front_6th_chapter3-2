import { Event } from '../types';

export function deleteSingleRecurringEvent(events: Event[], eventIdToDelete: string): Event[] {
  return events.filter((event) => event.id !== eventIdToDelete);
}
