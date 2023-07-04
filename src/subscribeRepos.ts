import { ComAtprotoSyncSubscribeRepos } from '@atproto/api'
import { CarReader } from '@ipld/car/reader'
import { decode as cborDecode } from '@ipld/dag-cbor'

import { XrpcEventStreamClient } from './eventStream'

export { ComAtprotoSyncSubscribeRepos } from '@atproto/api'

export type SubscribeReposMessage =
  | ComAtprotoSyncSubscribeRepos.Commit
  | ComAtprotoSyncSubscribeRepos.Handle
  | ComAtprotoSyncSubscribeRepos.Info
  | ComAtprotoSyncSubscribeRepos.Migrate
  | ComAtprotoSyncSubscribeRepos.Tombstone

export interface SubscribeRepoOptions {
  decodeRepoOps?: boolean
  filter?: RepoOpsFilterFunc
}

export type RepoOpsFilterFunc = (
  message: ComAtprotoSyncSubscribeRepos.Commit,
  repoOp: ComAtprotoSyncSubscribeRepos.RepoOp,
) => boolean

export const subscribeRepos = (
  serviceUri: string,
  options: SubscribeRepoOptions,
) => {
  return new XrpcEventStreamClient(
    serviceUri,
    'com.atproto.sync.subscribeRepos',
    decoder(options),
  )
}

const decoder = (options: SubscribeRepoOptions) => {
  return async (client: XrpcEventStreamClient, message: unknown) => {
    if (ComAtprotoSyncSubscribeRepos.isCommit(message)) {
      if (options.decodeRepoOps) {
        await decodeOps(message, options.filter)
      }
      return message
    } else if (ComAtprotoSyncSubscribeRepos.isHandle(message)) {
      return message
    } else if (ComAtprotoSyncSubscribeRepos.isInfo(message)) {
      return message
    } else if (ComAtprotoSyncSubscribeRepos.isMigrate(message)) {
      return message
    } else if (ComAtprotoSyncSubscribeRepos.isTombstone(message)) {
      return message
    }
  }
}

const decodeOps = async (
  message: ComAtprotoSyncSubscribeRepos.Commit,
  filter: RepoOpsFilterFunc | undefined,
): Promise<void> => {
  for (const op of message.ops) {
    if (filter && !filter(message, op)) {
      continue
    }
    if (op.action == 'create' || op.action == 'update') {
      const cr = await CarReader.fromBytes(message.blocks)
      if (op.cid) {
        const block = await cr.get(op.cid as any)
        if (block) {
          const payload = cborDecode(block.bytes)
          op.payload = payload
        }
      }
    }
  }
}
