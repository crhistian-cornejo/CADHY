# Modo Performance (Viewport 3D)

## Objetivo

El **Modo Performance** existe para mejorar la fluidez del viewport en escenas pesadas **sin romper la interacción** (OrbitControls, TransformControls y gizmos).

## Comportamiento

Cuando `viewportSettings.performanceMode` está **ON**:

- El `Canvas` mantiene **`frameloop="always"`** para que el input y el raycasting sigan siendo consistentes.
- Se desactivan/evitan efectos costosos (HDRI pesado, sombras complejas, post-processing), según `RE_scene_content.tsx`.
- Se aplica `dprOverride` (clamp 0.5–2) para permitir bajar resolución si se desea.

Cuando está **OFF**:

- El `Canvas` vuelve a **`frameloop="always"`** (render continuo).
- Se mantienen los ajustes visuales normales.

## Detalle técnico

- El ajuste de `dpr` y configuración del `Canvas` vive en `apps/desktop/src/render/RE_viewport3d.tsx`.
- El recorte de features pesadas (HDRI/shadows/post-processing) vive en `apps/desktop/src/render/RE_scene_content.tsx`.


