# AT Protocol Event Stream Client

A library for subscribing to [AT Protocol](https://atproto.com) Event Streams (aka Firehose) and a
CLI for streaming Bluesky Social events.

**Note:** This package is intended to be used with Node.js. Currently, it does not work in the
browser.

## Installation

```
npm install atproto-firehose
```

or

```
yarn add atproto-firehose
```
or

```
pnpm add atproto-firehose
```

## Usage example

```typescript
import {
  ComAtprotoSyncSubscribeRepos,
  SubscribeReposMessage,
  subscribeRepos,
} from 'atproto-firehose'

const client = subscribeRepos(`wss://bsky.network`, { decodeRepoOps: true })
client.on('message', (m: SubscribeReposMessage) => {
  if (ComAtprotoSyncSubscribeRepos.isCommit(m)) {
    m.ops.forEach((op) => {
      console.log(op.payload)
    })
  }
})
```

## Firehose CLI

This project also provides a CLI tool for streaming from Bluesky Social's firehose.

```
npx atproto-firehose bsky.network
```

<img src="screencast.svg" alt="Screencast">

List posts:

```
npx atproto-firehose bsky.network -p app.bsky.feed.post
```

List likes:

```
npx atproto-firehose bsky.network -p app.bsky.feed.like
```

List follows:

```
npx atproto-firehose bsky.network -p app.bsky.graph.follow
```

List profile changes:

```
npx atproto-firehose bsky.network -p app.bsky.actor.profile
```

## Author

[@kcchu.xyz](https://kcchu.xyz)

## License

MIT
