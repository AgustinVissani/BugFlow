# Bug Metrics Dashboard

A Vite + React + TypeScript dashboard to upload bugs (Excel/CSV/JSON), normalize heterogeneous columns, and compute metrics by sprint, developer, and category.

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

## Installation
```bash
npm install
```

## Run in development
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Expected input format (Bugs)
The app accepts `.xlsx`, `.csv`, and `.json`.

Supported fields by alias (case-insensitive):
- Type: `Work Item Type` / `Type` / `Issue Type`
- Status: `State` / `Status`
- Priority: `Priority` / `Prio`
- Severity: `Severity` / `Impact`
- Created: `Created Date` / `CreatedDate` / `Created`
- Closed: `Closed Date` / `ClosedDate` / `Resolved`
- Title: `Title`
- Assigned To: `Assigned To` / `Assignee`
- Closed By: `Closed By`
- Sprint: `Sprint` / `Iteration Path` / `Iteration`
- Tags: `Tags` / `Labels`
- Area: `Area Path` / `AreaPath`

Rules:
- If `Closed Date` is empty, the bug is considered open.
- `isClosed` can also be activated by a status containing `Closed`, `Resolved`, or `Done`.
- Dates accepted by `parseDateRobust`:
  - Excel serial number
  - ISO with/without `Z`
  - `d/M/yyyy H:mm:ss`
  - `d/M/yyyy`
  - `M/d/yyyy H:mm:ss`
  - `M/d/yyyy`
  - `yyyy-MM-dd HH:mm:ss`
  - `yyyy-MM-dd`

## SprintCalendar
Options:
1. Upload a `.xlsx/.csv/.json` file
2. Paste JSON in the textarea

Accepted format for pasted JSON:
- `[{...}]`
- `{ "data": [{...}] }`

Required columns (case-insensitive):
- `SprintName`
- `StartDate`
- `EndDate`

Validations:
- Valid dates
- `EndDate >= StartDate`

If there is no valid SprintCalendar:
- A warning is shown
- Sprint metrics/charts are disabled
- Developer and category metrics remain available

## Sprint calculation (exact)
- Created: `CreatedDate >= StartDate && CreatedDate < EndDate + 1 day`
- Closed: `ClosedDate >= StartDate && ClosedDate < EndDate + 1 day`

## Warnings
The app shows clear warnings for:
- Missing columns
- Invalid dates in rows, with percentage and examples (up to 5)
- Missing or invalid SprintCalendar

## Export
- `Export metrics JSON`: downloads `metrics-result.json`
- `Export CSV`: downloads `metrics-export.zip` with:
  - `sprint_metrics.csv`
  - `dev_metrics.csv`
- `open_priority_severity.csv`
- `Export PDF`: generates `bug-metrics-dashboard.pdf` with 7 pages:
  1. Summary + warnings
  2. Created vs Closed by Sprint
  3. Net by Sprint
  4. Closed by Dev
  5. Category Distribution
  6. Open by Sprint State
  7. Open by Priority and Severity

During PDF export, `Generating PDF...` is shown and buttons are disabled.

## Included samples
- `public/sample.json`
- `public/sample.csv`
- `public/sample-sprint-calendar.csv`

## Quick test
1. Open the app (`npm run dev`).
2. Upload `sample.json` or `sample.csv`.
3. Upload `sample-sprint-calendar.csv` or paste equivalent JSON.
4. Review cards, filters, sprint/dev/category charts, and the priority/severity matrix.
5. Try exporting JSON, ZIP CSV, and PDF.
