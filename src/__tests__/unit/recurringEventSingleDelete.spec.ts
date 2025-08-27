import { Event } from '../../types';
import { deleteSingleRecurringEvent } from '../../utils/recurringEventDelete';

describe('반복 일정 단일 삭제', () => {
  const mockRecurringEvents: Event[] = [
    {
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
    },
    {
      id: '2',
      title: '매주 회의',
      date: '2025-01-08',
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
    },
    {
      id: '3',
      title: '매주 회의',
      date: '2025-01-15',
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
    },
  ];

  it('특정 날짜의 반복 일정만 삭제되고 나머지는 남아있어야 한다', () => {
    const result = deleteSingleRecurringEvent(mockRecurringEvents, '2');

    expect(result).toHaveLength(2);
    expect(result.find((event) => event.id === '1')).toBeDefined();
    expect(result.find((event) => event.id === '2')).toBeUndefined();
    expect(result.find((event) => event.id === '3')).toBeDefined();
  });

  it('존재하지 않는 ID로 삭제 시도 시 원래 배열을 반환해야 한다', () => {
    const result = deleteSingleRecurringEvent(mockRecurringEvents, 'non-existent');

    expect(result).toHaveLength(3);
    expect(result).toEqual(mockRecurringEvents);
  });

  it('빈 배열에서 삭제 시도 시 빈 배열을 반환해야 한다', () => {
    const result = deleteSingleRecurringEvent([], '1');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('단일 이벤트만 있는 배열에서 삭제 시 빈 배열을 반환해야 한다', () => {
    const singleEvent = [mockRecurringEvents[0]];
    const result = deleteSingleRecurringEvent(singleEvent, '1');

    expect(result).toHaveLength(0);
  });
});
