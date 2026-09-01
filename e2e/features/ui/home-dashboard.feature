# language: es
@ui @home @regression
Característica: Dashboard de inicio
  Para controlar mi situación mensual
  Como usuario autenticado
  Quiero que los stats reaccionen a transacciones y poder navegar meses

  Antecedentes:
    Dado que existe un usuario autenticado en el navegador
    Y que existe una categoría "Dashboard UI" por API

  Escenario: Los stats se actualizan tras ingreso, gasto y reembolso
    Cuando abro la página de inicio
    Y creo un ingreso "Sueldo" de 2000 con clasificación "A"
    Entonces el stat "Ingresos" muestra "2.000€"
    Y el stat "Ahorro" muestra "+2.000€"
    Cuando creo un gasto en "Dashboard UI" llamado "Compra" por 500
    Entonces el stat "Gastos" muestra "500€"
    Y el stat "Ahorro" muestra "+1.500€"
    Cuando creo un reembolso en "Dashboard UI" llamado "Reembolso" por 100
    Entonces el stat "Gastos" muestra "400€"
    Y el stat "Ahorro" muestra "+1.600€"
    Y no hay errores críticos en la consola

  Escenario: Navegación prev/next actualiza mes y lista
    Dado que existe una transacción "Mes pasado" de 100 del mes pasado por API en "Dashboard UI"
    Cuando abro la página de inicio
    Entonces no veo la transacción "Mes pasado"
    Cuando navego al mes anterior
    Entonces veo la transacción "Mes pasado"
    Y el título del mes cambia
    Cuando navego al mes siguiente
    Entonces no veo la transacción "Mes pasado"
    Y no hay errores críticos en la consola

  Escenario: Toggle de ojo oculta ingresos y ahorro
    Cuando abro la página de inicio
    Y creo un ingreso "Sueldo" de 2000 con clasificación "A"
    Y hago clic en el botón de ojo
    Entonces los valores de ingresos y ahorro aparecen difuminados
    Cuando hago clic en el botón de ojo
    Entonces los valores de ingresos y ahorro no aparecen difuminados
    Y no hay errores críticos en la consola
