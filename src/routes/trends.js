const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.userId;
  const { from, to, categoryId } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Parámetros from y to requeridos (formato YYYY-MM)' });
  }

  const transactions = db.findAll('transactions', userId);
  const categories = db.findAll('categories', userId);

  const months = [];
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);

  let currentYear = fromYear;
  let currentMonth = fromMonth;

  while (currentYear < toYear || (currentYear === toYear && currentMonth <= toMonth)) {
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    months.push(monthStr);

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  const monthlyData = months.map(month => {
    const monthTx = transactions.filter(t => t.fecha && t.fecha.startsWith(month));

    let ingresos = 0;
    let gastos = 0;
    let reembolsos = 0;
    const porCategoria = {};

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

    monthTx.forEach(t => {
      if (t.tipo === 'income') {
        ingresos += t.monto;
      } else if (t.tipo === 'expense') {
        gastos += t.monto;
        if (porCategoria[t.categoryId]) {
          porCategoria[t.categoryId].gastos += t.monto;
        }
      } else if (t.tipo === 'refund') {
        reembolsos += t.monto;
        if (porCategoria[t.categoryId]) {
          porCategoria[t.categoryId].reembolsos += t.monto;
        }
      }
    });

    Object.values(porCategoria).forEach(cat => {
      cat.neto = Math.round((cat.gastos - cat.reembolsos) * 100) / 100;
    });

    const gastosNetos = gastos - reembolsos;

    return {
      month,
      ingresos: Math.round(ingresos * 100) / 100,
      gastos: Math.round(gastos * 100) / 100,
      reembolsos: Math.round(reembolsos * 100) / 100,
      gastosNetos: Math.round(gastosNetos * 100) / 100,
      ahorro: Math.round((ingresos - gastosNetos) * 100) / 100,
      porCategoria: Object.values(porCategoria).filter(c => c.gastos > 0 || c.reembolsos > 0)
    };
  });

  const categoryTrends = {};
  if (categoryId) {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    categoryTrends[categoryId] = {
      nombre: cat.nombre,
      color: cat.color,
      months: monthlyData.map(md => {
        const catData = md.porCategoria.find(c => c.categoryId === categoryId);
        return {
          month: md.month,
          gastos: catData ? catData.gastos : 0,
          reembolsos: catData ? catData.reembolsos : 0,
          neto: catData ? catData.neto : 0
        };
      })
    };
  } else {
    categories.forEach(cat => {
      const hasData = monthlyData.some(md =>
        md.porCategoria.some(c => c.categoryId === cat.id && (c.gastos > 0 || c.reembolsos > 0))
      );

      if (hasData) {
        categoryTrends[cat.id] = {
          nombre: cat.nombre,
          color: cat.color,
          months: monthlyData.map(md => {
            const catData = md.porCategoria.find(c => c.categoryId === cat.id);
            return {
              month: md.month,
              gastos: catData ? catData.gastos : 0,
              reembolsos: catData ? catData.reembolsos : 0,
              neto: catData ? catData.neto : 0
            };
          })
        };
      }
    });
  }

  res.json({
    from,
    to,
    monthlyData,
    categoryTrends
  });
});

module.exports = router;
