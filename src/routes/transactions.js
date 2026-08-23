const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateRecurringInstances, getMonthTransactions } = require('../utils/recurring');
const { roundCents } = require('../utils/income');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { month } = req.query;

  const transactions = db.findAll('transactions', userId);

  let filtered;
  if (month) {
    filtered = getMonthTransactions(transactions, month);
  } else {
    filtered = transactions;
  }

  filtered.sort((a, b) => {
    if (a.fecha === b.fecha) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return b.fecha.localeCompare(a.fecha);
  });

  res.json(filtered);
});

router.get('/recurring-total', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Parámetro month requerido' });
  }

  const transactions = db.findAll('transactions', userId);
  let totalRecurrentes = 0;
  const recurrentes = [];

  transactions.forEach(tx => {
    if (tx.recurrente && tx.frecuencia) {
      const instances = generateRecurringInstances(tx, month);
      if (instances.length > 0 && tx.tipo === 'expense') {
        totalRecurrentes += tx.monto;
        recurrentes.push({
          titulo: tx.titulo,
          monto: tx.monto,
          categoryId: tx.categoryId
        });
      }
    }
  });

  res.json({
    month,
    total: Math.round(totalRecurrentes * 100) / 100,
    items: recurrentes
  });
});

router.post('/', (req, res) => {
  const { tipo, monto, titulo, categoryId, fecha, recurrente, frecuencia, fechaFin, clasificacion, montoA, montoB } = req.body;

  if (!tipo || !['expense', 'income', 'refund'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser: expense, income o refund' });
  }

  if (monto === undefined || monto === null || typeof monto !== 'number' || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo' });
  }

  if ((tipo === 'expense' || tipo === 'refund') && !categoryId) {
    return res.status(400).json({ error: 'Los gastos y reembolsos requieren una categoría' });
  }

  if (recurrente && frecuencia && !['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'].includes(frecuencia)) {
    return res.status(400).json({ error: 'Frecuencia inválida. Debe ser: monthly, bimonthly, quarterly, semiannual o annual' });
  }

  if (tipo === 'income') {
    if (clasificacion && !['A', 'B', 'Mixto'].includes(clasificacion)) {
      return res.status(400).json({ error: 'Clasificación de ingreso inválida. Debe ser: A, B o Mixto' });
    }
    if (montoA !== undefined || montoB !== undefined) {
      if (clasificacion !== 'Mixto' || typeof montoA !== 'number' || typeof montoB !== 'number' || montoA < 0 || montoB < 0 || roundCents(montoA + montoB) !== roundCents(monto)) {
        return res.status(400).json({ error: 'Los importes A y B deben ser positivos o cero y sumar el monto total' });
      }
    } else if (clasificacion === 'Mixto') {
      return res.status(400).json({ error: 'La clasificación Mixto requiere importes A y B' });
    }
  } else if (montoA !== undefined || montoB !== undefined) {
    return res.status(400).json({ error: 'Los importes A y B solo son válidos para ingresos' });
  } else if (clasificacion && !['fijo', 'variable'].includes(clasificacion)) {
    return res.status(400).json({ error: 'Clasificación inválida. Debe ser: fijo o variable' });
  }

  const db = req.app.locals.db;
  const userId = req.session.userId;

  let categoryName = null;
  if (categoryId) {
    const category = db.findById('categories', categoryId, userId);
    if (!category) {
      return res.status(400).json({ error: 'Categoría no encontrada' });
    }
    categoryName = category.nombre;
  }

  const finalTitulo = (titulo && titulo.trim()) || categoryName || 'Sin título';

  const transaction = db.create('transactions', {
    userId,
    tipo,
    monto: Math.round(monto * 100) / 100,
    titulo: finalTitulo,
    categoryId: categoryId || null,
    fecha: fecha || new Date().toISOString().split('T')[0],
    recurrente: recurrente || false,
    frecuencia: recurrente ? (frecuencia || 'monthly') : null,
    fechaFin: recurrente ? (fechaFin || null) : null,
    clasificacion: tipo === 'income' ? (clasificacion || null) : (clasificacion || 'variable'),
    montoA: tipo === 'income' && clasificacion === 'Mixto' ? roundCents(montoA) : null,
    montoB: tipo === 'income' && clasificacion === 'Mixto' ? roundCents(montoB) : null
  }, userId);

  res.status(201).json(transaction);
});

router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { id } = req.params;
  const { tipo, monto, titulo, categoryId, fecha, recurrente, frecuencia, fechaFin, clasificacion, montoA, montoB } = req.body;

  const transaction = db.findById('transactions', id, userId);
  if (!transaction) {
    return res.status(404).json({ error: 'Transacción no encontrada' });
  }

  const updates = {};
  const finalTipo = tipo !== undefined ? tipo : transaction.tipo;
  if (montoA !== undefined || montoB !== undefined) {
    if (finalTipo !== 'income') return res.status(400).json({ error: 'Los importes A y B solo son válidos para ingresos' });
    const finalMonto = monto !== undefined ? monto : transaction.monto;
    const finalClasificacion = clasificacion !== undefined ? clasificacion : transaction.clasificacion;
    if (finalClasificacion !== 'Mixto' || typeof montoA !== 'number' || typeof montoB !== 'number' || montoA < 0 || montoB < 0 || roundCents(montoA + montoB) !== roundCents(finalMonto)) {
      return res.status(400).json({ error: 'Los importes A y B deben ser positivos o cero y sumar el monto total' });
    }
  }
  if (tipo !== undefined) {
    if (!['expense', 'income', 'refund'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }
    updates.tipo = tipo;
  }
  if (monto !== undefined) {
    if (typeof monto !== 'number' || monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }
    updates.monto = Math.round(monto * 100) / 100;
  }
  if (titulo !== undefined) updates.titulo = titulo.trim();
  if (categoryId !== undefined) updates.categoryId = categoryId || null;
  if (fecha !== undefined) updates.fecha = fecha;
  if (recurrente !== undefined) updates.recurrente = recurrente;
  if (recurrente === false) {
    updates.frecuencia = null;
    updates.fechaFin = null;
  } else if (frecuencia !== undefined) {
    if (frecuencia && !['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'].includes(frecuencia)) {
      return res.status(400).json({ error: 'Frecuencia inválida' });
    }
    updates.frecuencia = frecuencia || 'monthly';
  }
  if (recurrente !== false && fechaFin !== undefined) {
    updates.fechaFin = fechaFin || null;
  }
  if (clasificacion !== undefined) {
    const validClassifications = finalTipo === 'income' ? ['A', 'B', 'Mixto'] : ['fijo', 'variable'];
    if (!validClassifications.includes(clasificacion)) {
      return res.status(400).json({ error: 'Clasificación inválida' });
    }
    updates.clasificacion = clasificacion;
  }

  const finalCategoryId = updates.categoryId !== undefined ? updates.categoryId : transaction.categoryId;

  if (finalTipo === 'income' && clasificacion === undefined && !['A', 'B', 'Mixto', null, undefined].includes(transaction.clasificacion)) {
    updates.clasificacion = null;
  }
  if (finalTipo !== 'income' && transaction.tipo === 'income' && tipo !== undefined && clasificacion === undefined) {
    updates.clasificacion = 'variable';
    updates.montoA = null;
    updates.montoB = null;
  }
  if (finalTipo === 'income' && clasificacion !== 'Mixto' && clasificacion !== undefined) {
    updates.montoA = null;
    updates.montoB = null;
  }
  if (finalTipo === 'income' && (clasificacion === 'Mixto' || (clasificacion === undefined && transaction.clasificacion === 'Mixto')) && (montoA === undefined || montoB === undefined)) {
    if (clasificacion === 'Mixto' || monto !== undefined) {
      return res.status(400).json({ error: 'La clasificación Mixto requiere importes A y B' });
    }
  }

  if (finalTipo === 'income' && (clasificacion === 'Mixto' || (clasificacion === undefined && transaction.clasificacion === 'Mixto')) && montoA !== undefined && montoB !== undefined) {
    updates.montoA = roundCents(montoA);
    updates.montoB = roundCents(montoB);
  } else if (finalTipo !== 'income' && (montoA !== undefined || montoB !== undefined)) {
    return res.status(400).json({ error: 'Los importes A y B solo son válidos para ingresos' });
  }

  if ((finalTipo === 'expense' || finalTipo === 'refund') && !finalCategoryId) {
    return res.status(400).json({ error: 'Los gastos y reembolsos requieren una categoría' });
  }

  if (finalCategoryId) {
    const category = db.findById('categories', finalCategoryId, userId);
    if (!category) {
      return res.status(400).json({ error: 'Categoría no encontrada' });
    }
  }

  const updated = db.update('transactions', id, updates, userId);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { id } = req.params;

  const transaction = db.findById('transactions', id, userId);
  if (!transaction) {
    return res.status(404).json({ error: 'Transacción no encontrada' });
  }

  db.remove('transactions', id, userId);
  res.json({ ok: true });
});

module.exports = router;
