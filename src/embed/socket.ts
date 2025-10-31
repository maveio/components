import { Channel, Socket as Phoenix } from 'phoenix';

import { Config } from '../config';

interface EmbedChannel {
  token: string;
  channel: Channel;
  upload_id?: string;
  socket?: Phoenix;
}

export default class Socket {
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

    const socket = new Phoenix(Config.upload.socket, {
      params: {
        token,
      },
      reconnectAfterMs: (tries: number) => {
        return [1000, 3000, 5000, 10000][tries - 1] || 10000;
      },
    });

    socket.connect();

    const channel = socket.channel(`embed:${token}`);
    const embedChannel: EmbedChannel = {
      token,
      channel,
      socket,
    };

    channel.on('initiate', ({ upload_id }) => {
      embedChannel.upload_id = upload_id;
    });

    channel.join();

    return embedChannel;
  }

  public static async disconnect(embedChannel?: EmbedChannel) {
    if (!embedChannel) return;

    try {
      await embedChannel.channel.leave();
    } catch (_error) {
      // ignore channel leave errors
    }

    embedChannel.socket?.disconnect();
  }
}
