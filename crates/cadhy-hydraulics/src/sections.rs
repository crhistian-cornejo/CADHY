//! Section Definitions - Secciones Transversales de Canales
//!
//! Define los diferentes tipos de secciones transversales soportadas:
//! - Rectangular
//! - Trapezoidal
//! - Circular
//! - Parabolica
//! - En U
//! - Compuesta
//!
//! Cada seccion puede generar su perfil geometrico y calcular propiedades hidraulicas.

use crate::{ElementId, HydraulicError, Point3, Result};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

/// Propiedades hidraulicas de una seccion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HydraulicProperties {
    /// Area mojada (m^2)
    pub area: f64,

    /// Perimetro mojado (m)
    pub wetted_perimeter: f64,

    /// Radio hidraulico (m) = Area / Perimetro
    pub hydraulic_radius: f64,

    /// Ancho superficial (m)
    pub top_width: f64,

    /// Profundidad hidraulica (m) = Area / Ancho
    pub hydraulic_depth: f64,

    /// Profundidad de agua (m)
    pub water_depth: f64,
}

/// Tipo de seccion transversal
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SectionType {
    /// Seccion rectangular
    Rectangular {
        /// Ancho del canal (m)
        width: f64,
        /// Profundidad total del canal (m)
        depth: f64,
    },

    /// Seccion trapezoidal
    Trapezoidal {
        /// Ancho del fondo (m)
        bottom_width: f64,
        /// Profundidad total (m)
        depth: f64,
        /// Talud izquierdo (H:V, ej: 1.5 = 1.5m horizontal por 1m vertical)
        left_slope: f64,
        /// Talud derecho (H:V)
        right_slope: f64,
    },

    /// Seccion circular (tuberia)
    Circular {
        /// Diametro interno (m)
        diameter: f64,
    },

    /// Seccion parabolica
    Parabolic {
        /// Ancho en la parte superior (m)
        top_width: f64,
        /// Profundidad maxima (m)
        depth: f64,
    },

    /// Seccion en U (fondo circular con paredes verticales)
    UShaped {
        /// Ancho total (m)
        width: f64,
        /// Profundidad total (m)
        depth: f64,
        /// Radio del fondo (m)
        bottom_radius: f64,
    },

    /// Seccion triangular
    Triangular {
        /// Profundidad (m)
        depth: f64,
        /// Talud izquierdo (H:V)
        left_slope: f64,
        /// Talud derecho (H:V)
        right_slope: f64,
    },

    /// Seccion compuesta (canal principal + bermas)
    Compound {
        /// Seccion del canal principal
        main_channel: Box<SectionType>,
        /// Bermas laterales
        berms: Vec<Berm>,
    },
}

/// Berma lateral para secciones compuestas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Berm {
    /// Lado de la berma
    pub side: BermSide,
    /// Ancho de la berma (m)
    pub width: f64,
    /// Elevacion relativa al fondo del canal (m)
    pub elevation: f64,
    /// Pendiente transversal (H:V, positivo = hacia arriba alejándose del canal)
    pub slope: f64,
    /// Coeficiente de Manning de la berma (puede diferir del canal principal)
    #[serde(default = "default_berm_manning")]
    pub manning_n: f64,
}

fn default_berm_manning() -> f64 {
    0.030 // Típico para llanuras de inundación con vegetación
}

/// Lado de la berma
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum BermSide {
    Left,
    Right,
}

/// Resultado del cálculo hidráulico para sección compuesta
/// Usa el método de flujo dividido (Divided Channel Method)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompoundFlowResult {
    /// Área mojada total (m²)
    pub total_area: f64,
    /// Perímetro mojado total (m)
    pub total_perimeter: f64,
    /// Radio hidráulico efectivo (m)
    pub hydraulic_radius: f64,
    /// Ancho superficial total (m)
    pub top_width: f64,
    /// Profundidad hidráulica (m)
    pub hydraulic_depth: f64,
    /// Coeficiente de Manning equivalente (Lotter)
    pub equivalent_n: f64,
    /// Factor de corrección de energía (Coriolis α)
    pub alpha_coriolis: f64,
    /// Factor de corrección de momentum (Boussinesq β)
    pub beta_boussinesq: f64,
    /// Conveyance total K = Σ Ki
    pub total_conveyance: f64,
    /// Flujo por zona
    pub zone_flows: Vec<ZoneFlow>,
}

/// Flujo en una zona individual de sección compuesta
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneFlow {
    /// Identificador de zona (0 = canal principal, 1+ = bermas)
    pub zone_id: usize,
    /// Nombre descriptivo
    pub zone_name: String,
    /// Área mojada de la zona (m²)
    pub area: f64,
    /// Perímetro mojado de la zona (m)
    pub wetted_perimeter: f64,
    /// Radio hidráulico de la zona (m)
    pub hydraulic_radius: f64,
    /// Coeficiente de Manning de la zona
    pub manning_n: f64,
    /// Conveyance K = (1/n) * A * R^(2/3)
    pub conveyance: f64,
    /// Velocidad en la zona (m/s) - calculada con Q total
    pub velocity: f64,
    /// Caudal en la zona (m³/s) - proporcional a conveyance
    pub discharge: f64,
}

impl SectionType {
    /// Crear seccion rectangular
    pub fn rectangular(width: f64, depth: f64) -> Self {
        Self::Rectangular { width, depth }
    }

    /// Crear seccion trapezoidal simetrica
    pub fn trapezoidal(bottom_width: f64, depth: f64, side_slope: f64) -> Self {
        Self::Trapezoidal {
            bottom_width,
            depth,
            left_slope: side_slope,
            right_slope: side_slope,
        }
    }

    /// Crear seccion circular
    pub fn circular(diameter: f64) -> Self {
        Self::Circular { diameter }
    }

    /// Verificar si dos secciones son del mismo tipo (para determinar si se necesita transicion)
    pub fn same_type(&self, other: &Self) -> bool {
        std::mem::discriminant(self) == std::mem::discriminant(other)
    }

    /// Calcular propiedades hidraulicas para una profundidad de agua dada
    pub fn hydraulic_properties(&self, water_depth: f64) -> HydraulicProperties {
        match self {
            SectionType::Rectangular { width, depth: _ } => {
                let area = width * water_depth;
                let wetted_perimeter = *width + 2.0 * water_depth;
                let top_width = *width;

                HydraulicProperties {
                    area,
                    wetted_perimeter,
                    hydraulic_radius: area / wetted_perimeter,
                    top_width,
                    hydraulic_depth: water_depth,
                    water_depth,
                }
            }

            SectionType::Trapezoidal {
                bottom_width,
                depth: _,
                left_slope,
                right_slope,
            } => {
                let top_width = bottom_width + water_depth * (left_slope + right_slope);
                let area = (bottom_width + top_width) / 2.0 * water_depth;

                let left_side = water_depth * (1.0 + left_slope.powi(2)).sqrt();
                let right_side = water_depth * (1.0 + right_slope.powi(2)).sqrt();
                let wetted_perimeter = *bottom_width + left_side + right_side;

                HydraulicProperties {
                    area,
                    wetted_perimeter,
                    hydraulic_radius: area / wetted_perimeter,
                    top_width,
                    hydraulic_depth: area / top_width,
                    water_depth,
                }
            }

            SectionType::Circular { diameter } => {
                let radius = diameter / 2.0;

                if water_depth >= *diameter {
                    // Flujo a tubo lleno
                    let area = PI * radius.powi(2);
                    let wetted_perimeter = PI * diameter;

                    HydraulicProperties {
                        area,
                        wetted_perimeter,
                        hydraulic_radius: radius / 2.0,
                        top_width: 0.0,
                        hydraulic_depth: radius,
                        water_depth: *diameter,
                    }
                } else {
                    // Flujo parcial
                    let theta = 2.0 * ((radius - water_depth) / radius).acos();
                    let area = radius.powi(2) * (theta - theta.sin()) / 2.0;
                    let wetted_perimeter = radius * theta;
                    let top_width = 2.0 * (radius.powi(2) - (radius - water_depth).powi(2)).sqrt();

                    HydraulicProperties {
                        area,
                        wetted_perimeter,
                        hydraulic_radius: if wetted_perimeter > 0.0 {
                            area / wetted_perimeter
                        } else {
                            0.0
                        },
                        top_width,
                        hydraulic_depth: if top_width > 0.0 {
                            area / top_width
                        } else {
                            0.0
                        },
                        water_depth,
                    }
                }
            }

            SectionType::Parabolic {
                top_width,
                depth: _,
            } => {
                // y = (4*d/T^2) * x^2 donde T = top_width, d = depth
                // Para profundidad y: T_y = T * sqrt(y/d)
                // Area = (2/3) * T_y * y
                let t_y = top_width * (water_depth / top_width).sqrt().min(1.0);
                let area = (2.0 / 3.0) * t_y * water_depth;

                // Perimetro aproximado
                let wetted_perimeter = t_y + (8.0 * water_depth.powi(2)) / (3.0 * t_y.max(0.001));

                HydraulicProperties {
                    area,
                    wetted_perimeter,
                    hydraulic_radius: area / wetted_perimeter.max(0.001),
                    top_width: t_y,
                    hydraulic_depth: area / t_y.max(0.001),
                    water_depth,
                }
            }

            SectionType::UShaped {
                width,
                depth: _,
                bottom_radius,
            } => {
                if water_depth <= *bottom_radius {
                    // Solo en la parte circular
                    let theta = 2.0 * ((bottom_radius - water_depth) / bottom_radius).acos();
                    let area = bottom_radius.powi(2) * (theta - theta.sin()) / 2.0;
                    let wetted_perimeter = bottom_radius * theta;
                    let top_width = 2.0
                        * (bottom_radius.powi(2) - (bottom_radius - water_depth).powi(2)).sqrt();

                    HydraulicProperties {
                        area,
                        wetted_perimeter,
                        hydraulic_radius: area / wetted_perimeter.max(0.001),
                        top_width,
                        hydraulic_depth: area / top_width.max(0.001),
                        water_depth,
                    }
                } else {
                    // Parte circular + paredes verticales
                    let circular_area = PI * bottom_radius.powi(2) / 2.0;
                    let vertical_height = water_depth - bottom_radius;
                    let vertical_area = width * vertical_height;
                    let area = circular_area + vertical_area;

                    let wetted_perimeter = PI * bottom_radius + 2.0 * vertical_height;
                    let top_width = *width;

                    HydraulicProperties {
                        area,
                        wetted_perimeter,
                        hydraulic_radius: area / wetted_perimeter,
                        top_width,
                        hydraulic_depth: area / top_width,
                        water_depth,
                    }
                }
            }

            SectionType::Triangular {
                depth: _,
                left_slope,
                right_slope,
            } => {
                let top_width = water_depth * (left_slope + right_slope);
                let area = water_depth.powi(2) * (left_slope + right_slope) / 2.0;

                let left_side = water_depth * (1.0 + left_slope.powi(2)).sqrt();
                let right_side = water_depth * (1.0 + right_slope.powi(2)).sqrt();
                let wetted_perimeter = left_side + right_side;

                HydraulicProperties {
                    area,
                    wetted_perimeter,
                    hydraulic_radius: area / wetted_perimeter.max(0.001),
                    top_width,
                    hydraulic_depth: water_depth / 2.0,
                    water_depth,
                }
            }

            SectionType::Compound { .. } => {
                // Usar el método de flujo dividido (Divided Channel Method)
                let compound_result = self.compound_hydraulic_properties(water_depth, 0.015);

                HydraulicProperties {
                    area: compound_result.total_area,
                    wetted_perimeter: compound_result.total_perimeter,
                    hydraulic_radius: compound_result.hydraulic_radius,
                    top_width: compound_result.top_width,
                    hydraulic_depth: compound_result.hydraulic_depth,
                    water_depth,
                }
            }
        }
    }

    /// Obtener la profundidad maxima de la seccion
    pub fn max_depth(&self) -> f64 {
        match self {
            SectionType::Rectangular { depth, .. } => *depth,
            SectionType::Trapezoidal { depth, .. } => *depth,
            SectionType::Circular { diameter } => *diameter,
            SectionType::Parabolic { depth, .. } => *depth,
            SectionType::UShaped { depth, .. } => *depth,
            SectionType::Triangular { depth, .. } => *depth,
            SectionType::Compound { main_channel, .. } => main_channel.max_depth(),
        }
    }

    /// Obtener el ancho en la superficie para profundidad maxima
    pub fn max_top_width(&self) -> f64 {
        match self {
            SectionType::Rectangular { width, .. } => *width,
            SectionType::Trapezoidal {
                bottom_width,
                depth,
                left_slope,
                right_slope,
            } => bottom_width + depth * (left_slope + right_slope),
            SectionType::Circular { diameter } => *diameter,
            SectionType::Parabolic { top_width, .. } => *top_width,
            SectionType::UShaped { width, .. } => *width,
            SectionType::Triangular {
                depth,
                left_slope,
                right_slope,
            } => depth * (left_slope + right_slope),
            SectionType::Compound { main_channel, .. } => main_channel.max_top_width(),
        }
    }

    /// Generar puntos del perfil de la seccion (en plano XZ, Y=0)
    /// Retorna puntos del perfil interior (sin espesor de pared)
    pub fn profile_points(&self, num_segments: usize) -> Vec<Point3> {
        match self {
            SectionType::Rectangular { width, depth } => {
                let hw = width / 2.0;
                vec![
                    Point3::new(-hw, 0.0, 0.0),
                    Point3::new(hw, 0.0, 0.0),
                    Point3::new(hw, 0.0, *depth),
                    Point3::new(-hw, 0.0, *depth),
                ]
            }

            SectionType::Trapezoidal {
                bottom_width,
                depth,
                left_slope,
                right_slope,
            } => {
                let hbw = bottom_width / 2.0;
                let top_left = hbw + depth * left_slope;
                let top_right = hbw + depth * right_slope;

                vec![
                    Point3::new(-hbw, 0.0, 0.0),
                    Point3::new(hbw, 0.0, 0.0),
                    Point3::new(top_right, 0.0, *depth),
                    Point3::new(-top_left, 0.0, *depth),
                ]
            }

            SectionType::Circular { diameter } => {
                let radius = diameter / 2.0;
                let mut points = Vec::with_capacity(num_segments + 1);

                for i in 0..=num_segments {
                    let angle = PI * i as f64 / num_segments as f64;
                    let x = radius * angle.cos();
                    let z = radius - radius * angle.sin();
                    points.push(Point3::new(x, 0.0, z));
                }

                points
            }

            SectionType::Parabolic { top_width, depth } => {
                let mut points = Vec::with_capacity(num_segments + 1);
                let hw = top_width / 2.0;

                for i in 0..=num_segments {
                    let t = i as f64 / num_segments as f64;
                    let x = hw * (2.0 * t - 1.0);
                    let z = depth * (1.0 - (2.0 * t - 1.0).powi(2));
                    points.push(Point3::new(x, 0.0, z));
                }

                points
            }

            SectionType::UShaped {
                width,
                depth,
                bottom_radius,
            } => {
                let hw = width / 2.0;
                let mut points = Vec::new();

                // Parte inferior semicircular
                let arc_segments = num_segments / 2;
                for i in 0..=arc_segments {
                    let angle = PI * i as f64 / arc_segments as f64;
                    let x = bottom_radius * angle.cos();
                    let z = bottom_radius - bottom_radius * angle.sin();
                    points.push(Point3::new(x, 0.0, z));
                }

                // Paredes verticales
                let wall_height = depth - bottom_radius;
                if wall_height > 0.0 {
                    points.push(Point3::new(hw, 0.0, *depth));
                    points.insert(0, Point3::new(-hw, 0.0, *depth));
                }

                points
            }

            SectionType::Triangular {
                depth,
                left_slope,
                right_slope,
            } => {
                let left_top = depth * left_slope;
                let right_top = depth * right_slope;

                vec![
                    Point3::new(-left_top, 0.0, *depth),
                    Point3::new(0.0, 0.0, 0.0),
                    Point3::new(right_top, 0.0, *depth),
                ]
            }

            SectionType::Compound { main_channel, .. } => {
                // TODO: Agregar bermas
                main_channel.profile_points(num_segments)
            }
        }
    }

    /// Generar puntos del perfil exterior (con espesor de pared)
    ///
    /// El espesor es perpendicular a cada segmento del perfil interior,
    /// creando un offset paralelo constante.
    pub fn outer_profile_points(&self, wall_thickness: f64, floor_thickness: f64) -> Vec<Point3> {
        match self {
            SectionType::Rectangular { width, depth } => {
                // Para rectangular, las paredes son verticales
                let hw = width / 2.0 + wall_thickness;

                vec![
                    Point3::new(-hw, 0.0, -floor_thickness),
                    Point3::new(hw, 0.0, -floor_thickness),
                    Point3::new(hw, 0.0, *depth),
                    Point3::new(-hw, 0.0, *depth),
                ]
            }

            SectionType::Trapezoidal {
                bottom_width,
                depth,
                left_slope,
                right_slope,
            } => {
                // Para trapezoidal, calcular offset perpendicular a cada pared inclinada
                // La normal hacia afuera de una pared con slope z es: (-1, 0, slope) normalizado
                // Para pared izquierda (va de abajo-centro hacia arriba-izquierda):
                //   dirección: (-left_slope, 0, 1), normal hacia afuera: (-1, 0, -left_slope) normalizado
                // Para pared derecha (va de abajo-centro hacia arriba-derecha):
                //   dirección: (right_slope, 0, 1), normal hacia afuera: (1, 0, -right_slope) normalizado

                let left_len = (1.0 + left_slope.powi(2)).sqrt();
                let right_len = (1.0 + right_slope.powi(2)).sqrt();

                // Offset perpendicular para pared izquierda (normal apunta hacia -x, -z)
                let left_nx = -1.0 / left_len;
                let left_nz = -left_slope / left_len;

                // Offset perpendicular para pared derecha (normal apunta hacia +x, -z)
                let right_nx = 1.0 / right_len;
                let right_nz = -right_slope / right_len;

                let hbw = bottom_width / 2.0;
                let inner_top_left = hbw + depth * left_slope;
                let inner_top_right = hbw + depth * right_slope;

                // Puntos exteriores: offset perpendicular desde cada punto interior
                // Fondo izquierdo: inner(-hbw, 0) + offset hacia abajo-izquierda
                let outer_bottom_left_x = -hbw + left_nx * wall_thickness;
                let outer_bottom_left_z = -floor_thickness;

                // Fondo derecho: inner(hbw, 0) + offset hacia abajo-derecha
                let outer_bottom_right_x = hbw + right_nx * wall_thickness;
                let outer_bottom_right_z = -floor_thickness;

                // Arriba derecho: inner(top_right, depth) + offset perpendicular
                let outer_top_right_x = inner_top_right + right_nx * wall_thickness;
                let outer_top_right_z = *depth + right_nz * wall_thickness;

                // Arriba izquierdo: inner(-top_left, depth) + offset perpendicular
                let outer_top_left_x = -inner_top_left + left_nx * wall_thickness;
                let outer_top_left_z = *depth + left_nz * wall_thickness;

                vec![
                    Point3::new(outer_bottom_left_x, 0.0, outer_bottom_left_z),
                    Point3::new(outer_bottom_right_x, 0.0, outer_bottom_right_z),
                    Point3::new(outer_top_right_x, 0.0, outer_top_right_z),
                    Point3::new(outer_top_left_x, 0.0, outer_top_left_z),
                ]
            }

            SectionType::Triangular {
                depth,
                left_slope,
                right_slope,
            } => {
                // Similar a trapezoidal pero sin fondo plano
                // Orden debe coincidir con profile_points:
                // 0=arriba-izq, 1=fondo (vértice), 2=arriba-der
                let left_len = (1.0 + left_slope.powi(2)).sqrt();
                let right_len = (1.0 + right_slope.powi(2)).sqrt();

                let left_nx = -1.0 / left_len;
                let left_nz = -left_slope / left_len;
                let right_nx = 1.0 / right_len;
                let right_nz = -right_slope / right_len;

                let inner_top_left = depth * left_slope;
                let inner_top_right = depth * right_slope;

                // Punto inferior (vértice): offset hacia abajo
                let bottom_offset_z = -floor_thickness;

                vec![
                    // 0: Arriba izquierdo exterior
                    Point3::new(
                        -inner_top_left + left_nx * wall_thickness,
                        0.0,
                        *depth + left_nz * wall_thickness,
                    ),
                    // 1: Fondo (vértice) exterior
                    Point3::new(0.0, 0.0, bottom_offset_z),
                    // 2: Arriba derecho exterior
                    Point3::new(
                        inner_top_right + right_nx * wall_thickness,
                        0.0,
                        *depth + right_nz * wall_thickness,
                    ),
                ]
            }

            // Para otros tipos, usar aproximacion simple
            _ => {
                let inner = self.profile_points(32);
                inner
                    .iter()
                    .map(|p| {
                        // Offset radial simple
                        let r = (p.x.powi(2) + p.z.powi(2)).sqrt();
                        let scale = if r > 0.001 {
                            (r + wall_thickness) / r
                        } else {
                            1.0
                        };
                        Point3::new(p.x * scale, p.y, p.z * scale - floor_thickness)
                    })
                    .collect()
            }
        }
    }

    /// Validar parametros de la seccion
    pub fn validate(&self) -> Result<()> {
        match self {
            SectionType::Rectangular { width, depth } => {
                if *width <= 0.0 {
                    return Err(HydraulicError::Section("Width must be positive".into()));
                }
                if *depth <= 0.0 {
                    return Err(HydraulicError::Section("Depth must be positive".into()));
                }
            }
            SectionType::Trapezoidal {
                bottom_width,
                depth,
                left_slope,
                right_slope,
            } => {
                if *bottom_width < 0.0 {
                    return Err(HydraulicError::Section(
                        "Bottom width must be non-negative".into(),
                    ));
                }
                if *depth <= 0.0 {
                    return Err(HydraulicError::Section("Depth must be positive".into()));
                }
                if *left_slope < 0.0 || *right_slope < 0.0 {
                    return Err(HydraulicError::Section(
                        "Side slopes must be non-negative".into(),
                    ));
                }
            }
            SectionType::Circular { diameter } => {
                if *diameter <= 0.0 {
                    return Err(HydraulicError::Section("Diameter must be positive".into()));
                }
            }
            _ => {}
        }
        Ok(())
    }

    /// Interpolar linealmente entre dos secciones del mismo tipo
    ///
    /// # Argumentos
    /// - `from`: Sección inicial (t=0)
    /// - `to`: Sección final (t=1)
    /// - `t`: Factor de interpolación [0.0, 1.0]
    ///
    /// # Retorna
    /// Una nueva sección con parámetros interpolados. Si las secciones son de
    /// diferentes tipos, se retorna la sección `from` sin modificar.
    pub fn interpolate(from: &SectionType, to: &SectionType, t: f64) -> SectionType {
        let t = t.clamp(0.0, 1.0);

        // Helper para interpolación lineal
        let lerp = |a: f64, b: f64| a + (b - a) * t;

        match (from, to) {
            // Rectangular a Rectangular
            (
                SectionType::Rectangular {
                    width: w1,
                    depth: d1,
                },
                SectionType::Rectangular {
                    width: w2,
                    depth: d2,
                },
            ) => SectionType::Rectangular {
                width: lerp(*w1, *w2),
                depth: lerp(*d1, *d2),
            },

            // Trapezoidal a Trapezoidal
            (
                SectionType::Trapezoidal {
                    bottom_width: bw1,
                    depth: d1,
                    left_slope: ls1,
                    right_slope: rs1,
                },
                SectionType::Trapezoidal {
                    bottom_width: bw2,
                    depth: d2,
                    left_slope: ls2,
                    right_slope: rs2,
                },
            ) => SectionType::Trapezoidal {
                bottom_width: lerp(*bw1, *bw2),
                depth: lerp(*d1, *d2),
                left_slope: lerp(*ls1, *ls2),
                right_slope: lerp(*rs1, *rs2),
            },

            // Circular a Circular
            (SectionType::Circular { diameter: d1 }, SectionType::Circular { diameter: d2 }) => {
                SectionType::Circular {
                    diameter: lerp(*d1, *d2),
                }
            }

            // Triangular a Triangular
            (
                SectionType::Triangular {
                    depth: d1,
                    left_slope: ls1,
                    right_slope: rs1,
                },
                SectionType::Triangular {
                    depth: d2,
                    left_slope: ls2,
                    right_slope: rs2,
                },
            ) => SectionType::Triangular {
                depth: lerp(*d1, *d2),
                left_slope: lerp(*ls1, *ls2),
                right_slope: lerp(*rs1, *rs2),
            },

            // Parabolic a Parabolic
            (
                SectionType::Parabolic {
                    top_width: tw1,
                    depth: d1,
                },
                SectionType::Parabolic {
                    top_width: tw2,
                    depth: d2,
                },
            ) => SectionType::Parabolic {
                top_width: lerp(*tw1, *tw2),
                depth: lerp(*d1, *d2),
            },

            // UShaped a UShaped
            (
                SectionType::UShaped {
                    width: w1,
                    depth: d1,
                    bottom_radius: br1,
                },
                SectionType::UShaped {
                    width: w2,
                    depth: d2,
                    bottom_radius: br2,
                },
            ) => SectionType::UShaped {
                width: lerp(*w1, *w2),
                depth: lerp(*d1, *d2),
                bottom_radius: lerp(*br1, *br2),
            },

            // Rectangular a Trapezoidal (caso especial común en transiciones)
            (
                SectionType::Rectangular {
                    width: w1,
                    depth: d1,
                },
                SectionType::Trapezoidal {
                    bottom_width: bw2,
                    depth: d2,
                    left_slope: ls2,
                    right_slope: rs2,
                },
            ) => {
                // Tratar rectangular como trapezoidal con slope=0
                SectionType::Trapezoidal {
                    bottom_width: lerp(*w1, *bw2),
                    depth: lerp(*d1, *d2),
                    left_slope: lerp(0.0, *ls2),
                    right_slope: lerp(0.0, *rs2),
                }
            }

            // Trapezoidal a Rectangular
            (
                SectionType::Trapezoidal {
                    bottom_width: bw1,
                    depth: d1,
                    left_slope: ls1,
                    right_slope: rs1,
                },
                SectionType::Rectangular {
                    width: w2,
                    depth: d2,
                },
            ) => {
                // Tratar rectangular como trapezoidal con slope=0
                SectionType::Trapezoidal {
                    bottom_width: lerp(*bw1, *w2),
                    depth: lerp(*d1, *d2),
                    left_slope: lerp(*ls1, 0.0),
                    right_slope: lerp(*rs1, 0.0),
                }
            }

            // Para tipos diferentes no compatibles, retornar la sección "from"
            _ => from.clone(),
        }
    }

    /// Obtener ancho del fondo de la sección
    pub fn bottom_width(&self) -> f64 {
        match self {
            SectionType::Rectangular { width, .. } => *width,
            SectionType::Trapezoidal { bottom_width, .. } => *bottom_width,
            SectionType::Circular { diameter } => *diameter,
            SectionType::Triangular { .. } => 0.0,
            SectionType::Parabolic { .. } => 0.0,
            SectionType::UShaped { width, .. } => *width,
            SectionType::Compound { main_channel, .. } => main_channel.bottom_width(),
        }
    }

    /// Obtener profundidad de la sección
    pub fn depth(&self) -> f64 {
        self.max_depth()
    }

    /// Calcula propiedades hidráulicas para sección compuesta usando
    /// el método de flujo dividido (Divided Channel Method) con n equivalente de Lotter
    ///
    /// # Argumentos
    /// - `water_depth`: Profundidad del agua desde el fondo del canal principal
    /// - `main_manning_n`: Coeficiente de Manning del canal principal
    pub fn compound_hydraulic_properties(
        &self,
        water_depth: f64,
        main_manning_n: f64,
    ) -> CompoundFlowResult {
        let (main_channel, berms) = match self {
            SectionType::Compound {
                main_channel,
                berms,
            } => (main_channel, berms),
            _ => {
                // Para secciones no compuestas, retornar resultado simple
                let props = self.hydraulic_properties(water_depth);
                let k =
                    (1.0 / main_manning_n) * props.area * props.hydraulic_radius.powf(2.0 / 3.0);
                return CompoundFlowResult {
                    total_area: props.area,
                    total_perimeter: props.wetted_perimeter,
                    hydraulic_radius: props.hydraulic_radius,
                    top_width: props.top_width,
                    hydraulic_depth: props.hydraulic_depth,
                    equivalent_n: main_manning_n,
                    alpha_coriolis: 1.0,
                    beta_boussinesq: 1.0,
                    total_conveyance: k,
                    zone_flows: vec![ZoneFlow {
                        zone_id: 0,
                        zone_name: "Canal Principal".into(),
                        area: props.area,
                        wetted_perimeter: props.wetted_perimeter,
                        hydraulic_radius: props.hydraulic_radius,
                        manning_n: main_manning_n,
                        conveyance: k,
                        velocity: 0.0,
                        discharge: 0.0,
                    }],
                };
            }
        };

        let mut zones: Vec<ZoneFlow> = Vec::new();
        let mut total_area = 0.0;
        let mut total_perimeter = 0.0;
        let mut total_conveyance = 0.0;
        let mut total_top_width = 0.0;

        // 1. Canal principal
        let main_props = main_channel.hydraulic_properties(water_depth);
        let main_k =
            (1.0 / main_manning_n) * main_props.area * main_props.hydraulic_radius.powf(2.0 / 3.0);

        total_area += main_props.area;
        total_perimeter += main_props.wetted_perimeter;
        total_conveyance += main_k;
        total_top_width += main_props.top_width;

        zones.push(ZoneFlow {
            zone_id: 0,
            zone_name: "Canal Principal".into(),
            area: main_props.area,
            wetted_perimeter: main_props.wetted_perimeter,
            hydraulic_radius: main_props.hydraulic_radius,
            manning_n: main_manning_n,
            conveyance: main_k,
            velocity: 0.0,
            discharge: 0.0,
        });

        // 2. Bermas activas (agua por encima de su elevación)
        for (i, berm) in berms.iter().enumerate() {
            let berm_depth = water_depth - berm.elevation;
            if berm_depth <= 0.0 {
                continue;
            } // Berma no activa

            // Área trapezoidal de la berma
            let berm_area = berm.width * berm_depth + 0.5 * berm.slope * berm_depth.powi(2);
            // Perímetro: fondo + talud exterior (no incluir interfaz con canal)
            let berm_perimeter = berm.width + berm_depth * (1.0 + berm.slope.powi(2)).sqrt();
            let berm_r = if berm_perimeter > 0.0 {
                berm_area / berm_perimeter
            } else {
                0.0
            };
            let berm_k = (1.0 / berm.manning_n) * berm_area * berm_r.powf(2.0 / 3.0);

            total_area += berm_area;
            total_perimeter += berm_perimeter;
            total_conveyance += berm_k;
            total_top_width += berm.width + berm.slope * berm_depth;

            zones.push(ZoneFlow {
                zone_id: i + 1,
                zone_name: format!("Berma {:?}", berm.side),
                area: berm_area,
                wetted_perimeter: berm_perimeter,
                hydraulic_radius: berm_r,
                manning_n: berm.manning_n,
                conveyance: berm_k,
                velocity: 0.0,
                discharge: 0.0,
            });
        }

        // 3. n equivalente (Lotter): n_eq = [P / Σ(Pi/ni^1.5)]^(2/3)
        // Ref: Chow (1959), Open-Channel Hydraulics
        let sum_p_over_n15 = zones
            .iter()
            .map(|z| z.wetted_perimeter / z.manning_n.powf(1.5))
            .sum::<f64>();
        let equivalent_n = if sum_p_over_n15 > 0.0 {
            (total_perimeter / sum_p_over_n15).powf(2.0 / 3.0)
        } else {
            main_manning_n
        };

        let hydraulic_radius = if total_perimeter > 0.0 {
            total_area / total_perimeter
        } else {
            0.0
        };
        let hydraulic_depth = if total_top_width > 0.0 {
            total_area / total_top_width
        } else {
            0.0
        };

        // 4. Factores de corrección (simplificados)
        // α = Σ(Ki³/Ai²) / (K³/A²) y β = Σ(Ki²/Ai) / (K²/A)
        let (alpha, beta) = if total_area > 0.0 && total_conveyance > 0.0 {
            let sum_k3_a2 = zones
                .iter()
                .filter(|z| z.area > 0.0)
                .map(|z| z.conveyance.powi(3) / z.area.powi(2))
                .sum::<f64>();
            let sum_k2_a = zones
                .iter()
                .filter(|z| z.area > 0.0)
                .map(|z| z.conveyance.powi(2) / z.area)
                .sum::<f64>();

            let alpha = sum_k3_a2 * total_area.powi(2) / total_conveyance.powi(3);
            let beta = sum_k2_a * total_area / total_conveyance.powi(2);
            (alpha.max(1.0), beta.max(1.0))
        } else {
            (1.0, 1.0)
        };

        CompoundFlowResult {
            total_area,
            total_perimeter,
            hydraulic_radius,
            top_width: total_top_width,
            hydraulic_depth,
            equivalent_n,
            alpha_coriolis: alpha,
            beta_boussinesq: beta,
            total_conveyance,
            zone_flows: zones,
        }
    }
}

/// Seccion asignada a una estacion especifica del alineamiento
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StationSection {
    /// Identificador unico
    pub id: ElementId,

    /// Estacion/progresiva donde aplica esta seccion (m)
    pub station: f64,

    /// Tipo de seccion transversal
    pub section: SectionType,

    /// Espesor de paredes (m)
    pub wall_thickness: f64,

    /// Espesor de losa de fondo (m)
    pub floor_thickness: f64,

    /// Coeficiente de rugosidad de Manning
    pub manning_n: f64,

    /// Material
    #[serde(default = "default_material")]
    pub material: String,
}

fn default_material() -> String {
    "Concrete".to_string()
}

impl StationSection {
    /// Crear nueva seccion en una estacion
    pub fn new(station: f64, section: SectionType) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            section,
            wall_thickness: 0.15,
            floor_thickness: 0.20,
            manning_n: 0.015,
            material: "Concrete".to_string(),
        }
    }

    /// Builder pattern: establecer espesor de paredes
    pub fn with_wall_thickness(mut self, thickness: f64) -> Self {
        self.wall_thickness = thickness;
        self
    }

    /// Builder pattern: establecer espesor de fondo
    pub fn with_floor_thickness(mut self, thickness: f64) -> Self {
        self.floor_thickness = thickness;
        self
    }

    /// Builder pattern: establecer Manning
    pub fn with_manning(mut self, n: f64) -> Self {
        self.manning_n = n;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== Rectangular Section Tests ==========

    #[test]
    fn test_rectangular_hydraulic_properties() {
        let section = SectionType::rectangular(2.0, 1.5);
        let props = section.hydraulic_properties(1.0);

        // Area = width * depth = 2.0 * 1.0 = 2.0 m²
        assert!((props.area - 2.0).abs() < 1e-6);

        // Wetted perimeter = width + 2*depth = 2.0 + 2*1.0 = 4.0 m
        assert!((props.wetted_perimeter - 4.0).abs() < 1e-6);

        // Hydraulic radius = A/P = 2.0/4.0 = 0.5 m
        assert!((props.hydraulic_radius - 0.5).abs() < 1e-6);

        // Top width = width = 2.0 m
        assert!((props.top_width - 2.0).abs() < 1e-6);
    }

    #[test]
    fn test_rectangular_max_depth() {
        let section = SectionType::rectangular(3.0, 2.5);
        assert!((section.max_depth() - 2.5).abs() < 1e-6);
    }

    // ========== Trapezoidal Section Tests ==========

    #[test]
    fn test_trapezoidal_hydraulic_properties() {
        // Symmetric trapezoidal: bottom=2m, depth=1.5m, slopes=1.5:1
        let section = SectionType::trapezoidal(2.0, 1.5, 1.5);
        let props = section.hydraulic_properties(1.0);

        // Top width = bottom + depth*(left_slope + right_slope) = 2.0 + 1.0*(1.5+1.5) = 5.0 m
        assert!((props.top_width - 5.0).abs() < 1e-6);

        // Area = (bottom + top_width)/2 * depth = (2.0 + 5.0)/2 * 1.0 = 3.5 m²
        assert!((props.area - 3.5).abs() < 1e-6);

        // Wetted perimeter = bottom + 2*sqrt(depth² + (slope*depth)²)
        // = 2.0 + 2*sqrt(1.0 + 2.25) = 2.0 + 2*1.803 = 5.606 m
        let expected_perimeter = 2.0 + 2.0 * (1.0 + 1.5_f64.powi(2)).sqrt();
        assert!((props.wetted_perimeter - expected_perimeter).abs() < 1e-3);
    }

    #[test]
    fn test_trapezoidal_asymmetric() {
        let section = SectionType::Trapezoidal {
            bottom_width: 3.0,
            depth: 2.0,
            left_slope: 1.0,
            right_slope: 2.0,
        };
        let props = section.hydraulic_properties(1.5);

        // Top width = 3.0 + 1.5*(1.0 + 2.0) = 3.0 + 4.5 = 7.5 m
        assert!((props.top_width - 7.5).abs() < 1e-6);
    }

    // ========== Circular Section Tests ==========

    #[test]
    fn test_circular_full_flow() {
        let section = SectionType::circular(2.0);
        let props = section.hydraulic_properties(2.0);

        // Full flow area = π*r² = π*1.0² = π m²
        assert!((props.area - std::f64::consts::PI).abs() < 1e-6);

        // Full flow perimeter = π*d = π*2.0 = 2π m
        assert!((props.wetted_perimeter - 2.0 * std::f64::consts::PI).abs() < 1e-6);

        // Hydraulic radius for full pipe = d/4 = 0.5 m
        assert!((props.hydraulic_radius - 0.5).abs() < 1e-6);
    }

    #[test]
    fn test_circular_half_flow() {
        let section = SectionType::circular(2.0);
        let props = section.hydraulic_properties(1.0); // Half full

        // Half flow area = π*r²/2 = π/2 m²
        assert!((props.area - std::f64::consts::PI / 2.0).abs() < 1e-3);

        // Half flow perimeter = π*r = π m
        assert!((props.wetted_perimeter - std::f64::consts::PI).abs() < 1e-3);
    }

    // ========== Triangular Section Tests ==========

    #[test]
    fn test_triangular_hydraulic_properties() {
        let section = SectionType::Triangular {
            depth: 2.0,
            left_slope: 1.0,
            right_slope: 1.0,
        };
        let props = section.hydraulic_properties(1.0);

        // Top width = depth * (left_slope + right_slope) = 1.0 * 2.0 = 2.0 m
        assert!((props.top_width - 2.0).abs() < 1e-6);

        // Area = depth² * (left_slope + right_slope) / 2 = 1.0 * 2.0 / 2 = 1.0 m²
        assert!((props.area - 1.0).abs() < 1e-6);
    }

    // ========== Section Validation Tests ==========

    #[test]
    fn test_rectangular_validation() {
        let valid = SectionType::rectangular(2.0, 1.5);
        assert!(valid.validate().is_ok());

        let invalid_width = SectionType::rectangular(-1.0, 1.5);
        assert!(invalid_width.validate().is_err());

        let invalid_depth = SectionType::rectangular(2.0, 0.0);
        assert!(invalid_depth.validate().is_err());
    }

    #[test]
    fn test_trapezoidal_validation() {
        let valid = SectionType::trapezoidal(2.0, 1.5, 1.0);
        assert!(valid.validate().is_ok());

        let invalid_slope = SectionType::Trapezoidal {
            bottom_width: 2.0,
            depth: 1.5,
            left_slope: -1.0,
            right_slope: 1.0,
        };
        assert!(invalid_slope.validate().is_err());
    }

    #[test]
    fn test_circular_validation() {
        let valid = SectionType::circular(1.0);
        assert!(valid.validate().is_ok());

        let invalid = SectionType::circular(-0.5);
        assert!(invalid.validate().is_err());
    }

    // ========== Section Interpolation Tests ==========

    #[test]
    fn test_interpolate_rectangular() {
        let from = SectionType::rectangular(2.0, 1.0);
        let to = SectionType::rectangular(4.0, 2.0);

        let mid = SectionType::interpolate(&from, &to, 0.5);
        if let SectionType::Rectangular { width, depth } = mid {
            assert!((width - 3.0).abs() < 1e-6);
            assert!((depth - 1.5).abs() < 1e-6);
        } else {
            panic!("Expected Rectangular section");
        }
    }

    #[test]
    fn test_interpolate_trapezoidal() {
        let from = SectionType::trapezoidal(2.0, 1.0, 1.0);
        let to = SectionType::trapezoidal(4.0, 2.0, 2.0);

        let mid = SectionType::interpolate(&from, &to, 0.5);
        if let SectionType::Trapezoidal {
            bottom_width,
            depth,
            left_slope,
            right_slope,
        } = mid
        {
            assert!((bottom_width - 3.0).abs() < 1e-6);
            assert!((depth - 1.5).abs() < 1e-6);
            assert!((left_slope - 1.5).abs() < 1e-6);
            assert!((right_slope - 1.5).abs() < 1e-6);
        } else {
            panic!("Expected Trapezoidal section");
        }
    }

    #[test]
    fn test_interpolate_rect_to_trap() {
        let from = SectionType::rectangular(2.0, 1.0);
        let to = SectionType::trapezoidal(2.0, 1.0, 1.0);

        let mid = SectionType::interpolate(&from, &to, 0.5);
        if let SectionType::Trapezoidal {
            left_slope,
            right_slope,
            ..
        } = mid
        {
            // Slopes should be 0.5 (half of 1.0)
            assert!((left_slope - 0.5).abs() < 1e-6);
            assert!((right_slope - 0.5).abs() < 1e-6);
        } else {
            panic!("Expected Trapezoidal section");
        }
    }

    // ========== Profile Points Tests ==========

    #[test]
    fn test_rectangular_profile_points() {
        let section = SectionType::rectangular(2.0, 1.5);
        let points = section.profile_points(4);

        assert_eq!(points.len(), 4);
        // Points should form a rectangle
        assert!((points[0].x - (-1.0)).abs() < 1e-6); // Left bottom
        assert!((points[1].x - 1.0).abs() < 1e-6); // Right bottom
    }

    #[test]
    fn test_trapezoidal_profile_points() {
        let section = SectionType::trapezoidal(2.0, 1.5, 1.0);
        let points = section.profile_points(4);

        assert_eq!(points.len(), 4);
        // Bottom corners at ±1.0
        assert!((points[0].x - (-1.0)).abs() < 1e-6);
        assert!((points[1].x - 1.0).abs() < 1e-6);
    }

    // ========== Station Section Tests ==========

    #[test]
    fn test_station_section_builder() {
        let section = StationSection::new(100.0, SectionType::rectangular(2.0, 1.5))
            .with_wall_thickness(0.20)
            .with_floor_thickness(0.25)
            .with_manning(0.012);

        assert!((section.station - 100.0).abs() < 1e-6);
        assert!((section.wall_thickness - 0.20).abs() < 1e-6);
        assert!((section.floor_thickness - 0.25).abs() < 1e-6);
        assert!((section.manning_n - 0.012).abs() < 1e-6);
    }
}
