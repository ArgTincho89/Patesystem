# PateSystem E2E/API Test Suite

Suite de pruebas end-to-end y de API para PateSystem, construida con **Playwright + TypeScript**.

## Instalación

Desde la raíz del proyecto:

```bash
npm run test:e2e:install
```

O manualmente dentro de `e2e/`:

```bash
cd e2e
npm ci
```

## Cómo correr los tests

Desde la raíz del proyecto:

```bash
npm run test:e2e
```

Comandos disponibles dentro de `e2e/`:

```bash
npm test          # Toda la suite
npm run test:api  # Solo tests de API
npm run test:e2e  # Solo tests de UI
npm run report    # Abrir reporte HTML
npm run ui        # Modo UI de Playwright
```

## Convenciones de la suite

- **Page Object Model (POM)**: los selectores y acciones de UI viven en `pages/`.
- **Aislamiento de datos**: cada ejecución usa `DATA_DIR=.e2e-data` para no contaminar datos de desarrollo.
- **Usuario por test**: cada test crea su propio usuario de prueba y lo elimina al finalizar.
