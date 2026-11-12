# Revisión funcional · 12 de noviembre de 2026

Netlify respondió HTTP 200 para la página y sus scripts. La versión publicada esperaba una consulta a Supabase antes de registrar los eventos de navegación. El dominio de la base de datos devolvió `ERR_NAME_NOT_RESOLVED`; el propietario confirmó que el proyecto está pausado.

## Correcciones

- La navegación se activa antes de consultar datos. Una conexión fallida muestra un aviso persistente y permite reintentar.
- Los indicadores muestran «—» cuando los datos no están disponibles. No se presenta una conexión fallida como inventario vacío.
- Se comparte un único cliente de Supabase para datos, autenticación y archivos; las solicitudes tienen un tiempo máximo de 10 segundos.
- Leaflet 1.9.4 y Supabase JS 2.119.0 se sirven localmente con versiones fijas y licencias incluidas.
- Se corrigieron el formato temporal del muestreo, la recuperación de foco de los diálogos, el manejo de errores en exportación y los colores de contraste.
- Se actualizaron términos técnicos y controles de acceso móvil sin deshabilitar el zoom.

## Verificación

`npm ci && npm test` ejecuta pruebas con DOM y respuestas simuladas: fallo de conexión sin bloquear navegación; recuperación al reintentar; un único cliente; historial paginado, selección en el mapa y expediente; clasificación según criterios configurados y ausencia de referencia.

Se reprodujo el fallo publicado en navegador y se abrió la versión local. La conexión del navegador de pruebas se interrumpió antes de completar la revisión visual; queda pendiente revisar físicamente móvil y tableta.

## Dependencia operativa

Restaurar el proyecto SID-FC en Supabase es necesario para volver a consultar registros, autenticar inspectores y guardar mediciones o fotografías. Ningún cambio del frontend puede reactivar un proyecto pausado. Los registros existentes no se borran ni se reemplazan con esta publicación.
