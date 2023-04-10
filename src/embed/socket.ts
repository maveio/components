import { Channel, Socket as Phoenix } from 'phoenix';

interface EmbedChannel {
  token: string;
  channel: Channel;
}

export default class Socket {
  private socket!: Phoenix;
  private channels: Array<EmbedChannel> = [];
  private static instance: Socket;

  private constructor() {
    return;
  }

  public static connect(token: string): Channel {
    if (!Socket.instance) {
      Socket.instance = new Socket();

      if (window) {
        const socketUrl = '__MAVE_SOCKET_ENDPOINT__';

        Socket.instance.socket = new Phoenix(socketUrl, {
          params: {
            token,
          },
          reconnectAfterMs: (tries: number) => {
            return [1000, 3000, 5000, 10000][tries - 1] || 10000;
          },
        });

        Socket.instance.socket.connect();
      }
    }

    const embedChannel = Socket.instance.channels.find((c) => c.token === token);
    if (embedChannel) {
      return embedChannel.channel;
    } else {
      const channel = Socket.instance.socket.channel(`embed:${token}`);
      channel.join();

      Socket.instance.channels.push({
        token,
        channel,
      });
      return channel;
    }
  }
}
