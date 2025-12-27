---
description: Implementation plan for advanced CAD/Blender-like rendering features in CADHY
---

# 🎨 Advanced Rendering Implementation - UNIFIED

## ✅ Sistema Simplificado

Se unificó todo en un solo control: **Render Quality** en la barra inferior (keys 1-4).

---

## 🎮 Control Unificado: Render Quality

| Tecla | Modo | Material | Post-Processing | Uso |
|-------|------|----------|-----------------|-----|
| **1** | Draft | Workbench (flat) | OFF | Modelado rápido |
| **2** | Modeling | Solid (Lambert) | ON (básico) | Trabajo general |
| **3** | Real-time | Material (PBR) | ON (medio) | Previsualización |
| **4** | Cinematic | Rendered (full PBR) | ON (completo) | Visualización final |

### Ubicación
- **Barra inferior** → Icono de círculo (al lado de Delete)
- **Hotkeys**: Presiona 1, 2, 3 o 4 directamente

---

## ✅ Efectos Implementados

### Phase 1: Quick Wins
- [x] Depth of Field (DOF)
- [x] Render Quality presets (4 niveles)
- [ ] Motion Blur (toggle solo)

### Phase 2: CAD Pro
- [x] Edge Detection (contorno de selección)
- [x] X-Ray Mode (transparencia configurable)
- [x] Section Plane (plano de corte)

### Phase 3: Cinematic
- [x] Vignette (oscurecimiento de bordes)
- [x] Chromatic Aberration (aberración de lente)

---

## 📍 Dónde encontrar los controles

### Render Quality (PRINCIPAL)
1. **Barra inferior** del viewport
2. Clic en el icono de círculo
3. O usa teclas **1, 2, 3, 4**

### Efectos Avanzados
1. **Panel derecho** (Viewport Settings)
2. Scroll abajo → **"Advanced Rendering"** (expandir)
3. Contiene: DOF, Edge Detection, X-Ray, Section Plane, Vignette, etc.

### X-Ray Toggle rápido
1. **Barra inferior** → Icono de X-Ray
2. O usa **Alt+3**

---

## 🪞 Sobre Reflejos

Los reflejos aplican a TODOS los materiales basándose en:
- **Metalness**: 0 = plástico, 1 = metal
- **Roughness**: 0 = espejo, 1 = mate
- **Environment Map**: HDRI proporciona reflejos

El slider "Reflection" en Scene aumenta la intensidad global.

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `ViewportOverlays.tsx` | Render Quality ahora establece shadingMode |
| `ViewportSettingsPanel.tsx` | Eliminado selector duplicado de Shading Mode |
| `SceneObjectMesh.tsx` | Lógica de materiales por shadingMode |
| `SectionPlane.tsx` | Nuevo componente de plano de corte |
| `PostProcessing.tsx` | Efectos de post-processing |

---

## Testing

```bash
bun run typecheck
bun run dev
```

1. Abre un proyecto
2. Crea objetos
3. Presiona **1, 2, 3, 4** para ver los cambios de calidad
4. Abre Viewport Settings → Advanced Rendering para efectos
