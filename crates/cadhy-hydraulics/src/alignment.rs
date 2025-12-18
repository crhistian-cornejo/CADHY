//! Alignment Engine - Motor de Alineamientos para Canales
//!
//! Maneja la geometria del eje del canal incluyendo:
//! - Puntos de Interseccion (PIs) con radios de curvatura
//! - Curvas horizontales y tangentes
//! - Perfil longitudinal con pendientes
//! - Interpolacion de posiciones a lo largo del eje

use crate::{ElementId, HydraulicError, NaVec3, Point3, Result};
use nalgebra::Unit;
use serde::{Deserialize, Serialize};

/// Punto de Interseccion (PI) en el alineamiento horizontal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlignmentPI {
    /// Identificador unico
    pub id: ElementId,

    /// Estacion/progresiva en metros desde el inicio
    pub station: f64,

    /// Posicion 3D del PI
    pub position: Point3,

    /// Radio de curvatura en este PI (None = tangente/esquina)
    pub radius: Option<f64>,

    /// Peralte/superelevacion (%)
    #[serde(default)]
    pub superelevation: f64,
}

impl AlignmentPI {
    /// Crear nuevo PI
    pub fn new(station: f64, position: Point3, radius: Option<f64>) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            position,
            radius,
            superelevation: 0.0,
        }
    }

    /// Crear PI en origen
    pub fn origin() -> Self {
        Self::new(0.0, Point3::origin(), None)
    }
}

/// Tipo de segmento geometrico
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum SegmentType {
    /// Segmento recto (tangente)
    Tangent,
    /// Arco circular
    Curve,
}

/// Segmento individual del alineamiento
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlignmentSegment {
    /// Tipo de segmento
    pub segment_type: SegmentType,

    /// Estacion de inicio
    pub start_station: f64,

    /// Estacion de fin
    pub end_station: f64,

    /// Punto de inicio
    pub start_point: Point3,

    /// Punto de fin
    pub end_point: Point3,

    /// Longitud del segmento
    pub length: f64,

    /// Centro de la curva (solo para curvas)
    pub center: Option<Point3>,

    /// Radio de la curva (solo para curvas)
    pub radius: Option<f64>,

    /// Angulo de deflexion (solo para curvas)
    pub deflection_angle: Option<f64>,
}

/// Cambio de pendiente longitudinal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlopeChange {
    /// Estacion donde cambia la pendiente
    pub station: f64,

    /// Nueva pendiente (m/m, positivo = ascendente)
    pub slope: f64,

    /// Longitud de transicion vertical (curva parabolica)
    pub transition_length: f64,
}

/// Alineamiento completo del canal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alignment {
    /// Identificador unico
    pub id: ElementId,

    /// Nombre descriptivo
    pub name: String,

    /// Puntos de interseccion que definen el eje
    pub pis: Vec<AlignmentPI>,

    /// Elevacion inicial (cota de rasante al inicio)
    pub start_elevation: f64,

    /// Pendiente longitudinal base (m/m)
    pub base_slope: f64,

    /// Cambios de pendiente a lo largo del alineamiento
    #[serde(default)]
    pub slope_changes: Vec<SlopeChange>,

    /// Segmentos calculados (tangentes y curvas)
    #[serde(skip)]
    segments: Vec<AlignmentSegment>,

    /// Longitud total calculada
    #[serde(skip)]
    total_length: f64,
}

impl Default for Alignment {
    fn default() -> Self {
        Self {
            id: ElementId::new_v4(),
            name: "New Alignment".to_string(),
            pis: vec![
                AlignmentPI::new(0.0, Point3::new(0.0, 0.0, 0.0), None),
                AlignmentPI::new(100.0, Point3::new(100.0, 0.0, 0.0), None),
            ],
            start_elevation: 100.0,
            base_slope: -0.001, // 0.1% descendente
            slope_changes: Vec::new(),
            segments: Vec::new(),
            total_length: 100.0,
        }
    }
}

impl Alignment {
    /// Crear nuevo alineamiento con PIs dados
    pub fn new(name: impl Into<String>, pis: Vec<AlignmentPI>) -> Result<Self> {
        if pis.len() < 2 {
            return Err(HydraulicError::Alignment(
                "Alignment requires at least 2 PIs".to_string(),
            ));
        }

        let mut alignment = Self {
            id: ElementId::new_v4(),
            name: name.into(),
            pis,
            start_elevation: 100.0,
            base_slope: -0.001,
            slope_changes: Vec::new(),
            segments: Vec::new(),
            total_length: 0.0,
        };

        alignment.compute_geometry()?;
        Ok(alignment)
    }

    /// Crear alineamiento recto simple
    pub fn straight(name: impl Into<String>, start: Point3, end: Point3) -> Result<Self> {
        let length = (end - start).norm();
        let pis = vec![
            AlignmentPI::new(0.0, start, None),
            AlignmentPI::new(length, end, None),
        ];
        Self::new(name, pis)
    }

    /// Calcular geometria (segmentos) a partir de los PIs
    pub fn compute_geometry(&mut self) -> Result<()> {
        self.segments.clear();

        if self.pis.len() < 2 {
            return Err(HydraulicError::Alignment("Need at least 2 PIs".to_string()));
        }

        let mut current_station = 0.0;

        // Para alineamiento simple de 2 puntos
        if self.pis.len() == 2 {
            let start = &self.pis[0];
            let end = &self.pis[1];
            let length = (end.position - start.position).norm();

            self.segments.push(AlignmentSegment {
                segment_type: SegmentType::Tangent,
                start_station: 0.0,
                end_station: length,
                start_point: start.position,
                end_point: end.position,
                length,
                center: None,
                radius: None,
                deflection_angle: None,
            });

            self.total_length = length;
            return Ok(());
        }

        // Para 3+ PIs: calcular tangentes y curvas
        for i in 0..self.pis.len() {
            if i == 0 {
                // Primer punto - solo marca el inicio
                continue;
            }

            let prev = &self.pis[i - 1];
            let curr = &self.pis[i];

            if i == self.pis.len() - 1 {
                // Ultimo punto - tangente final
                let length = (curr.position - prev.position).norm();
                self.segments.push(AlignmentSegment {
                    segment_type: SegmentType::Tangent,
                    start_station: current_station,
                    end_station: current_station + length,
                    start_point: prev.position,
                    end_point: curr.position,
                    length,
                    center: None,
                    radius: None,
                    deflection_angle: None,
                });
                current_station += length;
            } else {
                // PI intermedio - puede tener curva
                let next = &self.pis[i + 1];

                // Vectores de direccion
                let v1 = (curr.position - prev.position).normalize();
                let v2 = (next.position - curr.position).normalize();

                // Angulo de deflexion
                let cos_angle = v1.dot(&v2).clamp(-1.0, 1.0);
                let deflection = cos_angle.acos();

                if let Some(radius) = curr.radius {
                    if radius > 0.0 && deflection > 0.001 {
                        // Calcular curva
                        let tangent_length = radius * (deflection / 2.0).tan();

                        // PC (Principio de Curva)
                        let pc = curr.position - v1 * tangent_length;
                        // PT (Principio de Tangente)
                        let pt = curr.position + v2 * tangent_length;

                        // Tangente antes de la curva
                        let tangent_to_pc = (pc - prev.position).norm();
                        if tangent_to_pc > 0.01 {
                            self.segments.push(AlignmentSegment {
                                segment_type: SegmentType::Tangent,
                                start_station: current_station,
                                end_station: current_station + tangent_to_pc,
                                start_point: prev.position,
                                end_point: pc,
                                length: tangent_to_pc,
                                center: None,
                                radius: None,
                                deflection_angle: None,
                            });
                            current_station += tangent_to_pc;
                        }

                        // Curva
                        let curve_length = radius * deflection;
                        let up = NaVec3::new(0.0, 0.0, 1.0);
                        let perp = v1.cross(&up);
                        let turn_dir = if v1.cross(&v2).z > 0.0 { 1.0 } else { -1.0 };
                        let center = pc + perp * radius * turn_dir;

                        self.segments.push(AlignmentSegment {
                            segment_type: SegmentType::Curve,
                            start_station: current_station,
                            end_station: current_station + curve_length,
                            start_point: pc,
                            end_point: pt,
                            length: curve_length,
                            center: Some(Point3::from(center)),
                            radius: Some(radius),
                            deflection_angle: Some(deflection),
                        });
                        current_station += curve_length;
                    }
                } else {
                    // Sin curva - tangente directa
                    let length = (curr.position - prev.position).norm();
                    self.segments.push(AlignmentSegment {
                        segment_type: SegmentType::Tangent,
                        start_station: current_station,
                        end_station: current_station + length,
                        start_point: prev.position,
                        end_point: curr.position,
                        length,
                        center: None,
                        radius: None,
                        deflection_angle: None,
                    });
                    current_station += length;
                }
            }
        }

        self.total_length = current_station;
        Ok(())
    }

    /// Longitud total del alineamiento
    pub fn total_length(&self) -> f64 {
        self.total_length
    }

    /// Obtener segmentos calculados
    pub fn segments(&self) -> &[AlignmentSegment] {
        &self.segments
    }

    /// Obtener posicion 3D en una estacion dada (interpolacion horizontal)
    pub fn position_at(&self, station: f64) -> Point3 {
        // Buscar el segmento que contiene esta estacion
        for segment in &self.segments {
            if station >= segment.start_station && station <= segment.end_station {
                let t = (station - segment.start_station) / segment.length;

                return match segment.segment_type {
                    SegmentType::Tangent => {
                        // Interpolacion lineal
                        segment.start_point + (segment.end_point - segment.start_point) * t
                    }
                    SegmentType::Curve => {
                        // Interpolacion sobre arco (aproximacion con Bezier cuadratica)
                        if let (Some(center), Some(radius)) = (segment.center, segment.radius) {
                            // Angulo inicial y final
                            let start_vec = segment.start_point - center;
                            let start_angle = start_vec.y.atan2(start_vec.x);
                            let angle_delta = segment.deflection_angle.unwrap_or(0.0) * t.signum();
                            let current_angle = start_angle + angle_delta * t;

                            Point3::new(
                                center.x + radius * current_angle.cos(),
                                center.y + radius * current_angle.sin(),
                                segment.start_point.z
                                    + (segment.end_point.z - segment.start_point.z) * t,
                            )
                        } else {
                            // Fallback a lineal
                            segment.start_point + (segment.end_point - segment.start_point) * t
                        }
                    }
                };
            }
        }

        // Si la estacion esta fuera de rango, extrapolar desde el ultimo punto
        if station > self.total_length {
            if let Some(last) = self.segments.last() {
                let direction = (last.end_point - last.start_point).normalize();
                return last.end_point + direction * (station - last.end_station);
            }
        }

        // Default al primer punto
        self.pis
            .first()
            .map(|p| p.position)
            .unwrap_or(Point3::origin())
    }

    /// Obtener direccion tangente en una estacion
    pub fn tangent_at(&self, station: f64) -> Unit<NaVec3> {
        for segment in &self.segments {
            if station >= segment.start_station && station <= segment.end_station {
                let direction = (segment.end_point - segment.start_point).normalize();
                return Unit::new_normalize(direction);
            }
        }

        // Default: direccion X positiva
        Unit::new_normalize(NaVec3::new(1.0, 0.0, 0.0))
    }

    /// Obtener elevacion en una estacion (perfil longitudinal)
    pub fn elevation_at(&self, station: f64) -> f64 {
        let mut elevation = self.start_elevation;
        let mut current_station = 0.0;
        let mut current_slope = self.base_slope;

        // Aplicar pendiente base y cambios de pendiente
        for slope_change in &self.slope_changes {
            if station <= slope_change.station {
                // Calcular elevacion hasta este punto con pendiente actual
                elevation += (station - current_station) * current_slope;
                return elevation;
            }

            // Calcular elevacion hasta el cambio de pendiente
            elevation += (slope_change.station - current_station) * current_slope;
            current_station = slope_change.station;
            current_slope = slope_change.slope;
        }

        // Continuar con la ultima pendiente
        elevation += (station - current_station) * current_slope;
        elevation
    }

    /// Obtener posicion 3D completa (horizontal + elevacion)
    pub fn position_3d_at(&self, station: f64) -> Point3 {
        let mut pos = self.position_at(station);
        pos.z = self.elevation_at(station);
        pos
    }

    /// Generar polylinea discreta del alineamiento
    pub fn to_polyline(&self, resolution: f64) -> Vec<Point3> {
        let num_points = (self.total_length / resolution).ceil() as usize + 1;
        let mut points = Vec::with_capacity(num_points);

        for i in 0..num_points {
            let station = (i as f64 * resolution).min(self.total_length);
            points.push(self.position_3d_at(station));
        }

        points
    }

    /// Agregar PI al alineamiento
    pub fn add_pi(&mut self, pi: AlignmentPI) -> Result<()> {
        self.pis.push(pi);
        self.pis.sort_by(|a, b| {
            a.station
                .partial_cmp(&b.station)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        self.compute_geometry()
    }

    /// Establecer pendiente base
    pub fn set_base_slope(&mut self, slope: f64) {
        self.base_slope = slope;
    }

    /// Agregar cambio de pendiente
    pub fn add_slope_change(&mut self, change: SlopeChange) {
        self.slope_changes.push(change);
        self.slope_changes.sort_by(|a, b| {
            a.station
                .partial_cmp(&b.station)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
}
