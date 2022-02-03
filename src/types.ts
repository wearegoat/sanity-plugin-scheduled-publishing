export type ScheduleState = 'cancelled' | 'scheduled' | 'succeeded'

export interface ScheduleFilter {
  state: ScheduleState
  title: string
}
export interface Schedule {
  author: string
  createdAt: string
  dataset: string
  // description: string // TODO: deprecate
  documents: {
    documentId: string
    ifRevisionId: string
  }[]
  executeAt: string
  id: string
  // name: string  // TODO: deprecate
  projectId: string
  state: ScheduleState
}

export interface ScheduleFormData {
  date: string
  time: string
}
