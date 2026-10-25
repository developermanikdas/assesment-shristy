import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'recordings' });
    let objId: mongoose.mongo.BSON.ObjectId;
    try {
      objId = new mongoose.mongo.BSON.ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid audio id' }, { status: 400 });
    }

    const files = await bucket.find({ _id: objId }).toArray();
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const file = files[0];
    const downloadStream = bucket.openDownloadStream(objId);

    const chunks: Buffer[] = [];
    for await (const chunk of downloadStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
      headers: {
        'Content-Type': file.metadata?.contentType || 'audio/webm',
        'Content-Length': buffer.length.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    console.error('Audio streaming error:', err);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}
