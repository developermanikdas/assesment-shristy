/**
 * Grok API Integration Helper (xAI)
 *
 * Designed to automatically evaluate student answers (short answers and long essays)
 * against model answers and rubrics once the GROK_API_KEY is configured.
 */

export interface GrokEvaluationResult {
  score: number;
  maxScore: number;
  feedback: string;
  keyStrengths?: string[];
  areasForImprovement?: string[];
}

export async function evaluateAnswerWithGrok(params: {
  questionStem: string;
  studentAnswer: string;
  modelAnswer?: string;
  rubric?: Record<string, number> | any;
  maxMarks: number;
}): Promise<GrokEvaluationResult | null> {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!apiKey) {
    // Dormant until API key is provided
    return null;
  }

  try {
    const prompt = `You are an expert college examiner. Evaluate the student's written response accurately and constructively.

Question:
${params.questionStem}

${params.modelAnswer ? `Reference Model Answer:\n${params.modelAnswer}\n` : ''}
${params.rubric ? `Scoring Rubric:\n${JSON.stringify(params.rubric, null, 2)}\n` : ''}
Maximum Marks: ${params.maxMarks}

Student's Written Response:
"""
${params.studentAnswer}
"""

Provide your evaluation strictly as a valid JSON object with the following fields:
{
  "score": <number between 0 and ${params.maxMarks}>,
  "maxScore": ${params.maxMarks},
  "feedback": "<detailed constructive feedback on accuracy, completeness, and clarity>",
  "keyStrengths": ["<strength 1>", "<strength 2>"],
  "areasForImprovement": ["<area 1>", "<area 2>"]
}`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: 'You are an objective college academic examiner. Respond strictly with JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.error('Grok API evaluation error:', await res.text());
      return null;
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) return null;

    // Parse JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as GrokEvaluationResult;
    }
    return null;
  } catch (err) {
    console.error('Failed to run Grok evaluation:', err);
    return null;
  }
}

