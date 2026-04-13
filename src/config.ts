const defaultConfig = {
  metrics: {
    enabled: true,
    endpoint: '__MAVE_METRICS_ENDPOINT__',
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

export type MaveConfig = typeof defaultConfig;

type PartialMaveConfig = Partial<{
  [K in keyof MaveConfig]: Partial<MaveConfig[K]>;
}>;

type MaveGlobal = typeof globalThis & {
  __maveComponentsConfig?: PartialMaveConfig;
};

function mergeConfig(target: MaveConfig, config: PartialMaveConfig | undefined) {
  if (!config) return target;

  for (const [section, values] of Object.entries(config) as [
    keyof MaveConfig,
    Partial<MaveConfig[keyof MaveConfig]> | undefined,
  ][]) {
    if (!values) continue;
    Object.assign(target[section], values);
  }

  return target;
}

function browserGlobal(): MaveGlobal | null {
  if (typeof globalThis === 'undefined') return null;
  return globalThis as MaveGlobal;
}

function readGlobalConfig(): PartialMaveConfig | undefined {
  return browserGlobal()?.__maveComponentsConfig;
}

function writeGlobalConfig(config: MaveConfig) {
  const globalObject = browserGlobal();
  if (!globalObject) return;

  globalObject.__maveComponentsConfig = {
    api: { ...config.api },
    cdn: { ...config.cdn },
    metrics: { ...config.metrics },
    upload: { ...config.upload },
  };
}

export const Config: MaveConfig = {
  api: { ...defaultConfig.api },
  cdn: { ...defaultConfig.cdn },
  metrics: { ...defaultConfig.metrics },
  upload: { ...defaultConfig.upload },
};

mergeConfig(Config, readGlobalConfig());

export function configureMave(config: PartialMaveConfig) {
  mergeConfig(Config, config);
  writeGlobalConfig(Config);
}

export const setConfig = configureMave;
