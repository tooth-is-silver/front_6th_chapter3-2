import { Event } from '../types';

const createSingleEventRepeatConfig = () => ({
  type: 'none' as const,
  interval: 1,
  endDate: undefined,
  endCondition: undefined,
  endCount: undefined,
});

export function convertRecurringToSingle(event: Event): Event {
  return {
    ...event,
    repeat: createSingleEventRepeatConfig(),
  };
}
