export const STATUSES = ['New', 'In Review', 'In Progress', 'Resolved', 'Closed'] as const;
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const CATEGORIES = ['IT Support', 'Facilities', 'HR', 'Finance', 'Procurement'] as const;

export type RequestStatus = (typeof STATUSES)[number];
export type RequestPriority = (typeof PRIORITIES)[number];
export type RequestCategory = (typeof CATEGORIES)[number];

/** The workflow: which statuses a request may move to from its current one. */
export const STATUS_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  New: ['In Review', 'Closed'],
  'In Review': ['In Progress', 'Closed'],
  'In Progress': ['Resolved', 'In Review'],
  Resolved: ['Closed', 'In Progress'],
  Closed: [],
};

export interface HistoryEntry {
  at: string;
  from: RequestStatus | null;
  to: RequestStatus;
  note?: string;
}

export interface ServiceRequest {
  id: number;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  requester: string;
  requesterEmail: string;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
}

/** What the form collects; the service fills in the rest. */
export type NewServiceRequest = Pick<
  ServiceRequest,
  'title' | 'description' | 'category' | 'priority' | 'requester' | 'requesterEmail'
>;

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export interface RequestFilters {
  search: string;
  status: RequestStatus | 'All';
  priority: RequestPriority | 'All';
  category: RequestCategory | 'All';
  sort: 'newest' | 'oldest' | 'priority';
}

export const DEFAULT_FILTERS: RequestFilters = {
  search: '',
  status: 'All',
  priority: 'All',
  category: 'All',
  sort: 'newest',
};

const PRIORITY_RANK: Record<RequestPriority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/** Pure filter + sort used by the list view (kept separate so it is easy to unit test). */
export function applyFilters(requests: ServiceRequest[], f: RequestFilters): ServiceRequest[] {
  const q = f.search.trim().toLowerCase();
  const filtered = requests.filter(
    (r) =>
      (f.status === 'All' || r.status === f.status) &&
      (f.priority === 'All' || r.priority === f.priority) &&
      (f.category === 'All' || r.category === f.category) &&
      (!q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        String(r.id) === q),
  );
  return [...filtered].sort((a, b) => {
    if (f.sort === 'priority') {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt.localeCompare(a.createdAt);
    }
    const byDate = a.createdAt.localeCompare(b.createdAt);
    return f.sort === 'oldest' ? byDate : -byDate;
  });
}
