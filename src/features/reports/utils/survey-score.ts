import type { SurveyQuestionOption } from '@/types/database.types'

/**
 * Compute a normalized 0-100 score for a survey answer based on question type.
 * Returns null for question types that don't contribute to numeric metrics (text).
 */
export function computeAnswerScore(
  answer: {
    rating?: number | null
    selected_options?: string[] | null
    text_value?: string | null
  },
  question: {
    question_type: string
    options?: SurveyQuestionOption[] | null
  }
): number | null {
  switch (question.question_type) {
    case 'rating':
      return answer.rating != null ? (answer.rating / 5) * 100 : null

    case 'single_select': {
      if (!answer.selected_options?.length || !question.options) return null
      const selected = question.options.find(
        (o) => o.value === answer.selected_options![0]
      )
      return selected?.score ?? null
    }

    case 'multi_select': {
      if (!answer.selected_options?.length || !question.options) return null
      const scores = answer.selected_options
        .map((v) => question.options!.find((o) => o.value === v)?.score)
        .filter((s): s is number => s != null)
      return scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null
    }

    case 'text':
      return null // Text questions don't contribute to numeric scores

    default:
      return null
  }
}
