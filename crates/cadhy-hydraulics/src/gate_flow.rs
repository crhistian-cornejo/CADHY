//! Gate Flow Analysis Module - Análisis de Flujo en Compuertas
//!
//! Implementa ecuaciones de flujo bajo diferentes tipos de compuertas:
//! - Compuerta deslizante (sluice gate)
//! - Compuerta radial (Tainter gate)
//! - Compuerta de sector
//!
//! # Ecuaciones implementadas:
//! - Flujo libre: Q = Cd × b × a × √(2g × H)
//! - Flujo sumergido: Q = Cd × b × a × √(2g × (H₁ - H₂))
//! - Coeficientes de descarga según geometría
//!
//! # Referencias:
//! - Henderson, F.M. (1966) - Open Channel Flow
//! - Swamee, P.K. (1992) - Sluice Gate Discharge Equations
//! - USBR (1987) - Design of Small Dams

use crate::G;
use serde::{Deserialize, Serialize};

// =============================================================================
// GATE TYPES
// =============================================================================

/// Tipo de compuerta
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GateType {
    /// Compuerta deslizante vertical (sluice gate)
    SluiceVertical,
    /// Compuerta deslizante con labio inclinado
    SluiceInclined {
        /// Ángulo del labio (grados desde vertical)
        lip_angle: f64,
    },
    /// Compuerta radial (Tainter gate)
    Radial {
        /// Radio de la compuerta (m)
        radius: f64,
        /// Ángulo del eje del pivote (grados)
        pivot_angle: f64,
    },
    /// Compuerta de sector
    Sector {
        /// Radio del sector (m)
        radius: f64,
    },
    /// Compuerta de tambor (drum gate)
    Drum {
        /// Radio del tambor (m)
        radius: f64,
    },
}

/// Condición de flujo de la compuerta
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GateFlowCondition {
    /// Flujo libre (chorro no sumergido)
    FreeFlow,
    /// Flujo sumergido parcialmente
    PartiallySubmerged,
    /// Flujo completamente sumergido
    FullySubmerged,
    /// Compuerta completamente abierta (orificio no controla)
    GateNotControlling,
}

impl GateFlowCondition {
    /// Descripción en español
    pub fn description_es(&self) -> &'static str {
        match self {
            Self::FreeFlow => "Flujo libre - Chorro no sumergido",
            Self::PartiallySubmerged => "Parcialmente sumergido",
            Self::FullySubmerged => "Completamente sumergido",
            Self::GateNotControlling => "Compuerta no controla el flujo",
        }
    }
}

// =============================================================================
// GATE GEOMETRY
// =============================================================================

/// Geometría de una compuerta
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GateGeometry {
    /// Tipo de compuerta
    pub gate_type: GateType,

    /// Ancho de la compuerta (m)
    pub width: f64,

    /// Altura máxima de apertura (m)
    pub max_opening: f64,

    /// Elevación del umbral de la compuerta (m)
    pub sill_elevation: f64,

    /// Coeficiente de contracción lateral (Cc) - típicamente 0.95-1.0
    pub lateral_contraction: f64,

    /// Rugosidad del labio (suave, afilado, redondeado)
    pub lip_type: LipType,
}

/// Tipo de labio de la compuerta
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum LipType {
    /// Labio afilado (sharp-edged)
    #[default]
    Sharp,
    /// Labio redondeado
    Rounded,
    /// Labio con sello de goma
    RubberSeal,
    /// Labio con perfil aerodinámico
    Streamlined,
}

impl GateGeometry {
    /// Crear compuerta deslizante estándar
    pub fn sluice(width: f64, max_opening: f64, sill_elevation: f64) -> Self {
        Self {
            gate_type: GateType::SluiceVertical,
            width,
            max_opening,
            sill_elevation,
            lateral_contraction: 0.98,
            lip_type: LipType::Sharp,
        }
    }

    /// Crear compuerta radial
    pub fn radial(width: f64, radius: f64, max_opening: f64, sill_elevation: f64) -> Self {
        Self {
            gate_type: GateType::Radial {
                radius,
                pivot_angle: 0.0,
            },
            width,
            max_opening,
            sill_elevation,
            lateral_contraction: 0.95,
            lip_type: LipType::Sharp,
        }
    }
}

// =============================================================================
// GATE FLOW ANALYSIS
// =============================================================================

/// Resultado del análisis de flujo bajo compuerta
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GateFlowResult {
    /// Caudal calculado (m³/s)
    pub discharge: f64,

    /// Condición de flujo
    pub flow_condition: GateFlowCondition,

    /// Coeficiente de descarga usado
    pub discharge_coefficient: f64,

    /// Coeficiente de contracción Cc
    pub contraction_coefficient: f64,

    /// Profundidad aguas arriba H₁ (m)
    pub upstream_depth: f64,

    /// Profundidad aguas abajo H₂ (m)
    pub downstream_depth: f64,

    /// Profundidad contraída yc (m) - en la vena contracta
    pub contracted_depth: f64,

    /// Velocidad bajo la compuerta (m/s)
    pub velocity_under_gate: f64,

    /// Número de Froude en la vena contracta
    pub froude_at_vena_contracta: f64,

    /// Apertura de la compuerta (m)
    pub gate_opening: f64,

    /// Relación a/H₁ (apertura / carga)
    pub opening_ratio: f64,

    /// Carga efectiva (m)
    pub effective_head: f64,

    /// Pérdida de carga (m)
    pub head_loss: f64,

    /// Eficiencia de la compuerta (%)
    pub efficiency: f64,

    /// Advertencias
    pub warnings: Vec<String>,
}

/// Motor de análisis de flujo en compuertas
pub struct GateFlowAnalyzer {
    geometry: GateGeometry,
}

impl GateFlowAnalyzer {
    /// Crear nuevo analizador
    pub fn new(geometry: GateGeometry) -> Self {
        Self { geometry }
    }

    /// Calcular coeficiente de contracción Cc
    /// Según Henry (1950) para compuerta vertical
    pub fn contraction_coefficient(&self, opening: f64, upstream_depth: f64) -> f64 {
        let ratio = opening / upstream_depth;

        match self.geometry.gate_type {
            GateType::SluiceVertical => {
                // Fórmula de Rajaratnam & Subramanya (1967)
                if ratio < 0.5 {
                    0.611 + 0.08 * ratio
                } else {
                    0.611 + 0.08 * 0.5 + 0.035 * (ratio - 0.5)
                }
            }
            GateType::SluiceInclined { lip_angle } => {
                // Ajuste por ángulo del labio
                let base_cc = 0.611 + 0.08 * ratio.min(0.5);
                base_cc + 0.002 * lip_angle // Incremento por inclinación
            }
            GateType::Radial { radius, .. } => {
                // Compuerta radial tiene mayor Cc
                let base_cc = 0.65 + 0.05 * ratio.min(0.5);
                let radius_effect = (opening / radius).min(0.2) * 0.02;
                base_cc + radius_effect
            }
            GateType::Sector { .. } | GateType::Drum { .. } => {
                // Valores típicos para sector y drum
                0.70 + 0.03 * ratio.min(0.5)
            }
        }
    }

    /// Calcular coeficiente de descarga Cd
    pub fn discharge_coefficient(
        &self,
        opening: f64,
        upstream_depth: f64,
        _downstream_depth: f64,
    ) -> f64 {
        let cc = self.contraction_coefficient(opening, upstream_depth);
        let ratio = opening / upstream_depth;

        // Cd = Cc × Cv, donde Cv es coeficiente de velocidad
        // Para flujo libre, Cv ≈ 0.97-0.99
        let cv = match self.geometry.lip_type {
            LipType::Sharp => 0.97,
            LipType::Rounded => 0.99,
            LipType::RubberSeal => 0.96,
            LipType::Streamlined => 0.995,
        };

        // Ajuste por relación de apertura
        let adjustment = if ratio > 0.6 { 0.98 } else { 1.0 };

        cc * cv * adjustment * self.geometry.lateral_contraction
    }

    /// Determinar condición de flujo
    pub fn flow_condition(
        &self,
        opening: f64,
        upstream_depth: f64,
        downstream_depth: f64,
    ) -> GateFlowCondition {
        let cc = self.contraction_coefficient(opening, upstream_depth);
        let yc = cc * opening; // Profundidad en vena contracta

        // Profundidad conjugada del salto (Belanger)
        let y1 = yc;
        if y1 <= 0.0 {
            return GateFlowCondition::GateNotControlling;
        }

        let v1 = (2.0 * G * (upstream_depth - yc)).sqrt();
        let fr1 = v1 / (G * y1).sqrt();

        // Profundidad conjugada y2 = y1/2 × (√(1 + 8Fr₁²) - 1)
        let y2 = y1 * 0.5 * ((1.0 + 8.0 * fr1.powi(2)).sqrt() - 1.0);

        // Clasificar condición
        if downstream_depth < y2 * 0.8 {
            GateFlowCondition::FreeFlow
        } else if downstream_depth < y2 * 1.2 {
            GateFlowCondition::PartiallySubmerged
        } else if opening > upstream_depth * 0.9 {
            GateFlowCondition::GateNotControlling
        } else {
            GateFlowCondition::FullySubmerged
        }
    }

    /// Calcular caudal para flujo libre
    /// Q = Cd × b × a × √(2g × H)
    /// donde H es la carga sobre el centroide del orificio
    fn free_flow_discharge(&self, opening: f64, upstream_depth: f64) -> f64 {
        let cd = self.discharge_coefficient(opening, upstream_depth, 0.0);
        let b = self.geometry.width;

        // Carga efectiva desde superficie hasta centroide del orificio
        // Para orificios sumergidos: H = H₁ - a/2
        let h_effective = upstream_depth - opening / 2.0;

        if h_effective <= 0.0 {
            return 0.0;
        }

        cd * b * opening * (2.0 * G * h_effective).sqrt()
    }

    /// Calcular caudal para flujo sumergido
    /// Q = Cd × b × a × √(2g × (H₁ - H₂))
    fn submerged_flow_discharge(
        &self,
        opening: f64,
        upstream_depth: f64,
        downstream_depth: f64,
    ) -> f64 {
        let cd = self.discharge_coefficient(opening, upstream_depth, downstream_depth);
        let b = self.geometry.width;

        let delta_h = upstream_depth - downstream_depth;
        if delta_h <= 0.0 {
            return 0.0;
        }

        // Factor de sumergencia (Swamee, 1992)
        let cc = self.contraction_coefficient(opening, upstream_depth);
        let yc = cc * opening;

        let submergence_factor = if downstream_depth > yc {
            let s = (downstream_depth - yc) / yc;
            (1.0 - s.powf(0.7)).max(0.1)
        } else {
            1.0
        };

        cd * b * opening * (2.0 * G * delta_h).sqrt() * submergence_factor
    }

    /// Analizar flujo completo
    pub fn analyze(
        &self,
        opening: f64,
        upstream_depth: f64,
        downstream_depth: f64,
    ) -> GateFlowResult {
        let mut warnings = Vec::new();

        // Validaciones
        if opening <= 0.0 {
            return self.zero_flow_result(
                upstream_depth,
                downstream_depth,
                opening,
                &["Compuerta cerrada".to_string()],
            );
        }

        if opening > self.geometry.max_opening {
            warnings.push(format!(
                "Apertura ({:.3}m) excede máximo ({:.3}m)",
                opening, self.geometry.max_opening
            ));
        }

        if upstream_depth <= opening {
            return self.zero_flow_result(
                upstream_depth,
                downstream_depth,
                opening,
                &["Nivel insuficiente aguas arriba".to_string()],
            );
        }

        // Determinar condición de flujo
        let flow_condition = self.flow_condition(opening, upstream_depth, downstream_depth);

        // Calcular caudal según condición
        let discharge = match flow_condition {
            GateFlowCondition::FreeFlow => self.free_flow_discharge(opening, upstream_depth),
            GateFlowCondition::PartiallySubmerged | GateFlowCondition::FullySubmerged => {
                self.submerged_flow_discharge(opening, upstream_depth, downstream_depth)
            }
            GateFlowCondition::GateNotControlling => {
                warnings.push("La compuerta no controla el flujo".to_string());
                // Flujo sobre cresta abierta - aproximación
                self.geometry.width * upstream_depth * (2.0 * G * upstream_depth).sqrt() * 0.5
            }
        };

        // Calcular coeficientes
        let cc = self.contraction_coefficient(opening, upstream_depth);
        let cd = self.discharge_coefficient(opening, upstream_depth, downstream_depth);

        // Profundidad contraída
        let yc = cc * opening;

        // Velocidad bajo compuerta
        let velocity = if self.geometry.width * yc > 0.0 {
            discharge / (self.geometry.width * yc)
        } else {
            0.0
        };

        // Froude en vena contracta
        let froude_vc = if yc > 0.0 {
            velocity / (G * yc).sqrt()
        } else {
            0.0
        };

        // Carga efectiva
        let effective_head = match flow_condition {
            GateFlowCondition::FreeFlow => upstream_depth - opening / 2.0,
            _ => upstream_depth - downstream_depth,
        };

        // Pérdida de carga total
        let head_loss = upstream_depth - downstream_depth - velocity.powi(2) / (2.0 * G);

        // Eficiencia
        let efficiency = if upstream_depth > 0.0 {
            ((upstream_depth - head_loss) / upstream_depth * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };

        // Advertencias adicionales
        if froude_vc > 10.0 {
            warnings.push(format!(
                "Froude muy alto ({:.1}) - Riesgo de cavitación",
                froude_vc
            ));
        }
        if velocity > 15.0 {
            warnings.push(format!(
                "Velocidad muy alta ({:.1} m/s) - Verificar erosión",
                velocity
            ));
        }
        if matches!(flow_condition, GateFlowCondition::PartiallySubmerged) {
            warnings.push("Flujo parcialmente sumergido - Condición inestable".to_string());
        }

        GateFlowResult {
            discharge,
            flow_condition,
            discharge_coefficient: cd,
            contraction_coefficient: cc,
            upstream_depth,
            downstream_depth,
            contracted_depth: yc,
            velocity_under_gate: velocity,
            froude_at_vena_contracta: froude_vc,
            gate_opening: opening,
            opening_ratio: opening / upstream_depth,
            effective_head,
            head_loss: head_loss.max(0.0),
            efficiency,
            warnings,
        }
    }

    /// Calcular apertura necesaria para un caudal dado
    pub fn required_opening(
        &self,
        target_discharge: f64,
        upstream_depth: f64,
        downstream_depth: f64,
    ) -> f64 {
        // Iteración bisección
        let mut a_low = 0.001;
        let mut a_high = upstream_depth.min(self.geometry.max_opening);

        for _ in 0..50 {
            let a_mid = (a_low + a_high) / 2.0;
            let result = self.analyze(a_mid, upstream_depth, downstream_depth);

            if (result.discharge - target_discharge).abs() / target_discharge < 0.001 {
                return a_mid;
            }

            if result.discharge < target_discharge {
                a_low = a_mid;
            } else {
                a_high = a_mid;
            }

            if (a_high - a_low) < 0.0001 {
                break;
            }
        }

        (a_low + a_high) / 2.0
    }

    /// Generar curva de descarga Q vs apertura
    pub fn rating_curve(
        &self,
        upstream_depth: f64,
        downstream_depth: f64,
        num_points: usize,
    ) -> Vec<(f64, f64)> {
        let max_opening = upstream_depth.min(self.geometry.max_opening);
        let step = max_opening / num_points as f64;

        (1..=num_points)
            .map(|i| {
                let opening = i as f64 * step;
                let result = self.analyze(opening, upstream_depth, downstream_depth);
                (opening, result.discharge)
            })
            .collect()
    }

    fn zero_flow_result(
        &self,
        h1: f64,
        h2: f64,
        opening: f64,
        warnings: &[String],
    ) -> GateFlowResult {
        GateFlowResult {
            discharge: 0.0,
            flow_condition: GateFlowCondition::GateNotControlling,
            discharge_coefficient: 0.0,
            contraction_coefficient: 0.0,
            upstream_depth: h1,
            downstream_depth: h2,
            contracted_depth: 0.0,
            velocity_under_gate: 0.0,
            froude_at_vena_contracta: 0.0,
            gate_opening: opening,
            opening_ratio: 0.0,
            effective_head: 0.0,
            head_loss: 0.0,
            efficiency: 0.0,
            warnings: warnings.to_vec(),
        }
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sluice_free_flow() {
        let geometry = GateGeometry::sluice(2.0, 1.5, 0.0);
        let analyzer = GateFlowAnalyzer::new(geometry);

        // Flujo libre típico
        let result = analyzer.analyze(0.3, 2.0, 0.2);

        assert!(result.discharge > 0.0);
        assert_eq!(result.flow_condition, GateFlowCondition::FreeFlow);
        assert!(result.discharge_coefficient > 0.5 && result.discharge_coefficient < 0.8);
    }

    #[test]
    fn test_sluice_submerged_flow() {
        let geometry = GateGeometry::sluice(2.0, 1.5, 0.0);
        let analyzer = GateFlowAnalyzer::new(geometry);

        // Flujo sumergido
        let result = analyzer.analyze(0.3, 2.0, 1.5);

        assert!(result.discharge > 0.0);
        assert!(matches!(
            result.flow_condition,
            GateFlowCondition::FullySubmerged | GateFlowCondition::PartiallySubmerged
        ));
    }

    #[test]
    fn test_radial_gate() {
        let geometry = GateGeometry::radial(3.0, 4.0, 2.0, 0.0);
        let analyzer = GateFlowAnalyzer::new(geometry);

        let result = analyzer.analyze(0.5, 3.0, 0.3);

        assert!(result.discharge > 0.0);
        // Compuertas radiales tienen mayor Cc
        assert!(result.contraction_coefficient > 0.6);
    }

    #[test]
    fn test_required_opening() {
        let geometry = GateGeometry::sluice(2.0, 1.5, 0.0);
        let analyzer = GateFlowAnalyzer::new(geometry);

        // Buscar apertura para Q = 2 m³/s
        let opening = analyzer.required_opening(2.0, 2.0, 0.2);
        let result = analyzer.analyze(opening, 2.0, 0.2);

        // Verificar que el caudal calculado sea cercano al objetivo
        assert!((result.discharge - 2.0).abs() < 0.1);
    }
}
