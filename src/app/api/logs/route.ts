import { NextResponse } from 'next/server';
import { getFullDefaultBackup } from '@/lib/initialData';

// Backend endpoint for immutable action audit trail
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const actionType = searchParams.get('actionType');

    const backup = getFullDefaultBackup();
    let logs = backup.actionLogs || [];

    if (actionType) {
      logs = logs.filter((l) => l.actionType === actionType);
    }

    const sliced = logs.slice(0, limit);

    return NextResponse.json({
      success: true,
      totalCount: logs.length,
      limit,
      data: sliced,
      timestamp: new Date().toISOString(),
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
    if (!body || !body.actionType || !body.entityTitle) {
      return NextResponse.json(
        { success: false, error: 'Invalid log entry: missing required fields' },
        { status: 400 }
      );
    }

    const logEntry = {
      id: body.id || `log_${Date.now()}`,
      timestamp: body.timestamp || new Date().toISOString(),
      actionType: body.actionType,
      entityId: body.entityId || 'unknown',
      entityTitle: body.entityTitle,
      details: body.details || '',
      metadata: body.metadata || {},
    };

    return NextResponse.json({
      success: true,
      message: 'Action log recorded successfully in backend audit store',
      log: logEntry,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
