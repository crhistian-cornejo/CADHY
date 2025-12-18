//! Integration tests for cadhy-cad FFI

use cadhy_cad::Primitives;

#[test]
fn test_box_creation() {
    println!("Starting box creation test...");
    println!("Calling Primitives::make_box(10.0, 20.0, 30.0)");

    let result = Primitives::make_box(10.0, 20.0, 30.0);

    match &result {
        Ok(_) => println!("Box created successfully!"),
        Err(e) => println!("Box creation failed with error: {:?}", e),
    }

    assert!(result.is_ok(), "Failed to create box: {:?}", result.err());
    let shape = result.unwrap();
    println!("Box shape obtained!");

    // Tessellate to verify shape is valid
    let mesh = shape.tessellate(0.1);
    assert!(mesh.is_ok(), "Failed to tessellate box: {:?}", mesh.err());
    let mesh_data = mesh.unwrap();
    println!(
        "Box tessellated: {} vertices, {} indices",
        mesh_data.vertices.len(),
        mesh_data.indices.len()
    );
    assert!(!mesh_data.vertices.is_empty(), "Box should have vertices");
    assert!(!mesh_data.indices.is_empty(), "Box should have indices");
}

#[test]
fn test_cylinder_creation() {
    let result = Primitives::make_cylinder(5.0, 10.0);
    assert!(
        result.is_ok(),
        "Failed to create cylinder: {:?}",
        result.err()
    );
    let shape = result.unwrap();
    let mesh = shape.tessellate(0.1);
    assert!(mesh.is_ok(), "Failed to tessellate cylinder");
}

#[test]
fn test_sphere_creation() {
    let result = Primitives::make_sphere(5.0);
    assert!(
        result.is_ok(),
        "Failed to create sphere: {:?}",
        result.err()
    );
}

#[test]
fn test_cone_creation() {
    let result = Primitives::make_cone(5.0, 2.0, 10.0);
    assert!(result.is_ok(), "Failed to create cone: {:?}", result.err());
}

#[test]
fn test_box_at_creation() {
    // This is the function used by the engine
    let result = Primitives::make_box_at(0.0, 0.0, 0.0, 10.0, 10.0, 10.0);
    assert!(
        result.is_ok(),
        "Failed to create box_at: {:?}",
        result.err()
    );
    let shape = result.unwrap();
    let mesh = shape.tessellate(0.1);
    assert!(
        mesh.is_ok(),
        "Failed to tessellate box_at: {:?}",
        mesh.err()
    );
}

#[test]
fn test_rectangular_channel_geometry() {
    use cadhy_cad::Operations;

    // This tests the geometry operations used by handle_rectangular_channel
    // in cadhy-hydraulics
    let inner_width = 1.0;
    let inner_depth = 1.0;
    let wall = 0.15;
    let floor = 0.2;
    let length = 5.0;

    let outer_width = inner_width + 2.0 * wall;
    let outer_depth = inner_depth + floor;

    // Create OUTER box (solid concrete block)
    let outer_box = Primitives::make_box(outer_width, outer_depth, length);
    assert!(
        outer_box.is_ok(),
        "Failed to create outer box: {:?}",
        outer_box.err()
    );
    let outer_box = outer_box.unwrap();

    // Move outer box to center on X axis
    let outer_box = Operations::translate(&outer_box, -outer_width / 2.0, -floor, 0.0);
    assert!(
        outer_box.is_ok(),
        "Failed to translate outer box: {:?}",
        outer_box.err()
    );
    let outer_box = outer_box.unwrap();

    // Create INNER box (void for water)
    let inner_box = Primitives::make_box(inner_width, inner_depth, length + 0.01);
    assert!(
        inner_box.is_ok(),
        "Failed to create inner box: {:?}",
        inner_box.err()
    );
    let inner_box = inner_box.unwrap();

    // Move inner box to center on X
    let inner_box = Operations::translate(&inner_box, -inner_width / 2.0, 0.0, -0.005);
    assert!(
        inner_box.is_ok(),
        "Failed to translate inner box: {:?}",
        inner_box.err()
    );
    let inner_box = inner_box.unwrap();

    // Boolean subtract: outer - inner = channel walls
    let channel = Operations::cut(&outer_box, &inner_box);
    assert!(
        channel.is_ok(),
        "Failed to cut channel: {:?}",
        channel.err()
    );
    let channel = channel.unwrap();

    // Tessellate to verify shape is valid
    let mesh = channel.tessellate(0.1);
    assert!(
        mesh.is_ok(),
        "Failed to tessellate channel: {:?}",
        mesh.err()
    );
    let mesh_data = mesh.unwrap();

    println!(
        "Channel created and tessellated: {} vertices, {} indices",
        mesh_data.vertices.len(),
        mesh_data.indices.len()
    );
    assert!(
        !mesh_data.vertices.is_empty(),
        "Channel should have vertices"
    );
    assert!(!mesh_data.indices.is_empty(), "Channel should have indices");
}
