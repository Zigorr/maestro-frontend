import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export type SignalData = {
  bvp: number[];
  gsr: number[];
  skt: number[];
  totalSamples: number;
};

/**
 * Parse a CSV/XLSX file (uri from expo-document-picker).
 * Extracts bvp, gsr, skt columns — all other columns are ignored.
 * Mirrors stream_mood_to_music.py load_dataset_file().
 */
export async function parseSignalCsv(fileUri: string): Promise<SignalData> {
  let content = '';
  
  if (Platform.OS === 'web') {
    const response = await fetch(fileUri);
    content = await response.text();
  } else {
    content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }


  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.toLowerCase().trim(), // mirrors backend: col.lower().strip()
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const rows = results.data;
        if (rows.length === 0) {
          return reject(new Error('CSV file is empty.'));
        }

        const headers = Object.keys(rows[0]);
        const required = ['bvp', 'gsr', 'skt'];
        const missing = required.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          return reject(
            new Error(
              `CSV is missing required columns: ${missing.join(', ')}. ` +
                `Found: ${headers.join(', ')}`
            )
          );
        }

        const bvp: number[] = [];
        const gsr: number[] = [];
        const skt: number[] = [];

        for (const row of rows) {
          const b = parseFloat(row['bvp']);
          const g = parseFloat(row['gsr']);
          const s = parseFloat(row['skt']);
          if (!isNaN(b) && !isNaN(g) && !isNaN(s)) {
            bvp.push(b);
            gsr.push(g);
            skt.push(s);
          }
        }

        if (bvp.length < 16_000) {
          return reject(
            new Error(
              `CSV only has ${bvp.length} valid rows. ` +
                `At least 16,000 are needed (16 seconds at 1000 Hz).`
            )
          );
        }

        resolve({ bvp, gsr, skt, totalSamples: bvp.length });
      },
      error: (err: Error) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}
