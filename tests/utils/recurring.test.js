const { generateRecurringInstances } = require('../../src/utils/recurring');

describe('Recurring utilities', () => {
  const transaction = { id: 'quarterly', fecha: '2024-01-15', recurrente: true, frecuencia: 'quarterly' };

  it('generates quarterly instances every three months', () => {
    expect(generateRecurringInstances(transaction, '2024-04')).toHaveLength(1);
    expect(generateRecurringInstances(transaction, '2024-07')).toHaveLength(1);
    expect(generateRecurringInstances(transaction, '2024-02')).toHaveLength(0);
  });

  it('keeps bimonthly cadence at two months', () => {
    const bimonthly = { ...transaction, frecuencia: 'bimonthly' };
    expect(generateRecurringInstances(bimonthly, '2024-03')).toHaveLength(1);
    expect(generateRecurringInstances(bimonthly, '2024-04')).toHaveLength(0);
  });
});
