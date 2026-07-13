# Changelog

## [1.5.2] - 2026-07-13

### Fixed
- Fly.io deployment 502 error: added `/health` endpoint for Fly proxy health checks
- Added `APP_URL` and `SESSION_SECRET` env vars to fly.toml for production CORS and session security

### Changed
- Service worker cache version bumped to v3

## [1.5.1] - 2026-07-12

### Added
- Foto de perfil guardada en el servidor (persiste entre sesiones, browsers y dispositivos)
- Endpoints `PUT /api/auth/photo` y `DELETE /api/auth/photo` para gestión de foto
- Campo `photo` en respuestas de login, registro y perfil
- Paso de tests en GitHub Actions antes del deploy (CI gate)

### Fixed
- Scroll en Estadísticas: al cambiar período (3m/6m/12m) o categoría en Tendencias, la página mantiene la posición del scroll
- Foto de perfil ahora persiste entre sesiones (antes se almacenaba en localStorage y se perdía al limpiar caché)

### Removed
- Sección "Por categoría" de la pantalla Inicio (ya existe en Estadísticas y Resumen)

## [1.5.0] - 2026-07-12

### Added
- Botón "Filtrar" en la pantalla Inicio, al lado derecho del título "Transacciones"
- Modal de filtros con: Tipo, Categoría, Clasificación, Texto libre, Monto mínimo/máximo, Fecha desde/hasta
- Botón "Limpiar" para resetear todos los filtros
- Badge "Filtrando" cuando hay filtros activos

### Changed
- Título de transacción ahora es opcional — si se deja vacío, se usa el nombre de la categoría o subcategoría seleccionada
- Backend valida menos campos obligatorios al crear transacción

## [1.4.0] - 2026-07-12

### Added
- Editar transacciones: click en una transacción abre modal con opciones Editar/Eliminar, el formulario se pre-llena con los datos actuales
- Campo "Clasificación" (Fijo/Variable) en el formulario de transacciones, con valor por defecto "Variable"
- Gráfico pie "Fijo vs Variable" en la página Resumen, mostrando la distribución de gastos fijos y variables
- Navegación a meses futuros en Resumen para prever gastos recurrentes

### Changed
- Nombres de meses ahora inician con mayúscula en todos los selectores (Inicio, Resumen, Estadísticas)
- Selector de mes más grande y con mayor peso de fuente (`clamp(1rem, 5vw, var(--font-xl))`)
- Modal de opciones de transacción ahora incluye botón "Editar" además de "Eliminar"

### Fixed
- El modal de transacción ahora muestra la clasificación (Fijo/Variable) en los detalles

## [1.3.0] - 2026-07-12

### Fixed
- Transacciones recurrentes NO impactaban en el resumen mensual (Home stat cards)
- Transacciones recurrentes NO impactaban en Estadísticas (resumen del mes y tendencias)
- Causa raíz: summary.js y trends.js solo filtraban por `fecha.startsWith(month)`, ignorando instancias recurrentes generadas on-the-fly

### Changed
- `generateRecurringInstances` extraído a `src/utils/recurring.js` compartido entre transactions, summary y trends
- Nueva función `getMonthTransactions()` centraliza la obtención de transacciones del mes (incluye recurrentes)
- Gráfico de barras en Estadísticas ya no incluye "Ahorro" — se muestra como dato separado debajo del gráfico

## [1.2.0] - 2026-07-12

### Added
- Frecuencia bimensual para transacciones recurrentes
- Checkbox "Indeterminado" para fecha fin de transacciones recurrentes
- Dos datepickers funcionales para fecha inicio y fin en el formulario recurrente

### Changed
- Símbolo de moneda cambiado de "Eur" a "€" en todo el frontend
- Números de stat cards más compactos para evitar desbordamiento
- Botón ojo ahora oculta/muestra tanto Ingresos como Ahorro

### Fixed
- Fecha fin de transacciones recurrentes no era clickeable (input nunca se agregaba al DOM)
- Estadísticas numéricas se desbordaban del contenedor en pantallas pequeñas

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
