import * as XLSX from 'xlsx';
import type { BugRowRaw } from '../types';

export async function parseExcel(file: File): Promise<BugRowRaw[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<BugRowRaw>(sheet, { defval: null });
}
