# language: es
@ui @statistics @regression
Característica: Estadísticas
  Para analizar mi evolución financiera
  Como usuario autenticado
  Quiero ver gráficos filtrables por período y categoría

  Escenario: Selector de período actualiza gráficos
    Dado que existe un usuario autenticado en el navegador
    Y que existe una categoría "Stats UI" por API
    Y que existen transacciones de los últimos 6 meses por API en "Stats UI"
    Cuando abro la página de estadísticas
    Entonces veo los botones de período
    Cuando selecciono el período "3 meses"
    Entonces el botón "3 meses" está activo
    Y se renderiza al menos un canvas
    Cuando selecciono el período "12 meses"
    Entonces el botón "12 meses" está activo
    Y se renderiza al menos un canvas
    Y no hay errores críticos en la consola

  Escenario: Filtro de categoría actualiza evolución
    Dado que existe un usuario autenticado en el navegador
    Y que existe una categoría "Stats UI" por API
    Y que existe una categoría "Otra UI" por API
    Y que existen transacciones de los últimos 6 meses por API en "Stats UI"
    Y que existen transacciones de los últimos 6 meses por API en "Otra UI"
    Cuando abro la página de estadísticas
    Y selecciono el filtro de categoría "Stats UI"
    Entonces el botón de filtro "Stats UI" está activo
    Y veo el gráfico en estadísticas "Evolución por categoría"
    Y no hay errores críticos en la consola

  Escenario: Todos los gráficos principales renderizan
    Dado que existe un usuario autenticado en el navegador
    Y que existe una categoría "Stats UI" por API
    Y que existen transacciones de ingreso y gasto de los últimos 6 meses por API en "Stats UI"
    Cuando abro la página de estadísticas
    Entonces veo el gráfico en estadísticas "Resumen del mes"
    Y veo el gráfico en estadísticas "Distribución del mes"
    Y veo el gráfico en estadísticas "Evolución del ahorro"
    Y veo el gráfico en estadísticas "Evolución por categoría"
    Y veo el gráfico en estadísticas "Evolución porcentual A vs B"
    Y veo el gráfico en estadísticas "IVA acumulado por mes"
    Y no hay errores críticos en la consola
