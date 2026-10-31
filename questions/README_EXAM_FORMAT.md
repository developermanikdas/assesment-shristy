# Assessment Exam JSON Format & Guide

This guide explains how to format JSON files for uploading and creating exams on this assessment platform.

---

## 1. Exam Structure Overview

An exam JSON consists of:
- **`meta`**: Exam title, subject, instructions, marks, and timing rules.
- **`sections`** (or flat **`questions`** list): The collection of MCQs, Short Answer questions, and Long Essay questions.

---

## 2. Flexible Schema Specification

### Metadata (`meta`)

| Field | Type | Description |
| :--- | :--- | :--- |
| `exam_id` | string | Unique identifier for the exam (e.g. `pathology_midterm_2026`). |
| `title` | string | Display title of the examination. |
| `subject` | string | Subject or module name (e.g. `Forensic Science`, `Commerce`, `Law`). |
| `instructions` | string | General instructions shown to the candidate before starting. |
| `total_marks` | number | Optional. If omitted, calculated as the sum of all question marks. |
| `duration_minutes` | number | Optional. If set to `null` or omitted, the platform calculates duration automatically. |
| `negative_marking` | number | Marks deducted for incorrect MCQs (e.g. `0.25`). Defaults to `0`. |
| `confidence_tracking` | boolean | Set to `true` to enable "Sure / Maybe / Guess" tagging on questions. |

### Auto-Timing Policy (`time_planning_policy`)

When `duration_minutes` is not explicitly set, the platform uses this policy:
- **MCQ**: 1 to 2 minutes (default: 1.5 min per question)
- **Short Answer**: 3 to 5 minutes (default: 4.0 min per question)
- **Long Answer / Essay**: 10 to 15 minutes (default: 12.0 min per question)
- **Buffer / Review Time**: 5 to 10 minutes

---

## 3. Question Item Formats

### Multiple Choice Question (`mcq`)
```json
{
  "id": "MCQ01",
  "type": "mcq",
  "topic": "Thanatology",
  "stem": "Which of the following is considered the earliest physical change occurring after death?",
  "opts": [
    "Primary muscular flaccidity",
    "Full rigor mortis",
    "Greenish discoloration of right iliac fossa",
    "Adipocere formation"
  ],
  "ans": "A",
  "marks": 1,
  "neg": 0.25,
  "expected_seconds": 60,
  "explanation": "Primary flaccidity occurs immediately upon somatic cessation."
}
```

### Short Answer Question (`short_answer` or `short_text`)
```json
{
  "id": "SA01",
  "type": "short_answer",
  "topic": "Crime Scene Investigation",
  "stem": "Explain the concept of 'Chain of Custody' in forensic evidence handling.",
  "marks": 5,
  "word_limit": [80, 180],
  "expected_seconds": 240,
  "model_answer": "Chain of custody is the chronological documentation...",
  "rubric": {
    "definition": 2,
    "handling_protocol": 1,
    "legal_significance": 2
  }
}
```

### Long Answer / Case Analysis Question (`long_answer` or `long_text`)
```json
{
  "id": "LA01",
  "type": "long_answer",
  "topic": "Forensic Ballistics",
  "stem": "Discuss the criteria to differentiate between entrance and exit firearm wounds and range of fire.",
  "marks": 10,
  "word_limit": [250, 600],
  "expected_seconds": 720,
  "model_answer": "Entrance wounds present with inverted edges, abrasion collar...",
  "rubric": {
    "entrance_vs_exit": 3,
    "range_of_fire": 3,
    "manner_of_death": 4
  }
}
```

---

## 4. Minimal Single-Array Format (Also Supported)

You can also provide a simple top-level list without sections:

```json
{
  "title": "Quick Class Quiz",
  "questions": [
    { "type": "mcq", "stem": "...", "opts": ["A", "B", "C", "D"], "ans": "B", "marks": 1 },
    { "type": "short_answer", "stem": "...", "model_answer": "...", "marks": 5 }
  ]
}
```
The platform automatically wraps this into a standard exam with auto-calculated duration.

