//! Corridor Generator - Generacion de Geometria de Canales
//!
//! Este modulo genera la geometria 3D de canales hidraulicos:
//! - Sweep (barrido) de secciones a lo largo del alineamiento
//! - Paredes sólidas con espesor real
//! - Loft entre secciones diferentes para transiciones
//!
//! La geometría generada es un sólido real (no una cáscara hueca):
//! - Pared izquierda sólida
//! - Pared derecha sólida
//! - Losa de fondo sólida
//! - Tapas en los extremos

// TODO: Refactorizar funciones con muchos argumentos en un PR futuro
#![allow(clippy::too_many_arguments)]
#![allow(clippy::derivable_impls)]
#![allow(clippy::manual_clamp)]
#![allow(clippy::needless_range_loop)]
#![allow(clippy::manual_range_contains)]
#![allow(clippy::redundant_closure)]

use crate::alignment::Alignment;
use crate::sections::StationSection;
use crate::transitions::Transition;
use crate::{ElementId, HydraulicError, NaVec3, Point3, Result};
use serde::{Deserialize, Serialize};

/// Resultado de la generacion de geometria del corridor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorridorResult {
    /// Vertices del mesh (x, y, z)
    pub vertices: Vec<[f64; 3]>,

    /// Indices de triangulos
    pub indices: Vec<u32>,

    /// Normales (opcional)
    pub normals: Option<Vec<[f64; 3]>>,

    /// Coordenadas UV (opcional)
    pub uvs: Option<Vec<[f64; 2]>>,

    /// Estaciones de los vertices (para coloreo por parametro)
    pub stations: Option<Vec<f64>>,
}

/// Corridor completo (canal con secciones y transiciones)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Corridor {
    /// Identificador unico
    pub id: ElementId,

    /// Nombre del corridor
    pub name: String,

    /// Alineamiento base
    pub alignment: Alignment,

    /// Secciones asignadas a estaciones
    pub sections: Vec<StationSection>,

    /// Transiciones entre secciones
    #[serde(default)]
    pub transitions: Vec<Transition>,

    /// Espesor de paredes por defecto (m)
    pub default_wall_thickness: f64,

    /// Espesor de losa de fondo por defecto (m)
    pub default_floor_thickness: f64,
}

impl Corridor {
    /// Crear nuevo corridor vacio
    pub fn new(name: impl Into<String>, alignment: Alignment) -> Self {
        Self {
            id: ElementId::new_v4(),
            name: name.into(),
            alignment,
            sections: Vec::new(),
            transitions: Vec::new(),
            default_wall_thickness: 0.15,
            default_floor_thickness: 0.20,
        }
    }

    /// Agregar seccion en una estacion
    pub fn add_section(&mut self, section: StationSection) -> &mut Self {
        self.sections.push(section);
        self.sections.sort_by(|a, b| {
            a.station
                .partial_cmp(&b.station)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        self
    }

    /// Obtener seccion activa en una estacion (interpolada si es necesario)
    pub fn section_at(&self, station: f64) -> Option<&StationSection> {
        // Encontrar la seccion mas cercana anterior a la estacion
        self.sections
            .iter()
            .filter(|s| s.station <= station)
            .next_back()
            .or_else(|| self.sections.first())
    }

    /// Verificar si hay cambio de seccion entre dos estaciones
    pub fn has_section_change(&self, from_station: f64, to_station: f64) -> bool {
        let (start, end) = if from_station < to_station {
            (from_station, to_station)
        } else {
            (to_station, from_station)
        };

        let mut changes = 0;
        for section in &self.sections {
            if section.station > start && section.station <= end {
                changes += 1;
            }
        }

        changes > 0
    }
}

/// Generador de geometria de corridors
pub struct CorridorGenerator;

impl CorridorGenerator {
    /// Generar geometria completa del corridor como un sólido real
    ///
    /// La geometría se genera como paredes y fondo sólidos:
    /// - Pared izquierda: sólido extruido a lo largo del canal
    /// - Pared derecha: sólido extruido a lo largo del canal
    /// - Losa de fondo: sólido extruido a lo largo del canal
    /// - Tapas en los extremos
    ///
    /// Para secciones trapezoidales/rectangulares/triangulares, cada pared
    /// tiene 4 vértices por anillo (inner-bottom, inner-top, outer-top, outer-bottom)
    pub fn generate(corridor: &Corridor, resolution: f64) -> Result<CorridorResult> {
        if corridor.sections.is_empty() {
            return Err(HydraulicError::Geometry(
                "Corridor has no sections defined".into(),
            ));
        }

        let mut all_vertices: Vec<[f64; 3]> = Vec::new();
        let mut all_indices: Vec<u32> = Vec::new();
        let mut all_normals: Vec<[f64; 3]> = Vec::new();
        let mut all_stations: Vec<f64> = Vec::new();

        let total_length = corridor.alignment.total_length();
        let num_stations = (total_length / resolution).ceil() as usize + 1;

        // Generar anillos de sección interior y exterior en cada estación
        let mut inner_rings: Vec<Vec<Point3>> = Vec::new();
        let mut outer_rings: Vec<Vec<Point3>> = Vec::new();
        let mut ring_stations: Vec<f64> = Vec::new();

        for i in 0..num_stations {
            let station = (i as f64 * resolution).min(total_length);
            ring_stations.push(station);

            // Obtener sección en esta estación
            let section = corridor
                .section_at(station)
                .ok_or_else(|| HydraulicError::Geometry("No section at station".into()))?;

            // Obtener espesores interpolados
            let (wall_thickness, floor_thickness) =
                Self::interpolated_thicknesses(corridor, station);

            // Generar puntos del perfil interior y exterior
            let inner_profile = section.section.profile_points(16);
            let outer_profile = section
                .section
                .outer_profile_points(wall_thickness, floor_thickness);

            // Transformar al sistema de coordenadas del alineamiento
            let position = corridor.alignment.position_3d_at(station);
            let tangent = corridor.alignment.tangent_at(station);

            let inner_ring =
                Self::transform_profile(&inner_profile, position, tangent.into_inner());
            let outer_ring =
                Self::transform_profile(&outer_profile, position, tangent.into_inner());

            inner_rings.push(inner_ring);
            outer_rings.push(outer_ring);
        }

        // Para secciones con 4 puntos (rectangular, trapezoidal), generar geometría sólida
        // Puntos: 0=fondo-izq, 1=fondo-der, 2=arriba-der, 3=arriba-izq
        let points_per_ring = inner_rings[0].len();

        if points_per_ring >= 4 {
            // Generar pared izquierda sólida (conecta inner[0,3] con outer[0,3])
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                0,
                3, // índices de fondo-izq y arriba-izq
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                false, // normal hacia afuera (izquierda)
            )?;

            // Generar pared derecha sólida (conecta inner[1,2] con outer[1,2])
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                1,
                2, // índices de fondo-der y arriba-der
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                true, // normal hacia afuera (derecha)
            )?;

            // Generar losa de fondo sólida (conecta inner[0,1] con outer[0,1])
            Self::generate_solid_floor(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;

            // Generar tapas en los extremos
            Self::generate_solid_end_caps(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        } else if points_per_ring == 3 {
            // Sección triangular - manejo especial
            Self::generate_triangular_solid(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        }

        Ok(CorridorResult {
            vertices: all_vertices,
            indices: all_indices,
            normals: Some(all_normals),
            uvs: None,
            stations: Some(all_stations),
        })
    }

    /// Transformar perfil de seccion al sistema de coordenadas del alineamiento
    fn transform_profile(profile: &[Point3], position: Point3, tangent: NaVec3) -> Vec<Point3> {
        // Calcular sistema de coordenadas local
        // X = tangent (direccion del flujo)
        // Z = up (vertical)
        // Y = cross(Z, X) (transversal)

        let up = NaVec3::new(0.0, 0.0, 1.0);
        let right = tangent.cross(&up).normalize();
        let actual_up = right.cross(&tangent).normalize();

        profile
            .iter()
            .map(|p| {
                // p.x es transversal, p.z es vertical en el perfil
                let offset = right * p.x + actual_up * p.z;
                Point3::new(
                    position.x + offset.x,
                    position.y + offset.y,
                    position.z + offset.z,
                )
            })
            .collect()
    }

    /// Generar una pared sólida del canal
    ///
    /// Una pared se define por 4 vértices por estación:
    /// - inner_bottom: punto interior en el fondo de la pared
    /// - inner_top: punto interior en la parte superior de la pared
    /// - outer_top: punto exterior en la parte superior de la pared
    /// - outer_bottom: punto exterior en el fondo de la pared
    ///
    /// Genera 4 caras por segmento: interior, exterior, arriba, abajo (conectadas al fondo)
    fn generate_solid_wall(
        inner_rings: &[Vec<Point3>],
        outer_rings: &[Vec<Point3>],
        stations: &[f64],
        bottom_idx: usize,
        top_idx: usize,
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
        flip_winding: bool,
    ) -> Result<()> {
        if inner_rings.len() < 2 || outer_rings.len() < 2 {
            return Ok(());
        }

        let num_rings = inner_rings.len();
        let base_idx = vertices.len() as u32;

        // Agregar 4 vértices por estación para esta pared
        // Orden: inner_bottom, inner_top, outer_top, outer_bottom
        for (ring_idx, (inner, outer)) in inner_rings.iter().zip(outer_rings.iter()).enumerate() {
            let station = stations[ring_idx];

            // Inner bottom
            vertices.push([
                inner[bottom_idx].x,
                inner[bottom_idx].y,
                inner[bottom_idx].z,
            ]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);

            // Inner top
            vertices.push([inner[top_idx].x, inner[top_idx].y, inner[top_idx].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);

            // Outer top
            vertices.push([outer[top_idx].x, outer[top_idx].y, outer[top_idx].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);

            // Outer bottom
            vertices.push([
                outer[bottom_idx].x,
                outer[bottom_idx].y,
                outer[bottom_idx].z,
            ]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);
        }

        // Generar triángulos entre estaciones consecutivas
        for ring_idx in 0..num_rings - 1 {
            let curr = base_idx + (ring_idx * 4) as u32;
            let next = base_idx + ((ring_idx + 1) * 4) as u32;

            // Índices para esta estación y la siguiente
            // c = current, n = next
            // 0 = inner_bottom, 1 = inner_top, 2 = outer_top, 3 = outer_bottom
            let ib_c = curr; // inner bottom current
            let it_c = curr + 1; // inner top current
            let ot_c = curr + 2; // outer top current
            let ob_c = curr + 3; // outer bottom current

            let ib_n = next;
            let it_n = next + 1;
            let ot_n = next + 2;
            let ob_n = next + 3;

            if flip_winding {
                // Pared derecha - normales hacia afuera (derecha)

                // Cara interior (mirando hacia el canal)
                indices.extend_from_slice(&[ib_c, it_c, ib_n]);
                indices.extend_from_slice(&[it_c, it_n, ib_n]);

                // Cara exterior (mirando hacia afuera)
                indices.extend_from_slice(&[ob_c, ob_n, ot_c]);
                indices.extend_from_slice(&[ot_c, ob_n, ot_n]);

                // Cara superior (parte de arriba de la pared)
                indices.extend_from_slice(&[it_c, ot_c, it_n]);
                indices.extend_from_slice(&[ot_c, ot_n, it_n]);
            } else {
                // Pared izquierda - normales hacia afuera (izquierda)

                // Cara interior (mirando hacia el canal)
                indices.extend_from_slice(&[ib_c, ib_n, it_c]);
                indices.extend_from_slice(&[it_c, ib_n, it_n]);

                // Cara exterior (mirando hacia afuera)
                indices.extend_from_slice(&[ob_c, ot_c, ob_n]);
                indices.extend_from_slice(&[ot_c, ot_n, ob_n]);

                // Cara superior (parte de arriba de la pared)
                indices.extend_from_slice(&[it_c, it_n, ot_c]);
                indices.extend_from_slice(&[ot_c, it_n, ot_n]);
            }
        }

        Ok(())
    }

    /// Generar la losa de fondo sólida del canal
    ///
    /// La losa conecta inner[0,1] con outer[0,1] formando un sólido rectangular
    fn generate_solid_floor(
        inner_rings: &[Vec<Point3>],
        outer_rings: &[Vec<Point3>],
        stations: &[f64],
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
    ) -> Result<()> {
        if inner_rings.len() < 2 || outer_rings.len() < 2 {
            return Ok(());
        }

        let num_rings = inner_rings.len();
        let base_idx = vertices.len() as u32;

        // 4 vértices por estación: inner_left, inner_right, outer_right, outer_left (del fondo)
        for (ring_idx, (inner, outer)) in inner_rings.iter().zip(outer_rings.iter()).enumerate() {
            let station = stations[ring_idx];

            // Inner left (fondo interior izquierdo) - punto 0
            vertices.push([inner[0].x, inner[0].y, inner[0].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);

            // Inner right (fondo interior derecho) - punto 1
            vertices.push([inner[1].x, inner[1].y, inner[1].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);

            // Outer right (fondo exterior derecho) - punto 1
            vertices.push([outer[1].x, outer[1].y, outer[1].z]);
            normals.push([0.0, 0.0, -1.0]);
            station_data.push(station);

            // Outer left (fondo exterior izquierdo) - punto 0
            vertices.push([outer[0].x, outer[0].y, outer[0].z]);
            normals.push([0.0, 0.0, -1.0]);
            station_data.push(station);
        }

        // Generar triángulos
        for ring_idx in 0..num_rings - 1 {
            let curr = base_idx + (ring_idx * 4) as u32;
            let next = base_idx + ((ring_idx + 1) * 4) as u32;

            // 0 = inner_left, 1 = inner_right, 2 = outer_right, 3 = outer_left
            let il_c = curr;
            let ir_c = curr + 1;
            let or_c = curr + 2;
            let ol_c = curr + 3;

            let il_n = next;
            let ir_n = next + 1;
            let or_n = next + 2;
            let ol_n = next + 3;

            // Cara superior (interior del canal - donde fluye el agua)
            indices.extend_from_slice(&[il_c, ir_c, il_n]);
            indices.extend_from_slice(&[ir_c, ir_n, il_n]);

            // Cara inferior (exterior - base del canal)
            indices.extend_from_slice(&[ol_c, ol_n, or_c]);
            indices.extend_from_slice(&[or_c, ol_n, or_n]);

            // Nota: Los lados de la losa están cubiertos por las paredes laterales
        }

        Ok(())
    }

    /// Generar tapas sólidas en los extremos del canal
    fn generate_solid_end_caps(
        inner_rings: &[Vec<Point3>],
        outer_rings: &[Vec<Point3>],
        stations: &[f64],
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
    ) -> Result<()> {
        if inner_rings.is_empty() || outer_rings.is_empty() {
            return Ok(());
        }

        // Tapa de inicio (estación 0)
        Self::generate_single_solid_end_cap(
            &inner_rings[0],
            &outer_rings[0],
            stations[0],
            true, // is_start
            vertices,
            indices,
            normals,
            station_data,
        )?;

        // Tapa de final
        if inner_rings.len() > 1 {
            let last_idx = inner_rings.len() - 1;
            Self::generate_single_solid_end_cap(
                &inner_rings[last_idx],
                &outer_rings[last_idx],
                stations[last_idx],
                false, // is_start
                vertices,
                indices,
                normals,
                station_data,
            )?;
        }

        Ok(())
    }

    /// Generar una tapa sólida individual
    ///
    /// Para secciones con 4 puntos:
    /// Inner: 0=fondo-izq, 1=fondo-der, 2=arriba-der, 3=arriba-izq
    /// Outer: 0=fondo-izq, 1=fondo-der, 2=arriba-der, 3=arriba-izq
    fn generate_single_solid_end_cap(
        inner: &[Point3],
        outer: &[Point3],
        station: f64,
        is_start: bool,
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
    ) -> Result<()> {
        if inner.len() < 4 || outer.len() < 4 {
            return Ok(());
        }

        let base_idx = vertices.len() as u32;

        // Agregar 8 vértices: 4 inner + 4 outer
        for point in inner.iter().take(4) {
            vertices.push([point.x, point.y, point.z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);
        }
        for point in outer.iter().take(4) {
            vertices.push([point.x, point.y, point.z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station);
        }

        // Índices
        let i0 = base_idx; // inner fondo izq
        let i1 = base_idx + 1; // inner fondo der
        let i2 = base_idx + 2; // inner arriba der
        let i3 = base_idx + 3; // inner arriba izq
        let o0 = base_idx + 4; // outer fondo izq
        let o1 = base_idx + 5; // outer fondo der
        let o2 = base_idx + 6; // outer arriba der
        let o3 = base_idx + 7; // outer arriba izq

        if is_start {
            // Tapa de inicio - normal apunta hacia atrás (-X)

            // Pared izquierda (quad: i0, i3, o3, o0)
            indices.extend_from_slice(&[i0, o0, i3]);
            indices.extend_from_slice(&[i3, o0, o3]);

            // Pared derecha (quad: i1, i2, o2, o1)
            indices.extend_from_slice(&[i1, i2, o1]);
            indices.extend_from_slice(&[i2, o2, o1]);

            // Losa de fondo (quad: i0, i1, o1, o0)
            indices.extend_from_slice(&[i0, i1, o0]);
            indices.extend_from_slice(&[i1, o1, o0]);
        } else {
            // Tapa de final - normal apunta hacia adelante (+X)

            // Pared izquierda
            indices.extend_from_slice(&[i0, i3, o0]);
            indices.extend_from_slice(&[i3, o3, o0]);

            // Pared derecha
            indices.extend_from_slice(&[i1, o1, i2]);
            indices.extend_from_slice(&[i2, o1, o2]);

            // Losa de fondo
            indices.extend_from_slice(&[i0, o0, i1]);
            indices.extend_from_slice(&[i1, o0, o1]);
        }

        Ok(())
    }

    /// Generate solid geometry for mixed transitions (varying point counts between rings)
    /// This handles transitions between different section types (e.g., trapezoidal to triangular)
    fn generate_mixed_transition_loft(
        inner_rings: &[Vec<Point3>],
        outer_rings: &[Vec<Point3>],
        stations: &[f64],
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
    ) -> Result<()> {
        if inner_rings.len() < 2 || outer_rings.len() < 2 {
            return Ok(());
        }

        let num_rings = inner_rings.len();

        // For mixed transitions, we generate geometry ring-by-ring
        // connecting each ring to the next, handling different point counts
        for ring_idx in 0..num_rings - 1 {
            let inner_curr = &inner_rings[ring_idx];
            let inner_next = &inner_rings[ring_idx + 1];
            let outer_curr = &outer_rings[ring_idx];
            let outer_next = &outer_rings[ring_idx + 1];
            let station_curr = stations[ring_idx];
            let station_next = stations[ring_idx + 1];

            // Generate loft between these two rings
            Self::generate_ring_pair_loft(
                inner_curr,
                inner_next,
                outer_curr,
                outer_next,
                station_curr,
                station_next,
                vertices,
                indices,
                normals,
                station_data,
            )?;
        }

        // Generate end caps
        // Start cap
        if !inner_rings.is_empty() && !outer_rings.is_empty() {
            Self::generate_flexible_end_cap(
                &inner_rings[0],
                &outer_rings[0],
                stations[0],
                true, // is_start
                vertices,
                indices,
                normals,
                station_data,
            )?;

            // End cap
            if inner_rings.len() > 1 {
                let last = inner_rings.len() - 1;
                Self::generate_flexible_end_cap(
                    &inner_rings[last],
                    &outer_rings[last],
                    stations[last],
                    false, // is_start
                    vertices,
                    indices,
                    normals,
                    station_data,
                )?;
            }
        }

        Ok(())
    }

    /// Generate loft geometry between two rings with potentially different point counts
    fn generate_ring_pair_loft(
        inner_curr: &[Point3],
        inner_next: &[Point3],
        outer_curr: &[Point3],
        outer_next: &[Point3],
        station_curr: f64,
        station_next: f64,
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
    ) -> Result<()> {
        let n_curr = inner_curr.len().min(outer_curr.len());
        let n_next = inner_next.len().min(outer_next.len());

        if n_curr < 2 || n_next < 2 {
            return Ok(());
        }

        let base_idx = vertices.len() as u32;

        // Add vertices for current ring (inner + outer)
        for i in 0..n_curr {
            vertices.push([inner_curr[i].x, inner_curr[i].y, inner_curr[i].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station_curr);
        }
        for i in 0..n_curr {
            vertices.push([outer_curr[i].x, outer_curr[i].y, outer_curr[i].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station_curr);
        }

        // Add vertices for next ring (inner + outer)
        let next_base = vertices.len() as u32;
        for i in 0..n_next {
            vertices.push([inner_next[i].x, inner_next[i].y, inner_next[i].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station_next);
        }
        for i in 0..n_next {
            vertices.push([outer_next[i].x, outer_next[i].y, outer_next[i].z]);
            normals.push([0.0, 0.0, 1.0]);
            station_data.push(station_next);
        }

        // Connect inner surfaces
        Self::connect_profile_strips(
            base_idx,
            n_curr as u32, // curr inner start, count
            next_base,
            n_next as u32, // next inner start, count
            indices,
            false,
        );

        // Connect outer surfaces
        Self::connect_profile_strips(
            base_idx + n_curr as u32,
            n_curr as u32, // curr outer start, count
            next_base + n_next as u32,
            n_next as u32, // next outer start, count
            indices,
            true, // flip for outer
        );

        // Connect top edges (inner top to outer top)
        // For 4-point: top-left is [3], top-right is [2]
        // For 3-point: top-left is [0], top-right is [2]
        let curr_top_left_inner = if n_curr >= 4 { 3 } else { 0 };
        let curr_top_right_inner = if n_curr >= 4 { 2 } else { 2.min(n_curr - 1) };
        let next_top_left_inner = if n_next >= 4 { 3 } else { 0 };
        let next_top_right_inner = if n_next >= 4 { 2 } else { 2.min(n_next - 1) };

        // Left top edge
        let tl_ic = base_idx + curr_top_left_inner as u32;
        let tl_oc = base_idx + n_curr as u32 + curr_top_left_inner as u32;
        let tl_in = next_base + next_top_left_inner as u32;
        let tl_on = next_base + n_next as u32 + next_top_left_inner as u32;
        indices.extend_from_slice(&[tl_ic, tl_in, tl_oc]);
        indices.extend_from_slice(&[tl_oc, tl_in, tl_on]);

        // Right top edge
        let tr_ic = base_idx + curr_top_right_inner as u32;
        let tr_oc = base_idx + n_curr as u32 + curr_top_right_inner as u32;
        let tr_in = next_base + next_top_right_inner as u32;
        let tr_on = next_base + n_next as u32 + next_top_right_inner as u32;
        indices.extend_from_slice(&[tr_ic, tr_oc, tr_in]);
        indices.extend_from_slice(&[tr_oc, tr_on, tr_in]);

        Ok(())
    }

    /// Connect two profile strips with potentially different point counts
    fn connect_profile_strips(
        start1: u32,
        count1: u32,
        start2: u32,
        count2: u32,
        indices: &mut Vec<u32>,
        flip: bool,
    ) {
        // Use parametric interpolation to connect strips
        let max_segments = (count1.max(count2) - 1) as usize;

        for seg in 0..max_segments {
            let t0 = seg as f64 / max_segments as f64;
            let t1 = (seg + 1) as f64 / max_segments as f64;

            // Map to indices in each strip
            let i1_0 = start1 + ((t0 * (count1 - 1) as f64).round() as u32).min(count1 - 1);
            let i1_1 = start1 + ((t1 * (count1 - 1) as f64).round() as u32).min(count1 - 1);
            let i2_0 = start2 + ((t0 * (count2 - 1) as f64).round() as u32).min(count2 - 1);
            let i2_1 = start2 + ((t1 * (count2 - 1) as f64).round() as u32).min(count2 - 1);

            if flip {
                indices.extend_from_slice(&[i1_0, i1_1, i2_0]);
                if i2_0 != i2_1 || i1_0 != i1_1 {
                    indices.extend_from_slice(&[i2_0, i1_1, i2_1]);
                }
            } else {
                indices.extend_from_slice(&[i1_0, i2_0, i1_1]);
                if i2_0 != i2_1 || i1_0 != i1_1 {
                    indices.extend_from_slice(&[i2_0, i2_1, i1_1]);
                }
            }
        }
    }

    /// Generate a flexible end cap that works with any point count
    fn generate_flexible_end_cap(
        inner: &[Point3],
        outer: &[Point3],
        station: f64,
        is_start: bool,
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
    ) -> Result<()> {
        let n = inner.len().min(outer.len());
        if n < 3 {
            return Ok(());
        }

        let base_idx = vertices.len() as u32;

        // Add inner vertices
        for point in inner.iter().take(n) {
            vertices.push([point.x, point.y, point.z]);
            normals.push(if is_start {
                [-1.0, 0.0, 0.0]
            } else {
                [1.0, 0.0, 0.0]
            });
            station_data.push(station);
        }

        // Add outer vertices
        for point in outer.iter().take(n) {
            vertices.push([point.x, point.y, point.z]);
            normals.push(if is_start {
                [-1.0, 0.0, 0.0]
            } else {
                [1.0, 0.0, 0.0]
            });
            station_data.push(station);
        }

        // Connect inner to outer with quads/triangles around the perimeter
        for i in 0..n {
            let i_next = (i + 1) % n;

            let inner_curr = base_idx + i as u32;
            let inner_next = base_idx + i_next as u32;
            let outer_curr = base_idx + n as u32 + i as u32;
            let outer_next = base_idx + n as u32 + i_next as u32;

            if is_start {
                indices.extend_from_slice(&[inner_curr, outer_curr, inner_next]);
                indices.extend_from_slice(&[inner_next, outer_curr, outer_next]);
            } else {
                indices.extend_from_slice(&[inner_curr, inner_next, outer_curr]);
                indices.extend_from_slice(&[inner_next, outer_next, outer_curr]);
            }
        }

        Ok(())
    }

    /// Generar geometría sólida para sección triangular
    fn generate_triangular_solid(
        inner_rings: &[Vec<Point3>],
        outer_rings: &[Vec<Point3>],
        stations: &[f64],
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        station_data: &mut Vec<f64>,
    ) -> Result<()> {
        if inner_rings.len() < 2 || outer_rings.len() < 2 {
            return Ok(());
        }

        let num_rings = inner_rings.len();
        let base_idx = vertices.len() as u32;

        // Para triangular: inner/outer tienen 3 puntos
        // 0 = arriba izq, 1 = fondo (vértice), 2 = arriba der

        // Agregar vértices: 6 por estación (3 inner + 3 outer)
        for (ring_idx, (inner, outer)) in inner_rings.iter().zip(outer_rings.iter()).enumerate() {
            let station = stations[ring_idx];

            for point in inner.iter().take(3) {
                vertices.push([point.x, point.y, point.z]);
                normals.push([0.0, 0.0, 1.0]);
                station_data.push(station);
            }
            for point in outer.iter().take(3) {
                vertices.push([point.x, point.y, point.z]);
                normals.push([0.0, 0.0, 1.0]);
                station_data.push(station);
            }
        }

        // Generar caras entre estaciones
        for ring_idx in 0..num_rings - 1 {
            let curr = base_idx + (ring_idx * 6) as u32;
            let next = base_idx + ((ring_idx + 1) * 6) as u32;

            // Inner: 0, 1, 2 | Outer: 3, 4, 5
            let i0_c = curr; // inner arriba izq
            let i1_c = curr + 1; // inner fondo
            let i2_c = curr + 2; // inner arriba der
            let o0_c = curr + 3; // outer arriba izq
            let o1_c = curr + 4; // outer fondo
            let o2_c = curr + 5; // outer arriba der

            let i0_n = next;
            let i1_n = next + 1;
            let i2_n = next + 2;
            let o0_n = next + 3;
            let o1_n = next + 4;
            let o2_n = next + 5;

            // Pared izquierda interior (i0 -> i1)
            indices.extend_from_slice(&[i0_c, i0_n, i1_c]);
            indices.extend_from_slice(&[i1_c, i0_n, i1_n]);

            // Pared derecha interior (i1 -> i2)
            indices.extend_from_slice(&[i1_c, i1_n, i2_c]);
            indices.extend_from_slice(&[i2_c, i1_n, i2_n]);

            // Pared izquierda exterior (o0 -> o1)
            indices.extend_from_slice(&[o0_c, o1_c, o0_n]);
            indices.extend_from_slice(&[o1_c, o1_n, o0_n]);

            // Pared derecha exterior (o1 -> o2)
            indices.extend_from_slice(&[o1_c, o2_c, o1_n]);
            indices.extend_from_slice(&[o2_c, o2_n, o1_n]);

            // Borde superior izquierdo (i0 - o0)
            indices.extend_from_slice(&[i0_c, o0_c, i0_n]);
            indices.extend_from_slice(&[o0_c, o0_n, i0_n]);

            // Borde superior derecho (i2 - o2)
            indices.extend_from_slice(&[i2_c, i2_n, o2_c]);
            indices.extend_from_slice(&[o2_c, i2_n, o2_n]);
        }

        // Tapas
        if !inner_rings.is_empty() {
            // Tapa inicio
            let inner = &inner_rings[0];
            let outer = &outer_rings[0];
            if inner.len() >= 3 && outer.len() >= 3 {
                let b = vertices.len() as u32;
                for point in inner.iter().take(3) {
                    vertices.push([point.x, point.y, point.z]);
                    normals.push([0.0, 0.0, 1.0]);
                    station_data.push(stations[0]);
                }
                for point in outer.iter().take(3) {
                    vertices.push([point.x, point.y, point.z]);
                    normals.push([0.0, 0.0, 1.0]);
                    station_data.push(stations[0]);
                }
                // Pared izq, der, fondo
                indices.extend_from_slice(&[b, b + 3, b + 1]);
                indices.extend_from_slice(&[b + 1, b + 3, b + 4]);
                indices.extend_from_slice(&[b + 1, b + 4, b + 2]);
                indices.extend_from_slice(&[b + 2, b + 4, b + 5]);
            }

            // Tapa final
            if inner_rings.len() > 1 {
                let last = inner_rings.len() - 1;
                let inner = &inner_rings[last];
                let outer = &outer_rings[last];
                if inner.len() >= 3 && outer.len() >= 3 {
                    let b = vertices.len() as u32;
                    for point in inner.iter().take(3) {
                        vertices.push([point.x, point.y, point.z]);
                        normals.push([0.0, 0.0, 1.0]);
                        station_data.push(stations[last]);
                    }
                    for point in outer.iter().take(3) {
                        vertices.push([point.x, point.y, point.z]);
                        normals.push([0.0, 0.0, 1.0]);
                        station_data.push(stations[last]);
                    }
                    // Invertir winding
                    indices.extend_from_slice(&[b, b + 1, b + 3]);
                    indices.extend_from_slice(&[b + 1, b + 4, b + 3]);
                    indices.extend_from_slice(&[b + 1, b + 2, b + 4]);
                    indices.extend_from_slice(&[b + 2, b + 5, b + 4]);
                }
            }
        }

        Ok(())
    }

    /// Obtener espesores interpolados para una estación dada
    ///
    /// Si la estación está entre dos secciones con diferentes espesores,
    /// interpola linealmente entre ellas.
    fn interpolated_thicknesses(corridor: &Corridor, station: f64) -> (f64, f64) {
        if corridor.sections.len() < 2 {
            // Solo una sección, usar sus valores
            if let Some(section) = corridor.sections.first() {
                return (section.wall_thickness, section.floor_thickness);
            }
            return (
                corridor.default_wall_thickness,
                corridor.default_floor_thickness,
            );
        }

        // Encontrar las secciones anterior y siguiente
        let mut prev_section: Option<&StationSection> = None;
        let mut next_section: Option<&StationSection> = None;

        for section in &corridor.sections {
            if section.station <= station {
                prev_section = Some(section);
            } else if next_section.is_none() {
                next_section = Some(section);
                break;
            }
        }

        match (prev_section, next_section) {
            (Some(prev), Some(next)) => {
                // Interpolar entre las dos secciones
                let total_dist = next.station - prev.station;
                if total_dist <= 0.0 {
                    return (prev.wall_thickness, prev.floor_thickness);
                }
                let t = (station - prev.station) / total_dist;
                let wall = prev.wall_thickness + t * (next.wall_thickness - prev.wall_thickness);
                let floor =
                    prev.floor_thickness + t * (next.floor_thickness - prev.floor_thickness);
                (wall, floor)
            }
            (Some(prev), None) => {
                // Después de la última sección
                (prev.wall_thickness, prev.floor_thickness)
            }
            (None, Some(next)) => {
                // Antes de la primera sección
                (next.wall_thickness, next.floor_thickness)
            }
            (None, None) => {
                // Fallback a valores por defecto
                (
                    corridor.default_wall_thickness,
                    corridor.default_floor_thickness,
                )
            }
        }
    }

    /// Recalcular normales de vertices basado en triangulos
    fn recalculate_normals(
        vertices: &[[f64; 3]],
        indices: &[u32],
        normals: &mut [[f64; 3]],
        start_idx: usize,
    ) {
        // Reset normals
        for normal in normals.iter_mut().skip(start_idx) {
            *normal = [0.0, 0.0, 0.0];
        }

        // Acumular normales de triangulos
        for triangle in indices.chunks(3) {
            if triangle.len() < 3 {
                continue;
            }

            let i0 = triangle[0] as usize;
            let i1 = triangle[1] as usize;
            let i2 = triangle[2] as usize;

            if i0 >= vertices.len() || i1 >= vertices.len() || i2 >= vertices.len() {
                continue;
            }

            let v0 = NaVec3::new(vertices[i0][0], vertices[i0][1], vertices[i0][2]);
            let v1 = NaVec3::new(vertices[i1][0], vertices[i1][1], vertices[i1][2]);
            let v2 = NaVec3::new(vertices[i2][0], vertices[i2][1], vertices[i2][2]);

            let edge1 = v1 - v0;
            let edge2 = v2 - v0;
            let normal = edge1.cross(&edge2);

            if i0 >= start_idx && i0 < normals.len() {
                normals[i0][0] += normal.x;
                normals[i0][1] += normal.y;
                normals[i0][2] += normal.z;
            }
            if i1 >= start_idx && i1 < normals.len() {
                normals[i1][0] += normal.x;
                normals[i1][1] += normal.y;
                normals[i1][2] += normal.z;
            }
            if i2 >= start_idx && i2 < normals.len() {
                normals[i2][0] += normal.x;
                normals[i2][1] += normal.y;
                normals[i2][2] += normal.z;
            }
        }

        // Normalizar
        for normal in normals.iter_mut().skip(start_idx) {
            let len = (normal[0].powi(2) + normal[1].powi(2) + normal[2].powi(2)).sqrt();
            if len > 0.0 {
                normal[0] /= len;
                normal[1] /= len;
                normal[2] /= len;
            }
        }
    }

    /// Generar loft (transicion) entre dos secciones diferentes
    pub fn generate_loft(
        from_section: &StationSection,
        to_section: &StationSection,
        alignment: &Alignment,
        steps: usize,
    ) -> Result<CorridorResult> {
        let mut vertices: Vec<[f64; 3]> = Vec::new();
        let mut indices: Vec<u32> = Vec::new();
        let mut normals: Vec<[f64; 3]> = Vec::new();
        let mut stations: Vec<f64> = Vec::new();

        let from_points = from_section.section.profile_points(16);
        let to_points = to_section.section.profile_points(16);

        // Interpolar secciones
        for i in 0..=steps {
            let t = i as f64 / steps as f64;
            let station = from_section.station + t * (to_section.station - from_section.station);

            // Interpolar entre perfiles
            let ring = Self::interpolate_profiles(&from_points, &to_points, t);

            // Transformar al alineamiento
            let position = alignment.position_3d_at(station);
            let tangent = alignment.tangent_at(station);
            let transformed = Self::transform_profile(&ring, position, tangent.into_inner());

            for point in &transformed {
                vertices.push([point.x, point.y, point.z]);
                stations.push(station);
                normals.push([0.0, 0.0, 1.0]);
            }
        }

        // Generar triangulos
        let points_per_ring = from_points.len().max(to_points.len());
        for ring_idx in 0..steps {
            let current_base = (ring_idx * points_per_ring) as u32;
            let next_base = ((ring_idx + 1) * points_per_ring) as u32;

            for i in 0..points_per_ring {
                let i_next = (i + 1) % points_per_ring;

                let v0 = current_base + i as u32;
                let v1 = current_base + i_next as u32;
                let v2 = next_base + i as u32;
                let v3 = next_base + i_next as u32;

                indices.extend_from_slice(&[v0, v2, v1]);
                indices.extend_from_slice(&[v1, v2, v3]);
            }
        }

        Ok(CorridorResult {
            vertices,
            indices,
            normals: Some(normals),
            uvs: None,
            stations: Some(stations),
        })
    }

    /// Interpolar entre dos perfiles de seccion
    fn interpolate_profiles(from: &[Point3], to: &[Point3], t: f64) -> Vec<Point3> {
        let max_len = from.len().max(to.len());
        let mut result = Vec::with_capacity(max_len);

        for i in 0..max_len {
            let from_idx = (i * from.len()) / max_len;
            let to_idx = (i * to.len()) / max_len;

            let from_pt = from.get(from_idx).copied().unwrap_or(Point3::origin());
            let to_pt = to.get(to_idx).copied().unwrap_or(Point3::origin());

            result.push(Point3::new(
                from_pt.x + t * (to_pt.x - from_pt.x),
                from_pt.y + t * (to_pt.y - from_pt.y),
                from_pt.z + t * (to_pt.z - from_pt.z),
            ));
        }

        result
    }

    /// Generate a solid transition mesh between two channel sections
    ///
    /// Creates a lofted solid that smoothly interpolates between inlet and outlet sections.
    /// The transition uses the specified interpolation type (linear, warped, etc.)
    pub fn generate_transition(input: &TransitionGeometryInput) -> Result<CorridorResult> {
        let mut all_vertices: Vec<[f64; 3]> = Vec::new();
        let mut all_indices: Vec<u32> = Vec::new();
        let mut all_normals: Vec<[f64; 3]> = Vec::new();
        let mut all_stations: Vec<f64> = Vec::new();

        // Number of intermediate sections - ensure at least 2
        let num_sections = ((input.length / input.resolution).ceil() as usize + 1).max(2);

        // Generate rings at each station
        let mut inner_rings: Vec<Vec<Point3>> = Vec::new();
        let mut outer_rings: Vec<Vec<Point3>> = Vec::new();
        let mut ring_stations: Vec<f64> = Vec::new();

        for i in 0..num_sections {
            let local_station = (i as f64 * input.resolution).min(input.length);
            let t_raw = if input.length > 0.0 {
                local_station / input.length
            } else {
                0.0
            };

            // Apply transition curve based on type
            let t = Self::apply_transition_curve(t_raw, input.transition_type);

            // Interpolate section properties
            // Note: For transitions between different section types, width interpolation
            // is handled specially by create_interpolated_section, so we pass both
            // inlet and outlet widths separately.
            let depth = Self::lerp(input.inlet_depth, input.outlet_depth, t);
            let side_slope = Self::lerp(input.inlet_side_slope, input.outlet_side_slope, t);
            let wall_thickness =
                Self::lerp(input.inlet_wall_thickness, input.outlet_wall_thickness, t);
            let floor_thickness =
                Self::lerp(input.inlet_floor_thickness, input.outlet_floor_thickness, t);

            // Calculate elevation at this station (linear interpolation for invert)
            let elevation = Self::lerp(input.start_elevation, input.end_elevation, t_raw);

            // Generate interpolated section based on type
            // Pass inlet/outlet widths separately for proper handling of section type changes
            let section = Self::create_interpolated_section(
                &input.inlet_section_type,
                &input.outlet_section_type,
                t,
                input.inlet_width,
                input.outlet_width,
                depth,
                side_slope,
            );

            // Get profile points
            let inner_profile = section.profile_points(16);
            let outer_profile = section.outer_profile_points(wall_thickness, floor_thickness);

            // Transform to 3D - X is flow direction, Z is up
            // Position: X = local_station (relative to start), Y = 0, Z = elevation
            let position = Point3::new(local_station, 0.0, elevation);
            let tangent = NaVec3::new(1.0, 0.0, 0.0); // Straight transition

            let inner_ring = Self::transform_profile(&inner_profile, position, tangent);
            let outer_ring = Self::transform_profile(&outer_profile, position, tangent);

            inner_rings.push(inner_ring);
            outer_rings.push(outer_ring);
            ring_stations.push(local_station);
        }

        // Safety check
        if inner_rings.is_empty() || outer_rings.is_empty() {
            return Err(HydraulicError::Geometry(
                "No rings generated for transition".into(),
            ));
        }

        // For transitions between different section types, we need to handle varying point counts
        // Find min points across all rings to determine safe geometry generation strategy
        let min_points = inner_rings
            .iter()
            .chain(outer_rings.iter())
            .map(|r| r.len())
            .min()
            .unwrap_or(0);

        let max_points = inner_rings
            .iter()
            .chain(outer_rings.iter())
            .map(|r| r.len())
            .max()
            .unwrap_or(0);

        // If all rings have consistent 4+ points, use standard solid wall generation
        // Otherwise, use the more flexible loft-based approach
        if min_points >= 4 && max_points == min_points {
            // All rings have same number of points (4+) - use optimized solid wall method
            // Profile order: 0=bottom-left, 1=bottom-right, 2=top-right, 3=top-left

            // Generate left wall (connects inner[0,3] with outer[0,3])
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                0,
                3, // bottom-left, top-left
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                false, // normal toward -Y (left)
            )?;

            // Generate right wall (connects inner[1,2] with outer[1,2])
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                1,
                2, // bottom-right, top-right
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                true, // normal toward +Y (right)
            )?;

            // Generate floor
            Self::generate_solid_floor(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;

            // Generate end caps
            Self::generate_solid_end_caps(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        } else if min_points == 3 && max_points == 3 {
            // All triangular sections
            Self::generate_triangular_solid(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        } else if min_points >= 3 {
            // Mixed section types (transition between different geometries)
            // Use flexible loft generation that handles varying point counts
            Self::generate_mixed_transition_loft(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        }

        // CRITICAL: Recalculate normals using face integration for correct lighting
        // This is the same approach used by GraphCAD for proper 3D rendering
        if !all_vertices.is_empty() && !all_indices.is_empty() {
            let mut normals_array: Vec<[f64; 3]> = all_normals.clone();
            Self::recalculate_normals(&all_vertices, &all_indices, &mut normals_array, 0);
            all_normals = normals_array;
        }

        Ok(CorridorResult {
            vertices: all_vertices,
            indices: all_indices,
            normals: Some(all_normals),
            uvs: None,
            stations: Some(all_stations),
        })
    }

    /// Apply transition curve based on type
    fn apply_transition_curve(t: f64, transition_type: crate::transitions::TransitionType) -> f64 {
        use crate::transitions::TransitionType;

        match transition_type {
            TransitionType::Linear => t,
            TransitionType::Warped => {
                // S-curve (ease-in-out): 3t² - 2t³
                let t2 = t * t;
                let t3 = t2 * t;
                3.0 * t2 - 2.0 * t3
            }
            TransitionType::Cylindrical => {
                // Quarter circle: sin(π/2 * t)
                (t * std::f64::consts::FRAC_PI_2).sin()
            }
            TransitionType::Inlet | TransitionType::Outlet => {
                // Parabolic
                t * t
            }
        }
    }

    /// Linear interpolation
    fn lerp(a: f64, b: f64, t: f64) -> f64 {
        a + (b - a) * t
    }

    /// Create interpolated section between two section types
    ///
    /// For transitions involving triangular sections, the bottom width is calculated
    /// internally since triangular sections have zero bottom width by definition.
    ///
    /// # Arguments
    /// - `inlet_type`: Section type at inlet (e.g., "trapezoidal", "triangular")
    /// - `outlet_type`: Section type at outlet
    /// - `t`: Interpolation factor [0, 1] where 0 = inlet, 1 = outlet
    /// - `inlet_width`: Bottom width at inlet (0 for triangular)
    /// - `outlet_width`: Bottom width at outlet (0 for triangular)
    /// - `depth`: Interpolated depth at this station
    /// - `side_slope`: Interpolated side slope at this station
    fn create_interpolated_section(
        inlet_type: &str,
        outlet_type: &str,
        t: f64,
        inlet_width: f64,
        outlet_width: f64,
        depth: f64,
        side_slope: f64,
    ) -> crate::sections::SectionType {
        use crate::sections::SectionType;

        // Threshold for considering width as "zero" (effectively triangular)
        const WIDTH_THRESHOLD: f64 = 0.02;

        // Calculate interpolated width
        // For same-type transitions, this is a simple lerp
        // For cross-type transitions (trap<->tri), one of the widths will be 0
        let interpolated_width = Self::lerp(inlet_width, outlet_width, t);

        // Handle section type transitions
        match (inlet_type, outlet_type) {
            ("rectangular", "rectangular") => SectionType::rectangular(interpolated_width, depth),
            ("trapezoidal", "trapezoidal") => {
                SectionType::trapezoidal(interpolated_width, depth, side_slope)
            }
            ("triangular", "triangular") => SectionType::Triangular {
                depth,
                left_slope: side_slope,
                right_slope: side_slope,
            },
            // Transitions between different types
            ("rectangular", "trapezoidal") | ("trapezoidal", "rectangular") => {
                // Interpolate side slope: 0 for rectangular, actual value for trapezoidal
                let effective_slope = if inlet_type == "rectangular" {
                    side_slope * t // Grow slope from 0
                } else {
                    side_slope * (1.0 - t) // Shrink slope to 0
                };
                if effective_slope.abs() < 0.01 {
                    SectionType::rectangular(interpolated_width, depth)
                } else {
                    SectionType::trapezoidal(interpolated_width, depth, effective_slope)
                }
            }
            ("rectangular", "triangular") | ("triangular", "rectangular") => {
                // Width is already interpolated correctly (from inlet_width to 0 or vice versa)
                // Also need to interpolate side slope for rectangular (0) to triangular (side_slope)
                let effective_slope = if inlet_type == "rectangular" {
                    side_slope * t // Grow slope as we approach triangular
                } else {
                    side_slope * (1.0 - t) // Shrink slope as we approach rectangular
                };

                if interpolated_width < WIDTH_THRESHOLD {
                    SectionType::Triangular {
                        depth,
                        left_slope: side_slope.max(0.5), // Ensure reasonable slope
                        right_slope: side_slope.max(0.5),
                    }
                } else if effective_slope < 0.01 {
                    SectionType::rectangular(interpolated_width, depth)
                } else {
                    SectionType::trapezoidal(interpolated_width, depth, effective_slope)
                }
            }
            ("trapezoidal", "triangular") | ("triangular", "trapezoidal") => {
                // Width is already interpolated correctly:
                // - trap->tri: inlet_width (e.g., 2.0) -> outlet_width (0) over t
                // - tri->trap: inlet_width (0) -> outlet_width (e.g., 2.0) over t
                // The lerp handles this naturally when frontend sends correct widths

                if interpolated_width < WIDTH_THRESHOLD {
                    SectionType::Triangular {
                        depth,
                        left_slope: side_slope.max(0.5),
                        right_slope: side_slope.max(0.5),
                    }
                } else {
                    SectionType::trapezoidal(interpolated_width, depth, side_slope)
                }
            }
            _ => {
                // Default: use trapezoidal as intermediate
                SectionType::trapezoidal(interpolated_width, depth, side_slope)
            }
        }
    }
}

// ============================================================================
// CHUTE GEOMETRY GENERATION
// ============================================================================

/// Chute surface type - determines energy dissipation along the chute body
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ChuteTypeInput {
    Smooth,
    Stepped,
    Baffled,
    Ogee,
    Converging,
}

impl Default for ChuteTypeInput {
    fn default() -> Self {
        Self::Smooth
    }
}

/// Stilling basin type (USBR)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum StillingBasinTypeInput {
    None,
    TypeI,
    TypeIi,
    TypeIii,
    TypeIv,
    Saf,
}

impl Default for StillingBasinTypeInput {
    fn default() -> Self {
        Self::None
    }
}

/// Chute block configuration for stilling basin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChuteBlockInput {
    pub count: usize,
    pub width: f64,
    pub height: f64,
    pub thickness: f64,
    pub spacing: f64,
}

/// Baffle block configuration for stilling basin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaffleBlockInput {
    pub rows: usize,
    pub blocks_per_row: usize,
    pub width: f64,
    pub height: f64,
    pub thickness: f64,
    pub distance_from_inlet: f64,
    pub row_spacing: f64,
}

/// End sill configuration for stilling basin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndSillInput {
    #[serde(rename = "type")]
    pub sill_type: String, // "solid" or "dentated"
    pub height: f64,
    pub tooth_width: Option<f64>,
    pub tooth_spacing: Option<f64>,
}

/// Stilling basin configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StillingBasinInput {
    #[serde(rename = "type")]
    pub basin_type: StillingBasinTypeInput,
    pub length: f64,
    pub depth: f64,
    pub floor_thickness: f64,
    pub chute_blocks: Option<ChuteBlockInput>,
    pub baffle_blocks: Option<BaffleBlockInput>,
    pub end_sill: Option<EndSillInput>,
    #[serde(default)]
    pub wingwall_angle: f64,
}

/// Input parameters for chute geometry generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChuteGeometryInput {
    /// Chute name
    pub name: String,
    /// Chute surface type
    #[serde(default)]
    pub chute_type: ChuteTypeInput,
    /// Inlet section length (m)
    #[serde(default)]
    pub inlet_length: f64,
    /// Inlet section slope (m/m)
    #[serde(default)]
    pub inlet_slope: f64,
    /// Main chute horizontal length (m)
    pub length: f64,
    /// Main chute elevation drop (m)
    pub drop: f64,
    /// Channel width at bottom (m)
    pub width: f64,
    /// Channel depth (m)
    pub depth: f64,
    /// Side slope (H:V) - 0 for rectangular
    #[serde(default)]
    pub side_slope: f64,
    /// Wall/floor thickness (m)
    #[serde(default = "default_chute_thickness")]
    pub thickness: f64,
    /// Start station (progressive position)
    pub start_station: f64,
    /// Start elevation (invert at top)
    pub start_elevation: f64,
    /// Mesh resolution (m)
    #[serde(default = "default_chute_resolution")]
    pub resolution: f64,
    /// Step height for stepped chutes (m)
    #[serde(default)]
    pub step_height: f64,
    /// Step length for stepped chutes (m) - if 0, calculated from length/steps
    #[serde(default)]
    pub step_length: f64,
    /// Baffle spacing for baffled chutes (m)
    #[serde(default)]
    pub baffle_spacing: f64,
    /// Baffle height for baffled chutes (m)
    #[serde(default)]
    pub baffle_height: f64,
    /// Stilling basin configuration
    pub stilling_basin: Option<StillingBasinInput>,
}

fn default_chute_thickness() -> f64 {
    0.2
}

fn default_chute_resolution() -> f64 {
    0.5
}

impl CorridorGenerator {
    /// Generate 3D mesh for a chute (rapida)
    ///
    /// Creates a lofted solid geometry for the chute, including:
    /// - Inlet section (horizontal or low-slope transition)
    /// - Main chute body (steep slope)
    /// - Optional stilling basin at outlet
    ///
    /// For stepped chutes, generates individual step geometry.
    /// For smooth/baffled chutes, generates a continuous lofted surface.
    pub fn generate_chute(input: &ChuteGeometryInput) -> Result<CorridorResult> {
        // Calculate key elevations
        let inlet_drop = input.inlet_length * input.inlet_slope;
        let inlet_end_elevation = input.start_elevation - inlet_drop;
        let chute_end_elevation = inlet_end_elevation - input.drop;

        // Total horizontal length
        let total_length = input.inlet_length + input.length;

        // Choose generation method based on chute type
        match input.chute_type {
            ChuteTypeInput::Stepped => {
                Self::generate_stepped_chute(input, inlet_end_elevation, chute_end_elevation)
            }
            _ => {
                // Smooth, baffled, ogee, converging all use lofted geometry
                let mut result =
                    Self::generate_smooth_chute(input, inlet_end_elevation, chute_end_elevation)?;

                // Add baffle blocks for baffled chutes
                if input.chute_type == ChuteTypeInput::Baffled {
                    Self::add_baffle_blocks(&mut result, input, inlet_end_elevation)?;
                }

                // Add stilling basin if present
                if let Some(ref basin) = input.stilling_basin {
                    if basin.basin_type != StillingBasinTypeInput::None {
                        Self::add_stilling_basin(
                            &mut result,
                            input,
                            basin,
                            chute_end_elevation,
                            total_length,
                        )?;
                    }
                }

                Ok(result)
            }
        }
    }

    /// Generate smooth chute using lofted geometry (same approach as transitions)
    fn generate_smooth_chute(
        input: &ChuteGeometryInput,
        inlet_end_elevation: f64,
        _chute_end_elevation: f64,
    ) -> Result<CorridorResult> {
        let mut all_vertices: Vec<[f64; 3]> = Vec::new();
        let mut all_indices: Vec<u32> = Vec::new();
        let mut all_normals: Vec<[f64; 3]> = Vec::new();
        let mut all_stations: Vec<f64> = Vec::new();

        // Generate cross-section rings along the chute
        let mut inner_rings: Vec<Vec<Point3>> = Vec::new();
        let mut outer_rings: Vec<Vec<Point3>> = Vec::new();
        let mut ring_stations: Vec<f64> = Vec::new();

        // Inlet section
        if input.inlet_length > 0.001 {
            let inlet_steps = ((input.inlet_length / input.resolution).ceil() as usize).max(2);
            for i in 0..=inlet_steps {
                let t = i as f64 / inlet_steps as f64;
                let local_x = input.inlet_length * t;
                let elevation = input.start_elevation - (input.inlet_slope * local_x);

                let section = Self::create_chute_section(input);
                let (inner, outer) =
                    Self::get_chute_rings(&section, local_x, elevation, input.thickness);

                inner_rings.push(inner);
                outer_rings.push(outer);
                ring_stations.push(local_x);
            }
        } else {
            // Add start section
            let section = Self::create_chute_section(input);
            let (inner, outer) =
                Self::get_chute_rings(&section, 0.0, input.start_elevation, input.thickness);
            inner_rings.push(inner);
            outer_rings.push(outer);
            ring_stations.push(0.0);
        }

        // Main chute section
        let main_steps = ((input.length / input.resolution).ceil() as usize).max(2);
        for i in 1..=main_steps {
            let t = i as f64 / main_steps as f64;
            let local_x = input.inlet_length + input.length * t;
            let elevation = inlet_end_elevation - input.drop * t;

            let section = Self::create_chute_section(input);
            let (inner, outer) =
                Self::get_chute_rings(&section, local_x, elevation, input.thickness);

            inner_rings.push(inner);
            outer_rings.push(outer);
            ring_stations.push(local_x);
        }

        // Safety check
        if inner_rings.len() < 2 {
            return Err(HydraulicError::Geometry(
                "Insufficient rings for chute geometry".into(),
            ));
        }

        // Determine point count
        let points_per_ring = inner_rings[0].len();

        if points_per_ring >= 4 {
            // Rectangular/trapezoidal section - use solid wall generation
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                0,
                3,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                false,
            )?;
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                1,
                2,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                true,
            )?;
            Self::generate_solid_floor(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
            Self::generate_solid_end_caps(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        } else if points_per_ring == 3 {
            Self::generate_triangular_solid(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        }

        // Recalculate normals
        if !all_vertices.is_empty() && !all_indices.is_empty() {
            let mut normals_array = all_normals.clone();
            Self::recalculate_normals(&all_vertices, &all_indices, &mut normals_array, 0);
            all_normals = normals_array;
        }

        Ok(CorridorResult {
            vertices: all_vertices,
            indices: all_indices,
            normals: Some(all_normals),
            uvs: None,
            stations: Some(all_stations),
        })
    }

    /// Generate stepped chute geometry
    fn generate_stepped_chute(
        input: &ChuteGeometryInput,
        inlet_end_elevation: f64,
        chute_end_elevation: f64,
    ) -> Result<CorridorResult> {
        let mut all_vertices: Vec<[f64; 3]> = Vec::new();
        let mut all_indices: Vec<u32> = Vec::new();
        let mut all_normals: Vec<[f64; 3]> = Vec::new();
        let mut all_stations: Vec<f64> = Vec::new();

        // First, generate inlet section using smooth loft
        if input.inlet_length > 0.001 {
            let inlet_result = Self::generate_inlet_section(input)?;
            Self::merge_corridor_result(
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                &inlet_result,
            );
        }

        // Calculate step parameters
        // Priority: use user-specified step_length if provided, else calculate from step_height
        let (num_steps, actual_step_height, step_length) = if input.step_length > 0.0 {
            // User specified step length - calculate number of steps from length
            let num_steps = (input.length / input.step_length).ceil() as usize;
            let actual_step_length = input.length / num_steps as f64;
            let actual_step_height = input.drop / num_steps as f64;
            (num_steps, actual_step_height, actual_step_length)
        } else {
            // Use step height to determine number of steps
            let step_height = if input.step_height > 0.0 {
                input.step_height
            } else {
                0.5
            };
            let num_steps = (input.drop / step_height).ceil() as usize;
            let actual_step_height = input.drop / num_steps as f64;
            let step_length = input.length / num_steps as f64;
            (num_steps, actual_step_height, step_length)
        };

        // Generate each step
        for i in 0..num_steps {
            let step_start_x = input.inlet_length + i as f64 * step_length;
            let step_elevation = inlet_end_elevation - i as f64 * actual_step_height;

            // Create step geometry (horizontal tread + vertical riser)
            Self::add_step_geometry(
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                step_start_x,
                step_length,
                step_elevation,
                actual_step_height,
                input.width,
                input.depth,
                input.thickness,
                i == num_steps - 1, // is_last
            )?;
        }

        // Add stilling basin if present
        let total_length = input.inlet_length + input.length;
        if let Some(ref basin) = input.stilling_basin {
            if basin.basin_type != StillingBasinTypeInput::None {
                Self::add_stilling_basin_geometry(
                    &mut all_vertices,
                    &mut all_indices,
                    &mut all_normals,
                    &mut all_stations,
                    basin,
                    chute_end_elevation,
                    total_length,
                    input.width,
                    input.depth,
                    input.thickness,
                )?;
            }
        }

        // Recalculate normals
        if !all_vertices.is_empty() && !all_indices.is_empty() {
            let mut normals_array = all_normals.clone();
            Self::recalculate_normals(&all_vertices, &all_indices, &mut normals_array, 0);
            all_normals = normals_array;
        }

        Ok(CorridorResult {
            vertices: all_vertices,
            indices: all_indices,
            normals: Some(all_normals),
            uvs: None,
            stations: Some(all_stations),
        })
    }

    /// Generate inlet section only
    fn generate_inlet_section(input: &ChuteGeometryInput) -> Result<CorridorResult> {
        let mut inner_rings: Vec<Vec<Point3>> = Vec::new();
        let mut outer_rings: Vec<Vec<Point3>> = Vec::new();
        let mut ring_stations: Vec<f64> = Vec::new();

        let inlet_steps = ((input.inlet_length / input.resolution).ceil() as usize).max(2);
        for i in 0..=inlet_steps {
            let t = i as f64 / inlet_steps as f64;
            let local_x = input.inlet_length * t;
            let elevation = input.start_elevation - (input.inlet_slope * local_x);

            let section = Self::create_chute_section(input);
            let (inner, outer) =
                Self::get_chute_rings(&section, local_x, elevation, input.thickness);

            inner_rings.push(inner);
            outer_rings.push(outer);
            ring_stations.push(local_x);
        }

        let mut all_vertices = Vec::new();
        let mut all_indices = Vec::new();
        let mut all_normals = Vec::new();
        let mut all_stations = Vec::new();

        if inner_rings[0].len() >= 4 {
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                0,
                3,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                false,
            )?;
            Self::generate_solid_wall(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                1,
                2,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
                true,
            )?;
            Self::generate_solid_floor(
                &inner_rings,
                &outer_rings,
                &ring_stations,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
            // Only add start cap (end connects to steps)
            Self::generate_single_solid_end_cap(
                &inner_rings[0],
                &outer_rings[0],
                ring_stations[0],
                true,
                &mut all_vertices,
                &mut all_indices,
                &mut all_normals,
                &mut all_stations,
            )?;
        }

        Ok(CorridorResult {
            vertices: all_vertices,
            indices: all_indices,
            normals: Some(all_normals),
            uvs: None,
            stations: Some(all_stations),
        })
    }

    /// Add geometry for a single step
    fn add_step_geometry(
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        stations: &mut Vec<f64>,
        start_x: f64,
        step_length: f64,
        step_elevation: f64,
        step_height: f64,
        width: f64,
        depth: f64,
        thickness: f64,
        is_last: bool,
    ) -> Result<()> {
        let hw = width / 2.0;
        let outer_hw = hw + thickness;

        // Step tread (horizontal floor)
        // Position: x=start, y=-outer_hw (left edge), z=floor level
        // Size: size_x=length, size_y=full width, size_z=thickness
        Self::add_box_geometry(
            vertices,
            indices,
            normals,
            stations,
            start_x,
            -outer_hw,
            step_elevation - thickness,
            step_length,
            width + 2.0 * thickness,
            thickness,
        );

        // Step riser (vertical drop) - except for last step
        if !is_last {
            Self::add_box_geometry(
                vertices,
                indices,
                normals,
                stations,
                start_x + step_length - thickness / 2.0,
                -outer_hw,
                step_elevation - step_height,
                thickness,
                width + 2.0 * thickness,
                step_height,
            );
        }

        // Left wall
        Self::add_box_geometry(
            vertices,
            indices,
            normals,
            stations,
            start_x,
            -outer_hw,
            step_elevation,
            step_length,
            thickness,
            depth,
        );

        // Right wall
        Self::add_box_geometry(
            vertices,
            indices,
            normals,
            stations,
            start_x,
            hw,
            step_elevation,
            step_length,
            thickness,
            depth,
        );

        Ok(())
    }

    /// Add a box geometry to the mesh
    ///
    /// Coordinate system (consistent with rest of corridor.rs):
    /// - X = Station (flow direction)
    /// - Y = Transverse (width, left-right)
    /// - Z = Vertical (elevation, up-down)
    ///
    /// Parameters:
    /// - x, y, z: position of box corner (min X, min Y, min Z)
    /// - size_x: length in X direction (along flow)
    /// - size_y: width in Y direction (transverse)
    /// - size_z: height in Z direction (vertical)
    fn add_box_geometry(
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        stations: &mut Vec<f64>,
        x: f64,
        y: f64,
        z: f64,
        size_x: f64,
        size_y: f64,
        size_z: f64,
    ) {
        let base = vertices.len() as u32;

        // 8 corners of the box
        // X = flow direction, Y = transverse, Z = vertical
        let corners = [
            [x, y, z],                            // 0: back-left-bottom
            [x + size_x, y, z],                   // 1: front-left-bottom
            [x + size_x, y + size_y, z],          // 2: front-right-bottom
            [x, y + size_y, z],                   // 3: back-right-bottom
            [x, y, z + size_z],                   // 4: back-left-top
            [x + size_x, y, z + size_z],          // 5: front-left-top
            [x + size_x, y + size_y, z + size_z], // 6: front-right-top
            [x, y + size_y, z + size_z],          // 7: back-right-top
        ];

        for corner in &corners {
            vertices.push(*corner);
            normals.push([0.0, 0.0, 1.0]); // Will be recalculated
            stations.push(x);
        }

        // 6 faces, 2 triangles each (12 triangles total)
        let faces: [[u32; 6]; 6] = [
            [0, 3, 2, 0, 2, 1], // Bottom face (Z-)
            [4, 5, 6, 4, 6, 7], // Top face (Z+)
            [0, 1, 5, 0, 5, 4], // Left face (Y-)
            [2, 3, 7, 2, 7, 6], // Right face (Y+)
            [0, 4, 7, 0, 7, 3], // Back face (X-)
            [1, 2, 6, 1, 6, 5], // Front face (X+)
        ];

        for face in &faces {
            for &idx in face {
                indices.push(base + idx);
            }
        }
    }

    /// Add stilling basin geometry (used by generate_chute)
    fn add_stilling_basin(
        result: &mut CorridorResult,
        input: &ChuteGeometryInput,
        basin: &StillingBasinInput,
        chute_end_elevation: f64,
        chute_end_x: f64,
    ) -> Result<()> {
        Self::add_stilling_basin_geometry(
            &mut result.vertices,
            &mut result.indices,
            result.normals.as_mut().unwrap_or(&mut Vec::new()),
            result.stations.as_mut().unwrap_or(&mut Vec::new()),
            basin,
            chute_end_elevation,
            chute_end_x,
            input.width,
            input.depth,
            input.thickness,
        )
    }

    /// Add stilling basin geometry to mesh
    fn add_stilling_basin_geometry(
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        stations: &mut Vec<f64>,
        basin: &StillingBasinInput,
        chute_end_elevation: f64,
        chute_end_x: f64,
        width: f64,
        chute_depth: f64,
        thickness: f64,
    ) -> Result<()> {
        let hw = width / 2.0;
        let outer_hw = hw + thickness;

        // Basin floor elevation
        let basin_floor = chute_end_elevation - basin.depth;

        // Apron (sloped transition from chute to basin floor)
        let apron_length = (basin.depth * 3.0).min(basin.length * 0.3);
        let horizontal_length = basin.length - apron_length;

        // Apron floor
        if apron_length > 0.001 && basin.depth > 0.001 {
            // Create sloped apron using boxes approximation
            let apron_steps = 4;
            let step_len = apron_length / apron_steps as f64;
            let step_drop = basin.depth / apron_steps as f64;

            for i in 0..apron_steps {
                let x = chute_end_x + i as f64 * step_len;
                let z = chute_end_elevation - (i as f64 + 0.5) * step_drop - basin.floor_thickness;
                Self::add_box_geometry(
                    vertices,
                    indices,
                    normals,
                    stations,
                    x,
                    -outer_hw,
                    z,
                    step_len,
                    width + 2.0 * thickness,
                    basin.floor_thickness,
                );
            }
        }

        // Basin floor (horizontal)
        let basin_start_x = chute_end_x + apron_length;
        Self::add_box_geometry(
            vertices,
            indices,
            normals,
            stations,
            basin_start_x,
            -outer_hw,
            basin_floor - basin.floor_thickness,
            horizontal_length,
            width + 2.0 * thickness,
            basin.floor_thickness,
        );

        // Basin walls (higher than chute depth to contain water)
        let wall_height = chute_depth + basin.depth;

        // Left wall
        Self::add_box_geometry(
            vertices,
            indices,
            normals,
            stations,
            basin_start_x,
            -outer_hw,
            basin_floor,
            horizontal_length,
            thickness,
            wall_height,
        );

        // Right wall
        Self::add_box_geometry(
            vertices,
            indices,
            normals,
            stations,
            basin_start_x,
            hw,
            basin_floor,
            horizontal_length,
            thickness,
            wall_height,
        );

        // End wall
        let basin_end_x = chute_end_x + basin.length;
        Self::add_box_geometry(
            vertices,
            indices,
            normals,
            stations,
            basin_end_x - thickness,
            -outer_hw,
            basin_floor,
            thickness,
            width + 2.0 * thickness,
            wall_height,
        );

        // Chute blocks
        if let Some(ref cb) = basin.chute_blocks {
            let block_spacing = (width - cb.count as f64 * cb.width) / (cb.count as f64 + 1.0);
            for i in 0..cb.count {
                let y = -hw + block_spacing * (i as f64 + 1.0) + cb.width * i as f64;
                Self::add_box_geometry(
                    vertices,
                    indices,
                    normals,
                    stations,
                    basin_start_x,
                    y,
                    basin_floor,
                    cb.thickness,
                    cb.width,
                    cb.height,
                );
            }
        }

        // Baffle blocks
        if let Some(ref bb) = basin.baffle_blocks {
            for row in 0..bb.rows {
                let row_x = basin_start_x + bb.distance_from_inlet + row as f64 * bb.row_spacing;
                let block_spacing = (width - bb.blocks_per_row as f64 * bb.width)
                    / (bb.blocks_per_row as f64 + 1.0);

                for i in 0..bb.blocks_per_row {
                    let y = -hw + block_spacing * (i as f64 + 1.0) + bb.width * i as f64;
                    Self::add_box_geometry(
                        vertices,
                        indices,
                        normals,
                        stations,
                        row_x,
                        y,
                        basin_floor,
                        bb.thickness,
                        bb.width,
                        bb.height,
                    );
                }
            }
        }

        // End sill
        if let Some(ref sill) = basin.end_sill {
            if sill.sill_type == "solid" {
                Self::add_box_geometry(
                    vertices,
                    indices,
                    normals,
                    stations,
                    basin_end_x - thickness * 2.0,
                    -hw,
                    basin_floor,
                    thickness * 2.0,
                    width,
                    sill.height,
                );
            } else if sill.sill_type == "dentated" {
                if let (Some(tw), Some(ts)) = (sill.tooth_width, sill.tooth_spacing) {
                    let tooth_pitch = tw + ts;
                    let num_teeth = (width / tooth_pitch) as usize;
                    let start_y = -width / 2.0 + ts / 2.0;

                    for i in 0..num_teeth {
                        let y = start_y + i as f64 * tooth_pitch;
                        if y + tw < width / 2.0 {
                            Self::add_box_geometry(
                                vertices,
                                indices,
                                normals,
                                stations,
                                basin_end_x - thickness * 2.0,
                                y,
                                basin_floor,
                                thickness * 2.0,
                                tw,
                                sill.height,
                            );
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Add baffle blocks along the chute body
    ///
    /// Implements USBR staggered pattern (baffled chute design):
    /// - Row Type A (odd rows): blocks against walls + blocks distributed in center
    /// - Row Type B (even rows): blocks distributed between the gaps of Row A
    ///
    /// This creates a brick-like pattern that maximizes energy dissipation.
    /// Reference: USBR EM-25 "Hydraulic Design of Stilling Basins and Energy Dissipators"
    fn add_baffle_blocks(
        result: &mut CorridorResult,
        input: &ChuteGeometryInput,
        inlet_end_elevation: f64,
    ) -> Result<()> {
        if input.baffle_spacing <= 0.0 || input.baffle_height <= 0.0 {
            return Ok(());
        }

        let hw = input.width / 2.0;

        // Block dimensions based on channel width
        // USBR recommends block width ≈ 0.1W to 0.15W
        let block_width = (input.width * 0.12).max(0.15).min(0.6);
        let block_thickness = block_width * 0.8; // Slightly less thick than wide

        // Spacing between blocks (USBR recommends ≈ block width)
        let block_spacing = block_width * 1.0;

        // Calculate how many center blocks fit in Row A (excluding wall blocks)
        // Row A: [wall block] [space] [center blocks...] [space] [wall block]
        let center_available = input.width - 2.0 * block_width - 2.0 * block_spacing;
        let num_center_a =
            ((center_available + block_spacing) / (block_width + block_spacing)).floor() as usize;

        // Row B: blocks in the gaps of Row A
        // One more block than Row A center blocks, offset by half pitch
        let num_blocks_b = num_center_a + 1;

        let chute_slope = input.drop / input.length;
        let num_rows = (input.length / input.baffle_spacing).floor() as usize;

        let vertices = &mut result.vertices;
        let indices = &mut result.indices;
        let normals = result.normals.as_mut().unwrap();
        let stations = result.stations.as_mut().unwrap();

        for row in 1..=num_rows {
            let dist = row as f64 * input.baffle_spacing;
            let x = input.inlet_length + dist;
            let elevation = inlet_end_elevation - dist * chute_slope;

            let is_row_a = row % 2 == 1; // Odd rows are Type A

            if is_row_a {
                // Row Type A: Wall blocks + center distributed blocks

                // Left wall block (against left wall)
                Self::add_box_geometry(
                    vertices,
                    indices,
                    normals,
                    stations,
                    x - block_thickness / 2.0,
                    -hw, // Against left wall
                    elevation,
                    block_thickness,
                    block_width,
                    input.baffle_height,
                );

                // Right wall block (against right wall)
                Self::add_box_geometry(
                    vertices,
                    indices,
                    normals,
                    stations,
                    x - block_thickness / 2.0,
                    hw - block_width, // Against right wall
                    elevation,
                    block_thickness,
                    block_width,
                    input.baffle_height,
                );

                // Center blocks (distributed evenly between wall blocks)
                if num_center_a > 0 {
                    let center_start = -hw + block_width + block_spacing;
                    let center_pitch = if num_center_a > 1 {
                        (center_available - block_width) / (num_center_a - 1) as f64
                    } else {
                        0.0
                    };

                    for i in 0..num_center_a {
                        let y = if num_center_a == 1 {
                            -block_width / 2.0 // Single center block at center
                        } else {
                            center_start + i as f64 * center_pitch
                        };

                        Self::add_box_geometry(
                            vertices,
                            indices,
                            normals,
                            stations,
                            x - block_thickness / 2.0,
                            y,
                            elevation,
                            block_thickness,
                            block_width,
                            input.baffle_height,
                        );
                    }
                }
            } else {
                // Row Type B: Blocks in the gaps of Row A
                // Distributed evenly across the width, offset from Row A

                let total_block_width = num_blocks_b as f64 * block_width;
                let total_spacing = input.width - total_block_width;
                let spacing = total_spacing / (num_blocks_b + 1) as f64;

                for i in 0..num_blocks_b {
                    let y = -hw + spacing + i as f64 * (block_width + spacing);

                    Self::add_box_geometry(
                        vertices,
                        indices,
                        normals,
                        stations,
                        x - block_thickness / 2.0,
                        y,
                        elevation,
                        block_thickness,
                        block_width,
                        input.baffle_height,
                    );
                }
            }
        }

        Ok(())
    }

    /// Create section type for chute
    fn create_chute_section(input: &ChuteGeometryInput) -> crate::sections::SectionType {
        if input.side_slope > 0.0 {
            crate::sections::SectionType::trapezoidal(input.width, input.depth, input.side_slope)
        } else {
            crate::sections::SectionType::rectangular(input.width, input.depth)
        }
    }

    /// Get inner and outer profile rings for a chute section
    fn get_chute_rings(
        section: &crate::sections::SectionType,
        x: f64,
        elevation: f64,
        thickness: f64,
    ) -> (Vec<Point3>, Vec<Point3>) {
        let inner_profile = section.profile_points(16);
        let outer_profile = section.outer_profile_points(thickness, thickness);

        // Transform to 3D: X = station, Y = elevation + profile.z, Z = profile.x (transverse)
        let position = Point3::new(x, 0.0, elevation);
        let tangent = NaVec3::new(1.0, 0.0, 0.0);

        let inner = Self::transform_profile(&inner_profile, position, tangent);
        let outer = Self::transform_profile(&outer_profile, position, tangent);

        (inner, outer)
    }

    /// Merge CorridorResult into existing arrays
    fn merge_corridor_result(
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        stations: &mut Vec<f64>,
        result: &CorridorResult,
    ) {
        let base_idx = vertices.len() as u32;
        vertices.extend_from_slice(&result.vertices);
        if let Some(ref n) = result.normals {
            normals.extend_from_slice(n);
        }
        if let Some(ref s) = result.stations {
            stations.extend_from_slice(s);
        }
        for idx in &result.indices {
            indices.push(base_idx + idx);
        }
    }
}

/// Input parameters for transition geometry generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionGeometryInput {
    /// Transition type (linear, warped, cylindrical, etc.)
    pub transition_type: crate::transitions::TransitionType,
    /// Transition length (m)
    pub length: f64,
    /// Mesh resolution (m)
    pub resolution: f64,
    /// Start station (progressive position)
    pub start_station: f64,
    /// Start elevation (invert)
    pub start_elevation: f64,
    /// End elevation (invert)
    pub end_elevation: f64,

    // Inlet section properties
    pub inlet_section_type: String,
    pub inlet_width: f64,
    pub inlet_depth: f64,
    pub inlet_side_slope: f64,
    pub inlet_wall_thickness: f64,
    pub inlet_floor_thickness: f64,

    // Outlet section properties
    pub outlet_section_type: String,
    pub outlet_width: f64,
    pub outlet_depth: f64,
    pub outlet_side_slope: f64,
    pub outlet_wall_thickness: f64,
    pub outlet_floor_thickness: f64,
}

// ============================================================================
// BAFFLE BLOCK GEOMETRY GENERATION
// ============================================================================

use crate::structures::{
    BaffleBlock, BaffleBlockShape, BaffleRow, ChuteBlock, StillingBasinDesign,
};

/// Resultado de la generación de geometría de dados amortiguadores
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaffleBlockGeometry {
    /// Vertices del mesh (x, y, z)
    pub vertices: Vec<[f64; 3]>,

    /// Índices de triángulos
    pub indices: Vec<u32>,

    /// Normales
    pub normals: Vec<[f64; 3]>,
}

/// Generador de geometría para estructuras de disipación
pub struct DissipatorGeometryGenerator;

impl DissipatorGeometryGenerator {
    /// Generar geometría 3D de un dado amortiguador individual
    ///
    /// Crea un bloque rectangular (box) en la posición especificada.
    /// El bloque se orienta con su cara frontal hacia aguas arriba.
    ///
    /// # Argumentos
    /// - `block`: Definición del dado amortiguador
    /// - `base_elevation`: Elevación del fondo donde se apoya el dado
    /// - `channel_tangent`: Vector tangente del canal (dirección del flujo)
    pub fn generate_baffle_block(
        block: &BaffleBlock,
        base_elevation: f64,
        channel_tangent: &NaVec3,
    ) -> BaffleBlockGeometry {
        let mut vertices = Vec::with_capacity(24);
        let mut indices = Vec::with_capacity(36);
        let mut normals = Vec::with_capacity(24);

        // Calcular sistema de coordenadas local
        let up = NaVec3::new(0.0, 0.0, 1.0);
        let _right = channel_tangent.cross(&up).normalize();
        let _forward = *channel_tangent;

        // Centro del bloque en planta
        let center_x = block.x_offset;
        let center_y = block.y_position;
        let center_z = base_elevation;

        // Dimensiones
        let hw = block.width / 2.0; // Half width (transversal)
        let ht = block.thickness / 2.0; // Half thickness (longitudinal)
        let h = block.height;

        // Generar 8 vértices del cubo
        // Esquinas: (±hw, ±ht, 0 o h)
        let corners = [
            // Fondo (z = 0)
            (-hw, -ht, 0.0), // 0: izq-atrás-abajo
            (hw, -ht, 0.0),  // 1: der-atrás-abajo
            (hw, ht, 0.0),   // 2: der-adelante-abajo
            (-hw, ht, 0.0),  // 3: izq-adelante-abajo
            // Arriba (z = h)
            (-hw, -ht, h), // 4: izq-atrás-arriba
            (hw, -ht, h),  // 5: der-atrás-arriba
            (hw, ht, h),   // 6: der-adelante-arriba
            (-hw, ht, h),  // 7: izq-adelante-arriba
        ];

        // Transformar esquinas al sistema de coordenadas del canal
        let transformed_corners: Vec<[f64; 3]> = corners
            .iter()
            .map(|(x, y, z)| {
                let world_x = center_x + x * 1.0; // x es transversal, ya está en coordenadas del canal
                let world_y = center_y + y * 1.0; // y es longitudinal
                let world_z = center_z + z; // z es vertical
                [world_x, world_y, world_z]
            })
            .collect();

        // Caras del cubo (6 caras, 2 triángulos cada una)
        // Cada cara necesita 4 vértices con normales correctas

        // Cara frontal (hacia aguas arriba, +y)
        let front_normal = [0.0, 1.0, 0.0];
        Self::add_quad_face(
            &mut vertices,
            &mut indices,
            &mut normals,
            transformed_corners[3],
            transformed_corners[2],
            transformed_corners[6],
            transformed_corners[7],
            front_normal,
        );

        // Cara trasera (hacia aguas abajo, -y)
        let back_normal = [0.0, -1.0, 0.0];
        Self::add_quad_face(
            &mut vertices,
            &mut indices,
            &mut normals,
            transformed_corners[1],
            transformed_corners[0],
            transformed_corners[4],
            transformed_corners[5],
            back_normal,
        );

        // Cara izquierda (-x)
        let left_normal = [-1.0, 0.0, 0.0];
        Self::add_quad_face(
            &mut vertices,
            &mut indices,
            &mut normals,
            transformed_corners[0],
            transformed_corners[3],
            transformed_corners[7],
            transformed_corners[4],
            left_normal,
        );

        // Cara derecha (+x)
        let right_normal = [1.0, 0.0, 0.0];
        Self::add_quad_face(
            &mut vertices,
            &mut indices,
            &mut normals,
            transformed_corners[2],
            transformed_corners[1],
            transformed_corners[5],
            transformed_corners[6],
            right_normal,
        );

        // Cara superior (+z)
        let top_normal = [0.0, 0.0, 1.0];
        Self::add_quad_face(
            &mut vertices,
            &mut indices,
            &mut normals,
            transformed_corners[7],
            transformed_corners[6],
            transformed_corners[5],
            transformed_corners[4],
            top_normal,
        );

        // Cara inferior (-z) - normalmente no visible
        let bottom_normal = [0.0, 0.0, -1.0];
        Self::add_quad_face(
            &mut vertices,
            &mut indices,
            &mut normals,
            transformed_corners[0],
            transformed_corners[1],
            transformed_corners[2],
            transformed_corners[3],
            bottom_normal,
        );

        BaffleBlockGeometry {
            vertices,
            indices,
            normals,
        }
    }

    /// Agregar una cara cuadrilateral (2 triángulos) al mesh
    fn add_quad_face(
        vertices: &mut Vec<[f64; 3]>,
        indices: &mut Vec<u32>,
        normals: &mut Vec<[f64; 3]>,
        v0: [f64; 3],
        v1: [f64; 3],
        v2: [f64; 3],
        v3: [f64; 3],
        normal: [f64; 3],
    ) {
        let base = vertices.len() as u32;

        vertices.push(v0);
        vertices.push(v1);
        vertices.push(v2);
        vertices.push(v3);

        normals.push(normal);
        normals.push(normal);
        normals.push(normal);
        normals.push(normal);

        // Dos triángulos: 0-1-2 y 0-2-3
        indices.push(base);
        indices.push(base + 1);
        indices.push(base + 2);

        indices.push(base);
        indices.push(base + 2);
        indices.push(base + 3);
    }

    /// Generar geometría de una fila completa de dados
    pub fn generate_baffle_row(
        row: &BaffleRow,
        base_elevation: f64,
        channel_tangent: &NaVec3,
    ) -> BaffleBlockGeometry {
        let mut combined = BaffleBlockGeometry {
            vertices: Vec::new(),
            indices: Vec::new(),
            normals: Vec::new(),
        };

        for block in &row.blocks {
            let block_geo = Self::generate_baffle_block(block, base_elevation, channel_tangent);
            Self::merge_geometries(&mut combined, &block_geo);
        }

        combined
    }

    /// Generar geometría de un chute block
    pub fn generate_chute_block(
        block: &ChuteBlock,
        base_elevation: f64,
        channel_tangent: &NaVec3,
    ) -> BaffleBlockGeometry {
        // Convertir ChuteBlock a BaffleBlock para reutilizar la generación
        let baffle = BaffleBlock {
            width: block.width,
            height: block.height,
            thickness: block.thickness,
            shape: BaffleBlockShape::Rectangular,
            x_offset: block.x_offset,
            y_position: 0.0, // Chute blocks están al inicio
        };

        Self::generate_baffle_block(&baffle, base_elevation, channel_tangent)
    }

    /// Generar geometría completa de un tanque amortiguador
    ///
    /// Incluye:
    /// - Chute blocks al inicio
    /// - Filas de baffle blocks
    /// - End sill al final
    ///
    /// # Argumentos
    /// - `basin`: Diseño del tanque amortiguador
    /// - `basin_start_station`: Estación de inicio del tanque
    /// - `basin_invert_elevation`: Elevación del fondo del tanque
    /// - `channel_tangent`: Vector tangente del canal
    pub fn generate_stilling_basin(
        basin: &StillingBasinDesign,
        basin_start_station: f64,
        basin_invert_elevation: f64,
        channel_tangent: &NaVec3,
    ) -> BaffleBlockGeometry {
        let mut combined = BaffleBlockGeometry {
            vertices: Vec::new(),
            indices: Vec::new(),
            normals: Vec::new(),
        };

        // Generar chute blocks (al inicio del tanque)
        for chute_block in &basin.chute_blocks {
            let geo =
                Self::generate_chute_block(chute_block, basin_invert_elevation, channel_tangent);
            Self::merge_geometries(&mut combined, &geo);
        }

        // Generar baffle rows
        for row in &basin.baffle_rows {
            // Ajustar la posición Y de los bloques relativa al inicio del tanque
            let adjusted_row = BaffleRow {
                blocks: row
                    .blocks
                    .iter()
                    .map(|b| {
                        let mut block = b.clone();
                        block.y_position = basin_start_station + row.distance_from_toe;
                        block
                    })
                    .collect(),
                distance_from_toe: row.distance_from_toe,
                row_index: row.row_index,
            };

            let row_geo =
                Self::generate_baffle_row(&adjusted_row, basin_invert_elevation, channel_tangent);
            Self::merge_geometries(&mut combined, &row_geo);
        }

        // Generar end sill
        match &basin.end_sill {
            crate::structures::EndSillType::Solid { height } => {
                let sill_block = BaffleBlock {
                    width: basin.channel_width,
                    height: *height,
                    thickness: 0.3, // Espesor típico del umbral
                    shape: BaffleBlockShape::Rectangular,
                    x_offset: 0.0,
                    y_position: basin_start_station + basin.length,
                };
                let sill_geo = Self::generate_baffle_block(
                    &sill_block,
                    basin_invert_elevation,
                    channel_tangent,
                );
                Self::merge_geometries(&mut combined, &sill_geo);
            }
            crate::structures::EndSillType::Dentated {
                tooth_height,
                tooth_width,
                tooth_spacing,
            } => {
                // Generar dientes individuales
                let num_teeth = (basin.channel_width / (tooth_width + tooth_spacing)) as usize;
                let start_x = -basin.channel_width / 2.0 + tooth_spacing / 2.0 + tooth_width / 2.0;

                for i in 0..num_teeth {
                    let x = start_x + i as f64 * (tooth_width + tooth_spacing);
                    if x > basin.channel_width / 2.0 - tooth_width / 2.0 {
                        break;
                    }

                    let tooth = BaffleBlock {
                        width: *tooth_width,
                        height: *tooth_height,
                        thickness: 0.2,
                        shape: BaffleBlockShape::Rectangular,
                        x_offset: x,
                        y_position: basin_start_station + basin.length,
                    };
                    let tooth_geo = Self::generate_baffle_block(
                        &tooth,
                        basin_invert_elevation,
                        channel_tangent,
                    );
                    Self::merge_geometries(&mut combined, &tooth_geo);
                }
            }
            crate::structures::EndSillType::None => {}
        }

        combined
    }

    /// Combinar dos geometrías en una sola
    pub fn merge_geometries(target: &mut BaffleBlockGeometry, source: &BaffleBlockGeometry) {
        let base_idx = target.vertices.len() as u32;

        target.vertices.extend_from_slice(&source.vertices);
        target.normals.extend_from_slice(&source.normals);

        for idx in &source.indices {
            target.indices.push(base_idx + idx);
        }
    }
}

// ============================================================================
// INTEGRATED CORRIDOR WITH DISSIPATORS
// ============================================================================

/// Resultado completo de geometría del corridor con disipadores
///
/// Separa la geometría del canal de la geometría de los disipadores
/// para permitir diferentes materiales/colores en el renderer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorridorWithDissipators {
    /// Geometría del canal (paredes, losa, tapas)
    pub channel: CorridorResult,

    /// Geometría de todos los disipadores combinados
    pub dissipators: Option<BaffleBlockGeometry>,

    /// Geometría de cada transición con sus dados (para coloreo individual)
    pub transition_dissipators: Vec<TransitionDissipatorGeometry>,

    /// Geometría de tanques amortiguadores
    pub stilling_basins: Vec<StillingBasinGeometry>,
}

/// Geometría de disipadores en una transición específica
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionDissipatorGeometry {
    /// Estación de inicio de la transición
    pub start_station: f64,

    /// Estación de fin de la transición
    pub end_station: f64,

    /// Geometría de los dados en esta transición
    pub geometry: BaffleBlockGeometry,
}

/// Geometría de un tanque amortiguador específico
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StillingBasinGeometry {
    /// Estación de inicio del tanque
    pub start_station: f64,

    /// Longitud del tanque
    pub length: f64,

    /// Tipo de tanque USBR
    pub basin_type: String,

    /// Geometría completa del tanque (chute blocks + baffles + end sill)
    pub geometry: BaffleBlockGeometry,
}

impl CorridorGenerator {
    /// Generar geometría completa del corridor incluyendo disipadores de energía
    ///
    /// Este método genera:
    /// 1. La geometría del canal (paredes, losa, tapas)
    /// 2. Los dados amortiguadores de las transiciones
    /// 3. Los tanques amortiguadores completos
    ///
    /// La geometría se separa para permitir diferentes materiales en el renderer.
    pub fn generate_with_dissipators(
        corridor: &Corridor,
        resolution: f64,
    ) -> Result<CorridorWithDissipators> {
        // Generar geometría del canal
        let channel = Self::generate(corridor, resolution)?;

        // Recolectar geometría de disipadores
        let mut all_dissipators = BaffleBlockGeometry {
            vertices: Vec::new(),
            indices: Vec::new(),
            normals: Vec::new(),
        };
        let mut transition_dissipators = Vec::new();
        let mut stilling_basins = Vec::new();

        // Procesar transiciones con dados amortiguadores
        for transition in &corridor.transitions {
            // Verificar si la transición tiene dados
            if !transition.baffle_rows.is_empty() {
                let mut transition_geo = BaffleBlockGeometry {
                    vertices: Vec::new(),
                    indices: Vec::new(),
                    normals: Vec::new(),
                };

                // Obtener tangente del canal en la posición de la transición
                let mid_station = (transition.start_station + transition.end_station) / 2.0;
                let tangent = corridor.alignment.tangent_at(mid_station);
                let base_elevation = corridor.alignment.elevation_at(mid_station);

                // Generar geometría de cada fila de dados
                for row in &transition.baffle_rows {
                    // Ajustar posición Y al sistema de coordenadas del canal
                    let adjusted_row = crate::structures::BaffleRow {
                        blocks: row
                            .blocks
                            .iter()
                            .map(|b| {
                                let mut block = b.clone();
                                // La posición Y del bloque es relativa al inicio de la transición
                                block.y_position = transition.start_station + row.distance_from_toe;
                                block
                            })
                            .collect(),
                        distance_from_toe: row.distance_from_toe,
                        row_index: row.row_index,
                    };

                    let row_geo = DissipatorGeometryGenerator::generate_baffle_row(
                        &adjusted_row,
                        base_elevation,
                        &tangent.into_inner(),
                    );
                    DissipatorGeometryGenerator::merge_geometries(&mut transition_geo, &row_geo);
                }

                // Agregar al total
                DissipatorGeometryGenerator::merge_geometries(
                    &mut all_dissipators,
                    &transition_geo,
                );

                transition_dissipators.push(TransitionDissipatorGeometry {
                    start_station: transition.start_station,
                    end_station: transition.end_station,
                    geometry: transition_geo,
                });
            }

            // Verificar si la transición tiene tanque amortiguador
            if let Some(basin) = &transition.stilling_basin {
                let tangent = corridor.alignment.tangent_at(transition.end_station);
                let basin_start = transition.end_station;
                let base_elevation = corridor.alignment.elevation_at(basin_start) - basin.depth;

                let basin_geo = DissipatorGeometryGenerator::generate_stilling_basin(
                    basin,
                    basin_start,
                    base_elevation,
                    &tangent.into_inner(),
                );

                DissipatorGeometryGenerator::merge_geometries(&mut all_dissipators, &basin_geo);

                stilling_basins.push(StillingBasinGeometry {
                    start_station: basin_start,
                    length: basin.length,
                    basin_type: format!("{:?}", basin.basin_type),
                    geometry: basin_geo,
                });
            }
        }

        // Si no hay disipadores, devolver None
        let dissipators = if all_dissipators.vertices.is_empty() {
            None
        } else {
            Some(all_dissipators)
        };

        Ok(CorridorWithDissipators {
            channel,
            dissipators,
            transition_dissipators,
            stilling_basins,
        })
    }
}
