export const endpoints = ['/api/test-lab/rest/customers', '/api/test-lab/rest/orders'] as const;
export const durations = [15, 30, 60, 300] as const;
export const profiles = ['constant', 'ramp', 'spike', 'sustained'] as const;
export type LoadProfile = typeof profiles[number];
export const scenarios = {
  smoke: { vus: 1, duration: 15, profile: 'constant' },
  load: { vus: 10, duration: 30, profile: 'constant' },
  stress: { vus: 50, duration: 60, profile: 'ramp' },
  spike: { vus: 100, duration: 30, profile: 'spike' },
  soak: { vus: 10, duration: 300, profile: 'sustained' },
  custom: { vus: 10, duration: 30, profile: 'constant' },
} as const satisfies Record<string, { vus: number; duration: number; profile: LoadProfile }>;
export type PerformanceScenario = keyof typeof scenarios;
export const scenarioIds = Object.keys(scenarios) as PerformanceScenario[];
export const limits = { p95: 500, p99: 800, errors: 1, throughput: 30 };
export const thresholdKeys = ['p95', 'p99', 'errors', 'throughput'] as const;
export type PerformanceThreshold = typeof thresholdKeys[number];
export type PerformanceExecutionStatus = 'waiting' | 'running' | 'completed' | 'interrupted' | 'failed';
export type PerformanceConfiguration = {
  scenario: PerformanceScenario;
  vus: number;
  duration: number;
  profile: LoadProfile;
  endpoint: typeof endpoints[number];
  thresholds: Record<PerformanceThreshold, number>;
};

export function preset(scenario: PerformanceScenario): PerformanceConfiguration {
  return { scenario, ...scenarios[scenario], endpoint: endpoints[0], thresholds: { ...limits } };
}

export function pacing({ scenario, profile }: PerformanceConfiguration) {
  return scenario === 'stress' || scenario === 'spike' || profile === 'ramp' || profile === 'spike' ? .1 : 1;
}

export function loadStages({ profile, duration, vus }: PerformanceConfiguration) {
  const baseline = Math.max(1, Math.round(vus / 10));
  if (profile === 'spike') {
    const peak = Math.round(duration * .2);
    const hold = Math.round(duration * .3);
    return [
      { seconds: hold, target: baseline },
      { seconds: 1, target: vus },
      { seconds: peak, target: vus },
      { seconds: 1, target: baseline },
      { seconds: duration - hold - peak - 2, target: baseline },
    ];
  }
  const increment = Math.floor(duration / 3);
  return [Math.max(1, Math.round(vus / 3)), Math.max(1, Math.round(vus * 2 / 3)), vus]
    .map((target, i) => ({ target, seconds: i === 2 ? duration - increment * 2 : increment }));
}

export function activeUsers(configuration: PerformanceConfiguration, seconds: number) {
  const { profile, vus } = configuration;
  if (profile !== 'ramp' && profile !== 'spike') return vus;
  let target = Math.max(1, Math.round(vus / 10));
  let remaining = seconds;
  for (const stage of loadStages(configuration)) {
    if (remaining <= stage.seconds) return Math.round(target + (stage.target - target) * remaining / stage.seconds);
    remaining -= stage.seconds;
    target = stage.target;
  }
  return target;
}

export function buildScript(configuration: PerformanceConfiguration, intro: string) {
  const { profile, vus, duration, thresholds, endpoint } = configuration;
  const execution = profile === 'ramp' || profile === 'spike'
    ? { executor: 'ramping-vus', startVUs: Math.max(1, Math.round(vus / 10)),
      stages: loadStages(configuration).map(({ seconds, target }) => ({ duration: seconds + 's', target })), gracefulRampDown: '0s' }
    : { executor: 'constant-vus', vus, duration: duration + 's' };
  const options = {
    scenarios: { [configuration.scenario]: { ...execution, gracefulStop: '0s' } },
    thresholds: {
      http_req_duration: [`p(95)<${thresholds.p95}`, `p(99)<${thresholds.p99}`],
      http_req_failed: [`rate<${+(thresholds.errors / 100).toFixed(8)}`],
      http_reqs: [`rate>${thresholds.throughput}`],
    },
  };
  return [
    '// ' + intro, "import http from 'k6/http';", "import { check, sleep } from 'k6';", '',
    'export const options = ' + JSON.stringify(options, null, 2) + ';', '',
    'const baseUrl = __ENV.BASE_URL;', 'const workspace = __ENV.DEMO_WORKSPACE;',
    "if (!baseUrl || !workspace) throw new Error('Set BASE_URL and DEMO_WORKSPACE');", '',
    'export default function () {',
    `  const response = http.get(baseUrl.replace(/\\/$/, '') + '${endpoint}', {`,
    "    headers: { 'x-demo-workspace': workspace },",
    '    redirects: 0,', '  });', "  check(response, { 'status is 200': (r) => r.status === 200 });",
    `  sleep(${pacing(configuration)});`, '}', '',
  ].join('\n');
}

export function thresholdPass(key: PerformanceThreshold, value: number, limit: number) {
  return key === 'throughput' ? value > limit : value < limit;
}
