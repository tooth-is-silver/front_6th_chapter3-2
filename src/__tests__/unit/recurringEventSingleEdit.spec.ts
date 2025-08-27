import { Event } from '../../types';
import { convertRecurringToSingle } from '../../utils/recurringEventEdit';

describe('반복 일정 단일 수정', () => {
  const mockRecurringEvent: Event = {
    id: '1',
    title: '매주 회의',
    date: '2025-01-01',
    startTime: '09:00',
    endTime: '10:00',
    description: '매주 반복 회의',
    location: '회의실 A',
    category: '업무',
    repeat: {
      type: 'weekly',
      interval: 1,
      endDate: '2025-06-30',
      endCondition: 'endDate',
    },
    notificationTime: 10,
  };

  it('반복 일정을 수정하면 단일 일정으로 변경되어야 한다', () => {
    const updatedEvent = {
      ...mockRecurringEvent,
      title: '수정된 회의',
      description: '단일 회의로 변경',
    };

    const result = convertRecurringToSingle(updatedEvent);

    expect(result.repeat.type).toBe('none');
    expect(result.repeat.interval).toBe(1);
    expect(result.repeat.endDate).toBeUndefined();
    expect(result.repeat.endCondition).toBeUndefined();
    expect(result.title).toBe('수정된 회의');
    expect(result.description).toBe('단일 회의로 변경');
  });

  it('반복 일정의 다른 속성은 유지되어야 한다', () => {
    const updatedEvent = {
      ...mockRecurringEvent,
      startTime: '10:00',
      endTime: '11:00',
      location: '회의실 B',
    };

    const result = convertRecurringToSingle(updatedEvent);

    expect(result.id).toBe(mockRecurringEvent.id);
    expect(result.date).toBe(mockRecurringEvent.date);
    expect(result.startTime).toBe('10:00');
    expect(result.endTime).toBe('11:00');
    expect(result.location).toBe('회의실 B');
    expect(result.category).toBe(mockRecurringEvent.category);
    expect(result.notificationTime).toBe(mockRecurringEvent.notificationTime);
  });

  it('이미 단일 일정인 경우 그대로 유지되어야 한다', () => {
    const singleEvent: Event = {
      ...mockRecurringEvent,
      repeat: {
        type: 'none',
        interval: 1,
      },
    };

    const result = convertRecurringToSingle(singleEvent);

    expect(result.repeat.type).toBe('none');
    expect(result.repeat.interval).toBe(1);
    expect(result.repeat.endDate).toBeUndefined();
    expect(result.repeat.endCondition).toBeUndefined();
  });

  it('복합 반복 설정도 모두 단일로 초기화되어야 한다', () => {
    const complexRecurringEvent: Event = {
      ...mockRecurringEvent,
      repeat: {
        type: 'monthly',
        interval: 2,
        endDate: '2025-12-31',
        endCondition: 'endCount',
        endCount: 10,
      },
    };

    const result = convertRecurringToSingle(complexRecurringEvent);

    expect(result.repeat.type).toBe('none');
    expect(result.repeat.interval).toBe(1);
    expect(result.repeat.endDate).toBeUndefined();
    expect(result.repeat.endCondition).toBeUndefined();
    expect(result.repeat.endCount).toBeUndefined();
  });
});
