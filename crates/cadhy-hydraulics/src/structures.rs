//! Structures - Estructuras Hidraulicas para Canales
//!
//! Define las estructuras hidraulicas que pueden insertarse en un canal:
//! - Caidas (Drops): Verticales, inclinadas, escalonadas
//! - Vertederos (Weirs): Rectangulares, trapezoidales, Ogee
//! - Junciones (Junctions): Derivaciones laterales, confluencias
//! - Tanques Amortiguadores (Stilling Basins): USBR Types I-IV
//! - Dados Amortiguadores (Baffle Blocks): Dimensionados según USBR EM-25
//! - Rápidas (Chutes): Con bloques de entrada y disipadores opcionales
//!
//! Referencias técnicas:
//! - USBR Engineering Monograph No. 25: "Hydraulic Design of Stilling Basins
//!   and Energy Dissipators" (Peterka, 1984)
//! - Chow, V.T. (1959): "Open-Channel Hydraulics"
//! - Henderson, F.M. (1966): "Open Channel Flow"

use crate::{ElementId, NaVec3, Point3, G};
use serde::{Deserialize, Serialize};

// ============================================================================
// DROPS - Caidas y Rapidas
// ============================================================================

/// Tipo de caida
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum DropType {
    /// Caida vertical (con o sin tanque amortiguador)
    #[default]
    Vertical,

    /// Rampa inclinada
    Inclined,

    /// Caida escalonada
    Stepped,

    /// Perfil Ogee (Creager)
    Ogee,
}

/// Tipo de disipador de energia
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub enum EnergyDissipator {
    /// Tanque amortiguador tipo USBR
    StillingBasin {
        /// Longitud del tanque (m)
        length: f64,
        /// Profundidad del tanque bajo el nivel de salida (m)
        depth: f64,
        /// Numero de filas de bloques
        baffle_rows: u32,
    },

    /// Escalon simple
    EndSill {
        /// Altura del escalon (m)
        height: f64,
    },

    /// Pozo de impacto
    ImpactBasin {
        /// Diametro del pozo (m)
        diameter: f64,
        /// Profundidad (m)
        depth: f64,
    },

    /// Sin disipador
    #[default]
    None,
}

// ============================================================================
// USBR STILLING BASINS - Tanques Amortiguadores
// ============================================================================

/// Tipo de tanque amortiguador USBR
/// Referencia: USBR EM-25 (Peterka, 1984)
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum StillingBasinType {
    /// Type I: Para Fr < 1.7 (salto ondulante)
    /// No requiere accesorios, el salto se forma naturalmente
    TypeI,

    /// Type II: Para Fr = 2.5-4.5 (salto oscilante)
    /// Usa chute blocks + dentated end sill
    /// Longitud reducida ~33% respecto al salto libre
    #[default]
    TypeII,

    /// Type III: Para Fr > 4.5 (salto estable/fuerte)
    /// Usa chute blocks + baffle blocks + solid end sill
    /// Máxima disipación de energía, para v ≤ 15 m/s
    TypeIII,

    /// Type IV: Para Fr = 2.5-4.5 (salto oscilante)
    /// Alternativa al Type II con deflector opcional
    /// Reduce ondas superficiales aguas abajo
    TypeIV,

    /// Type V: SAF (Saint Anthony Falls) Stilling Basin
    /// Para estructuras pequeñas, Fr = 1.7-17
    SAF,
}

impl StillingBasinType {
    /// Seleccionar automáticamente el tipo de tanque según Froude
    /// y velocidad de entrada
    pub fn select(froude: f64, velocity: f64) -> Self {
        match (froude, velocity) {
            (fr, _) if fr < 1.7 => StillingBasinType::TypeI,
            (fr, v) if fr >= 1.7 && fr < 2.5 => {
                // Zona de transición - usar SAF o Type II
                if v <= 10.0 {
                    StillingBasinType::SAF
                } else {
                    StillingBasinType::TypeII
                }
            }
            (fr, v) if fr >= 2.5 && fr < 4.5 => {
                // Salto oscilante - Type II o IV
                if v <= 15.0 {
                    StillingBasinType::TypeII
                } else {
                    StillingBasinType::TypeIV
                }
            }
            (fr, v) if fr >= 4.5 && v <= 15.0 => {
                // Salto estable, velocidad moderada - Type III
                StillingBasinType::TypeIII
            }
            _ => {
                // Alta velocidad o muy alto Froude - Type II (más robusto)
                StillingBasinType::TypeII
            }
        }
    }

    /// Obtener descripción del tipo
    pub fn description(&self) -> &'static str {
        match self {
            StillingBasinType::TypeI => "Ondulante (Fr < 1.7) - Sin accesorios",
            StillingBasinType::TypeII => "Oscilante (Fr 2.5-4.5) - Chute blocks + Dentated sill",
            StillingBasinType::TypeIII => "Estable (Fr > 4.5) - Full accessories, v ≤ 15 m/s",
            StillingBasinType::TypeIV => "Oscilante alt. - Con deflector",
            StillingBasinType::SAF => "Saint Anthony Falls - Estructuras pequeñas",
        }
    }
}

/// Tipo de salto hidráulico
/// Clasificación según Henderson (1966) y Chow (1959)
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum HydraulicJumpType {
    /// Fr = 1.0-1.7: Ondulaciones superficiales, sin turbulencia
    Undular,

    /// Fr = 1.7-2.5: Rodillos superficiales pequeños
    Weak,

    /// Fr = 2.5-4.5: Inestable, oscila horizontal y verticalmente
    /// EVITAR EN DISEÑO - Puede causar erosión y vibraciones
    Oscillating,

    /// Fr = 4.5-9.0: Salto bien formado, alta eficiencia de disipación
    /// ÓPTIMO PARA DISEÑO
    Steady,

    /// Fr > 9.0: Muy turbulento, alta disipación pero erosivo
    Strong,

    /// Sin salto (Fr ≤ 1.0)
    NoJump,
}

impl HydraulicJumpType {
    /// Clasificar el tipo de salto según número de Froude
    pub fn from_froude(fr: f64) -> Self {
        match fr {
            f if f <= 1.0 => HydraulicJumpType::NoJump,
            f if f <= 1.7 => HydraulicJumpType::Undular,
            f if f <= 2.5 => HydraulicJumpType::Weak,
            f if f <= 4.5 => HydraulicJumpType::Oscillating,
            f if f <= 9.0 => HydraulicJumpType::Steady,
            _ => HydraulicJumpType::Strong,
        }
    }

    /// Eficiencia de disipación de energía (aproximada)
    /// η = (E1 - E2) / E1
    pub fn efficiency_range(&self) -> (f64, f64) {
        match self {
            HydraulicJumpType::NoJump => (0.0, 0.0),
            HydraulicJumpType::Undular => (0.0, 0.05),
            HydraulicJumpType::Weak => (0.05, 0.15),
            HydraulicJumpType::Oscillating => (0.15, 0.45),
            HydraulicJumpType::Steady => (0.45, 0.70),
            HydraulicJumpType::Strong => (0.70, 0.85),
        }
    }

    /// ¿Es seguro para diseño?
    pub fn is_design_safe(&self) -> bool {
        matches!(
            self,
            HydraulicJumpType::Undular | HydraulicJumpType::Weak | HydraulicJumpType::Steady
        )
    }
}

// ============================================================================
// BAFFLE BLOCKS - Dados Amortiguadores
// ============================================================================

/// Forma del dado amortiguador
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum BaffleBlockShape {
    /// Rectangular con cara vertical (estándar USBR)
    #[default]
    Rectangular,

    /// Con cara inclinada hacia aguas arriba (mejor para alto Fr)
    Inclined,

    /// Forma de cuña (wedge-shaped)
    Wedge,

    /// Trapezoidal (reducido en la parte superior)
    Trapezoidal,
}

/// Dado amortiguador individual
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaffleBlock {
    /// Ancho del bloque (m)
    pub width: f64,

    /// Altura del bloque (m)
    pub height: f64,

    /// Espesor/profundidad del bloque (m)
    pub thickness: f64,

    /// Forma del bloque
    pub shape: BaffleBlockShape,

    /// Posición X relativa al eje del canal (m)
    /// 0.0 = centro del canal
    pub x_offset: f64,

    /// Posición Y (longitudinal) desde el inicio del tanque (m)
    pub y_position: f64,
}

impl BaffleBlock {
    /// Crear dado estándar USBR Type III
    /// Dimensiones según EM-25: h = y1, w = 0.75*y1, t = 0.75*y1
    /// donde y1 = profundidad supercrítica
    pub fn usbr_type3(y1: f64, x_offset: f64, y_position: f64) -> Self {
        Self {
            width: 0.75 * y1,
            height: y1,
            thickness: 0.75 * y1,
            shape: BaffleBlockShape::Rectangular,
            x_offset,
            y_position,
        }
    }

    /// Crear dado para SAF basin
    /// Dimensiones: h = 0.8*y1, w = 0.4*y2
    pub fn saf(y1: f64, y2: f64, x_offset: f64, y_position: f64) -> Self {
        Self {
            width: 0.4 * y2,
            height: 0.8 * y1,
            thickness: 0.4 * y2,
            shape: BaffleBlockShape::Rectangular,
            x_offset,
            y_position,
        }
    }

    /// Volumen del bloque (para estimación de materiales)
    pub fn volume(&self) -> f64 {
        // Simplificado para forma rectangular
        self.width * self.height * self.thickness
    }
}

/// Fila de dados amortiguadores
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaffleRow {
    /// Bloques en esta fila
    pub blocks: Vec<BaffleBlock>,

    /// Distancia desde el pie del talud/chute al centro de la fila (m)
    pub distance_from_toe: f64,

    /// Índice de fila (0 = más cercana al inicio)
    pub row_index: u32,
}

impl BaffleRow {
    /// Crear fila de dados distribuidos uniformemente
    /// `num_blocks`: Número de dados
    /// `channel_width`: Ancho del canal
    /// `block_template`: Plantilla para dimensiones
    /// `distance_from_toe`: Distancia desde el pie
    pub fn uniform(
        num_blocks: usize,
        channel_width: f64,
        block_template: &BaffleBlock,
        distance_from_toe: f64,
        row_index: u32,
    ) -> Self {
        let mut blocks = Vec::with_capacity(num_blocks);

        if num_blocks == 0 {
            return Self {
                blocks,
                distance_from_toe,
                row_index,
            };
        }

        // Calcular espaciado
        // Espaciado típico USBR: 0.75*y1 entre bloques
        let total_block_width = num_blocks as f64 * block_template.width;
        let available_space = channel_width - total_block_width;
        let spacing = available_space / (num_blocks + 1) as f64;

        // Posicionar bloques simétricamente
        let start_x = -channel_width / 2.0 + spacing + block_template.width / 2.0;

        for i in 0..num_blocks {
            let x = start_x + i as f64 * (block_template.width + spacing);
            let mut block = block_template.clone();
            block.x_offset = x;
            block.y_position = distance_from_toe;
            blocks.push(block);
        }

        Self {
            blocks,
            distance_from_toe,
            row_index,
        }
    }

    /// Crear fila con patrón alternado (staggered)
    /// Los bloques se alternan entre 2 y 3 por grupo
    pub fn staggered(
        channel_width: f64,
        block_template: &BaffleBlock,
        distance_from_toe: f64,
        row_index: u32,
        is_offset: bool,
    ) -> Self {
        // Número de bloques que caben con espaciado 0.75*width
        let spacing = 0.75 * block_template.width;
        let num_blocks = ((channel_width - block_template.width) / (block_template.width + spacing))
            as usize
            + 1;

        let mut blocks = Vec::with_capacity(num_blocks);
        let half_width = channel_width / 2.0;

        // Si es fila alternada, desplazar medio espaciado
        let offset = if is_offset {
            (block_template.width + spacing) / 2.0
        } else {
            0.0
        };

        let start_x = -half_width + block_template.width / 2.0 + spacing / 2.0 + offset;

        let mut x = start_x;
        while x < half_width - block_template.width / 2.0 {
            let mut block = block_template.clone();
            block.x_offset = x;
            block.y_position = distance_from_toe;
            blocks.push(block);
            x += block_template.width + spacing;
        }

        Self {
            blocks,
            distance_from_toe,
            row_index,
        }
    }
}

/// Bloque de entrada (chute block) en el inicio del tanque
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChuteBlock {
    /// Ancho del bloque (m)
    pub width: f64,

    /// Altura del bloque (m) - típicamente = y1
    pub height: f64,

    /// Espesor del bloque (m)
    pub thickness: f64,

    /// Posición X relativa al centro (m)
    pub x_offset: f64,
}

impl ChuteBlock {
    /// Crear chute block según USBR Type II/III
    /// Dimensiones: h = y1, w = y1, t = y1 (bloques cuadrados)
    pub fn usbr(y1: f64, x_offset: f64) -> Self {
        Self {
            width: y1,
            height: y1,
            thickness: y1,
            x_offset,
        }
    }
}

/// Umbral de salida (end sill)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EndSillType {
    /// Umbral sólido (Type III)
    Solid {
        /// Altura del umbral (m) - típicamente 0.2*y2
        height: f64,
    },

    /// Umbral dentado (Type II)
    Dentated {
        /// Altura de los dientes (m)
        tooth_height: f64,
        /// Ancho de los dientes (m) - típicamente 0.02*y2
        tooth_width: f64,
        /// Espaciado entre dientes (m) - típicamente = tooth_width
        tooth_spacing: f64,
    },

    /// Sin umbral
    None,
}

impl Default for EndSillType {
    fn default() -> Self {
        EndSillType::None
    }
}

// ============================================================================
// STILLING BASIN DESIGN - Diseño Completo de Tanque Amortiguador
// ============================================================================

/// Diseño completo de tanque amortiguador USBR
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StillingBasinDesign {
    /// Tipo de tanque
    pub basin_type: StillingBasinType,

    /// Tipo de salto hidráulico
    pub jump_type: HydraulicJumpType,

    // === Condiciones de entrada ===
    /// Profundidad supercrítica de entrada y1 (m)
    pub y1: f64,

    /// Profundidad conjugada (secuente) y2 (m)
    pub y2: f64,

    /// Velocidad de entrada v1 (m/s)
    pub v1: f64,

    /// Número de Froude de entrada
    pub froude: f64,

    /// Caudal de diseño (m³/s)
    pub discharge: f64,

    /// Ancho del canal (m)
    pub channel_width: f64,

    // === Dimensiones del tanque ===
    /// Longitud total del tanque (m)
    pub length: f64,

    /// Profundidad del tanque bajo el nivel de aguas abajo (m)
    /// (depresión del fondo)
    pub depth: f64,

    /// Elevación del fondo del tanque respecto al canal aguas abajo (m)
    /// Negativo = deprimido
    pub floor_elevation: f64,

    // === Componentes ===
    /// Bloques de entrada (chute blocks)
    pub chute_blocks: Vec<ChuteBlock>,

    /// Filas de dados amortiguadores
    pub baffle_rows: Vec<BaffleRow>,

    /// Tipo de umbral de salida
    pub end_sill: EndSillType,

    /// Longitud del delantal de protección aguas abajo (m)
    pub apron_length: f64,

    // === Eficiencia y pérdidas ===
    /// Pérdida de energía en el salto (m)
    pub energy_loss: f64,

    /// Eficiencia de disipación (0-1)
    pub efficiency: f64,

    /// Sumergencia del salto (tailwater/y2)
    pub submergence_ratio: f64,
}

impl StillingBasinDesign {
    /// Diseñar tanque amortiguador automáticamente
    ///
    /// # Argumentos
    /// - `discharge`: Caudal de diseño (m³/s)
    /// - `channel_width`: Ancho del canal (m)
    /// - `y1`: Profundidad supercrítica de entrada (m)
    /// - `v1`: Velocidad de entrada (m/s)
    /// - `tailwater_depth`: Profundidad de aguas abajo disponible (m)
    ///
    /// # Retorna
    /// Diseño completo del tanque o error
    pub fn design(
        discharge: f64,
        channel_width: f64,
        y1: f64,
        v1: f64,
        tailwater_depth: f64,
    ) -> Result<Self, String> {
        // Validaciones
        if discharge <= 0.0 {
            return Err("Discharge must be positive".into());
        }
        if channel_width <= 0.0 {
            return Err("Channel width must be positive".into());
        }
        if y1 <= 0.0 {
            return Err("y1 must be positive".into());
        }
        if v1 <= 0.0 {
            return Err("v1 must be positive".into());
        }

        // Calcular Froude
        let froude = v1 / (G * y1).sqrt();

        if froude <= 1.0 {
            return Err(format!(
                "Flow is subcritical (Fr = {:.2}), no hydraulic jump will form",
                froude
            ));
        }

        // Calcular y2 usando ecuación de Belanger
        let y2 = y1 * 0.5 * ((1.0 + 8.0 * froude.powi(2)).sqrt() - 1.0);

        // Clasificar tipo de salto
        let jump_type = HydraulicJumpType::from_froude(froude);

        // Seleccionar tipo de tanque
        let basin_type = StillingBasinType::select(froude, v1);

        // Calcular longitud del tanque según tipo
        let (length, _length_ratio) = Self::calculate_length(basin_type, froude, y2);

        // Calcular depresión del fondo necesaria
        // Si tailwater < y2, necesitamos deprimir el fondo
        let depth = if tailwater_depth < y2 {
            y2 - tailwater_depth
        } else {
            0.0
        };

        let floor_elevation = -depth;

        // Diseñar componentes según tipo
        let (chute_blocks, baffle_rows, end_sill) =
            Self::design_components(basin_type, y1, y2, froude, channel_width, length);

        // Calcular pérdida de energía
        // ΔE = (y2 - y1)³ / (4 * y1 * y2)
        let energy_loss = (y2 - y1).powi(3) / (4.0 * y1 * y2);

        // Energía específica de entrada
        let e1 = y1 + v1.powi(2) / (2.0 * G);

        // Eficiencia = ΔE / E1
        let efficiency = energy_loss / e1;

        // Sumergencia
        let submergence_ratio = tailwater_depth / y2;

        // Longitud del delantal de protección (riprap)
        // Típicamente 2-4 veces y2
        let apron_length = 3.0 * y2;

        Ok(Self {
            basin_type,
            jump_type,
            y1,
            y2,
            v1,
            froude,
            discharge,
            channel_width,
            length,
            depth,
            floor_elevation,
            chute_blocks,
            baffle_rows,
            end_sill,
            apron_length,
            energy_loss,
            efficiency,
            submergence_ratio,
        })
    }

    /// Calcular longitud del tanque según tipo USBR
    /// Retorna (longitud, ratio L/y2)
    fn calculate_length(basin_type: StillingBasinType, froude: f64, y2: f64) -> (f64, f64) {
        let ratio = match basin_type {
            StillingBasinType::TypeI => {
                // Longitud del salto libre: L = 6.1 * y2 (USBR)
                6.1
            }
            StillingBasinType::TypeII => {
                // Reducido ~33%: L/y2 = 4.0 - 4.5
                // Fórmula empírica: L/y2 = 4.5 - 0.05*(Fr-4.5) para Fr > 4.5
                if froude > 4.5 {
                    (4.5 - 0.05 * (froude - 4.5)).max(3.8)
                } else {
                    4.3
                }
            }
            StillingBasinType::TypeIII => {
                // El más corto: L/y2 = 2.5 - 2.8
                // Fórmula: L/y2 = 2.8 para Fr < 5, decrece ligeramente
                if froude < 5.0 {
                    2.8
                } else {
                    (2.8 - 0.02 * (froude - 5.0)).max(2.5)
                }
            }
            StillingBasinType::TypeIV => {
                // Similar a Type II pero con deflector
                4.5
            }
            StillingBasinType::SAF => {
                // Muy corto: L/y2 = 2.0 + (Fr - 2) * 0.1
                // Rango típico: 1.5 - 2.5
                (1.5 + 0.1 * (froude - 2.0)).clamp(1.5, 2.5)
            }
        };

        (ratio * y2, ratio)
    }

    /// Diseñar componentes internos del tanque
    fn design_components(
        basin_type: StillingBasinType,
        y1: f64,
        y2: f64,
        _froude: f64,
        channel_width: f64,
        basin_length: f64,
    ) -> (Vec<ChuteBlock>, Vec<BaffleRow>, EndSillType) {
        match basin_type {
            StillingBasinType::TypeI => {
                // Sin accesorios
                (vec![], vec![], EndSillType::None)
            }

            StillingBasinType::TypeII => {
                // Chute blocks + Dentated end sill (sin baffle blocks)
                let chute_blocks = Self::design_chute_blocks(y1, channel_width);

                let end_sill = EndSillType::Dentated {
                    tooth_height: 0.2 * y2,
                    tooth_width: 0.15 * y2,
                    tooth_spacing: 0.15 * y2,
                };

                (chute_blocks, vec![], end_sill)
            }

            StillingBasinType::TypeIII => {
                // Chute blocks + Baffle blocks + Solid end sill
                let chute_blocks = Self::design_chute_blocks(y1, channel_width);

                // Una fila de baffle blocks a 0.8 * basin_length desde el inicio
                let baffle_template = BaffleBlock::usbr_type3(y1, 0.0, 0.0);
                let num_baffles = ((channel_width / (baffle_template.width * 2.0)) as usize).max(2);

                let baffle_row = BaffleRow::uniform(
                    num_baffles,
                    channel_width,
                    &baffle_template,
                    0.8 * basin_length,
                    0,
                );

                let end_sill = EndSillType::Solid { height: 0.2 * y2 };

                (chute_blocks, vec![baffle_row], end_sill)
            }

            StillingBasinType::TypeIV => {
                // Similar a Type II pero con deflector (simplificado aquí)
                let chute_blocks = Self::design_chute_blocks(y1, channel_width);

                let end_sill = EndSillType::Solid { height: 0.15 * y2 };

                (chute_blocks, vec![], end_sill)
            }

            StillingBasinType::SAF => {
                // Chute blocks + Baffle blocks + Solid end sill (diseño compacto)
                let chute_blocks = Self::design_chute_blocks(y1, channel_width);

                // Dos filas de baffle blocks alternados
                let baffle_template = BaffleBlock::saf(y1, y2, 0.0, 0.0);

                let row1 = BaffleRow::staggered(
                    channel_width,
                    &baffle_template,
                    0.4 * basin_length,
                    0,
                    false,
                );
                let row2 = BaffleRow::staggered(
                    channel_width,
                    &baffle_template,
                    0.6 * basin_length,
                    1,
                    true,
                );

                let end_sill = EndSillType::Solid { height: 0.07 * y2 };

                (chute_blocks, vec![row1, row2], end_sill)
            }
        }
    }

    /// Diseñar chute blocks de entrada
    fn design_chute_blocks(y1: f64, channel_width: f64) -> Vec<ChuteBlock> {
        let block_width = y1;
        let spacing = y1; // Espaciado igual al ancho
        let num_blocks = ((channel_width - block_width) / (block_width + spacing)) as usize + 1;

        let mut blocks = Vec::with_capacity(num_blocks);
        let start_x = -channel_width / 2.0 + spacing / 2.0 + block_width / 2.0;

        for i in 0..num_blocks {
            let x = start_x + i as f64 * (block_width + spacing);
            if x <= channel_width / 2.0 - block_width / 2.0 {
                blocks.push(ChuteBlock::usbr(y1, x));
            }
        }

        blocks
    }

    /// Verificar si el diseño es seguro
    pub fn is_safe(&self) -> bool {
        // Verificar tipo de salto
        if !self.jump_type.is_design_safe() && self.jump_type != HydraulicJumpType::Strong {
            return false;
        }

        // Verificar sumergencia (0.85-1.0 es óptimo)
        if self.submergence_ratio < 0.85 {
            return false;
        }

        // Verificar velocidad (Type III limitado a 15 m/s)
        if self.basin_type == StillingBasinType::TypeIII && self.v1 > 15.0 {
            return false;
        }

        true
    }

    /// Obtener advertencias de diseño
    pub fn warnings(&self) -> Vec<String> {
        let mut warnings = Vec::new();

        if self.jump_type == HydraulicJumpType::Oscillating {
            warnings.push(
                "WARNING: Oscillating jump (Fr 2.5-4.5) may cause instability and erosion"
                    .to_string(),
            );
        }

        if self.submergence_ratio < 0.85 {
            warnings.push(format!(
                "WARNING: Low submergence ratio ({:.2}) - jump may sweep out",
                self.submergence_ratio
            ));
        } else if self.submergence_ratio > 1.1 {
            warnings.push(format!(
                "WARNING: High submergence ratio ({:.2}) - submerged jump reduces efficiency",
                self.submergence_ratio
            ));
        }

        if self.v1 > 20.0 {
            warnings.push(format!(
                "WARNING: High entry velocity ({:.1} m/s) - consider special protection",
                self.v1
            ));
        }

        if self.basin_type == StillingBasinType::TypeIII && self.v1 > 15.0 {
            warnings.push(
                "WARNING: Type III basin not recommended for v > 15 m/s - baffle block damage risk"
                    .to_string(),
            );
        }

        warnings
    }

    /// Volumen total de concreto del tanque (estimación)
    pub fn concrete_volume(&self, wall_thickness: f64, floor_thickness: f64) -> f64 {
        // Fondo
        let floor = self.length * self.channel_width * floor_thickness;

        // Paredes laterales
        let walls = 2.0 * self.length * (self.depth + self.y2) * wall_thickness;

        // Chute blocks
        let chute_vol: f64 = self
            .chute_blocks
            .iter()
            .map(|b| b.width * b.height * b.thickness)
            .sum();

        // Baffle blocks
        let baffle_vol: f64 = self
            .baffle_rows
            .iter()
            .flat_map(|r| &r.blocks)
            .map(|b| b.volume())
            .sum();

        // End sill
        let sill_vol = match &self.end_sill {
            EndSillType::Solid { height } => *height * self.channel_width * wall_thickness,
            EndSillType::Dentated { tooth_height, .. } => {
                *tooth_height * self.channel_width * wall_thickness * 0.5 // Aproximado
            }
            EndSillType::None => 0.0,
        };

        floor + walls + chute_vol + baffle_vol + sill_vol
    }
}

// ============================================================================
// CHUTE (RAPIDA) - Canal de Alta Pendiente con Disipadores
// ============================================================================

/// Rápida (chute) con disipadores opcionales
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chute {
    /// Identificador único
    pub id: ElementId,

    /// Estación de inicio (m)
    pub start_station: f64,

    /// Longitud horizontal de la rápida (m)
    pub length: f64,

    /// Caída de elevación (m)
    pub drop: f64,

    /// Ancho del canal (m)
    pub width: f64,

    /// Pendiente (m/m), calculada automáticamente
    pub slope: f64,

    /// Coeficiente de Manning
    pub manning_n: f64,

    /// ¿Incluir bloques escalonados a lo largo de la rápida?
    pub with_step_blocks: bool,

    /// Espaciado de bloques escalonados (m)
    pub step_block_spacing: Option<f64>,

    /// Tanque amortiguador al final
    pub stilling_basin: Option<StillingBasinDesign>,

    /// Aireación requerida (calculada)
    pub aeration_required: bool,

    /// Velocidad máxima esperada (m/s)
    pub max_velocity: f64,
}

impl Chute {
    /// Crear nueva rápida
    pub fn new(start_station: f64, length: f64, drop: f64, width: f64) -> Self {
        let slope = drop / length;
        Self {
            id: ElementId::new_v4(),
            start_station,
            length,
            drop,
            width,
            slope,
            manning_n: 0.014, // Concreto liso
            with_step_blocks: false,
            step_block_spacing: None,
            stilling_basin: None,
            aeration_required: false,
            max_velocity: 0.0,
        }
    }

    /// Calcular perfil hidráulico a lo largo de la rápida
    ///
    /// # Argumentos
    /// - `discharge`: Caudal (m³/s)
    /// - `num_points`: Número de puntos de cálculo
    ///
    /// # Retorna
    /// Vector de (distancia, profundidad, velocidad, froude)
    pub fn hydraulic_profile(
        &self,
        discharge: f64,
        num_points: usize,
    ) -> Vec<(f64, f64, f64, f64)> {
        let mut profile = Vec::with_capacity(num_points);

        // Calcular profundidad normal
        let yn = self.normal_depth(discharge);

        // Calcular profundidad crítica
        let yc = self.critical_depth(discharge);

        // La rápida típicamente tiene flujo supercrítico (y < yc)
        // Comenzar con profundidad cerca de yc y desarrollar hacia yn

        let dx = self.length / (num_points - 1) as f64;

        for i in 0..num_points {
            let x = i as f64 * dx;

            // Interpolación simplificada desde yc hacia yn
            // En realidad debería resolver GVF, pero esto da una aproximación
            let t = x / self.length;
            let y = yc * (1.0 - t) + yn * t;

            let area = y * self.width;
            let v = discharge / area;
            let fr = v / (G * y).sqrt();

            profile.push((x, y, v, fr));
        }

        profile
    }

    /// Calcular profundidad normal usando Manning
    pub fn normal_depth(&self, discharge: f64) -> f64 {
        // Iteración Newton-Raphson para resolver:
        // Q = (1/n) * A * R^(2/3) * S^(1/2)
        // Para sección rectangular: A = B*y, P = B + 2y, R = By/(B+2y)

        let mut y = 1.0; // Estimación inicial
        let q = discharge;
        let n = self.manning_n;
        let s_sqrt = self.slope.sqrt();
        let b = self.width;

        for _ in 0..50 {
            let area = b * y;
            let perim = b + 2.0 * y;
            let r = area / perim;

            let q_calc = (1.0 / n) * area * r.powf(2.0 / 3.0) * s_sqrt;

            // Derivada dQ/dy (aproximada)
            let dy = 0.001;
            let area2 = b * (y + dy);
            let perim2 = b + 2.0 * (y + dy);
            let r2 = area2 / perim2;
            let q_calc2 = (1.0 / n) * area2 * r2.powf(2.0 / 3.0) * s_sqrt;

            let dq_dy = (q_calc2 - q_calc) / dy;

            let delta = (q - q_calc) / dq_dy;
            y += delta;

            if delta.abs() < 1e-6 {
                break;
            }
        }

        y.max(0.01)
    }

    /// Calcular profundidad crítica
    pub fn critical_depth(&self, discharge: f64) -> f64 {
        // Para sección rectangular: yc = (q²/g)^(1/3) donde q = Q/B
        let q = discharge / self.width;
        (q.powi(2) / G).powf(1.0 / 3.0)
    }

    /// Builder: agregar bloques escalonados
    pub fn with_step_blocks(mut self, spacing: f64) -> Self {
        self.with_step_blocks = true;
        self.step_block_spacing = Some(spacing);
        self
    }

    /// Diseñar tanque amortiguador al final de la rápida
    ///
    /// # Argumentos
    /// - `discharge`: Caudal de diseño (m³/s)
    /// - `tailwater_depth`: Profundidad de aguas abajo (m)
    pub fn design_stilling_basin(
        mut self,
        discharge: f64,
        tailwater_depth: f64,
    ) -> Result<Self, String> {
        // Calcular condiciones al pie de la rápida
        let yn = self.normal_depth(discharge);
        let area = yn * self.width;
        let v1 = discharge / area;

        self.max_velocity = v1;

        // Verificar aireación
        // Se recomienda aireación si v > 20 m/s y longitud > 30 m
        self.aeration_required = v1 > 20.0 && self.length > 30.0;

        // Diseñar tanque
        let basin = StillingBasinDesign::design(discharge, self.width, yn, v1, tailwater_depth)?;

        self.stilling_basin = Some(basin);
        Ok(self)
    }

    /// Estación de fin de la rápida (sin incluir tanque)
    pub fn end_station(&self) -> f64 {
        self.start_station + self.length
    }

    /// Estación de fin incluyendo tanque amortiguador
    pub fn total_end_station(&self) -> f64 {
        let chute_end = self.end_station();
        match &self.stilling_basin {
            Some(basin) => chute_end + basin.length + basin.apron_length,
            None => chute_end,
        }
    }
}

/// Estructura de caida/rapida
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Drop {
    /// Identificador unico
    pub id: ElementId,

    /// Estacion donde se ubica la caida
    pub station: f64,

    /// Tipo de caida
    pub drop_type: DropType,

    /// Altura de la caida (m)
    pub height: f64,

    /// Longitud horizontal de la caida (m)
    pub length: f64,

    /// Ancho de la caida (m) - si difiere del canal
    pub width: Option<f64>,

    /// Pendiente de la rampa (para Inclined) en m/m
    pub slope: Option<f64>,

    /// Numero de escalones (para Stepped)
    pub num_steps: Option<u32>,

    /// Disipador de energia
    pub dissipator: EnergyDissipator,

    /// Coeficiente de descarga
    pub discharge_coefficient: f64,
}

impl Drop {
    /// Crear nueva caida vertical
    pub fn vertical(station: f64, height: f64) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            drop_type: DropType::Vertical,
            height,
            length: height * 0.5, // Longitud tipica
            width: None,
            slope: None,
            num_steps: None,
            dissipator: EnergyDissipator::default(),
            discharge_coefficient: 0.6,
        }
    }

    /// Crear rampa inclinada
    pub fn inclined(station: f64, height: f64, slope: f64) -> Self {
        let length = height / slope.abs();
        Self {
            id: ElementId::new_v4(),
            station,
            drop_type: DropType::Inclined,
            height,
            length,
            width: None,
            slope: Some(slope),
            num_steps: None,
            dissipator: EnergyDissipator::default(),
            discharge_coefficient: 0.85,
        }
    }

    /// Crear caida escalonada
    pub fn stepped(station: f64, height: f64, num_steps: u32) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            drop_type: DropType::Stepped,
            height,
            length: height * 1.5, // Relacion tipica
            width: None,
            slope: None,
            num_steps: Some(num_steps),
            dissipator: EnergyDissipator::default(),
            discharge_coefficient: 0.75,
        }
    }

    /// Builder: agregar tanque amortiguador
    pub fn with_stilling_basin(mut self, length: f64, depth: f64) -> Self {
        self.dissipator = EnergyDissipator::StillingBasin {
            length,
            depth,
            baffle_rows: 1,
        };
        self
    }

    /// Calcular caudal sobre la caida (formula de vertedero)
    /// Q = Cd * L * H^1.5 * sqrt(2g)
    pub fn discharge(&self, head: f64, width: f64) -> f64 {
        self.discharge_coefficient * width * head.powf(1.5) * (2.0 * G).sqrt()
    }

    /// Calcular altura del salto hidraulico aguas abajo
    /// Usando ecuacion de Belanger
    pub fn downstream_depth(&self, upstream_velocity: f64, upstream_depth: f64) -> f64 {
        let fr1 = upstream_velocity / (G * upstream_depth).sqrt();

        if fr1 <= 1.0 {
            // Flujo subcritico, no hay salto
            upstream_depth
        } else {
            // Ecuacion de Belanger: y2/y1 = 0.5 * (sqrt(1 + 8*Fr1^2) - 1)
            upstream_depth * 0.5 * ((1.0 + 8.0 * fr1.powi(2)).sqrt() - 1.0)
        }
    }

    /// Estacion de fin de la estructura
    pub fn end_station(&self) -> f64 {
        self.station + self.length
    }
}

// ============================================================================
// WEIRS - Vertederos
// ============================================================================

/// Tipo de vertedero
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum WeirType {
    /// Vertedero rectangular de cresta aguda
    #[default]
    RectangularSharpCrested,

    /// Vertedero rectangular de cresta ancha
    RectangularBroadCrested,

    /// Vertedero trapezoidal (Cipolletti)
    Trapezoidal,

    /// Vertedero triangular (V-notch)
    Triangular,

    /// Vertedero Ogee (perfil de rebosadero)
    Ogee,

    /// Vertedero proporcional (Sutro)
    Sutro,

    /// Vertedero de laberinto
    Labyrinth,
}

/// Estructura de vertedero
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Weir {
    /// Identificador unico
    pub id: ElementId,

    /// Estacion donde se ubica el vertedero
    pub station: f64,

    /// Tipo de vertedero
    pub weir_type: WeirType,

    /// Longitud de la cresta (m)
    pub crest_length: f64,

    /// Elevacion de la cresta (m sobre el fondo)
    pub crest_elevation: f64,

    /// Coeficiente de descarga
    pub discharge_coefficient: f64,

    /// Angulo del vertedero triangular (grados)
    pub notch_angle: Option<f64>,

    /// Talud para vertedero trapezoidal (H:V)
    pub side_slope: Option<f64>,

    /// Altura del perfil Ogee (m)
    pub ogee_height: Option<f64>,
}

impl Weir {
    /// Crear vertedero rectangular de cresta aguda
    pub fn rectangular_sharp(station: f64, crest_length: f64, crest_elevation: f64) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            weir_type: WeirType::RectangularSharpCrested,
            crest_length,
            crest_elevation,
            discharge_coefficient: 1.84, // Cd para SI (m, m^3/s)
            notch_angle: None,
            side_slope: None,
            ogee_height: None,
        }
    }

    /// Crear vertedero trapezoidal (Cipolletti)
    pub fn trapezoidal(station: f64, crest_length: f64, crest_elevation: f64) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            weir_type: WeirType::Trapezoidal,
            crest_length,
            crest_elevation,
            discharge_coefficient: 1.86,
            notch_angle: None,
            side_slope: Some(0.25), // 1H:4V tipico Cipolletti
            ogee_height: None,
        }
    }

    /// Crear vertedero triangular (V-notch)
    pub fn triangular(station: f64, notch_angle: f64, crest_elevation: f64) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            weir_type: WeirType::Triangular,
            crest_length: 0.0, // No aplica
            crest_elevation,
            discharge_coefficient: 1.38, // Para angulo de 90°
            notch_angle: Some(notch_angle),
            side_slope: None,
            ogee_height: None,
        }
    }

    /// Crear vertedero Ogee
    pub fn ogee(station: f64, crest_length: f64, crest_elevation: f64, height: f64) -> Self {
        Self {
            id: ElementId::new_v4(),
            station,
            weir_type: WeirType::Ogee,
            crest_length,
            crest_elevation,
            discharge_coefficient: 2.18, // Cd para perfil estandar
            notch_angle: None,
            side_slope: None,
            ogee_height: Some(height),
        }
    }

    /// Calcular caudal sobre el vertedero
    pub fn discharge(&self, head: f64) -> f64 {
        if head <= 0.0 {
            return 0.0;
        }

        match self.weir_type {
            WeirType::RectangularSharpCrested | WeirType::RectangularBroadCrested => {
                // Q = Cd * L * H^1.5
                self.discharge_coefficient * self.crest_length * head.powf(1.5)
            }

            WeirType::Trapezoidal => {
                // Q = Cd * L * H^1.5 (formula Cipolletti)
                self.discharge_coefficient * self.crest_length * head.powf(1.5)
            }

            WeirType::Triangular => {
                // Q = Cd * tan(θ/2) * H^2.5
                let theta = self.notch_angle.unwrap_or(90.0).to_radians();
                self.discharge_coefficient * (theta / 2.0).tan() * head.powf(2.5)
            }

            WeirType::Ogee => {
                // Q = Cd * L * H^1.5 (coeficiente variable con H/Hd)
                let hd = self.ogee_height.unwrap_or(head);
                let cd_adjusted = self.discharge_coefficient * (head / hd).powf(0.12);
                cd_adjusted * self.crest_length * head.powf(1.5)
            }

            WeirType::Sutro => {
                // Q proporcional a H
                self.discharge_coefficient * self.crest_length * head
            }

            WeirType::Labyrinth => {
                // Q = Cd * Le * H^1.5 (Le = longitud efectiva ≈ 3-5x longitud frontal)
                let effective_length = self.crest_length * 3.5;
                self.discharge_coefficient * effective_length * head.powf(1.5)
            }
        }
    }

    /// Calcular carga necesaria para un caudal dado
    pub fn head_for_discharge(&self, discharge: f64) -> f64 {
        if discharge <= 0.0 {
            return 0.0;
        }

        match self.weir_type {
            WeirType::Triangular => {
                let theta = self.notch_angle.unwrap_or(90.0).to_radians();
                (discharge / (self.discharge_coefficient * (theta / 2.0).tan())).powf(1.0 / 2.5)
            }
            WeirType::Sutro => discharge / (self.discharge_coefficient * self.crest_length),
            _ => (discharge / (self.discharge_coefficient * self.crest_length)).powf(1.0 / 1.5),
        }
    }
}

// ============================================================================
// JUNCTIONS - Derivaciones y Confluencias
// ============================================================================

/// Lado de la derivacion
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum JunctionSide {
    Left,
    Right,
}

/// Tipo de juncion
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum JunctionType {
    /// Derivacion lateral (toma de agua)
    #[default]
    Lateral,

    /// Confluencia de dos canales
    Confluence,

    /// Division de flujo
    Division,
}

/// Tipo de compuerta
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub enum GateType {
    /// Compuerta deslizante
    Sluice { width: f64, height: f64 },

    /// Compuerta radial (Tainter)
    Radial { width: f64, radius: f64 },

    /// Sin compuerta
    #[default]
    None,
}

/// Estructura de juncion/derivacion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Junction {
    /// Identificador unico
    pub id: ElementId,

    /// Estacion en el canal principal
    pub main_station: f64,

    /// Lado de la derivacion
    pub side: JunctionSide,

    /// Tipo de juncion
    pub junction_type: JunctionType,

    /// Angulo de la derivacion (grados desde la tangente del canal principal)
    pub branch_angle: f64,

    /// Ancho del canal derivado (m)
    pub branch_width: f64,

    /// Profundidad del canal derivado (m)
    pub branch_depth: f64,

    /// Longitud de transicion (m)
    pub transition_length: f64,

    /// Compuerta de control
    pub gate: GateType,

    /// Coeficiente de perdida
    pub loss_coefficient: f64,

    /// Radio de curvatura en la entrada (m)
    pub entry_radius: Option<f64>,
}

impl Junction {
    /// Crear derivacion lateral simple
    pub fn lateral(station: f64, side: JunctionSide, branch_width: f64, angle: f64) -> Self {
        Self {
            id: ElementId::new_v4(),
            main_station: station,
            side,
            junction_type: JunctionType::Lateral,
            branch_angle: angle,
            branch_width,
            branch_depth: 1.0, // Default
            transition_length: branch_width * 2.0,
            gate: GateType::None,
            loss_coefficient: 0.5 + 0.01 * angle, // Aumenta con el angulo
            entry_radius: Some(branch_width * 0.5),
        }
    }

    /// Crear confluencia
    pub fn confluence(station: f64, side: JunctionSide, branch_width: f64, angle: f64) -> Self {
        Self {
            id: ElementId::new_v4(),
            main_station: station,
            side,
            junction_type: JunctionType::Confluence,
            branch_angle: angle,
            branch_width,
            branch_depth: 1.0,
            transition_length: branch_width * 3.0,
            gate: GateType::None,
            loss_coefficient: 0.3 + 0.005 * angle,
            entry_radius: Some(branch_width),
        }
    }

    /// Builder: agregar compuerta deslizante
    pub fn with_sluice_gate(mut self, width: f64, height: f64) -> Self {
        self.gate = GateType::Sluice { width, height };
        self
    }

    /// Builder: establecer profundidad del ramal
    pub fn with_depth(mut self, depth: f64) -> Self {
        self.branch_depth = depth;
        self
    }

    /// Calcular perdida de carga en la derivacion
    pub fn head_loss(&self, velocity: f64) -> f64 {
        self.loss_coefficient * velocity.powi(2) / (2.0 * G)
    }

    /// Calcular caudal derivado (aproximacion)
    /// main_discharge: Caudal en el canal principal (m^3/s)
    /// main_depth: Profundidad en el canal principal (m)
    pub fn branch_discharge(&self, main_discharge: f64, main_depth: f64) -> f64 {
        // Formula simplificada basada en relacion de areas
        let main_area = main_depth * self.branch_width * 1.5; // Aproximacion
        let branch_area = self.branch_depth * self.branch_width;

        let area_ratio = branch_area / main_area;
        let angle_factor = (90.0 - self.branch_angle.abs()).to_radians().cos();

        main_discharge * area_ratio * angle_factor * 0.7 // Factor de eficiencia
    }

    /// Posicion del punto de inicio de la derivacion
    pub fn branch_start_point(&self, main_position: Point3, main_tangent: Point3) -> Point3 {
        let tangent = NaVec3::new(main_tangent.x, main_tangent.y, main_tangent.z);
        let up = NaVec3::new(0.0, 0.0, 1.0);
        let side_dir = tangent.cross(&up).normalize();

        let side_offset = match self.side {
            JunctionSide::Left => -side_dir * (self.branch_width / 2.0),
            JunctionSide::Right => side_dir * (self.branch_width / 2.0),
        };

        Point3::new(
            main_position.x + side_offset.x,
            main_position.y + side_offset.y,
            main_position.z,
        )
    }
}
