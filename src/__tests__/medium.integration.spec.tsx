import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, act } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import {
  setupMockHandlerCreation,
  setupMockHandlerDeletion,
  setupMockHandlerUpdating,
} from '../__mocks__/handlersUtils';
import App from '../App';
import { server } from '../setupTests';
import { Event } from '../types';

const theme = createTheme();

// ! Hard 여기 제공 안함
const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

// ! Hard 여기 제공 안함
const saveSchedule = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime' | 'repeat'>
) => {
  const { title, date, startTime, endTime, location, description, category } = form;

  await user.click(screen.getAllByText('일정 추가')[0]);

  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);
  await user.type(screen.getByLabelText('설명'), description);
  await user.type(screen.getByLabelText('위치'), location);
  await user.click(screen.getByLabelText('카테고리'));
  await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${category}-option` }));

  await user.click(screen.getByTestId('event-submit-button'));
};

// 반복 일정 생성을 위한 헬퍼 함수
const saveRecurringSchedule = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime' | 'repeat'>,
  repeatType: 'weekly' | 'daily' | 'monthly' | 'yearly'
) => {
  const { title, date, startTime, endTime, location, description, category } = form;

  await user.click(screen.getAllByText('일정 추가')[0]);

  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);
  await user.type(screen.getByLabelText('설명'), description);
  await user.type(screen.getByLabelText('위치'), location);
  await user.click(screen.getByLabelText('카테고리'));
  await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${category}-option` }));

  // 반복 설정
  await user.click(within(screen.getByTestId('repeat-type-select')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${repeatType}-option` }));

  await user.click(screen.getByTestId('event-submit-button'));
};

describe('일정 CRUD 및 기본 기능', () => {
  it('입력한 새로운 일정 정보에 맞춰 모든 필드가 이벤트 리스트에 정확히 저장된다.', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);

    await saveSchedule(user, {
      title: '새 회의',
      date: '2025-10-15',
      startTime: '14:00',
      endTime: '15:00',
      description: '프로젝트 진행 상황 논의',
      location: '회의실 A',
      category: '업무',
    });

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('새 회의')).toBeInTheDocument();
    expect(eventList.getByText('2025-10-15')).toBeInTheDocument();
    expect(eventList.getByText('14:00 - 15:00')).toBeInTheDocument();
    expect(eventList.getByText('프로젝트 진행 상황 논의')).toBeInTheDocument();
    expect(eventList.getByText('회의실 A')).toBeInTheDocument();
    expect(eventList.getByText('카테고리: 업무')).toBeInTheDocument();
  });

  it('기존 일정의 세부 정보를 수정하고 변경사항이 정확히 반영된다', async () => {
    const { user } = setup(<App />);

    setupMockHandlerUpdating();

    await user.click(await screen.findByLabelText('Edit event'));

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '수정된 회의');
    await user.clear(screen.getByLabelText('설명'));
    await user.type(screen.getByLabelText('설명'), '회의 내용 변경');

    await user.click(screen.getByTestId('event-submit-button'));

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('수정된 회의')).toBeInTheDocument();
    expect(eventList.getByText('회의 내용 변경')).toBeInTheDocument();
  });

  it('일정을 삭제하고 더 이상 조회되지 않는지 확인한다', async () => {
    setupMockHandlerDeletion();

    const { user } = setup(<App />);
    const eventList = within(screen.getByTestId('event-list'));
    expect(await eventList.findByText('삭제할 이벤트')).toBeInTheDocument();

    // 삭제 버튼 클릭
    const allDeleteButton = await screen.findAllByLabelText('Delete event');
    await user.click(allDeleteButton[0]);

    expect(eventList.queryByText('삭제할 이벤트')).not.toBeInTheDocument();
  });
});

describe('일정 뷰', () => {
  it('주별 뷰를 선택 후 해당 주에 일정이 없으면, 일정이 표시되지 않는다.', async () => {
    // ! 현재 시스템 시간 2025-10-01
    const { user } = setup(<App />);

    await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'week-option' }));

    // ! 일정 로딩 완료 후 테스트
    await screen.findByText('일정 로딩 완료!');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('주별 뷰 선택 후 해당 일자에 일정이 존재한다면 해당 일정이 정확히 표시된다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);
    await saveSchedule(user, {
      title: '이번주 팀 회의',
      date: '2025-10-02',
      startTime: '09:00',
      endTime: '10:00',
      description: '이번주 팀 회의입니다.',
      location: '회의실 A',
      category: '업무',
    });

    await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'week-option' }));

    const weekView = within(screen.getByTestId('week-view'));
    expect(weekView.getByText('이번주 팀 회의')).toBeInTheDocument();
  });

  it('월별 뷰에 일정이 없으면, 일정이 표시되지 않아야 한다.', async () => {
    vi.setSystemTime(new Date('2025-01-01'));

    setup(<App />);

    // ! 일정 로딩 완료 후 테스트
    await screen.findByText('일정 로딩 완료!');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('월별 뷰에 일정이 정확히 표시되는지 확인한다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);
    await saveSchedule(user, {
      title: '이번달 팀 회의',
      date: '2025-10-02',
      startTime: '09:00',
      endTime: '10:00',
      description: '이번달 팀 회의입니다.',
      location: '회의실 A',
      category: '업무',
    });

    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getByText('이번달 팀 회의')).toBeInTheDocument();
  });

  it('달력에 1월 1일(신정)이 공휴일로 표시되는지 확인한다', async () => {
    vi.setSystemTime(new Date('2025-01-01'));
    setup(<App />);

    const monthView = screen.getByTestId('month-view');

    // 1월 1일 셀 확인
    const januaryFirstCell = within(monthView).getByText('1').closest('td')!;
    expect(within(januaryFirstCell).getByText('신정')).toBeInTheDocument();
  });
});

describe('검색 기능', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({
          events: [
            {
              id: 1,
              title: '팀 회의',
              date: '2025-10-15',
              startTime: '09:00',
              endTime: '10:00',
              description: '주간 팀 미팅',
              location: '회의실 A',
              category: '업무',
              repeat: { type: 'none', interval: 0 },
              notificationTime: 10,
            },
            {
              id: 2,
              title: '프로젝트 계획',
              date: '2025-10-16',
              startTime: '14:00',
              endTime: '15:00',
              description: '새 프로젝트 계획 수립',
              location: '회의실 B',
              category: '업무',
              repeat: { type: 'none', interval: 0 },
              notificationTime: 10,
            },
          ],
        });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('검색 결과가 없으면, "검색 결과가 없습니다."가 표시되어야 한다.', async () => {
    const { user } = setup(<App />);

    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
    await user.type(searchInput, '존재하지 않는 일정');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it("'팀 회의'를 검색하면 해당 제목을 가진 일정이 리스트에 노출된다", async () => {
    const { user } = setup(<App />);

    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
    await user.type(searchInput, '팀 회의');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('팀 회의')).toBeInTheDocument();
  });

  it('검색어를 지우면 모든 일정이 다시 표시되어야 한다', async () => {
    const { user } = setup(<App />);

    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
    await user.type(searchInput, '팀 회의');
    await user.clear(searchInput);

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('팀 회의')).toBeInTheDocument();
    expect(eventList.getByText('프로젝트 계획')).toBeInTheDocument();
  });
});

describe('일정 충돌', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('겹치는 시간에 새 일정을 추가할 때 경고가 표시된다', async () => {
    setupMockHandlerCreation([
      {
        id: '1',
        title: '기존 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '기존 팀 미팅',
        location: '회의실 B',
        category: '업무',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    await saveSchedule(user, {
      title: '새 회의',
      date: '2025-10-15',
      startTime: '09:30',
      endTime: '10:30',
      description: '설명',
      location: '회의실 A',
      category: '업무',
    });

    expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
    expect(screen.getByText(/다음 일정과 겹칩니다/)).toBeInTheDocument();
    expect(screen.getByText('기존 회의 (2025-10-15 09:00-10:00)')).toBeInTheDocument();
  });

  it('기존 일정의 시간을 수정하여 충돌이 발생하면 경고가 노출된다', async () => {
    setupMockHandlerUpdating();

    const { user } = setup(<App />);

    const editButton = (await screen.findAllByLabelText('Edit event'))[1];
    await user.click(editButton);

    // 시간 수정하여 다른 일정과 충돌 발생
    await user.clear(screen.getByLabelText('시작 시간'));
    await user.type(screen.getByLabelText('시작 시간'), '08:30');
    await user.clear(screen.getByLabelText('종료 시간'));
    await user.type(screen.getByLabelText('종료 시간'), '10:30');

    await user.click(screen.getByTestId('event-submit-button'));

    expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
    expect(screen.getByText(/다음 일정과 겹칩니다/)).toBeInTheDocument();
    expect(screen.getByText('기존 회의 (2025-10-15 09:00-10:00)')).toBeInTheDocument();
  });
});

it('notificationTime을 10으로 하면 지정 시간 10분 전 알람 텍스트가 노출된다', async () => {
  vi.setSystemTime(new Date('2025-10-15 08:49:59'));

  setup(<App />);

  // ! 일정 로딩 완료 후 테스트
  await screen.findByText('일정 로딩 완료!');

  expect(screen.queryByText('10분 후 기존 회의 일정이 시작됩니다.')).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(screen.getByText('10분 후 기존 회의 일정이 시작됩니다.')).toBeInTheDocument();
});

describe('반복 일정 표시', () => {
  it('캘린더 뷰에서 반복 일정을 시각적으로 구분하여 표시해야 한다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);

    // 반복 일정 생성 - 리팩토링된 헬퍼 함수 사용
    await saveRecurringSchedule(
      user,
      {
        title: '반복 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매주 반복 회의',
        location: '회의실 A',
        category: '업무',
      },
      'weekly'
    );

    // 캘린더 뷰에서 반복 일정 시각적 구분 확인
    const monthView = within(screen.getByTestId('month-view'));

    // 반복 일정임을 나타내는 시각적 요소 검증
    const repeatIcon = monthView.getByTestId('RepeatIcon');
    expect(repeatIcon).toBeInTheDocument();
    expect(repeatIcon).toBeVisible();
  });

  it('반복하지 않는 일정은 시각적 구분 표시가 없어야 한다', async () => {
    // 빈 이벤트 목록으로 시작
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({ events: [] });
      })
    );

    const { user } = setup(<App />);

    // 단일 일정 생성 - 기존 헬퍼 함수 사용 (반복 설정 없음)
    await saveSchedule(user, {
      title: '단일 회의',
      date: '2025-10-15',
      startTime: '09:00',
      endTime: '10:00',
      description: '단발성 회의',
      location: '회의실 A',
      category: '업무',
    });

    server.use(
      http.post('/api/events', async ({ request }) => {
        const requestBody = await request.json();
        return HttpResponse.json({
          ...(requestBody as Record<string, string | number | object>),
          id: Date.now().toString(),
        });
      }),
      http.get('/api/events', () => {
        return HttpResponse.json({
          events: [
            {
              id: '1',
              title: '단일 회의',
              date: '2025-10-15',
              startTime: '09:00',
              endTime: '10:00',
              description: '단발성 회의',
              location: '회의실 A',
              category: '업무',
              repeat: { type: 'none', interval: 1 },
              notificationTime: 10,
            },
          ],
        });
      })
    );

    // 캘린더 뷰에서 반복 아이콘이 없어야 함
    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.queryByTestId('RepeatIcon')).not.toBeInTheDocument();
  });
});

describe('반복 종료 조건', () => {
  // 반복 일정 생성을 위한 기본 입력 헬퍼 함수
  const fillBasicEventFields = async (user: UserEvent, title: string, description: string) => {
    await user.click(screen.getAllByText('일정 추가')[0]);
    await user.type(screen.getByLabelText('제목'), title);
    await user.type(screen.getByLabelText('날짜'), '2025-01-01');
    await user.type(screen.getByLabelText('시작 시간'), '09:00');
    await user.type(screen.getByLabelText('종료 시간'), '10:00');
    await user.type(screen.getByLabelText('설명'), description);
    await user.type(screen.getByLabelText('위치'), '회의실 A');
    await user.click(screen.getByLabelText('카테고리'));
    await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '업무-option' }));
  };

  // 반복 설정 헬퍼 함수
  const setRepeatType = async (user: UserEvent, repeatType: string) => {
    await user.click(within(screen.getByTestId('repeat-type-select')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: `${repeatType}-option` }));
  };

  // 종료 조건 설정 헬퍼 함수
  const setEndCondition = async (user: UserEvent, condition: string, value?: string) => {
    await user.click(
      within(screen.getByTestId('repeat-end-condition-select')).getByRole('combobox')
    );
    await user.click(screen.getByRole('option', { name: `${condition}-option` }));

    if (condition === 'endDate' && value) {
      await user.type(screen.getByTestId('repeat-end-date-input'), value);
    } else if (condition === 'endCount' && value) {
      const countInput = screen.getByTestId('repeat-end-count-input');
      await user.type(countInput, `{selectall}${value}`);
    }
  };

  it('특정 날짜까지 반복 조건을 설정할 수 있다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);

    await fillBasicEventFields(user, '특정날짜까지 반복', '특정 날짜까지 반복 테스트');
    await setRepeatType(user, 'daily');
    await setEndCondition(user, 'endDate', '2025-01-05');

    await user.click(screen.getByTestId('event-submit-button'));

    // 성공 메시지 확인
    expect(screen.getByText('반복 일정이 생성되었습니다.')).toBeInTheDocument();
  });

  it('특정 횟수만큼 반복 조건을 설정할 수 있다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);

    await fillBasicEventFields(user, '3회 반복', '3회 반복 테스트');
    await setRepeatType(user, 'weekly');
    await setEndCondition(user, 'endCount', '3');

    await user.click(screen.getByTestId('event-submit-button'));

    // 성공 메시지 확인
    expect(screen.getByText('반복 일정이 생성되었습니다.')).toBeInTheDocument();
  });

  it('종료 없음 조건을 설정할 수 있다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);

    await fillBasicEventFields(user, '무한 반복', '종료 없음 테스트');
    await setRepeatType(user, 'monthly');
    await setEndCondition(user, 'none');

    // 안내 텍스트 확인
    expect(screen.getByTestId('repeat-none-info')).toHaveTextContent(
      '2025년 6월 30일까지 반복됩니다.'
    );

    await user.click(screen.getByTestId('event-submit-button'));

    // 성공 메시지 확인
    expect(screen.getByText('반복 일정이 생성되었습니다.')).toBeInTheDocument();
  });
});

describe('반복 일정 단일 수정', () => {
  it('반복 일정을 수정하면 단일 일정으로 변경되고 반복 아이콘이 사라진다', async () => {
    // 반복 일정이 있는 상태로 시작
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({
          events: [
            {
              id: '1',
              title: '매주 회의',
              date: '2025-10-15',
              startTime: '09:00',
              endTime: '10:00',
              description: '매주 반복 회의',
              location: '회의실 A',
              category: '업무',
              repeat: {
                type: 'weekly',
                interval: 1,
                endDate: '2025-12-31',
                endCondition: 'endDate',
              },
              notificationTime: 10,
            },
          ],
        });
      })
    );

    const { user } = setup(<App />);
    await screen.findByText('일정 로딩 완료!');

    // 초기 상태에서 반복 아이콘이 있는지 확인
    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getByTestId('RepeatIcon')).toBeInTheDocument();

    // 반복 일정 수정하기
    await user.click(screen.getByText('매주 회의'));

    // 제목 수정
    const titleInput = screen.getByLabelText('제목');
    await user.clear(titleInput);
    await user.type(titleInput, '수정된 단일 회의');

    // 설명 수정
    const descriptionInput = screen.getByLabelText('설명');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, '단일 회의로 변경됨');

    // 저장하기 전 수정된 일정이 단일로 변경되는지 확인하는 목 설정
    server.use(
      http.put('/api/events/1', async ({ request }) => {
        const requestBody = await request.json();
        const eventData = requestBody as Event;

        // 반복 일정 수정 시 단일 일정으로 변경되는지 확인
        expect(eventData.repeat.type).toBe('none');
        expect(eventData.title).toBe('수정된 단일 회의');
        expect(eventData.description).toBe('단일 회의로 변경됨');

        return HttpResponse.json({
          ...eventData,
          id: '1',
        });
      }),
      http.get('/api/events', () => {
        return HttpResponse.json({
          events: [
            {
              id: '1',
              title: '수정된 단일 회의',
              date: '2025-10-15',
              startTime: '09:00',
              endTime: '10:00',
              description: '단일 회의로 변경됨',
              location: '회의실 A',
              category: '업무',
              repeat: { type: 'none', interval: 1 },
              notificationTime: 10,
            },
          ],
        });
      })
    );

    await user.click(screen.getByTestId('event-submit-button'));

    // 성공 메시지 확인
    expect(screen.getByText('일정이 수정되었습니다.')).toBeInTheDocument();

    // 수정 후 반복 아이콘이 사라졌는지 확인
    await screen.findByText('일정 로딩 완료!');
    const updatedMonthView = within(screen.getByTestId('month-view'));
    expect(updatedMonthView.queryByTestId('RepeatIcon')).not.toBeInTheDocument();

    // 제목이 변경되었는지 확인
    expect(screen.getByText('수정된 단일 회의')).toBeInTheDocument();
  });
});
