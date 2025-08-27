import { Event } from '../types';

/**
 * 반복 일정을 단일 일정으로 변환합니다.
 * @param event 변환할 이벤트
 * @returns 단일 일정으로 변환된 이벤트
 */
export function convertRecurringToSingle(event: Event): Event {
  return {
    ...event,
    repeat: {
      type: 'none',
      interval: 1,
    },
  };
}
