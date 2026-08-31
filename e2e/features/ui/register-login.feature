# language: es
@ui
Característica: Registro y login
  Para acceder a PateSystem
  Como usuario nuevo
  Quiero registrarme e iniciar sesión

  Escenario: Registro + login
    Dado que existe un usuario registrado
    Cuando abro la página de login
    Y inicio sesión con el usuario de prueba
    Entonces veo la barra de navegación
