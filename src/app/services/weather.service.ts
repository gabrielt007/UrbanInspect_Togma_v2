import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { DatosClima } from '../models/incidencia.model';

/**
 * Respuesta cruda de OpenWeatherMap API 2.5 (campos relevantes).
 */
interface OpenWeatherResponse {
  main: {
    temp: number;    // Kelvin
  };
  weather: Array<{
    description: string;
  }>;
  rain?: {
    '1h'?: number;   // mm última hora
  };
}

/**
 * Servicio de integración con la API real de OpenWeatherMap.
 *
 * Soporta:
 *  - R4: Obtención de datos climáticos (temperatura, precipitación, descripción)
 *        a partir de coordenadas GPS (latitud y longitud).
 *
 * Uso: Se invoca al crear una incidencia para asociar condiciones climáticas.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.openWeatherMapUrl;
  private readonly apiKey = environment.openWeatherMapApiKey;

  /**
   * Obtiene los datos climáticos actuales para unas coordenadas dadas.
   *
   * @param lat Latitud GPS.
   * @param lon Longitud GPS.
   * @returns Observable con DatosClima (temperatura en °C, precipitación en mm,
   *          descripción textual en español).
   */
  obtenerClima(lat: number, lon: number): Observable<DatosClima> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('appid', this.apiKey)
      .set('units', 'metric')    // Celsius directamente
      .set('lang', 'es');        // Descripciones en español

    return this.http.get<OpenWeatherResponse>(this.apiUrl, { params }).pipe(
      map((response) => this.mapearRespuesta(response)),
    );
  }

  /**
   * Transforma la respuesta cruda de OpenWeatherMap al modelo interno.
   */
  private mapearRespuesta(response: OpenWeatherResponse): DatosClima {
    return {
      temperatura: Math.round(response.main.temp * 10) / 10,
      precipitacionMm: response.rain?.['1h'] ?? 0,
      descripcion: response.weather[0]?.description ?? 'Sin datos',
    };
  }
}
