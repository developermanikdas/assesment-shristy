import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EXAM_SECTIONS } from '../src/lib/exam-flow';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rbi_baseline';

async function createDemo() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const attemptsColl = db.collection('attempts');

  const token = crypto.randomBytes(16).toString('hex');
  const pinHash = await bcrypt.hash('123456', 10);

  const sectionTimers = EXAM_SECTIONS.map((sec) => ({
    sectionId: sec.id,
    durationSeconds: sec.timeMin * 60,
    bufferUsedSeconds: 0,
    status: 'not_started',
  }));

  const doc = {
    token,
    pinHash,
    nickname: 'Priya Sharma',
    status: 'not_started',
    currentPartId: 'A',
    currentSectionId: 'A',
    pooledBufferTotalSeconds: 20 * 60,
    pooledBufferUsedSeconds: 0,
    sectionTimers,
    notepad: '',
    language: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await attemptsColl.insertOne(doc);
  console.log('DEMO_ATTEMPT_CREATED:');
  console.log(`Token: ${token}`);
  console.log(`PIN: 123456`);
  console.log(`Link: http://localhost:3000/take/${token}`);

  await mongoose.disconnect();
}

createDemo().catch(console.error);
