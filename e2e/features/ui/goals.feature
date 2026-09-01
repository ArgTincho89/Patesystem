# language: es
@ui @goals @regression
Característica: Metas financieras
  Para planificar mis finanzas
  Como usuario autenticado
  Quiero crear y eliminar metas

  Escenario: Crear meta de ahorro
    Dado que existe un usuario autenticado en el navegador
    Cuando abro la página de metas
    Y creo una meta de ahorro de 500€ para el mes actual
    Entonces veo la meta "Meta de ahorro mensual" en la lista
    Y no hay errores críticos en la consola

  Escenario: Crear límite de gasto por categoría
    Dado que existe un usuario autenticado en el navegador
    Y que existe una categoría "Metas UI" por API
    Cuando abro la página de metas
    Y creo un límite de gasto de 300€ para "Metas UI" en el mes actual
    Entonces veo la meta "Límite de gasto — Metas UI" en la lista
    Y no hay errores críticos en la consola

  Escenario: Eliminar meta
    Dado que existe un usuario autenticado en el navegador
    Cuando abro la página de metas
    Y creo una meta de ahorro de 500€ para el mes actual
    Y elimino la meta "Meta de ahorro mensual"
    Entonces no veo la meta "Meta de ahorro mensual" en la lista
    Y no hay errores críticos en la consola
