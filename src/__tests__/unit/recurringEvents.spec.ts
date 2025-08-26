import { Event, RepeatType } from '../../types';
import {
  generateRecurringEvents,
  isValidRecurrenceDate,
  isLeapYear,
} from '../../utils/recurringEvents';

// 테스트를 위한 기본 이벤트 팩토리
const createBaseEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'test-1',
  title: '테스트 이벤트',
  date: '2024-01-01',
  startTime: '09:00',
  endTime: '10:00',
  description: '',
  location: '',
  category: '업무',
  repeat: {
    type: 'none' as RepeatType,
    interval: 1,
    endDate: '2024-12-31',
  },
  notificationTime: 10,
  ...overrides,
});

describe('반복 일정 생성 로직', () => {
  describe('generateRecurringEvents', () => {
    it('매일 반복: 연속된 7일간 일정을 생성해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-01',
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2024-01-07',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(7);
      expect(recurringEvents[0].date).toBe('2024-01-01');
      expect(recurringEvents[1].date).toBe('2024-01-02');
      expect(recurringEvents[6].date).toBe('2024-01-07');

      recurringEvents.forEach((event) => {
        expect(event.startTime).toBe('09:00');
        expect(event.endTime).toBe('10:00');
        expect(event.title).toBe('테스트 이벤트');
      });
    });

    it('매주 반복: 동일한 요일에 4주간 일정을 생성해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-01', // 월요일
        repeat: {
          type: 'weekly',
          interval: 1,
          endDate: '2024-01-29',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(5); // 1/1, 1/8, 1/15, 1/22, 1/29
      expect(recurringEvents[0].date).toBe('2024-01-01');
      expect(recurringEvents[1].date).toBe('2024-01-08');
      expect(recurringEvents[2].date).toBe('2024-01-15');
      expect(recurringEvents[3].date).toBe('2024-01-22');
      expect(recurringEvents[4].date).toBe('2024-01-29');
    });

    it('매월 반복: 동일한 일자에 3개월간 일정을 생성해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-15',
        repeat: {
          type: 'monthly',
          interval: 1,
          endDate: '2024-03-15',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(3); // 1/15, 2/15, 3/15
      expect(recurringEvents[0].date).toBe('2024-01-15');
      expect(recurringEvents[1].date).toBe('2024-02-15');
      expect(recurringEvents[2].date).toBe('2024-03-15');
    });

    it('매년 반복: 동일한 월일에 2년간 일정을 생성해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-15',
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2025-01-15',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(2); // 2024-01-15, 2025-01-15
      expect(recurringEvents[0].date).toBe('2024-01-15');
      expect(recurringEvents[1].date).toBe('2025-01-15');
    });

    it('반복 유형이 none인 경우 원본 이벤트만 반환해야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-01',
        repeat: {
          type: 'none',
          interval: 1,
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(1);
      expect(recurringEvents[0]).toEqual(baseEvent);
    });

    it('interval이 2인 경우 격일/격주/격월/격년으로 생성해야 한다', () => {
      const dailyEvent = createBaseEvent({
        date: '2024-01-01',
        repeat: {
          type: 'daily',
          interval: 2,
          endDate: '2024-01-05',
        },
      });

      const recurringEvents = generateRecurringEvents(dailyEvent);

      expect(recurringEvents).toHaveLength(3); // 1/1, 1/3, 1/5
      expect(recurringEvents[0].date).toBe('2024-01-01');
      expect(recurringEvents[1].date).toBe('2024-01-03');
      expect(recurringEvents[2].date).toBe('2024-01-05');
    });
  });

  describe('특수 케이스 처리', () => {
    it('31일 매월 반복: 31일이 없는 달은 건너뛰어야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-31', // 1월 31일
        repeat: {
          type: 'monthly',
          interval: 1,
          endDate: '2024-05-31',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      // 2월(28/29일), 4월(30일)은 31일이 없으므로 건너뜀
      // 예상: 1/31, 3/31, 5/31만 생성
      expect(recurringEvents).toHaveLength(3);
      expect(recurringEvents[0].date).toBe('2024-01-31');
      expect(recurringEvents[1].date).toBe('2024-03-31');
      expect(recurringEvents[2].date).toBe('2024-05-31');
    });

    it('30일 매월 반복: 2월은 건너뛰어야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-01-30', // 1월 30일
        repeat: {
          type: 'monthly',
          interval: 1,
          endDate: '2024-04-30',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      // 2월은 30일이 없으므로 건너뜀
      // 예상: 1/30, 3/30, 4/30만 생성
      expect(recurringEvents).toHaveLength(3);
      expect(recurringEvents[0].date).toBe('2024-01-30');
      expect(recurringEvents[1].date).toBe('2024-03-30');
      expect(recurringEvents[2].date).toBe('2024-04-30');
    });

    it('윤년 29일 매년 반복: 평년에는 건너뛰어야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-02-29', // 윤년 2월 29일
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2027-02-28',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      // 2025, 2026, 2027은 평년이므로 2/29가 없음, 2028은 윤년
      // 예상: 2024-02-29만 생성 (endDate가 2027-02-28이므로 2028년은 제외)
      expect(recurringEvents).toHaveLength(1);
      expect(recurringEvents[0].date).toBe('2024-02-29');
    });

    it('윤년 29일 매년 반복: 다음 윤년까지 포함하는 경우', () => {
      const baseEvent = createBaseEvent({
        date: '2024-02-29', // 윤년 2월 29일
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2028-02-29',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      // 2028년도 윤년이므로 2/29 존재
      // 예상: 2024-02-29, 2028-02-29만 생성
      expect(recurringEvents).toHaveLength(2);
      expect(recurringEvents[0].date).toBe('2024-02-29');
      expect(recurringEvents[1].date).toBe('2028-02-29');
    });

    it('일반적인 날짜의 매년 반복: 모든 해에 생성되어야 한다', () => {
      const baseEvent = createBaseEvent({
        date: '2024-03-15', // 일반적인 날짜
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2027-03-15',
        },
      });

      const recurringEvents = generateRecurringEvents(baseEvent);

      expect(recurringEvents).toHaveLength(4); // 2024, 2025, 2026, 2027
      expect(recurringEvents[0].date).toBe('2024-03-15');
      expect(recurringEvents[1].date).toBe('2025-03-15');
      expect(recurringEvents[2].date).toBe('2026-03-15');
      expect(recurringEvents[3].date).toBe('2027-03-15');
    });
  });

  describe('유효성 검증 함수', () => {
    describe('isValidRecurrenceDate', () => {
      it('일반적인 날짜는 항상 유효해야 한다', () => {
        expect(isValidRecurrenceDate(2024, 3, 15)).toBe(true);
        expect(isValidRecurrenceDate(2025, 6, 10)).toBe(true);
      });

      it('31일: 31일이 없는 달은 무효해야 한다', () => {
        expect(isValidRecurrenceDate(2024, 2, 31)).toBe(false); // 2월 31일 무효
        expect(isValidRecurrenceDate(2024, 4, 31)).toBe(false); // 4월 31일 무효
        expect(isValidRecurrenceDate(2024, 1, 31)).toBe(true); // 1월 31일 유효
        expect(isValidRecurrenceDate(2024, 3, 31)).toBe(true); // 3월 31일 유효
      });

      it('30일: 2월 30일은 무효해야 한다', () => {
        expect(isValidRecurrenceDate(2024, 2, 30)).toBe(false); // 2월 30일 무효
        expect(isValidRecurrenceDate(2024, 4, 30)).toBe(true); // 4월 30일 유효
      });

      it('29일: 평년 2월 29일은 무효해야 한다', () => {
        expect(isValidRecurrenceDate(2024, 2, 29)).toBe(true); // 윤년 2월 29일 유효
        expect(isValidRecurrenceDate(2025, 2, 29)).toBe(false); // 평년 2월 29일 무효
      });
    });

    describe('isLeapYear', () => {
      it('윤년을 정확히 판별해야 한다', () => {
        expect(isLeapYear(2024)).toBe(true); // 4로 나누어떨어지는 윤년
        expect(isLeapYear(2025)).toBe(false); // 평년
        expect(isLeapYear(2000)).toBe(true); // 400으로 나누어떨어지는 윤년
        expect(isLeapYear(1900)).toBe(false); // 100으로 나누어떨어지지만 400으로는 안 되는 평년
      });
    });
  });
});
