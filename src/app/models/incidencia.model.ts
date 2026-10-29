/**
 * Interfaces del modelo de datos para UrbanInspect.
 * Centralizan los contratos de tipos usados por los servicios y componentes.
 */

/** Estados posibles de una incidencia */
export type EstadoIncidencia = 'pendiente' | 'en_proceso' | 'resuelta';

/** Categorías de incidencia soportadas */
export type CategoriaIncidencia = 'bache' | 'alumbrado' | 'basura' | 'señalización' | 'otro';

/** Coordenadas geográficas */
export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/** Datos meteorológicos asociados a una incidencia */
export interface DatosClima {
  temperatura: number;        // °C
  precipitacionMm: number;    // mm última hora
  descripcion: string;        // descripción textual
}

/** Registro de cambio de estado con observación */
export interface CambioEstado {
  estadoAnterior: EstadoIncidencia;
  estadoNuevo: EstadoIncidencia;
  observacion: string;
  fecha: string;              // ISO 8601
}

/** Modelo principal de incidencia (alineado con MockAPI) */
export interface Incidencia {
  id?: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
  estado: EstadoIncidencia;
  coordenadas: Coordenadas;
  foto?: string;              // base64 data URI o ruta persistente
  clima?: DatosClima;
  cambiosEstado?: CambioEstado[];
  fechaCreacion: string;      // ISO 8601
  fechaActualizacion?: string;
}

/** Respuesta paginada del servidor */
export interface RespuestaPaginada<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

/** Resultado de la captura de foto */
export interface ResultadoFoto {
  dataUrl: string;            // base64 para previsualización
  rutaPersistente: string;    // ruta en Filesystem para almacenamiento
}

/** Borrador de formulario para recuperación */
export interface BorradorFormulario {
  datos: Partial<Incidencia>;
  timestamp: number;
}

