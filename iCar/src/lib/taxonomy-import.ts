import * as XLSX from 'xlsx';
import prisma from '@/lib/db';

export interface TaxonomyImportRow {
  make: string;
  model: string;
  variant: string;
  rowNumber: number;
}

export interface TaxonomyImportStats {
  rowsProcessed: number;
  rowsSkippedEmpty: number;
  duplicateRowsInFile: number;
  makesCreated: number;
  makesExisting: number;
  modelsCreated: number;
  modelsExisting: number;
  variantsCreated: number;
  variantsExisting: number;
  errors: { row: number; message: string }[];
}

const MAKE_HEADERS = ['make', 'brand', 'manufacturer'];
const MODEL_HEADERS = ['model'];
const VARIANT_HEADERS = ['variant', 'trim', 'version'];

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeMakeName(name: string): string {
  return name.trim().toLowerCase();
}

function rowKey(make: string, model: string, variant: string): string {
  return `${normalizeMakeName(make)}|${model.trim().toLowerCase()}|${variant.trim().toLowerCase()}`;
}

function findColumnKey(keys: string[], aliases: string[]): string | null {
  const normalized = keys.map((k) => k.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return keys[idx];
  }
  return null;
}

export function parseTaxonomyExcel(buffer: ArrayBuffer): TaxonomyImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The Excel file has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rawRows.length === 0) {
    throw new Error('The Excel sheet is empty');
  }

  const keys = Object.keys(rawRows[0] ?? {});
  const makeKey = findColumnKey(keys, MAKE_HEADERS);
  const modelKey = findColumnKey(keys, MODEL_HEADERS);
  const variantKey = findColumnKey(keys, VARIANT_HEADERS);

  if (!makeKey) {
    throw new Error(
      'Missing required column: Make (accepted headers: Make, Brand, Manufacturer)'
    );
  }

  const rows: TaxonomyImportRow[] = [];

  rawRows.forEach((raw, index) => {
    const make = normalizeCell(raw[makeKey]);
    const model = modelKey ? normalizeCell(raw[modelKey]) : '';
    const variant = variantKey ? normalizeCell(raw[variantKey]) : '';

    if (!make) return;

    rows.push({
      make,
      model,
      variant,
      rowNumber: index + 2,
    });
  });

  return rows;
}

export function buildTaxonomyTemplateBuffer(): Buffer {
  const data = [
    { Make: 'Toyota', Model: 'Camry', Variant: 'LE' },
    { Make: 'Toyota', Model: 'Camry', Variant: 'XLE' },
    { Make: 'Toyota', Model: 'Corolla', Variant: '' },
    { Make: 'BMW', Model: '3 Series', Variant: '330i' },
  ];
  const sheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Taxonomy');
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

export async function importTaxonomyFromRows(
  rows: TaxonomyImportRow[]
): Promise<TaxonomyImportStats> {
  const stats: TaxonomyImportStats = {
    rowsProcessed: 0,
    rowsSkippedEmpty: 0,
    duplicateRowsInFile: 0,
    makesCreated: 0,
    makesExisting: 0,
    modelsCreated: 0,
    modelsExisting: 0,
    variantsCreated: 0,
    variantsExisting: 0,
    errors: [],
  };

  const seenInFile = new Set<string>();

  for (const row of rows) {
    const makeName = normalizeCell(row.make);
    if (!makeName) {
      stats.rowsSkippedEmpty++;
      continue;
    }

    const modelName = normalizeCell(row.model);
    const variantName = normalizeCell(row.variant);
    const key = rowKey(makeName, modelName, variantName);

    if (seenInFile.has(key)) {
      stats.duplicateRowsInFile++;
      continue;
    }
    seenInFile.add(key);

    stats.rowsProcessed++;

    try {
      const normalizedMake = normalizeMakeName(makeName);
      const existingMake = await prisma.carMake.findUnique({
        where: { name: normalizedMake },
      });

      const makeRecord = await prisma.carMake.upsert({
        where: { name: normalizedMake },
        update: {},
        create: { name: normalizedMake },
      });

      if (existingMake) {
        stats.makesExisting++;
      } else {
        stats.makesCreated++;
      }

      if (!modelName) continue;

      const existingModel = await prisma.carModel.findUnique({
        where: {
          makeId_name: {
            makeId: makeRecord.id,
            name: modelName,
          },
        },
      });

      const modelRecord = await prisma.carModel.upsert({
        where: {
          makeId_name: {
            makeId: makeRecord.id,
            name: modelName,
          },
        },
        update: {},
        create: {
          name: modelName,
          makeId: makeRecord.id,
        },
      });

      if (existingModel) {
        stats.modelsExisting++;
      } else {
        stats.modelsCreated++;
      }

      if (!variantName) continue;

      const existingVariant = await prisma.carVariant.findUnique({
        where: {
          modelId_name: {
            modelId: modelRecord.id,
            name: variantName,
          },
        },
      });

      await prisma.carVariant.upsert({
        where: {
          modelId_name: {
            modelId: modelRecord.id,
            name: variantName,
          },
        },
        update: {},
        create: {
          name: variantName,
          modelId: modelRecord.id,
        },
      });

      if (existingVariant) {
        stats.variantsExisting++;
      } else {
        stats.variantsCreated++;
      }
    } catch (err) {
      stats.errors.push({
        row: row.rowNumber,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return stats;
}
