# Revisión funcional · 12 de noviembre de 2026

## Estado del inventario

Supabase vuelve a responder. La revisión pública posterior a la limpieza devolvió 8 fuentes y 96 mediciones activas. Se archivaron 15 fuentes anteriores mediante políticas RLS de lectura; sus registros y fotografías no se eliminaron. El respaldo previo está en `backups/inventario-2026-11-12.json`, excluido de Git.

La interfaz se publica desde el repositorio de GitHub conectado a Netlify. El despliegue depende del resultado de la publicación del commit correspondiente.

## Cambios verificados

- Selector de sitios con búsqueda, medio y referencia breve; navegación por teclado.
- Marcadores por medio y estado, cartografía de calles/relieve, escala y encuadre de todas las fuentes visibles.
- Gráfico con fechas, puntos seleccionables e información de cada resultado.
- Expediente con encabezado fijo y desplazamiento interno, también con flechas, Inicio, Fin y avance de página.
- Guía para agua, aire y suelo, con contexto, método y referencias. Los intervalos documentados por medición admiten mínimo y máximo.
- Registro de informes externos e importación CSV con revisión previa, fechas con zona horaria, comprobación de unidades, omisión de duplicados exactos y un único insert por lote.
- Protección contra doble envío de fuentes y mediciones. Un error al refrescar después de guardar no se anuncia como una escritura fallida.

## Evidencia de validación

Las 14 pruebas de `npm test` cubren navegación sin datos, reconexión, historial paginado, mapa/expediente, clasificación, validación de contacto, nombres, fotografías, selector, gráfico, CSV, desplazamiento, guía, intervalos y guardado por lote/sin duplicación por doble envío.

La limpieza y su restauración se ejecutaron contra una base PostgreSQL de verificación con RLS; el rol público solo accede a fuentes y mediciones activas. Se comprobó la respuesta del inventario real después del archivo.

Se revisaron visualmente el inventario, selector, mapa y expediente en navegador. A 390 × 844 px, el inventario no presentó desbordamiento horizontal del documento y el expediente permaneció contenido al usar Fin. No se realizó una prueba física en teléfono o tableta.

La revisión automática de diseño señaló metadatos demasiado pequeños y bordes de acento; se ajustaron. Se conservó la tipografía existente. Las tablas anchas usan desplazamiento horizontal deliberado y celdas con espaciado propio.

## Alcance de los datos

Las mediciones académicas conservan su procedencia en la ficha técnica. Los lugares reales no acreditan una estación oficial ni la exactitud de sus coordenadas. La interfaz distingue coordenadas de referencia pendientes de confirmación en campo.

Las guías OMS y CCME se muestran con su ámbito de uso y no se aplican automáticamente como límites legales de Panamá. Los informes externos necesitan una referencia verificable; sin criterio específico quedan sin clasificación. La importación transcribe datos proporcionados por el inspector y no verifica por sí sola su autenticidad.

## Corrección de tarjetas y apertura · 13 de noviembre de 2026

La tarjeta emergente del mapa tiene un ancho definido, miniatura sin compresión y nombre/estado separados dentro de una columna flexible. Se oculta al abrir el popup y no intercepta clics.

El expediente abre antes de consultar fotografías y calcula el gráfico con el diálogo visible. Las solicitudes simultáneas de imágenes del mismo sitio comparten consulta; las respuestas de expedientes cerrados o reemplazados se descartan. Los errores muestran una opción de reintento sin bloquear los datos de la fuente.

Las 17 pruebas funcionales pasan, incluidas carga lenta, clics repetidos, cambio de fuente durante la carga y recuperación tras un fallo de fotografías. La validación de esta corrección se realizó con DOM y respuestas controladas; la inspección visual en navegador queda pendiente.

## Revisión de carga y sesión · 13 de noviembre de 2026

### Servicio publicado

La página de Netlify respondió HTTP 200 y los 17 recursos de interfaz consultados respondieron correctamente. La versión publicada de `js/ui.js` era `20261112.4`; la disponibilidad de las correcciones en producción depende del despliegue del commit de esta revisión en Netlify.

La API pública de Supabase devolvió 8 fuentes, 96 mediciones y 16 criterios. También se ejecutaron las consultas del cliente modificado con la biblioteca Supabase incluida en el repositorio: las tres lecturas completaron correctamente. No se modificó la base de datos ni se enviaron mensajes reales desde Contacto.

### Correcciones

- Las miniaturas del mapa cargan después del inventario y se insertan sin reemplazar los marcadores, el popup ni el botón de expediente.
- Las actualizaciones conservan fuente y parámetro seleccionados; las respuestas antiguas no reemplazan datos más recientes.
- La sesión escucha los eventos de Supabase. Al cambiar de usuario o cerrar sesión se retiran fotografías privadas y se descartan respuestas pendientes.
- Las consultas de fuentes, mediciones, criterios y evidencias usan lotes ordenados para evitar el recorte del historial en una única respuesta de la API.
- Una fotografía privada no disponible conserva el resto de la galería.
- La subida de evidencia evita doble envío, captura el sitio destinatario y no reabre un expediente cerrado ni informa como fallida una escritura confirmada cuyo refresco posterior falló.
- La importación CSV descarta lecturas tardías de archivos anteriores y actualiza el botón al iniciar sesión.
- El tiempo máximo de consulta también cubre la descarga del cuerpo de la respuesta. Contacto tiene límite de espera y evita envíos repetidos; el acceso tiene protección contra doble envío y muestra errores al cerrar sesión.

### Validación

La suite incluye 28 pruebas: conexión fallida y recuperación, historial de 1.115 mediciones, cargas lentas, resultados fuera de orden, cierre durante cargas y subidas, cambios de sesión, galería parcial, importación CSV, descarga interrumpida, contacto y actualización de fotos con Leaflet real en DOM. Las pruebas de red fallida usan respuestas controladas y no envían datos a terceros.

La inspección visual interactiva de esta revisión y las pruebas físicas en móvil/tableta quedan pendientes. Las comprobaciones HTTP no equivalen a una sesión autenticada completa en el sitio publicado.

## Distribución del inventario · 13 de noviembre de 2026

Los criterios están debajo del mapa, separados de las pestañas Registrar medición, Historial y Fuentes. La consulta muestra un parámetro por medio y distingue el criterio configurado de la referencia técnica, con método y alcance desplegables. La guía sigue disponible si falla la consulta a los criterios del servidor.

Historial y Fuentes permiten ampliar la tabla y volver a la vista dividida sin perder paginación ni filtros. Registrar una medición o seguir un enlace al mapa restaura la vista dividida. En anchos inferiores a 980 px, el orden es mapa, área de trabajo y criterios plegados.

Se comprobaron 1280 px en escritorio, 820 px en tableta y 390 px en móvil mediante tamaños de navegador emulados. No se observó desbordamiento horizontal del documento en móvil/tableta; las tablas mantienen su desplazamiento interno. Se verificaron consulta de parámetros, apertura de notas y ampliación/restauración de tablas en navegador. No se probó un dispositivo físico.

Las 31 pruebas pasan. El arranque de las pruebas usa los scripts y el orden definidos en el HTML para detectar módulos ausentes. Los avisos de diseño sobre los bordes de las tablas corresponden a contenedores desplazables con espaciado en sus celdas. La disponibilidad de estos cambios en producción depende del despliegue del commit correspondiente en Netlify.
