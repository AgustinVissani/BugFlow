import { isValid, parse, parseISO } from 'date-fns';
import type { BugCategory, BugNormalized, BugRowRaw, NormalizationResult } from '../types';

const FIELD_ALIASES: Record<string, string[]> = {
  id: ['id', 'bug id', 'work item id', 'issue key', 'key'],
  workItemType: ['work item type', 'type', 'issue type'],
  state: ['state', 'status'],
  priority: ['priority', 'prio'],
  severity: ['severity', 'impact'],
  createdDate: ['created date', 'createddate', 'created'],
  closedDate: ['closed date', 'closeddate', 'resolved', 'resolution date'],
  title: ['title', 'summary'],
  assignedTo: ['assigned to', 'assignee'],
  closedBy: ['closed by', 'resolved by'],
  sprint: ['sprint', 'iteration path', 'iteration'],
  tags: ['tags', 'labels'],
  areaPath: ['area path', 'areapath', 'component'],
};

const CATEGORY_RULES: Array<{ category: BugCategory; patterns: string[] }> = [
  { category: 'Forecasting', patterns: ['forecast', 'forecasting'] },
  { category: 'Libranzas', patterns: ['libranza', 'libranzas'] },
  { category: 'BU Hora 00:00', patterns: ['00:00', 'hora 00', 'bu hora'] },
  { category: 'Turnos / Solapamientos', patterns: ['solap', 'turno', 'overlap', 'shift overlap'] },
  { category: 'Eliminar turnos / Borrar libranzas', patterns: ['eliminar turno', 'borrar libranza', 'delete shift', 'remove shift'] },
  { category: 'Ausencias', patterns: ['ausencia', 'absence', 'absences'] },
  { category: 'Optimizador', patterns: ['optimizador', 'optimizer', 'optimiser'] },
  { category: 'KPIs / Contadores', patterns: ['kpi', 'contador', 'counter', 'metric'] },
  { category: 'Alertas', patterns: ['alerta', 'alert', 'alarm'] },
  { category: 'Shift Finder', patterns: ['shift finder'] },
  { category: 'CAS / Integraciones', patterns: ['cas', 'integracion', 'integración', 'integration', 'api', 'connector'] },
];

const CLOSED_STATE_TOKENS = ['closed', 'resolved', 'done'];
const PARSE_FORMATS = [
  'yyyy-MM-dd HH:mm:ss',
  'yyyy-MM-dd HH:mm',
  'yyyy-MM-dd',
  'd/M/yyyy H:mm:ss',
  'd/M/yyyy H:mm',
  'd/M/yyyy',
  'M/d/yyyy H:mm:ss',
  'M/d/yyyy H:mm',
  'M/d/yyyy',
];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]/g, ' ');
}

function findColumnName(row: BugRowRaw, aliases: string[]): string | null {
  const keys = Object.keys(row);
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (aliases.some((alias) => normalized === normalizeKey(alias))) {
      return key;
    }
  }
  return null;
}

function readField(row: BugRowRaw, column: string | null): unknown {
  return column ? row[column] : null;
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function excelSerialToDate(serial: number): Date {
  const millisecondsPerDay = 86400000;
  const excelEpochOffset = 25569;
  return new Date((serial - excelEpochOffset) * millisecondsPerDay);
}

function sanitizeDateText(raw: string): string {
  return raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseDateRobust(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date && isValid(value)) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 59 && value <= 600000) {
      const excelDate = excelSerialToDate(value);
      if (isValid(excelDate)) {
        return excelDate;
      }
    }
    const epochDate = new Date(value);
    return isValid(epochDate) ? epochDate : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const text = sanitizeDateText(value);
  if (!text) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      if (numeric >= 59 && numeric <= 600000) {
        const excelDate = excelSerialToDate(numeric);
        if (isValid(excelDate)) {
          return excelDate;
        }
      }
      const epochDate = new Date(numeric);
      if (isValid(epochDate)) {
        return epochDate;
      }
    }
  }

  const isoDate = parseISO(text);
  if (isValid(isoDate)) {
    return isoDate;
  }

  for (const formatPattern of PARSE_FORMATS) {
    const parsed = parse(text, formatPattern, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}

function detectCategory(title: string | null, tags: string | null, areaPath: string | null): BugCategory {
  const haystack = [title, tags, areaPath].filter(Boolean).join(' | ').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => haystack.includes(pattern.toLowerCase()))) {
      return rule.category;
    }
  }
  return 'Others';
}

function addExample(bucket: Set<string>, value: unknown) {
  if (bucket.size >= 5) {
    return;
  }
  const text = normalizeText(value);
  if (text) {
    bucket.add(text);
  }
}

export function normalizeRows(rawRows: BugRowRaw[]): NormalizationResult {
  if (rawRows.length === 0) {
    return { rows: [], warnings: ['No rows found in file.'], detectedColumns: {} };
  }

  const sample = rawRows[0];
  const detectedColumns: Record<string, string | null> = {};
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    detectedColumns[field] = findColumnName(sample, aliases);
  });

  const warnings: string[] = [];
  const requiredColumns = ['title', 'createdDate', 'state'];
  requiredColumns.forEach((field) => {
    if (!detectedColumns[field]) {
      warnings.push(`Missing column for ${field}. Supported aliases: ${FIELD_ALIASES[field].join(', ')}`);
    }
  });

  let invalidCreatedCount = 0;
  let invalidClosedCount = 0;
  const invalidCreatedExamples = new Set<string>();
  const invalidClosedExamples = new Set<string>();

  const rows: BugNormalized[] = rawRows.map((row, index) => {
    const id =
      normalizeText(readField(row, detectedColumns.id)) ||
      normalizeText((row as Record<string, unknown>)['Id']) ||
      `row-${index + 1}`;

    const title = normalizeText(readField(row, detectedColumns.title));
    const tags = normalizeText(readField(row, detectedColumns.tags));
    const areaPath = normalizeText(readField(row, detectedColumns.areaPath));
    const state = normalizeText(readField(row, detectedColumns.state));

    const createdRaw = readField(row, detectedColumns.createdDate);
    const closedRaw = readField(row, detectedColumns.closedDate);

    const createdDate = parseDateRobust(createdRaw);
    const closedDate = parseDateRobust(closedRaw);

    if (normalizeText(createdRaw) && !createdDate) {
      invalidCreatedCount += 1;
      addExample(invalidCreatedExamples, createdRaw);
    }

    if (normalizeText(closedRaw) && !closedDate) {
      invalidClosedCount += 1;
      addExample(invalidClosedExamples, closedRaw);
    }

    const stateLower = (state || '').toLowerCase();
    const isClosed = Boolean(closedDate) || CLOSED_STATE_TOKENS.some((token) => stateLower.includes(token));

    return {
      id,
      workItemType: normalizeText(readField(row, detectedColumns.workItemType)),
      state,
      priority: normalizeText(readField(row, detectedColumns.priority)),
      severity: normalizeText(readField(row, detectedColumns.severity)),
      title,
      tags,
      areaPath,
      assignedTo: normalizeText(readField(row, detectedColumns.assignedTo)),
      closedBy: normalizeText(readField(row, detectedColumns.closedBy)),
      sprint: normalizeText(readField(row, detectedColumns.sprint)),
      createdDate,
      closedDate,
      isClosed,
      category: detectCategory(title, tags, areaPath),
      raw: row,
    };
  });

  if (invalidCreatedCount > 0) {
    const createdPercent = ((invalidCreatedCount / rawRows.length) * 100).toFixed(1);
    warnings.push(
      `Invalid CreatedDate: ${invalidCreatedCount}/${rawRows.length} (${createdPercent}%). Examples: ${
        [...invalidCreatedExamples].join(' | ') || 'n/a'
      }`,
    );
  }

  if (invalidClosedCount > 0) {
    const closedPercent = ((invalidClosedCount / rawRows.length) * 100).toFixed(1);
    warnings.push(
      `Invalid ClosedDate: ${invalidClosedCount}/${rawRows.length} (${closedPercent}%). Examples: ${
        [...invalidClosedExamples].join(' | ') || 'n/a'
      }`,
    );
  }

  return {
    rows,
    warnings,
    detectedColumns,
  };
}
