# Plan: llevar SID-FC a una versión de campo completa

## Objetivo

Convertir SID-FC en una web instalable y cómoda para investigadores en teléfonos y tabletas, con criterios ambientales trazables, captura fotográfica, gráficas útiles y una vista pública que solo exponga datos aprobados.

**Terminado cuando:** un visitante sin cuenta puede consultar el inventario público aprobado sin acceder a campos reservados; una persona investigadora autenticada puede registrar mediciones y evidencia fotográfica desde móvil; cada clasificación muestra criterio, unidad, contexto y fuente; el expediente ofrece vistas comparables; y la aplicación es instalable y usable con conectividad intermitente para consulta.

**Fuera de alcance inicial:** guardar mediciones o fotos sin conexión; declarar incumplimiento legal automáticamente; reescribir el historial Git; migrar a un framework o añadir una dependencia de gráficas sin demostrar que la solución actual no alcanza.

## Estado actual

- SPA sin compilación: `index.html` carga módulos JavaScript en orden; `js/main.js` arranca `UI.init()`.
- `js/ui.js` coordina formularios, mapa, tablas, resumen y expediente; las escrituras principales están en los manejadores de `formFuente` y `formInspeccion`.
- `js/db.js` centraliza Supabase, paginación de consultas, Storage y evidencia. Las fotos se gestionan actualmente desde el expediente, no desde los formularios de alta.
- `js/guide.js` tiene perfiles por contexto y fuente; `js/inspections.js` interpreta instantáneas de criterio guardadas con cada lectura. `sql/schema.sql` todavía presenta el esquema base y las políticas conceden lectura pública directa de las tablas.
- `js/chart.js` dibuja una gráfica SVG de línea; `abrirExpediente()` en `js/ui.js` ya filtra por parámetro y unidad y avisa si cambia el criterio o método.
- `index.html` no declara manifiesto ni registra service worker. El CSS es responsive, pero falta una verificación centrada en tareas de campo.
- El árbol está limpio en `main`, igual a `origin/main`. No existe `.gitignore`; hay 1.222 archivos de `node_modules/` y dos respaldos JSON versionados. Los respaldos contienen datos del inventario. Se acordó retirarlos del árbol publicado y conservar el historial de Git.
- Pruebas existentes: `tests/app.test.cjs`, `tests/criteria.test.cjs`, `tests/map.test.cjs`; comando configurado: `npm test`.

## Supuestos acordados

- Público: solo datos aprobados para publicación; nombres de investigadores, notas internas y fotos permanecen privados salvo aprobación explícita.
- No habrá captura de mediciones ni sincronización de fotos sin conexión en esta entrega. La caché offline cubrirá la app y la consulta pública permitida.
- Las fuentes y los criterios requieren revisión por una persona experta antes de habilitar nuevas clasificaciones; los valores no se completarán por estimación.
- Se retirarán `node_modules/` y `backups/` del árbol de la siguiente versión de GitHub y se ignorarán localmente. Se conserva el historial existente, según indicación del usuario.

## Fases

### 0. Contrato de datos y privacidad

1. Inventariar campos públicos y reservados en `fuentes`, `inspecciones` y `evidencias_fuente`; marcar qué registros pueden publicarse.
2. Diseñar consultas públicas explícitas (vistas/proyección de columnas aprobadas) y mantener consultas autenticadas para tareas de investigador. No confiar en ocultar campos solo desde la interfaz.
3. Definir aceptación de fuente/medición pública y un mensaje de transparencia que explique procedencia, contexto, límites y fecha de actualización.

**Verificación:** pruebas de acceso anon/auth confirman que el público no lee nombres, observaciones internas, datos no aprobados ni Storage privado; un investigador autenticado puede seguir registrando.

### 1. Criterios ambientales trazables

1. Auditar `js/guide.js`, `docs/CRITERIOS.md`, `sql/schema.sql` y migraciones contra documentos oficiales o técnicos aplicables por país, matriz, uso, método, unidad y fecha.
2. Mantener intervalos solo donde la fuente los respalde; distinguir norma legal, guía, índice de riesgo y objetivo operativo. Donde falte contexto, no clasificar.
3. Definir catálogo versionado y conservar la instantánea del criterio aplicado en cada medición; hacer que el resultado mostrado proceda de ese criterio, no solo del booleano histórico `cumple`.
4. Añadir casos de frontera, unidades incompatibles, fecha de vigencia, método y contexto a `tests/criteria.test.cjs`.

**Verificación:** revisión experta de cada perfil publicado; pruebas reproducibles de mínimos, máximos, bandas, casos sin referencia y snapshots históricos; actualizar `docs/CRITERIOS.md`.

### 2. Transparencia pública segura

1. Sustituir lectura anónima de tablas completas (`sql/schema.sql` y `sql/actualizacion_expedientes_y_tendencias.sql`) por una proyección pública explícita con campos aprobados.
2. Añadir estado de publicación/visibilidad y reglas de base de datos; mantener escritura limitada a cuentas autenticadas. La vista pública no incluirá datos reservados ni fotos privadas.
3. Adaptar `js/db.js` y `js/ui.js` para leer la vista pública cuando no haya sesión y los datos de trabajo cuando corresponda.

**Verificación:** pruebas SQL/API con roles `anon` y `authenticated`, incluidas consultas directas a columnas y URLs de evidencia; revisar que la UI no sea la única barrera.

### 3. Flujo de campo y diseño móvil

1. Simplificar navegación y contenido para tareas de investigador; establecer vocabulario técnico consistente en `index.html` y `js/ui.js`.
2. Reorganizar formularios y expediente en `css/style.css` para uso táctil: una columna en teléfono, controles legibles, foco visible, teclado y estados de carga/error claros.
3. Optimizar las imágenes editoriales actuales y evitar animaciones que ralenticen la captura; respetar `prefers-reduced-motion`.

**Verificación:** completar alta de fuente, medición, filtros y expediente a 390, 820 y 1280 px; teclado y lector de pantalla en formularios; sin desbordamiento horizontal del documento.

### 4. PWA instalable y consulta con caché

1. Añadir manifiesto, iconos, registro/versionado de service worker y metadatos de instalación en `index.html` y `js/main.js`.
2. Cachear solo shell y recursos locales versionados; definir expiración/invalidez de datos públicos. No cachear respuestas autenticadas, tokens, fotos privadas ni solicitudes mutables.
3. Presentar estado online/offline y recuperación. En esta versión, el formulario de campo requiere conexión para guardar.

**Verificación:** instalar/abrir desde pantalla de inicio en Android y Safari iOS cuando esté disponible; reiniciar con red y sin red; confirmar que lectura permitida funciona y que escrituras privadas no quedan almacenadas en caché.

### 5. Fotografía de fuente y medición

1. Extender `formFuente` y `formInspeccion` para adjuntar archivo; en móvil ofrecer cámara trasera mediante `accept="image/*"` y `capture="environment"`, manteniendo selección de archivo como alternativa.
2. Reutilizar `evidencias_fuente` y Storage privado; asociar evidencia a fuente y, cuando exista, a `inspeccion_id`. Guardar primero el registro y presentar un estado recuperable si falla la carga de foto.
3. Validar MIME/tamaño, reducir resolución y peso en cliente, mostrar vista previa y eliminar metadatos EXIF sensibles antes de subir. No publicar fotos por defecto.

**Verificación:** permisos denegados, cancelación, cámara/archivo, mala conectividad, reintento, foto privada y asociación correcta desde móvil/tableta/escritorio.

### 6. Gráficas de expediente

1. Extender `js/chart.js` y el selector de `js/ui.js` con línea, puntos y barras para una serie comparable; conservar eje temporal, unidad y criterio aplicado.
2. Añadir filtros de periodo y bandas/límites del criterio solo cuando corresponda; no mezclar parámetros, unidades, métodos o contextos incompatibles.
3. Mantener selección por teclado, detalle de observación y alternativa textual/tabla accesible; evitar animación con movimiento reducido.

**Verificación:** datos vacíos, un punto, fechas irregulares, cambios de criterio, unidades distintas, muchas lecturas y navegación por teclado en `tests/app.test.cjs` y pruebas específicas.

### 7. Rendimiento, estabilidad y aceptación integral

1. Medir carga inicial y consultas con inventario representativo; reducir bytes de imágenes, fuentes externas, scripts y repintados antes de cambiar dependencias.
2. Revisar paginación, errores y límites de espera en `js/db.js`; comprobar que las cargas de fotos diferidas no bloquean mapa ni expediente.
3. Ejecutar `npm test`, chequeo sintáctico y revisión de accesibilidad/responsive; recorrido autenticado en staging y escaneo de recursos publicados.

**Verificación:** resultados documentados, sin errores de consola o regresiones; carga inicial y pantallas de campo cumplen objetivos acordados antes de despliegue.

### 8. Higiene del repositorio, documentación y entrega

1. Añadir `.gitignore` para `node_modules/`, respaldos locales, `.env*` (con excepción de `.env.example`), archivos del sistema y salidas temporales. Conservar dependencias realmente necesarias bajo `assets/vendor/`.
2. Retirar del árbol versionado `node_modules/` y `backups/` sin borrar copias locales; los respaldos y dependencias seguirán visibles en commits anteriores porque no se reescribirá el historial.
3. Actualizar `README.md` con instalación PWA, flujos de investigador y consulta pública, permisos de fotos, criterios y límites reales; publicar el cambio en GitHub una vez aprobada la entrega.

**Verificación:** `git status` limpio después de la entrega, `git check-ignore` cubre archivos locales y el README coincide con el comportamiento probado. El despliegue en producción se confirma por separado si el push a la rama publicada activa Netlify.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación / detección |
|---|---|---|
| Límite fuera de contexto o tratado como norma local | Alto | No inventar bandas; citar ámbito y vigencia; revisión experta y pruebas de frontera. |
| Exposición de investigador, ubicación sensible o fotos | Alto | Proyección pública y permisos en SQL/Storage; pruebas directas con `anon`; denegar por defecto. |
| Fallo o duplicado al subir fotos desde campo | Medio/alto | Guardado idempotente, estados separados de medición/foto y reintento seguro. |
| Caché de datos reservados en dispositivo compartido | Alto | Cachear únicamente shell y proyección pública; prueba de inspección de caché sin sesión. |
| Dependencias/respaldos permanecen en historial | Medio | Retirar del árbol futuro y explicar que el historial conserva acceso; no reescribir Git. |
| El push activa publicación automática | Alto | Entregar en rama/PR y comprobar el pipeline; pedir autorización antes de merge/deploy a producción. |

## Despliegue y reversión

Trabajar por fase en rama revisable y aplicar migraciones aditivas, con copias de seguridad administradas fuera del repositorio. Probar primero en entorno de verificación. Revertir el frontend a la versión anterior si falla; para permisos públicos, conservar la política restrictiva y restaurar solo después de corregir la proyección. No ejecutar migraciones contra la base compartida ni fusionar a la rama que despliega producción sin autorización expresa.

## Aprobación y progreso

- Estado: en curso, aprobado por el usuario el 25 de noviembre de 2026.
- Acuerdos: exposición pública solo de datos aprobados; respaldos fuera del árbol y excluidos en adelante, historial conservado; PWA con caché de consulta, sin escrituras offline.
- [x] Revisión inicial: checkout limpio en `main`, estructura y módulos relevantes inspeccionados.
- [x] Contrato confirmado: el público solo consulta registros publicados; nombres y observaciones internas quedan reservados.
- [~] Fase 0 — contrato de datos y privacidad (políticas preparadas; falta validar en PostgreSQL de staging)
- [~] Fase 1 — criterios ambientales (catálogo ampliado; falta revisión experta parámetro por parámetro)
- [~] Fase 2 — transparencia pública segura (consultas y caché limitadas; falta probar RLS real y publicación)
- [~] Fase 3 — flujo de campo y diseño móvil (captura integrada; falta recorrido en dispositivos físicos)
- [~] Fase 4 — PWA (shell y lectura pública cacheados; falta validar instalación en Android/iOS)
- [~] Fase 5 — fotografía/cámara (UI, optimización y Storage; falta verificar Storage real y permisos de cámara)
- [x] Fase 6 — gráficas (línea, puntos y barras implementadas; falta validar datos reales representativos)
- [~] Fase 7 — rendimiento y aceptación (regresión aprobada; faltan mediciones de carga y datos reales)
- [~] Fase 8 — `.gitignore`, README y entrega (actualizados en la rama y PR borrador #1; falta revisar/validar antes de fusionar)

### Avance de implementación

- Rama de trabajo: `codex/sid-fc-campo-publico`.
- Añadidas columnas `publicado_en`, políticas de lectura pública condicionadas a publicación, grants por columna para `anon`, y publicación restringida a `app_metadata.role = admin` en `supabase/migrations/20261125120000_publicacion_aprobada.sql`.
- Ajustados los grants del esquema base y ampliación para que una repetición de scripts no restaure lectura anónima de tablas completas.
- `js/db.js` solicita a `anon` solo columnas públicas; los usuarios autenticados conservan la consulta completa.
- Añadida cobertura de consultas públicas/autenticadas en `tests/app.test.cjs` y casos pgTAP en `supabase/tests/publicacion_aprobada.test.sql`.
- `npm test`: 42 pruebas pasan. PostgreSQL local no permitió conexión con el rol del entorno; pgTAP y las políticas aún no se ejecutan en una base de prueba. La migración no se aplicó a Supabase.
- Iteración actual: PWA instalable y cacheada para consulta pública aprobada (7 días); campos de fotografía/cámara para fuente y medición, con re-encodificación y reducción; vistas de línea/puntos/barras; aviso de transparencia; catálogo/documentación de efluentes ampliados y aclaración de CIIU/Anexo A; README y `.gitignore` actualizados.
- `node --check` sobre JavaScript y service worker, validación JSON/iconos del manifiesto, `git diff --check` y `git check-ignore` completados sin errores.
- Retirados del índice Git `node_modules/` y `backups/`; los archivos locales se conservan ignorados.
- Pendiente para cerrar el acceso público: aplicar y correr `supabase/tests/publicacion_aprobada.test.sql` en Supabase de prueba, validar Storage privado con una cuenta real y aprobar/publicar datos de demostración. Esta migración no se aplicó a la base compartida.
