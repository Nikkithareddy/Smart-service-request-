import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { ServiceRequest } from '../models/service-request.model';
import { RequestService } from './request.service';

const sample: ServiceRequest = {
  id: 7,
  title: 'VPN down',
  description: 'Cannot connect to VPN',
  category: 'IT Support',
  priority: 'High',
  status: 'New',
  requester: 'Ana',
  requesterEmail: 'ana@example.com',
  assignee: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  history: [{ at: '2026-10-01T00:00:00.000Z', from: null, to: 'New', note: 'Request submitted' }],
};

describe('RequestService', () => {
  let svc: RequestService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    svc = TestBed.inject(RequestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads requests from the API into the store', async () => {
    svc.load();
    http.expectOne(`${API_URL}/requests`).flush([sample]);
    expect(await firstValueFrom(svc.requests$)).toEqual([sample]);
    expect(await firstValueFrom(svc.loading$)).toBe(false);
  });

  it('retries twice, then publishes a friendly error', async () => {
    vi.useFakeTimers();
    svc.load();
    for (let i = 0; i < 3; i++) {
      http.expectOne(`${API_URL}/requests`).error(new ProgressEvent('error'), { status: 0 });
      await vi.advanceTimersByTimeAsync(500);
    }
    vi.useRealTimers();
    expect(await firstValueFrom(svc.error$)).toContain('npm run api');
    expect(await firstValueFrom(svc.loading$)).toBe(false);
  });

  it('creates a request as New with a history entry and prepends it to the store', async () => {
    let created: ServiceRequest | undefined;
    svc.create({
      title: 'New thing',
      description: 'Something I need',
      category: 'HR',
      priority: 'Low',
      requester: 'Bo',
      requesterEmail: 'bo@example.com',
    }).subscribe((r) => (created = r));

    const req = http.expectOne(`${API_URL}/requests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.status).toBe('New');
    expect(req.request.body.history[0].note).toBe('Request submitted');
    req.flush({ ...req.request.body, id: 99 });

    expect(created?.id).toBe(99);
    expect((await firstValueFrom(svc.requests$))[0].id).toBe(99);
  });

  it('changes status, appends history, and updates the store', async () => {
    svc.load();
    http.expectOne(`${API_URL}/requests`).flush([sample]);

    svc.changeStatus(sample, 'In Review', ' triaged ').subscribe();
    const req = http.expectOne(`${API_URL}/requests/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.status).toBe('In Review');
    expect(req.request.body.history.length).toBe(2);
    expect(req.request.body.history[1]).toMatchObject({ from: 'New', to: 'In Review', note: 'triaged' });
    req.flush({ ...sample, ...req.request.body });

    const list = await firstValueFrom(svc.requests$);
    expect(list[0].status).toBe('In Review');
  });

  it('rejects an illegal status jump before calling the API', () => {
    expect(() => svc.changeStatus(sample, 'Resolved')).toThrowError(/Cannot move/);
    http.expectNone(`${API_URL}/requests/7`);
  });
});
