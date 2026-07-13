const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getMonthTransactions } = require('../utils/recurring');

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

  Object.values(porCategoria).forEach(cat => {
    cat.neto = Math.round((cat.gastos - cat.reembolsos) * 100) / 100;
  });

  const categoriasOrdenadas = Object.values(porCategoria)
    .filter(cat => cat.gastos > 0 || cat.reembolsos > 0)
    .sort((a, b) => b.neto - a.neto);

  const parentsWithChildren = [];
  const childMap = {};

  categoriasOrdenadas.forEach(cat => {
    if (cat.parentId) {
      if (!childMap[cat.parentId]) childMap[cat.parentId] = [];
      childMap[cat.parentId].push(cat);
    } else {
      parentsWithChildren.push({ ...cat, children: childMap[cat.categoryId] || [] });
    }
  });

  categoriasOrdenadas.filter(c => !c.parentId).forEach(cat => {
    if (!parentsWithChildren.find(p => p.categoryId === cat.categoryId)) {
      parentsWithChildren.push({ ...cat, children: childMap[cat.categoryId] || [] });
    }
  });

  Object.keys(childMap).forEach(parentId => {
    if (!parentsWithChildren.find(p => p.categoryId === parentId)) {
      const parentData = porCategoria[parentId];
      if (parentData) {
        parentsWithChildren.push({ ...parentData, children: childMap[parentId] });
      }
    }
  });

  res.json({
    month,
    ingresos: Math.round(totalIngresos * 100) / 100,
    gastos: Math.round(totalGastos * 100) / 100,
    reembolsos: Math.round(totalReembolsos * 100) / 100,
    gastosNetos: Math.round(gastosNetos * 100) / 100,
    ahorro: Math.round(ahorro * 100) / 100,
    fijos: Math.round(totalFijos * 100) / 100,
    variables: Math.round(totalVariables * 100) / 100,
    porCategoria: parentsWithChildren
  });
});

module.exports = router;
