//! Hydraulics Engine - Calculos Hidraulicos
//!
//! Implementa los calculos hidraulicos fundamentales:
//! - Ecuacion de Manning para flujo uniforme
//! - Numero de Froude y regimen de flujo
//! - Profundidad normal y critica
//! - Perfil de flujo gradualmente variado (GVF)
//! - Perdidas de carga en transiciones

use crate::sections::{SectionType, StationSection};
use crate::{HydraulicError, Result, G};
use serde::{Deserialize, Serialize};

/// Regimen de flujo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FlowRegime {
    /// Flujo subcritico (Fr < 1) - Controlado aguas abajo
    Subcritical,
    /// Flujo critico (Fr = 1)
    Critical,
    /// Flujo supercritico (Fr > 1) - Controlado aguas arriba
    Supercritical,
}

impl FlowRegime {
    /// Determinar regimen basado en numero de Froude
    pub fn from_froude(froude: f64) -> Self {
        if froude < 0.95 {
            FlowRegime::Subcritical
        } else if froude > 1.05 {
            FlowRegime::Supercritical
        } else {
            FlowRegime::Critical
        }
    }
}

/// Resultado de calculo de flujo
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowResult {
    /// Caudal (m^3/s)
    pub discharge: f64,

    /// Velocidad media (m/s)
    pub velocity: f64,

    /// Numero de Froude
    pub froude: f64,

    /// Regimen de flujo
    pub flow_regime: FlowRegime,

    /// Area mojada (m^2)
    pub area: f64,

    /// Perimetro mojado (m)
    pub wetted_perimeter: f64,

    /// Radio hidraulico (m)
    pub hydraulic_radius: f64,

    /// Profundidad de agua (m)
    pub water_depth: f64,

    /// Ancho superficial (m)
    pub top_width: f64,

    /// Energia especifica (m)
    pub specific_energy: f64,

    /// Fuerza especifica (m^3)
    pub specific_force: f64,
}

/// Punto del perfil de superficie de agua
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterSurfacePoint {
    /// Estacion (m)
    pub station: f64,

    /// Elevacion del fondo (m)
    pub bed_elevation: f64,

    /// Profundidad de agua (m)
    pub water_depth: f64,

    /// Elevacion de la superficie del agua (m)
    pub water_surface_elevation: f64,

    /// Velocidad (m/s)
    pub velocity: f64,

    /// Numero de Froude
    pub froude: f64,

    /// Regimen de flujo
    pub flow_regime: FlowRegime,

    /// Linea de energia (m)
    pub energy_grade_line: f64,
}

/// Motor de calculos hidraulicos
pub struct HydraulicsEngine;

impl HydraulicsEngine {
    /// Calcular flujo usando ecuacion de Manning
    ///
    /// Q = (1/n) * A * R^(2/3) * S^(1/2)
    ///
    /// Donde:
    /// - Q: Caudal (m^3/s)
    /// - n: Coeficiente de Manning
    /// - A: Area mojada (m^2)
    /// - R: Radio hidraulico (m)
    /// - S: Pendiente (m/m)
    pub fn manning_flow(
        section: &SectionType,
        slope: f64,
        manning_n: f64,
        water_depth: f64,
    ) -> FlowResult {
        let props = section.hydraulic_properties(water_depth);
        let slope_abs = slope.abs();

        // Ecuacion de Manning
        let velocity = if props.hydraulic_radius > 0.0 && slope_abs > 0.0 {
            (1.0 / manning_n) * props.hydraulic_radius.powf(2.0 / 3.0) * slope_abs.sqrt()
        } else {
            0.0
        };

        let discharge = velocity * props.area;

        // Numero de Froude
        let froude = if props.hydraulic_depth > 0.0 {
            velocity / (G * props.hydraulic_depth).sqrt()
        } else {
            0.0
        };

        // Energia especifica: E = y + V^2/(2g)
        let specific_energy = water_depth + velocity.powi(2) / (2.0 * G);

        // Fuerza especifica: M = Q^2/(gA) + A*y_bar
        let y_bar = water_depth / 2.0; // Centroide aproximado
        let specific_force = if props.area > 0.0 {
            discharge.powi(2) / (G * props.area) + props.area * y_bar
        } else {
            0.0
        };

        FlowResult {
            discharge,
            velocity,
            froude,
            flow_regime: FlowRegime::from_froude(froude),
            area: props.area,
            wetted_perimeter: props.wetted_perimeter,
            hydraulic_radius: props.hydraulic_radius,
            water_depth,
            top_width: props.top_width,
            specific_energy,
            specific_force,
        }
    }

    /// Calcular profundidad normal (flujo uniforme) para un caudal dado
    ///
    /// Resuelve iterativamente: Q = (1/n) * A(y) * R(y)^(2/3) * S^(1/2)
    pub fn normal_depth(
        section: &SectionType,
        discharge: f64,
        slope: f64,
        manning_n: f64,
        tolerance: f64,
        max_iterations: usize,
    ) -> Result<f64> {
        if discharge <= 0.0 {
            return Ok(0.0);
        }

        if slope <= 0.0 {
            return Err(HydraulicError::Calculation(
                "Slope must be positive for normal depth calculation".into(),
            ));
        }

        let max_depth = section.max_depth();
        let mut y_low = 0.001;
        let mut y_high = max_depth * 2.0;

        // Metodo de biseccion
        for _ in 0..max_iterations {
            let y_mid = (y_low + y_high) / 2.0;
            let q_mid = Self::manning_flow(section, slope, manning_n, y_mid).discharge;

            if (q_mid - discharge).abs() < tolerance {
                return Ok(y_mid);
            }

            if q_mid < discharge {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }
        }

        // Retornar mejor aproximacion
        Ok((y_low + y_high) / 2.0)
    }

    /// Calcular profundidad critica para un caudal dado
    ///
    /// En profundidad critica: Fr = 1, o equivalentemente:
    /// Q^2 / g = A^3 / T
    pub fn critical_depth(
        section: &SectionType,
        discharge: f64,
        tolerance: f64,
        max_iterations: usize,
    ) -> Result<f64> {
        if discharge <= 0.0 {
            return Ok(0.0);
        }

        let max_depth = section.max_depth();
        let target = discharge.powi(2) / G;

        let mut y_low = 0.001;
        let mut y_high = max_depth * 1.5;

        // Metodo de biseccion
        for _ in 0..max_iterations {
            let y_mid = (y_low + y_high) / 2.0;
            let props = section.hydraulic_properties(y_mid);

            // A^3 / T
            let section_factor = if props.top_width > 0.0 {
                props.area.powi(3) / props.top_width
            } else {
                0.0
            };

            if (section_factor - target).abs() < tolerance {
                return Ok(y_mid);
            }

            if section_factor < target {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }
        }

        Ok((y_low + y_high) / 2.0)
    }

    /// Calcular energia especifica
    pub fn specific_energy(velocity: f64, depth: f64) -> f64 {
        depth + velocity.powi(2) / (2.0 * G)
    }

    /// Calcular perfil de flujo gradualmente variado (GVF)
    ///
    /// Usa el metodo del paso estandar (Standard Step Method)
    pub fn gvf_profile(
        sections: &[StationSection],
        bed_elevations: &[(f64, f64)], // (station, elevation)
        _discharge: f64,
        downstream_depth: f64,
        step_size: f64,
    ) -> Result<Vec<WaterSurfacePoint>> {
        if sections.is_empty() {
            return Err(HydraulicError::Calculation("No sections provided".into()));
        }

        let mut profile = Vec::new();

        // Encontrar estacion inicial y final
        let start_station = sections.first().map(|s| s.station).unwrap_or(0.0);
        let end_station = sections.last().map(|s| s.station).unwrap_or(0.0);

        // Determinar direccion de calculo basado en regimen
        // (simplificacion: asumir subcritico, calcular aguas arriba)
        let current_depth = downstream_depth;
        let mut current_station = end_station;

        while current_station >= start_station {
            // Encontrar seccion aplicable
            let section = Self::find_section_at(sections, current_station);

            // Obtener elevacion del fondo
            let bed_elev = Self::interpolate_elevation(bed_elevations, current_station);

            // Calcular propiedades de flujo
            let flow = Self::manning_flow(
                &section.section,
                0.001, // Placeholder, se recalcula
                section.manning_n,
                current_depth,
            );

            let water_surface_elevation = bed_elev + current_depth;
            let energy_grade_line = water_surface_elevation + flow.velocity.powi(2) / (2.0 * G);

            profile.push(WaterSurfacePoint {
                station: current_station,
                bed_elevation: bed_elev,
                water_depth: current_depth,
                water_surface_elevation,
                velocity: flow.velocity,
                froude: flow.froude,
                flow_regime: flow.flow_regime,
                energy_grade_line,
            });

            // Siguiente paso
            current_station -= step_size;

            // TODO: Implementar ecuacion de energia para calcular nueva profundidad
            // Por ahora, aproximacion simple
        }

        profile.reverse();
        Ok(profile)
    }

    /// Encontrar seccion aplicable en una estacion
    fn find_section_at(sections: &[StationSection], station: f64) -> &StationSection {
        // Encontrar la seccion mas cercana anterior a la estacion
        sections
            .iter()
            .filter(|s| s.station <= station)
            .next_back()
            .unwrap_or(&sections[0])
    }

    /// Interpolar elevacion del fondo
    fn interpolate_elevation(elevations: &[(f64, f64)], station: f64) -> f64 {
        if elevations.is_empty() {
            return 0.0;
        }

        if elevations.len() == 1 {
            return elevations[0].1;
        }

        // Encontrar puntos adyacentes
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

    /// Calcular perdida de carga en transicion
    ///
    /// hL = K * |V2^2 - V1^2| / (2g)
    pub fn transition_head_loss(v1: f64, v2: f64, loss_coefficient: f64) -> f64 {
        loss_coefficient * (v2.powi(2) - v1.powi(2)).abs() / (2.0 * G)
    }

    /// Verificar capacidad del canal
    pub fn check_capacity(
        section: &SectionType,
        discharge: f64,
        slope: f64,
        manning_n: f64,
        min_freeboard: f64,
    ) -> CapacityCheck {
        let max_depth = section.max_depth();

        // Calcular profundidad normal
        let normal_depth = Self::normal_depth(section, discharge, slope, manning_n, 0.001, 100)
            .unwrap_or(max_depth);

        // Calcular profundidad critica
        let critical_depth =
            Self::critical_depth(section, discharge, 0.001, 100).unwrap_or(normal_depth);

        // Flujo a profundidad normal
        let flow = Self::manning_flow(section, slope, manning_n, normal_depth);

        // Verificaciones
        let freeboard = max_depth - normal_depth;
        let has_adequate_freeboard = freeboard >= min_freeboard;
        let is_subcritical = flow.flow_regime == FlowRegime::Subcritical;

        CapacityCheck {
            normal_depth,
            critical_depth,
            freeboard,
            has_adequate_freeboard,
            flow_regime: flow.flow_regime,
            is_subcritical,
            velocity: flow.velocity,
            is_velocity_safe: flow.velocity >= 0.3 && flow.velocity <= 3.0,
            design_capacity: Self::manning_flow(
                section,
                slope,
                manning_n,
                max_depth - min_freeboard,
            )
            .discharge,
        }
    }
}

/// Resultado de verificacion de capacidad
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapacityCheck {
    /// Profundidad normal (m)
    pub normal_depth: f64,

    /// Profundidad critica (m)
    pub critical_depth: f64,

    /// Bordo libre (m)
    pub freeboard: f64,

    /// Tiene bordo libre adecuado?
    pub has_adequate_freeboard: bool,

    /// Regimen de flujo
    pub flow_regime: FlowRegime,

    /// Es flujo subcritico?
    pub is_subcritical: bool,

    /// Velocidad (m/s)
    pub velocity: f64,

    /// Velocidad en rango seguro? (0.3 - 3.0 m/s tipico)
    pub is_velocity_safe: bool,

    /// Capacidad de diseno (m^3/s) con bordo libre
    pub design_capacity: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== Flow Regime Tests ==========

    #[test]
    fn test_flow_regime_from_froude() {
        assert_eq!(FlowRegime::from_froude(0.5), FlowRegime::Subcritical);
        assert_eq!(FlowRegime::from_froude(0.94), FlowRegime::Subcritical);
        assert_eq!(FlowRegime::from_froude(1.0), FlowRegime::Critical);
        assert_eq!(FlowRegime::from_froude(1.06), FlowRegime::Supercritical);
        assert_eq!(FlowRegime::from_froude(2.0), FlowRegime::Supercritical);
    }

    // ========== Manning Flow Tests ==========

    #[test]
    fn test_manning_flow_rectangular() {
        // Rectangular channel: width=2m, depth=1.5m
        // Water depth=1.0m, slope=0.001, manning n=0.015
        let section = SectionType::rectangular(2.0, 1.5);
        let result = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);

        // Area = 2.0 * 1.0 = 2.0 m²
        assert!((result.area - 2.0).abs() < 1e-6);

        // Perimeter = 2.0 + 2*1.0 = 4.0 m
        assert!((result.wetted_perimeter - 4.0).abs() < 1e-6);

        // R = A/P = 0.5 m
        assert!((result.hydraulic_radius - 0.5).abs() < 1e-6);

        // V = (1/n) * R^(2/3) * S^(1/2)
        // V = (1/0.015) * 0.5^0.667 * 0.001^0.5
        // V = 66.67 * 0.63 * 0.0316 = 1.33 m/s (approx)
        assert!(result.velocity > 1.0 && result.velocity < 1.5);

        // Q = V * A
        assert!((result.discharge - result.velocity * result.area).abs() < 1e-6);

        // Froude should be subcritical for this scenario
        assert_eq!(result.flow_regime, FlowRegime::Subcritical);
    }

    #[test]
    fn test_manning_flow_zero_slope() {
        let section = SectionType::rectangular(2.0, 1.5);
        let result = HydraulicsEngine::manning_flow(&section, 0.0, 0.015, 1.0);

        // Zero slope should give zero velocity
        assert!((result.velocity - 0.0).abs() < 1e-6);
        assert!((result.discharge - 0.0).abs() < 1e-6);
    }

    #[test]
    fn test_manning_flow_trapezoidal() {
        let section = SectionType::trapezoidal(2.0, 1.5, 1.5);
        let result = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);

        // Area = (2.0 + 5.0)/2 * 1.0 = 3.5 m²
        assert!((result.area - 3.5).abs() < 1e-6);

        // Should have valid velocity and discharge
        assert!(result.velocity > 0.0);
        assert!(result.discharge > 0.0);
    }

    // ========== Normal Depth Tests ==========

    #[test]
    fn test_normal_depth_rectangular() {
        let section = SectionType::rectangular(2.0, 1.5);
        let discharge = 2.0; // m³/s
        let slope = 0.001;
        let manning_n = 0.015;

        let yn = HydraulicsEngine::normal_depth(&section, discharge, slope, manning_n, 0.001, 100)
            .unwrap();

        // Verify by computing Q at yn
        let result = HydraulicsEngine::manning_flow(&section, slope, manning_n, yn);
        assert!((result.discharge - discharge).abs() < 0.01);
    }

    #[test]
    fn test_normal_depth_zero_discharge() {
        let section = SectionType::rectangular(2.0, 1.5);
        let yn = HydraulicsEngine::normal_depth(&section, 0.0, 0.001, 0.015, 0.001, 100).unwrap();
        assert!((yn - 0.0).abs() < 1e-6);
    }

    #[test]
    fn test_normal_depth_negative_slope_error() {
        let section = SectionType::rectangular(2.0, 1.5);
        let result = HydraulicsEngine::normal_depth(&section, 1.0, -0.001, 0.015, 0.001, 100);
        assert!(result.is_err());
    }

    // ========== Critical Depth Tests ==========

    #[test]
    fn test_critical_depth_rectangular() {
        let section = SectionType::rectangular(2.0, 1.5);
        let discharge = 2.0; // m³/s

        let yc = HydraulicsEngine::critical_depth(&section, discharge, 0.001, 100).unwrap();

        // At critical depth, Fr = 1
        // For rectangular: yc = (Q²/(g*b²))^(1/3)
        let expected_yc = (discharge.powi(2) / (G * 2.0_f64.powi(2))).powf(1.0 / 3.0);
        assert!((yc - expected_yc).abs() < 0.01);
    }

    #[test]
    fn test_critical_depth_zero_discharge() {
        let section = SectionType::rectangular(2.0, 1.5);
        let yc = HydraulicsEngine::critical_depth(&section, 0.0, 0.001, 100).unwrap();
        assert!((yc - 0.0).abs() < 1e-6);
    }

    #[test]
    fn test_normal_vs_critical_depth() {
        // For mild slope: yn > yc (subcritical)
        // For steep slope: yn < yc (supercritical)
        let section = SectionType::rectangular(2.0, 2.0);
        let discharge = 3.0;
        let manning_n = 0.015;

        let yc = HydraulicsEngine::critical_depth(&section, discharge, 0.001, 100).unwrap();

        // Mild slope
        let yn_mild =
            HydraulicsEngine::normal_depth(&section, discharge, 0.0005, manning_n, 0.001, 100)
                .unwrap();
        assert!(yn_mild > yc, "For mild slope, yn should be > yc");

        // Steep slope
        let yn_steep =
            HydraulicsEngine::normal_depth(&section, discharge, 0.01, manning_n, 0.001, 100)
                .unwrap();
        assert!(yn_steep < yc, "For steep slope, yn should be < yc");
    }

    // ========== Specific Energy Tests ==========

    #[test]
    fn test_specific_energy() {
        let velocity = 2.0; // m/s
        let depth = 1.0; // m

        let e = HydraulicsEngine::specific_energy(velocity, depth);

        // E = y + V²/(2g) = 1.0 + 4.0/(2*9.81) = 1.0 + 0.204 = 1.204 m
        let expected = 1.0 + velocity.powi(2) / (2.0 * G);
        assert!((e - expected).abs() < 1e-6);
    }

    // ========== Transition Head Loss Tests ==========

    #[test]
    fn test_transition_head_loss() {
        let v1 = 1.0; // m/s upstream
        let v2 = 2.0; // m/s downstream (contraction)
        let k = 0.5; // Loss coefficient

        let hl = HydraulicsEngine::transition_head_loss(v1, v2, k);

        // hL = K * |V2² - V1²| / (2g) = 0.5 * |4-1| / (2*9.81) = 0.0765 m
        let expected = 0.5 * (4.0_f64 - 1.0).abs() / (2.0 * G);
        assert!((hl - expected).abs() < 1e-6);
    }

    // ========== Capacity Check Tests ==========

    #[test]
    fn test_capacity_check() {
        let section = SectionType::rectangular(2.0, 2.0);
        let discharge = 3.0;
        let slope = 0.001;
        let manning_n = 0.015;
        let min_freeboard = 0.3;

        let check =
            HydraulicsEngine::check_capacity(&section, discharge, slope, manning_n, min_freeboard);

        // Normal depth should be positive
        assert!(check.normal_depth > 0.0);

        // Critical depth should be positive
        assert!(check.critical_depth > 0.0);

        // Freeboard = max_depth - normal_depth
        assert!((check.freeboard - (2.0 - check.normal_depth)).abs() < 1e-6);

        // Velocity should be positive
        assert!(check.velocity > 0.0);
    }

    #[test]
    fn test_capacity_check_subcritical() {
        // Mild slope should produce subcritical flow
        let section = SectionType::rectangular(3.0, 2.0);
        let check = HydraulicsEngine::check_capacity(&section, 2.0, 0.0005, 0.015, 0.3);

        assert!(check.is_subcritical);
        assert_eq!(check.flow_regime, FlowRegime::Subcritical);
    }

    // ========== Froude Number Tests ==========

    #[test]
    fn test_froude_number_calculation() {
        let section = SectionType::rectangular(2.0, 2.0);

        // High velocity, shallow depth -> supercritical
        let result_super = HydraulicsEngine::manning_flow(&section, 0.05, 0.010, 0.3);
        assert!(result_super.froude > 1.0);
        assert_eq!(result_super.flow_regime, FlowRegime::Supercritical);

        // Low velocity, deep flow -> subcritical
        let result_sub = HydraulicsEngine::manning_flow(&section, 0.0001, 0.020, 1.5);
        assert!(result_sub.froude < 1.0);
        assert_eq!(result_sub.flow_regime, FlowRegime::Subcritical);
    }
}
