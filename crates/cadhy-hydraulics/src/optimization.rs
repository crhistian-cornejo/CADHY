//! Channel Optimization Module
//!
//! Implementa optimización automática de secciones de canal para:
//! - Mínima área (menor excavación)
//! - Mínimo perímetro mojado (menor fricción)
//! - Mínimo costo (función personalizable)
//! - Máxima eficiencia hidráulica (sección óptima)
//!
//! Referencias:
//! - Chow, V.T. (1959) Open-Channel Hydraulics
//! - French, R.H. (1985) Open-Channel Hydraulics

use crate::sections::SectionType;
use crate::{HydraulicError, Result, G};
use serde::{Deserialize, Serialize};

// =============================================================================
// OPTIMIZATION CRITERIA
// =============================================================================

/// Criterio de optimización para el diseño de canal
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OptimizationCriterion {
    /// Mínima área de excavación
    MinimumArea,
    /// Mínimo perímetro mojado (menor fricción)
    MinimumWettedPerimeter,
    /// Función de costo personalizada
    MinimumCost {
        /// Costo de excavación ($/m³)
        excavation_cost: f64,
        /// Costo de revestimiento ($/m²)
        lining_cost: f64,
    },
    /// Sección hidráulicamente óptima (máximo R = A/P)
    BestHydraulicSection,
}

/// Tipo de sección a optimizar
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SectionTypeHint {
    /// Sección rectangular
    Rectangular,
    /// Sección trapezoidal
    Trapezoidal,
    /// Sección circular (conducto)
    Circular,
    /// Sección parabólica
    Parabolic,
    /// Encontrar la mejor sección de cualquier tipo
    BestHydraulic,
}

// =============================================================================
// DESIGN CONSTRAINTS
// =============================================================================

/// Restricciones de diseño para la optimización
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesignConstraints {
    /// Velocidad máxima permitida (m/s) - evitar erosión
    pub max_velocity: f64,
    /// Velocidad mínima permitida (m/s) - evitar sedimentación
    pub min_velocity: f64,
    /// Profundidad máxima del canal (m)
    pub max_depth: f64,
    /// Borde libre mínimo (m)
    pub min_freeboard: f64,
    /// Talud máximo (H:V) - estabilidad del suelo
    pub max_side_slope: f64,
    /// Ancho mínimo de fondo (m) - constructivo
    pub min_bottom_width: f64,
    /// Número de Froude máximo - evitar flujo supercrítico
    pub max_froude: f64,
}

impl Default for DesignConstraints {
    fn default() -> Self {
        Self {
            max_velocity: 3.0,     // m/s (concreto)
            min_velocity: 0.6,     // m/s (evitar sedimentación)
            max_depth: 3.0,        // m
            min_freeboard: 0.15,   // m
            max_side_slope: 2.0,   // 2H:1V
            min_bottom_width: 0.3, // m
            max_froude: 0.8,       // Subcrítico estable
        }
    }
}

// =============================================================================
// OPTIMIZATION RESULT
// =============================================================================

/// Resultado de la optimización del canal
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizationResult {
    /// Sección optimizada
    pub section: SectionType,
    /// Profundidad normal calculada (m)
    pub normal_depth: f64,
    /// Velocidad en flujo normal (m/s)
    pub velocity: f64,
    /// Número de Froude
    pub froude_number: f64,
    /// Área mojada (m²)
    pub area: f64,
    /// Perímetro mojado (m)
    pub wetted_perimeter: f64,
    /// Radio hidráulico (m)
    pub hydraulic_radius: f64,
    /// Ancho superficial (m)
    pub top_width: f64,
    /// Profundidad total del canal (con borde libre) (m)
    pub total_depth: f64,
    /// Costo estimado (si aplica)
    pub cost: Option<f64>,
    /// Número de iteraciones usadas
    pub iterations: usize,
    /// ¿Se satisfacen todas las restricciones?
    pub constraints_satisfied: bool,
    /// Advertencias generadas
    pub warnings: Vec<String>,
    /// Eficiencia hidráulica (R/R_opt)
    pub hydraulic_efficiency: f64,
}

// =============================================================================
// CHANNEL OPTIMIZER
// =============================================================================

/// Optimizador de sección de canal
#[derive(Debug, Clone)]
pub struct ChannelOptimizer {
    /// Caudal de diseño (m³/s)
    pub discharge: f64,
    /// Pendiente del fondo (m/m)
    pub slope: f64,
    /// Coeficiente de Manning
    pub manning_n: f64,
    /// Tipo de sección a optimizar
    pub section_type: SectionTypeHint,
    /// Criterio de optimización
    pub criterion: OptimizationCriterion,
    /// Restricciones de diseño
    pub constraints: DesignConstraints,
}

impl ChannelOptimizer {
    /// Crear nuevo optimizador
    pub fn new(discharge: f64, slope: f64, manning_n: f64) -> Self {
        Self {
            discharge,
            slope,
            manning_n,
            section_type: SectionTypeHint::Trapezoidal,
            criterion: OptimizationCriterion::BestHydraulicSection,
            constraints: DesignConstraints::default(),
        }
    }

    /// Configurar tipo de sección
    pub fn with_section_type(mut self, section_type: SectionTypeHint) -> Self {
        self.section_type = section_type;
        self
    }

    /// Configurar criterio de optimización
    pub fn with_criterion(mut self, criterion: OptimizationCriterion) -> Self {
        self.criterion = criterion;
        self
    }

    /// Configurar restricciones
    pub fn with_constraints(mut self, constraints: DesignConstraints) -> Self {
        self.constraints = constraints;
        self
    }

    /// Ejecutar optimización
    pub fn optimize(&self) -> Result<OptimizationResult> {
        if self.discharge <= 0.0 {
            return Err(HydraulicError::InvalidParameter(
                "Discharge must be positive".into(),
            ));
        }
        if self.slope <= 0.0 {
            return Err(HydraulicError::InvalidParameter(
                "Slope must be positive".into(),
            ));
        }
        if self.manning_n <= 0.0 {
            return Err(HydraulicError::InvalidParameter(
                "Manning n must be positive".into(),
            ));
        }

        match self.section_type {
            SectionTypeHint::Rectangular => self.optimize_rectangular(),
            SectionTypeHint::Trapezoidal => self.optimize_trapezoidal(),
            SectionTypeHint::Circular => self.optimize_circular(),
            SectionTypeHint::Parabolic => self.optimize_parabolic(),
            SectionTypeHint::BestHydraulic => self.find_best_section(),
        }
    }

    // =========================================================================
    // RECTANGULAR OPTIMIZATION
    // =========================================================================

    /// Optimizar sección rectangular
    ///
    /// Sección óptima: b = 2y (ancho = 2 × profundidad)
    fn optimize_rectangular(&self) -> Result<OptimizationResult> {
        // Para sección rectangular óptima: b = 2y, R = y/2
        // Q = (1/n) × A × R^(2/3) × S^(1/2)
        // Q = (1/n) × (2y × y) × (y/2)^(2/3) × S^(1/2)
        // Q = (1/n) × 2y² × (y/2)^(2/3) × S^(1/2)

        // Iteramos para encontrar y
        let mut y = 0.5; // Estimación inicial
        let mut iterations = 0;
        const MAX_ITER: usize = 100;
        const TOL: f64 = 0.0001;

        loop {
            iterations += 1;
            if iterations > MAX_ITER {
                break;
            }

            let b = 2.0 * y;
            let area = b * y;
            let perimeter = b + 2.0 * y;
            let r = area / perimeter;

            // Q calculado
            let q_calc = (1.0 / self.manning_n) * area * r.powf(2.0 / 3.0) * self.slope.sqrt();

            // Error
            let error = q_calc - self.discharge;
            if error.abs() < TOL {
                break;
            }

            // Ajustar y usando Newton-Raphson simplificado
            // dQ/dy ≈ Q / y × 8/3 (aproximación)
            let dq_dy = q_calc / y * (8.0 / 3.0);
            if dq_dy.abs() > 1e-10 {
                y -= error / dq_dy;
            } else {
                y *= 1.1;
            }

            y = y.max(0.01).min(self.constraints.max_depth);
        }

        // Calcular resultados finales
        let b = 2.0 * y;
        let section = SectionType::rectangular(b, y + self.constraints.min_freeboard);

        self.build_result(section, y, iterations)
    }

    // =========================================================================
    // TRAPEZOIDAL OPTIMIZATION
    // =========================================================================

    /// Optimizar sección trapezoidal
    ///
    /// Sección óptima: R = y/2, talud θ = 60° (z = 1/√3 ≈ 0.577)
    fn optimize_trapezoidal(&self) -> Result<OptimizationResult> {
        // Talud óptimo para máxima eficiencia: 60° (z = 0.577)
        // Pero respetamos el límite de estabilidad
        let z = (1.0_f64 / 3.0_f64.sqrt()).min(self.constraints.max_side_slope);

        // Para sección trapezoidal óptima con talud z:
        // b = 2y(√(1+z²) - z) y R = y/2

        let mut y = 0.5;
        let mut iterations = 0;
        const MAX_ITER: usize = 100;
        const TOL: f64 = 0.0001;

        loop {
            iterations += 1;
            if iterations > MAX_ITER {
                break;
            }

            // Fórmula de ancho óptimo
            let sqrt_term = (1.0 + z * z).sqrt();
            let b = 2.0 * y * (sqrt_term - z);
            let b = b.max(self.constraints.min_bottom_width);

            // Propiedades
            let top_width = b + 2.0 * z * y;
            let area = (b + top_width) / 2.0 * y;
            let side_length = y * sqrt_term;
            let perimeter = b + 2.0 * side_length;
            let r = area / perimeter;

            // Q calculado
            let q_calc = (1.0 / self.manning_n) * area * r.powf(2.0 / 3.0) * self.slope.sqrt();

            let error = q_calc - self.discharge;
            if error.abs() < TOL {
                break;
            }

            // Ajustar y
            let dq_dy = q_calc / y * (8.0 / 3.0);
            if dq_dy.abs() > 1e-10 {
                y -= error / dq_dy;
            } else {
                y *= 1.1;
            }

            y = y.max(0.01).min(self.constraints.max_depth);
        }

        // Calcular b final
        let sqrt_term = (1.0 + z * z).sqrt();
        let b = (2.0 * y * (sqrt_term - z)).max(self.constraints.min_bottom_width);

        let section = SectionType::trapezoidal(b, y + self.constraints.min_freeboard, z);

        self.build_result(section, y, iterations)
    }

    // =========================================================================
    // CIRCULAR OPTIMIZATION
    // =========================================================================

    /// Optimizar sección circular
    ///
    /// Para flujo máximo a sección llena: y = D, R = D/4
    fn optimize_circular(&self) -> Result<OptimizationResult> {
        // Para flujo a tubo lleno:
        // Q = (1/n) × (πD²/4) × (D/4)^(2/3) × S^(1/2)
        // Resolvemos para D

        let mut d = 1.0;
        let mut iterations = 0;
        const MAX_ITER: usize = 100;
        const TOL: f64 = 0.0001;

        loop {
            iterations += 1;
            if iterations > MAX_ITER {
                break;
            }

            let area = std::f64::consts::PI * d * d / 4.0;
            let r = d / 4.0;

            let q_calc = (1.0 / self.manning_n) * area * r.powf(2.0 / 3.0) * self.slope.sqrt();

            let error = q_calc - self.discharge;
            if error.abs() < TOL {
                break;
            }

            // dQ/dD ≈ 8/3 × Q/D
            let dq_dd = q_calc / d * (8.0 / 3.0);
            if dq_dd.abs() > 1e-10 {
                d -= error / dq_dd;
            } else {
                d *= 1.1;
            }

            d = d.max(0.1);
        }

        let section = SectionType::circular(d);

        // Para circular, normal_depth = diámetro a flujo lleno
        self.build_result(section, d, iterations)
    }

    // =========================================================================
    // PARABOLIC OPTIMIZATION
    // =========================================================================

    /// Optimizar sección parabólica
    fn optimize_parabolic(&self) -> Result<OptimizationResult> {
        // La sección parabólica es similar a la trapezoidal
        // Usamos aproximación iterativa

        let mut y = 0.5;
        let mut iterations = 0;
        const MAX_ITER: usize = 100;
        const TOL: f64 = 0.0001;

        loop {
            iterations += 1;
            if iterations > MAX_ITER {
                break;
            }

            // Para parábola: T = 2√(2Dy) donde D = profundidad máxima
            // Usamos aproximación: T ≈ 3.5y para sección eficiente
            let top_width = 3.5 * y;
            let area = (2.0 / 3.0) * top_width * y;
            let perimeter = top_width + (8.0 * y * y) / (3.0 * top_width);
            let r = area / perimeter;

            let q_calc = (1.0 / self.manning_n) * area * r.powf(2.0 / 3.0) * self.slope.sqrt();

            let error = q_calc - self.discharge;
            if error.abs() < TOL {
                break;
            }

            let dq_dy = q_calc / y * 2.5;
            if dq_dy.abs() > 1e-10 {
                y -= error / dq_dy;
            } else {
                y *= 1.1;
            }

            y = y.max(0.01).min(self.constraints.max_depth);
        }

        let top_width = 3.5 * y;
        let section = SectionType::Parabolic {
            top_width,
            depth: y + self.constraints.min_freeboard,
        };

        self.build_result(section, y, iterations)
    }

    // =========================================================================
    // FIND BEST SECTION
    // =========================================================================

    /// Encontrar la mejor sección de cualquier tipo
    fn find_best_section(&self) -> Result<OptimizationResult> {
        // Optimizar todos los tipos y comparar
        let rect = self
            .clone()
            .with_section_type(SectionTypeHint::Rectangular)
            .optimize()?;
        let trap = self
            .clone()
            .with_section_type(SectionTypeHint::Trapezoidal)
            .optimize()?;

        // Comparar según criterio
        let best = match &self.criterion {
            OptimizationCriterion::MinimumArea => {
                if rect.area < trap.area {
                    rect
                } else {
                    trap
                }
            }
            OptimizationCriterion::MinimumWettedPerimeter => {
                if rect.wetted_perimeter < trap.wetted_perimeter {
                    rect
                } else {
                    trap
                }
            }
            OptimizationCriterion::BestHydraulicSection => {
                // Mayor radio hidráulico = más eficiente
                if rect.hydraulic_radius > trap.hydraulic_radius {
                    rect
                } else {
                    trap
                }
            }
            OptimizationCriterion::MinimumCost {
                excavation_cost,
                lining_cost,
            } => {
                let cost_rect = rect.area * excavation_cost + rect.wetted_perimeter * lining_cost;
                let cost_trap = trap.area * excavation_cost + trap.wetted_perimeter * lining_cost;
                if cost_rect < cost_trap {
                    rect
                } else {
                    trap
                }
            }
        };

        Ok(best)
    }

    // =========================================================================
    // HELPER: BUILD RESULT
    // =========================================================================

    fn build_result(
        &self,
        section: SectionType,
        normal_depth: f64,
        iterations: usize,
    ) -> Result<OptimizationResult> {
        let props = section.hydraulic_properties(normal_depth);
        let velocity = self.discharge / props.area.max(0.001);
        let froude = velocity / (G * props.hydraulic_depth.max(0.001)).sqrt();

        // Verificar restricciones
        let mut warnings = Vec::new();
        let mut constraints_satisfied = true;

        if velocity > self.constraints.max_velocity {
            warnings.push(format!(
                "Velocidad {:.2} m/s excede máximo {:.2} m/s",
                velocity, self.constraints.max_velocity
            ));
            constraints_satisfied = false;
        }
        if velocity < self.constraints.min_velocity {
            warnings.push(format!(
                "Velocidad {:.2} m/s bajo mínimo {:.2} m/s (riesgo sedimentación)",
                velocity, self.constraints.min_velocity
            ));
            constraints_satisfied = false;
        }
        if froude > self.constraints.max_froude {
            warnings.push(format!(
                "Froude {:.2} excede máximo {:.2}",
                froude, self.constraints.max_froude
            ));
            constraints_satisfied = false;
        }
        if normal_depth > self.constraints.max_depth {
            warnings.push(format!(
                "Profundidad {:.2} m excede máximo {:.2} m",
                normal_depth, self.constraints.max_depth
            ));
            constraints_satisfied = false;
        }

        // Calcular costo si aplica
        let cost = match &self.criterion {
            OptimizationCriterion::MinimumCost {
                excavation_cost,
                lining_cost,
            } => Some(props.area * excavation_cost + props.wetted_perimeter * lining_cost),
            _ => None,
        };

        // Eficiencia hidráulica: comparar con R óptimo (y/2 para rectángular/trapezoidal)
        let r_optimal = normal_depth / 2.0;
        let hydraulic_efficiency = (props.hydraulic_radius / r_optimal).min(1.0);

        Ok(OptimizationResult {
            section,
            normal_depth,
            velocity,
            froude_number: froude,
            area: props.area,
            wetted_perimeter: props.wetted_perimeter,
            hydraulic_radius: props.hydraulic_radius,
            top_width: props.top_width,
            total_depth: normal_depth + self.constraints.min_freeboard,
            cost,
            iterations,
            constraints_satisfied,
            warnings,
            hydraulic_efficiency,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rectangular_optimal_ratio() {
        // Para sección rectangular óptima: b ≈ 2y
        let opt = ChannelOptimizer::new(2.0, 0.001, 0.015);
        let result = opt
            .with_section_type(SectionTypeHint::Rectangular)
            .optimize()
            .unwrap();

        if let SectionType::Rectangular { width, depth: _ } = result.section {
            let ratio = width / result.normal_depth;
            // Debería ser aproximadamente 2
            assert!(ratio > 1.8 && ratio < 2.2, "b/y ratio was {}", ratio);
        } else {
            panic!("Expected rectangular section");
        }
    }

    #[test]
    fn test_trapezoidal_optimization() {
        let opt = ChannelOptimizer::new(5.0, 0.0005, 0.015);
        let result = opt
            .with_section_type(SectionTypeHint::Trapezoidal)
            .optimize()
            .unwrap();

        assert!(result.normal_depth > 0.0);
        assert!(result.velocity > 0.0);
        assert!(result.froude_number < 1.0, "Should be subcritical");
    }

    #[test]
    fn test_constraints_check() {
        let constraints = DesignConstraints {
            max_velocity: 1.0, // Muy bajo para forzar violación
            ..Default::default()
        };

        let opt = ChannelOptimizer::new(5.0, 0.01, 0.015).with_constraints(constraints);
        let result = opt.optimize().unwrap();

        assert!(!result.constraints_satisfied);
        assert!(!result.warnings.is_empty());
    }

    #[test]
    fn test_minimum_cost_criterion() {
        let opt = ChannelOptimizer::new(3.0, 0.001, 0.015).with_criterion(
            OptimizationCriterion::MinimumCost {
                excavation_cost: 50.0,
                lining_cost: 100.0,
            },
        );
        let result = opt.optimize().unwrap();

        assert!(result.cost.is_some());
        assert!(result.cost.unwrap() > 0.0);
    }
}
