# AT Protocol Event Stream Client

A library for subscribing [AT Protocol](https://atproto.com) event streams and a CLI for streaming
from Bluesky Social's firehose.

## Installation

```
npm install atproto-event-streams
```

or

```
yarn add atproto-event-streams
```
or

```
pnpm add atproto-event-streams
```

## Usage example

```typescript
import { subscribeRepos } from 'atproto-event-streams'

const client = subscribeRepos(`wss://bsky.social`, {
  decodeRepoOps: true,
  filter: {
    pathPrefix: 'app.bsky.feed.post',
  }
})
client.on('message', (m) => {
  console.log('Message:', message)
})
s.on('repoOp', (repoOp) => {
  console.log(repoOp)
})
```

## Firehose CLI

This project also provides a CLI tool for streaming from Bluesky Social's firehose.

```
npx atproto-event-streams bsky.social
```

<img src="screencast.svg" alt="Screencast">

List posts:

```
npx atproto-event-streams bsky.social -p app.bsky.feed.post
```

List likes:

```
npx atproto-event-streams bsky.social -p app.bsky.feed.like
```

List follows:

```
npx atproto-event-streams bsky.social -p app.bsky.graph.follow
```

List profile changes:

```
npx atproto-event-streams bsky.social -p app.bsky.actor.profile
```

## License

MIT