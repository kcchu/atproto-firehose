#!/usr/bin/env node
import {
  AppBskyActorProfile,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyFeedPost,
} from '@atproto/api'
import { DidResolver } from '@atproto/identity'
import chalk from 'chalk'
import { program } from 'commander'
import indentString from 'indent-string'

import { ComAtprotoSyncSubscribeRepos, subscribeRepos } from '../src/index'

const didResolver = new DidResolver({})

program
  .name('af')
  .description('AT Protocol firehose')
  .argument('<host>', 'PDS/BGS host')
  .option('-a, --action <action...>', 'filter repo ops by action')
  .option('-p, --path <path>', 'filter repo ops by path prefix')
  .option('-r, --repo <repo>', "filter repo ops by repo name (i.e. user's DID)")
  .option('--no-resolve-did', 'do not resolve DID into handle')
  .option('--no-repo-ops', 'do not print repo ops')
  .option('--print-messages', 'print raw messages')
  .option('--no-color', 'do not colorize output')
  .option('-v, --verbose', 'display raw information')
  .action((host, options) => {
    const filter = (
      message: ComAtprotoSyncSubscribeRepos.Commit,
      repoOp: ComAtprotoSyncSubscribeRepos.RepoOp,
    ): boolean => {
      if (options.action && repoOp.action != options.action) {
        return false
      }
      if (options.path && !repoOp.path.startsWith(options.path)) {
        return false
      }
      return true
    }
    const s = subscribeRepos(`wss://${host}`, {
      decodeRepoOps: !options.noRepoOps,
      filter,
    })
    s.on('error', (error) => {
      console.error(error)
    })
    s.on('close', () => {
      console.log('closed')
    })
    s.on('message', (message) => {
      if (options.printMessages) {
        console.log('>', message)
      }
      if (!options.noRepoOps) {
        if (ComAtprotoSyncSubscribeRepos.isCommit(message)) {
          message.ops.forEach((op) => printRepoOp(message.repo, op))
        }
      }
    })
  })
program.parse()

const printRepoOp = async (
  repo: string,
  repoOp: ComAtprotoSyncSubscribeRepos.RepoOp,
) => {
  if (!repoOp.payload) {
    return
  }

  let s = `${await formatDid(repo)}\n`
  const payload = repoOp.payload as any
  switch (payload?.$type) {
    case 'app.bsky.feed.like':
      s += `    ${chalk.red('liked')} ${payload.subject?.uri ?? '<unknown>'}\n`
      break
    case 'app.bsky.feed.post':
      if (AppBskyFeedPost.isRecord(payload)) {
        if (payload.reply) {
          let replyTo
          if (payload.reply.parent) {
            replyTo = payload.reply.parent.uri
          } else {
            replyTo = payload.reply.root?.uri
          }
          if (replyTo) {
            s += chalk.gray(`    reply to ${replyTo}\n`)
          }
        }
        s += `${indentString(payload.text || '<empty post>', 4)}\n`
        if (payload.embed) {
          if (AppBskyEmbedImages.isMain(payload.embed)) {
            s += chalk.gray(
              `    embeded ${payload.embed.images.length} images\n`,
            )
          } else if (AppBskyEmbedExternal.isMain(payload.embed)) {
            s += chalk.gray(
              `    embeds [${payload.embed.external.title}](${payload.embed.external.uri})\n`,
            )
          } else if (AppBskyEmbedRecord.isMain(payload.embed)) {
            s += chalk.gray(`    quoted post ${payload.embed.record.uri}\n`)
          } else {
            s += chalk.gray(`    embeded <unknown>\n`)
          }
        }
      } else {
        s += chalk.bgRed(`    <invalid payload>\n`)
      }
      break
    case 'app.bsky.feed.repost':
      s += `    ${chalk.green('reposted')} ${
        payload.subject?.uri ?? chalk.bgRed('<unknown>')
      }\n`
      break
    case 'app.bsky.graph.follow':
      s += `    ${chalk.blue('followed')} ${
        payload.subject
          ? await formatDid(payload.subject)
          : chalk.bgRed('<unknown>')
      }\n`
      break
    case 'app.bsky.actor.profile':
      if (repoOp.action == 'create') {
        s += chalk.cyan('    created profile\n')
      } else {
        s += chalk.cyan('    updated profile\n')
      }
      if (AppBskyActorProfile.isRecord(payload)) {
        if (payload.displayName) {
          s += `${payload.displayName}\n`
        }
        if (payload.description) {
          s += `${indentString(payload.description, 4)}\n`
        }
      }
      break
    default:
      s += chalk.gray(`    ${repoOp.action} ${repoOp.path} ${payload.$type}\n`)
  }
  console.log(s)
}

const formatDid = async (did: string) => {
  let handle: string | undefined = undefined
  if (!program.opts().noResolveDid) {
    try {
      const doc = await didResolver.resolve(did)
      if (doc && doc.alsoKnownAs && doc.alsoKnownAs.length > 0) {
        handle = doc.alsoKnownAs[0].replace('at://', '@')
      }
    } catch (e) {}
  }
  if (handle) {
    return `${chalk.yellow(handle)} ${chalk.gray(`(${did})`)}`
  }
  return chalk.yellow(did)
}
