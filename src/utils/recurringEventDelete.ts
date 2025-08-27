import { Event } from '../types';

const isNotTargetEvent = (eventIdToDelete: string) => (event: Event) =>
  event.id !== eventIdToDelete;

export function deleteSingleRecurringEvent(events: Event[], eventIdToDelete: string): Event[] {
  return events.filter(isNotTargetEvent(eventIdToDelete));
}
