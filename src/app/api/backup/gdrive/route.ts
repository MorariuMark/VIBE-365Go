import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      filename,
      payload,
      folderId = '1cU8Oz6IifBX_r3h0adHynWqCpt9u0C12',
      accessToken,
    } = body;

    if (!payload || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing payload or filename' },
        { status: 400 }
      );
    }

    const token = accessToken || process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_TOKEN',
          message: 'Google Drive authorization token required to upload directly.',
        },
        { status: 401 }
      );
    }

    const fileContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

    const metadata = {
      name: filename,
      mimeType: 'application/json',
      parents: [folderId],
    };

    const boundary = '-------vibe365gdrivebackupboundary';

    const multipartRequestBody =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      `\r\n--${boundary}--`;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error?.message || 'Google Drive upload rejected',
          code: res.status,
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      fileId: data.id,
      name: data.name,
      filename,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
