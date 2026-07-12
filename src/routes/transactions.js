const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateRecurringInstances, getMonthTransactions } = require('../utils/recurring');

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
  const { tipo, monto, titulo, categoryId, fecha, recurrente, frecuencia, fechaFin } = req.body;

  if (!tipo || !['expense', 'income', 'refund'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser: expense, income o refund' });
  }

  if (monto === undefined || monto === null || typeof monto !== 'number' || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo' });
  }

  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }

  if ((tipo === 'expense' || tipo === 'refund') && !categoryId) {
    return res.status(400).json({ error: 'Los gastos y reembolsos requieren una categoría' });
  }

  if (recurrente && frecuencia && !['monthly', 'bimonthly', 'semiannual', 'annual'].includes(frecuencia)) {
    return res.status(400).json({ error: 'Frecuencia inválida. Debe ser: monthly, bimonthly, semiannual o annual' });
  }

  const db = req.app.locals.db;
  const userId = req.session.userId;

  if (categoryId) {
    const category = db.findById('categories', categoryId, userId);
    if (!category) {
      return res.status(400).json({ error: 'Categoría no encontrada' });
    }
  }

  const transaction = db.create('transactions', {
    userId,
    tipo,
    monto: Math.round(monto * 100) / 100,
    titulo: titulo.trim(),
    categoryId: categoryId || null,
    fecha: fecha || new Date().toISOString().split('T')[0],
    recurrente: recurrente || false,
    frecuencia: recurrente ? (frecuencia || 'monthly') : null,
    fechaFin: recurrente ? (fechaFin || null) : null
  }, userId);

  res.status(201).json(transaction);
});

router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { id } = req.params;
  const { tipo, monto, titulo, categoryId, fecha, recurrente, frecuencia, fechaFin } = req.body;

  const transaction = db.findById('transactions', id, userId);
  if (!transaction) {
    return res.status(404).json({ error: 'Transacción no encontrada' });
  }

  const updates = {};
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
    updates.frecuencia = frecuencia || 'monthly';
  }
  if (recurrente !== false && fechaFin !== undefined) {
    updates.fechaFin = fechaFin || null;
  }

  const finalTipo = updates.tipo || transaction.tipo;
  const finalCategoryId = updates.categoryId !== undefined ? updates.categoryId : transaction.categoryId;

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
