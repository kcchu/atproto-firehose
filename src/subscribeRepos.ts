import { ComAtprotoSyncSubscribeRepos } from '@atproto/api'
import { CarReader } from '@ipld/car/reader'
import { decode as cborDecode } from '@ipld/dag-cbor'

import { XrpcEventStreamClient } from './eventStream'

export interface RepoOp {
  repo: string
  path: string
  cid?: string
  action: ComAtprotoSyncSubscribeRepos.RepoOp['action']
  payload?: any
}

export interface SubscribeRepoOptions {
  decodeRepoOps?: boolean
  filter?: RepoOpsFilter
}

export interface RepoOpsFilter {
  repo?: string
  action?: ComAtprotoSyncSubscribeRepos.RepoOp['action'][]
  pathPrefix?: string
}

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
      if (
        options.decodeRepoOps &&
        (!options.filter?.repo || options.filter?.repo == message.repo)
      ) {
        const ops = await decodeOps(message, options.filter)
        ops.forEach((op) => {
          client.emit('repoOp', op)
        })
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
  filter: RepoOpsFilter | undefined,
): Promise<RepoOp[]> => {
  const decodedOps: RepoOp[] = []
  for (const op of message.ops) {
    if (filter?.action && !(op.action in filter.action)) {
      break
    }
    if (filter?.pathPrefix && !op.path.startsWith(filter.pathPrefix)) {
      break
    }
    const decodedOp: RepoOp = {
      repo: message.repo,
      action: op.action,
      path: op.path,
      cid: op.cid?.toString(),
    }
    if (op.action == 'create' || op.action == 'update') {
      const cr = await CarReader.fromBytes(message.blocks)
      if (op.cid) {
        const block = await cr.get(op.cid as any)
        if (block) {
          const payload = cborDecode(block.bytes)
          decodedOp.payload = payload
        }
      }
    }
    decodedOps.push(decodedOp)
  }
  return decodedOps
}
