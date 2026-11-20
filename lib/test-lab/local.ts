import { createRun } from './model';

export const demoUser = 'qa-demo';
export const demoPassword = 'Demo-QA-2026';
export const authCases = [
  ['TC-AUTH-001', 'Login válido', 'Valid sign-in'],
  ['TC-AUTH-002', 'Senha inválida', 'Invalid password'],
  ['TC-AUTH-003', 'Usuário inexistente', 'Unknown user'],
  ['TC-AUTH-004', 'Campos obrigatórios', 'Required fields'],
  ['TC-AUTH-005', 'Logout', 'Sign out'],
] as const;

export function signIn(user: string, password: string) {
  if (!user.trim() || !password) return { authenticated: false, message: 'required' } as const;
  if (user !== demoUser || password !== demoPassword) return { authenticated: false, message: 'rejected' } as const;
  return { authenticated: true, message: 'signedIn' } as const;
}

export function signOut() {
  return { authenticated: false, message: 'signedOut' } as const;
}

export function runAuthentication(index: number) {
  const run = createRun(authCases[index][0]);
  const [user, password] = [
    [demoUser, demoPassword], [demoUser, 'wrong'], ['unknown', demoPassword], ['', ''], [demoUser, demoPassword],
  ][index];
  const login = signIn(user, password);
  run.logs.push('signIn');
  if (index === 4) {
    run.check('session', true, login.authenticated);
    const logout = signOut();
    run.logs.push('signOut');
    run.check('session', false, logout.authenticated);
    run.check('message', 'signedOut', logout.message);
  } else {
    run.check('session', index === 0, login.authenticated);
    run.check('message', ['signedIn', 'rejected', 'rejected', 'required'][index], login.message);
  }
  return run.finish();
}

export const bugCases = [
  ['BUG-001', 'Desconto ignorado no total', 'Discount omitted from total'],
  ['BUG-002', 'E-mail sem domínio aceito', 'Email without domain accepted'],
  ['BUG-003', 'Estoque zero aceita item', 'Zero stock accepts item'],
] as const;

export function reproduceBug(index: number, useExample: boolean) {
  const run = createRun(bugCases[index][0]);
  switch (index) {
    case 0: {
      const subtotal = 100;
      const discount = useExample ? 10 : 0;
      run.logs.push('calculate');
      run.check('total', subtotal - discount, subtotal);
      break;
    }
    case 1: {
      const email = useExample ? 'qa@' : 'qa@example.invalid';
      run.logs.push('submitForm');
      run.check('accepted', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), email.includes('@'));
      break;
    }
    case 2: {
      const stock = useExample ? 0 : 1;
      run.logs.push('addItem');
      run.check('accepted', stock > 0, stock >= 0);
      break;
    }
  }
  return run.finish();
}
