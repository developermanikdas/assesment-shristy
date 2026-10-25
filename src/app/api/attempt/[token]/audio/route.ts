import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ResponseModel } from '@/lib/models/Response';
import { Readable } from 'stream';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    const itemId = (formData.get('itemId') as string) || 'D09';

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    await connectDB();

    const attempt = await Attempt.findOne({ token });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'recordings' });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const uploadStream = bucket.openUploadStream(`recording-${attempt._id}-${itemId}.webm`, {
      metadata: {
        attemptId: attempt._id.toString(),
        itemId,
        contentType: file.type || 'audio/webm',
        uploadedAt: new Date(),
        sizeBytes: buffer.length,
      },
    });

    await new Promise((resolve, reject) => {
      stream.pipe(uploadStream).on('finish', resolve).on('error', reject);
    });

    const fileId = uploadStream.id.toString();

    // Link fileId to ResponseModel
    const now = new Date();
    await ResponseModel.findOneAndUpdate(
      { attemptId: attempt._id.toString(), itemId },
      {
        $set: {
          partId: 'D',
          sectionId: 'D',
          audioGridFsId: fileId,
          selected: '[Audio Note Uploaded]',
          skipped: false,
          lastSavedAt: now,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, audioId: fileId });
  } catch (err: any) {
    console.error('Audio upload error:', err);
    return NextResponse.json({ error: 'Failed to upload audio recording' }, { status: 500 });
  }
}
