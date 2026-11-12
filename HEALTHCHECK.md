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
