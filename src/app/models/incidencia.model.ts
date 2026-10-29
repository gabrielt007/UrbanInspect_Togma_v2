/**
 * Interfaces del modelo de datos para UrbanInspect.
 * Centralizan los contratos de tipos usados por los servicios y componentes.
 */

/** Estados posibles de una incidencia */
export type EstadoIncidencia = 'pendiente' | 'en_proceso' | 'resuelta';

/** Categorías o tipos de incidencia soportadas */
export type CategoriaIncidencia = 'bache' | 'alumbrado' | 'basura' | 'señalización' | 'otro';

/** Niveles de prioridad */
export type PrioridadIncidencia = 'alta' | 'media' | 'baja';

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

/** Modelo principal de incidencia */
export interface Incidencia {
  id?: string;
  codigo: string;             // Generado automáticamente (INC-XXXX)
  tipo: CategoriaIncidencia;  // Campo canónico de tipo de incidencia
  descripcion: string;        // Descripción del problema
  direccion: string;          // Dirección física o referencia
  sector: string;             // Sector / Barrio
  fecha: string;              // Fecha ISO 8601
  estado: EstadoIncidencia;   // 'pendiente' | 'en_proceso' | 'resuelta'
  prioridad: PrioridadIncidencia; // 'alta' | 'media' | 'baja'
  fotografia: string;         // Fotografía capturada (DataUrl o URL)
  coordenadas?: Coordenadas;  // Ubicación GPS o manual
  clima?: DatosClima;         // Condiciones climáticas de OpenWeatherMap
  cambiosEstado?: CambioEstado[]; // Historial de transiciones
  
  // Campos opcionales para compatibilidad en lectura de registros previos
  categoria?: CategoriaIncidencia;
  foto?: string;
  titulo?: string;
  fechaCreacion?: string;
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
  dataUrl: string;            // base64/dataUrl para previsualización y guardado
  rutaPersistente?: string;   // ruta opcional en Filesystem para almacenamiento nativo
}

/** Borrador de formulario para recuperación */
export interface BorradorFormulario {
  datos: Partial<Incidencia>;
  timestamp: number;
}
