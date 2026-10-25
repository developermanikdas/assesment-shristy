import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ResponseModel } from '@/lib/models/Response';
import { SaveAnswerSchema } from '@/lib/validations';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();

    const parsed = SaveAnswerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      itemId,
      partId,
      sectionId,
      selected,
      reason,
      choiceIndex,
      confidence,
      timeSpentSeconds,
      visits,
      skipped,
      markedForReview,
      writingStats,
      clientEventId,
    } = parsed.data;

    await connectDB();

    const attempt = await Attempt.findOne({ token });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // If attempt was not_started, mark in_progress and set startedAt
    if (attempt.status === 'not_started') {
      attempt.status = 'in_progress';
      attempt.startedAt = new Date();
      await attempt.save();
    }

    const attemptId = attempt._id.toString();

    // Find existing response
    let response = await ResponseModel.findOne({ attemptId, itemId });

    const now = new Date();

    if (!response) {
      // Create new response
      const changes = [];
      if (selected !== undefined || confidence) {
        changes.push({ ts: now, value: selected, confidence: confidence || undefined });
      }

      response = new ResponseModel({
        attemptId,
        itemId,
        partId,
        sectionId,
        selected: selected !== undefined ? selected : null,
        reason: reason || undefined,
        choiceIndex: choiceIndex !== undefined ? choiceIndex : undefined,
        confidence: confidence || undefined,
        timeSpentSeconds: timeSpentSeconds || 0,
        visits: visits || 1,
        changes,
        firstAnswerTs: selected !== undefined ? now : undefined,
        skipped: !!skipped,
        markedForReview: !!markedForReview,
        writingStats: writingStats
          ? {
              wordCount: writingStats.wordCount,
              pasteCount: writingStats.pasteCount,
              editTimeline: (writingStats.editTimeline || []).map((t) => ({
                ts: new Date(t.ts),
                length: t.length,
              })),
            }
          : { wordCount: 0, pasteCount: 0, editTimeline: [] },
        lastSavedAt: now,
        clientEventId,
      });
    } else {
      // Check if value or confidence changed for the audit trail
      const valueChanged = JSON.stringify(response.selected) !== JSON.stringify(selected);
      const confChanged = response.confidence !== confidence;

      if (valueChanged || confChanged) {
        response.changes.push({
          ts: now,
          value: selected,
          confidence: confidence || undefined,
        });
      }

      // Record first answer time if not yet set
      if (!response.firstAnswerTs && selected !== undefined && selected !== null && selected !== '') {
        response.firstAnswerTs = now;
      }

      if (selected !== undefined) response.selected = selected;
      if (reason !== undefined) response.reason = reason;
      if (choiceIndex !== undefined) response.choiceIndex = choiceIndex;
      if (confidence !== undefined) response.confidence = confidence || undefined;
      if (timeSpentSeconds !== undefined) response.timeSpentSeconds = (response.timeSpentSeconds || 0) + timeSpentSeconds;
      if (visits !== undefined && visits > response.visits) response.visits = visits;
      if (skipped !== undefined) response.skipped = skipped;
      if (markedForReview !== undefined) response.markedForReview = markedForReview;
      if (writingStats) {
        response.writingStats = {
          wordCount: writingStats.wordCount,
          pasteCount: writingStats.pasteCount,
          editTimeline: (writingStats.editTimeline || []).map((t) => ({
            ts: new Date(t.ts),
            length: t.length,
          })),
        };
      }
      response.lastSavedAt = now;
      if (clientEventId) response.clientEventId = clientEventId;
    }

    await response.save();

    return NextResponse.json({
      success: true,
      lastSavedAt: response.lastSavedAt,
      clientEventId,
    });
  } catch (err: any) {
    console.error('Save answer error:', err);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
