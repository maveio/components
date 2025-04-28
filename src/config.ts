export const Config = {
  metrics: {
    enabled: true,
    socket: '__MAVE_METRICS_SOCKET_ENDPOINT__',
  },
  upload: {
    socket: '__MAVE_SOCKET_ENDPOINT__',
    endpoint: '__MAVE_UPLOAD_ENDPOINT__',
  },
  api: {
    endpoint: '__MAVE_ENDPOINT__',
  },
  cdn: {
    endpoint: '__MAVE_CDN_ENDPOINT__',
  },
};

export function setConfig(config: Partial<typeof Config>) {
  Object.assign(Config, config);
}
