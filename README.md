# 🌿 SID-FC

### Sistema de Inventario Digital de Fuentes Contaminantes

SID-FC es una aplicación académica para ubicar fuentes contaminantes en Panamá, registrar mediciones ambientales y consultar su seguimiento en un mapa.

**Universidad Tecnológica de Panamá · Ingeniería de Software · Proyecto de Ingeniería Ambiental**

## ✨ ¿Qué ofrece?

- 🗺️ Mapa interactivo de fuentes georreferenciadas, con filtros por agua, aire, suelo y estado.
- 📍 Registro de fuentes permanentes y puntos de evaluación con referencia del sitio y coordenadas.
- 🧪 Registro de mediciones de agua, aire y suelo, vinculadas a una ubicación.
- 🚦 Comparación con criterios documentados por contexto, con trazabilidad de la referencia aplicada.
- 📚 Historial de inspecciones con búsqueda y paginación.
- 📊 Resumen por fuente y consulta de normas y guías por medio, parámetro y uso.
- 📄 Reportes y exportación de datos en CSV y JSON.
- 📷 Evidencia fotográfica de la fuente o de cada medición, con captura desde la cámara y almacenamiento privado.
- 📈 Gráficas de línea, puntos o barras para lecturas comparables.
- 📱 Aplicación web instalable (PWA), adaptable a teléfonos y tabletas, con consulta pública reciente en caché.

## 🧭 Guía rápida

### Explorar el mapa

En **Inventario** puedes consultar los registros aprobados para publicación y filtrar el mapa por medio o estado de referencia. Al seleccionar un marcador se abre el expediente público disponible. Los registros sin aprobar no aparecen a visitantes.

### Registrar una fuente o un punto de evaluación

1. Inicia sesión con una cuenta de inspector.
2. Pulsa **Nueva Fuente**.
3. Ingresa el nombre, selecciona el medio y la categoría de la fuente, y agrega una referencia del sitio. Puedes adjuntar una fotografía; en dispositivos móviles el selector permite usar la cámara.
4. Define la ubicación escribiendo latitud y longitud, usando la ubicación del dispositivo o pulsando **Elegir punto en el mapa** y marcando el sitio.
5. Guarda el registro. La ubicación aparecerá en el mapa y podrá seleccionarse en futuras inspecciones.

Si vas a medir un punto nuevo en una visita, regístralo como punto de evaluación y úsalo para guardar esa medición. Si ya existe, selecciónalo y registra una nueva inspección asociada a él.

### Registrar una inspección

1. En **Mediciones**, selecciona la fuente o el punto evaluado.
2. Selecciona el medio evaluado: una misma fuente admite mediciones de agua, aire o suelo.
3. Elige el parámetro, ingresa el valor medido, la fecha y hora, y el nombre del inspector.
4. Confirma el contexto y criterio aplicable. Si necesitas un intervalo específico, aporta el documento que lo respalda; sin criterio confirmado, la lectura queda sin clasificación.
5. Adjunta una fotografía de campo si corresponde y guarda la medición con conexión. La fotografía queda privada y asociada al registro.

### Consultar y exportar información

- **Historial:** filtra por fuente, responsable, medio, estado y fechas. Pulsa una fuente para localizarla en el mapa y abrir su expediente.
- **Fuentes:** consulta un registro por sitio, el estado de su última visita y su expediente.
- **Criterios de evaluación:** debajo del mapa, elige medio, parámetro y contexto para consultar valores, categorías, método y fuentes documentales. En móvil aparece plegado.
- **Ampliar tabla:** disponible en Historial y Fuentes para consultar todas las columnas a ancho completo; permite volver a la vista dividida.
- **Informes:** imprime el estado actual o el historial filtrado completo.
- **Expediente:** revisa mediciones comparables, procedencia, fotografías y su historial. Las fotos subidas desde el formulario son privadas y requieren una sesión de investigador.
- **Datos y respaldo:** descarga un respaldo JSON o un archivo CSV de las inspecciones.

## 🔐 Acceso y datos

La información se almacena en Supabase. Las personas visitantes solo pueden consultar fuentes y mediciones con `publicado_en` aprobado; la base de datos limita además las columnas visibles. Nombres de responsables, observaciones internas y fotografías privadas no se exponen en la consulta pública. Solo cuentas autenticadas pueden registrar fuentes y mediciones. La aprobación de publicación corresponde a una persona administradora con `app_metadata.role = admin` y se realiza en Supabase; una sesión de investigador común no puede publicar.

Para identificar el nombre del investigador en el registro de sesión, agrega `full_name` en los metadatos de usuario de Supabase Auth. La clasificación distingue una comparación con un criterio documentado de una determinación legal; revisa el contexto, la matriz, el período de promedio, la unidad y la fuente en [docs/CRITERIOS.md](docs/CRITERIOS.md).

## 🏗️ Arquitectura

SID-FC es una aplicación web de una sola página, construida con HTML, CSS y JavaScript. No requiere un proceso de compilación.

| Capa | Componentes | Responsabilidad |
| --- | --- | --- |
| Interfaz | `index.html`, `css/style.css`, `js/ui.js` | Páginas, formularios, mapa, tablas y navegación. |
| Lógica | `js/auth.js`, `js/inspections.js`, `js/criteria.js`, `js/export.js` | Sesión, evaluación de mediciones y exportación. |
| Datos | `js/db.js`, `sql/schema.sql`, Supabase | Persistencia en PostgreSQL y reglas RLS. |
| Mapa | `js/map.js`, Leaflet, OpenStreetMap | Visualización y selección de coordenadas. |
| Aplicación instalable | `manifest.webmanifest`, `service-worker.js` | Shell offline y recursos locales; la consulta pública se conserva aparte con caducidad. |
| Evidencias | `js/ui.js`, `js/db.js`, Supabase Storage | Optimización en cliente, carga y asociación privada a fuente o medición. |

## 🧰 Tecnologías

- HTML5, CSS3 y JavaScript
- Supabase Auth y PostgreSQL
- Leaflet y mapas de OpenStreetMap
- Inter y Space Grotesk

## 🎨 Diseño y desarrollo

Proyecto diseñado y desarrollado por el equipo SID-FC:

- Marcos Gaitan
- Diego Cedeño
- Isabella Castro
- Madeleyn Delgado
- Kevin Florez


Universidad Tecnológica de Panamá · Facultad de Ingeniería de Sistemas Computacionales.

## ℹ️ Alcance

SID-FC es un prototipo académico de seguimiento ambiental. Las alertas comparan las mediciones con los límites configurados en el sistema y no constituyen una determinación oficial de incumplimiento ambiental.

## 📲 Instalación, caché y conexión

La PWA puede instalarse desde el navegador compatible. Con conexión, almacena los recursos locales y las últimas filas públicas aprobadas por un máximo de siete días; sin conexión permite consultar esa copia e informa su fecha. Las consultas de cuentas autenticadas, tokens, fotos y solicitudes de escritura nunca se guardan en la caché pública. Registrar mediciones y subir fotografías requiere conexión.

Las dependencias Leaflet 1.9.4 y Supabase JS 2.119.0 están incluidas en `assets/vendor`, con sus licencias. El frontend no requiere compilación. Sirve la carpeta desde localhost o HTTPS para activar el service worker y la cámara. Para ejecutar las pruebas de regresión: `npm ci` y `npm test`.

El esquema base está en `sql/schema.sql`; la ampliación de expedientes, tendencias y evidencias está en `sql/actualizacion_expedientes_y_tendencias.sql`. La ampliación `sql/criterios_y_archivo.sql` añade intervalos por medición y archivo recuperable, sin retirar registros. El archivo `sql/datos_prueba.sql` contiene solo datos identificados como simulación, para uso académico.

## 📥 Mediciones desde documentos externos

En **Mediciones → Desde un informe**, selecciona un sitio e ingresa el resultado, unidad, fecha de muestreo, responsable y enlace al documento. Para varias lecturas, utiliza la plantilla CSV, revisa la vista previa y guarda el lote. Las fuentes deben estar registradas antes de importar; se omiten duplicados exactos.

El CSV utiliza estas columnas: `fuente,medio,parametro,valor,unidad,fecha,responsable,referencia`. La fecha incluye la zona horaria, por ejemplo `2026-11-12T09:00:00-05:00`. Admite hasta 100 lecturas por archivo.

El botón **Volver a medición de campo** permite salir del modo informe sin perder lo escrito. También puedes cambiar el origen a análisis de laboratorio.

La guía distingue normas panameñas por ámbito, referencias internacionales y objetivos del sitio. La aplicación no clasifica si falta contexto, unidad o perfil aplicable. La [revisión documental de criterios](docs/CRITERIOS.md) detalla valores, condiciones y fuentes; cada medición conserva una instantánea del criterio aplicado. Para efluentes, verifica la actividad CIIU/Anexo A antes de usar el perfil. Los datos académicos conservan su procedencia y no se presentan como mediciones oficiales.

`sql/organizar_inventario.sql` corresponde a la limpieza puntual del 12 de noviembre, no a una migración recurrente. Las fuentes retiradas del inventario se archivan de forma recuperable. `sql/restaurar_fuentes_archivadas.sql` permite restaurarlas desde una sesión administrativa.
