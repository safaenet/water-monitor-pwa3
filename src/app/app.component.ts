import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { catchError, filter, of, Subscription } from 'rxjs';
import { MonitoringApiService, MonitoringSite, ReadingPoint } from './monitoring-api.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

interface Alert {
  site: string;
  message: string;
  severity: 'Warning' | 'Critical';
  time: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  activeView: 'overview' | 'sites' | 'alerts' = 'overview';
  selectedSiteId = 'demo-1';
  isOnline = navigator.onLine;
  updateAvailable = false;
  installAvailable = false;
  isLoading = true;
  usingFallback = true;
  lastSync = 'Not synced';
  sites: MonitoringSite[] = this.fallbackSites();
  readings: ReadingPoint[] = [];
  private installEvent?: Event & { prompt: () => Promise<void> };
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly updates: SwUpdate,
    private readonly monitoringApi: MonitoringApiService
  ) {}

  get selectedSite(): MonitoringSite {
    return this.sites.find((site) => site.id === this.selectedSiteId) ?? this.sites[0];
  }

  get normalSites(): number {
    return this.sites.filter((site) => site.status === 'Normal').length;
  }

  get alerts(): Alert[] {
    return this.sites
      .filter((site): site is MonitoringSite & { status: 'Warning' | 'Critical' } => site.status !== 'Normal')
      .map((site) => ({
        site: site.name,
        message: site.status === 'Critical'
          ? 'River discharge is rising rapidly compared with yesterday'
          : 'River discharge is trending upwards',
        severity: site.status,
        time: site.updated
      }));
  }

  get chartPoints(): string {
    const values = this.chartValues();
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((value, index) => {
      const x = values.length === 1 ? 190 : index * 380 / (values.length - 1);
      const y = 130 - ((value - min) / range) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  get areaPoints(): string {
    return `0,140 ${this.chartPoints} 380,140`;
  }

  get firstReadingTime(): string {
    return this.formatReadingTime(this.readings[0]?.time);
  }

  get lastReadingTime(): string {
    return this.formatReadingTime(this.readings[this.readings.length - 1]?.time);
  }

  ngOnInit(): void {
    if (this.updates.isEnabled) {
      this.subscriptions.add(this.updates.versionUpdates
        .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
        .subscribe(() => this.updateAvailable = true));
    }
    this.refreshData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  refreshData(): void {
    this.isLoading = true;
    this.subscriptions.add(this.monitoringApi.getStations().pipe(
      catchError(() => of([]))
    ).subscribe((sites) => {
      if (sites.length > 0) {
        this.sites = sites;
        this.selectedSiteId = sites[0].id;
        this.usingFallback = false;
        this.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        this.sites = this.fallbackSites();
        this.selectedSiteId = this.sites[0].id;
        this.usingFallback = true;
      }
      this.isLoading = false;
      this.loadReadings();
    }));
  }

  loadReadings(): void {
    this.readings = this.selectedSite.readings;
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline = true;
    this.refreshData();
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOnline = false;
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.installEvent = event as Event & { prompt: () => Promise<void> };
    this.installAvailable = true;
  }

  async installApp(): Promise<void> {
    await this.installEvent?.prompt();
    this.installAvailable = false;
  }

  activateUpdate(): void {
    void this.updates.activateUpdate().then(() => document.location.reload());
  }

  setView(view: 'overview' | 'sites' | 'alerts'): void {
    this.activeView = view;
  }

  selectSite(site: MonitoringSite): void {
    this.selectedSiteId = site.id;
    this.activeView = 'overview';
    this.loadReadings();
  }

  private chartValues(): number[] {
    if (this.readings.length > 1) return this.readings.map((reading) => reading.value);
    const current = this.selectedSite.discharge;
    return [0.72, 0.76, 0.74, 0.81, 0.79, 0.86, 0.84, 0.9, 0.88, 0.95, 0.92]
      .map((factor) => current * factor);
  }

  private formatReadingTime(value?: Date): string {
    return value ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  }

  private fallbackSites(): MonitoringSite[] {
    return [
      { id: 'demo-1', name: 'Pendle Water', location: 'Nelson, Lancashire', status: 'Normal', discharge: 0.16, dischargeUnit: 'm³/s', changePercent: 7, forecastPeak: 0.21, updated: 'Demo data', readings: [] },
      { id: 'demo-2', name: 'River Calder', location: 'Burnley, Lancashire', status: 'Warning', discharge: 0.24, dischargeUnit: 'm³/s', changePercent: 26, forecastPeak: 0.31, updated: 'Demo data', readings: [] },
      { id: 'demo-3', name: 'Pendle Water North', location: 'Barrowford, Lancashire', status: 'Normal', discharge: 0.19, dischargeUnit: 'm³/s', changePercent: -4, forecastPeak: 0.25, updated: 'Demo data', readings: [] },
      { id: 'demo-4', name: 'Colne Water', location: 'Colne, Lancashire', status: 'Critical', discharge: 0.38, dischargeUnit: 'm³/s', changePercent: 58, forecastPeak: 0.44, updated: 'Demo data', readings: [] }
    ];
  }

  get dischargeChartData(): ChartConfiguration<'line'>['data'] {
  const values = this.readings.length > 1
    ? this.readings.map(reading => reading.value)
    : this.chartValues();

  const labels = this.readings.length > 1
    ? this.readings.map(reading =>
        reading.time.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short'
        })
      )
    : values.map((_, index) => `Day ${index + 1}`);

  return {
    labels,
    datasets: [
      {
        label: `River discharge (${this.selectedSite.dischargeUnit})`,
        data: values,
        borderColor: '#0891b2',
        backgroundColor: 'rgba(8, 145, 178, 0.15)',
        pointBackgroundColor: '#0891b2',
        pointRadius: 3,
        borderWidth: 3,
        tension: 0.35,
        fill: true
            }
          ]
        };
  }

  readonly dischargeChartOptions: ChartConfiguration<'line'>['options'] = {

    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true
      }
    },

    scales: {
      x: {
        grid: {
          display: false
        }
      },

      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'River discharge (m³/s)'
        }
      }
    }
  };
}
