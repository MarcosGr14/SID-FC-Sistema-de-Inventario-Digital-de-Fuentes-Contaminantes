# 🌿 SID-FC

### Sistema de Inventario Digital de Fuentes Contaminantes

SID-FC es una aplicación académica para ubicar fuentes contaminantes en Panamá, registrar mediciones ambientales y consultar su seguimiento en un mapa.

**Universidad Tecnológica de Panamá · Ingeniería de Software · Proyecto de Ingeniería Ambiental**

## ✨ ¿Qué ofrece?

- 🗺️ Mapa interactivo de fuentes georreferenciadas, con filtros por agua, aire y estado.
- 📍 Registro de fuentes permanentes y puntos de evaluación con referencia del sitio y coordenadas.
- 🧪 Registro de mediciones de agua y aire, vinculadas a una ubicación.
- 🚦 Comparación de mediciones con los límites configurados y señalización de alertas.
- 📚 Historial de inspecciones con búsqueda y paginación.
- 📊 Resumen por fuente y consulta de límites máximos permisibles.
- 📄 Reportes y exportación de datos en CSV y JSON.
- 📱 Diseño adaptable a computadoras, tabletas y teléfonos.

## 🧭 Guía rápida

### Explorar el mapa

En **Inventario** puedes ver las fuentes registradas y filtrar los marcadores por tipo o por alertas. Al seleccionar un marcador se muestran los datos de la fuente y su última medición.

### Registrar una fuente o un punto de evaluación

1. Inicia sesión con una cuenta de inspector.
2. Pulsa **Nueva Fuente**.
3. Ingresa el nombre, selecciona **Agua** o **Aire** y agrega una referencia del sitio.
4. Define la ubicación escribiendo latitud y longitud, usando la ubicación del dispositivo o pulsando **Elegir punto en el mapa** y marcando el sitio.
5. Guarda el registro. La ubicación aparecerá en el mapa y podrá seleccionarse en futuras inspecciones.

Si vas a medir un punto nuevo en una visita, regístralo como punto de evaluación y úsalo para guardar esa medición. Si ya existe, selecciónalo y registra una nueva inspección asociada a él.

### Registrar una inspección

1. En **Inspección de Campo**, selecciona la fuente o el punto evaluado.
2. La matriz de agua o aire se ajusta al tipo de fuente seleccionado.
3. Elige el parámetro, ingresa el valor medido, la fecha y hora, y el nombre del inspector.
4. Guarda la medición para consultar el resultado en el mapa, el resumen y el histórico.

### Consultar y exportar información

- **Histórico:** busca inspecciones por fuente o inspector y avanza entre páginas.
- **Resumen y reglas:** revisa el estado de cada fuente, sus coordenadas y los límites configurados.
- **Reporte:** genera una vista imprimible que puede guardarse como PDF.
- **Datos y respaldo:** descarga un respaldo JSON o un archivo CSV de las inspecciones.

## 🔐 Acceso y datos

La información del inventario se almacena en Supabase y se comparte entre las personas que usan el proyecto. El mapa y las consultas son de lectura pública; para registrar fuentes o inspecciones se necesita una cuenta iniciada en Supabase Auth.

Los alias que aparecen en **Acerca de nosotros** son identificadores propuestos para el equipo. Para usarlos, un administrador debe crearlos como usuarios de Supabase Auth y asignar una contraseña a cada uno.

Al crear o editar cada usuario en Supabase, agrega su nombre en **User Metadata** con la propiedad `full_name`, por ejemplo: `{"full_name":"Marcos Gaitan"}`. La aplicación muestra ese nombre en la sesión y lo usa como inspector predeterminado.

## 🏗️ Arquitectura

SID-FC es una aplicación web de una sola página, construida con HTML, CSS y JavaScript. No requiere un proceso de compilación.

| Capa | Componentes | Responsabilidad |
| --- | --- | --- |
| Interfaz | `index.html`, `css/style.css`, `js/ui.js` | Páginas, formularios, mapa, tablas y navegación. |
| Lógica | `js/auth.js`, `js/inspections.js`, `js/export.js` | Sesión, evaluación de mediciones y exportación. |
| Datos | `js/db.js`, `sql/schema.sql`, Supabase | Persistencia en PostgreSQL y reglas RLS. |
| Mapa | `js/map.js`, Leaflet, OpenStreetMap | Visualización y selección de coordenadas. |

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
- Madeline Delgado
- Kevin Flores


Universidad Tecnológica de Panamá · Facultad de Ingeniería de Sistemas Computacionales.

## ℹ️ Alcance

SID-FC es un prototipo académico de seguimiento ambiental. Las alertas comparan las mediciones con los límites configurados en el sistema y no constituyen una determinación oficial de incumplimiento ambiental.
