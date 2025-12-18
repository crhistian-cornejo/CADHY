//! GVF Analysis Module - Flujo Gradualmente Variado
//!
//! Implementa el calculo completo de perfiles de flujo gradualmente variado (GVF)
//! usando el Metodo del Paso Estandar (Standard Step Method).
//!
//! # Caracteristicas:
//! - Standard Step Method con iteracion de energia
//! - Manejo de transiciones entre secciones
//! - Deteccion automatica de regimen de flujo
//! - Soporte para estructuras (caidas, vertederos)
//! - Interpolacion de secciones prismaticas y no-prismaticas
//!
//! # Referencia:
//! - Chow, V.T. (1959) Open-Channel Hydraulics
//! - Henderson, F.M. (1966) Open Channel Flow
//! - USBR Design of Small Dams

use crate::sections::{HydraulicProperties, SectionType, StationSection};
use crate::structures::{Drop, Weir};
use crate::{HydraulicError, Result, G};
use serde::{Deserialize, Serialize};

// =============================================================================
// CONFIGURATION
// =============================================================================

/// Configuracion para el analisis GVF
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GvfConfig {
    /// Intervalo de estaciones para calculo (m)
    pub step_size: f64,

    /// Tolerancia para convergencia (m)
    pub tolerance: f64,

    /// Maximo de iteraciones por paso
    pub max_iterations: usize,

    /// Factor de relajacion para convergencia
    pub relaxation_factor: f64,

    /// Coeficiente de perdida en transiciones de contraccion
    pub contraction_coefficient: f64,

    /// Coeficiente de perdida en transiciones de expansion
    pub expansion_coefficient: f64,

    /// Incluir perdidas por friccion de Manning
    pub include_friction_losses: bool,

    /// Incluir perdidas en transiciones
    pub include_transition_losses: bool,

    /// Minimo de profundidad permitido (evitar singularidades)
    pub min_depth: f64,

    /// Velocidad máxima permitida (m/s) - evita picos irreales en transiciones
    /// Si la velocidad calculada excede este valor, se limita y ajusta la profundidad
    pub max_velocity: f64,
}

impl Default for GvfConfig {
    fn default() -> Self {
        Self {
            step_size: 1.0,               // 1 metro
            tolerance: 0.001,             // 1 mm
            max_iterations: 50,           // Iteraciones
            relaxation_factor: 0.7,       // Sub-relajacion
            contraction_coefficient: 0.1, // Ke para contraccion
            expansion_coefficient: 0.3,   // Ke para expansion
            include_friction_losses: true,
            include_transition_losses: true,
            min_depth: 0.001,   // 1 mm minimo
            max_velocity: 12.0, // 12 m/s - límite razonable para canales abiertos
        }
    }
}

// =============================================================================
// INPUT STRUCTURES
// =============================================================================

/// Elemento del sistema de canales para analisis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelReach {
    /// ID del elemento (nodo del grafo)
    pub id: String,

    /// Estacion inicial (m)
    pub start_station: f64,

    /// Estacion final (m)
    pub end_station: f64,

    /// Seccion transversal
    pub section: SectionType,

    /// Coeficiente de Manning
    pub manning_n: f64,

    /// Pendiente del fondo (m/m), positiva = descendente
    pub slope: f64,

    /// Elevacion del fondo al inicio (m)
    pub start_elevation: f64,

    /// Elevacion del fondo al final (m) - opcional, para transiciones con invertDrop
    /// Si es None, se calcula usando start_elevation - slope * length
    pub end_elevation: Option<f64>,

    /// Tipo de elemento
    pub element_type: ChannelElementType,
}

impl ChannelReach {
    /// Longitud del tramo
    pub fn length(&self) -> f64 {
        (self.end_station - self.start_station).abs()
    }

    /// Elevacion del fondo en una estacion dada
    ///
    /// Si `end_elevation` está definido, interpola linealmente entre start y end.
    /// Esto es importante para transiciones con invertDrop que tienen elevaciones
    /// diferentes al inicio y final que no siguen la pendiente uniforme.
    pub fn bed_elevation_at(&self, station: f64) -> f64 {
        match self.end_elevation {
            Some(end_elev) => {
                // Interpolación lineal entre elevaciones de inicio y fin
                let length = self.length();
                if length <= 0.0 {
                    return self.start_elevation;
                }
                let t = ((station - self.start_station) / length).clamp(0.0, 1.0);
                self.start_elevation + t * (end_elev - self.start_elevation)
            }
            None => {
                // Comportamiento original: usar pendiente
                let delta_x = station - self.start_station;
                self.start_elevation - self.slope * delta_x
            }
        }
    }

    /// Obtener la sección transversal en una estación dada
    ///
    /// Para tramos de canal normal, retorna la sección constante.
    /// Para transiciones, interpola entre las secciones upstream y downstream.
    pub fn section_at(&self, station: f64) -> SectionType {
        match &self.element_type {
            ChannelElementType::Channel => self.section.clone(),
            ChannelElementType::Transition {
                upstream_section,
                downstream_section,
            } => {
                // Calcular factor de interpolación t ∈ [0, 1]
                let length = self.length();
                if length <= 0.0 {
                    return self.section.clone();
                }

                let distance_from_start = (station - self.start_station).clamp(0.0, length);
                let t = distance_from_start / length;

                // Interpolar entre secciones upstream (t=0) y downstream (t=1)
                SectionType::interpolate(upstream_section, downstream_section, t)
            }
            // Para Drop y Weir, usar la sección base
            ChannelElementType::Drop(_) | ChannelElementType::Weir(_) => self.section.clone(),
        }
    }

    /// Verificar si este tramo es una transición
    pub fn is_transition(&self) -> bool {
        matches!(self.element_type, ChannelElementType::Transition { .. })
    }
}

/// Tipo de elemento del canal
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ChannelElementType {
    /// Tramo de canal normal
    Channel,
    /// Transicion entre secciones
    Transition {
        /// Seccion aguas arriba
        upstream_section: Box<SectionType>,
        /// Seccion aguas abajo
        downstream_section: Box<SectionType>,
    },
    /// Caida/rapida
    Drop(Drop),
    /// Vertedero
    Weir(Weir),
}

/// Sistema completo de canales para analisis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelSystem {
    /// Nombre del sistema
    pub name: String,

    /// Caudal de diseno (m³/s)
    pub design_discharge: f64,

    /// Tramos del sistema en orden (aguas arriba -> aguas abajo)
    pub reaches: Vec<ChannelReach>,

    /// Condicion de control aguas abajo
    pub downstream_control: DownstreamControl,
}

/// Condicion de control aguas abajo
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DownstreamControl {
    /// Profundidad conocida (m)
    KnownDepth(f64),
    /// Profundidad normal (flujo uniforme)
    NormalDepth,
    /// Profundidad critica
    CriticalDepth,
    /// Vertedero con carga H (m)
    WeirControl { head: f64 },
    /// Nivel de agua conocido (elevacion absoluta)
    WaterSurfaceElevation(f64),
}

// =============================================================================
// OUTPUT STRUCTURES
// =============================================================================

/// Resultado en una estacion del perfil
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GvfStation {
    /// Estacion (m)
    pub station: f64,

    /// ID del elemento al que pertenece
    pub element_id: String,

    /// Elevacion del fondo (m)
    pub bed_elevation: f64,

    /// Profundidad de agua (m)
    pub water_depth: f64,

    /// Elevacion de superficie de agua (m)
    pub water_surface_elevation: f64,

    /// Linea de energia (m)
    pub energy_grade_line: f64,

    /// Velocidad (m/s)
    pub velocity: f64,

    /// Area mojada (m²)
    pub area: f64,

    /// Perimetro mojado (m)
    pub wetted_perimeter: f64,

    /// Radio hidraulico (m)
    pub hydraulic_radius: f64,

    /// Ancho superficial (m)
    pub top_width: f64,

    /// Numero de Froude
    pub froude: f64,

    /// Regimen de flujo
    pub flow_regime: FlowRegimeType,

    /// Energia especifica (m)
    pub specific_energy: f64,

    /// Profundidad normal para este tramo (m)
    pub normal_depth: f64,

    /// Profundidad critica para este tramo (m)
    pub critical_depth: f64,

    /// Bordo libre (m)
    pub freeboard: f64,

    /// Perdida de carga desde estacion anterior (m)
    pub head_loss: f64,

    /// Tipo de perfil GVF (M1, M2, S1, etc.)
    pub profile_type: Option<GvfProfileType>,

    // =========================================================================
    // NUEVOS CAMPOS PROFESIONALES
    // =========================================================================
    /// Pendiente de fricción Sf (m/m) - Manning
    #[serde(default)]
    pub friction_slope: f64,

    /// Momentum específico M = Q²/(gA) + A×ȳ (m³)
    #[serde(default)]
    pub specific_momentum: f64,

    /// Esfuerzo cortante en el lecho τ₀ = ρgRSf (Pa)
    #[serde(default)]
    pub bed_shear_stress: f64,

    /// Velocidad de corte u* = √(τ₀/ρ) (m/s)
    #[serde(default)]
    pub shear_velocity: f64,

    /// Número de Reynolds Re = 4VR/ν (adimensional)
    #[serde(default)]
    pub reynolds_number: f64,

    /// Factor de corrección de energía α (Coriolis) - típicamente 1.0-1.15
    #[serde(default = "default_alpha")]
    pub alpha_coriolis: f64,

    /// Factor de corrección de momentum β (Boussinesq) - típicamente 1.0-1.05
    #[serde(default = "default_beta")]
    pub beta_boussinesq: f64,

    /// Carga de velocidad V²/2g (m)
    #[serde(default)]
    pub velocity_head: f64,

    /// Energía específica crítica Ec (m)
    #[serde(default)]
    pub critical_energy: f64,

    /// Profundidad hidráulica D = A/T (m)
    #[serde(default)]
    pub hydraulic_depth: f64,

    /// Pendiente crítica Sc (m/m)
    #[serde(default)]
    pub critical_slope: f64,

    /// Potencia del flujo P = ρgQSf (W/m)
    #[serde(default)]
    pub stream_power: f64,

    /// Potencia unitaria ω = τ₀V (W/m²)
    #[serde(default)]
    pub unit_stream_power: f64,

    /// Número de Weber We = ρV²L/σ (para análisis de superficie libre)
    #[serde(default)]
    pub weber_number: Option<f64>,

    /// Clasificación detallada del régimen de flujo
    #[serde(default)]
    pub detailed_regime: DetailedFlowRegime,

    /// Factor de resistencia de Darcy-Weisbach f
    #[serde(default)]
    pub darcy_friction_factor: f64,

    /// Coeficiente de Chézy C (m^0.5/s)
    #[serde(default)]
    pub chezy_coefficient: f64,

    /// Distancia a profundidad normal (y - yn) (m)
    #[serde(default)]
    pub depth_to_normal: f64,

    /// Distancia a profundidad crítica (y - yc) (m)
    #[serde(default)]
    pub depth_to_critical: f64,

    /// Gradiente de energía dE/dx (m/m)
    #[serde(default)]
    pub energy_gradient: f64,

    /// Gradiente de superficie de agua dH/dx (m/m)
    #[serde(default)]
    pub water_surface_gradient: f64,
}

fn default_alpha() -> f64 {
    1.0
}
fn default_beta() -> f64 {
    1.0
}

/// Clasificación detallada del régimen de flujo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum DetailedFlowRegime {
    /// Laminar subcrítico (Re < 500, Fr < 1)
    LaminarSubcritical,
    /// Transicional subcrítico (500 < Re < 2000, Fr < 1)
    TransitionalSubcritical,
    /// Turbulento subcrítico (Re > 2000, Fr < 1)
    #[default]
    TurbulentSubcritical,
    /// Flujo crítico (Fr ≈ 1)
    Critical,
    /// Turbulento supercrítico (Re > 2000, Fr > 1)
    TurbulentSupercritical,
    /// Ondas de rodillo (Fr > 2, inestable)
    RollWaves,
    /// Flujo aireado (alta velocidad con entrampamiento de aire)
    AeratedFlow,
}

impl DetailedFlowRegime {
    /// Clasificar régimen basado en Reynolds y Froude
    pub fn classify(reynolds: f64, froude: f64, velocity: f64) -> Self {
        // Verificar condiciones especiales primero
        if velocity > 8.0 {
            return Self::AeratedFlow;
        }
        if froude > 2.0 {
            return Self::RollWaves;
        }

        // Clasificación por Reynolds y Froude
        match (reynolds, froude) {
            (_re, fr) if fr >= 0.95 && fr <= 1.05 => Self::Critical,
            (re, fr) if re < 500.0 && fr < 1.0 => Self::LaminarSubcritical,
            (re, fr) if re < 2000.0 && fr < 1.0 => Self::TransitionalSubcritical,
            (_re, fr) if fr < 1.0 => Self::TurbulentSubcritical,
            (_, fr) if fr > 1.0 => Self::TurbulentSupercritical,
            _ => Self::TurbulentSubcritical,
        }
    }

    /// Descripción en español
    pub fn description_es(&self) -> &'static str {
        match self {
            Self::LaminarSubcritical => "Laminar subcrítico",
            Self::TransitionalSubcritical => "Transicional subcrítico",
            Self::TurbulentSubcritical => "Turbulento subcrítico",
            Self::Critical => "Crítico",
            Self::TurbulentSupercritical => "Turbulento supercrítico",
            Self::RollWaves => "Ondas de rodillo",
            Self::AeratedFlow => "Flujo aireado",
        }
    }
}

/// Tipo de regimen de flujo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FlowRegimeType {
    Subcritical,
    Critical,
    Supercritical,
}

impl FlowRegimeType {
    pub fn from_froude(fr: f64) -> Self {
        if fr < 0.95 {
            Self::Subcritical
        } else if fr > 1.05 {
            Self::Supercritical
        } else {
            Self::Critical
        }
    }
}

/// Clasificacion del perfil GVF
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GvfProfileType {
    // Perfiles en pendiente suave (Mild slope: yn > yc)
    M1, // y > yn > yc - Remanso, flujo subcritico
    M2, // yn > y > yc - Drawdown, flujo subcritico
    M3, // yn > yc > y - Flujo supercritico

    // Perfiles en pendiente pronunciada (Steep slope: yc > yn)
    S1, // y > yc > yn - Remanso aguas arriba de salto
    S2, // yc > y > yn - Drawdown, flujo supercritico
    S3, // yc > yn > y - Flujo supercritico, por debajo de yn

    // Perfiles en pendiente critica (yc = yn)
    C1, // y > yc = yn
    C3, // yc = yn > y

    // Pendiente horizontal (S = 0)
    H2, // yn -> inf, y > yc
    H3, // yn -> inf, y < yc

    // Pendiente adversa (S < 0)
    A2, // y > yc
    A3, // y < yc
}

impl GvfProfileType {
    /// Determinar tipo de perfil basado en profundidades
    pub fn classify(
        water_depth: f64,
        normal_depth: f64,
        critical_depth: f64,
        slope: f64,
    ) -> Option<Self> {
        let y = water_depth;
        let yn = normal_depth;
        let yc = critical_depth;

        if slope < 0.0 {
            // Adverse slope
            if y > yc {
                Some(Self::A2)
            } else {
                Some(Self::A3)
            }
        } else if slope.abs() < 1e-6 {
            // Horizontal
            if y > yc {
                Some(Self::H2)
            } else {
                Some(Self::H3)
            }
        } else if yn > yc {
            // Mild slope
            if y > yn {
                Some(Self::M1)
            } else if y > yc {
                Some(Self::M2)
            } else {
                Some(Self::M3)
            }
        } else if yc > yn {
            // Steep slope
            if y > yc {
                Some(Self::S1)
            } else if y > yn {
                Some(Self::S2)
            } else {
                Some(Self::S3)
            }
        } else {
            // Critical slope (yn ≈ yc)
            if y > yc {
                Some(Self::C1)
            } else {
                Some(Self::C3)
            }
        }
    }
}

/// Zona de transición (contracción o expansión)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransitionZone {
    /// Estación de inicio (m)
    pub start_station: f64,
    /// Estación final (m)
    pub end_station: f64,
    /// Tipo: "contraction" o "expansion"
    pub transition_type: String,
    /// Coeficiente de pérdida aplicado
    pub loss_coefficient: f64,
    /// Pérdida de carga en la zona (m)
    pub head_loss: f64,
    /// Cambio de velocidad (m/s)
    pub velocity_change: f64,
}

/// Información de cavitación
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CavitationInfo {
    /// Riesgo de cavitación detectado
    pub risk_detected: bool,
    /// Estaciones con riesgo
    pub risk_stations: Vec<f64>,
    /// Índice de cavitación mínimo (sigma)
    pub min_cavitation_index: f64,
    /// Velocidad crítica para cavitación (m/s)
    pub critical_velocity: f64,
    /// Descripción del riesgo
    pub description: String,
}

// =============================================================================
// HYDRAULIC JUMP
// =============================================================================

/// Resultado del análisis de salto hidráulico
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HydraulicJump {
    /// Estación donde ocurre el salto (m)
    pub station: f64,
    /// Profundidad antes del salto - supercrítica (m)
    pub upstream_depth: f64,
    /// Profundidad después del salto - subcrítica (m)
    pub downstream_depth: f64,
    /// Número de Froude antes del salto
    pub upstream_froude: f64,
    /// Número de Froude después del salto
    pub downstream_froude: f64,
    /// Pérdida de energía en el salto (m)
    pub energy_loss: f64,
    /// Longitud del salto - USBR: L ≈ 6.1 × y2 (m)
    pub jump_length: f64,
    /// Tipo de salto
    pub jump_type: JumpType,
    /// Eficiencia del salto η = E2/E1
    pub efficiency: f64,
    /// ¿Se requiere tanque amortiguador?
    pub stilling_basin_required: bool,
    /// Longitud recomendada del tanque amortiguador (m)
    pub basin_length: f64,
    /// Elevación de la superficie aguas arriba (m)
    pub upstream_wse: f64,
    /// Elevación de la superficie aguas abajo (m)
    pub downstream_wse: f64,
}

/// Clasificación del salto hidráulico (USBR)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum JumpType {
    /// Fr1 = 1.0-1.7: Ondulaciones superficiales, sin turbulencia significativa
    Undular,
    /// Fr1 = 1.7-2.5: Salto débil con rodillos en superficie, pocas pérdidas
    Weak,
    /// Fr1 = 2.5-4.5: Oscilante e inestable, evitar en diseño
    Oscillating,
    /// Fr1 = 4.5-9.0: Estable y bien definido, óptimo para diseño
    Steady,
    /// Fr1 > 9.0: Muy fuerte, alta disipación pero erosivo
    Strong,
}

impl JumpType {
    /// Clasificar tipo de salto según Froude
    pub fn from_froude(fr: f64) -> Self {
        if fr < 1.7 {
            Self::Undular
        } else if fr < 2.5 {
            Self::Weak
        } else if fr < 4.5 {
            Self::Oscillating
        } else if fr < 9.0 {
            Self::Steady
        } else {
            Self::Strong
        }
    }

    /// Descripción en español
    pub fn description_es(&self) -> &'static str {
        match self {
            Self::Undular => "Ondulante (Fr₁ < 1.7)",
            Self::Weak => "Débil (Fr₁ = 1.7-2.5)",
            Self::Oscillating => "Oscilante (Fr₁ = 2.5-4.5) - Evitar",
            Self::Steady => "Estable (Fr₁ = 4.5-9.0) - Óptimo",
            Self::Strong => "Fuerte (Fr₁ > 9.0) - Erosivo",
        }
    }

    /// ¿Es un salto apropiado para diseño?
    pub fn is_suitable_for_design(&self) -> bool {
        matches!(self, Self::Steady)
    }
}

/// Resumen del analisis GVF
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GvfSummary {
    /// Caudal analizado (m³/s)
    pub discharge: f64,

    /// Estacion inicial (m)
    pub start_station: f64,

    /// Estacion final (m)
    pub end_station: f64,

    /// Numero de estaciones calculadas
    pub station_count: usize,

    /// Profundidad maxima (m)
    pub max_depth: f64,

    /// Profundidad minima (m)
    pub min_depth: f64,

    /// Velocidad maxima (m/s)
    pub max_velocity: f64,

    /// Velocidad minima (m/s)
    pub min_velocity: f64,

    /// Velocidad promedio (m/s)
    pub avg_velocity: f64,

    /// Froude maximo
    pub max_froude: f64,

    /// Froude minimo
    pub min_froude: f64,

    /// Froude promedio
    pub avg_froude: f64,

    /// Energia total entrada (m)
    pub inlet_energy: f64,

    /// Energia total salida (m)
    pub outlet_energy: f64,

    /// Perdida de carga total (m)
    pub total_head_loss: f64,

    /// Pérdida por fricción total (m)
    pub friction_loss: f64,

    /// Pérdida en transiciones total (m)
    pub transition_loss: f64,

    /// Hay cambios de regimen?
    pub has_regime_change: bool,

    /// Estaciones con flujo critico
    pub critical_stations: Vec<f64>,

    /// Bordo libre minimo (m)
    pub min_freeboard: f64,

    /// Profundidad promedio (m)
    pub avg_depth: f64,

    /// Área promedio (m²)
    pub avg_area: f64,

    /// Zonas de transición detectadas
    pub transition_zones: Vec<TransitionZone>,

    /// Información de cavitación
    pub cavitation: CavitationInfo,

    /// Régimen predominante
    pub predominant_regime: String,

    /// Porcentaje de tramos subcríticos
    pub subcritical_percentage: f64,

    /// Porcentaje de tramos supercríticos
    pub supercritical_percentage: f64,

    /// Pendiente hidráulica promedio (m/m)
    pub avg_friction_slope: f64,

    /// Número de Reynolds promedio (adimensional)
    pub avg_reynolds: f64,

    /// Alertas y advertencias
    pub warnings: Vec<String>,
}

/// Resultado completo del analisis GVF
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GvfResult {
    /// Perfil calculado (lista de estaciones)
    pub profile: Vec<GvfStation>,

    /// Resumen del analisis
    pub summary: GvfSummary,

    /// Configuracion usada
    pub config: GvfConfig,

    /// Salto hidráulico detectado (si existe)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hydraulic_jump: Option<HydraulicJump>,
}

// =============================================================================
// ADDITIONAL PARAMETERS HELPER
// =============================================================================

/// Parámetros hidráulicos adicionales calculados para cada estación
#[derive(Debug, Clone)]
struct AdditionalHydraulicParameters {
    pub specific_momentum: f64,
    pub bed_shear_stress: f64,
    pub shear_velocity: f64,
    pub reynolds_number: f64,
    pub alpha_coriolis: f64,
    pub beta_boussinesq: f64,
    pub critical_energy: f64,
    pub critical_slope: f64,
    pub stream_power: f64,
    pub unit_stream_power: f64,
    pub weber_number: Option<f64>,
    pub detailed_regime: DetailedFlowRegime,
    pub darcy_friction_factor: f64,
    pub chezy_coefficient: f64,
    pub energy_gradient: f64,
    pub water_surface_gradient: f64,
}

// =============================================================================
// GVF SOLVER
// =============================================================================

/// Deduplicate stations at reach boundaries.
/// When two consecutive stations are at the same location (within tolerance),
/// this keeps only the second one (which belongs to the downstream reach in normal order).
/// This prevents velocity spikes caused by double-counting junction points.
fn dedup_stations(profile: &mut Vec<GvfStation>) {
    const STATION_TOLERANCE: f64 = 0.001; // 1mm tolerance

    if profile.len() < 2 {
        return;
    }

    // Find indices of duplicate stations (where consecutive stations have same position)
    let mut indices_to_remove = Vec::new();
    for i in 0..profile.len() - 1 {
        if (profile[i].station - profile[i + 1].station).abs() < STATION_TOLERANCE {
            // Keep the second station (belongs to the next reach)
            indices_to_remove.push(i);
        }
    }

    // Remove duplicates (in reverse order to preserve indices)
    for i in indices_to_remove.into_iter().rev() {
        profile.remove(i);
    }
}

/// Motor de calculo GVF
pub struct GvfSolver {
    config: GvfConfig,
}

impl GvfSolver {
    /// Crear nuevo solver con configuracion por defecto
    pub fn new() -> Self {
        Self {
            config: GvfConfig::default(),
        }
    }

    /// Crear solver con configuracion personalizada
    pub fn with_config(config: GvfConfig) -> Self {
        Self { config }
    }

    /// Analizar sistema de canales
    pub fn analyze(&self, system: &ChannelSystem) -> Result<GvfResult> {
        if system.reaches.is_empty() {
            return Err(HydraulicError::Calculation(
                "No channel reaches provided".into(),
            ));
        }

        let q = system.design_discharge;
        if q <= 0.0 {
            return Err(HydraulicError::InvalidParameter(
                "Discharge must be positive".into(),
            ));
        }

        // Determinar direccion de calculo basado en regimen predominante
        let first_reach = &system.reaches[0];
        let yn = self.normal_depth(
            &first_reach.section,
            q,
            first_reach.slope,
            first_reach.manning_n,
        )?;
        let yc = self.critical_depth(&first_reach.section, q)?;

        let is_subcritical = yn > yc;

        // Para flujo subcritico, calcular aguas arriba desde control aguas abajo
        // Para flujo supercritico, calcular aguas abajo desde control aguas arriba
        let profile = if is_subcritical {
            self.compute_upstream(system)?
        } else {
            self.compute_downstream(system)?
        };

        // Detectar salto hidráulico si hay cambio de régimen
        let hydraulic_jump = self.detect_hydraulic_jump(&profile, system);

        // Generar resumen
        let summary = self.generate_summary(&profile, system);

        Ok(GvfResult {
            profile,
            summary,
            config: self.config.clone(),
            hydraulic_jump,
        })
    }

    /// Calcular perfil aguas arriba (flujo subcritico)
    fn compute_upstream(&self, system: &ChannelSystem) -> Result<Vec<GvfStation>> {
        let q = system.design_discharge;
        let mut profile = Vec::new();

        // Obtener condicion inicial aguas abajo
        let last_reach = system.reaches.last().ok_or_else(|| {
            HydraulicError::InvalidParameter("Channel system has no reaches".into())
        })?;
        let mut current_depth = match &system.downstream_control {
            DownstreamControl::KnownDepth(d) => *d,
            DownstreamControl::NormalDepth => self.normal_depth(
                &last_reach.section,
                q,
                last_reach.slope,
                last_reach.manning_n,
            )?,
            DownstreamControl::CriticalDepth => self.critical_depth(&last_reach.section, q)?,
            DownstreamControl::WeirControl { head } => *head,
            DownstreamControl::WaterSurfaceElevation(wse) => {
                let bed = last_reach.bed_elevation_at(last_reach.end_station);
                (*wse - bed).max(self.config.min_depth)
            }
        };

        // Procesar tramos en orden inverso (aguas abajo -> aguas arriba)
        for reach in system.reaches.iter().rev() {
            let reach_profile = self.compute_reach_upstream(reach, q, current_depth)?;

            // Actualizar profundidad para siguiente tramo
            if let Some(first) = reach_profile.first() {
                current_depth = first.water_depth;
            }

            // Agregar puntos al perfil (en orden inverso para luego reversar)
            profile.extend(reach_profile);
        }

        // Reversar para orden natural (aguas arriba -> aguas abajo)
        profile.reverse();

        // Deduplicate stations at reach boundaries
        // When two stations are at the same location, keep only one to avoid velocity spikes
        dedup_stations(&mut profile);

        Ok(profile)
    }

    /// Calcular perfil aguas abajo (flujo supercritico)
    fn compute_downstream(&self, system: &ChannelSystem) -> Result<Vec<GvfStation>> {
        let q = system.design_discharge;
        let mut profile = Vec::new();

        // Para flujo supercritico, usar profundidad critica como condicion inicial
        let first_reach = &system.reaches[0];
        let mut current_depth = self.critical_depth(&first_reach.section, q)?;

        // Procesar tramos en orden natural
        for reach in &system.reaches {
            let reach_profile = self.compute_reach_downstream(reach, q, current_depth)?;

            if let Some(last) = reach_profile.last() {
                current_depth = last.water_depth;
            }

            profile.extend(reach_profile);
        }

        // Deduplicate stations at reach boundaries
        dedup_stations(&mut profile);

        Ok(profile)
    }

    /// Calcular tramo individual aguas arriba (Standard Step Method)
    fn compute_reach_upstream(
        &self,
        reach: &ChannelReach,
        discharge: f64,
        downstream_depth: f64,
    ) -> Result<Vec<GvfStation>> {
        let mut stations = Vec::new();
        let step = self.config.step_size;

        // Generar estaciones del tramo
        let num_steps = ((reach.end_station - reach.start_station) / step).ceil() as usize;
        let actual_step = (reach.end_station - reach.start_station) / num_steps as f64;

        let mut current_depth = downstream_depth;
        let mut prev_station: Option<GvfStation> = None;

        // Iterar desde aguas abajo hacia aguas arriba
        for i in 0..=num_steps {
            let station = reach.end_station - i as f64 * actual_step;
            let bed_elev = reach.bed_elevation_at(station);

            // Obtener sección en esta estación (interpolada para transiciones)
            let section_at_station = reach.section_at(station);

            // Calcular propiedades hidraulicas con la sección interpolada
            let props = section_at_station.hydraulic_properties(current_depth);
            // Calcular velocidad con límite máximo para evitar picos irreales en transiciones
            let velocity = if props.area > 0.0 {
                (discharge / props.area).min(self.config.max_velocity)
            } else {
                0.0
            };

            let froude = if props.hydraulic_depth > 0.0 {
                velocity / (G * props.hydraulic_depth).sqrt()
            } else {
                0.0
            };

            let velocity_head = velocity.powi(2) / (2.0 * G);
            let specific_energy = current_depth + velocity_head;
            let wse = bed_elev + current_depth;
            let egl = wse + velocity_head;

            // Profundidades de referencia (usando la sección interpolada)
            let yn = self
                .normal_depth(&section_at_station, discharge, reach.slope, reach.manning_n)
                .unwrap_or(current_depth);
            let yc = self
                .critical_depth(&section_at_station, discharge)
                .unwrap_or(current_depth);

            // Calcular perdida de carga desde estacion anterior
            let head_loss = if let Some(ref prev) = prev_station {
                self.compute_head_loss(prev, &props, velocity, actual_step, reach)?
            } else {
                0.0
            };

            // Calcular campos profesionales adicionales
            let friction_slope =
                self.friction_slope(reach.manning_n, velocity, props.hydraulic_radius);
            let additional = self.compute_additional_parameters(
                discharge,
                velocity,
                current_depth,
                &props,
                friction_slope,
                yn,
                yc,
                reach.manning_n,
                reach.slope,
            );

            let gvf_station = GvfStation {
                station,
                element_id: reach.id.clone(),
                bed_elevation: bed_elev,
                water_depth: current_depth,
                water_surface_elevation: wse,
                energy_grade_line: egl,
                velocity,
                area: props.area,
                wetted_perimeter: props.wetted_perimeter,
                hydraulic_radius: props.hydraulic_radius,
                top_width: props.top_width,
                froude,
                flow_regime: FlowRegimeType::from_froude(froude),
                specific_energy,
                normal_depth: yn,
                critical_depth: yc,
                freeboard: section_at_station.max_depth() - current_depth,
                head_loss,
                profile_type: GvfProfileType::classify(current_depth, yn, yc, reach.slope),
                // Nuevos campos profesionales
                friction_slope,
                specific_momentum: additional.specific_momentum,
                bed_shear_stress: additional.bed_shear_stress,
                shear_velocity: additional.shear_velocity,
                reynolds_number: additional.reynolds_number,
                alpha_coriolis: additional.alpha_coriolis,
                beta_boussinesq: additional.beta_boussinesq,
                velocity_head,
                critical_energy: additional.critical_energy,
                hydraulic_depth: props.hydraulic_depth,
                critical_slope: additional.critical_slope,
                stream_power: additional.stream_power,
                unit_stream_power: additional.unit_stream_power,
                weber_number: additional.weber_number,
                detailed_regime: additional.detailed_regime,
                darcy_friction_factor: additional.darcy_friction_factor,
                chezy_coefficient: additional.chezy_coefficient,
                depth_to_normal: current_depth - yn,
                depth_to_critical: current_depth - yc,
                energy_gradient: additional.energy_gradient,
                water_surface_gradient: additional.water_surface_gradient,
            };

            stations.push(gvf_station.clone());

            // Calcular nueva profundidad para siguiente estacion (aguas arriba)
            if i < num_steps {
                // Para transiciones, usar la sección en la siguiente estación
                let next_station = reach.end_station - (i + 1) as f64 * actual_step;
                let next_section = reach.section_at(next_station);
                current_depth = self.solve_depth_upstream_with_section(
                    &next_section,
                    reach,
                    discharge,
                    current_depth,
                    actual_step,
                )?;
            }

            prev_station = Some(gvf_station);
        }

        Ok(stations)
    }

    /// Calcular tramo individual aguas abajo (Standard Step Method)
    fn compute_reach_downstream(
        &self,
        reach: &ChannelReach,
        discharge: f64,
        upstream_depth: f64,
    ) -> Result<Vec<GvfStation>> {
        let mut stations = Vec::new();
        let step = self.config.step_size;

        let num_steps = ((reach.end_station - reach.start_station) / step).ceil() as usize;
        let actual_step = (reach.end_station - reach.start_station) / num_steps as f64;

        let mut current_depth = upstream_depth;
        let mut prev_station: Option<GvfStation> = None;

        for i in 0..=num_steps {
            let station = reach.start_station + i as f64 * actual_step;
            let bed_elev = reach.bed_elevation_at(station);

            // Obtener sección en esta estación (interpolada para transiciones)
            let section_at_station = reach.section_at(station);

            let props = section_at_station.hydraulic_properties(current_depth);
            // Calcular velocidad con límite máximo para evitar picos irreales en transiciones
            let velocity = if props.area > 0.0 {
                (discharge / props.area).min(self.config.max_velocity)
            } else {
                0.0
            };

            let froude = if props.hydraulic_depth > 0.0 {
                velocity / (G * props.hydraulic_depth).sqrt()
            } else {
                0.0
            };

            let velocity_head = velocity.powi(2) / (2.0 * G);
            let specific_energy = current_depth + velocity_head;
            let wse = bed_elev + current_depth;
            let egl = wse + velocity_head;

            let yn = self
                .normal_depth(&section_at_station, discharge, reach.slope, reach.manning_n)
                .unwrap_or(current_depth);
            let yc = self
                .critical_depth(&section_at_station, discharge)
                .unwrap_or(current_depth);

            let head_loss = if let Some(ref prev) = prev_station {
                self.compute_head_loss(prev, &props, velocity, actual_step, reach)?
            } else {
                0.0
            };

            // Calcular campos profesionales adicionales
            let friction_slope =
                self.friction_slope(reach.manning_n, velocity, props.hydraulic_radius);
            let additional = self.compute_additional_parameters(
                discharge,
                velocity,
                current_depth,
                &props,
                friction_slope,
                yn,
                yc,
                reach.manning_n,
                reach.slope,
            );

            let gvf_station = GvfStation {
                station,
                element_id: reach.id.clone(),
                bed_elevation: bed_elev,
                water_depth: current_depth,
                water_surface_elevation: wse,
                energy_grade_line: egl,
                velocity,
                area: props.area,
                wetted_perimeter: props.wetted_perimeter,
                hydraulic_radius: props.hydraulic_radius,
                top_width: props.top_width,
                froude,
                flow_regime: FlowRegimeType::from_froude(froude),
                specific_energy,
                normal_depth: yn,
                critical_depth: yc,
                freeboard: section_at_station.max_depth() - current_depth,
                head_loss,
                profile_type: GvfProfileType::classify(current_depth, yn, yc, reach.slope),
                // Nuevos campos profesionales
                friction_slope,
                specific_momentum: additional.specific_momentum,
                bed_shear_stress: additional.bed_shear_stress,
                shear_velocity: additional.shear_velocity,
                reynolds_number: additional.reynolds_number,
                alpha_coriolis: additional.alpha_coriolis,
                beta_boussinesq: additional.beta_boussinesq,
                velocity_head,
                critical_energy: additional.critical_energy,
                hydraulic_depth: props.hydraulic_depth,
                critical_slope: additional.critical_slope,
                stream_power: additional.stream_power,
                unit_stream_power: additional.unit_stream_power,
                weber_number: additional.weber_number,
                detailed_regime: additional.detailed_regime,
                darcy_friction_factor: additional.darcy_friction_factor,
                chezy_coefficient: additional.chezy_coefficient,
                depth_to_normal: current_depth - yn,
                depth_to_critical: current_depth - yc,
                energy_gradient: additional.energy_gradient,
                water_surface_gradient: additional.water_surface_gradient,
            };

            stations.push(gvf_station.clone());

            if i < num_steps {
                // Para transiciones, usar la sección en la siguiente estación
                let next_station = reach.start_station + (i + 1) as f64 * actual_step;
                let next_section = reach.section_at(next_station);
                current_depth = self.solve_depth_downstream_with_section(
                    &next_section,
                    reach,
                    discharge,
                    current_depth,
                    actual_step,
                )?;
            }

            prev_station = Some(gvf_station);
        }

        Ok(stations)
    }

    /// Resolver profundidad en estacion aguas arriba usando ecuacion de energia
    ///
    /// Ecuacion de energia: z1 + y1 + V1²/2g = z2 + y2 + V2²/2g + hL
    ///
    /// Donde hL = hf (friccion) + he (transicion)
    #[allow(dead_code)]
    fn solve_depth_upstream(
        &self,
        reach: &ChannelReach,
        discharge: f64,
        downstream_depth: f64,
        dx: f64,
    ) -> Result<f64> {
        let section = &reach.section;
        let n = reach.manning_n;
        let slope = reach.slope;

        // Propiedades aguas abajo
        let props_ds = section.hydraulic_properties(downstream_depth);
        let v_ds = if props_ds.area > 0.0 {
            discharge / props_ds.area
        } else {
            return Err(HydraulicError::Calculation("Zero area downstream".into()));
        };

        // Iteracion Newton-Raphson
        let mut y = downstream_depth; // Estimacion inicial

        for _ in 0..self.config.max_iterations {
            let props = section.hydraulic_properties(y);

            if props.area <= 0.0 {
                y = self.config.min_depth;
                continue;
            }

            let v = discharge / props.area;

            // Pendiente de friccion promedio (Sf_avg = (Sf1 + Sf2) / 2)
            let sf_ds = self.friction_slope(n, v_ds, props_ds.hydraulic_radius);
            let sf_us = self.friction_slope(n, v, props.hydraulic_radius);
            let sf_avg = (sf_ds + sf_us) / 2.0;

            // Perdida por friccion
            let hf = if self.config.include_friction_losses {
                sf_avg * dx
            } else {
                0.0
            };

            // Perdida en transicion (si hay cambio de velocidad)
            let he = if self.config.include_transition_losses {
                let delta_v2 = v.powi(2) - v_ds.powi(2);
                if delta_v2 > 0.0 {
                    // Expansion
                    self.config.expansion_coefficient * delta_v2.abs() / (2.0 * G)
                } else {
                    // Contraccion
                    self.config.contraction_coefficient * delta_v2.abs() / (2.0 * G)
                }
            } else {
                0.0
            };

            // Ecuacion de energia
            // E_us = E_ds + hf + he + Δz (donde Δz = slope * dx para ir aguas arriba)
            let delta_z = slope * dx;
            let e_ds = downstream_depth + v_ds.powi(2) / (2.0 * G);
            let e_target = e_ds + hf + he + delta_z;

            // Energia especifica en estimacion actual
            let e_current = y + v.powi(2) / (2.0 * G);

            // Residuo
            let residual = e_current - e_target;

            if residual.abs() < self.config.tolerance {
                return Ok(y.max(self.config.min_depth));
            }

            // Derivada de E respecto a y: dE/dy = 1 - Q²/(gA³) * T
            // donde T = top width, A = area
            let de_dy = 1.0 - discharge.powi(2) * props.top_width / (G * props.area.powi(3));

            if de_dy.abs() < 1e-10 {
                // Cerca de profundidad critica, usar biseccion
                y = self.bisect_depth(section, discharge, e_target)?;
                break;
            }

            // Newton step con relajacion
            let dy = -residual / de_dy;
            y += self.config.relaxation_factor * dy;
            y = y.max(self.config.min_depth).min(section.max_depth() * 2.0);
        }

        Ok(y.max(self.config.min_depth))
    }

    /// Resolver profundidad en estacion aguas abajo
    #[allow(dead_code)]
    fn solve_depth_downstream(
        &self,
        reach: &ChannelReach,
        discharge: f64,
        upstream_depth: f64,
        dx: f64,
    ) -> Result<f64> {
        let section = &reach.section;
        let n = reach.manning_n;
        let slope = reach.slope;

        let props_us = section.hydraulic_properties(upstream_depth);
        let v_us = if props_us.area > 0.0 {
            discharge / props_us.area
        } else {
            return Err(HydraulicError::Calculation("Zero area upstream".into()));
        };

        let mut y = upstream_depth;

        for _ in 0..self.config.max_iterations {
            let props = section.hydraulic_properties(y);

            if props.area <= 0.0 {
                y = self.config.min_depth;
                continue;
            }

            let v = discharge / props.area;

            let sf_us = self.friction_slope(n, v_us, props_us.hydraulic_radius);
            let sf_ds = self.friction_slope(n, v, props.hydraulic_radius);
            let sf_avg = (sf_us + sf_ds) / 2.0;

            let hf = if self.config.include_friction_losses {
                sf_avg * dx
            } else {
                0.0
            };

            let he = if self.config.include_transition_losses {
                let delta_v2 = v_us.powi(2) - v.powi(2);
                if delta_v2 > 0.0 {
                    self.config.expansion_coefficient * delta_v2.abs() / (2.0 * G)
                } else {
                    self.config.contraction_coefficient * delta_v2.abs() / (2.0 * G)
                }
            } else {
                0.0
            };

            let delta_z = slope * dx;
            let e_us = upstream_depth + v_us.powi(2) / (2.0 * G);
            let e_target = e_us - hf - he + delta_z;

            let e_current = y + v.powi(2) / (2.0 * G);
            let residual = e_current - e_target;

            if residual.abs() < self.config.tolerance {
                return Ok(y.max(self.config.min_depth));
            }

            let de_dy = 1.0 - discharge.powi(2) * props.top_width / (G * props.area.powi(3));

            if de_dy.abs() < 1e-10 {
                y = self.bisect_depth(section, discharge, e_target)?;
                break;
            }

            let dy = -residual / de_dy;
            y += self.config.relaxation_factor * dy;
            y = y.max(self.config.min_depth).min(section.max_depth() * 2.0);
        }

        Ok(y.max(self.config.min_depth))
    }

    /// Resolver profundidad en estacion aguas arriba usando una sección específica
    /// (para transiciones donde la sección varía a lo largo del tramo)
    fn solve_depth_upstream_with_section(
        &self,
        section: &SectionType,
        reach: &ChannelReach,
        discharge: f64,
        downstream_depth: f64,
        dx: f64,
    ) -> Result<f64> {
        let n = reach.manning_n;
        let slope = reach.slope;

        // Propiedades aguas abajo
        let props_ds = section.hydraulic_properties(downstream_depth);
        let v_ds = if props_ds.area > 0.0 {
            discharge / props_ds.area
        } else {
            return Err(HydraulicError::Calculation("Zero area downstream".into()));
        };

        // Iteracion Newton-Raphson
        let mut y = downstream_depth;

        for _ in 0..self.config.max_iterations {
            let props = section.hydraulic_properties(y);

            if props.area <= 0.0 {
                y = self.config.min_depth;
                continue;
            }

            let v = discharge / props.area;

            let sf_ds = self.friction_slope(n, v_ds, props_ds.hydraulic_radius);
            let sf_us = self.friction_slope(n, v, props.hydraulic_radius);
            let sf_avg = (sf_ds + sf_us) / 2.0;

            let hf = if self.config.include_friction_losses {
                sf_avg * dx
            } else {
                0.0
            };

            let he = if self.config.include_transition_losses {
                let delta_v2 = v.powi(2) - v_ds.powi(2);
                if delta_v2 > 0.0 {
                    self.config.expansion_coefficient * delta_v2.abs() / (2.0 * G)
                } else {
                    self.config.contraction_coefficient * delta_v2.abs() / (2.0 * G)
                }
            } else {
                0.0
            };

            let delta_z = slope * dx;
            let e_ds = downstream_depth + v_ds.powi(2) / (2.0 * G);
            let e_target = e_ds + hf + he + delta_z;

            let e_current = y + v.powi(2) / (2.0 * G);
            let residual = e_current - e_target;

            if residual.abs() < self.config.tolerance {
                return Ok(y.max(self.config.min_depth));
            }

            let de_dy = 1.0 - discharge.powi(2) * props.top_width / (G * props.area.powi(3));

            if de_dy.abs() < 1e-10 {
                y = self.bisect_depth(section, discharge, e_target)?;
                break;
            }

            let dy = -residual / de_dy;
            y += self.config.relaxation_factor * dy;
            y = y.max(self.config.min_depth).min(section.max_depth() * 2.0);
        }

        Ok(y.max(self.config.min_depth))
    }

    /// Resolver profundidad en estacion aguas abajo usando una sección específica
    /// (para transiciones donde la sección varía a lo largo del tramo)
    fn solve_depth_downstream_with_section(
        &self,
        section: &SectionType,
        reach: &ChannelReach,
        discharge: f64,
        upstream_depth: f64,
        dx: f64,
    ) -> Result<f64> {
        let n = reach.manning_n;
        let slope = reach.slope;

        let props_us = section.hydraulic_properties(upstream_depth);
        let v_us = if props_us.area > 0.0 {
            discharge / props_us.area
        } else {
            return Err(HydraulicError::Calculation("Zero area upstream".into()));
        };

        let mut y = upstream_depth;

        for _ in 0..self.config.max_iterations {
            let props = section.hydraulic_properties(y);

            if props.area <= 0.0 {
                y = self.config.min_depth;
                continue;
            }

            let v = discharge / props.area;

            let sf_us = self.friction_slope(n, v_us, props_us.hydraulic_radius);
            let sf_ds = self.friction_slope(n, v, props.hydraulic_radius);
            let sf_avg = (sf_us + sf_ds) / 2.0;

            let hf = if self.config.include_friction_losses {
                sf_avg * dx
            } else {
                0.0
            };

            let he = if self.config.include_transition_losses {
                let delta_v2 = v_us.powi(2) - v.powi(2);
                if delta_v2 > 0.0 {
                    self.config.expansion_coefficient * delta_v2.abs() / (2.0 * G)
                } else {
                    self.config.contraction_coefficient * delta_v2.abs() / (2.0 * G)
                }
            } else {
                0.0
            };

            let delta_z = slope * dx;
            let e_us = upstream_depth + v_us.powi(2) / (2.0 * G);
            let e_target = e_us - hf - he + delta_z;

            let e_current = y + v.powi(2) / (2.0 * G);
            let residual = e_current - e_target;

            if residual.abs() < self.config.tolerance {
                return Ok(y.max(self.config.min_depth));
            }

            let de_dy = 1.0 - discharge.powi(2) * props.top_width / (G * props.area.powi(3));

            if de_dy.abs() < 1e-10 {
                y = self.bisect_depth(section, discharge, e_target)?;
                break;
            }

            let dy = -residual / de_dy;
            y += self.config.relaxation_factor * dy;
            y = y.max(self.config.min_depth).min(section.max_depth() * 2.0);
        }

        Ok(y.max(self.config.min_depth))
    }

    /// Pendiente de friccion usando Manning
    /// Sf = (n * V)² / R^(4/3)
    fn friction_slope(&self, manning_n: f64, velocity: f64, hydraulic_radius: f64) -> f64 {
        if hydraulic_radius <= 0.0 {
            return 0.0;
        }
        (manning_n * velocity).powi(2) / hydraulic_radius.powf(4.0 / 3.0)
    }

    /// Calcular parámetros adicionales profesionales para una estación
    #[allow(clippy::too_many_arguments)]
    fn compute_additional_parameters(
        &self,
        discharge: f64,
        velocity: f64,
        depth: f64,
        props: &HydraulicProperties,
        friction_slope: f64,
        _normal_depth: f64,
        critical_depth: f64,
        manning_n: f64,
        bed_slope: f64,
    ) -> AdditionalHydraulicParameters {
        // Constantes físicas
        const WATER_DENSITY: f64 = 1000.0; // kg/m³
        const KINEMATIC_VISCOSITY: f64 = 1.003e-6; // m²/s a 20°C
        const SURFACE_TENSION: f64 = 0.0728; // N/m (agua-aire a 20°C)

        // Esfuerzo cortante en el lecho: τ₀ = ρgRSf (Pa)
        let bed_shear_stress = WATER_DENSITY * G * props.hydraulic_radius * friction_slope;

        // Velocidad de corte: u* = √(τ₀/ρ) (m/s)
        let shear_velocity = (bed_shear_stress / WATER_DENSITY).sqrt();

        // Número de Reynolds: Re = 4VR/ν
        let reynolds_number = if KINEMATIC_VISCOSITY > 0.0 {
            4.0 * velocity * props.hydraulic_radius / KINEMATIC_VISCOSITY
        } else {
            0.0
        };

        // Factor de corrección de energía (Coriolis) - asumiendo distribución logarítmica
        let alpha_coriolis = if velocity > 0.0 && shear_velocity > 0.0 {
            let u_ratio = velocity / shear_velocity;
            // Para canales abiertos típicos: α ≈ 1.05-1.15
            1.0 + 0.15 * (1.0 / u_ratio.max(1.0)).min(1.0)
        } else {
            1.0
        };

        // Factor de corrección de momentum (Boussinesq)
        let beta_boussinesq = if velocity > 0.0 && shear_velocity > 0.0 {
            1.0 + 0.05 * (1.0 / (velocity / shear_velocity).max(1.0)).min(1.0)
        } else {
            1.0
        };

        // Momentum específico: M = Q²/(gA) + A·ȳ (m³)
        // donde ȳ = profundidad del centroide ≈ depth/2 para secciones simples
        let centroid_depth = depth / 2.0; // Aproximación para rectangulares
        let specific_momentum = if props.area > 0.0 {
            discharge.powi(2) / (G * props.area) + props.area * centroid_depth
        } else {
            0.0
        };

        // Energía específica crítica: Ec = 1.5 × yc (para rectangulares)
        let critical_energy = 1.5 * critical_depth;

        // Pendiente crítica: Sc = gn²D / (A/P)^(4/3) en flujo crítico
        let critical_slope = if props.hydraulic_radius > 0.0 {
            G * manning_n.powi(2) * props.hydraulic_depth / props.hydraulic_radius.powf(4.0 / 3.0)
        } else {
            0.0
        };

        // Potencia del flujo (Stream Power): P = ρgQSf (W/m)
        let stream_power = WATER_DENSITY * G * discharge * friction_slope;

        // Potencia unitaria: ω = τ₀V (W/m²)
        let unit_stream_power = bed_shear_stress * velocity;

        // Número de Weber: We = ρV²D/σ (importante para flujos con superficie libre)
        let weber_number = if depth > 0.0 {
            Some(WATER_DENSITY * velocity.powi(2) * depth / SURFACE_TENSION)
        } else {
            None
        };

        // Clasificación detallada del régimen
        let froude = if props.hydraulic_depth > 0.0 {
            velocity / (G * props.hydraulic_depth).sqrt()
        } else {
            0.0
        };
        let detailed_regime = DetailedFlowRegime::classify(reynolds_number, froude, velocity);

        // Factor de fricción de Darcy-Weisbach: f = 8gRSf/V²
        let darcy_friction_factor = if velocity > 0.0 {
            8.0 * G * props.hydraulic_radius * friction_slope / velocity.powi(2)
        } else {
            0.0
        };

        // Coeficiente de Chézy: C = V / √(R×Sf)
        let chezy_coefficient = if props.hydraulic_radius > 0.0 && friction_slope > 0.0 {
            velocity / (props.hydraulic_radius * friction_slope).sqrt()
        } else {
            0.0
        };

        // Gradiente de energía: dE/dx = S₀ - Sf
        let energy_gradient = bed_slope - friction_slope;

        // Gradiente de superficie de agua (GVF equation)
        // dy/dx = (S₀ - Sf)/(1 - Fr²)
        let water_surface_gradient = if (1.0 - froude.powi(2)).abs() > 1e-6 {
            energy_gradient / (1.0 - froude.powi(2))
        } else {
            0.0 // Flujo crítico - pendiente indefinida
        };

        AdditionalHydraulicParameters {
            specific_momentum,
            bed_shear_stress,
            shear_velocity,
            reynolds_number,
            alpha_coriolis,
            beta_boussinesq,
            critical_energy,
            critical_slope,
            stream_power,
            unit_stream_power,
            weber_number,
            detailed_regime,
            darcy_friction_factor,
            chezy_coefficient,
            energy_gradient,
            water_surface_gradient,
        }
    }

    /// Encontrar profundidad para energia especifica dada usando biseccion
    fn bisect_depth(
        &self,
        section: &SectionType,
        discharge: f64,
        target_energy: f64,
    ) -> Result<f64> {
        let mut y_low = self.config.min_depth;
        let mut y_high = section.max_depth() * 2.0;

        for _ in 0..100 {
            let y_mid = (y_low + y_high) / 2.0;
            let props = section.hydraulic_properties(y_mid);

            if props.area <= 0.0 {
                y_low = y_mid;
                continue;
            }

            let v = discharge / props.area;
            let e = y_mid + v.powi(2) / (2.0 * G);

            if (e - target_energy).abs() < self.config.tolerance {
                return Ok(y_mid);
            }

            // Para flujo subcritico (que es lo mas comun), E disminuye con y cerca de yc
            // y aumenta con y lejos de yc
            if e < target_energy {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }

            if (y_high - y_low) < self.config.tolerance {
                break;
            }
        }

        Ok((y_low + y_high) / 2.0)
    }

    /// Calcular perdida de carga entre dos estaciones
    fn compute_head_loss(
        &self,
        prev: &GvfStation,
        current_props: &HydraulicProperties,
        current_velocity: f64,
        dx: f64,
        reach: &ChannelReach,
    ) -> Result<f64> {
        // Pendiente de friccion promedio
        let sf_prev = self.friction_slope(reach.manning_n, prev.velocity, prev.hydraulic_radius);
        let sf_current = self.friction_slope(
            reach.manning_n,
            current_velocity,
            current_props.hydraulic_radius,
        );
        let sf_avg = (sf_prev + sf_current) / 2.0;

        let hf = sf_avg * dx;

        // Perdida en transicion
        let delta_v2 = current_velocity.powi(2) - prev.velocity.powi(2);
        let he = if delta_v2 > 0.0 {
            self.config.expansion_coefficient * delta_v2 / (2.0 * G)
        } else {
            self.config.contraction_coefficient * delta_v2.abs() / (2.0 * G)
        };

        Ok(hf + he)
    }

    /// Calcular profundidad normal
    pub fn normal_depth(
        &self,
        section: &SectionType,
        discharge: f64,
        slope: f64,
        manning_n: f64,
    ) -> Result<f64> {
        if discharge <= 0.0 {
            return Ok(0.0);
        }

        if slope <= 0.0 {
            return Err(HydraulicError::Calculation(
                "Slope must be positive for normal depth".into(),
            ));
        }

        let max_depth = section.max_depth();
        let mut y_low = self.config.min_depth;
        let mut y_high = max_depth * 3.0;

        // Biseccion
        for _ in 0..100 {
            let y_mid = (y_low + y_high) / 2.0;
            let props = section.hydraulic_properties(y_mid);

            if props.area <= 0.0 || props.hydraulic_radius <= 0.0 {
                y_low = y_mid;
                continue;
            }

            // Manning: Q = (1/n) * A * R^(2/3) * S^(1/2)
            let q_calc = (1.0 / manning_n)
                * props.area
                * props.hydraulic_radius.powf(2.0 / 3.0)
                * slope.sqrt();

            if (q_calc - discharge).abs() / discharge < self.config.tolerance {
                return Ok(y_mid);
            }

            if q_calc < discharge {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }

            if (y_high - y_low) < self.config.tolerance {
                break;
            }
        }

        Ok((y_low + y_high) / 2.0)
    }

    /// Calcular profundidad critica
    pub fn critical_depth(&self, section: &SectionType, discharge: f64) -> Result<f64> {
        if discharge <= 0.0 {
            return Ok(0.0);
        }

        let max_depth = section.max_depth();
        let target = discharge.powi(2) / G; // Q²/g = A³/T

        let mut y_low = self.config.min_depth;
        let mut y_high = max_depth * 2.0;

        for _ in 0..100 {
            let y_mid = (y_low + y_high) / 2.0;
            let props = section.hydraulic_properties(y_mid);

            if props.area <= 0.0 || props.top_width <= 0.0 {
                y_low = y_mid;
                continue;
            }

            // A³/T
            let section_factor = props.area.powi(3) / props.top_width;

            if (section_factor - target).abs() / target < self.config.tolerance {
                return Ok(y_mid);
            }

            if section_factor < target {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }

            if (y_high - y_low) < self.config.tolerance {
                break;
            }
        }

        Ok((y_low + y_high) / 2.0)
    }

    /// Generar resumen del analisis
    fn generate_summary(&self, profile: &[GvfStation], system: &ChannelSystem) -> GvfSummary {
        let mut warnings = Vec::new();

        if profile.is_empty() {
            return self.empty_summary(system);
        }

        // Estadísticas básicas
        let (min_depth, max_depth) = profile
            .iter()
            .map(|s| s.water_depth)
            .fold((f64::MAX, f64::MIN), |(min, max), d| {
                (min.min(d), max.max(d))
            });

        let (min_velocity, max_velocity) = profile
            .iter()
            .map(|s| s.velocity)
            .fold((f64::MAX, f64::MIN), |(min, max), v| {
                (min.min(v), max.max(v))
            });

        let (min_froude, max_froude) = profile
            .iter()
            .map(|s| s.froude)
            .fold((f64::MAX, f64::MIN), |(min, max), f| {
                (min.min(f), max.max(f))
            });

        let min_freeboard = profile
            .iter()
            .map(|s| s.freeboard)
            .fold(f64::MAX, |min, fb| min.min(fb));

        // Promedios
        let n = profile.len() as f64;
        let avg_velocity: f64 = profile.iter().map(|s| s.velocity).sum::<f64>() / n;
        let avg_froude: f64 = profile.iter().map(|s| s.froude).sum::<f64>() / n;
        let avg_depth: f64 = profile.iter().map(|s| s.water_depth).sum::<f64>() / n;
        let avg_area: f64 = profile.iter().map(|s| s.area).sum::<f64>() / n;

        // Detectar cambios de regimen y contar tipos
        let mut has_regime_change = false;
        let mut critical_stations = Vec::new();
        let mut prev_regime = None;
        let mut subcritical_count = 0usize;
        let mut supercritical_count = 0usize;

        for station in profile {
            if let Some(prev) = prev_regime {
                if prev != station.flow_regime {
                    has_regime_change = true;
                }
            }
            match station.flow_regime {
                FlowRegimeType::Subcritical => subcritical_count += 1,
                FlowRegimeType::Supercritical => supercritical_count += 1,
                FlowRegimeType::Critical => critical_stations.push(station.station),
            }
            prev_regime = Some(station.flow_regime);
        }

        let subcritical_percentage = 100.0 * subcritical_count as f64 / n;
        let supercritical_percentage = 100.0 * supercritical_count as f64 / n;
        let predominant_regime = if subcritical_count > supercritical_count {
            "Subcrítico".to_string()
        } else if supercritical_count > subcritical_count {
            "Supercrítico".to_string()
        } else {
            "Mixto".to_string()
        };

        // Calcular perdidas totales
        let total_head_loss: f64 = profile.iter().map(|s| s.head_loss).sum();

        // Energia entrada/salida
        let inlet_energy = profile.first().map(|s| s.energy_grade_line).unwrap_or(0.0);
        let outlet_energy = profile.last().map(|s| s.energy_grade_line).unwrap_or(0.0);

        // Detectar zonas de transición (contracción/expansión)
        let transition_zones = self.detect_transition_zones(profile);
        let transition_loss: f64 = transition_zones.iter().map(|z| z.head_loss).sum();
        let friction_loss = total_head_loss - transition_loss;

        // Calcular pendiente de fricción promedio
        let avg_friction_slope = if profile.len() >= 2 {
            let (first, last) = (
                profile.first().expect("Profile has at least 2 elements"),
                profile.last().expect("Profile has at least 2 elements"),
            );
            let total_length = last.station - first.station;
            if total_length > 0.0 {
                friction_loss / total_length
            } else {
                0.0
            }
        } else {
            0.0
        };

        // Número de Reynolds promedio (usando viscosidad cinemática del agua a 20°C: 1e-6 m²/s)
        let nu = 1e-6; // viscosidad cinemática
        let avg_reynolds = if avg_area > 0.0 {
            let avg_hydraulic_radius = profile.iter().map(|s| s.hydraulic_radius).sum::<f64>() / n;
            4.0 * avg_velocity * avg_hydraulic_radius / nu
        } else {
            0.0
        };

        // Análisis de cavitación
        let cavitation = self.analyze_cavitation(profile, system);

        // Generar advertencias
        if max_velocity > 3.5 {
            warnings.push(format!(
                "⚠️ Alta velocidad: {:.2} m/s (máx. recomendado: 3.5 m/s para concreto, 2.5 m/s para tierra)",
                max_velocity
            ));
        }
        if min_velocity < 0.5 {
            warnings.push(format!(
                "⚠️ Baja velocidad: {:.2} m/s (mín. recomendado: 0.5 m/s para evitar sedimentación)",
                min_velocity
            ));
        }
        if min_freeboard < 0.15 {
            warnings.push(format!(
                "⚠️ Bordo libre insuficiente: {:.2} m (mín. recomendado: 0.15 m)",
                min_freeboard
            ));
        }
        if has_regime_change {
            warnings
                .push("⚠️ Cambio de régimen detectado - verificar posible salto hidráulico".into());
        }
        if cavitation.risk_detected {
            warnings.push(format!(
                "⚠️ Riesgo de cavitación: {} estaciones afectadas",
                cavitation.risk_stations.len()
            ));
        }
        if !transition_zones.is_empty() {
            let contractions: Vec<_> = transition_zones
                .iter()
                .filter(|z| z.transition_type == "contraction")
                .collect();
            let expansions: Vec<_> = transition_zones
                .iter()
                .filter(|z| z.transition_type == "expansion")
                .collect();

            if !contractions.is_empty() {
                warnings.push(format!(
                    "📍 {} zona(s) de contracción detectada(s)",
                    contractions.len()
                ));
            }
            if !expansions.is_empty() {
                warnings.push(format!(
                    "📍 {} zona(s) de expansión detectada(s)",
                    expansions.len()
                ));
            }
        }
        if max_froude > 0.85 && max_froude < 1.0 {
            warnings.push(format!(
                "⚠️ Froude cercano a crítico: {:.3} - condición inestable",
                max_froude
            ));
        }

        GvfSummary {
            discharge: system.design_discharge,
            start_station: profile.first().map(|s| s.station).unwrap_or(0.0),
            end_station: profile.last().map(|s| s.station).unwrap_or(0.0),
            station_count: profile.len(),
            max_depth,
            min_depth,
            max_velocity,
            min_velocity,
            avg_velocity,
            max_froude,
            min_froude,
            avg_froude,
            inlet_energy,
            outlet_energy,
            total_head_loss,
            friction_loss,
            transition_loss,
            has_regime_change,
            critical_stations,
            min_freeboard,
            avg_depth,
            avg_area,
            transition_zones,
            cavitation,
            predominant_regime,
            subcritical_percentage,
            supercritical_percentage,
            avg_friction_slope,
            avg_reynolds,
            warnings,
        }
    }

    /// Generar resumen vacío
    fn empty_summary(&self, system: &ChannelSystem) -> GvfSummary {
        GvfSummary {
            discharge: system.design_discharge,
            start_station: 0.0,
            end_station: 0.0,
            station_count: 0,
            max_depth: 0.0,
            min_depth: 0.0,
            max_velocity: 0.0,
            min_velocity: 0.0,
            avg_velocity: 0.0,
            max_froude: 0.0,
            min_froude: 0.0,
            avg_froude: 0.0,
            inlet_energy: 0.0,
            outlet_energy: 0.0,
            total_head_loss: 0.0,
            friction_loss: 0.0,
            transition_loss: 0.0,
            has_regime_change: false,
            critical_stations: Vec::new(),
            min_freeboard: 0.0,
            avg_depth: 0.0,
            avg_area: 0.0,
            transition_zones: Vec::new(),
            cavitation: CavitationInfo {
                risk_detected: false,
                risk_stations: Vec::new(),
                min_cavitation_index: f64::MAX,
                critical_velocity: 0.0,
                description: "No hay datos".into(),
            },
            predominant_regime: "Desconocido".into(),
            subcritical_percentage: 0.0,
            supercritical_percentage: 0.0,
            avg_friction_slope: 0.0,
            avg_reynolds: 0.0,
            warnings: vec!["No hay estaciones en el perfil".into()],
        }
    }

    /// Detectar zonas de transición (contracción/expansión)
    fn detect_transition_zones(&self, profile: &[GvfStation]) -> Vec<TransitionZone> {
        let mut zones = Vec::new();

        if profile.len() < 2 {
            return zones;
        }

        let mut current_zone: Option<TransitionZone> = None;
        let velocity_threshold = 0.1; // m/s cambio mínimo para detectar transición

        for window in profile.windows(2) {
            let prev = &window[0];
            let curr = &window[1];
            let dv = curr.velocity - prev.velocity;

            if dv.abs() > velocity_threshold {
                let is_contraction = dv > 0.0; // Velocidad aumenta = contracción
                let transition_type = if is_contraction {
                    "contraction"
                } else {
                    "expansion"
                };
                let loss_coeff = if is_contraction {
                    self.config.contraction_coefficient
                } else {
                    self.config.expansion_coefficient
                };

                if let Some(ref mut zone) = current_zone {
                    // Continuar zona existente si es del mismo tipo
                    if zone.transition_type == transition_type {
                        zone.end_station = curr.station;
                        zone.head_loss += curr.head_loss;
                        zone.velocity_change = curr.velocity
                            - profile
                                .iter()
                                .find(|s| s.station == zone.start_station)
                                .map(|s| s.velocity)
                                .unwrap_or(prev.velocity);
                    } else {
                        // Finalizar zona anterior y empezar nueva
                        zones.push(zone.clone());
                        current_zone = Some(TransitionZone {
                            start_station: prev.station,
                            end_station: curr.station,
                            transition_type: transition_type.to_string(),
                            loss_coefficient: loss_coeff,
                            head_loss: curr.head_loss,
                            velocity_change: dv,
                        });
                    }
                } else {
                    // Iniciar nueva zona
                    current_zone = Some(TransitionZone {
                        start_station: prev.station,
                        end_station: curr.station,
                        transition_type: transition_type.to_string(),
                        loss_coefficient: loss_coeff,
                        head_loss: curr.head_loss,
                        velocity_change: dv,
                    });
                }
            } else if let Some(zone) = current_zone.take() {
                // Finalizar zona si el cambio de velocidad es menor al umbral
                zones.push(zone);
            }
        }

        // Agregar última zona si existe
        if let Some(zone) = current_zone {
            zones.push(zone);
        }

        // Filter out zero-length or very small transition zones
        // These occur at junction points and cause velocity spikes
        let min_zone_length = 0.01; // 1cm minimum
        zones.retain(|zone| (zone.end_station - zone.start_station).abs() > min_zone_length);

        zones
    }

    /// Analizar riesgo de cavitación
    fn analyze_cavitation(
        &self,
        profile: &[GvfStation],
        _system: &ChannelSystem,
    ) -> CavitationInfo {
        // Velocidad crítica aproximada para inicio de cavitación en canales
        // Basado en: σ = (P_atm - P_vapor) / (ρ * V² / 2) > σ_crítico
        // Para concreto: V_crit ≈ 7-10 m/s, para superficies rugosas: V_crit ≈ 5-7 m/s
        let critical_velocity = 6.0; // m/s (conservador)

        // Presión atmosférica y de vapor a nivel del mar, 20°C
        let p_atm = 101325.0; // Pa
        let p_vapor = 2339.0; // Pa at 20°C
        let rho = 1000.0; // kg/m³

        let mut risk_stations = Vec::new();
        let mut min_cavitation_index = f64::MAX;

        for station in profile {
            // Índice de cavitación (número de Thoma)
            // σ = (P_atm - P_vapor + ρ*g*h) / (ρ * V² / 2)
            let p_local = p_atm - p_vapor + rho * G * station.water_depth;
            let dynamic_pressure = 0.5 * rho * station.velocity.powi(2);

            if dynamic_pressure > 0.0 {
                let sigma = p_local / dynamic_pressure;
                min_cavitation_index = min_cavitation_index.min(sigma);

                // Riesgo de cavitación cuando σ < 1.5 (conservador) o V > V_crit
                if sigma < 1.5 || station.velocity > critical_velocity {
                    risk_stations.push(station.station);
                }
            }
        }

        let risk_detected = !risk_stations.is_empty();
        let description = if risk_detected {
            format!(
                "Riesgo en {} estaciones. σ_min = {:.2}. Velocidad máx permitida: {:.1} m/s",
                risk_stations.len(),
                min_cavitation_index,
                critical_velocity
            )
        } else {
            "Sin riesgo de cavitación detectado".into()
        };

        CavitationInfo {
            risk_detected,
            risk_stations,
            min_cavitation_index: if min_cavitation_index == f64::MAX {
                0.0
            } else {
                min_cavitation_index
            },
            critical_velocity,
            description,
        }
    }

    // =========================================================================
    // HYDRAULIC JUMP DETECTION
    // =========================================================================

    /// Detecta salto hidráulico en el perfil calculado
    ///
    /// El salto ocurre cuando el flujo transiciona de supercrítico a subcrítico.
    /// Usa la ecuación de Bélanger: y2/y1 = 0.5 × (√(1 + 8×Fr1²) - 1)
    fn detect_hydraulic_jump(
        &self,
        profile: &[GvfStation],
        _system: &ChannelSystem,
    ) -> Option<HydraulicJump> {
        if profile.len() < 2 {
            return None;
        }

        // Buscar transición supercrítico → subcrítico
        for i in 1..profile.len() {
            let prev = &profile[i - 1];
            let curr = &profile[i];

            // Detectar cambio de régimen: Fr > 1 → Fr < 1
            if prev.froude > 1.05 && curr.froude < 0.95 {
                // Encontramos una transición - calcular profundidades conjugadas
                let y1 = prev.water_depth; // Profundidad supercrítica
                let fr1 = prev.froude;

                // Ecuación de Bélanger: y2/y1 = 0.5 × (√(1 + 8×Fr1²) - 1)
                let y2_ratio = 0.5 * ((1.0 + 8.0 * fr1.powi(2)).sqrt() - 1.0);
                let y2_conjugate = y1 * y2_ratio;

                // Verificar que la profundidad subcrítica observada ≈ conjugada
                let y2_actual = curr.water_depth;

                // Si y2_actual está razonablemente cerca de y2_conjugate, hay salto
                // Tolerancia: 30% (el salto puede no ser exacto por condiciones locales)
                let ratio = y2_actual / y2_conjugate;
                if ratio < 0.7 || ratio > 1.3 {
                    // No hay equilibrio de momentum - el salto ocurre en otro lugar
                    continue;
                }

                // Calcular pérdida de energía: ΔE = (y2 - y1)³ / (4 × y1 × y2)
                let energy_loss = (y2_actual - y1).powi(3) / (4.0 * y1 * y2_actual);

                // Froude aguas abajo
                let v2 = curr.velocity;
                let d2 = curr.hydraulic_depth.max(0.001);
                let fr2 = v2 / (G * d2).sqrt();

                // Energía específica
                let e1 = prev.specific_energy;
                let e2 = curr.specific_energy;
                let efficiency = if e1 > 0.0 { e2 / e1 } else { 1.0 };

                // Longitud del salto (USBR): L ≈ 6.1 × y2
                let jump_length = 6.1 * y2_actual;

                // Tipo de salto
                let jump_type = JumpType::from_froude(fr1);

                // Tanque amortiguador requerido si Fr1 > 2.5
                let stilling_basin_required = fr1 > 2.5;
                // Longitud del tanque (USBR): L_basin ≈ 4.5 × y2 para salto contenido
                let basin_length = if stilling_basin_required {
                    4.5 * y2_actual
                } else {
                    0.0
                };

                return Some(HydraulicJump {
                    station: (prev.station + curr.station) / 2.0,
                    upstream_depth: y1,
                    downstream_depth: y2_actual,
                    upstream_froude: fr1,
                    downstream_froude: fr2,
                    energy_loss,
                    jump_length,
                    jump_type,
                    efficiency,
                    stilling_basin_required,
                    basin_length,
                    upstream_wse: prev.water_surface_elevation,
                    downstream_wse: curr.water_surface_elevation,
                });
            }
        }

        None
    }

    /// Calcula la profundidad conjugada (sequent depth) dada una profundidad supercrítica
    ///
    /// Usa la ecuación de Bélanger para secciones rectangulares.
    /// Para otras secciones, usa aproximación iterativa.
    #[allow(dead_code)]
    pub fn conjugate_depth(&self, section: &SectionType, discharge: f64, y1: f64) -> f64 {
        let props1 = section.hydraulic_properties(y1);
        let v1 = discharge / props1.area.max(0.001);
        let fr1 = v1 / (G * props1.hydraulic_depth.max(0.001)).sqrt();

        if fr1 <= 1.0 {
            // Ya es subcrítico, retornar la profundidad original
            return y1;
        }

        // Ecuación de Bélanger
        let ratio = 0.5 * ((1.0 + 8.0 * fr1.powi(2)).sqrt() - 1.0);
        y1 * ratio
    }
}

impl Default for GvfSolver {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/// Crear sistema de canal simple desde StationSections existentes
pub fn create_system_from_sections(
    name: &str,
    discharge: f64,
    sections: &[StationSection],
    bed_elevations: &[(f64, f64)],
    downstream_control: DownstreamControl,
) -> Result<ChannelSystem> {
    if sections.is_empty() {
        return Err(HydraulicError::InvalidParameter(
            "No sections provided".into(),
        ));
    }

    let mut reaches = Vec::new();

    for i in 0..sections.len() {
        let section = &sections[i];
        let end_station = if i + 1 < sections.len() {
            sections[i + 1].station
        } else {
            section.station + 10.0 // Extension por defecto
        };

        // Obtener elevaciones
        let start_elev = interpolate_elevation(bed_elevations, section.station);
        let end_elev = interpolate_elevation(bed_elevations, end_station);
        let slope = (start_elev - end_elev) / (end_station - section.station);

        reaches.push(ChannelReach {
            id: section.id.to_string(),
            start_station: section.station,
            end_station,
            section: section.section.clone(),
            manning_n: section.manning_n,
            slope: slope.abs(),
            start_elevation: start_elev,
            end_elevation: Some(end_elev), // Usar elevación calculada explícitamente
            element_type: ChannelElementType::Channel,
        });
    }

    Ok(ChannelSystem {
        name: name.to_string(),
        design_discharge: discharge,
        reaches,
        downstream_control,
    })
}

/// Interpolar elevacion
fn interpolate_elevation(elevations: &[(f64, f64)], station: f64) -> f64 {
    if elevations.is_empty() {
        return 0.0;
    }
    if elevations.len() == 1 {
        return elevations[0].1;
    }

    for window in elevations.windows(2) {
        let (s1, e1) = window[0];
        let (s2, e2) = window[1];

        if station >= s1 && station <= s2 {
            let t = (station - s1) / (s2 - s1);
            return e1 + t * (e2 - e1);
        }
    }

    // Extrapolar
    if station < elevations[0].0 {
        elevations[0].1
    } else {
        elevations.last().map(|e| e.1).unwrap_or(0.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normal_depth() {
        let solver = GvfSolver::new();
        let section = SectionType::rectangular(2.0, 2.0);

        let yn = solver.normal_depth(&section, 2.0, 0.001, 0.015).unwrap();

        // Verificar que la profundidad es razonable
        assert!(yn > 0.5);
        assert!(yn < 1.5);
    }

    #[test]
    fn test_critical_depth() {
        let solver = GvfSolver::new();
        let section = SectionType::rectangular(2.0, 2.0);

        let yc = solver.critical_depth(&section, 2.0).unwrap();

        // Para seccion rectangular: yc = (q²/g)^(1/3) donde q = Q/b
        let q: f64 = 2.0 / 2.0; // caudal unitario
        let yc_theoretical = (q.powi(2) / G).powf(1.0 / 3.0);

        assert!((yc - yc_theoretical).abs() < 0.05);
    }

    #[test]
    fn test_simple_channel_analysis() {
        let solver = GvfSolver::with_config(GvfConfig {
            step_size: 5.0,
            ..Default::default()
        });

        let system = ChannelSystem {
            name: "Test Channel".to_string(),
            design_discharge: 2.0,
            reaches: vec![ChannelReach {
                id: "reach-1".to_string(),
                start_station: 0.0,
                end_station: 100.0,
                section: SectionType::rectangular(2.0, 1.5),
                manning_n: 0.015,
                slope: 0.001,
                start_elevation: 100.0,
                end_elevation: None, // Use slope for calculation
                element_type: ChannelElementType::Channel,
            }],
            downstream_control: DownstreamControl::NormalDepth,
        };

        let result = solver.analyze(&system).unwrap();

        assert!(!result.profile.is_empty());
        assert!(result.summary.station_count > 0);
        assert!(result.summary.max_depth > 0.0);
    }

    #[test]
    fn test_profile_classification() {
        // M1 profile: y > yn > yc (mild slope, backwater)
        let profile_type = GvfProfileType::classify(1.5, 1.0, 0.7, 0.001);
        assert_eq!(profile_type, Some(GvfProfileType::M1));

        // M2 profile: yn > y > yc
        let profile_type = GvfProfileType::classify(0.85, 1.0, 0.7, 0.001);
        assert_eq!(profile_type, Some(GvfProfileType::M2));

        // S1 profile: y > yc > yn (steep slope)
        let profile_type = GvfProfileType::classify(1.0, 0.5, 0.7, 0.01);
        assert_eq!(profile_type, Some(GvfProfileType::S1));
    }
}
