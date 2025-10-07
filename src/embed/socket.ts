import { Channel, Socket as Phoenix } from 'phoenix';

import { Config } from '../config';

interface EmbedChannel {
  token: string;
  channel: Channel;
  upload_id?: string;
}

export default class Socket {
  private socket!: Phoenix;
  private channels: Array<EmbedChannel> = [];
  private static instance: Socket;

  private constructor() {
    return;
  }

  public static connect(token: string): EmbedChannel {
    if (typeof window === 'undefined') {
      const noopChannel = {
        on: () => noopChannel,
        push: () => noopChannel,
        join: () => noopChannel,
        leave: () => Promise.resolve(),
        off: () => undefined,
      } as unknown as Channel;

      return {
        token,
        channel: noopChannel,
      };
    }

    if (!Socket.instance) {
      Socket.instance = new Socket();

      Socket.instance.socket = new Phoenix(Config.upload.socket, {
        params: {
          token,
        },
        reconnectAfterMs: (tries: number) => {
          return [1000, 3000, 5000, 10000][tries - 1] || 10000;
        },
      });

      Socket.instance.socket.connect();
    }
    const embedChannel = Socket.instance.channels.find((c) => c.token === token);
    if (embedChannel) {
      return embedChannel;
    } else {
      const channel = Socket.instance.socket.channel(`embed:${token}`);
      channel.join();


      const embedChannel = {
        token,
        channel
      };

      channel.on('initiate', ({ upload_id }) => {
        Socket.instance.channels.push({...embedChannel, upload_id});
      });

      return embedChannel;
    }
  }
}
