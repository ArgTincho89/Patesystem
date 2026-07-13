function generateRecurringInstances(tx, month) {
  if (!tx.recurrente || !tx.frecuencia) return [];

  const startDate = new Date(tx.fecha);
  const [targetYear, targetMonth] = month.split('-').map(Number);
  const targetDate = new Date(targetYear, targetMonth - 1, startDate.getDate());

  if (targetDate < startDate) return [];

  if (tx.fechaFin) {
    const endDate = new Date(tx.fechaFin);
    if (targetDate > endDate) return [];
  }

  let match = false;
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const diffMonths = (targetYear - startYear) * 12 + (targetMonth - 1) - startMonth;

  if (tx.frecuencia === 'monthly') {
    match = diffMonths >= 0;
  } else if (tx.frecuencia === 'bimonthly') {
    match = diffMonths >= 0 && diffMonths % 2 === 0;
  } else if (tx.frecuencia === 'semiannual') {
    match = diffMonths >= 0 && diffMonths % 6 === 0;
  } else if (tx.frecuencia === 'annual') {
    match = diffMonths >= 0 && diffMonths % 12 === 0;
  }

  if (!match) return [];

  return [{
    ...tx,
    fecha: `${month}-${String(startDate.getDate()).padStart(2, '0')}`,
    isRecurringInstance: true,
    originalId: tx.id,
    id: `${tx.id}-${month}`
  }];
}

function getMonthTransactions(transactions, month) {
  const result = [];
  transactions.forEach(tx => {
    if (tx.fecha && tx.fecha.startsWith(month)) {
      result.push(tx);
    }
    if (tx.recurrente && tx.frecuencia) {
      const instances = generateRecurringInstances(tx, month);
      instances.forEach(inst => {
        if (!result.find(f => f.id === inst.id || f.id === inst.originalId)) {
          result.push(inst);
        }
      });
    }
  });
  return result;
}

module.exports = { generateRecurringInstances, getMonthTransactions };
