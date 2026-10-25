import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();

// Connect Mongoose directly for the script
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rbi_baseline';

async function seed() {
  console.log('--- Starting RBI Baseline Assessment Seeding ---');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  const filePath = path.resolve(process.cwd(), 'questions', 'rbi_baseline_questions.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Questions file not found at ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(rawData);

  const parts = data.parts;
  if (!parts || !Array.isArray(parts)) {
    throw new Error('Invalid JSON structure: missing parts array');
  }

  // Define collections directly
  const db = mongoose.connection.db!;
  const questionsColl = db.collection('questions');
  const setsColl = db.collection('sets');
  const answerKeysColl = db.collection('answer_keys');
  const adminsColl = db.collection('admins');

  // 1. Validate section counts as specified:
  // (B1 = 25, B2 = 25, B3 = 25, B4 = 40, C1 = 20, C3 MCQs = 15)
  const partB = parts.find((p: any) => p.id === 'B');
  const partC = parts.find((p: any) => p.id === 'C');

  if (!partB || !partC) {
    throw new Error('Missing Part B or Part C in questions JSON');
  }

  const b1 = partB.sections.find((s: any) => s.id === 'B1');
  const b2 = partB.sections.find((s: any) => s.id === 'B2');
  const b3 = partB.sections.find((s: any) => s.id === 'B3');
  const b4 = partB.sections.find((s: any) => s.id === 'B4');
  const c1 = partC.sections.find((s: any) => s.id === 'C1');
  const c3 = partC.sections.find((s: any) => s.id === 'C3');

  if (!b1 || b1.items.length !== 25) throw new Error(`B1 validation failed: expected 25 items, got ${b1?.items?.length}`);
  if (!b2 || b2.items.length !== 25) throw new Error(`B2 validation failed: expected 25 items, got ${b2?.items?.length}`);
  if (!b3 || b3.items.length !== 25) throw new Error(`B3 validation failed: expected 25 items, got ${b3?.items?.length}`);
  if (!b4 || b4.items.length !== 40) throw new Error(`B4 validation failed: expected 40 items, got ${b4?.items?.length}`);
  if (!c1 || c1.items.length !== 20) throw new Error(`C1 validation failed: expected 20 items, got ${c1?.items?.length}`);

  const c3MCQs = c3?.items.filter((i: any) => i.type === 'mcq') || [];
  if (c3MCQs.length !== 15) {
    throw new Error(`C3 MCQ validation failed: expected 15 MCQs, got ${c3MCQs.length}`);
  }

  console.log('✓ Section question counts validated successfully:');
  console.log('  - B1 (Quant): 25 questions');
  console.log('  - B2 (Reasoning): 25 questions');
  console.log('  - B3 (English): 25 questions');
  console.log('  - B4 (GA): 40 questions');
  console.log('  - C1 (ESI Obj): 20 questions');
  console.log('  - C3 MCQs: 15 questions');

  // 2. Clear old data or prepare upsert
  let totalQuestionsCount = 0;
  let totalSetsCount = 0;
  let totalAnswerKeysCount = 0;
  let globalOrder = 0;

  for (const part of parts) {
    for (const section of part.sections || []) {
      // Upsert Sets if any
      if (section.sets && typeof section.sets === 'object') {
        for (const [setId, setData] of Object.entries<any>(section.sets)) {
          await setsColl.updateOne(
            { id: setId },
            {
              $set: {
                id: setId,
                title: setData.title || setData.table?.title || '',
                text: setData.text,
                table: setData.table,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
          totalSetsCount++;
        }
      }

      // Upsert Items
      for (const item of section.items || []) {
        globalOrder++;
        const itemId = item.id;
        const ans = item.ans;
        const modelAnswer = item.model_answer;
        const rubric = item.rubric;

        // Upsert isolated AnswerKey if key/model/rubric exists
        if (ans !== undefined || modelAnswer !== undefined || rubric !== undefined) {
          await answerKeysColl.updateOne(
            { id: itemId },
            {
              $set: {
                id: itemId,
                ans: ans || null,
                model_answer: modelAnswer || null,
                rubric: rubric || null,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
          totalAnswerKeysCount++;
        }

        // Clean client question doc (ABSOLUTELY NO ANS, MODEL_ANSWER, OR RUBRIC)
        const cleanItem: Record<string, any> = {
          id: itemId,
          partId: part.id,
          sectionId: section.id,
          type: item.type,
          stem: item.stem,
          stem_hi: item.stem_hi,
          opts: item.opts,
          opts_hi: item.opts_hi,
          topic: item.topic,
          diff: item.diff,
          marks: item.marks,
          neg: item.neg,
          t: item.t,
          word_limit: item.word_limit,
          choices: item.choices,
          passage: item.passage,
          reason_prompt: item.reason_prompt,
          selection_rule: item.selection_rule,
          count: item.count,
          min: item.min,
          max: item.max,
          tag: item.tag,
          section: item.section,
          optional: !!item.optional,
          refresh: !!item.refresh,
          reverse_scored: !!item.reverse_scored,
          required: !!item.required,
          set: item.set,
          order: globalOrder,
          updatedAt: new Date(),
        };

        // Remove undefined fields
        Object.keys(cleanItem).forEach((k) => cleanItem[k] === undefined && delete cleanItem[k]);

        await questionsColl.updateOne(
          { id: itemId },
          { $set: cleanItem },
          { upsert: true }
        );
        totalQuestionsCount++;
      }
    }
  }

  console.log(`✓ Questions upserted: ${totalQuestionsCount}`);
  console.log(`✓ Sets upserted: ${totalSetsCount}`);
  console.log(`✓ Answer keys isolated in 'answer_keys': ${totalAnswerKeysCount}`);

  // Create default mentor admin if configured or not existing
  const adminEmail = process.env.ADMIN_EMAIL;
  const defaultPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && (defaultPassword || process.env.ADMIN_PASSWORD_HASH)) {
    const existingAdmin = await adminsColl.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = process.env.ADMIN_PASSWORD_HASH || (await bcrypt.hash(defaultPassword!, 10));
      await adminsColl.insertOne({
        email: adminEmail,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✓ Admin created for: ${adminEmail}`);
    } else {
      console.log(`✓ Admin already exists: ${adminEmail}`);
    }
  }

  // Create indexes
  await questionsColl.createIndex({ id: 1 }, { unique: true });
  await questionsColl.createIndex({ partId: 1, sectionId: 1 });
  await setsColl.createIndex({ id: 1 }, { unique: true });
  await answerKeysColl.createIndex({ id: 1 }, { unique: true });

  console.log('--- Seeding completed successfully! ---');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
