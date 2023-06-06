import {useToast} from '@sanity/ui'
import pluralize from 'pluralize'
import React from 'react'
import ToastDescription from '../components/toastDescription/ToastDescription'
import {Schedule} from '../types'
import getErrorMessage from '../utils/getErrorMessage'
import useTimeZone from './useTimeZone'
import {useScheduleApi} from './useScheduleApi'
import {useConfig} from '../contexts/config'
import {useClient, useSchema} from 'sanity'

// Custom events
export enum ScheduleEvents {
  create = 'scheduleCreate',
  delete = 'scheduleDelete',
  deleteMultiple = 'scheduleDeleteMultiple',
  publish = 'schedulePublish',
  update = 'scheduleUpdate',
}

export type ScheduleCreateEvent = {
  date: string
  documentId: string
}

export type ScheduleDeleteEvent = {
  scheduleId: string
  documents: {
    documentId: string
    documentType?: string
  }[]
}

export type ScheduleDeleteMultipleEvent = {
  scheduleIds: string[]
}

export type SchedulePublishEvent = {
  scheduleId: string
}

export type ScheduleUpdateEvent = {
  date: string
  scheduleId: string
}

// Add our custom events to `WindowEventMap`, providing typing when using `addEventListener`
declare global {
  interface WindowEventMap {
    [ScheduleEvents.create]: CustomEvent<ScheduleCreateEvent>
    [ScheduleEvents.delete]: CustomEvent<ScheduleDeleteEvent>
    [ScheduleEvents.deleteMultiple]: CustomEvent<ScheduleDeleteMultipleEvent>
    [ScheduleEvents.publish]: CustomEvent<SchedulePublishEvent>
    [ScheduleEvents.update]: CustomEvent<ScheduleUpdateEvent>
  }
}

type UnpackCustomEventPayload<T> = T extends CustomEvent<infer U> ? U : never

// Proxy that generates type safe CustomEvents.
// We infer our CustomEvent's `detail` using `UnpackCustomEventPayload`
export const scheduleCustomEvent = <
  T extends ScheduleEvents,
  D extends UnpackCustomEventPayload<WindowEventMap[T]>
>(
  name: T,
  // override `detail` in `CustomEventInit` with our own custom payload
  payload: Omit<CustomEventInit<D>, 'detail'> & {
    detail: D
  }
): CustomEvent<D> => new CustomEvent(name, payload)

export default function useScheduleOperation() {
  const config = useConfig()
  const toast = useToast()
  const {formatDateTz} = useTimeZone()
  const api = useScheduleApi()
  const client = useClient({apiVersion: '2022-09-01'})
  const schema = useSchema()

  async function createSchedule({
    date,
    displayToast = true,
    documentId,
  }: {
    date: string
    displayToast?: boolean
    documentId: string
  }) {
    try {
      if (config.onCreate) {
        toast.push({
          closable: false,
          status: 'warning',
          duration: 3000,
          description: (
            <ToastDescription
              body={"Creating schedule. Don't close this tab or browser window."}
              title="Creating schedule"
            />
          ),
        })
      }
      await config.onCreate?.({date, documentId}, {client, schema})

      const data = await api.create({date, documentId})

      window.dispatchEvent(
        scheduleCustomEvent(ScheduleEvents.create, {
          detail: {
            date,
            documentId,
          },
        })
      )

      if (displayToast && data?.executeAt) {
        toast.push({
          closable: true,
          description: (
            <ToastDescription
              body={formatDateTz({
                date: new Date(data.executeAt),
                includeTimeZone: true,
                prefix: 'Publishing on ',
              })}
              title="Schedule created"
            />
          ),
          duration: 15000, // 15s
          status: 'success',
        })
      }
    } catch (err) {
      if (displayToast) {
        toast.push({
          closable: true,
          description: (
            <ToastDescription body={getErrorMessage(err)} title="Unable to create schedule" />
          ),
          duration: 15000, // 15s
          status: 'error',
        })
      }
    }
  }

  async function deleteSchedule({
    displayToast = true,
    schedule,
  }: {
    displayToast?: boolean
    schedule: Schedule
  }) {
    try {
      if (config.onDelete) {
        toast.push({
          closable: false,
          status: 'warning',
          duration: 3000,
          description: (
            <ToastDescription
              body={"Deleting schedule. Don't close this tab or browser window."}
              title="Deleting schedule"
            />
          ),
        })
      }
      await config.onDelete?.({documentId: schedule?.documents?.[0]?.documentId}, {client, schema})

      await api.delete({scheduleId: schedule?.id})

      window.dispatchEvent(
        scheduleCustomEvent(ScheduleEvents.delete, {
          detail: {
            scheduleId: schedule?.id,
            documents: schedule?.documents,
          },
        })
      )

      if (displayToast) {
        toast.push({
          closable: true,
          description: <ToastDescription title="Schedule deleted" />,
          status: 'success',
        })
      }
    } catch (err) {
      if (displayToast) {
        toast.push({
          closable: true,
          description: (
            <ToastDescription body={getErrorMessage(err)} title="Unable to delete schedule" />
          ),
          duration: 15000, // 15s
          status: 'error',
        })
      }
    }
  }

  async function deleteSchedules({
    displayToast = true,
    schedules,
  }: {
    displayToast?: boolean
    schedules: Schedule[]
  }) {
    try {
      const scheduleIds = schedules.map((schedule) => schedule.id)
      const response = await api.deleteMultiple({scheduleIds})

      const {fulfilledIds, rejectedReasons} = response.reduce<{
        fulfilledIds: string[]
        rejectedReasons: string[]
      }>(
        (acc, v, index) => {
          if (v.status === 'fulfilled') {
            acc.fulfilledIds.push(schedules[index].id)
          }

          if (v.status === 'rejected') {
            acc.rejectedReasons.push(`[${schedules[index].id}]: ${v.reason}`)
          }

          return acc
        },
        {fulfilledIds: [], rejectedReasons: []}
      )
      const numFulfilledIds = fulfilledIds.length
      const numRejectedReasons = rejectedReasons.length

      if (fulfilledIds?.length > 0) {
        window.dispatchEvent(
          scheduleCustomEvent(ScheduleEvents.deleteMultiple, {
            detail: {scheduleIds: fulfilledIds},
          })
        )
      }

      if (displayToast) {
        if (fulfilledIds?.length > 0) {
          toast.push({
            closable: true,
            description: (
              <ToastDescription title={`${pluralize('schedule', numFulfilledIds, true)} deleted`} />
            ),
            status: 'success',
          })
        }
        if (rejectedReasons?.length > 0) {
          toast.push({
            closable: true,
            description: (
              <ToastDescription
                body={rejectedReasons?.toString()}
                title={`Unable to delete ${pluralize('schedule', numRejectedReasons, true)}`}
              />
            ),
            duration: 15000, // 15s
            status: 'error',
          })
        }
      }
    } catch (err) {
      if (displayToast) {
        toast.push({
          closable: true,
          description: (
            <ToastDescription body={getErrorMessage(err)} title="Unable to delete schedules" />
          ),
          duration: 15000, // 15s
          status: 'error',
        })
      }
    }
  }

  async function publishSchedule({
    displayToast = true,
    schedule,
  }: {
    displayToast?: boolean
    schedule: Schedule
  }) {
    try {
      if (config.onPublish) {
        toast.push({
          closable: false,
          status: 'warning',
          duration: 3000,
          description: (
            <ToastDescription
              body={"Publishing schedule. Don't close this tab or browser window."}
              title="Publishing schedule"
            />
          ),
        })
      }
      await config.onPublish?.({documentId: schedule?.documents?.[0]?.documentId}, {client, schema})

      const scheduleId = schedule.id
      await api.publish({scheduleId})

      window.dispatchEvent(scheduleCustomEvent(ScheduleEvents.publish, {detail: {scheduleId}}))

      if (displayToast) {
        toast.push({
          closable: true,
          description: <ToastDescription title="Document published" />,
          status: 'success',
        })
      }
    } catch (err) {
      if (displayToast) {
        toast.push({
          closable: true,
          description: (
            <ToastDescription body={getErrorMessage(err)} title="Unable to publish schedule" />
          ),
          duration: 15000, // 15s
          status: 'error',
        })
      }
    }
  }

  async function updateSchedule({
    date,
    displayToast = true,
    schedule,
  }: {
    date: string
    displayToast?: boolean
    schedule: Schedule
  }) {
    try {
      if (config.onUpdate) {
        toast.push({
          closable: false,
          status: 'warning',
          duration: 3000,
          description: (
            <ToastDescription
              body={"Updating schedule. Don't close this tab or browser window."}
              title="Updating schedule"
            />
          ),
        })
      }
      // Needs documentId
      await config.onUpdate?.(
        {date, documentId: schedule.documents[0].documentId},
        {client, schema}
      )

      await api.update({documentSchedule: {executeAt: date}, scheduleId: schedule.id})

      window.dispatchEvent(
        scheduleCustomEvent(ScheduleEvents.update, {detail: {date, scheduleId: schedule.id}})
      )

      if (displayToast) {
        toast.push({
          closable: true,
          description: (
            <ToastDescription
              body={formatDateTz({
                date: new Date(date),
                includeTimeZone: true,
                prefix: 'Publishing on ',
              })}
              title="Schedule updated"
            />
          ),
          duration: 15000, // 15s
          status: 'success',
        })
      }
    } catch (err) {
      if (displayToast) {
        toast.push({
          closable: true,
          description: (
            <ToastDescription body={getErrorMessage(err)} title="Unable to update schedule" />
          ),
          duration: 15000, // 15s
          status: 'error',
        })
      }
    }
  }

  return {
    createSchedule,
    deleteSchedule,
    deleteSchedules,
    publishSchedule,
    updateSchedule,
  }
}
