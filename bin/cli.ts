#!/bin/env node
import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyFeedPost,
} from '@atproto/api'
import { DidResolver } from '@atproto/identity'
import chalk from 'chalk'
import { program } from 'commander'

import { RepoOp, subscribeRepos } from '../src/subscribeRepos'

const didResolver = new DidResolver({})

program
  .name('af')
  .description('AT Protocol firehose')
  .argument('<host>', 'PDS/BGS host')
  .option('-a, --action <action...>', 'filter repo ops by action')
  .option('-p, --path <path>', 'filter repo ops by path prefix')
  .option('-r, --repo <repo>', "filter repo ops by repo name (i.e. user's DID)")
  .option('--no-resolve-did', 'do not resolve DID into handle')
  .option('--no-repo-ops', 'do not print decoded repo ops')
  .option('--print-messages', 'print raw messages')
  .option('--no-color', 'do not colorize output')
  .option('-v, --verbose', 'display raw information')
  .action((host, options) => {
    const filter = {
      action: options.action,
      pathPrefix: options.path,
    }
    const s = subscribeRepos(`wss://${host}`, {
      decodeRepoOps: !options.noRepoOps,
      filter,
    })
    s.on('error', (error) => {
      console.error(error)
    })
    if (options.printMessages) {
      s.on('message', (message) => {
        console.log('Message:', message)
      })
    }
    s.on('repoOp', (repoOp) => {
      printRepoOp(repoOp)
    })
  })
program.parse()

const printRepoOp = async (repoOp: RepoOp) => {
  let s = ''

  s += chalk.yellow(`${await resolveDid(repoOp.repo)}\n`)

  if (program.opts().verbose) {
    s += chalk.gray(`Path: ${repoOp.path}\n`)
    if (repoOp.payload) {
      s += chalk.gray(`${JSON.stringify(repoOp.payload)}\n`)
    }
  }

  if (repoOp.payload) {
    const payload = repoOp.payload
    switch (payload?.$type) {
      case 'app.bsky.feed.like':
        s += chalk.gray(`likes ${repoOp.payload.subject?.uri ?? '<unknown>'}\n`)
        break
      case 'app.bsky.feed.post':
        if (AppBskyFeedPost.isRecord(payload)) {
          if (payload.reply) {
            if (payload.reply.parent) {
              s += chalk.gray(
                `replying to ${payload.reply.parent.uri ?? '<unknown>'}\n`,
              )
            } else {
              s += chalk.gray(
                `replying to ${payload.reply.root?.uri ?? '<unknown>'}\n`,
              )
            }
          }
          s += chalk.white(`${payload.text || '<empty post>'}\n`)
          if (payload.embed) {
            if (AppBskyEmbedImages.isMain(payload.embed)) {
              s += chalk.gray(`embeds ${payload.embed.images.length} images\n`)
            } else if (AppBskyEmbedExternal.isMain(payload.embed)) {
              s += chalk.gray(
                `embeds [${payload.embed.uri}](${payload.embed.title})\n`,
              )
            } else if (AppBskyEmbedRecord.isMain(payload.embed)) {
              s += chalk.gray(`quotes post ${payload.embed.record.uri}\n`)
            } else {
              s += chalk.gray(`embeds <unknown>\n`)
            }
          }
        } else {
          s += chalk.gray(`<invalid payload>\n`)
        }
        break
      case 'app.bsky.feed.repost':
        s += chalk.gray(
          `reposts ${repoOp.payload.subject?.uri ?? '<unknown>'}\n`,
        )
        break
      case 'app.bsky.graph.follow':
        s += chalk.gray(`follows ${repoOp.payload.subject ?? '<unknown>'}\n`)
        break
      default:
        s += chalk.gray(`${repoOp.action} ${repoOp.path} ${payload.$type}\n`)
    }
  } else {
    s += chalk.gray(`${repoOp.action} ${repoOp.path}\n`)
  }

  console.log(s)
}

const resolveDid = async (did: string) => {
  if (program.opts().noResolveDid) {
    return did
  }
  try {
    const doc = await didResolver.resolve(did)
    if (doc && doc.alsoKnownAs && doc.alsoKnownAs.length > 0) {
      return doc.alsoKnownAs[0].replace('at://', '@')
    }
  } catch (e) {}
  return did
}
