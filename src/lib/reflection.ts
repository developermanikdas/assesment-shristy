export interface CandidateMCQ {
  qid: string;
  stem: string;
  opts?: string[];
  selected?: string | null;
  ans: string;
  confidence?: 'Sure' | 'Maybe' | 'Guess' | null;
  skipped: boolean;
}

export interface GeneratedReflectionItem {
  id: string; // D01a to D01f
  type: 'short_text';
  sourceQid: string;
  sourceStem?: string;
  sourceOptions?: string[];
  stem: string;
  sourceAnswer: string;
  sourceConfidence: string;
  category: 'correct_sure' | 'wrong_confident' | 'skipped_guess' | 'fallback';
}

/**
 * Server picks 6 earlier MCQs for reflection:
 * - 2 answered correctly with "Sure"
 * - 2 answered wrongly with "Sure" or "Maybe"
 * - 2 skipped or tagged "Guess"
 * If there are not enough of a kind, fill from the other categories.
 */
export function generateD01ReflectionItems(
  mcqs: CandidateMCQ[],
  stemTemplate: string = "You chose '{your_answer}' for question {qid}. In 1–2 lines, how did you arrive at this? If you guessed, say so."
): GeneratedReflectionItem[] {
  const correctSure: CandidateMCQ[] = [];
  const wrongConfident: CandidateMCQ[] = [];
  const skippedOrGuess: CandidateMCQ[] = [];
  const others: CandidateMCQ[] = [];

  for (const m of mcqs) {
    const isAttempted = !m.skipped && m.selected !== undefined && m.selected !== null && m.selected !== '';
    const isCorrect = isAttempted && String(m.selected).toUpperCase().trim() === String(m.ans).toUpperCase().trim();
    const isWrong = isAttempted && !isCorrect;

    if (isCorrect && m.confidence === 'Sure') {
      correctSure.push(m);
    } else if (isWrong && (m.confidence === 'Sure' || m.confidence === 'Maybe')) {
      wrongConfident.push(m);
    } else if (m.skipped || m.confidence === 'Guess' || !isAttempted) {
      skippedOrGuess.push(m);
    } else {
      others.push(m);
    }
  }

  const selectedMap = new Map<string, { mcq: CandidateMCQ; cat: GeneratedReflectionItem['category'] }>();

  function takeFromPool(pool: CandidateMCQ[], targetCount: number, cat: GeneratedReflectionItem['category']) {
    for (const item of pool) {
      if (selectedMap.size >= 6) break;
      if (!selectedMap.has(item.qid)) {
        selectedMap.set(item.qid, { mcq: item, cat });
        if (Array.from(selectedMap.values()).filter((x) => x.cat === cat).length >= targetCount) {
          break;
        }
      }
    }
  }

  // 1. Pick up to 2 from each primary bucket
  takeFromPool(correctSure, 2, 'correct_sure');
  takeFromPool(wrongConfident, 2, 'wrong_confident');
  takeFromPool(skippedOrGuess, 2, 'skipped_guess');

  // 2. If < 6, fill from remaining items in the three pools
  if (selectedMap.size < 6) takeFromPool(wrongConfident, 6, 'fallback');
  if (selectedMap.size < 6) takeFromPool(correctSure, 6, 'fallback');
  if (selectedMap.size < 6) takeFromPool(skippedOrGuess, 6, 'fallback');
  if (selectedMap.size < 6) takeFromPool(others, 6, 'fallback');

  const picked = Array.from(selectedMap.values()).slice(0, 6);
  const subIds = ['a', 'b', 'c', 'd', 'e', 'f'];

  return picked.map((entry, idx) => {
    const q = entry.mcq;
    const isAttempted = !q.skipped && q.selected !== undefined && q.selected !== null && q.selected !== '';
    const answerStr = isAttempted ? String(q.selected) : 'Skipped / No Answer';
    const confStr = q.confidence || (q.skipped ? 'Skipped' : 'None');

    let itemStem = stemTemplate
      .replace('{your_answer}', answerStr)
      .replace('{qid}', q.qid);

    if (!isAttempted) {
      itemStem = `You skipped question ${q.qid}. In 1–2 lines, what was your reasoning or why did you choose to skip it?`;
    }

    return {
      id: `D01${subIds[idx]}`,
      type: 'short_text',
      sourceQid: q.qid,
      sourceStem: q.stem,
      sourceOptions: q.opts,
      stem: itemStem,
      sourceAnswer: answerStr,
      sourceConfidence: confStr,
      category: entry.cat,
    };
  });
}

/**
 * Replace D01 template with concrete items D01a to D01f in a questions array
 */
export function expandQuestionsWithD01(
  rawQuestions: any[],
  d01Items: GeneratedReflectionItem[] | any[]
): any[] {
  const finalQuestions: any[] = [];
  const d01Template = rawQuestions.find((q) => q.id === 'D01');
  const d01Order = d01Template?.order || 100;

  for (const q of rawQuestions) {
    if (q.id === 'D01') {
      d01Items.forEach((sub: any, subIdx: number) => {
        const sourceQ = rawQuestions.find((orig) => orig.id === sub.sourceQid);
        finalQuestions.push({
          id: sub.id,
          partId: 'D',
          sectionId: 'D',
          type: 'short_text',
          stem: sub.stem,
          topic: 'explain-your-answer',
          sourceQid: sub.sourceQid,
          sourceStem: sub.sourceStem || sourceQ?.stem,
          sourceOptions: sub.sourceOptions || sourceQ?.opts,
          sourceAnswer: sub.sourceAnswer,
          sourceConfidence: sub.sourceConfidence,
          category: sub.category,
          order: d01Order + subIdx * 0.1,
        });
      });
    } else {
      finalQuestions.push(q);
    }
  }
  return finalQuestions;
}

