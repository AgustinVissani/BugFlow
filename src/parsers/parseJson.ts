import type { BugRowRaw } from '../types';
import { parseCsv } from './parseCsv';
import { parseExcel } from './parseExcel';

async function fileToText(file: File): Promise<string> {
  return file.text();
}

export async function parseJson(file: File): Promise<BugRowRaw[]> {
  const text = await fileToText(file);
  const parsed: unknown = JSON.parse(text);

  if (Array.isArray(parsed)) {
    return parsed as BugRowRaw[];
  }

  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'data' in parsed &&
    Array.isArray((parsed as { data: unknown }).data)
  ) {
    return (parsed as { data: BugRowRaw[] }).data;
  }

  throw new Error('Invalid JSON format. Expected array or { data: [] }.');
}

export async function parseUnknownFile(file: File): Promise<BugRowRaw[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcel(file);
  }

  if (name.endsWith('.csv')) {
    return parseCsv(file);
  }

  if (name.endsWith('.json')) {
    return parseJson(file);
  }

  const mime = (file.type || '').toLowerCase();
  if (mime.includes('json')) {
    return parseJson(file);
  }
  if (mime.includes('csv')) {
    return parseCsv(file);
  }
  if (mime.includes('sheet') || mime.includes('excel')) {
    return parseExcel(file);
  }

  throw new Error('Unsupported file format. Use .xlsx, .csv or .json');
}
