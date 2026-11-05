# UrbanInspect

Aplicación móvil académica para el registro y seguimiento de incidencias urbanas por parte de inspectores municipales.

## Descripción

UrbanInspect permite documentar problemas en el espacio público, adjuntar evidencia fotográfica, asociar una ubicación y consultar información climática. Las incidencias se consultan y administran mediante MockAPI, mientras que los seguimientos y borradores se conservan localmente en el dispositivo.

La aplicación organiza sus funciones en tres pestañas: **Inicio**, **Incidencias** y **Seguimiento**. Un botón de acción flotante (FAB), disponible desde la navegación principal, abre el formulario global para registrar una incidencia.

## Características

- Registro de incidencias con categoría, descripción, dirección, sector y prioridad.
- Captura de fotografías desde el dispositivo.
- Obtención de coordenadas GPS e ingreso manual de ubicación.
- Consulta de condiciones climáticas por ubicación con OpenWeatherMap.
- Guardado y recuperación local de borradores.
- Seguimiento local de incidencias mediante Capacitor Preferences.
- Consulta y listado de incidencias almacenadas en MockAPI.
- Vista de detalle y actualización del estado de una incidencia.
- Dashboard con indicadores generales y acceso a incidencias recientes.

### Pestañas

1. **Inicio:** dashboard, indicadores rápidos y métricas generales.
2. **Incidencias:** listado, consulta, detalle y cambio de estado.
3. **Seguimiento:** incidencias guardadas localmente en el dispositivo.

El FAB global permite abrir el formulario de registro desde la navegación principal.

## Arquitectura

La aplicación utiliza una arquitectura frontend basada en Angular e Ionic:

- **Presentación y navegación:** páginas standalone, componentes Ionic, rutas y pestañas.
- **Lógica de aplicación:** servicios Angular para incidencias, cámara, ubicación, clima y almacenamiento.
- **Persistencia remota:** MockAPI almacena y entrega los registros de incidencias.
- **Persistencia local:** Capacitor Preferences guarda códigos seguidos y borradores.
- **Integraciones del dispositivo:** Capacitor Camera y Geolocation ofrecen acceso a las funciones nativas cuando están disponibles.
- **Datos climáticos:** WeatherService consulta OpenWeatherMap utilizando las coordenadas de la incidencia.

Flujo general:

```text
Inspector
   ├── Formulario ── Cámara / GPS / OpenWeatherMap
   │                    └── IncidenciasService ── MockAPI
   ├── Inicio ───────── IncidenciasService ── MockAPI
   ├── Incidencias ──── IncidenciasService ── MockAPI
   └── Seguimiento ──── StorageService ── Capacitor Preferences
                       └── IncidenciasService ── MockAPI (consulta de datos)
```

## Tecnologías utilizadas

- Angular
- Ionic
- Capacitor
- TypeScript
- RxJS
- MockAPI
- OpenWeatherMap
- Capacitor Preferences, Camera y Geolocation

## Instalación

### Requisitos previos

- Node.js y npm en versiones compatibles con Angular 22.
- Git.
- Para ejecutar la aplicación nativamente en Android: Android Studio y el SDK de Android.

### Pasos

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_PROYECTO>
npm install
```

Antes de ejecutar la aplicación, configura los valores de entorno indicados en la sección siguiente.

## Configuración de entorno

Usa `src/environments/enviroment.example.ts` como plantilla y copia sus valores a `src/environments/environment.ts` y `src/environments/environment.prod.ts`:

```ts
export const environment = {
  production: false,
  firebase: {
    apiKey: '<CLAVE_DE_FIREBASE>',
    authDomain: '<ID_DEL_PROYECTO>.firebaseapp.com',
    projectId: '<ID_DEL_PROYECTO>',
    appId: '<ID_DE_LA_APLICACION>',
  },
  mockApiUrl: 'https://<ID_DEL_PROYECTO>.mockapi.io/incidencias',
  openWeatherMapApiKey: '<CLAVE_DE_OPENWEATHERMAP>',
  openWeatherMapUrl: 'https://api.openweathermap.org/data/2.5/weather',
  cloudinaryCloudName: '<CLOUD_NAME>',
  cloudinaryUploadPreset: '<PRESET_UNSIGNED>',
};
```

- `mockApiUrl`: URL base del recurso de incidencias de MockAPI. Debe ser una URL válida y no una ruta vacía o relativa.
- `openWeatherMapApiKey`: clave de OpenWeatherMap. Si no está configurada, las consultas climáticas no podrán autenticarse.
- `cloudinaryCloudName` y `cloudinaryUploadPreset`: valores del Cloudinary cloud name y de un upload preset sin firma habilitado para imágenes. Las incidencias guardan la URL segura devuelta por Cloudinary, no el Base64 de la fotografía.
- `firebase`: configuración pública de la aplicación web de Firebase. Habilita Email/Password en Firebase Authentication para permitir el registro y el inicio de sesión.

No agregues claves, credenciales ni URLs privadas a los archivos versionados. Los archivos `.env` y `src/environments/*.local.ts` están excluidos por `.gitignore`, pero Angular no carga automáticamente esos formatos en este proyecto.

**Seguridad:** una clave incluida en una aplicación frontend puede ser inspeccionada por cualquier usuario, aunque se inyecte durante el despliegue o se almacene en un secreto de CI. Para mantener la clave privada, las consultas a OpenWeatherMap deben realizarse a través de un backend/proxy que conserve la clave en el servidor. La URL de MockAPI también quedará visible en el cliente; no la trates como una credencial.

## Ejecución del proyecto

### Aplicación web en desarrollo

```bash
npm start
```

El servidor de desarrollo de Angular inicia la aplicación en `http://localhost:8100/` según la configuración de Ionic del proyecto.

### Compilación

```bash
npm run build
```

### Android

Con Android Studio y el SDK configurados:

```bash
npx cap sync android
npx cap open android
```

## Estructura de carpetas

```text
src/
├── app/
│   ├── models/       # Modelos y contratos de datos
│   ├── pages/        # Detalle de incidencia y formulario de registro
│   ├── services/     # API, cámara, ubicación, clima y almacenamiento
│   ├── tab1/         # Pestaña Inicio
│   ├── tab2/         # Pestaña Incidencias
│   ├── tab3/         # Pestaña Seguimiento
│   └── tabs/         # Navegación principal y FAB global
├── assets/           # Recursos estáticos
├── environments/     # Configuración de desarrollo y producción
├── theme/            # Variables de tema Ionic
├── global.scss       # Estilos globales
└── index.html        # Documento HTML de entrada
android/              # Proyecto nativo Android de Capacitor
```

## Requisitos funcionales implementados (R1-R9)

| Requisito | Funcionalidad |
|---|---|
| **R1** | Guardar y quitar incidencias del seguimiento local usando Preferences. |
| **R2** | Consultar y mostrar incidencias registradas en MockAPI. |
| **R3** | Cargar progresivamente incidencias mediante paginación e infinite scroll. |
| **R4** | Consultar y asociar datos climáticos de OpenWeatherMap según la ubicación. |
| **R5** | Registrar incidencias desde el formulario accesible mediante el FAB global. |
| **R6** | Capturar y adjuntar una fotografía a una incidencia. |
| **R7** | Obtener coordenadas mediante GPS o ingresarlas manualmente. |
| **R8** | Guardar y recuperar borradores del formulario en almacenamiento local. |
| **R9** | Consultar el detalle y actualizar el estado de una incidencia. |



## Autor

**Nombre:** Gabriel Toaquiza  
**Proyecto:** UrbanInspect — proyecto académico

## Observaciones

- Las incidencias dependen de la disponibilidad y configuración del servicio MockAPI.
- El seguimiento y los borradores se guardan en el almacenamiento local del dispositivo; no son una copia remota ni se sincronizan entre dispositivos.
- La disponibilidad de cámara y GPS depende de los permisos concedidos y del soporte del dispositivo o navegador.
- La consulta climática requiere una clave válida de OpenWeatherMap y conexión a Internet.
- Antes de publicar el repositorio, verifica que no se hayan incluido secretos en archivos, historial de Git, capturas o artefactos de compilación. Revoca y sustituye cualquier clave que haya sido expuesta previamente.
