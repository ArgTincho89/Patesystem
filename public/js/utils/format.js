function formatearEuro(cantidad) {
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Math.abs(cantidad));
  return `${cantidad < 0 ? '-' : ''}${formatted}€`;
}

function parseFecha(fechaStr) {
  const [year, month, day] = fechaStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatFechaLarga(fechaStr) {
  const date = parseFecha(fechaStr);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function formatFechaCorta(fechaStr) {
  const date = parseFecha(fechaStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function addMonths(monthStr, delta) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1 + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function groupTransactionsByDate(transactions) {
  const groups = {};
  transactions.forEach(t => {
    if (!groups[t.fecha]) groups[t.fecha] = [];
    groups[t.fecha].push(t);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([fecha, items]) => ({ fecha, items }));
}
