import { EventEmitter } from 'node:events'

import { AtpBaseClient } from '@atproto/api'
import { cborDecodeMulti } from '@atproto/common'
import WebSocket from 'ws'

import { EventStreamError } from './errors'

export type Decoder = (
  client: XrpcEventStreamClient,
  message: unknown,
) => Promise<unknown>

const defaultDecoder = (client, message) => message

export class XrpcEventStreamClient extends EventEmitter {
  serviceUri: string
  nsid: string
  decoder: Decoder
  closed: boolean

  protected ws: WebSocket
  protected baseClient = new AtpBaseClient()

  constructor(serviceUri: string, nsid: string, decoder?: Decoder) {
    super()
    this.serviceUri = serviceUri
    this.nsid = nsid
    this.decoder = decoder ?? defaultDecoder
    this.connect()
  }

  private connect() {
    this.ws = new WebSocket(`${this.serviceUri}/xrpc/${this.nsid}`)
    this.ws.on('message', (data) => this.handleMessage(data))
    this.ws.on('error', (err) => this.handleError(err))
  }

  private async handleMessage(data: Uint8Array) {
    const [header, payload] = cborDecodeMulti(data) as any
    if (header['op'] == 1) {
      // regular message
      const t = header['t']
      if (t) {
        const lexUri = this.nsid
        const message = this.baseClient.xrpc.lex.assertValidXrpcMessage(
          lexUri,
          {
            $type: `${this.nsid}${t}`,
            ...payload,
          },
        )
        const decoded = await this.decoder(this, message)
        if (decoded) {
          this.emit('message', decoded)
        }
      }
    } else {
      // error message
      this.handleError(header['error'], header['message'])
    }
  }

  private handleError(error: Error | string, message?: string) {
    console.error(error)
    this.closed = true
    this.emit('error', new EventStreamError(error.toString(), message))
  }
}
