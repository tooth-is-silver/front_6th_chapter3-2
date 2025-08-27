import { Event } from '../../types';
import { generateRecurringEvents } from '../../utils/recurringEvents';

// 테스트를 위한 기본 이벤트 팩토리
const createBaseEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'test-1',
  title: '테스트 반복 이벤트',
  date: '2024-01-01',
  startTime: '09:00',
  endTime: '10:00',
  description: '',
  location: '',
  category: '업무',
  repeat: {
    type: 'none',
    interval: 1,
  },
  notificationTime: 10,
  ...overrides,
});

describe('반복 일정 종료 조건', () => {
  describe('특정 날짜까지 반복', () => {
    it('endDate가 설정된 경우 해당 날짜까지만 반복 일정을 생성해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-01',
        repeat: {
          type: 'daily',
          interval: 1,
          endCondition: 'endDate',
          endDate: '2024-01-05',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(5); // 1/1, 1/2, 1/3, 1/4, 1/5
      expect(recurringEvents[0].date).toBe('2024-01-01');
      expect(recurringEvents[4].date).toBe('2024-01-05');
    });
  });

  describe('특정 횟수만큼 반복', () => {
    it('endCount가 설정된 경우 해당 횟수만큼만 반복 일정을 생성해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-01',
        repeat: {
          type: 'weekly',
          interval: 1,
          endCondition: 'endCount',
          endCount: 3,
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(3); // 1/1, 1/8, 1/15
      expect(recurringEvents[0].date).toBe('2024-01-01');
      expect(recurringEvents[1].date).toBe('2024-01-08');
      expect(recurringEvents[2].date).toBe('2024-01-15');
    });
  });

  describe('종료 없음 (무한 반복)', () => {
    it('endCondition이 none인 경우 2025-06-30까지 반복 일정을 생성해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2025-01-01',
        repeat: {
          type: 'monthly',
          interval: 1,
          endCondition: 'none',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      // 2025-01-01부터 2025-06-30까지 매월
      expect(recurringEvents).toHaveLength(6); // 1월, 2월, 3월, 4월, 5월, 6월
      expect(recurringEvents[0].date).toBe('2025-01-01');
      expect(recurringEvents[5].date).toBe('2025-06-01');
    });
  });

  describe('기본값 처리', () => {
    it('endCondition이 없는 경우 기존 endDate 방식으로 동작해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-01',
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2024-01-03',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(3); // 1/1, 1/2, 1/3
    });
  });
});