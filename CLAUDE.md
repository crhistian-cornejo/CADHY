# CADHY - AI Agent Instructions

**IMPORTANTE: Toda la documentación está en `.agents/`**

## Archivos de Referencia

Lee estos archivos en orden de prioridad:

1. `.agents/CORE-RULES.md` - Reglas fundamentales
2. `.agents/BEST-PRACTICES.md` - Checklist pre-commit obligatorio
3. `.agents/ARCHITECTURE.md` - Arquitectura del proyecto
4. `.agents/CONVENTIONS.md` - Convenciones de código
5. `.agents/RELEASE-PROCESS.md` - Proceso de release
6. `.agents/SHADCN-V2.md` - Componentes UI

## Regla Principal

**SIEMPRE ejecutar lint y typecheck antes de cualquier commit:**

```bash
bun lint:fix && bun lint && bun typecheck
```

Si hay errores, arreglarlos ANTES de commitear.

## No escribir aquí

Este archivo solo redirige a `.agents/`.
Toda nueva documentación debe ir en `.agents/`.
