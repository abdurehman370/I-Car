import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  buildTaxonomyTemplateBuffer,
  importTaxonomyFromRows,
  parseTaxonomyExcel,
} from '@/lib/taxonomy-import';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const buffer = buildTaxonomyTemplateBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="taxonomy-template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Taxonomy template error:', error);
    return NextResponse.json(
      { message: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: 'Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { message: 'Only Excel files (.xlsx, .xls) are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: 'File must be 10MB or smaller' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rows = parseTaxonomyExcel(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          message:
            'No valid rows found. Ensure the sheet has a Make column and at least one data row.',
        },
        { status: 400 }
      );
    }

    const stats = await importTaxonomyFromRows(rows);

    return NextResponse.json({
      success: true,
      message: 'Taxonomy import completed',
      stats,
    });
  } catch (error) {
    console.error('Taxonomy import error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to import taxonomy';
    return NextResponse.json({ message }, { status: 400 });
  }
}
