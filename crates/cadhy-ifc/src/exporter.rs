//! IFC file exporter
//!
//! Exports CADHY geometry to IFC format with hydraulic properties.

use crate::error::{IfcError, IfcResult};
use crate::types::*;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;
use tracing::info;
use uuid::Uuid;

/// IFC file exporter
pub struct IfcExporter {
    /// Export options
    options: ExportOptions,
    /// Entity counter for unique IDs
    next_id: u64,
    /// Stored entities
    entities: Vec<String>,
    /// Shape ID mapping (internal ID -> IFC entity ID)
    shape_map: HashMap<String, u64>,
}

impl IfcExporter {
    /// Create a new exporter with default options
    pub fn new(project_name: &str) -> Self {
        Self {
            options: ExportOptions {
                project_name: project_name.to_string(),
                ..Default::default()
            },
            next_id: 1,
            entities: Vec::new(),
            shape_map: HashMap::new(),
        }
    }

    /// Create a new exporter with custom options
    pub fn with_options(options: ExportOptions) -> Self {
        Self {
            options,
            next_id: 1,
            entities: Vec::new(),
            shape_map: HashMap::new(),
        }
    }

    /// Get next entity ID
    fn get_next_id(&mut self) -> u64 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }

    /// Generate a new GlobalId (IFC GUID format)
    fn new_global_id() -> String {
        // IFC uses a compressed 22-character base64 representation
        // For simplicity, we use a UUID-based approach
        let uuid = Uuid::new_v4();
        let bytes = uuid.as_bytes();

        // IFC base64 character set
        const CHARS: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";

        let mut result = String::with_capacity(22);

        // Convert 16 bytes to 22 base64 characters
        let mut num = 0u128;
        for byte in bytes {
            num = (num << 8) | (*byte as u128);
        }

        for _ in 0..22 {
            result.push(CHARS[(num % 64) as usize] as char);
            num /= 64;
        }

        result
    }

    /// Add standard header entities
    fn add_header_entities(&mut self) {
        // IfcPerson
        let person_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCPERSON($,$,'{}',$,$,$,$,$);",
            person_id,
            self.options.author.as_deref().unwrap_or("CADHY User")
        ));

        // IfcOrganization
        let org_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCORGANIZATION($,'{}',$,$,$);",
            org_id,
            self.options.organization.as_deref().unwrap_or("CADHY")
        ));

        // IfcPersonAndOrganization
        let person_org_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCPERSONANDORGANIZATION(#{},#{},$);",
            person_org_id, person_id, org_id
        ));

        // IfcApplication
        let app_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCAPPLICATION(#{},'1.0','CADHY','CADHY');",
            app_id, org_id
        ));

        // IfcOwnerHistory
        let owner_history_id = self.get_next_id();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        self.entities.push(format!(
            "#{}=IFCOWNERHISTORY(#{},#{},$,.NOCHANGE.,$,$,$,{});",
            owner_history_id, person_org_id, app_id, timestamp
        ));

        // Store owner history ID for later use
        self.shape_map
            .insert("owner_history".to_string(), owner_history_id);

        // IfcSIUnit - Length (meters)
        let unit_length_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);",
            unit_length_id
        ));

        // IfcSIUnit - Area (square meters)
        let unit_area_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);",
            unit_area_id
        ));

        // IfcSIUnit - Volume (cubic meters)
        let unit_volume_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);",
            unit_volume_id
        ));

        // IfcSIUnit - Plane angle (radians)
        let unit_angle_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);",
            unit_angle_id
        ));

        // IfcUnitAssignment
        let units_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCUNITASSIGNMENT((#{},#{},#{},#{}));",
            units_id, unit_length_id, unit_area_id, unit_volume_id, unit_angle_id
        ));
        self.shape_map.insert("units".to_string(), units_id);

        // World coordinate system
        let origin_id = self.get_next_id();
        self.entities
            .push(format!("#{}=IFCCARTESIANPOINT((0.,0.,0.));", origin_id));

        let axis_z_id = self.get_next_id();
        self.entities
            .push(format!("#{}=IFCDIRECTION((0.,0.,1.));", axis_z_id));

        let axis_x_id = self.get_next_id();
        self.entities
            .push(format!("#{}=IFCDIRECTION((1.,0.,0.));", axis_x_id));

        let wcs_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCAXIS2PLACEMENT3D(#{},#{},#{});",
            wcs_id, origin_id, axis_z_id, axis_x_id
        ));
        self.shape_map.insert("wcs".to_string(), wcs_id);

        // Geometric representation context
        let context_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#{},$);",
            context_id, wcs_id
        ));
        self.shape_map.insert("context".to_string(), context_id);

        // Sub-context for body geometry
        let body_context_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#{},$,.MODEL_VIEW.,$);",
            body_context_id, context_id
        ));
        self.shape_map
            .insert("body_context".to_string(), body_context_id);
    }

    /// Add project structure
    fn add_project_structure(&mut self) -> u64 {
        let owner_history_id = *self.shape_map.get("owner_history").unwrap();
        let units_id = *self.shape_map.get("units").unwrap();
        let context_id = *self.shape_map.get("context").unwrap();

        // IfcProject
        let project_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCPROJECT('{}',#{},'{}','{}',$,$,$,(#{}),#{});",
            project_id,
            Self::new_global_id(),
            owner_history_id,
            self.options.project_name,
            self.options
                .description
                .as_deref()
                .unwrap_or("CADHY Export"),
            context_id,
            units_id
        ));

        // IfcSite
        let site_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCSITE('{}',#{},'Default Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);",
            site_id,
            Self::new_global_id(),
            owner_history_id
        ));

        // IfcRelAggregates - Project contains Site
        let rel_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCRELAGGREGATES('{}',#{},$,$,#{},(#{}));",
            rel_id,
            Self::new_global_id(),
            owner_history_id,
            project_id,
            site_id
        ));

        self.shape_map.insert("project".to_string(), project_id);
        self.shape_map.insert("site".to_string(), site_id);

        site_id
    }

    /// Add a hydraulic channel
    pub fn add_hydraulic_channel(
        &mut self,
        name: &str,
        mesh: &MeshGeometry,
        properties: &HydraulicProperties,
    ) -> IfcResult<u64> {
        let owner_history_id = *self.shape_map.get("owner_history").unwrap();
        let body_context_id = *self.shape_map.get("body_context").unwrap();
        let site_id = *self.shape_map.get("site").unwrap();

        // Create geometry
        let geom_id = self.add_triangulated_mesh(mesh)?;

        // Shape representation
        let shape_rep_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCSHAPEREPRESENTATION(#{},'Body','Tessellation',(#{}));",
            shape_rep_id, body_context_id, geom_id
        ));

        // Product definition shape
        let prod_shape_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCPRODUCTDEFINITIONSHAPE($,$,(#{}));",
            prod_shape_id, shape_rep_id
        ));

        // IfcFlowSegment (representing hydraulic channel)
        let channel_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCFLOWSEGMENT('{}',#{},'{}','{}',$,$,#{},$,$);",
            channel_id,
            Self::new_global_id(),
            owner_history_id,
            name,
            "Hydraulic Channel",
            prod_shape_id
        ));

        // Add to site
        let rel_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCRELCONTAINEDINSPATIALSTRUCTURE('{}',#{},$,$,(#{}),#{});",
            rel_id,
            Self::new_global_id(),
            owner_history_id,
            channel_id,
            site_id
        ));

        // Add hydraulic properties if enabled
        if self.options.include_hydraulics {
            self.add_hydraulic_property_set(channel_id, properties)?;
        }

        Ok(channel_id)
    }

    /// Add triangulated mesh geometry
    fn add_triangulated_mesh(&mut self, mesh: &MeshGeometry) -> IfcResult<u64> {
        // IfcCartesianPointList3D
        let points_id = self.get_next_id();
        let mut coords_str = String::new();

        for chunk in mesh.vertices.chunks(3) {
            if !coords_str.is_empty() {
                coords_str.push(',');
            }
            coords_str.push_str(&format!(
                "({},{},{})",
                chunk.first().unwrap_or(&0.0),
                chunk.get(1).unwrap_or(&0.0),
                chunk.get(2).unwrap_or(&0.0)
            ));
        }

        self.entities.push(format!(
            "#{}=IFCCARTESIANPOINTLIST3D(({}));",
            points_id, coords_str
        ));

        // IfcTriangulatedFaceSet
        let faceset_id = self.get_next_id();
        let mut indices_str = String::new();

        for chunk in mesh.indices.chunks(3) {
            if !indices_str.is_empty() {
                indices_str.push(',');
            }
            // IFC uses 1-based indices
            indices_str.push_str(&format!(
                "({},{},{})",
                chunk.first().unwrap_or(&0) + 1,
                chunk.get(1).unwrap_or(&0) + 1,
                chunk.get(2).unwrap_or(&0) + 1
            ));
        }

        self.entities.push(format!(
            "#{}=IFCTRIANGULATEDFACESET(#{},$,.T.,({}),());",
            faceset_id, points_id, indices_str
        ));

        Ok(faceset_id)
    }

    /// Add hydraulic property set
    fn add_hydraulic_property_set(
        &mut self,
        element_id: u64,
        props: &HydraulicProperties,
    ) -> IfcResult<u64> {
        let owner_history_id = *self.shape_map.get("owner_history").unwrap();

        let mut property_ids = Vec::new();

        // Add each property
        if let Some(v) = props.manning_n {
            property_ids.push(self.add_property_single_value("ManningN", v, "IFCREAL"));
        }
        if let Some(v) = props.slope {
            property_ids.push(self.add_property_single_value("Slope", v, "IFCREAL"));
        }
        if let Some(v) = props.design_flow {
            property_ids.push(self.add_property_single_value(
                "DesignFlow",
                v,
                "IFCVOLUMETRICFLOWRATEMEASURE",
            ));
        }
        if let Some(v) = props.normal_depth {
            property_ids.push(self.add_property_single_value("NormalDepth", v, "IFCLENGTHMEASURE"));
        }
        if let Some(v) = props.critical_depth {
            property_ids.push(self.add_property_single_value(
                "CriticalDepth",
                v,
                "IFCLENGTHMEASURE",
            ));
        }
        if let Some(v) = props.froude_number {
            property_ids.push(self.add_property_single_value("FroudeNumber", v, "IFCREAL"));
        }
        if let Some(v) = props.width {
            property_ids.push(self.add_property_single_value("Width", v, "IFCLENGTHMEASURE"));
        }
        if let Some(v) = props.depth {
            property_ids.push(self.add_property_single_value("Depth", v, "IFCLENGTHMEASURE"));
        }
        if let Some(v) = props.side_slope {
            property_ids.push(self.add_property_single_value("SideSlope", v, "IFCREAL"));
        }
        if let Some(v) = props.thickness {
            property_ids.push(self.add_property_single_value("Thickness", v, "IFCLENGTHMEASURE"));
        }

        if property_ids.is_empty() {
            return Ok(0);
        }

        // IfcPropertySet
        let pset_id = self.get_next_id();
        let props_str = property_ids
            .iter()
            .map(|id| format!("#{}", id))
            .collect::<Vec<_>>()
            .join(",");

        self.entities.push(format!(
            "#{}=IFCPROPERTYSET('{}',#{},'Pset_HydraulicChannelCommon',$,({}));",
            pset_id,
            Self::new_global_id(),
            owner_history_id,
            props_str
        ));

        // IfcRelDefinesByProperties
        let rel_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCRELDEFINESBYPROPERTIES('{}',#{},$,$,(#{}),#{});",
            rel_id,
            Self::new_global_id(),
            owner_history_id,
            element_id,
            pset_id
        ));

        Ok(pset_id)
    }

    /// Add a single-value property
    fn add_property_single_value(&mut self, name: &str, value: f64, type_name: &str) -> u64 {
        let prop_id = self.get_next_id();
        self.entities.push(format!(
            "#{}=IFCPROPERTYSINGLEVALUE('{}',$,{}({}),$);",
            prop_id, name, type_name, value
        ));
        prop_id
    }

    /// Write the IFC file to disk
    pub fn write_to_file<P: AsRef<Path>>(&mut self, path: P) -> IfcResult<()> {
        // Initialize if not done
        if self.entities.is_empty() {
            self.add_header_entities();
            self.add_project_structure();
        }

        let file = File::create(path.as_ref()).map_err(|e| {
            IfcError::WriteError(format!(
                "Failed to create file '{}': {}",
                path.as_ref().display(),
                e
            ))
        })?;

        let mut writer = BufWriter::new(file);

        // Write ISO header
        writeln!(writer, "ISO-10303-21;")?;

        // Write HEADER section
        writeln!(writer, "HEADER;")?;
        writeln!(
            writer,
            "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');"
        )?;
        writeln!(
            writer,
            "FILE_NAME('{}','{}',('{}'),('{}'),'CADHY','CADHY','');",
            path.as_ref().display(),
            chrono_lite::Datetime::now().format("%Y-%m-%dT%H:%M:%S"),
            self.options.author.as_deref().unwrap_or(""),
            self.options.organization.as_deref().unwrap_or("")
        )?;
        writeln!(writer, "FILE_SCHEMA(('{}'));", self.options.schema)?;
        writeln!(writer, "ENDSEC;")?;

        // Write DATA section
        writeln!(writer, "DATA;")?;
        for entity in &self.entities {
            writeln!(writer, "{}", entity)?;
        }
        writeln!(writer, "ENDSEC;")?;

        // Write footer
        writeln!(writer, "END-ISO-10303-21;")?;

        writer.flush()?;

        info!("Wrote IFC file: {}", path.as_ref().display());

        Ok(())
    }
}

/// Simple datetime formatting (no chrono dependency)
mod chrono_lite {
    use std::time::SystemTime;

    pub struct Datetime {
        year: u32,
        month: u32,
        day: u32,
        hour: u32,
        minute: u32,
        second: u32,
    }

    impl Datetime {
        pub fn now() -> Self {
            let secs = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Simplified calculation (not accounting for leap years properly)
            let days = secs / 86400;
            let time_of_day = secs % 86400;

            let hour = (time_of_day / 3600) as u32;
            let minute = ((time_of_day % 3600) / 60) as u32;
            let second = (time_of_day % 60) as u32;

            // Approximate year/month/day (simplified)
            let years = days / 365;
            let year = 1970 + years as u32;
            let day_of_year = days % 365;

            let (month, day) = if day_of_year < 31 {
                (1, day_of_year + 1)
            } else if day_of_year < 59 {
                (2, day_of_year - 30)
            } else if day_of_year < 90 {
                (3, day_of_year - 58)
            } else if day_of_year < 120 {
                (4, day_of_year - 89)
            } else if day_of_year < 151 {
                (5, day_of_year - 119)
            } else if day_of_year < 181 {
                (6, day_of_year - 150)
            } else if day_of_year < 212 {
                (7, day_of_year - 180)
            } else if day_of_year < 243 {
                (8, day_of_year - 211)
            } else if day_of_year < 273 {
                (9, day_of_year - 242)
            } else if day_of_year < 304 {
                (10, day_of_year - 272)
            } else if day_of_year < 334 {
                (11, day_of_year - 303)
            } else {
                (12, day_of_year - 333)
            };

            Self {
                year,
                month: month as u32,
                day: day as u32,
                hour,
                minute,
                second,
            }
        }

        pub fn format(&self, _fmt: &str) -> String {
            format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}",
                self.year, self.month, self.day, self.hour, self.minute, self.second
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_global_id_generation() {
        let id1 = IfcExporter::new_global_id();
        let id2 = IfcExporter::new_global_id();

        assert_eq!(id1.len(), 22);
        assert_eq!(id2.len(), 22);
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_exporter_creation() {
        let exporter = IfcExporter::new("Test Project");
        assert_eq!(exporter.options.project_name, "Test Project");
    }
}
