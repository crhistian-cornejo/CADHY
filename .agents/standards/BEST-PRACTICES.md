# Best Practices - CADHY

## Pre-Commit Checklist

**OBLIGATORIO antes de cualquier commit:**

1. **Lint & Format** - Ejecutar y arreglar TODOS los errores:
   ```bash
   bun lint:fix
   bun lint
   ```

2. **TypeScript** - Sin errores de tipos:
   ```bash
   bun typecheck
   ```

3. **Tests** - Todos deben pasar:
   ```bash
   bun test
   ```

4. **Rust** (si hay cambios en crates/):
   ```bash
   cargo fmt --all
   cargo clippy --workspace -- -D warnings
   cargo test --workspace
   ```

## Comandos Rápidos

```bash
# Verificar todo antes de commit
bun lint:fix && bun lint && bun typecheck && bun test

# Solo Rust
cd crates && cargo fmt && cargo clippy && cargo test

# Build completo local
bun build
```

## Reglas de Código

### TypeScript/React
- NO usar `any` - usar tipos específicos o `unknown`
- NO usar index como key en arrays - usar id único
- NO dejar imports sin usar
- NO dejar variables sin usar
- SÍ usar `const` siempre que sea posible
- SÍ usar hooks correctamente (useEffect dependencies)

### Rust
- `cargo fmt` antes de cada commit
- Sin warnings de clippy
- Tests para nuevas funcionalidades

### Commits
- Mensaje descriptivo en inglés
- Formato: `type: description`
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `chore:` mantenimiento
  - `docs:` documentación
  - `refactor:` refactorización
  - `test:` tests

## CI/CD

El CI verifica automáticamente:
- Lint (Biome) - solo errores, warnings se permiten
- TypeScript types
- Tests unitarios
- Rust fmt + clippy + tests
- Security audit

**Si CI falla, NO hacer merge.**

## Estructura de Archivos

```
.agents/           # Documentación para agentes AI
  ARCHITECTURE.md  # Arquitectura del proyecto
  CONVENTIONS.md   # Convenciones de código
  CORE-RULES.md    # Reglas fundamentales
  BEST-PRACTICES.md # Este archivo
  RELEASE-PROCESS.md # Proceso de release
  SHADCN-V2.md     # Guía de componentes shadcn

.keys/             # Claves y secretos (NO commitear)
crates/            # Código Rust
apps/              # Aplicaciones (desktop, web)
packages/          # Paquetes compartidos TypeScript
```

## Release Process

1. Asegurarse de que CI pase en `main`
2. Actualizar versión en:
   - `package.json` (raíz)
   - `apps/desktop/package.json`
   - `apps/desktop/src-tauri/tauri.conf.json`
   - `apps/desktop/src-tauri/Cargo.toml`
3. Actualizar `CHANGELOG.md`
4. Crear tag: `git tag -a v0.x.x -m "Release v0.x.x"`
5. Push: `git push origin main --tags`
6. El workflow de release se dispara automáticamente

## Debugging

### Bindings y compatibilidad OCCT
- **macOS/Windows**: Usan OCCT v7.9.2 (full features)
- **Linux (Ubuntu 22.04)**: Usa OCCT v7.5 del sistema
  - Algunas funciones no disponibles: `write_gltf`, `write_glb`, `write_obj`, `write_ply`
  - Estas funciones retornan `false` en lugar de fallar la compilación
  - Ver `CADHY_HAS_MODERN_EXPORT` macro en `bridge.h`
- Linux build usa `continue-on-error: true` en CI
- Solo Windows y macOS son releases obligatorios

### Secretos de GitHub
Ver `.keys/github/ALL_SECRETS.md` para la lista completa de secretos necesarios.
