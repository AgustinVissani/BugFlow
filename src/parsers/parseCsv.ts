import Papa from 'papaparse';
import type { BugRowRaw } from '../types';

export async function parseCsv(file: File): Promise<BugRowRaw[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<BugRowRaw>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(result.errors.map((e) => e.message).join('; ')));
          return;
        }
        resolve(result.data as BugRowRaw[]);
      },
      error: (error) => reject(error),
    });
  });
}
