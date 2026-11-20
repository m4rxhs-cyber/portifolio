const base = process.env.LAB_BASE_URL ?? 'http://127.0.0.1:3000';
const readOnly = ['ping', 'list', 'missing'];
const writes = ['create', 'get', 'put', 'patch', 'delete', 'invalid', 'e2e'];
const scenarios = process.argv.includes('--write') ? [...readOnly, ...writes] : readOnly;
for (const scenario of scenarios) {
  try {
    const response = await fetch(new URL('/api/test-lab', base), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario }),
      signal: AbortSignal.timeout(65_000),
    });
    const result = await response.json();
    console.log(scenario + ': ' + (result.status ?? response.status) + (result.error ? ' (' + result.error + ')' : ''));
    for (const step of result.exchanges ?? []) console.log('  ' + step.method + ' ' + step.path + ' → ' + (step.status ?? step.error) + ' · ' + step.duration + ' ms');
    if (!response.ok || result.status !== 'PASSED') process.exitCode = 1;
  } catch (error) {
    console.error(scenario + ': ' + error.message);
    process.exitCode = 1;
  }
}
