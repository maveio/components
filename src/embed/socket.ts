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
        const socketUrl = '__MAVE_ENDPOINT__/socket'.replace(/^http/, 'ws');
        Socket.instance.socket = new Phoenix(socketUrl, {
          params: {
            token,
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
