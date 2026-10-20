import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Fallback values matching official records
const FALLBACK_INGRESOS: Record<string, number[]> = {
  "2025": [
    211667972, 203140363, 204418961, 205323061, 200077286, 200227722,
    197096022, 197736597, 192642742, 190050340, 190625812, 205896275
  ],
  "2026": [
    203926938, 201609101, 203342553, 205968914, 206231552, 200453564, 198089841, 198089841, 0, 0, 0, 0
  ]
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anio = searchParams.get('anio');
  const format = searchParams.get('format'); // 'matrix' (default) or 'detailed'

  try {
    const supabase = await createClient();
    let query = (supabase as any)
      .from('ingresos_fam')
      .select('*')
      .order('anio', { ascending: true })
      .order('mes', { ascending: true });
    
    if (anio) {
      query = query.eq('anio', parseInt(anio, 10));
    }

    const { data: dbData, error } = await query;

    if (!error && dbData && dbData.length > 0) {
      if (format === 'detailed') {
        return NextResponse.json(dbData);
      }

      // Convert to matrix format: { "2025": [...], "2026": [...] }
      const matrix: Record<string, number[]> = {};
      dbData.forEach((row: any) => {
        const yKey = String(row.anio);
        if (!matrix[yKey]) matrix[yKey] = Array(12).fill(0);
        if (row.mes >= 1 && row.mes <= 12) {
          matrix[yKey][row.mes - 1] = Number(row.valor) || 0;
        }
      });

      if (!matrix['2025']) matrix['2025'] = FALLBACK_INGRESOS['2025'];
      if (!matrix['2026']) matrix['2026'] = FALLBACK_INGRESOS['2026'];

      return NextResponse.json(matrix);
    }
  } catch (err) {
    console.warn("Could not query Supabase directly for ingresos, falling back:", err);
  }

  // Fallback to Excel if file exists
  try {
    const possiblePaths = [
      path.join(process.cwd(), '1. Documentos Base', 'Ingresos FAM 2025-2026.xlsx'),
      "C:\\Users\\USER\\Desktop\\1. Antigravity\\5. IA-FAM\\1. Documentos Base\\Ingresos FAM 2025-2026.xlsx"
    ];
    const filePath = possiblePaths.find(p => fs.existsSync(p));

    if (filePath && fs.existsSync(filePath)) {
      const workbook = XLSX.readFile(filePath);
      const result: Record<string, number[]> = {
        "2025": Array(12).fill(0),
        "2026": Array(12).fill(0)
      };

      const MONTH_MAP: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };

      workbook.SheetNames.forEach(sheetName => {
        if (sheetName === '2025' || sheetName === '2026') {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any>(worksheet);

          rows.forEach(row => {
            const rawMes = String(row.MES || row.mes || '').trim().toLowerCase();
            const valor = Number(row.VALOR || row.valor || 0);

            if (rawMes && !rawMes.startsWith('total')) {
              const monthIndex = MONTH_MAP[rawMes];
              if (monthIndex !== undefined && monthIndex >= 0 && monthIndex < 12) {
                result[sheetName][monthIndex] = valor;
              }
            }
          });
        }
      });

      return NextResponse.json(result);
    }
  } catch (excelErr) {
    console.warn("Could not read Excel file:", excelErr);
  }

  return NextResponse.json(FALLBACK_INGRESOS);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();

    // Validate payload
    const anio = parseInt(body.anio, 10);
    const mes = parseInt(body.mes, 10);
    const valor = Number(body.valor);
    const concepto = body.concepto || 'Aportes Mensuales FAM';
    const observaciones = body.observaciones || null;
    const mes_nombre = body.mes_nombre || MONTH_NAMES[mes - 1] || `Mes ${mes}`;

    if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Año y mes válidos requeridos (mes entre 1 y 12)' }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from('ingresos_fam')
      .upsert({
        anio,
        mes,
        mes_nombre,
        valor,
        concepto,
        observaciones,
        updated_at: new Date().toISOString(),
        created_by: user?.id || null
      }, { onConflict: 'anio,mes' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ingreso: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al guardar ingreso' }, { status: 500 });
  }
}
