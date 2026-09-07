import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface ReadingPoint {
  time: Date;
  value: number;
}

export interface MonitoringSite {
  id: string;
  name: string;
  location: string;
  status: 'Normal' | 'Warning' | 'Critical';
  discharge: number;
  dischargeUnit: string;
  changePercent: number;
  forecastPeak: number;
  updated: string;
  readings: ReadingPoint[];
}

interface FloodApiResponse {
  latitude: number;
  longitude: number;
  daily_units: { river_discharge: string };
  daily: {
    time: string[];
    river_discharge: Array<number | null>;
  };
}

interface SiteDefinition {
  id: string;
  name: string;
  location: string;
}

@Injectable({ providedIn: 'root' })
export class MonitoringApiService {
  private readonly sites: SiteDefinition[] = [
    { id: 'nelson', name: 'Pendle Water', location: 'Nelson, Lancashire' },
    { id: 'burnley', name: 'River Calder', location: 'Burnley, Lancashire' },
    { id: 'barrowford', name: 'Pendle Water North', location: 'Barrowford, Lancashire' },
    { id: 'colne', name: 'Colne Water', location: 'Colne, Lancashire' },

    // Leeds area
    { id: 'leeds-centre', name: 'River Aire', location: 'Leeds City Centre' },
    { id: 'kirkstall', name: 'River Aire West', location: 'Kirkstall, Leeds' },
    { id: 'otley', name: 'River Wharfe', location: 'Otley, West Yorkshire' },
    { id: 'wakefield', name: 'River Calder East', location: 'Wakefield, West Yorkshire' }
  ];

  constructor(private readonly http: HttpClient) {}

  getStations(): Observable<MonitoringSite[]> {
    const url = 'https://flood-api.open-meteo.com/v1/flood'
      + '?latitude=53.84,53.79,53.86,53.87,53.797,53.815,53.905,53.683'
      + '&longitude=-2.21,-2.24,-2.17,-2.16,-1.548,-1.611,-1.693,-1.497'
      + '&daily=river_discharge&past_days=7&forecast_days=7';

    return this.http.get<FloodApiResponse[]>(url).pipe(
      map((responses) => responses.map((response, index) =>
        this.toMonitoringSite(response, this.sites[index])))
    );
  }

  private toMonitoringSite(response: FloodApiResponse, definition: SiteDefinition): MonitoringSite {
    const readings = response.daily.time
      .map((time, index) => ({ time: new Date(`${time}T12:00:00Z`), value: response.daily.river_discharge[index] }))
      .filter((reading): reading is ReadingPoint => typeof reading.value === 'number');
    const todayIndex = Math.min(7, readings.length - 1);
    const current = readings[todayIndex]?.value ?? 0;
    const previous = readings[Math.max(0, todayIndex - 1)]?.value ?? current;
    const changePercent = previous === 0 ? 0 : Math.round((current - previous) / previous * 100);
    const forecastPeak = Math.max(current, ...readings.slice(todayIndex).map((reading) => reading.value));
    const status = changePercent >= 50 ? 'Critical' : changePercent >= 20 ? 'Warning' : 'Normal';

    return {
      ...definition,
      status,
      discharge: current,
      dischargeUnit: response.daily_units.river_discharge,
      changePercent,
      forecastPeak,
      updated: 'Daily forecast',
      readings
    };
  }
}
