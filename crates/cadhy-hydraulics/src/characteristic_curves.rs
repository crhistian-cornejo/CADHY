//! Characteristic Curves Module - Curvas Características Hidráulicas
//!
//! Genera curvas fundamentales para análisis de canales abiertos:
//! - Curva de Energía Específica (E-y)
//! - Curva de Momentum Específico (M-y)
//! - Curva de Rating (Q-H)
//! - Curva de Caudal Normal (Q-y)
//!
//! # Referencias:
//! - Chow, V.T. (1959) - Open Channel Hydraulics
//! - Henderson, F.M. (1966) - Open Channel Flow
//! - French, R.H. (1985) - Open-Channel Hydraulics

use crate::sections::{HydraulicProperties, SectionType};
use crate::G;
use serde::{Deserialize, Serialize};

// =============================================================================
// SPECIFIC ENERGY CURVE (E-y)
// =============================================================================

/// Punto en la curva de energía específica
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecificEnergyPoint {
    /// Profundidad de agua y (m)
    pub depth: f64,
    /// Energía específica E = y + V²/2g (m)
    pub specific_energy: f64,
    /// Velocidad V (m/s)
    pub velocity: f64,
    /// Carga de velocidad V²/2g (m)
    pub velocity_head: f64,
    /// Número de Froude
    pub froude: f64,
    /// Régimen de flujo
    pub flow_regime: FlowRegimeLabel,
}

/// Etiqueta de régimen de flujo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FlowRegimeLabel {
    Subcritical,
    Critical,
    Supercritical,
}

/// Resultado de la curva de energía específica
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecificEnergyCurve {
    /// Caudal usado (m³/s)
    pub discharge: f64,
    /// Puntos de la curva
    pub points: Vec<SpecificEnergyPoint>,
    /// Profundidad crítica yc (m)
    pub critical_depth: f64,
    /// Energía mínima Ec (m)
    pub minimum_energy: f64,
    /// Velocidad crítica Vc (m/s)
    pub critical_velocity: f64,
    /// Rama subcrítica
    pub subcritical_branch: Vec<SpecificEnergyPoint>,
    /// Rama supercrítica
    pub supercritical_branch: Vec<SpecificEnergyPoint>,
}

// =============================================================================
// SPECIFIC MOMENTUM CURVE (M-y)
// =============================================================================

/// Punto en la curva de momentum específico
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecificMomentumPoint {
    /// Profundidad de agua y (m)
    pub depth: f64,
    /// Momentum específico M = Q²/(gA) + A×ȳ (m³)
    pub specific_momentum: f64,
    /// Componente de cantidad de movimiento Q²/(gA)
    pub momentum_component: f64,
    /// Componente de presión hidrostática A×ȳ
    pub pressure_component: f64,
    /// Número de Froude
    pub froude: f64,
    /// Régimen de flujo
    pub flow_regime: FlowRegimeLabel,
}

/// Resultado de la curva de momentum específico
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecificMomentumCurve {
    /// Caudal usado (m³/s)
    pub discharge: f64,
    /// Puntos de la curva
    pub points: Vec<SpecificMomentumPoint>,
    /// Profundidad crítica yc (m)
    pub critical_depth: f64,
    /// Momentum mínimo Mc (m³)
    pub minimum_momentum: f64,
    /// Profundidades conjugadas para un M dado
    pub conjugate_depths: Option<(f64, f64)>,
}

// =============================================================================
// RATING CURVE (Q-H)
// =============================================================================

/// Punto en la curva de gasto (rating curve)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RatingPoint {
    /// Profundidad/Carga H (m)
    pub head: f64,
    /// Caudal Q (m³/s)
    pub discharge: f64,
    /// Velocidad V (m/s)
    pub velocity: f64,
    /// Número de Froude
    pub froude: f64,
    /// Área mojada (m²)
    pub area: f64,
}

/// Resultado de la curva de gasto
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RatingCurve {
    /// Pendiente del canal (m/m)
    pub slope: f64,
    /// Coeficiente de Manning n
    pub manning_n: f64,
    /// Puntos de la curva
    pub points: Vec<RatingPoint>,
    /// Caudal máximo para capacidad de sección
    pub max_discharge: f64,
    /// Ecuación de ajuste: Q = a × H^b
    pub fitted_coefficient_a: f64,
    pub fitted_exponent_b: f64,
}

// =============================================================================
// NORMAL DEPTH CURVE (Q-yn)
// =============================================================================

/// Punto en la curva de profundidad normal
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalDepthPoint {
    /// Caudal Q (m³/s)
    pub discharge: f64,
    /// Profundidad normal yn (m)
    pub normal_depth: f64,
    /// Profundidad crítica yc (m)
    pub critical_depth: f64,
    /// Pendiente crítica Sc (m/m)
    pub critical_slope: f64,
    /// Tipo de canal (steep/mild/critical)
    pub channel_type: ChannelType,
}

/// Tipo de canal según pendiente
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ChannelType {
    /// Canal de pendiente suave (yn > yc)
    Mild,
    /// Canal de pendiente fuerte (yn < yc)
    Steep,
    /// Canal de pendiente crítica (yn ≈ yc)
    Critical,
    /// Canal horizontal (S₀ = 0)
    Horizontal,
    /// Canal de pendiente adversa (S₀ < 0)
    Adverse,
}

// =============================================================================
// CURVE GENERATOR
// =============================================================================

/// Generador de curvas características
pub struct CurveGenerator {
    section: SectionType,
}

impl CurveGenerator {
    /// Crear nuevo generador para una sección
    pub fn new(section: SectionType) -> Self {
        Self { section }
    }

    /// Calcular profundidad del centroide para una sección
    fn centroid_depth(&self, props: &HydraulicProperties) -> f64 {
        // Aproximación: para la mayoría de secciones, ȳ ≈ A/(2T)
        if props.top_width > 0.0 {
            props.area / (2.0 * props.top_width)
        } else {
            props.water_depth / 2.0
        }
    }

    /// Generar curva de energía específica E = f(y) para Q dado
    pub fn specific_energy_curve(&self, discharge: f64, num_points: usize) -> SpecificEnergyCurve {
        let max_depth = self.section.max_depth();
        let min_depth = 0.001;

        // Calcular profundidad crítica primero
        let critical_depth = self.find_critical_depth(discharge);
        let props_c = self.section.hydraulic_properties(critical_depth);
        let vc = if props_c.area > 0.0 {
            discharge / props_c.area
        } else {
            0.0
        };
        let min_energy = critical_depth + vc.powi(2) / (2.0 * G);

        let mut points = Vec::with_capacity(num_points);
        let mut subcritical = Vec::new();
        let mut supercritical = Vec::new();

        // Generar puntos con distribución logarítmica cerca del crítico
        for i in 0..num_points {
            let t = i as f64 / (num_points - 1) as f64;
            let depth = min_depth + (max_depth - min_depth) * t;

            let props = self.section.hydraulic_properties(depth);
            if props.area <= 0.0 {
                continue;
            }

            let velocity = discharge / props.area;
            let velocity_head = velocity.powi(2) / (2.0 * G);
            let specific_energy = depth + velocity_head;

            let froude = if props.hydraulic_depth > 0.0 {
                velocity / (G * props.hydraulic_depth).sqrt()
            } else {
                0.0
            };

            let flow_regime = if froude < 0.95 {
                FlowRegimeLabel::Subcritical
            } else if froude > 1.05 {
                FlowRegimeLabel::Supercritical
            } else {
                FlowRegimeLabel::Critical
            };

            let point = SpecificEnergyPoint {
                depth,
                specific_energy,
                velocity,
                velocity_head,
                froude,
                flow_regime,
            };

            points.push(point.clone());

            match flow_regime {
                FlowRegimeLabel::Subcritical => subcritical.push(point),
                FlowRegimeLabel::Supercritical => supercritical.push(point),
                FlowRegimeLabel::Critical => {
                    subcritical.push(point.clone());
                    supercritical.push(point);
                }
            }
        }

        SpecificEnergyCurve {
            discharge,
            points,
            critical_depth,
            minimum_energy: min_energy,
            critical_velocity: vc,
            subcritical_branch: subcritical,
            supercritical_branch: supercritical,
        }
    }

    /// Generar curva de momentum específico M = f(y) para Q dado
    pub fn specific_momentum_curve(
        &self,
        discharge: f64,
        num_points: usize,
    ) -> SpecificMomentumCurve {
        let max_depth = self.section.max_depth();
        let min_depth = 0.001;

        let critical_depth = self.find_critical_depth(discharge);
        let props_c = self.section.hydraulic_properties(critical_depth);
        let y_bar_c = self.centroid_depth(&props_c);
        let min_momentum = if props_c.area > 0.0 {
            discharge.powi(2) / (G * props_c.area) + props_c.area * y_bar_c
        } else {
            0.0
        };

        let mut points = Vec::with_capacity(num_points);

        for i in 0..num_points {
            let t = i as f64 / (num_points - 1) as f64;
            let depth = min_depth + (max_depth - min_depth) * t;

            let props = self.section.hydraulic_properties(depth);
            if props.area <= 0.0 {
                continue;
            }

            let velocity = discharge / props.area;
            let y_bar = self.centroid_depth(&props);

            // M = Q²/(gA) + A×ȳ
            let momentum_component = discharge.powi(2) / (G * props.area);
            let pressure_component = props.area * y_bar;
            let specific_momentum = momentum_component + pressure_component;

            let froude = if props.hydraulic_depth > 0.0 {
                velocity / (G * props.hydraulic_depth).sqrt()
            } else {
                0.0
            };

            let flow_regime = if froude < 0.95 {
                FlowRegimeLabel::Subcritical
            } else if froude > 1.05 {
                FlowRegimeLabel::Supercritical
            } else {
                FlowRegimeLabel::Critical
            };

            points.push(SpecificMomentumPoint {
                depth,
                specific_momentum,
                momentum_component,
                pressure_component,
                froude,
                flow_regime,
            });
        }

        SpecificMomentumCurve {
            discharge,
            points,
            critical_depth,
            minimum_momentum: min_momentum,
            conjugate_depths: None, // Se calcula bajo demanda
        }
    }

    /// Generar curva de gasto Q = f(H) para flujo normal
    pub fn rating_curve(&self, slope: f64, manning_n: f64, num_points: usize) -> RatingCurve {
        let max_depth = self.section.max_depth();
        let min_depth = 0.01;

        let mut points = Vec::with_capacity(num_points);
        let mut max_discharge: f64 = 0.0;

        for i in 0..num_points {
            let t = (i + 1) as f64 / num_points as f64;
            let depth = min_depth + (max_depth - min_depth) * t;

            let props = self.section.hydraulic_properties(depth);
            if props.area <= 0.0 || props.hydraulic_radius <= 0.0 {
                continue;
            }

            // Manning: Q = (1/n) × A × R^(2/3) × S^(1/2)
            let discharge = (1.0 / manning_n)
                * props.area
                * props.hydraulic_radius.powf(2.0 / 3.0)
                * slope.sqrt();

            let velocity = discharge / props.area;
            let froude = if props.hydraulic_depth > 0.0 {
                velocity / (G * props.hydraulic_depth).sqrt()
            } else {
                0.0
            };

            max_discharge = max_discharge.max(discharge);

            points.push(RatingPoint {
                head: depth,
                discharge,
                velocity,
                froude,
                area: props.area,
            });
        }

        // Ajuste de curva Q = a × H^b mediante regresión logarítmica
        let (a, b) = self.fit_power_law(&points);

        RatingCurve {
            slope,
            manning_n,
            points,
            max_discharge,
            fitted_coefficient_a: a,
            fitted_exponent_b: b,
        }
    }

    /// Generar curva de profundidad normal para rango de caudales
    pub fn normal_depth_curve(
        &self,
        slope: f64,
        manning_n: f64,
        num_points: usize,
    ) -> Vec<NormalDepthPoint> {
        let max_depth = self.section.max_depth();

        // Calcular caudal máximo
        let props_max = self.section.hydraulic_properties(max_depth * 0.95);
        let q_max = (1.0 / manning_n)
            * props_max.area
            * props_max.hydraulic_radius.powf(2.0 / 3.0)
            * slope.sqrt();

        let mut points = Vec::with_capacity(num_points);

        for i in 1..=num_points {
            let t = i as f64 / num_points as f64;
            let discharge = q_max * t;

            if discharge <= 0.0 {
                continue;
            }

            let normal_depth = self.find_normal_depth(discharge, slope, manning_n);
            let critical_depth = self.find_critical_depth(discharge);

            // Pendiente crítica
            let props_c = self.section.hydraulic_properties(critical_depth);
            let critical_slope = if props_c.hydraulic_radius > 0.0 {
                (manning_n.powi(2) * G * props_c.hydraulic_depth)
                    / props_c.hydraulic_radius.powf(4.0 / 3.0)
            } else {
                0.0
            };

            let channel_type = if slope < 0.0 {
                ChannelType::Adverse
            } else if slope < 1e-8 {
                ChannelType::Horizontal
            } else if (slope - critical_slope).abs() < critical_slope * 0.05 {
                ChannelType::Critical
            } else if slope < critical_slope {
                ChannelType::Mild
            } else {
                ChannelType::Steep
            };

            points.push(NormalDepthPoint {
                discharge,
                normal_depth,
                critical_depth,
                critical_slope,
                channel_type,
            });
        }

        points
    }

    /// Encontrar profundidad crítica para un caudal dado
    pub fn find_critical_depth(&self, discharge: f64) -> f64 {
        if discharge <= 0.0 {
            return 0.0;
        }

        let target = discharge.powi(2) / G; // Q²/g = A³/T
        let max_depth = self.section.max_depth();

        // Bisección
        let mut y_low = 0.001;
        let mut y_high = max_depth * 2.0;

        for _ in 0..100 {
            let y_mid = (y_low + y_high) / 2.0;
            let props = self.section.hydraulic_properties(y_mid);

            if props.area <= 0.0 || props.top_width <= 0.0 {
                y_low = y_mid;
                continue;
            }

            let section_factor = props.area.powi(3) / props.top_width;

            if (section_factor - target).abs() / target < 0.001 {
                return y_mid;
            }

            if section_factor < target {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }

            if (y_high - y_low) < 0.0001 {
                break;
            }
        }

        (y_low + y_high) / 2.0
    }

    /// Encontrar profundidad normal para un caudal dado
    pub fn find_normal_depth(&self, discharge: f64, slope: f64, manning_n: f64) -> f64 {
        if discharge <= 0.0 || slope <= 0.0 {
            return 0.0;
        }

        let max_depth = self.section.max_depth();

        // Bisección
        let mut y_low = 0.001;
        let mut y_high = max_depth * 3.0;

        for _ in 0..100 {
            let y_mid = (y_low + y_high) / 2.0;
            let props = self.section.hydraulic_properties(y_mid);

            if props.area <= 0.0 || props.hydraulic_radius <= 0.0 {
                y_low = y_mid;
                continue;
            }

            let q_calc = (1.0 / manning_n)
                * props.area
                * props.hydraulic_radius.powf(2.0 / 3.0)
                * slope.sqrt();

            if (q_calc - discharge).abs() / discharge < 0.001 {
                return y_mid;
            }

            if q_calc < discharge {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }

            if (y_high - y_low) < 0.0001 {
                break;
            }
        }

        (y_low + y_high) / 2.0
    }

    /// Encontrar profundidades alternas (misma E, diferente y)
    pub fn find_alternate_depths(
        &self,
        discharge: f64,
        specific_energy: f64,
    ) -> Option<(f64, f64)> {
        let critical_depth = self.find_critical_depth(discharge);
        let props_c = self.section.hydraulic_properties(critical_depth);
        let vc = if props_c.area > 0.0 {
            discharge / props_c.area
        } else {
            0.0
        };
        let min_energy = critical_depth + vc.powi(2) / (2.0 * G);

        if specific_energy < min_energy {
            return None; // No hay solución
        }

        // Buscar profundidad subcrítica (y > yc)
        let y_sub = self.find_depth_for_energy(
            discharge,
            specific_energy,
            critical_depth,
            self.section.max_depth() * 2.0,
        );

        // Buscar profundidad supercrítica (y < yc)
        let y_super = self.find_depth_for_energy(discharge, specific_energy, 0.001, critical_depth);

        Some((y_sub, y_super))
    }

    /// Encontrar profundidades conjugadas (mismo M, diferente y)
    pub fn find_conjugate_depths(&self, discharge: f64, upstream_depth: f64) -> Option<(f64, f64)> {
        let props_1 = self.section.hydraulic_properties(upstream_depth);
        if props_1.area <= 0.0 {
            return None;
        }

        let v1 = discharge / props_1.area;
        let fr1 = if props_1.hydraulic_depth > 0.0 {
            v1 / (G * props_1.hydraulic_depth).sqrt()
        } else {
            return None;
        };

        if fr1 <= 1.0 {
            return None; // No hay salto hidráulico
        }

        // Ecuación de Belanger para canal rectangular
        // Para otras secciones, usar iteración
        let y_bar_1 = self.centroid_depth(&props_1);
        let m1 = discharge.powi(2) / (G * props_1.area) + props_1.area * y_bar_1;

        // Buscar y2 que tenga el mismo M
        let y2 = self.find_depth_for_momentum(
            discharge,
            m1,
            upstream_depth,
            self.section.max_depth() * 2.0,
        )?;

        Some((upstream_depth, y2))
    }

    // Funciones auxiliares

    fn find_depth_for_energy(
        &self,
        discharge: f64,
        target_energy: f64,
        y_low: f64,
        y_high: f64,
    ) -> f64 {
        let mut low = y_low;
        let mut high = y_high;

        for _ in 0..100 {
            let mid = (low + high) / 2.0;
            let props = self.section.hydraulic_properties(mid);

            if props.area <= 0.0 {
                low = mid;
                continue;
            }

            let v = discharge / props.area;
            let e = mid + v.powi(2) / (2.0 * G);

            if (e - target_energy).abs() < 0.0001 {
                return mid;
            }

            // E disminuye con y para supercrítico, aumenta para subcrítico
            if e < target_energy {
                low = mid;
            } else {
                high = mid;
            }

            if (high - low) < 0.0001 {
                break;
            }
        }

        (low + high) / 2.0
    }

    fn find_depth_for_momentum(
        &self,
        discharge: f64,
        target_momentum: f64,
        y_low: f64,
        y_high: f64,
    ) -> Option<f64> {
        let mut low = y_low;
        let mut high = y_high;

        for _ in 0..100 {
            let mid = (low + high) / 2.0;
            let props = self.section.hydraulic_properties(mid);

            if props.area <= 0.0 {
                low = mid;
                continue;
            }

            let y_bar = self.centroid_depth(&props);
            let m = discharge.powi(2) / (G * props.area) + props.area * y_bar;

            if (m - target_momentum).abs() / target_momentum < 0.001 {
                return Some(mid);
            }

            if m < target_momentum {
                low = mid;
            } else {
                high = mid;
            }

            if (high - low) < 0.0001 {
                break;
            }
        }

        Some((low + high) / 2.0)
    }

    fn fit_power_law(&self, points: &[RatingPoint]) -> (f64, f64) {
        // Regresión logarítmica: log(Q) = log(a) + b×log(H)
        if points.len() < 2 {
            return (1.0, 1.5);
        }

        let mut sum_ln_h = 0.0;
        let mut sum_ln_q = 0.0;
        let mut sum_ln_h_ln_q = 0.0;
        let mut sum_ln_h_sq = 0.0;
        let mut n = 0.0;

        for p in points {
            if p.head > 0.0 && p.discharge > 0.0 {
                let ln_h = p.head.ln();
                let ln_q = p.discharge.ln();
                sum_ln_h += ln_h;
                sum_ln_q += ln_q;
                sum_ln_h_ln_q += ln_h * ln_q;
                sum_ln_h_sq += ln_h * ln_h;
                n += 1.0;
            }
        }

        if n < 2.0 {
            return (1.0, 1.5);
        }

        let b = (n * sum_ln_h_ln_q - sum_ln_h * sum_ln_q) / (n * sum_ln_h_sq - sum_ln_h * sum_ln_h);
        let ln_a = (sum_ln_q - b * sum_ln_h) / n;
        let a = ln_a.exp();

        (a, b)
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_specific_energy_curve() {
        let section = SectionType::rectangular(2.0, 1.5);
        let generator = CurveGenerator::new(section);

        let curve = generator.specific_energy_curve(1.0, 50);

        assert!(curve.critical_depth > 0.0);
        assert!(curve.minimum_energy > 0.0);
        assert!(!curve.points.is_empty());
    }

    #[test]
    fn test_critical_depth_rectangular() {
        let section = SectionType::rectangular(2.0, 1.5);
        let generator = CurveGenerator::new(section);

        let q = 2.0; // m³/s
        let yc = generator.find_critical_depth(q);

        // Para canal rectangular: yc = (q²/g)^(1/3) donde q = Q/B
        let q_unit = q / 2.0;
        let yc_theoretical = (q_unit.powi(2) / G).powf(1.0 / 3.0);

        assert!((yc - yc_theoretical).abs() < 0.01);
    }

    #[test]
    fn test_rating_curve() {
        let section = SectionType::rectangular(2.0, 1.5);
        let generator = CurveGenerator::new(section);

        let curve = generator.rating_curve(0.001, 0.015, 20);

        assert!(!curve.points.is_empty());
        assert!(curve.max_discharge > 0.0);

        // Verificar que Q aumenta con H
        for i in 1..curve.points.len() {
            assert!(curve.points[i].discharge >= curve.points[i - 1].discharge);
        }
    }

    #[test]
    fn test_alternate_depths() {
        let section = SectionType::rectangular(2.0, 1.5);
        let generator = CurveGenerator::new(section.clone());

        let q = 1.5;
        let yc = generator.find_critical_depth(q);

        // Energía para una profundidad subcrítica
        let y_test = yc * 1.5;
        let props = section.hydraulic_properties(y_test);
        let v = q / props.area;
        let e = y_test + v.powi(2) / (2.0 * G);

        let depths = generator.find_alternate_depths(q, e);
        assert!(depths.is_some());

        let (y_sub, y_super) = depths.unwrap();
        assert!(y_sub > yc);
        assert!(y_super < yc);
    }
}
