import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ResponseModel } from '@/lib/models/Response';
import { SaveAnswerSchema } from '@/lib/validations';
import { EXAM_SECTIONS } from '@/lib/exam-flow';

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

    // Enforce: Never start/save a section before the previous one is submitted
    const secIndex = EXAM_SECTIONS.findIndex((s) => s.id === sectionId);
    if (secIndex > 0) {
      const prevSec = EXAM_SECTIONS[secIndex - 1];
      const prevTimer = attempt.sectionTimers?.find((t) => t.sectionId === prevSec.id);
      if (!prevTimer || prevTimer.status !== 'submitted') {
        return NextResponse.json(
          { error: `Cannot save answers for section ${sectionId} before previous section ${prevSec.id} is submitted` },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // If attempt was not_started or startedAt missing, set startedAt and activate Part A
    if (attempt.status === 'not_started' || !attempt.startedAt) {
      attempt.status = 'in_progress';
      attempt.startedAt = now;
      const timerA = attempt.sectionTimers?.find((s) => s.sectionId === 'A');
      if (timerA && !timerA.startedAt) {
        timerA.startedAt = now;
        timerA.status = 'active';
      }
      await attempt.save();
    }

    const attemptId = attempt._id.toString();

    // Determine skipped status and enforce: skipped questions have NO confidence
    const isQuestionSkipped = !!skipped || selected === null || selected === undefined || selected === '';
    const finalConfidence = isQuestionSkipped ? undefined : (confidence || undefined);

    // Find existing response
    let response = await ResponseModel.findOne({ attemptId, itemId });

    if (!response) {
      // Create new response
      const changes = [];
      if (selected !== undefined || finalConfidence) {
        changes.push({ ts: now, value: selected, confidence: finalConfidence });
      }

      response = new ResponseModel({
        attemptId,
        itemId,
        partId,
        sectionId,
        selected: selected !== undefined ? selected : null,
        reason: reason || undefined,
        choiceIndex: choiceIndex !== undefined ? choiceIndex : undefined,
        confidence: finalConfidence,
        timeSpentSeconds: timeSpentSeconds || 0,
        visits: visits || 1,
        changes,
        firstAnswerTs: selected !== undefined && selected !== null && selected !== '' ? now : undefined,
        skipped: isQuestionSkipped,
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
      const confChanged = response.confidence !== finalConfidence;

      if (valueChanged || confChanged) {
        response.changes.push({
          ts: now,
          value: selected,
          confidence: finalConfidence,
        });
      }

      // Record first answer time if not yet set
      if (!response.firstAnswerTs && selected !== undefined && selected !== null && selected !== '') {
        response.firstAnswerTs = now;
      }

      // Preserve audio answer if already uploaded and no explicit override
      if (response.audioGridFsId && (selected === null || selected === undefined)) {
        response.selected = response.selected || '[Audio Note Uploaded]';
      } else if (selected !== undefined) {
        response.selected = selected;
      }

      if (reason !== undefined) response.reason = reason;
      if (choiceIndex !== undefined) response.choiceIndex = choiceIndex;

      // Confidence: must default to empty, never "Maybe". Skipped questions must have no confidence
      if (isQuestionSkipped) {
        response.confidence = undefined;
      } else if (confidence !== undefined) {
        response.confidence = confidence || undefined;
      }

      // Accumulate timeSpentSeconds (keep maximum recorded visible time)
      if (timeSpentSeconds !== undefined) {
        response.timeSpentSeconds = Math.max(response.timeSpentSeconds || 0, timeSpentSeconds);
      }

      if (visits !== undefined && visits > response.visits) response.visits = visits;
      response.skipped = isQuestionSkipped;
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
