import { IExam, IExamSection, IExamItem } from './models/Exam';

export interface ParseExamResult {
  success: boolean;
  exam?: IExam;
  error?: string;
  stats?: {
    totalQuestions: number;
    mcqCount: number;
    shortAnswerCount: number;
    longAnswerCount: number;
    totalMarks: number;
    durationMinutes: number;
  };
}

export function parseAndPlanExamJson(rawJson: string | Record<string, any>): ParseExamResult {
  try {
    let data: any;
    if (typeof rawJson === 'string') {
      try {
        data = JSON.parse(rawJson);
      } catch (err: any) {
        return { success: false, error: `Invalid JSON syntax: ${err.message}` };
      }
    } else {
      data = rawJson;
    }

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'JSON payload must be an object or array of questions' };
    }

    // Check if user provided top-level array of questions directly
    let rawSections: any[] = [];
    let meta: any = data.meta || {};

    if (Array.isArray(data)) {
      rawSections = [{ id: 'SEC_1', title: 'Main Section', items: data }];
    } else if (Array.isArray(data.sections) && data.sections.length > 0) {
      rawSections = data.sections;
    } else if (Array.isArray(data.questions) && data.questions.length > 0) {
      rawSections = [{ id: 'SEC_1', title: data.title || 'General Section', items: data.questions }];
    } else if (Array.isArray(data.parts) && data.parts.length > 0) {
      // Flatten parts/sections if provided in RBI-style format
      data.parts.forEach((p: any) => {
        if (Array.isArray(p.sections)) {
          p.sections.forEach((s: any) => rawSections.push(s));
        } else if (Array.isArray(p.items)) {
          rawSections.push(p);
        }
      });
    } else {
      return {
        success: false,
        error: 'JSON must contain a "questions" array, a "sections" array, or be an array of questions.',
      };
    }

    const title =
      meta.title || data.title || data.name || 'Untitled Examination';
    const subject =
      meta.subject || data.subject || meta.topic || 'General Assessment';
    const instructions =
      meta.instructions ||
      data.instructions ||
      'Complete all questions within the allocated time. Answers are saved automatically.';

    let totalMarks = 0;
    let mcqCount = 0;
    let shortAnswerCount = 0;
    let longAnswerCount = 0;
    let calculatedMinutes = 0;

    let globalItemIndex = 1;

    const sections: IExamSection[] = rawSections.map((sec, secIdx) => {
      const secId = sec.id || `SEC_${secIdx + 1}`;
      const secTitle = sec.title || `Section ${secIdx + 1}`;
      const secDesc = sec.description || sec.instructions || '';

      const items: IExamItem[] = (sec.items || sec.questions || []).map((rawItem: any, itemIdx: number) => {
        const id = rawItem.id || `Q${globalItemIndex++}`;

        // Canonical type normalization
        const rawType = String(rawItem.type || '').toLowerCase().trim();
        let canonicalType: string = 'mcq';
        if (
          rawType.includes('mcq') ||
          rawType === 'select' ||
          rawType === 'multiple_choice' ||
          Array.isArray(rawItem.opts) ||
          Array.isArray(rawItem.options)
        ) {
          canonicalType = 'mcq';
          mcqCount++;
        } else if (
          rawType.includes('short') ||
          rawType === 'text' ||
          rawType === 'short_text' ||
          rawType === 'brief'
        ) {
          canonicalType = 'short_answer';
          shortAnswerCount++;
        } else if (
          rawType.includes('long') ||
          rawType.includes('essay') ||
          rawType.includes('case') ||
          rawType === 'choose_one_long_text'
        ) {
          canonicalType = rawType === 'choose_one_long_text' ? 'choose_one_long_text' : 'long_answer';
          longAnswerCount++;
        } else {
          canonicalType = 'short_answer';
          shortAnswerCount++;
        }

        // Marks planning: default 1 for MCQ, 5 for Short, 10 for Long
        let marks = Number(rawItem.marks ?? rawItem.points ?? rawItem.score);
        if (isNaN(marks) || marks <= 0) {
          marks = canonicalType === 'mcq' ? 1 : canonicalType === 'short_answer' ? 5 : 10;
        }
        totalMarks += marks;

        // Time planning per question (in minutes)
        let itemMinutes = Number(rawItem.time_minutes ?? rawItem.timeMin);
        if (isNaN(itemMinutes) || itemMinutes <= 0) {
          if (rawItem.expected_seconds && rawItem.expected_seconds > 0) {
            itemMinutes = rawItem.expected_seconds / 60;
          } else {
            // Default rule: 1.5 min for MCQ, 4 min for Short, 12 min for Long
            itemMinutes =
              canonicalType === 'mcq' ? 1.5 : canonicalType === 'short_answer' ? 4.0 : 12.0;
          }
        }
        calculatedMinutes += itemMinutes;

        // Normalize options
        const opts = rawItem.opts || rawItem.options || rawItem.choices;

        // Normalize answer
        const ans = rawItem.ans || rawItem.answer || rawItem.correct_answer || rawItem.key;

        // Normalize word limit
        let word_limit: [number, number] | undefined = undefined;
        if (Array.isArray(rawItem.word_limit) && rawItem.word_limit.length === 2) {
          word_limit = [Number(rawItem.word_limit[0]), Number(rawItem.word_limit[1])];
        } else if (rawItem.min_words && rawItem.max_words) {
          word_limit = [Number(rawItem.min_words), Number(rawItem.max_words)];
        } else if (canonicalType === 'short_answer') {
          word_limit = [50, 150];
        } else if (canonicalType === 'long_answer' || canonicalType === 'choose_one_long_text') {
          word_limit = [250, 600];
        }

        return {
          id: String(id),
          type: canonicalType,
          topic: rawItem.topic || rawItem.subject || subject,
          stem: rawItem.stem || rawItem.question || rawItem.text || '',
          stem_hi: rawItem.stem_hi,
          opts: Array.isArray(opts) ? opts.map(String) : undefined,
          opts_hi: Array.isArray(rawItem.opts_hi) ? rawItem.opts_hi.map(String) : undefined,
          ans: ans ? String(ans).trim() : undefined,
          explanation: rawItem.explanation || rawItem.solution,
          marks,
          neg: rawItem.neg !== undefined ? Number(rawItem.neg) : (data.negative_marking ?? meta.negative_marking ?? 0),
          expected_seconds: Math.round(itemMinutes * 60),
          word_limit,
          model_answer: rawItem.model_answer || rawItem.sample_answer || rawItem.rubric_answer,
          rubric: rawItem.rubric,
          passage: rawItem.passage,
          choices: rawItem.choices,
          sectionId: secId,
        };
      });

      // Section time planning
      let secTimeMin = Number(sec.time_minutes ?? sec.timeMin);
      if (isNaN(secTimeMin) || secTimeMin <= 0) {
        secTimeMin = Math.ceil(
          items.reduce((sum, item) => sum + (item.expected_seconds ? item.expected_seconds / 60 : 2), 0)
        );
      }

      return {
        id: secId,
        title: secTitle,
        description: secDesc,
        timeMinutes: Math.max(5, secTimeMin),
        items,
      };
    });

    // Auto-calculate final duration (with 5-minute buffer, rounded to 5 mins)
    let finalDurationMinutes = Number(meta.duration_minutes ?? data.duration_minutes ?? data.duration);
    if (isNaN(finalDurationMinutes) || finalDurationMinutes <= 0) {
      const plannedSum = sections.reduce((sum, s) => sum + s.timeMinutes, 0);
      // Add 5 min buffer and round up to multiple of 5
      finalDurationMinutes = Math.max(10, Math.ceil((plannedSum + 5) / 5) * 5);
    }

    const totalQuestions = mcqCount + shortAnswerCount + longAnswerCount;

    const examId =
      meta.exam_id ||
      data.exam_id ||
      data.id ||
      `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const exam: IExam = {
      examId,
      title,
      subject,
      version: meta.version || data.version || '1.0',
      instructions,
      durationMinutes: finalDurationMinutes,
      totalMarks,
      negativeMarking: meta.negative_marking ?? data.negative_marking ?? 0,
      confidenceTracking: meta.confidence_tracking !== false,
      confidenceTags: meta.confidence_tags || ['Sure', 'Maybe', 'Guess'],
      isDemo: !!(data.isDemo ?? meta.isDemo),
      sections,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      exam,
      stats: {
        totalQuestions,
        mcqCount,
        shortAnswerCount,
        longAnswerCount,
        totalMarks,
        durationMinutes: finalDurationMinutes,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Failed to parse exam JSON: ${err.message}` };
  }
}
