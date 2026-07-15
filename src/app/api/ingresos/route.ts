import { NextResponse } from 'next/server';
import fs from 'fs';
import * as XLSX from 'xlsx';

// Fallback values in case the file is missing or unreadable
const FALLBACK_INGRESOS = {
  "2025": [
    211667972, 203140363, 204418961, 205323061, 200077286, 200227722,
    197096022, 197736597, 192642742, 190050340, 190625812, 205896275
  ],
  "2026": [
    203926938, 201609101, 203342553, 199665656, 203079923, 0, 0, 0, 0, 0, 0, 0
  ]
};

const MONTH_MAP: Record<string, number> = {
  'enero': 0, 'feb': 1, 'febrero': 1, 'mar': 2, 'marzo': 2, 'abr': 3, 'abril': 3,
  'may': 4, 'mayo': 4, 'jun': 5, 'junio': 5, 'jul': 6, 'julio': 6, 'ago': 7, 'agosto': 7,
  'sep': 8, 'septiembre': 8, 'oct': 9, 'octubre': 9, 'nov': 10, 'noviembre': 10,
  'dic': 11, 'diciembre': 11
};

export async function GET() {
  const filePath = "C:\\Users\\USER\\Desktop\\1. Antigravity\\5. IA-FAM\\1. Documentos Base\\Ingresos FAM 2025-2026.xlsx";

  try {
    if (!fs.existsSync(filePath)) {
      console.warn("Excel file not found, using fallback data.");
      return NextResponse.json(FALLBACK_INGRESOS);
    }

    const workbook = XLSX.readFile(filePath);
    const result: Record<string, number[]> = {
      "2025": Array(12).fill(0),
      "2026": Array(12).fill(0)
    };

    workbook.SheetNames.forEach(sheetName => {
      if (sheetName === '2025' || sheetName === '2026') {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        rows.forEach(row => {
          const rawMes = String(row.MES || row.mes || '').trim().toLowerCase();
          const valor = Number(row.VALOR || row.valor || 0);

          if (rawMes && rawMes !== 'total' && rawMes !== 'total:' && !rawMes.startsWith('total')) {
            const monthIndex = MONTH_MAP[rawMes];
            if (monthIndex !== undefined && monthIndex >= 0 && monthIndex < 12) {
              result[sheetName][monthIndex] = valor;
            }
          }
        });
      }
    });

    // Verify if we have values, if all are zero, use fallback
    const hasValues2025 = result["2025"].some(v => v > 0);
    const hasValues2026 = result["2026"].some(v => v > 0);

    if (!hasValues2025 && !hasValues2026) {
      return NextResponse.json(FALLBACK_INGRESOS);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error reading incomes Excel, using fallbacks:", error);
    return NextResponse.json(FALLBACK_INGRESOS);
  }
}
