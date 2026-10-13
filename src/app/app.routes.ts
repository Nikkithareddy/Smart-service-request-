import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'requests' },
  {
    path: 'requests',
    loadComponent: () => import('./features/request-list/request-list').then((m) => m.RequestList),
  },
  {
    // must come before ':id' so "new" is not treated as an id
    path: 'requests/new',
    loadComponent: () => import('./features/request-form/request-form').then((m) => m.RequestForm),
  },
  {
    path: 'requests/:id',
    loadComponent: () => import('./features/request-detail/request-detail').then((m) => m.RequestDetail),
  },
  {
    path: 'requests/:id/edit',
    loadComponent: () => import('./features/request-form/request-form').then((m) => m.RequestForm),
  },
  { path: '**', redirectTo: 'requests' },
];
