import type { InvestigationCase } from './investigation';

export type ScenarioId = 'BUG-001' | 'BUG-002' | 'BUG-003';
export const initialCheckout = { quantity: 1, coupon: '', applied: false };
export const unitPrice = 500;
export const validCoupon = (value: string) => value.trim().toUpperCase() === 'TESTE10';

export function expectedCheckout(quantity: number, applied: boolean) {
  const subtotal = quantity * unitPrice;
  const discount = applied ? subtotal * .1 : 0;
  return { subtotal, discount, expected: subtotal - discount };
}
export function checkoutResult(quantity: number, applied: boolean) {
  const correct = expectedCheckout(quantity, applied);
  const observed = correct.subtotal - correct.discount / 2;
  return { ...correct, quantity, unitPrice, coupon: 'TESTE10', observed, difference: observed - correct.expected };
}

export const initialRegistration = { name: '', email: '', password: '', confirmation: '' };
export function registrationResult(data: typeof initialRegistration) {
  const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
  const errors = {
    name: !data.name.trim(),
    email: !data.email.trim(), // The demo checks presence but misses format.
    password: data.password.length < 8,
    confirmation: !data.confirmation || data.password !== data.confirmation,
  };
  const accepted = !Object.values(errors).some(Boolean);
  return { errors, accepted, reproduced: accepted && !emailFormat };
}

export const customerEndpoint = '/api/test-lab/investigation/customer';
export const demoCustomer = { name: 'Demo Customer', status: 'active', plan: 'Premium' } as const;
export function compareCustomer(api: typeof demoCustomer, status: number) {
  const ui = { ...api, status: 'inactive' };
  return { endpoint: customerEndpoint, method: 'GET', status, api, ui, field: 'status' };
}

type EvidenceData = {
  'BUG-001': ReturnType<typeof checkoutResult>;
  'BUG-002': { example: string; accepted: true };
  'BUG-003': ReturnType<typeof compareCustomer>;
};
export type Evidence = { [K in ScenarioId]: { id: string; scenario: K; at: string; data: EvidenceData[K] } }[ScenarioId];
export function captureEvidence<K extends ScenarioId>(scenario: K, data: EvidenceData[K]) {
  return { id: crypto.randomUUID(), scenario, at: new Date().toISOString(), data };
}

export const emptyDraft = { title: '', severity: '', priority: '', environment: '', module: '', steps: '', expected: '', observed: '', evidence: '' };
export type BugDraft = typeof emptyDraft;
export function exampleDraft(scenario: InvestigationCase, environment: string): BugDraft {
  return { ...emptyDraft, title: scenario.title, severity: scenario.severity, priority: scenario.priority,
    environment, module: scenario.module, steps: scenario.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    expected: scenario.expected, observed: scenario.observed };
}
