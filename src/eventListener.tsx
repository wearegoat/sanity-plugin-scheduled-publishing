import {SanityClient, Schema} from 'sanity'

export type createHandler = (
  args: {date: string; documentId: string},
  ctx: {client: SanityClient; schema: Schema}
) => void | Promise<void>
export type deleteHandler = (
  args: {documentId: string},
  ctx: {client: SanityClient; schema: Schema}
) => void | Promise<void>
export type publishHandler = (
  args: {documentId: string},
  ctx: {client: SanityClient; schema: Schema}
) => void | Promise<void>
export type updateHandler = (
  args: {date: string; documentId: string},
  ctx: {client: SanityClient; schema: Schema}
) => void | Promise<void>
