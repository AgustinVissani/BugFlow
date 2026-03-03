# Bug Metrics Dashboard

Dashboard en Vite + React + TypeScript para cargar bugs (Excel/CSV/JSON), normalizar columnas heterogéneas y calcular métricas por sprint, dev y categoría.

## Stack
- Vite + React + TypeScript
- Recharts
- xlsx (SheetJS)
- PapaParse
- date-fns
- Tailwind CSS
- JSZip
- jsPDF
- html2canvas

## Instalación
```bash
npm install
```

## Ejecutar en desarrollo
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Formato esperado de input (Bugs)
La app acepta `.xlsx`, `.csv` y `.json`.

Campos soportados por alias (case-insensitive):
- Tipo: `Work Item Type` / `Type` / `Issue Type`
- Estado: `State` / `Status`
- Creación: `Created Date` / `CreatedDate` / `Created`
- Cierre: `Closed Date` / `ClosedDate` / `Resolved`
- Título: `Title`
- Asignado: `Assigned To` / `Assignee`
- Cerrado por: `Closed By`
- Sprint: `Sprint` / `Iteration Path` / `Iteration`
- Tags: `Tags` / `Labels`
- Area: `Area Path` / `AreaPath`

Reglas:
- Si `Closed Date` está vacío, el bug se considera abierto.
- `isClosed` también puede activarse por estado que contenga `Closed`, `Resolved` o `Done`.
- Fechas aceptadas por `parseDateRobust`:
  - Excel serial number
  - ISO con/sin `Z`
  - `d/M/yyyy H:mm:ss`
  - `d/M/yyyy`
  - `M/d/yyyy H:mm:ss`
  - `M/d/yyyy`
  - `yyyy-MM-dd HH:mm:ss`
  - `yyyy-MM-dd`

## SprintCalendar
Opciones:
1. Subir archivo `.xlsx/.csv/.json`
2. Pegar JSON en textarea

Formato aceptado para JSON pegado:
- `[{...}]`
- `{ "data": [{...}] }`

Columnas requeridas (case-insensitive):
- `SprintName`
- `StartDate`
- `EndDate`

Validaciones:
- Fechas válidas
- `EndDate >= StartDate`

Si no hay SprintCalendar válido:
- Se muestra warning
- Se deshabilitan métricas/charts por sprint
- Se mantienen métricas por dev y categoría

## Cálculo por sprint (exacto)
- Creados: `CreatedDate >= StartDate && CreatedDate < EndDate + 1 día`
- Cerrados: `ClosedDate >= StartDate && ClosedDate < EndDate + 1 día`

## Warnings
La app muestra warnings claros para:
- Columnas faltantes
- Fechas inválidas en filas con porcentaje y ejemplos (máximo 5)
- SprintCalendar faltante o inválido

## Export
- `Export metrics JSON`: descarga `metrics-result.json`
- `Export CSV`: descarga `metrics-export.zip` con:
  - `sprint_metrics.csv`
  - `dev_metrics.csv`
- `Export PDF`: genera `bug-metrics-dashboard.pdf` con 5 páginas:
  1. Resumen + warnings
  2. Created vs Closed by Sprint
  3. Net by Sprint
  4. Closed by Dev
  5. Category Distribution

Durante PDF export se muestra `Generating PDF...` y botones deshabilitados.

## Samples incluidos
- `public/sample.json`
- `public/sample.csv`
- `public/sample-sprint-calendar.csv`

## Prueba rápida
1. Abrí la app (`npm run dev`).
2. Cargá `sample.json` o `sample.csv`.
3. Cargá `sample-sprint-calendar.csv` o pegá JSON equivalente.
4. Revisá cards, filtros y charts de sprint/dev/categoría.
5. Probá exportar JSON, ZIP CSV y PDF.
