function roundCents(value) {
  return Math.round(value * 100) / 100;
}

function getIncomeBreakdown(transaction) {
  const total = Number(transaction.monto) || 0;

  if (transaction.clasificacion === 'A') {
    return { a: roundCents(total), b: 0 };
  }

  if (transaction.clasificacion === 'Mixto') {
    const a = Number(transaction.montoA);
    const b = Number(transaction.montoB);
    if (Number.isFinite(a) && Number.isFinite(b) && roundCents(a + b) === roundCents(total)) {
      return { a: roundCents(a), b: roundCents(b) };
    }
  }

  // Older income records have no classification; keep them reportable as B.
  return { a: 0, b: roundCents(total) };
}

function getIncomePercentages(a, b) {
  const total = roundCents(a + b);
  if (total === 0) return { porcentajeA: 0, porcentajeB: 0 };
  return {
    porcentajeA: Math.round((a / total) * 10000) / 100,
    porcentajeB: Math.round((b / total) * 10000) / 100
  };
}

// VAT only applies to the A part: full monto for 'A', montoA for 'Mixto', none otherwise.
function getIncomeIva(transaction) {
  const breakdown = getIncomeBreakdown(transaction);
  const ivaPorcentaje = Number(transaction.ivaPorcentaje);
  if (!Number.isFinite(ivaPorcentaje) || ivaPorcentaje <= 0 || breakdown.a <= 0) {
    return 0;
  }
  return roundCents(breakdown.a * ivaPorcentaje / 100);
}

module.exports = { getIncomeBreakdown, getIncomePercentages, getIncomeIva, roundCents };
