# Changelog

## [1.1.0] - 2026-07-12

### Added
- Categorías jerárquicas: crear subcategorías vinculadas a categorías padre
- Selector de "Categoría padre" en el modal de crear/editar categoría
- Transacciones recurrentes: checkbox con frecuencia (mensual, semestral, anual)
- Sección "Gastos fijos" en Home mostrando total de gastos recurrentes del mes
- Página de Perfil: foto de usuario, cambiar email, cambiar contraseña, cerrar sesión
- Botón ojo para ocultar/mostrar ingresos en Home (preferencia guardada)
- Desplegable de versión y changelog en la pantalla de login

### Changed
- Login ahora usa nombre de usuario (no email)
- Registro sin categorías default — el usuario empieza vacío
- Renombrado "Tendencias" a "Estadísticas" con gráfico mensual individual
- Cards de estadísticas en Home ajustadas para no desbordar el contenedor
- UI mobile-first mejorada: áreas táctiles, spacing, safe areas

### Fixed
- Cookie session secure flag para localhost (rompía en HTTP)
- Overflow de tarjetas de gastos/ingresos/ahorro en Home

## [1.0.0] - 2026-07-12

### Added
- Sistema de autenticación completo (registro, login, logout, recuperación de contraseña)
- CRUD de categorías con colores personalizados
- CRUD de transacciones (gasto, ingreso, reembolso)
- Resumen mensual con gráfico donut y barras por categoría
- Tendencias multi-mes (3, 6, 12 meses) con gráficos de líneas
- Dashboard Home con selector de mes, estadísticas y lista de transacciones
- PWA con service worker para uso offline
- Tema oscuro con CSS custom properties
- Backend Express con JSON flat-file database
- Tests con Jest y Supertest
- Deploy automatizado con GitHub Actions a Fly.io
