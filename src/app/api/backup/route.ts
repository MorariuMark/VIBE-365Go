import { NextResponse } from 'next/server';
import { getFullDefaultBackup } from '@/lib/initialData';

// Vercel serverless API endpoint for data backup and synchronization
export async function GET() {
  try {
    const backup = getFullDefaultBackup();
    return NextResponse.json({
      success: true,
      message: 'Initial state and template data retrieved successfully',
      data: backup,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.habits || !body.workoutLogs) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup structure' },
        { status: 400 }
      );
    }

    // When deployed with database (e.g. Vercel Postgres / Supabase), insert/upsert records here.
    return NextResponse.json({
      success: true,
      message: 'Backup received and validated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
