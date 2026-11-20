export const apiCases = [
  ['ping', 'Disponibilidade', 'Health check'],
  ['list', 'Listar reservas', 'List bookings'],
  ['create', 'Criar reserva', 'Create booking'],
  ['get', 'Consultar reserva', 'Read booking'],
  ['put', 'Atualizar reserva', 'Update booking'],
  ['patch', 'Atualizar um campo', 'Patch one field'],
  ['delete', 'Excluir reserva', 'Delete booking'],
  ['missing', 'Consultar reserva excluída', 'Read deleted booking'],
  ['invalid', 'Enviar payload inválido', 'Send invalid payload'],
  ['e2e', 'Fluxo completo', 'End-to-end flow'],
] as const;

export type ApiCase = typeof apiCases[number][0];
export type Status = 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
export type Assertion = { id: string; label: string; expected: unknown; actual: unknown; pass: boolean };
export type Exchange = {
  method: string; path: string; timestamp: string; duration: number; status?: number;
  requestHeaders: Record<string, string>; responseHeaders: Record<string, string>;
  payload?: unknown; body?: unknown; error?: string;
};
export type Result = {
  id: string; scenario: string; timestamp: string; duration: number;
  status: Exclude<Status, 'IDLE' | 'RUNNING'>; assertions: Assertion[];
  exchanges: Exchange[]; logs: string[]; error?: string;
};

export function createRun(scenario: string) {
  const start = performance.now();
  const assertions: Assertion[] = [];
  const exchanges: Exchange[] = [];
  const logs: string[] = [];
  return {
    assertions, exchanges, logs,
    check(label: string, expected: unknown, actual: unknown, pass = Object.is(expected, actual)) {
      assertions.push({ id: 'A-' + (assertions.length + 1), label, expected, actual, pass });
      return pass;
    },
    finish(error?: string): Result {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      return {
        id, scenario, timestamp: new Date().toISOString(),
        duration: Math.round(performance.now() - start),
        status: error ? 'ERROR' : assertions.every((item) => item.pass) ? 'PASSED' : 'FAILED',
        assertions, exchanges, logs, error,
      };
    },
  };
}
