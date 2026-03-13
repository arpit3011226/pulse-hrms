export function getCourseStatusColor(status: string) {
  switch (status) {
    case 'published': return 'text-emerald-600'
    case 'draft': return 'text-gray-500'
    case 'archived': return 'text-amber-600'
    default: return 'text-gray-500'
  }
}

export function getEnrollmentStatusColor(status: string) {
  switch (status) {
    case 'enrolled': return 'text-blue-600'
    case 'in_progress': return 'text-indigo-600'
    case 'completed': return 'text-emerald-600'
    case 'dropped': return 'text-gray-500'
    case 'failed': return 'text-red-600'
    default: return 'text-gray-500'
  }
}

export function getAttemptStatusColor(status: string) {
  switch (status) {
    case 'in_progress': return 'text-blue-600'
    case 'passed': return 'text-emerald-600'
    case 'failed': return 'text-red-600'
    default: return 'text-gray-500'
  }
}

export function getCourseModeLabel(mode: string) {
  switch (mode) {
    case 'online': return 'Online'
    case 'classroom': return 'Classroom'
    case 'blended': return 'Blended'
    case 'self_paced': return 'Self-Paced'
    default: return mode
  }
}
