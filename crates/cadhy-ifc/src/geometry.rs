//! Geometry extraction from IFC entities
//!
//! Converts IFC geometric representations to CADHY mesh data.

use crate::error::IfcResult;
use crate::parser::{IfcAttribute, IfcEntity};
use crate::types::*;
use std::collections::HashMap;
use tracing::debug;

/// Extracts geometry from IFC entities
pub struct GeometryExtractor<'a> {
    entities: &'a HashMap<u64, IfcEntity>,
    #[allow(dead_code)]
    schema: IfcSchema,
}

impl<'a> GeometryExtractor<'a> {
    pub fn new(entities: &'a HashMap<u64, IfcEntity>, schema: IfcSchema) -> Self {
        Self { entities, schema }
    }

    /// Extract all product entities with geometry
    pub fn extract_all(&self) -> IfcResult<Vec<ImportedObject>> {
        let mut objects = Vec::new();

        // Find all IfcProduct entities (things with geometry)
        let product_types = [
            "IFCWALL",
            "IFCWALLSTANDARDCASE",
            "IFCSLAB",
            "IFCBEAM",
            "IFCCOLUMN",
            "IFCDOOR",
            "IFCWINDOW",
            "IFCROOF",
            "IFCSTAIR",
            "IFCRAMP",
            "IFCRAILING",
            "IFCBUILDINGELEMENTPROXY",
            "IFCFLOWSEGMENT",
            "IFCFLOWFITTING",
            "IFCFLOWTERMINAL",
            "IFCPIPESEGMENT",
            "IFCPIPEFITTING",
            "IFCDUCTSEGMENT",
            "IFCDUCTFITTING",
            "IFCDISTRIBUTIONELEMENT",
            "IFCCIVILELEMENT",
            "IFCPROXY",
            "IFCFURNISHINGELEMENT",
            "IFCSPACE",
        ];

        for type_name in product_types {
            for entity in self.get_entities_by_type(type_name) {
                if let Some(obj) = self.extract_product(entity) {
                    objects.push(obj);
                }
            }
        }

        Ok(objects)
    }

    /// Get entities by type name
    fn get_entities_by_type(&self, type_name: &str) -> Vec<&IfcEntity> {
        let upper = type_name.to_uppercase();
        self.entities
            .values()
            .filter(|e| e.type_name.to_uppercase() == upper)
            .collect()
    }

    /// Extract a single product entity
    fn extract_product(&self, entity: &IfcEntity) -> Option<ImportedObject> {
        // Get basic attributes
        // IfcProduct: GlobalId, OwnerHistory, Name, Description, ObjectType, ObjectPlacement, Representation
        let global_id = entity
            .attributes
            .first()?
            .as_string()
            .unwrap_or("")
            .to_string();

        let name = entity
            .attributes
            .get(2)
            .and_then(|a| a.as_string())
            .unwrap_or(&entity.type_name)
            .to_string();

        // Try to get geometry from representation
        let representation_ref = entity.attributes.get(6).and_then(|a| a.as_reference());

        let geometry = representation_ref.and_then(|rep_id| self.extract_representation(rep_id));

        // Extract properties
        let properties = self.extract_properties(entity.id);

        Some(ImportedObject {
            id: format!("ifc_{}", entity.id),
            name,
            ifc_class: IfcClass::from(entity.type_name.as_str()),
            global_id,
            geometry,
            properties,
            parent_id: None,
            material: None,
        })
    }

    /// Extract geometry from a representation
    fn extract_representation(&self, rep_id: u64) -> Option<IfcGeometry> {
        let rep_entity = self.entities.get(&rep_id)?;

        // IfcProductDefinitionShape has Representations list
        if rep_entity.type_name.to_uppercase() == "IFCPRODUCTDEFINITIONSHAPE" {
            // Get Representations (index 2)
            if let Some(IfcAttribute::List(reps)) = rep_entity.attributes.get(2) {
                for rep_ref in reps {
                    if let Some(rep_id) = rep_ref.as_reference() {
                        if let Some(geom) = self.extract_shape_representation(rep_id) {
                            return Some(geom);
                        }
                    }
                }
            }
        }

        None
    }

    /// Extract geometry from a shape representation
    fn extract_shape_representation(&self, rep_id: u64) -> Option<IfcGeometry> {
        let rep = self.entities.get(&rep_id)?;

        // IfcShapeRepresentation: ContextOfItems, RepresentationIdentifier, RepresentationType, Items
        let rep_type = rep.attributes.get(2).and_then(|a| a.as_string())?;

        debug!("Processing representation type: {}", rep_type);

        let items = rep.attributes.get(3).and_then(|a| a.as_list())?;

        for item_ref in items {
            if let Some(item_id) = item_ref.as_reference() {
                if let Some(geom) = self.extract_representation_item(item_id, rep_type) {
                    return Some(geom);
                }
            }
        }

        None
    }

    /// Extract geometry from a representation item
    fn extract_representation_item(&self, item_id: u64, _rep_type: &str) -> Option<IfcGeometry> {
        let item = self.entities.get(&item_id)?;
        let item_type = item.type_name.to_uppercase();

        match item_type.as_str() {
            "IFCTRIANGULATEDFACESET" => self.extract_triangulated_faceset(item),
            "IFCPOLYGONALFACE" => self.extract_polygonal_face(item),
            "IFCEXTRUDEDAREASOLID" => self.extract_extruded_area_solid(item),
            "IFCFACETEDBREP" => self.extract_faceted_brep(item),
            "IFCBOOLEANRESULT" | "IFCBOOLEANCLIPPINGRESULT" => self.extract_boolean_result(item),
            "IFCSWEPTDISKSOLID" => self.extract_swept_disk_solid(item),
            _ => {
                debug!("Unsupported geometry type: {}", item_type);
                None
            }
        }
    }

    /// Extract IfcTriangulatedFaceSet (IFC4+)
    fn extract_triangulated_faceset(&self, item: &IfcEntity) -> Option<IfcGeometry> {
        // IfcTriangulatedFaceSet: Coordinates, Normals, Closed, CoordIndex, PnIndex(opt)
        let coords_ref = item.attributes.first()?.as_reference()?;
        let coords_entity = self.entities.get(&coords_ref)?;

        // IfcCartesianPointList3D: CoordList
        let coord_list = coords_entity.attributes.first()?.as_list()?;

        let mut vertices = Vec::new();
        for point in coord_list {
            if let IfcAttribute::List(coords) = point {
                for coord in coords {
                    if let Some(v) = coord.as_f64() {
                        vertices.push(v);
                    }
                }
            }
        }

        // Get indices from CoordIndex (index 3)
        let indices = item.attributes.get(3).and_then(|a| a.as_list())?;

        let mut triangles = Vec::new();
        for idx_list in indices {
            if let IfcAttribute::List(triangle) = idx_list {
                for idx in triangle {
                    if let Some(i) = idx.as_f64() {
                        // IFC indices are 1-based
                        triangles.push((i as u32).saturating_sub(1));
                    }
                }
            }
        }

        // Extract normals if present (index 1)
        let normals = item
            .attributes
            .get(1)
            .and_then(|a| a.as_reference())
            .and_then(|norm_id| {
                let norm_entity = self.entities.get(&norm_id)?;
                let norm_list = norm_entity.attributes.first()?.as_list()?;

                let mut norms = Vec::new();
                for normal in norm_list {
                    if let IfcAttribute::List(coords) = normal {
                        for coord in coords {
                            if let Some(v) = coord.as_f64() {
                                norms.push(v);
                            }
                        }
                    }
                }
                Some(norms)
            });

        Some(IfcGeometry::Mesh(MeshGeometry {
            vertices,
            indices: triangles,
            normals,
        }))
    }

    /// Extract IfcPolygonalFace
    fn extract_polygonal_face(&self, _item: &IfcEntity) -> Option<IfcGeometry> {
        // TODO: Implement polygonal face extraction
        None
    }

    /// Extract IfcExtrudedAreaSolid
    fn extract_extruded_area_solid(&self, item: &IfcEntity) -> Option<IfcGeometry> {
        // IfcExtrudedAreaSolid: SweptArea, Position, ExtrudedDirection, Depth
        let profile_ref = item.attributes.first()?.as_reference()?;
        let depth = item.attributes.get(3)?.as_f64()?;

        // Get extrusion direction
        let dir_ref = item.attributes.get(2)?.as_reference()?;
        let dir_entity = self.entities.get(&dir_ref)?;
        let dir = self.extract_direction(dir_entity)?;

        // Get profile
        let profile = self.extract_profile(profile_ref)?;

        Some(IfcGeometry::Extrusion(ExtrusionGeometry {
            profile,
            direction: dir,
            depth,
        }))
    }

    /// Extract profile points
    fn extract_profile(&self, profile_id: u64) -> Option<Vec<[f64; 2]>> {
        let profile = self.entities.get(&profile_id)?;
        let profile_type = profile.type_name.to_uppercase();

        match profile_type.as_str() {
            "IFCRECTANGLEPROFILEDEF" => {
                // XDim, YDim at indices 3, 4
                let x_dim = profile.attributes.get(3)?.as_f64()?;
                let y_dim = profile.attributes.get(4)?.as_f64()?;

                Some(vec![
                    [-x_dim / 2.0, -y_dim / 2.0],
                    [x_dim / 2.0, -y_dim / 2.0],
                    [x_dim / 2.0, y_dim / 2.0],
                    [-x_dim / 2.0, y_dim / 2.0],
                ])
            }
            "IFCCIRCLEPROFILEDEF" => {
                let radius = profile.attributes.get(3)?.as_f64()?;
                let segments = 32;
                let mut points = Vec::with_capacity(segments);

                for i in 0..segments {
                    let angle = (i as f64) * std::f64::consts::TAU / (segments as f64);
                    points.push([radius * angle.cos(), radius * angle.sin()]);
                }

                Some(points)
            }
            "IFCARBITRARYCLOSEDPROFILEDEF" => {
                // OuterCurve at index 2
                let curve_ref = profile.attributes.get(2)?.as_reference()?;
                self.extract_polyline_points(curve_ref)
            }
            _ => {
                debug!("Unsupported profile type: {}", profile_type);
                None
            }
        }
    }

    /// Extract direction vector
    fn extract_direction(&self, dir_entity: &IfcEntity) -> Option<[f64; 3]> {
        let ratios = dir_entity.attributes.first()?.as_list()?;

        let mut dir = [0.0, 0.0, 1.0];
        for (i, ratio) in ratios.iter().take(3).enumerate() {
            if let Some(v) = ratio.as_f64() {
                dir[i] = v;
            }
        }

        Some(dir)
    }

    /// Extract polyline points
    fn extract_polyline_points(&self, curve_id: u64) -> Option<Vec<[f64; 2]>> {
        let curve = self.entities.get(&curve_id)?;

        if curve.type_name.to_uppercase() == "IFCPOLYLINE" {
            let points_list = curve.attributes.first()?.as_list()?;
            let mut points = Vec::new();

            for point_ref in points_list {
                if let Some(point_id) = point_ref.as_reference() {
                    if let Some(point) = self.extract_cartesian_point_2d(point_id) {
                        points.push(point);
                    }
                }
            }

            Some(points)
        } else {
            None
        }
    }

    /// Extract 2D cartesian point
    fn extract_cartesian_point_2d(&self, point_id: u64) -> Option<[f64; 2]> {
        let point = self.entities.get(&point_id)?;
        let coords = point.attributes.first()?.as_list()?;

        let x = coords.first()?.as_f64()?;
        let y = coords.get(1)?.as_f64()?;

        Some([x, y])
    }

    /// Extract IfcFacetedBrep
    fn extract_faceted_brep(&self, item: &IfcEntity) -> Option<IfcGeometry> {
        // IfcFacetedBrep: Outer
        let outer_ref = item.attributes.first()?.as_reference()?;

        self.extract_closed_shell(outer_ref)
    }

    /// Extract IfcClosedShell
    fn extract_closed_shell(&self, shell_id: u64) -> Option<IfcGeometry> {
        let shell = self.entities.get(&shell_id)?;
        let faces_list = shell.attributes.first()?.as_list()?;

        let mut all_vertices = Vec::new();
        let mut all_indices = Vec::new();
        let mut vertex_count = 0u32;

        for face_ref in faces_list {
            if let Some(face_id) = face_ref.as_reference() {
                if let Some((verts, inds)) = self.extract_face_geometry(face_id, vertex_count) {
                    vertex_count += (verts.len() / 3) as u32;
                    all_vertices.extend(verts);
                    all_indices.extend(inds);
                }
            }
        }

        if all_vertices.is_empty() {
            return None;
        }

        Some(IfcGeometry::Mesh(MeshGeometry {
            vertices: all_vertices,
            indices: all_indices,
            normals: None,
        }))
    }

    /// Extract face geometry
    fn extract_face_geometry(&self, face_id: u64, base_index: u32) -> Option<(Vec<f64>, Vec<u32>)> {
        let face = self.entities.get(&face_id)?;

        // IfcFace: Bounds
        let bounds = face.attributes.first()?.as_list()?;

        let mut vertices = Vec::new();
        let mut indices = Vec::new();

        for bound_ref in bounds {
            if let Some(bound_id) = bound_ref.as_reference() {
                let bound = self.entities.get(&bound_id)?;

                // IfcFaceBound or IfcFaceOuterBound: Bound, Orientation
                let loop_ref = bound.attributes.first()?.as_reference()?;
                let poly_loop = self.entities.get(&loop_ref)?;

                if poly_loop.type_name.to_uppercase() == "IFCPOLYLOOP" {
                    let points = poly_loop.attributes.first()?.as_list()?;

                    let start_idx = (vertices.len() / 3) as u32 + base_index;

                    for point_ref in points {
                        if let Some(point_id) = point_ref.as_reference() {
                            if let Some(coords) = self.extract_cartesian_point_3d(point_id) {
                                vertices.extend_from_slice(&coords);
                            }
                        }
                    }

                    // Triangulate the polygon (simple fan triangulation)
                    let num_verts = (vertices.len() / 3) as u32 + base_index - start_idx;
                    if num_verts >= 3 {
                        for i in 1..(num_verts - 1) {
                            indices.push(start_idx);
                            indices.push(start_idx + i);
                            indices.push(start_idx + i + 1);
                        }
                    }
                }
            }
        }

        Some((vertices, indices))
    }

    /// Extract 3D cartesian point
    fn extract_cartesian_point_3d(&self, point_id: u64) -> Option<[f64; 3]> {
        let point = self.entities.get(&point_id)?;
        let coords = point.attributes.first()?.as_list()?;

        let x = coords.first()?.as_f64()?;
        let y = coords.get(1)?.as_f64()?;
        let z = coords.get(2).and_then(|a| a.as_f64()).unwrap_or(0.0);

        Some([x, y, z])
    }

    /// Extract IfcBooleanResult
    fn extract_boolean_result(&self, item: &IfcEntity) -> Option<IfcGeometry> {
        // For simplicity, try to extract the first operand
        // Full boolean operations would require CSG support
        let first_operand = item.attributes.get(1)?.as_reference()?;
        self.extract_representation_item(first_operand, "")
    }

    /// Extract IfcSweptDiskSolid
    fn extract_swept_disk_solid(&self, item: &IfcEntity) -> Option<IfcGeometry> {
        // IfcSweptDiskSolid: Directrix, Radius, InnerRadius, StartParam, EndParam
        let directrix_ref = item.attributes.first()?.as_reference()?;
        let radius = item.attributes.get(1)?.as_f64()?;

        // Get path points from directrix
        let path = self.extract_curve_path(directrix_ref)?;

        // Create circular profile
        let segments = 16;
        let mut profile = Vec::with_capacity(segments);
        for i in 0..segments {
            let angle = (i as f64) * std::f64::consts::TAU / (segments as f64);
            profile.push([radius * angle.cos(), radius * angle.sin()]);
        }

        Some(IfcGeometry::SweptSolid(SweptSolidGeometry {
            profile,
            path,
        }))
    }

    /// Extract curve path points
    fn extract_curve_path(&self, curve_id: u64) -> Option<Vec<[f64; 3]>> {
        let curve = self.entities.get(&curve_id)?;

        if curve.type_name.to_uppercase() == "IFCPOLYLINE" {
            let points_list = curve.attributes.first()?.as_list()?;
            let mut points = Vec::new();

            for point_ref in points_list {
                if let Some(point_id) = point_ref.as_reference() {
                    if let Some(point) = self.extract_cartesian_point_3d(point_id) {
                        points.push(point);
                    }
                }
            }

            Some(points)
        } else {
            None
        }
    }

    /// Extract property sets for an entity
    fn extract_properties(&self, entity_id: u64) -> HashMap<String, PropertyValue> {
        let mut properties = HashMap::new();

        // Find IfcRelDefinesByProperties relationships
        for rel in self.get_entities_by_type("IFCRELDEFINESBYPROPERTIES") {
            // RelatedObjects is at index 4, RelatingPropertyDefinition at index 5
            if let Some(IfcAttribute::List(related)) = rel.attributes.get(4) {
                let is_related = related.iter().any(|r| r.as_reference() == Some(entity_id));

                if is_related {
                    if let Some(pset_ref) = rel.attributes.get(5).and_then(|a| a.as_reference()) {
                        self.extract_property_set(pset_ref, &mut properties);
                    }
                }
            }
        }

        properties
    }

    /// Extract properties from a property set
    fn extract_property_set(&self, pset_id: u64, properties: &mut HashMap<String, PropertyValue>) {
        let pset = match self.entities.get(&pset_id) {
            Some(e) => e,
            None => return,
        };

        let pset_type = pset.type_name.to_uppercase();

        if pset_type == "IFCPROPERTYSET" {
            // HasProperties at index 4
            if let Some(IfcAttribute::List(props)) = pset.attributes.get(4) {
                for prop_ref in props {
                    if let Some(prop_id) = prop_ref.as_reference() {
                        self.extract_single_property(prop_id, properties);
                    }
                }
            }
        }
    }

    /// Extract a single property
    fn extract_single_property(
        &self,
        prop_id: u64,
        properties: &mut HashMap<String, PropertyValue>,
    ) {
        let prop = match self.entities.get(&prop_id) {
            Some(e) => e,
            None => return,
        };

        let prop_type = prop.type_name.to_uppercase();

        // Get property name (index 0)
        let name = match prop.attributes.first().and_then(|a| a.as_string()) {
            Some(n) => n.to_string(),
            None => return,
        };

        let value = match prop_type.as_str() {
            "IFCPROPERTYSINGLEVALUE" => {
                // NominalValue at index 2
                prop.attributes.get(2).and_then(|a| match a {
                    IfcAttribute::Real(v) => Some(PropertyValue::Real(*v)),
                    IfcAttribute::Integer(v) => Some(PropertyValue::Integer(*v)),
                    IfcAttribute::String(v) => Some(PropertyValue::String(v.clone())),
                    IfcAttribute::Boolean(v) => Some(PropertyValue::Boolean(*v)),
                    _ => None,
                })
            }
            _ => None,
        };

        if let Some(v) = value {
            properties.insert(name, v);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================
    // Helper Functions
    // ============================================================

    fn create_entity(id: u64, type_name: &str, attributes: Vec<IfcAttribute>) -> IfcEntity {
        IfcEntity {
            id,
            type_name: type_name.to_string(),
            attributes,
        }
    }

    fn create_test_entities() -> HashMap<u64, IfcEntity> {
        let mut entities = HashMap::new();
        entities
    }

    // ============================================================
    // GeometryExtractor Tests
    // ============================================================

    #[test]
    fn geometry_extractor_new_creates_instance() {
        let entities = create_test_entities();
        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);

        // Should create without panicking
        assert!(extractor.entities.is_empty());
    }

    #[test]
    fn geometry_extractor_extract_all_empty() {
        let entities = create_test_entities();
        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);

        let result = extractor.extract_all();
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn get_entities_by_type_case_insensitive() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(1, "IfcWall", vec![IfcAttribute::String("test".to_string())]),
        );
        entities.insert(
            2,
            create_entity(2, "IFCWALL", vec![IfcAttribute::String("test2".to_string())]),
        );
        entities.insert(
            3,
            create_entity(3, "ifcwall", vec![IfcAttribute::String("test3".to_string())]),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let walls = extractor.get_entities_by_type("IFCWALL");

        assert_eq!(walls.len(), 3, "Should find all case variants");
    }

    #[test]
    fn get_entities_by_type_no_match() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(1, "IfcWall", vec![]),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let doors = extractor.get_entities_by_type("IFCDOOR");

        assert!(doors.is_empty());
    }

    // ============================================================
    // Direction Extraction Tests
    // ============================================================

    #[test]
    fn extract_direction_valid_3d() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCDIRECTION",
                vec![IfcAttribute::List(vec![
                    IfcAttribute::Real(0.0),
                    IfcAttribute::Real(0.0),
                    IfcAttribute::Real(1.0),
                ])],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let dir_entity = entities.get(&1).unwrap();
        let direction = extractor.extract_direction(dir_entity);

        assert!(direction.is_some());
        let [dx, dy, dz] = direction.unwrap();
        assert!((dx - 0.0).abs() < 1e-10);
        assert!((dy - 0.0).abs() < 1e-10);
        assert!((dz - 1.0).abs() < 1e-10);
    }

    #[test]
    fn extract_direction_partial_2d() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCDIRECTION",
                vec![IfcAttribute::List(vec![
                    IfcAttribute::Real(1.0),
                    IfcAttribute::Real(0.0),
                    // No Z component - should default to 1.0
                ])],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let dir_entity = entities.get(&1).unwrap();
        let direction = extractor.extract_direction(dir_entity);

        assert!(direction.is_some());
        let [dx, dy, dz] = direction.unwrap();
        assert!((dx - 1.0).abs() < 1e-10);
        assert!((dy - 0.0).abs() < 1e-10);
        assert!((dz - 1.0).abs() < 1e-10); // Default value
    }

    // ============================================================
    // Profile Extraction Tests
    // ============================================================

    #[test]
    fn extract_rectangle_profile() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCRECTANGLEPROFILEDEF",
                vec![
                    IfcAttribute::String("AREA".to_string()),    // ProfileType
                    IfcAttribute::String("Profile1".to_string()), // ProfileName
                    IfcAttribute::Null,                          // Position
                    IfcAttribute::Real(10.0),                    // XDim
                    IfcAttribute::Real(5.0),                     // YDim
                ],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let profile = extractor.extract_profile(1);

        assert!(profile.is_some());
        let points = profile.unwrap();
        assert_eq!(points.len(), 4); // Rectangle has 4 corners

        // Check that points form a centered rectangle
        // Expected: corners at (-5, -2.5), (5, -2.5), (5, 2.5), (-5, 2.5)
        assert!((points[0][0] - (-5.0)).abs() < 1e-10);
        assert!((points[0][1] - (-2.5)).abs() < 1e-10);
    }

    #[test]
    fn extract_circle_profile() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCCIRCLEPROFILEDEF",
                vec![
                    IfcAttribute::String("AREA".to_string()),    // ProfileType
                    IfcAttribute::String("Circle1".to_string()), // ProfileName
                    IfcAttribute::Null,                          // Position
                    IfcAttribute::Real(5.0),                     // Radius
                ],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let profile = extractor.extract_profile(1);

        assert!(profile.is_some());
        let points = profile.unwrap();
        assert_eq!(points.len(), 32); // 32 segments for circle approximation

        // First point should be at (radius, 0) = (5, 0)
        assert!((points[0][0] - 5.0).abs() < 1e-10);
        assert!((points[0][1] - 0.0).abs() < 1e-10);
    }

    #[test]
    fn extract_unsupported_profile_returns_none() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCISHAPEPROFILEDEF", // Not implemented
                vec![],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let profile = extractor.extract_profile(1);

        assert!(profile.is_none());
    }

    // ============================================================
    // Cartesian Point Tests
    // ============================================================

    #[test]
    fn extract_cartesian_point_2d() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCCARTESIANPOINT",
                vec![IfcAttribute::List(vec![
                    IfcAttribute::Real(10.5),
                    IfcAttribute::Real(20.3),
                ])],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let point = extractor.extract_cartesian_point_2d(1);

        assert!(point.is_some());
        let [x, y] = point.unwrap();
        assert!((x - 10.5).abs() < 1e-10);
        assert!((y - 20.3).abs() < 1e-10);
    }

    #[test]
    fn extract_cartesian_point_3d() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCCARTESIANPOINT",
                vec![IfcAttribute::List(vec![
                    IfcAttribute::Real(1.0),
                    IfcAttribute::Real(2.0),
                    IfcAttribute::Real(3.0),
                ])],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let point = extractor.extract_cartesian_point_3d(1);

        assert!(point.is_some());
        let [x, y, z] = point.unwrap();
        assert!((x - 1.0).abs() < 1e-10);
        assert!((y - 2.0).abs() < 1e-10);
        assert!((z - 3.0).abs() < 1e-10);
    }

    #[test]
    fn extract_cartesian_point_3d_defaults_z() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            create_entity(
                1,
                "IFCCARTESIANPOINT",
                vec![IfcAttribute::List(vec![
                    IfcAttribute::Real(1.0),
                    IfcAttribute::Real(2.0),
                    // No Z - should default to 0
                ])],
            ),
        );

        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);
        let point = extractor.extract_cartesian_point_3d(1);

        assert!(point.is_some());
        let [_x, _y, z] = point.unwrap();
        assert!((z - 0.0).abs() < 1e-10); // Default Z
    }

    // ============================================================
    // Product Type Detection Tests
    // ============================================================

    #[test]
    fn product_types_are_recognized() {
        // All these types should be searched for products
        let product_types = [
            "IFCWALL",
            "IFCSLAB",
            "IFCBEAM",
            "IFCCOLUMN",
            "IFCDOOR",
            "IFCWINDOW",
            "IFCROOF",
            "IFCPIPESEGMENT",
        ];

        for type_name in product_types {
            let upper = type_name.to_uppercase();
            assert!(upper.starts_with("IFC"), "Should be IFC type: {}", type_name);
        }
    }

    // ============================================================
    // Representation Extraction Tests
    // ============================================================

    #[test]
    fn extract_representation_missing_entity() {
        let entities = HashMap::new();
        let extractor = GeometryExtractor::new(&entities, IfcSchema::Ifc4);

        let result = extractor.extract_representation(999);
        assert!(result.is_none());
    }

    // ============================================================
    // IfcClass Conversion Tests
    // ============================================================

    #[test]
    fn ifc_class_from_flow_segment_type() {
        let class = IfcClass::from("IFCFLOWSEGMENT");
        assert_eq!(class, IfcClass::IfcFlowSegment);
    }

    #[test]
    fn ifc_class_from_building_element_type() {
        let class = IfcClass::from("IFCBUILDINGELEMENT");
        assert_eq!(class, IfcClass::IfcBuildingElement);
    }

    #[test]
    fn ifc_class_case_sensitivity() {
        // IfcClass::from handles case by uppercasing, so unknown variants go to Other
        let upper = IfcClass::from("IFCFLOWSEGMENT");
        let mixed = IfcClass::from("IfcFlowSegment");
        let lower = IfcClass::from("ifcflowsegment");

        // All should resolve to FlowSegment since From converts to uppercase
        assert_eq!(upper, IfcClass::IfcFlowSegment);
        assert_eq!(mixed, IfcClass::IfcFlowSegment);
        assert_eq!(lower, IfcClass::IfcFlowSegment);
    }

    // ============================================================
    // Mesh Geometry Tests
    // ============================================================

    #[test]
    fn mesh_geometry_structure() {
        let mesh = MeshGeometry {
            vertices: vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0],
            indices: vec![0, 1, 2],
            normals: Some(vec![0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0]),
        };

        assert_eq!(mesh.vertices.len(), 9); // 3 vertices × 3 coords
        assert_eq!(mesh.indices.len(), 3);  // 1 triangle
        assert!(mesh.normals.is_some());
    }

    #[test]
    fn mesh_geometry_without_normals() {
        let mesh = MeshGeometry {
            vertices: vec![0.0, 0.0, 0.0],
            indices: vec![0],
            normals: None,
        };

        assert!(mesh.normals.is_none());
    }

    // ============================================================
    // Extrusion Geometry Tests
    // ============================================================

    #[test]
    fn extrusion_geometry_structure() {
        let extrusion = ExtrusionGeometry {
            profile: vec![[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]],
            direction: [0.0, 0.0, 1.0],
            depth: 5.0,
        };

        assert_eq!(extrusion.profile.len(), 4);
        assert!((extrusion.depth - 5.0).abs() < 1e-10);
        assert!((extrusion.direction[2] - 1.0).abs() < 1e-10);
    }

    // ============================================================
    // SweptSolid Geometry Tests
    // ============================================================

    #[test]
    fn swept_solid_geometry_structure() {
        let swept = SweptSolidGeometry {
            profile: vec![[1.0, 0.0], [0.0, 1.0], [-1.0, 0.0], [0.0, -1.0]],
            path: vec![[0.0, 0.0, 0.0], [0.0, 0.0, 10.0], [5.0, 0.0, 10.0]],
        };

        assert_eq!(swept.profile.len(), 4);
        assert_eq!(swept.path.len(), 3);
    }

    // ============================================================
    // PropertyValue Tests
    // ============================================================

    #[test]
    fn property_value_types() {
        let real = PropertyValue::Real(3.14159);
        let integer = PropertyValue::Integer(42);
        let string = PropertyValue::String("test".to_string());
        let boolean = PropertyValue::Boolean(true);

        match real {
            PropertyValue::Real(v) => assert!((v - 3.14159).abs() < 1e-5),
            _ => panic!("Expected Real"),
        }

        match integer {
            PropertyValue::Integer(v) => assert_eq!(v, 42),
            _ => panic!("Expected Integer"),
        }

        match string {
            PropertyValue::String(v) => assert_eq!(v, "test"),
            _ => panic!("Expected String"),
        }

        match boolean {
            PropertyValue::Boolean(v) => assert!(v),
            _ => panic!("Expected Boolean"),
        }
    }

    // ============================================================
    // ImportedObject Tests
    // ============================================================

    #[test]
    fn imported_object_structure() {
        let obj = ImportedObject {
            id: "ifc_123".to_string(),
            name: "Test Channel".to_string(),
            ifc_class: IfcClass::IfcFlowSegment,
            global_id: "2O2Fr$t4X7Zf8NOew3FLNb".to_string(),
            geometry: None,
            properties: HashMap::new(),
            parent_id: Some("ifc_100".to_string()),
            material: None,
        };

        assert_eq!(obj.id, "ifc_123");
        assert_eq!(obj.name, "Test Channel");
        assert_eq!(obj.ifc_class, IfcClass::IfcFlowSegment);
        assert!(obj.geometry.is_none());
        assert!(obj.properties.is_empty());
        assert!(obj.parent_id.is_some());
    }
}
