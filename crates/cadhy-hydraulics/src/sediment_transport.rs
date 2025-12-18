//! Sediment Transport Module - Transporte de Sedimentos
//!
//! Implementa análisis de transporte de sedimentos basado en:
//! - Parámetro de Shields (inicio de movimiento)
//! - Meyer-Peter & Müller (transporte de fondo)
//! - Einstein-Brown (transporte total)
//! - Hjulström (velocidad crítica)
//!
//! # Referencias:
//! - Shields, A. (1936) - Application of Similarity Principles
//! - Meyer-Peter & Müller (1948) - Formulas for Bed-Load Transport
//! - van Rijn, L.C. (1984) - Sediment Transport
//! - García, M.H. (2008) - Sedimentation Engineering (ASCE Manual 110)

use crate::G;
use serde::{Deserialize, Serialize};

// =============================================================================
// CONSTANTS
// =============================================================================

/// Densidad del agua a 20°C (kg/m³)
pub const WATER_DENSITY: f64 = 1000.0;

/// Densidad típica de sedimentos (cuarzo/arena) (kg/m³)
pub const SEDIMENT_DENSITY_QUARTZ: f64 = 2650.0;

/// Viscosidad cinemática del agua a 20°C (m²/s)
pub const KINEMATIC_VISCOSITY: f64 = 1.003e-6;

/// Viscosidad dinámica del agua a 20°C (Pa·s)
pub const DYNAMIC_VISCOSITY: f64 = 1.002e-3;

/// Constante de von Kármán
pub const VON_KARMAN: f64 = 0.41;

// =============================================================================
// SEDIMENT PROPERTIES
// =============================================================================

/// Clasificación de sedimentos según tamaño (Wentworth scale)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SedimentClass {
    /// Arcilla (< 0.004 mm)
    Clay,
    /// Limo (0.004 - 0.0625 mm)
    Silt,
    /// Arena muy fina (0.0625 - 0.125 mm)
    VeryFineSand,
    /// Arena fina (0.125 - 0.25 mm)
    FineSand,
    /// Arena media (0.25 - 0.5 mm)
    MediumSand,
    /// Arena gruesa (0.5 - 1.0 mm)
    CoarseSand,
    /// Arena muy gruesa (1.0 - 2.0 mm)
    VeryCoarseSand,
    /// Grava fina (2.0 - 4.0 mm)
    FineGravel,
    /// Grava media (4.0 - 8.0 mm)
    MediumGravel,
    /// Grava gruesa (8.0 - 16.0 mm)
    CoarseGravel,
    /// Guijarro (16.0 - 64.0 mm)
    Pebble,
    /// Canto rodado (64.0 - 256.0 mm)
    Cobble,
    /// Bloque (> 256.0 mm)
    Boulder,
}

impl SedimentClass {
    /// Clasificar sedimento según diámetro d50 (en metros)
    pub fn from_diameter(d50_m: f64) -> Self {
        let d_mm = d50_m * 1000.0; // Convertir a mm

        if d_mm < 0.004 {
            Self::Clay
        } else if d_mm < 0.0625 {
            Self::Silt
        } else if d_mm < 0.125 {
            Self::VeryFineSand
        } else if d_mm < 0.25 {
            Self::FineSand
        } else if d_mm < 0.5 {
            Self::MediumSand
        } else if d_mm < 1.0 {
            Self::CoarseSand
        } else if d_mm < 2.0 {
            Self::VeryCoarseSand
        } else if d_mm < 4.0 {
            Self::FineGravel
        } else if d_mm < 8.0 {
            Self::MediumGravel
        } else if d_mm < 16.0 {
            Self::CoarseGravel
        } else if d_mm < 64.0 {
            Self::Pebble
        } else if d_mm < 256.0 {
            Self::Cobble
        } else {
            Self::Boulder
        }
    }

    /// Obtener nombre en español
    pub fn name_es(&self) -> &'static str {
        match self {
            Self::Clay => "Arcilla",
            Self::Silt => "Limo",
            Self::VeryFineSand => "Arena muy fina",
            Self::FineSand => "Arena fina",
            Self::MediumSand => "Arena media",
            Self::CoarseSand => "Arena gruesa",
            Self::VeryCoarseSand => "Arena muy gruesa",
            Self::FineGravel => "Grava fina",
            Self::MediumGravel => "Grava media",
            Self::CoarseGravel => "Grava gruesa",
            Self::Pebble => "Guijarro",
            Self::Cobble => "Canto rodado",
            Self::Boulder => "Bloque",
        }
    }

    /// Obtener rango típico de diámetros (mm)
    pub fn diameter_range_mm(&self) -> (f64, f64) {
        match self {
            Self::Clay => (0.0, 0.004),
            Self::Silt => (0.004, 0.0625),
            Self::VeryFineSand => (0.0625, 0.125),
            Self::FineSand => (0.125, 0.25),
            Self::MediumSand => (0.25, 0.5),
            Self::CoarseSand => (0.5, 1.0),
            Self::VeryCoarseSand => (1.0, 2.0),
            Self::FineGravel => (2.0, 4.0),
            Self::MediumGravel => (4.0, 8.0),
            Self::CoarseGravel => (8.0, 16.0),
            Self::Pebble => (16.0, 64.0),
            Self::Cobble => (64.0, 256.0),
            Self::Boulder => (256.0, 1000.0),
        }
    }
}

/// Propiedades del sedimento
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SedimentProperties {
    /// Diámetro característico d50 (m)
    pub d50: f64,

    /// Diámetro d16 (m) - para cálculo de gradación
    pub d16: Option<f64>,

    /// Diámetro d84 (m) - para cálculo de gradación
    pub d84: Option<f64>,

    /// Diámetro d90 (m) - para rugosidad
    pub d90: Option<f64>,

    /// Densidad del sedimento (kg/m³)
    pub density: f64,

    /// Ángulo de reposo (grados)
    pub angle_of_repose: f64,

    /// Porosidad (0-1)
    pub porosity: f64,

    /// Clasificación
    pub sediment_class: SedimentClass,
}

impl SedimentProperties {
    /// Crear propiedades de sedimento con valores por defecto
    pub fn new(d50_m: f64) -> Self {
        Self {
            d50: d50_m,
            d16: None,
            d84: None,
            d90: None,
            density: SEDIMENT_DENSITY_QUARTZ,
            angle_of_repose: 35.0,
            porosity: 0.4,
            sediment_class: SedimentClass::from_diameter(d50_m),
        }
    }

    /// Crear arena media típica (d50 = 0.5 mm)
    pub fn medium_sand() -> Self {
        Self::new(0.0005)
    }

    /// Crear grava fina típica (d50 = 3 mm)
    pub fn fine_gravel() -> Self {
        Self::new(0.003)
    }

    /// Gravedad específica relativa (s = ρs/ρw)
    pub fn specific_gravity(&self) -> f64 {
        self.density / WATER_DENSITY
    }

    /// Gravedad específica sumergida (s - 1)
    pub fn submerged_specific_gravity(&self) -> f64 {
        self.specific_gravity() - 1.0
    }

    /// Coeficiente de gradación σg = sqrt(d84/d16)
    pub fn gradation_coefficient(&self) -> Option<f64> {
        match (self.d84, self.d16) {
            (Some(d84), Some(d16)) if d16 > 0.0 => Some((d84 / d16).sqrt()),
            _ => None,
        }
    }

    /// Diámetro adimensional d* (particle parameter)
    /// d* = d50 × [(s-1)g/ν²]^(1/3)
    pub fn dimensionless_diameter(&self) -> f64 {
        let s_minus_1 = self.submerged_specific_gravity();
        let term = (s_minus_1 * G) / KINEMATIC_VISCOSITY.powi(2);
        self.d50 * term.powf(1.0 / 3.0)
    }

    /// Velocidad de caída (settling velocity) - Van Rijn (1984)
    /// Para d50 < 0.1mm, 0.1-1mm, >1mm
    pub fn settling_velocity(&self) -> f64 {
        let d = self.d50;
        let s = self.specific_gravity();
        let nu = KINEMATIC_VISCOSITY;

        let d_mm = d * 1000.0;

        if d_mm < 0.1 {
            // Ley de Stokes para partículas muy finas
            (s - 1.0) * G * d.powi(2) / (18.0 * nu)
        } else if d_mm <= 1.0 {
            // Rango intermedio (Van Rijn)
            10.0 * nu / d * ((1.0 + 0.01 * (s - 1.0) * G * d.powi(3) / nu.powi(2)).sqrt() - 1.0)
        } else {
            // Partículas gruesas
            1.1 * ((s - 1.0) * G * d).sqrt()
        }
    }
}

impl Default for SedimentProperties {
    fn default() -> Self {
        Self::medium_sand()
    }
}

// =============================================================================
// SHIELDS ANALYSIS
// =============================================================================

/// Estado del movimiento de sedimentos
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SedimentMotionState {
    /// Sin movimiento (estable)
    NoMotion,
    /// Movimiento incipiente (inicio)
    Incipient,
    /// Transporte débil de fondo
    WeakBedLoad,
    /// Transporte general de fondo
    GeneralBedLoad,
    /// Transporte intenso con suspensión
    IntenseTransport,
    /// Régimen de alta concentración
    SheetFlow,
}

impl SedimentMotionState {
    /// Determinar estado según τ*/τ*c ratio
    pub fn from_shields_ratio(ratio: f64) -> Self {
        if ratio < 0.8 {
            Self::NoMotion
        } else if ratio < 1.0 {
            Self::Incipient
        } else if ratio < 2.0 {
            Self::WeakBedLoad
        } else if ratio < 5.0 {
            Self::GeneralBedLoad
        } else if ratio < 25.0 {
            Self::IntenseTransport
        } else {
            Self::SheetFlow
        }
    }

    /// Descripción en español
    pub fn description_es(&self) -> &'static str {
        match self {
            Self::NoMotion => "Sin movimiento - Lecho estable",
            Self::Incipient => "Movimiento incipiente - Inicio de transporte",
            Self::WeakBedLoad => "Transporte débil de fondo",
            Self::GeneralBedLoad => "Transporte general de fondo",
            Self::IntenseTransport => "Transporte intenso con suspensión parcial",
            Self::SheetFlow => "Flujo en lámina - Alta concentración",
        }
    }

    /// ¿Hay erosión activa?
    pub fn is_eroding(&self) -> bool {
        !matches!(self, Self::NoMotion)
    }
}

/// Resultado del análisis de Shields
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShieldsAnalysis {
    /// Esfuerzo cortante en el lecho τ₀ (Pa)
    pub bed_shear_stress: f64,

    /// Parámetro de Shields τ* (adimensional)
    pub shields_parameter: f64,

    /// Parámetro de Shields crítico τ*c
    pub critical_shields: f64,

    /// Ratio τ*/τ*c
    pub shields_ratio: f64,

    /// Estado del movimiento
    pub motion_state: SedimentMotionState,

    /// Velocidad de corte u* (m/s)
    pub shear_velocity: f64,

    /// Velocidad crítica de erosión (m/s)
    pub critical_velocity: f64,

    /// Esfuerzo cortante crítico τc (Pa)
    pub critical_shear_stress: f64,

    /// Exceso de esfuerzo cortante (τ₀ - τc) (Pa)
    pub excess_shear_stress: f64,

    /// Número de Reynolds de partícula Re*
    pub particle_reynolds: f64,

    /// Factor de seguridad contra erosión
    pub safety_factor: f64,

    /// ¿Hay riesgo de erosión?
    pub erosion_risk: bool,

    /// Descripción del estado
    pub description: String,
}

/// Motor de análisis de Shields
pub struct ShieldsAnalyzer {
    /// Propiedades del sedimento
    sediment: SedimentProperties,

    /// Densidad del agua (kg/m³)
    water_density: f64,
}

impl ShieldsAnalyzer {
    /// Crear nuevo analizador
    pub fn new(sediment: SedimentProperties) -> Self {
        Self {
            sediment,
            water_density: WATER_DENSITY,
        }
    }

    /// Crear con arena media por defecto
    pub fn default_sand() -> Self {
        Self::new(SedimentProperties::medium_sand())
    }

    /// Calcular esfuerzo cortante en el lecho
    /// τ₀ = ρ × g × R × Sf
    /// donde R = radio hidráulico, Sf = pendiente de fricción
    pub fn bed_shear_stress(&self, hydraulic_radius: f64, friction_slope: f64) -> f64 {
        self.water_density * G * hydraulic_radius * friction_slope
    }

    /// Calcular velocidad de corte u* = sqrt(τ₀/ρ)
    pub fn shear_velocity(&self, bed_shear_stress: f64) -> f64 {
        (bed_shear_stress / self.water_density).sqrt()
    }

    /// Calcular parámetro de Shields τ*
    /// τ* = τ₀ / [(ρs - ρ) × g × d50]
    pub fn shields_parameter(&self, bed_shear_stress: f64) -> f64 {
        let denominator = (self.sediment.density - self.water_density) * G * self.sediment.d50;
        if denominator > 0.0 {
            bed_shear_stress / denominator
        } else {
            0.0
        }
    }

    /// Calcular número de Reynolds de partícula
    /// Re* = u* × d50 / ν
    pub fn particle_reynolds(&self, shear_velocity: f64) -> f64 {
        shear_velocity * self.sediment.d50 / KINEMATIC_VISCOSITY
    }

    /// Calcular parámetro de Shields crítico τ*c
    /// Usando la curva de Shields modificada (Soulsby & Whitehouse, 1997)
    /// τ*c = 0.30/(1+1.2D*) + 0.055[1-exp(-0.020D*)]
    pub fn critical_shields(&self) -> f64 {
        let d_star = self.sediment.dimensionless_diameter();

        if d_star <= 0.0 {
            return 0.047; // Valor por defecto
        }

        // Fórmula de Soulsby-Whitehouse (1997)
        0.30 / (1.0 + 1.2 * d_star) + 0.055 * (1.0 - (-0.020 * d_star).exp())
    }

    /// Calcular esfuerzo cortante crítico τc (Pa)
    pub fn critical_shear_stress(&self) -> f64 {
        let tau_star_c = self.critical_shields();
        tau_star_c * (self.sediment.density - self.water_density) * G * self.sediment.d50
    }

    /// Calcular velocidad crítica usando Hjulström modificada
    /// Para flujo turbulento rugoso
    pub fn critical_velocity(&self, water_depth: f64) -> f64 {
        let d = self.sediment.d50;
        let d_mm = d * 1000.0;

        if d_mm < 0.1 {
            // Sedimentos cohesivos (arcilla, limo fino)
            // Hjulström: Vc aumenta para partículas muy finas
            0.2 + 0.5 * (0.1 / d_mm).powf(0.5)
        } else if d_mm < 0.5 {
            // Arena fina - zona de mínima velocidad crítica
            let tau_c = self.critical_shear_stress();
            // Vc = sqrt(τc / (Cf × ρ)), donde Cf ≈ 0.003-0.01
            let cf = 0.005;
            (tau_c / (cf * self.water_density)).sqrt()
        } else {
            // Arena gruesa y gravas - Shields
            let tau_c = self.critical_shear_stress();
            // Usando relación logarítmica para velocidad media
            let u_star_c = (tau_c / self.water_density).sqrt();
            // V/u* ≈ 5.75 × log10(12.27 × R/ks) para flujo rugoso
            let ks = 2.5 * d; // Rugosidad equivalente
            let ratio = if water_depth > ks {
                5.75 * (12.27 * water_depth / ks).log10()
            } else {
                8.5 // Valor mínimo
            };
            u_star_c * ratio
        }
    }

    /// Realizar análisis completo de Shields
    pub fn analyze(
        &self,
        hydraulic_radius: f64,
        friction_slope: f64,
        water_depth: f64,
        velocity: f64,
    ) -> ShieldsAnalysis {
        // Calcular esfuerzos
        let tau_0 = self.bed_shear_stress(hydraulic_radius, friction_slope);
        let u_star = self.shear_velocity(tau_0);
        let tau_star = self.shields_parameter(tau_0);
        let tau_star_c = self.critical_shields();
        let tau_c = self.critical_shear_stress();
        let re_star = self.particle_reynolds(u_star);
        let v_crit = self.critical_velocity(water_depth);

        // Calcular ratios y estados
        let shields_ratio = if tau_star_c > 0.0 {
            tau_star / tau_star_c
        } else {
            0.0
        };
        let motion_state = SedimentMotionState::from_shields_ratio(shields_ratio);
        let excess_shear = (tau_0 - tau_c).max(0.0);
        let safety_factor = if tau_0 > 0.0 { tau_c / tau_0 } else { f64::MAX };
        let erosion_risk = tau_0 > tau_c || velocity > v_crit;

        // Generar descripción
        let description = format!(
            "{} | τ* = {:.4} (crítico: {:.4}) | SF = {:.2}",
            motion_state.description_es(),
            tau_star,
            tau_star_c,
            safety_factor
        );

        ShieldsAnalysis {
            bed_shear_stress: tau_0,
            shields_parameter: tau_star,
            critical_shields: tau_star_c,
            shields_ratio,
            motion_state,
            shear_velocity: u_star,
            critical_velocity: v_crit,
            critical_shear_stress: tau_c,
            excess_shear_stress: excess_shear,
            particle_reynolds: re_star,
            safety_factor,
            erosion_risk,
            description,
        }
    }
}

// =============================================================================
// SEDIMENT TRANSPORT CALCULATIONS
// =============================================================================

/// Resultado del cálculo de transporte de sedimentos
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SedimentTransportResult {
    /// Transporte de fondo qb (m³/s/m o kg/s/m)
    pub bed_load: f64,

    /// Transporte en suspensión qs (m³/s/m o kg/s/m)
    pub suspended_load: f64,

    /// Transporte total qt (m³/s/m o kg/s/m)
    pub total_load: f64,

    /// Unidad del resultado
    pub unit: TransportUnit,

    /// Método utilizado
    pub method: TransportMethod,

    /// Concentración de sedimentos (ppm o mg/L)
    pub concentration: f64,

    /// Capacidad de transporte (kg/día para ancho unitario)
    pub daily_capacity_per_meter: f64,
}

/// Unidad para transporte de sedimentos
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TransportUnit {
    /// Volumen por ancho (m³/s/m)
    VolumePerWidth,
    /// Masa por ancho (kg/s/m)
    MassPerWidth,
}

/// Método de cálculo de transporte
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TransportMethod {
    /// Meyer-Peter & Müller (1948)
    MeyerPeterMuller,
    /// Einstein-Brown
    EinsteinBrown,
    /// Van Rijn (1984)
    VanRijn,
    /// Engelund-Hansen
    EngelundHansen,
    /// Ackers-White
    AckersWhite,
}

/// Motor de transporte de sedimentos
pub struct SedimentTransportEngine {
    sediment: SedimentProperties,
    water_density: f64,
}

impl SedimentTransportEngine {
    pub fn new(sediment: SedimentProperties) -> Self {
        Self {
            sediment,
            water_density: WATER_DENSITY,
        }
    }

    /// Meyer-Peter & Müller (1948) - Transporte de fondo
    /// qb* = 8 × (τ* - τ*c)^1.5
    /// Aplicable para: gravas y arenas gruesas, τ* > τ*c
    pub fn meyer_peter_muller(&self, shields_param: f64, critical_shields: f64) -> f64 {
        if shields_param <= critical_shields {
            return 0.0;
        }

        let excess = shields_param - critical_shields;
        let qb_star = 8.0 * excess.powf(1.5);

        // Convertir a dimensional: qb = qb* × sqrt((s-1) × g × d³)
        let s_minus_1 = self.sediment.submerged_specific_gravity();
        let d = self.sediment.d50;

        qb_star * (s_minus_1 * G * d.powi(3)).sqrt()
    }

    /// Einstein-Brown - Transporte de fondo
    /// Función de Einstein para intensidad de transporte
    pub fn einstein_brown(&self, shields_param: f64) -> f64 {
        if shields_param <= 0.0 {
            return 0.0;
        }

        // Función de Einstein simplificada
        let phi = if shields_param < 0.1 {
            40.0 * shields_param.powi(3)
        } else {
            2.15 * (-0.391 / shields_param).exp()
        };

        let s_minus_1 = self.sediment.submerged_specific_gravity();
        let d = self.sediment.d50;

        phi * (s_minus_1 * G * d.powi(3)).sqrt()
    }

    /// Van Rijn (1984) - Transporte de fondo
    /// Para arenas (0.2 - 2 mm)
    pub fn van_rijn_bed_load(
        &self,
        shields_param: f64,
        critical_shields: f64,
        _water_depth: f64,
    ) -> f64 {
        if shields_param <= critical_shields {
            return 0.0;
        }

        let d = self.sediment.d50;
        let d_star = self.sediment.dimensionless_diameter();
        let t = (shields_param - critical_shields) / critical_shields; // Transport stage parameter

        if t <= 0.0 || d_star <= 0.0 {
            return 0.0;
        }

        // qb = 0.053 × sqrt((s-1)g) × d^1.5 × T^2.1 / D*^0.3
        let s_minus_1 = self.sediment.submerged_specific_gravity();

        0.053 * (s_minus_1 * G).sqrt() * d.powf(1.5) * t.powf(2.1) / d_star.powf(0.3)
    }

    /// Van Rijn (1984) - Transporte en suspensión
    pub fn van_rijn_suspended_load(
        &self,
        velocity: f64,
        water_depth: f64,
        shear_velocity: f64,
    ) -> f64 {
        let ws = self.sediment.settling_velocity();

        // Altura de referencia a = max(ks, 0.01h)
        let ks = 3.0 * self.sediment.d50;
        let a = ks.max(0.01 * water_depth);

        // Concentración de referencia ca
        let d = self.sediment.d50;
        let d_star = self.sediment.dimensionless_diameter();

        // T = (u*² - u*c²) / u*c²
        let u_star_c = (self.critical_shear_stress() / self.water_density).sqrt();
        if shear_velocity <= u_star_c {
            return 0.0;
        }

        let t = (shear_velocity.powi(2) - u_star_c.powi(2)) / u_star_c.powi(2);

        // ca = 0.015 × d × T^1.5 / (a × D*^0.3)
        let ca = 0.015 * d * t.powf(1.5) / (a * d_star.powf(0.3));

        // Perfil de Rouse Z = ws / (κ × u*)
        let z = ws / (VON_KARMAN * shear_velocity);

        // Factor de forma F (simplificado)
        let f = if z < 2.5 {
            ((1.0 - a / water_depth) / (a / water_depth)).powf(z)
        } else {
            1.0
        };

        // qs = F × ca × u × h
        f * ca * velocity * water_depth
    }

    /// Calcular transporte total
    pub fn calculate(
        &self,
        shields_analysis: &ShieldsAnalysis,
        velocity: f64,
        water_depth: f64,
        method: TransportMethod,
    ) -> SedimentTransportResult {
        let tau_star = shields_analysis.shields_parameter;
        let tau_star_c = shields_analysis.critical_shields;
        let u_star = shields_analysis.shear_velocity;

        let (bed_load, suspended_load) = match method {
            TransportMethod::MeyerPeterMuller => {
                (self.meyer_peter_muller(tau_star, tau_star_c), 0.0)
            }
            TransportMethod::EinsteinBrown => (self.einstein_brown(tau_star), 0.0),
            TransportMethod::VanRijn => {
                let qb = self.van_rijn_bed_load(tau_star, tau_star_c, water_depth);
                let qs = self.van_rijn_suspended_load(velocity, water_depth, u_star);
                (qb, qs)
            }
            TransportMethod::EngelundHansen => {
                // Engelund-Hansen (transporte total)
                let f = tau_star.powf(2.5);
                let s_minus_1 = self.sediment.submerged_specific_gravity();
                let d = self.sediment.d50;
                let qt = 0.05 * (s_minus_1 * G).sqrt() * d.powf(1.5) * f;
                (qt * 0.7, qt * 0.3) // Aproximación 70% fondo, 30% suspensión
            }
            TransportMethod::AckersWhite => {
                // Simplificación de Ackers-White
                let qt = self.meyer_peter_muller(tau_star, tau_star_c) * 1.5;
                (qt * 0.6, qt * 0.4)
            }
        };

        let total_load = bed_load + suspended_load;

        // Concentración en ppm (mg/L)
        let concentration = if velocity * water_depth > 0.0 {
            (total_load * self.sediment.density * 1e6) / (velocity * water_depth)
        } else {
            0.0
        };

        // Capacidad diaria por metro de ancho (kg/día/m)
        let daily_capacity = total_load * self.sediment.density * 86400.0;

        SedimentTransportResult {
            bed_load,
            suspended_load,
            total_load,
            unit: TransportUnit::VolumePerWidth,
            method,
            concentration,
            daily_capacity_per_meter: daily_capacity,
        }
    }

    fn critical_shear_stress(&self) -> f64 {
        let analyzer = ShieldsAnalyzer::new(self.sediment.clone());
        analyzer.critical_shear_stress()
    }
}

// =============================================================================
// EROSION ANALYSIS
// =============================================================================

/// Análisis completo de erosión y sedimentación para una estación
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StationSedimentAnalysis {
    /// Estación (m)
    pub station: f64,

    /// Análisis de Shields
    pub shields: ShieldsAnalysis,

    /// Transporte de sedimentos (si aplica)
    pub transport: Option<SedimentTransportResult>,

    /// Propiedades del sedimento usado
    pub sediment_class: SedimentClass,

    /// Recomendaciones
    pub recommendations: Vec<String>,
}

/// Analizar perfil completo para sedimentos
pub fn analyze_profile_sediments(
    stations: &[(f64, f64, f64, f64)], // (station, R, Sf, y, V)
    sediment: &SedimentProperties,
) -> Vec<StationSedimentAnalysis> {
    let analyzer = ShieldsAnalyzer::new(sediment.clone());
    let transport_engine = SedimentTransportEngine::new(sediment.clone());

    stations
        .iter()
        .map(|(station, r, sf, y)| {
            let velocity = 1.0; // Placeholder - should come from actual data
            let shields = analyzer.analyze(*r, *sf, *y, velocity);

            let transport = if shields.erosion_risk {
                Some(transport_engine.calculate(&shields, velocity, *y, TransportMethod::VanRijn))
            } else {
                None
            };

            let mut recommendations = Vec::new();

            match shields.motion_state {
                SedimentMotionState::NoMotion => {
                    recommendations.push("Lecho estable - No se requieren medidas".to_string());
                }
                SedimentMotionState::Incipient => {
                    recommendations
                        .push("Movimiento incipiente - Monitorear condición del lecho".to_string());
                }
                SedimentMotionState::WeakBedLoad | SedimentMotionState::GeneralBedLoad => {
                    recommendations
                        .push("Transporte activo - Considerar protección del lecho".to_string());
                    recommendations.push(format!(
                        "Velocidad crítica: {:.2} m/s",
                        shields.critical_velocity
                    ));
                }
                SedimentMotionState::IntenseTransport => {
                    recommendations
                        .push("Erosión significativa - Revestimiento requerido".to_string());
                    recommendations.push("Considerar enrocado o gaviones".to_string());
                }
                SedimentMotionState::SheetFlow => {
                    recommendations.push("Erosión severa - Rediseño recomendado".to_string());
                    recommendations.push("Reducir pendiente o aumentar sección".to_string());
                }
            }

            StationSedimentAnalysis {
                station: *station,
                shields,
                transport,
                sediment_class: sediment.sediment_class,
                recommendations,
            }
        })
        .collect()
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sediment_classification() {
        // 0.3mm = 0.0003m -> Medium Sand (0.25-0.5mm)
        assert_eq!(
            SedimentClass::from_diameter(0.0003),
            SedimentClass::MediumSand
        );
        // 5mm = 0.005m -> Medium Gravel (4-8mm)
        assert_eq!(
            SedimentClass::from_diameter(0.005),
            SedimentClass::MediumGravel
        );
        // 3mm = 0.003m -> Fine Gravel (2-4mm)
        assert_eq!(
            SedimentClass::from_diameter(0.003),
            SedimentClass::FineGravel
        );
        // 0.02mm = 0.00002m -> Silt (0.004-0.0625mm)
        assert_eq!(SedimentClass::from_diameter(0.00002), SedimentClass::Silt);
    }

    #[test]
    fn test_shields_critical() {
        let sediment = SedimentProperties::medium_sand();
        let analyzer = ShieldsAnalyzer::new(sediment);

        let tau_star_c = analyzer.critical_shields();

        // Para arena media, τ*c ≈ 0.03-0.06
        assert!(tau_star_c > 0.02 && tau_star_c < 0.10);
    }

    #[test]
    fn test_settling_velocity() {
        let sand = SedimentProperties::new(0.0005); // 0.5 mm arena
        let ws = sand.settling_velocity();

        // Velocidad de caída para arena de 0.5mm ≈ 0.05-0.08 m/s
        assert!(ws > 0.03 && ws < 0.15);
    }

    #[test]
    fn test_shields_analysis() {
        let sediment = SedimentProperties::medium_sand();
        let analyzer = ShieldsAnalyzer::new(sediment);

        // Condiciones típicas de canal
        let r = 0.5; // Radio hidráulico
        let sf = 0.001; // Pendiente de fricción
        let y = 1.0; // Profundidad
        let v = 1.0; // Velocidad

        let result = analyzer.analyze(r, sf, y, v);

        assert!(result.bed_shear_stress > 0.0);
        assert!(result.shields_parameter > 0.0);
        assert!(result.safety_factor > 0.0);
    }

    #[test]
    fn test_meyer_peter_muller() {
        let sediment = SedimentProperties::fine_gravel();
        let engine = SedimentTransportEngine::new(sediment);

        // Con exceso de esfuerzo cortante
        let qb = engine.meyer_peter_muller(0.1, 0.05);
        assert!(qb > 0.0);

        // Sin exceso (debajo del crítico)
        let qb_zero = engine.meyer_peter_muller(0.03, 0.05);
        assert_eq!(qb_zero, 0.0);
    }
}
