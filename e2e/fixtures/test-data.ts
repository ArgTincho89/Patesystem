export const TestData = {
  users: {
    defaultPassword: 'Test1234!',
    shortPassword: '12345',
  },
  categories: {
    defaultColor: '#FF6B6B',
    parentName: 'Hogar',
    childName: 'Supermercado',
  },
  transactions: {
    expense: {
      titulo: 'Gasto de prueba',
      monto: 42.5,
      fecha: () => new Date().toISOString().split('T')[0],
    },
    income: {
      titulo: 'Ingreso de prueba',
      monto: 1500,
      clasificacion: 'A',
      fecha: () => new Date().toISOString().split('T')[0],
    },
  },
  goals: {
    ahorro: {
      tipo: 'ahorro_mensual',
      modo: 'monto_fijo',
      montoFijo: 500,
    },
  },
} as const;

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
