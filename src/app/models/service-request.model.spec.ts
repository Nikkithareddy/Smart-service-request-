import {
  DEFAULT_FILTERS,
  RequestStatus,
  STATUSES,
  STATUS_TRANSITIONS,
  ServiceRequest,
  applyFilters,
  canTransition,
} from './service-request.model';

function make(over: Partial<ServiceRequest>): ServiceRequest {
  return {
    id: 1,
    title: 'Printer jam',
    description: 'Paper keeps jamming',
    category: 'Facilities',
    priority: 'Medium',
    status: 'New',
    requester: 'Ana',
    requesterEmail: 'ana@example.com',
    assignee: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    history: [],
    ...over,
  };
}

describe('workflow transitions', () => {
  it('allows the expected forward steps', () => {
    expect(canTransition('New', 'In Review')).toBe(true);
    expect(canTransition('In Review', 'In Progress')).toBe(true);
    expect(canTransition('In Progress', 'Resolved')).toBe(true);
    expect(canTransition('Resolved', 'Closed')).toBe(true);
  });

  it('blocks skipping steps and leaving Closed', () => {
    expect(canTransition('New', 'Resolved')).toBe(false);
    expect(canTransition('New', 'In Progress')).toBe(false);
    expect(STATUS_TRANSITIONS.Closed.length).toBe(0);
  });

  it('only ever points at valid statuses', () => {
    for (const from of STATUSES) {
      for (const to of STATUS_TRANSITIONS[from as RequestStatus]) {
        expect(STATUSES).toContain(to);
      }
    }
  });
});

describe('applyFilters', () => {
  const data = [
    make({ id: 1, title: 'VPN down', status: 'New', priority: 'High', category: 'IT Support', createdAt: '2026-10-03T00:00:00.000Z' }),
    make({ id: 2, title: 'Broken chair', status: 'Closed', priority: 'Low', category: 'Facilities', createdAt: '2026-10-01T00:00:00.000Z' }),
    make({ id: 3, title: 'Payroll question', status: 'New', priority: 'Critical', category: 'HR', createdAt: '2026-10-02T00:00:00.000Z' }),
  ];

  it('returns everything, newest first, by default', () => {
    expect(applyFilters(data, DEFAULT_FILTERS).map((r) => r.id)).toEqual([1, 3, 2]);
  });

  it('filters by status and category together', () => {
    const out = applyFilters(data, { ...DEFAULT_FILTERS, status: 'New', category: 'HR' });
    expect(out.map((r) => r.id)).toEqual([3]);
  });

  it('searches title text case-insensitively and by id', () => {
    expect(applyFilters(data, { ...DEFAULT_FILTERS, search: 'vpn' }).map((r) => r.id)).toEqual([1]);
    expect(applyFilters(data, { ...DEFAULT_FILTERS, search: '2' }).map((r) => r.id)).toEqual([2]);
  });

  it('sorts by priority, most urgent first', () => {
    const out = applyFilters(data, { ...DEFAULT_FILTERS, sort: 'priority' });
    expect(out.map((r) => r.priority)).toEqual(['Critical', 'High', 'Low']);
  });

  it('does not mutate the input array', () => {
    const copy = [...data];
    applyFilters(data, { ...DEFAULT_FILTERS, sort: 'oldest' });
    expect(data).toEqual(copy);
  });
});
