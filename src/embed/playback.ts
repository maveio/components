import { Config } from '../config';

export type PlaybackSession = {
  token: string;
  expires_at: number;
  media_base_url: string;
};

type CachedSession = {
  session?: PlaybackSession;
  promise?: Promise<PlaybackSession>;
};

const sessions = new Map<string, CachedSession>();
const EXPIRY_LEEWAY_SECONDS = 60;

function cacheKey(customerToken: string, embed: string) {
  return `${customerToken}\u0000${embed}`;
}

function sessionEndpoint() {
  return `${Config.api.endpoint.replace(/\/$/, '')}/playback/sessions`;
}

export async function playbackSession(
  customerToken: string,
  embed: string,
): Promise<PlaybackSession> {
  const key = cacheKey(customerToken, embed);
  const cached = sessions.get(key);
  const now = Math.floor(Date.now() / 1000);

  if (cached?.session && cached.session.expires_at > now + EXPIRY_LEEWAY_SECONDS) {
    return cached.session;
  }
  if (cached?.promise) return cached.promise;

  const promise = fetch(sessionEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embed }),
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Playback session request failed with status ${response.status}`);
      }

      const session = (await response.json()) as PlaybackSession;
      if (!session.token || !session.media_base_url || !session.expires_at) {
        throw new Error('Playback session response is incomplete');
      }

      sessions.set(key, { session });
      return session;
    })
    .catch((error) => {
      sessions.delete(key);
      throw error;
    });

  sessions.set(key, { promise });
  return promise;
}

export function clearPlaybackSessions() {
  sessions.clear();
}
