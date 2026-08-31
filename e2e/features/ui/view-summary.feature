# language: es
@ui
Característica: Ver resumen
  Para conocer mi situación financiera
  Como usuario autenticado
  Quiero ver el resumen del mes

  Escenario: Ver resumen del mes
    Dado que existe un usuario autenticado en el navegador
    Cuando abro la página de resumen
    Entonces veo las tarjetas de ingresos, gastos y ahorro
