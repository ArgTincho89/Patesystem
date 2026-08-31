const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getMonthTransactions } = require('../utils/recurring');
const { getIncomeBreakdown, getIncomePercentages, getIncomeIva, roundCents } = require('../utils/income');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Parámetro month requerido (formato YYYY-MM)' });
  }

  const transactions = db.findAll('transactions', userId);
  const monthTransactions = getMonthTransactions(transactions, month);

  let totalIngresos = 0;
  let totalIngresosA = 0;
  let totalIngresosB = 0;
  let totalIvaAcumulado = 0;
  let totalGastos = 0;
  let totalReembolsos = 0;
  let totalFijos = 0;
  let totalVariables = 0;

  const porCategoria = {};

  const categories = db.findAll('categories', userId);
  const catMap = {};
  categories.forEach(c => catMap[c.id] = c);

  categories.forEach(cat => {
    porCategoria[cat.id] = {
      categoryId: cat.id,
      nombre: cat.nombre,
      color: cat.color,
      parentId: cat.parentId || null,
      gastos: 0,
      reembolsos: 0,
      neto: 0
    };
  });

  monthTransactions.forEach(t => {
    if (t.tipo === 'income') {
      totalIngresos += t.monto;
      const breakdown = getIncomeBreakdown(t);
      totalIngresosA += breakdown.a;
      totalIngresosB += breakdown.b;
      totalIvaAcumulado += getIncomeIva(t);
    } else if (t.tipo === 'expense') {
      totalGastos += t.monto;
      if (t.clasificacion === 'fijo') {
        totalFijos += t.monto;
      } else {
        totalVariables += t.monto;
      }
      if (porCategoria[t.categoryId]) {
        porCategoria[t.categoryId].gastos += t.monto;
      }
    } else if (t.tipo === 'refund') {
      totalReembolsos += t.monto;
      if (porCategoria[t.categoryId]) {
        porCategoria[t.categoryId].reembolsos += t.monto;
      }
    }
  });

  const gastosNetos = totalGastos - totalReembolsos;
  const ahorro = totalIngresos - gastosNetos;
  const incomePercentages = getIncomePercentages(totalIngresosA, totalIngresosB);

  Object.values(porCategoria).forEach(cat => {
    cat.neto = Math.round((cat.gastos - cat.reembolsos) * 100) / 100;
  });

  Object.values(porCategoria).forEach(cat => {
    if (!cat.parentId) {
      const children = Object.values(porCategoria).filter(c => c.parentId === cat.categoryId);
      children.forEach(child => {
        cat.gastos += child.gastos;
        cat.reembolsos += child.reembolsos;
        cat.neto = Math.round((cat.gastos - cat.reembolsos) * 100) / 100;
      });
    }
  });

  const categoriasOrdenadas = Object.values(porCategoria)
    .filter(cat => cat.gastos > 0 || cat.reembolsos > 0)
    .sort((a, b) => b.neto - a.neto);

  const childMap = {};
  categoriasOrdenadas.forEach(cat => {
    if (cat.parentId) {
      if (!childMap[cat.parentId]) childMap[cat.parentId] = [];
      childMap[cat.parentId].push(cat);
    }
  });

  const parentsWithChildren = [];
  categoriasOrdenadas.filter(c => !c.parentId).forEach(cat => {
    parentsWithChildren.push({ ...cat, children: childMap[cat.categoryId] || [] });
  });

  Object.keys(childMap).forEach(parentId => {
    if (!parentsWithChildren.find(p => p.categoryId === parentId)) {
      const parentData = porCategoria[parentId];
      if (parentData) {
        parentsWithChildren.push({ ...parentData, children: childMap[parentId] });
      }
    }
  });

  const goals = db.findAll('goals', userId).filter(g => g.meses && g.meses.includes(month));
  const metas = goals.map(g => {
    let meta = 0;
    if (g.modo === 'monto_fijo') {
      meta = g.montoFijo || 0;
    } else if (g.modo === 'porcentaje_salario') {
      meta = roundCents((g.salarioEstimado || 0) * (g.porcentaje || 0) / 100);
    } else if (g.modo === 'porcentaje_ingresos_dinamico') {
      meta = roundCents(totalIngresos * (g.porcentaje || 0) / 100);
    }

    let progresoActual = 0;
    if (g.tipo === 'ahorro_mensual') {
      progresoActual = ahorro;
    } else if (g.tipo === 'gasto_categoria') {
      const cat = porCategoria[g.categoryId];
      progresoActual = cat ? cat.neto : 0;
    } else if (g.tipo === 'gasto_general') {
      progresoActual = gastosNetos;
    }

    return {
      id: g.id,
      tipo: g.tipo,
      modo: g.modo,
      meta: Math.round(meta * 100) / 100,
      progresoActual: Math.round(progresoActual * 100) / 100,
      categoryId: g.categoryId || null,
      categoryName: g.categoryName || null
    };
  });

  res.json({
    month,
    ingresos: roundCents(totalIngresos),
    ingresosA: roundCents(totalIngresosA),
    ingresosB: roundCents(totalIngresosB),
    porcentajeA: incomePercentages.porcentajeA,
    porcentajeB: incomePercentages.porcentajeB,
    ingresosDesglose: {
      A: roundCents(totalIngresosA),
      B: roundCents(totalIngresosB),
      porcentajeA: incomePercentages.porcentajeA,
      porcentajeB: incomePercentages.porcentajeB
    },
    ivaAcumulado: roundCents(totalIvaAcumulado),
    gastos: Math.round(totalGastos * 100) / 100,
    reembolsos: Math.round(totalReembolsos * 100) / 100,
    gastosNetos: Math.round(gastosNetos * 100) / 100,
    ahorro: Math.round(ahorro * 100) / 100,
    fijos: Math.round(totalFijos * 100) / 100,
    variables: Math.round(totalVariables * 100) / 100,
    porCategoria: parentsWithChildren,
    metas
  });
});

const VALID_COMPARE = [1, 3, 6, 12];

function getCumulativeDaily(transactions, month) {
  const dailyTotals = {};
  let maxDay = 0;
  transactions.forEach(t => {
    if (t.tipo === 'expense' || t.tipo === 'refund') {
      const day = parseInt(t.fecha.split('-')[2], 10);
      const amount = t.tipo === 'refund' ? -t.monto : t.monto;
      dailyTotals[day] = (dailyTotals[day] || 0) + amount;
      if (day > maxDay) maxDay = day;
    }
  });

  if (maxDay === 0) return [];

  const result = [];
  let cumulative = 0;
  for (let d = 1; d <= maxDay; d++) {
    if (dailyTotals[d]) {
      cumulative += dailyTotals[d];
    }
    result.push({ day: d, cumulative: Math.round(cumulative * 100) / 100 });
  }
  return result;
}

function getMonthLabel(month) {
  const [year, m] = month.split('-');
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${names[parseInt(m) - 1]} ${year}`;
}

router.get('/burn-rate', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { month, compare } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Parámetro month requerido (formato YYYY-MM)' });
  }

  const compareNum = parseInt(compare, 10) || 1;
  if (!VALID_COMPARE.includes(compareNum)) {
    return res.status(400).json({ error: `Compare inválido. Debe ser: ${VALID_COMPARE.join(', ')}` });
  }

  const allTransactions = db.findAll('transactions', userId);
  const currentMonthTransactions = getMonthTransactions(allTransactions, month);
  const currentMonth = getCumulativeDaily(currentMonthTransactions, month);

  const [year, m] = month.split('-').map(Number);
  const historical = [];
  const historicalMonths = [];

  for (let i = 1; i <= compareNum; i++) {
    let histMonth = m - i;
    let histYear = year;
    while (histMonth <= 0) { histMonth += 12; histYear--; }
    const histMonthStr = `${histYear}-${String(histMonth).padStart(2, '0')}`;
    historicalMonths.push(histMonthStr);
    const histTx = getMonthTransactions(allTransactions, histMonthStr);
    const histDaily = getCumulativeDaily(histTx, histMonthStr);
    histDaily.forEach(d => {
      historical.push({ ...d, month: histMonthStr });
    });
  }

  const currentDay = new Date().getDate();
  const currentEntry = currentMonth.find(d => d.day === currentDay) || { cumulative: 0 };
  const currentSpent = currentEntry.cumulative;

  let avgHistorical = 0;
  if (historicalMonths.length > 0) {
    const monthTotals = historicalMonths.map(mStr => {
      const monthDaily = historical.filter(h => h.month === mStr);
      return monthDaily.length > 0 ? monthDaily[monthDaily.length - 1].cumulative : 0;
    });
    avgHistorical = monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length;
  }

  const percentage = avgHistorical > 0 ? Math.round(((currentSpent - avgHistorical) / avgHistorical) * 100) : 0;
  const direction = currentSpent > avgHistorical ? 'up' : currentSpent < avgHistorical ? 'down' : 'flat';

  let text;
  if (historicalMonths.length === 0) {
    text = 'Sin datos históricos';
  } else if (direction === 'up') {
    text = `+${Math.abs(percentage)}% vs promedio`;
  } else if (direction === 'down') {
    text = `-${Math.abs(percentage)}% vs promedio`;
  } else {
    text = 'Igual al promedio';
  }

  const labels = historicalMonths.map(getMonthLabel);

  res.json({
    month,
    currentDay,
    currentMonth,
    historical,
    indicator: { text, percentage, direction }
  });
});

module.exports = router;
