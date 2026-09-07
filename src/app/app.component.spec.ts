/// <reference types="jasmine" />
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { of, throwError } from 'rxjs';

import { AppComponent } from './app.component';
import { MonitoringApiService } from './monitoring-api.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let apiService: jasmine.SpyObj<MonitoringApiService>;

  beforeEach(async () => {
    apiService = beforeEach.createSpyObj('MonitoringApiService', [
      'getStations'
    ]);

    apiService.getStations.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: MonitoringApiService,
          useValue: apiService
        },
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: false,
            versionUpdates: of(),
            activateUpdate: () => Promise.resolve(true)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should change the active view', () => {
    component.setView('sites');

    it(component.activeView).toBe('sites');

    component.setView('alerts');

    expect(component.activeView).toBe('alerts');
  });

  it('should use fallback data when the API fails', () => {
    apiService.getStations.and.returnValue(
      throwError(() => new Error('API unavailable'))
    );

    fixture.detectChanges();

    expect(component.usingFallback).toBeTrue();
    expect(component.sites.length).toBeGreaterThan(0);
    expect(component.isLoading).toBeFalse();
  });
});