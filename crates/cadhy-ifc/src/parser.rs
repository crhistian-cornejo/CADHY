//! IFC file parser
//!
//! Implements parsing of IFC STEP files (ISO 10303-21 format).

use crate::error::{IfcError, IfcResult};
use crate::geometry::GeometryExtractor;
use crate::types::*;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tracing::{info, warn};

/// IFC file importer
pub struct IfcImporter {
    /// Raw file content
    content: String,
    /// Parsed entities by ID
    entities: HashMap<u64, IfcEntity>,
    /// Detected schema version
    schema: IfcSchema,
}

/// Parsed IFC entity
#[derive(Debug, Clone)]
pub struct IfcEntity {
    /// Entity ID (#123)
    pub id: u64,
    /// Entity type name
    pub type_name: String,
    /// Entity attributes
    pub attributes: Vec<IfcAttribute>,
}

/// IFC attribute value
#[derive(Debug, Clone)]
pub enum IfcAttribute {
    String(String),
    Real(f64),
    Integer(i64),
    Boolean(bool),
    Enum(String),
    Reference(u64),
    List(Vec<IfcAttribute>),
    Null,
    Derived,
}

impl IfcImporter {
    /// Create a new importer from a file path
    pub fn from_file<P: AsRef<Path>>(path: P) -> IfcResult<Self> {
        let content = fs::read_to_string(path.as_ref()).map_err(|e| {
            IfcError::ReadError(format!(
                "Failed to read file '{}': {}",
                path.as_ref().display(),
                e
            ))
        })?;

        Self::from_string(content)
    }

    /// Create a new importer from a string
    pub fn from_string(content: String) -> IfcResult<Self> {
        let schema = Self::detect_schema(&content)?;
        info!("Detected IFC schema: {}", schema);

        let entities = Self::parse_entities(&content)?;
        info!("Parsed {} entities", entities.len());

        Ok(Self {
            content,
            entities,
            schema,
        })
    }

    /// Detect the IFC schema version from the header
    fn detect_schema(content: &str) -> IfcResult<IfcSchema> {
        // Look for FILE_SCHEMA in header
        if let Some(schema_start) = content.find("FILE_SCHEMA") {
            let schema_section = &content[schema_start..];
            if let Some(end) = schema_section.find(';') {
                let schema_str = &schema_section[..end].to_uppercase();

                if schema_str.contains("IFC4X3") {
                    return Ok(IfcSchema::Ifc4x3);
                } else if schema_str.contains("IFC4X2") {
                    return Ok(IfcSchema::Ifc4x2);
                } else if schema_str.contains("IFC4X1") {
                    return Ok(IfcSchema::Ifc4x1);
                } else if schema_str.contains("IFC4") {
                    return Ok(IfcSchema::Ifc4);
                } else if schema_str.contains("IFC2X3") {
                    return Ok(IfcSchema::Ifc2x3);
                }
            }
        }

        // Default to IFC4 if not detected
        warn!("Could not detect IFC schema, defaulting to IFC4");
        Ok(IfcSchema::Ifc4)
    }

    /// Parse all entities from the DATA section
    fn parse_entities(content: &str) -> IfcResult<HashMap<u64, IfcEntity>> {
        let mut entities = HashMap::new();

        // Find DATA section
        let data_start = content
            .find("DATA;")
            .ok_or_else(|| IfcError::ParseError("DATA section not found".into()))?;

        let data_section = &content[data_start..];

        // Find ENDSEC
        let data_end = data_section.find("ENDSEC;").unwrap_or(data_section.len());

        let data_content = &data_section[5..data_end]; // Skip "DATA;"

        // Parse each line
        for line in data_content.lines() {
            let line = line.trim();
            if line.is_empty() || !line.starts_with('#') {
                continue;
            }

            if let Some(entity) = Self::parse_entity_line(line) {
                entities.insert(entity.id, entity);
            }
        }

        Ok(entities)
    }

    /// Parse a single entity line like "#123=IFCWALL(...)"
    fn parse_entity_line(line: &str) -> Option<IfcEntity> {
        // Find entity ID
        let hash_end = line.find('=')?;
        let id_str = &line[1..hash_end];
        let id: u64 = id_str.parse().ok()?;

        // Find entity type
        let rest = &line[hash_end + 1..];
        let paren_start = rest.find('(')?;
        let type_name = rest[..paren_start].trim().to_string();

        // Find attributes (everything between parentheses)
        let paren_end = rest.rfind(')')?;
        let attrs_str = &rest[paren_start + 1..paren_end];

        let attributes = Self::parse_attributes(attrs_str);

        Some(IfcEntity {
            id,
            type_name,
            attributes,
        })
    }

    /// Parse attribute list
    fn parse_attributes(attrs_str: &str) -> Vec<IfcAttribute> {
        let mut attributes = Vec::new();
        let mut current = String::new();
        let mut depth = 0;
        let mut in_string = false;

        for ch in attrs_str.chars() {
            match ch {
                '\'' => {
                    in_string = !in_string;
                    current.push(ch);
                }
                '(' if !in_string => {
                    depth += 1;
                    current.push(ch);
                }
                ')' if !in_string => {
                    depth -= 1;
                    current.push(ch);
                }
                ',' if !in_string && depth == 0 => {
                    attributes.push(Self::parse_single_attribute(current.trim()));
                    current.clear();
                }
                _ => {
                    current.push(ch);
                }
            }
        }

        // Don't forget the last attribute
        if !current.is_empty() {
            attributes.push(Self::parse_single_attribute(current.trim()));
        }

        attributes
    }

    /// Parse a single attribute value
    fn parse_single_attribute(value: &str) -> IfcAttribute {
        let value = value.trim();

        if value == "$" {
            return IfcAttribute::Null;
        }

        if value == "*" {
            return IfcAttribute::Derived;
        }

        if value.starts_with('#') {
            if let Ok(id) = value[1..].parse::<u64>() {
                return IfcAttribute::Reference(id);
            }
        }

        if value.starts_with('\'') && value.ends_with('\'') {
            return IfcAttribute::String(value[1..value.len() - 1].to_string());
        }

        if value.starts_with('.') && value.ends_with('.') {
            return IfcAttribute::Enum(value[1..value.len() - 1].to_string());
        }

        if value.starts_with('(') && value.ends_with(')') {
            let inner = &value[1..value.len() - 1];
            let items = Self::parse_attributes(inner);
            return IfcAttribute::List(items);
        }

        if value == ".T." {
            return IfcAttribute::Boolean(true);
        }

        if value == ".F." {
            return IfcAttribute::Boolean(false);
        }

        // Try parsing as number
        if let Ok(n) = value.parse::<i64>() {
            return IfcAttribute::Integer(n);
        }

        if let Ok(n) = value.parse::<f64>() {
            return IfcAttribute::Real(n);
        }

        // Unknown - return as string
        IfcAttribute::String(value.to_string())
    }

    /// Extract all geometric objects from the IFC file
    pub fn extract_geometry(&self) -> IfcResult<Vec<ImportedObject>> {
        let extractor = GeometryExtractor::new(&self.entities, self.schema);
        extractor.extract_all()
    }

    /// Get the detected schema version
    pub fn schema(&self) -> IfcSchema {
        self.schema
    }

    /// Get all entities of a specific type
    pub fn get_entities_by_type(&self, type_name: &str) -> Vec<&IfcEntity> {
        let upper_type = type_name.to_uppercase();
        self.entities
            .values()
            .filter(|e| e.type_name.to_uppercase() == upper_type)
            .collect()
    }

    /// Get an entity by ID
    pub fn get_entity(&self, id: u64) -> Option<&IfcEntity> {
        self.entities.get(&id)
    }

    /// Get the raw file content
    pub fn content(&self) -> &str {
        &self.content
    }

    /// Import and return result
    pub fn import(&self) -> IfcResult<ImportResult> {
        let objects = self.extract_geometry()?;
        let total_count = objects.len();

        Ok(ImportResult {
            objects,
            total_count,
            warnings: vec![],
            schema: self.schema,
        })
    }
}

impl IfcAttribute {
    /// Get as string if possible
    pub fn as_string(&self) -> Option<&str> {
        match self {
            Self::String(s) => Some(s.as_str()),
            _ => None,
        }
    }

    /// Get as f64 if possible
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Real(n) => Some(*n),
            Self::Integer(n) => Some(*n as f64),
            _ => None,
        }
    }

    /// Get as reference if possible
    pub fn as_reference(&self) -> Option<u64> {
        match self {
            Self::Reference(id) => Some(*id),
            _ => None,
        }
    }

    /// Get as list if possible
    pub fn as_list(&self) -> Option<&Vec<IfcAttribute>> {
        match self {
            Self::List(l) => Some(l),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_entity() {
        let line = "#1=IFCPROJECT('0$WU4A9R19$vKWO$AdOn',#2,'Default Project',$,$,$,$,(#20),#7);";
        let entity = IfcImporter::parse_entity_line(line).unwrap();

        assert_eq!(entity.id, 1);
        assert_eq!(entity.type_name, "IFCPROJECT");
        assert!(!entity.attributes.is_empty());
    }

    #[test]
    fn test_detect_schema() {
        let ifc4_content = "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;";
        let schema = IfcImporter::detect_schema(ifc4_content).unwrap();
        assert_eq!(schema, IfcSchema::Ifc4);

        let ifc4x3_content = "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4X3'));\nENDSEC;";
        let schema = IfcImporter::detect_schema(ifc4x3_content).unwrap();
        assert_eq!(schema, IfcSchema::Ifc4x3);
    }
}
