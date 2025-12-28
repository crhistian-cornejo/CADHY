# Progreso de Refactorización de bridge.cpp

## ✅ Completado

1. **Header actualizado**: Incluye `<cadhy/cadhy.hpp>` para acceso a módulos
2. **Primitivas migradas**: 
   - `make_box`, `make_box_at`, `make_box_centered`
   - `make_cylinder`, `make_cylinder_at`, `make_cylinder_centered`
   - `make_sphere`, `make_sphere_at`
   - `make_cone`, `make_cone_at`, `make_cone_centered`
   - `make_torus`, `make_torus_at`
   - `make_wedge`
3. **Boolean operations migradas**:
   - `boolean_fuse` → `cadhy::boolean::fuse`
   - `boolean_cut` → `cadhy::boolean::cut`
   - `boolean_common` → `cadhy::boolean::common`

## ⏳ Pendiente

### Funciones que necesitan migración:

1. **Modify operations** (fillet, chamfer, offset, shell, draft, thicken)
2. **Transform operations** (translate, rotate, scale, mirror)
3. **Sweep operations** (extrude, revolve, loft, pipe)
4. **Wire operations** (make_line, make_circle, make_arc, make_rectangle, etc.)
5. **Mesh/Tessellation** (ya está en módulo, solo necesita wrapper)
6. **I/O operations** (read_step, write_step, write_stl, etc.)
7. **Analysis operations** (measure_distance, check_shape_validity, etc.)

### Funciones FFI específicas (requieren wrappers):

1. **HLR Projection**:
   - `compute_hlr_projection` - Retorna `HLRProjectionResult` (FFI type)
   - `compute_hlr_projection_v2` - Retorna `HLRProjectionResultV2` (FFI type)
   - Necesitan convertir de `cadhy::projection::HLRResult` a tipos FFI

2. **Section with Hatching**:
   - `compute_section_with_hatch` - Retorna `SectionWithHatchResult` (FFI type)
   - Necesita wrapper que use `cadhy::projection::section_by_plane` y agregue hatching

3. **Otras funciones especiales**:
   - `make_helix`, `make_pyramid`, `make_ellipsoid` - Pueden estar en primitives o necesitar implementación
   - Funciones de explode/implode
   - Funciones de topology extraction

## 📋 Estrategia

1. **Migrar funciones simples primero** (transform, modify básico)
2. **Implementar wrappers FFI** para projection/drawing
3. **Verificar funciones faltantes** en módulos y agregarlas si es necesario
4. **Reducir bridge.cpp** a < 500 líneas (solo wrappers FFI)

## 🔍 Notas

- Las funciones modulares usan tipos `cadhy::` (Point3D, Vector3D, etc.)
- Las funciones FFI usan tipos Rust (rust::Str, rust::Slice, etc.)
- Los wrappers deben convertir entre estos tipos cuando sea necesario
- Algunas funciones pueden necesitar implementación directa si no están en módulos

