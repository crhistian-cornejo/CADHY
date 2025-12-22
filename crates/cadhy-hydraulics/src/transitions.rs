//! Transitions - Definiciones de Transiciones entre Secciones
//!
//! Las transiciones son cambios graduales entre secciones de diferente geometria.
//! Tipos soportados:
//! - Linear: Cambio lineal simple
//! - Warped: Alabeado para mejor hidraulica
//! - Cylindrical: Paredes cilindricas
//! - Inlet: Entrada (expansion)
//! - Salida (contraccion)
//!

#![allow(clippy::redundant_closure)]
//! Las transiciones pueden incluir disipadores de energía opcionales cuando
//! hay cambio significativo de elevación (pendiente > umbral).

use crate::structures::{BaffleBlock, BaffleBlockShape, BaffleRow, StillingBasinDesign};
use crate::{ElementId, HydraulicError, Result, G};
use serde::{Deserialize, Serialize};

/// Tipo de transicion entre secciones
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum TransitionType {
    /// Cambio lineal simple entre secciones
    #[default]
    Linear,

    /// Transicion alabeada (mejor comportamiento hidraulico)
    Warped,

    /// Paredes cilindricas
    Cylindrical,

    /// Entrada - expansion gradual
    Inlet,

    /// Salida - contraccion gradual
    Outlet,
}

impl TransitionType {
    /// Obtener coeficiente de perdida por defecto para cada tipo
    pub fn default_loss_coefficient(&self) -> f64 {
        match self {
            TransitionType::Linear => 0.3,
            TransitionType::Warped => 0.1,
            TransitionType::Cylindrical => 0.15,
            TransitionType::Inlet => 0.5,  // Expansion
            TransitionType::Outlet => 0.2, // Contraccion
        }
    }

    /// Nombre legible del tipo de transicion
    pub fn display_name(&self) -> &'static str {
        match self {
            TransitionType::Linear => "Linear",
            TransitionType::Warped => "Warped",
            TransitionType::Cylindrical => "Cylindrical",
            TransitionType::Inlet => "Inlet (Expansion)",
            TransitionType::Outlet => "Outlet (Contraction)",
        }
    }
}

/// Transicion entre dos secciones del canal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transition {
    /// Identificador unico
    pub id: ElementId,

    /// Estacion de inicio de la transicion
    pub start_station: f64,

    /// Estacion de fin de la transicion
    pub end_station: f64,

    /// Tipo de transicion
    pub transition_type: TransitionType,

    /// Coeficiente de perdida de carga (K)
    /// hL = K * |V2^2 - V1^2| / (2g)
    pub loss_coefficient: f64,

    /// Angulo maximo de divergencia/convergencia (grados)
    /// Tipicamente 12.5° para expansion, 25° para contraccion
    pub max_angle: Option<f64>,

    /// Genera filetes en las esquinas
    pub fillet_radius: Option<f64>,

    // === Cambio de elevación y disipadores ===
    /// Cambio de elevación a lo largo de la transición (m)
    /// Positivo = subida, Negativo = bajada (más común para rápidas)
    pub elevation_drop: f64,

    /// Pendiente calculada (m/m)
    pub slope: f64,

    /// Dados amortiguadores en la transición (si hay pendiente significativa)
    pub baffle_rows: Vec<BaffleRow>,

    /// Ancho del canal en la transición (para calcular distribución de dados)
    pub channel_width: f64,

    /// ¿Requiere tanque amortiguador al final?
    pub requires_stilling_basin: bool,

    /// Diseño del tanque amortiguador (si aplica)
    pub stilling_basin: Option<StillingBasinDesign>,
}

impl Transition {
    /// Crear nueva transicion sin cambio de elevación
    pub fn new(
        start_station: f64,
        end_station: f64,
        transition_type: TransitionType,
    ) -> Result<Self> {
        Self::with_elevation(start_station, end_station, transition_type, 0.0, 1.0)
    }

    /// Crear transición con cambio de elevación
    ///
    /// # Argumentos
    /// - `start_station`: Estación de inicio (m)
    /// - `end_station`: Estación de fin (m)
    /// - `transition_type`: Tipo de transición
    /// - `elevation_drop`: Cambio de elevación (m), negativo = bajada
    /// - `channel_width`: Ancho del canal (m)
    pub fn with_elevation(
        start_station: f64,
        end_station: f64,
        transition_type: TransitionType,
        elevation_drop: f64,
        channel_width: f64,
    ) -> Result<Self> {
        if end_station <= start_station {
            return Err(HydraulicError::InvalidParameter(
                "End station must be greater than start station".into(),
            ));
        }

        let length = end_station - start_station;
        let slope = elevation_drop.abs() / length;

        // Determinar si requiere disipadores basado en pendiente
        // Umbral típico: pendiente > 1:10 (0.1 m/m) para rápidas
        let requires_stilling_basin = slope > 0.1 && elevation_drop < 0.0;

        Ok(Self {
            id: ElementId::new_v4(),
            start_station,
            end_station,
            transition_type,
            loss_coefficient: transition_type.default_loss_coefficient(),
            max_angle: None,
            fillet_radius: None,
            elevation_drop,
            slope,
            baffle_rows: Vec::new(),
            channel_width,
            requires_stilling_basin,
            stilling_basin: None,
        })
    }

    /// Longitud de la transicion
    pub fn length(&self) -> f64 {
        self.end_station - self.start_station
    }

    /// Builder: establecer coeficiente de perdida
    pub fn with_loss_coefficient(mut self, k: f64) -> Self {
        self.loss_coefficient = k;
        self
    }

    /// Builder: establecer angulo maximo
    pub fn with_max_angle(mut self, angle_degrees: f64) -> Self {
        self.max_angle = Some(angle_degrees);
        self
    }

    /// Builder: establecer radio de filete
    pub fn with_fillet(mut self, radius: f64) -> Self {
        self.fillet_radius = Some(radius);
        self
    }

    /// Builder: agregar dados amortiguadores distribuidos
    ///
    /// Diseña automáticamente la distribución de dados según USBR
    /// basándose en las condiciones de flujo.
    ///
    /// # Argumentos
    /// - `y1`: Profundidad supercrítica esperada (m)
    /// - `num_rows`: Número de filas de dados
    pub fn with_baffle_blocks(mut self, y1: f64, num_rows: usize) -> Self {
        if num_rows == 0 || self.slope < 0.05 {
            return self;
        }

        let length = self.length();

        // Distribuir filas uniformemente a lo largo de la transición
        // Primera fila a 0.2L, última a 0.8L
        let start_pos = 0.2 * length;
        let end_pos = 0.8 * length;
        let row_spacing = if num_rows > 1 {
            (end_pos - start_pos) / (num_rows - 1) as f64
        } else {
            0.0
        };

        // Crear plantilla de dado según USBR
        let block_template = BaffleBlock {
            width: 0.75 * y1,
            height: y1,
            thickness: 0.75 * y1,
            shape: BaffleBlockShape::Rectangular,
            x_offset: 0.0,
            y_position: 0.0,
        };

        self.baffle_rows.clear();

        for i in 0..num_rows {
            let distance = start_pos + i as f64 * row_spacing;
            let is_offset = i % 2 == 1; // Filas alternas desplazadas

            let row = BaffleRow::staggered(
                self.channel_width,
                &block_template,
                distance,
                i as u32,
                is_offset,
            );

            self.baffle_rows.push(row);
        }

        self
    }

    /// Builder: agregar tanque amortiguador al final de la transición
    ///
    /// # Argumentos
    /// - `discharge`: Caudal de diseño (m³/s)
    /// - `y1`: Profundidad supercrítica al final de la rampa (m)
    /// - `v1`: Velocidad al final de la rampa (m/s)
    /// - `tailwater_depth`: Profundidad de aguas abajo disponible (m)
    pub fn with_stilling_basin(
        mut self,
        discharge: f64,
        y1: f64,
        v1: f64,
        tailwater_depth: f64,
    ) -> Result<Self> {
        let basin =
            StillingBasinDesign::design(discharge, self.channel_width, y1, v1, tailwater_depth)
                .map_err(|e| HydraulicError::Calculation(e))?;

        self.stilling_basin = Some(basin);
        Ok(self)
    }

    /// Calcular factor de interpolacion en una estacion dada
    /// Retorna valor entre 0.0 (inicio) y 1.0 (fin)
    pub fn interpolation_factor(&self, station: f64) -> f64 {
        if station <= self.start_station {
            0.0
        } else if station >= self.end_station {
            1.0
        } else {
            let t = (station - self.start_station) / self.length();

            // Aplicar curva segun tipo de transicion
            match self.transition_type {
                TransitionType::Linear => t,
                TransitionType::Warped => {
                    // Curva S suave (ease-in-out)
                    if t < 0.5 {
                        2.0 * t * t
                    } else {
                        1.0 - (-2.0 * t + 2.0).powi(2) / 2.0
                    }
                }
                TransitionType::Cylindrical => {
                    // Similar a lineal pero con ajuste circular
                    (1.0 - (1.0 - t).powi(2)).sqrt()
                }
                TransitionType::Inlet | TransitionType::Outlet => {
                    // Curva parabolica
                    t * t
                }
            }
        }
    }

    /// Obtener elevación en una estación dada (relativa al inicio)
    pub fn elevation_at(&self, station: f64) -> f64 {
        let t = self.interpolation_factor(station);
        -self.elevation_drop * t // Negativo porque drop es positivo hacia abajo
    }

    /// Verificar si una estacion esta dentro de la transicion
    pub fn contains_station(&self, station: f64) -> bool {
        station >= self.start_station && station <= self.end_station
    }

    /// Calcular perdida de carga en la transicion
    /// v1: velocidad antes de la transicion (m/s)
    /// v2: velocidad despues de la transicion (m/s)
    pub fn head_loss(&self, v1: f64, v2: f64) -> f64 {
        self.loss_coefficient * (v2.powi(2) - v1.powi(2)).abs() / (2.0 * G)
    }

    /// Calcular número de Froude esperado al final de la transición
    /// dado un caudal y profundidad
    pub fn exit_froude(&self, discharge: f64, exit_depth: f64) -> f64 {
        let area = exit_depth * self.channel_width;
        let velocity = discharge / area;
        velocity / (G * exit_depth).sqrt()
    }

    /// Estación total de fin incluyendo tanque amortiguador
    pub fn total_end_station(&self) -> f64 {
        match &self.stilling_basin {
            Some(basin) => self.end_station + basin.length + basin.apron_length,
            None => self.end_station,
        }
    }

    /// Obtener todas las posiciones de dados (para geometría 3D)
    pub fn all_baffle_positions(&self) -> Vec<(f64, f64, f64)> {
        let mut positions = Vec::new();

        for row in &self.baffle_rows {
            let y_station = self.start_station + row.distance_from_toe;
            let z_elevation = self.elevation_at(y_station);

            for block in &row.blocks {
                positions.push((block.x_offset, y_station, z_elevation));
            }
        }

        positions
    }
}

/// Parametros de diseno para transiciones
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionDesignParams {
    /// Angulo maximo de expansion (grados) - tipico 12.5°
    pub max_expansion_angle: f64,

    /// Angulo maximo de contraccion (grados) - tipico 25°
    pub max_contraction_angle: f64,

    /// Radio minimo de filete (m)
    pub min_fillet_radius: f64,

    /// Longitud minima de transicion (m)
    pub min_length: f64,
}

impl Default for TransitionDesignParams {
    fn default() -> Self {
        Self {
            max_expansion_angle: 12.5,
            max_contraction_angle: 25.0,
            min_fillet_radius: 0.10,
            min_length: 1.0,
        }
    }
}

impl TransitionDesignParams {
    /// Calcular longitud minima requerida para una expansion
    /// width_change: cambio de ancho (m)
    pub fn min_expansion_length(&self, width_change: f64) -> f64 {
        let angle_rad = self.max_expansion_angle.to_radians();
        (width_change.abs() / 2.0) / angle_rad.tan()
    }

    /// Calcular longitud minima requerida para una contraccion
    pub fn min_contraction_length(&self, width_change: f64) -> f64 {
        let angle_rad = self.max_contraction_angle.to_radians();
        (width_change.abs() / 2.0) / angle_rad.tan()
    }
}
