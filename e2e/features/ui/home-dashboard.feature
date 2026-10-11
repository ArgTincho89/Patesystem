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

  Escenario: Favorito, controles y secciones analíticas en escritorio
    Cuando abro la página de inicio
    Y configuro el inicio en modo escritorio
    Entonces aparecen tres tarjetas principales
    Y las métricas tienen iconos decorativos y el botón dice Nueva transacción
    Y los controles de inicio aparecen en el orden requerido
    Cuando creo un ingreso "Favorito sueldo" de 2100 con clasificación "A"
    Y marco "Ahorro" como favorito en inicio
    Entonces el favorito de inicio es "Ahorro"
    Cuando marco "Ingresos" como favorito en inicio
    Entonces el favorito de inicio es "Ingresos"
    Y el icono del favorito corresponde a "Ingresos"
    Y el favorito refleja el importe actual de "Ingresos"
    Cuando navego al mes anterior
    Entonces el favorito refleja el importe actual de "Ingresos"
    Cuando navego al mes siguiente
    Entonces el favorito refleja el importe actual de "Ingresos"
    Cuando marco "Ingresos" como favorito en inicio
    Entonces no hay tarjeta de favorito en inicio
    Cuando marco "Gastos" como favorito en inicio
    Y hago clic en el botón de ojo
    Entonces los valores de ingresos y ahorro aparecen difuminados
    Y la privacidad indica importes ocultos
    Cuando hago clic en el botón de ojo
    Entonces la privacidad indica importes visibles
    Cuando abro la pestaña de analítica "Categorías"
    Entonces la pestaña de analítica "Categorías" queda seleccionada
    Cuando abro la pestaña de analítica "Evolución"
    Entonces la pestaña de analítica "Evolución" queda seleccionada
    Cuando abro la pestaña de analítica "Metas"
    Entonces la pestaña de analítica "Metas" queda seleccionada
    Cuando activo nueva transacción desde los controles de inicio
    Entonces el formulario de nueva transacción está abierto
    Cuando redimensiono el inicio al ancho de escritorio 768
    Entonces el diseño de inicio cabe en el viewport
    Y no hay errores críticos en la consola

  Escenario: Inicio móvil preservado en viewport estrecho
    Cuando abro la página de inicio
    Y mantengo el modo móvil en viewport 390
    Entonces el inicio móvil conserva su estructura
