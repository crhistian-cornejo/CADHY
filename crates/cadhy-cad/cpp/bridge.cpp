// OpenCASCADE C++ Bridge for cadhy-cad
//
// This file implements the FFI bridge between Rust and OpenCASCADE.
// Provides comprehensive CAD operations including:
// - Primitive creation (box, cylinder, sphere, cone, torus, wedge)
// - Boolean operations (fuse, cut, common)
// - Modification operations (fillet, chamfer, offset, shell)
// - Transform operations (translate, rotate, scale, mirror)
// - Surface/solid generation (extrude, revolve)
// - Wire/sketch operations
// - Tessellation and STEP/IGES I/O
// - Measurement and properties

#include "include/bridge.h"
#include "cadhy-cad/src/ffi.rs.h"

namespace cadhy_cad {

// ============================================================
// PRIMITIVE CREATION
// ============================================================

std::unique_ptr<OcctShape> make_box(double dx, double dy, double dz) {
    try {
        BRepPrimAPI_MakeBox maker(dx, dy, dz);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_box_at(double x, double y, double z, double dx, double dy, double dz) {
    try {
        gp_Pnt corner(x, y, z);
        BRepPrimAPI_MakeBox maker(corner, dx, dy, dz);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_box_centered(double dx, double dy, double dz) {
    try {
        gp_Pnt corner(-dx/2.0, -dy/2.0, -dz/2.0);
        BRepPrimAPI_MakeBox maker(corner, dx, dy, dz);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_cylinder(double radius, double height) {
    try {
        BRepPrimAPI_MakeCylinder maker(radius, height);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_cylinder_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double radius, double height
) {
    try {
        gp_Pnt origin(x, y, z);
        gp_Dir direction(ax, ay, az);
        gp_Ax2 axis(origin, direction);
        BRepPrimAPI_MakeCylinder maker(axis, radius, height);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_sphere(double radius) {
    try {
        BRepPrimAPI_MakeSphere maker(radius);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_sphere_at(double x, double y, double z, double radius) {
    try {
        gp_Pnt center(x, y, z);
        BRepPrimAPI_MakeSphere maker(center, radius);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_cone(double r1, double r2, double height) {
    try {
        BRepPrimAPI_MakeCone maker(r1, r2, height);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_cone_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double r1, double r2, double height
) {
    try {
        gp_Pnt origin(x, y, z);
        gp_Dir direction(ax, ay, az);
        gp_Ax2 axis(origin, direction);
        BRepPrimAPI_MakeCone maker(axis, r1, r2, height);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_torus(double major_radius, double minor_radius) {
    try {
        BRepPrimAPI_MakeTorus maker(major_radius, minor_radius);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_torus_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double major_radius, double minor_radius
) {
    try {
        gp_Pnt origin(x, y, z);
        gp_Dir direction(ax, ay, az);
        gp_Ax2 axis(origin, direction);
        BRepPrimAPI_MakeTorus maker(axis, major_radius, minor_radius);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_wedge(double dx, double dy, double dz, double ltx) {
    try {
        BRepPrimAPI_MakeWedge maker(dx, dy, dz, ltx);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_helix(
    double radius,
    double pitch,
    double height,
    bool clockwise
) {
    return make_helix_at(0, 0, 0, 0, 0, 1, radius, pitch, height, clockwise);
}

std::unique_ptr<OcctShape> make_helix_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double radius,
    double pitch,
    double height,
    bool clockwise
) {
    try {
        if (radius <= 0 || pitch <= 0 || height <= 0) {
            std::cerr << "make_helix: invalid parameters (radius=" << radius 
                      << ", pitch=" << pitch << ", height=" << height << ")" << std::endl;
            return nullptr;
        }

        // Create cylindrical surface for helix
        gp_Pnt origin(x, y, z);
        gp_Dir direction(ax, ay, az);
        gp_Ax3 axis(origin, direction);
        
        Handle(Geom_CylindricalSurface) cylinder = new Geom_CylindricalSurface(axis, radius);
        
        // Calculate helix parameters
        // A helix on a cylinder is a line in the UV space
        // The line has slope = pitch / (2 * pi * radius) in UV coordinates
        double turns = height / pitch;
        double totalAngle = turns * 2.0 * M_PI;
        
        // Create 2D line on the cylinder surface
        // The line goes from (0, 0) to (totalAngle, height) in UV space
        // For clockwise helix, we negate the angle direction
        double sign = clockwise ? 1.0 : -1.0;
        
        // Create the 2D line: origin at (0,0), direction towards (sign*totalAngle, height)
        gp_Pnt2d lineOrigin(0.0, 0.0);
        gp_Dir2d lineDir(sign * totalAngle, height);
        Handle(Geom2d_Line) line2d = new Geom2d_Line(lineOrigin, lineDir);
        
        // Calculate the parameter range
        // The length in UV space
        double uvLength = std::sqrt(totalAngle * totalAngle + height * height);
        
        // Create edge on the cylindrical surface
        BRepBuilderAPI_MakeEdge edgeMaker(line2d, cylinder, 0.0, uvLength);
        edgeMaker.Build();
        
        if (!edgeMaker.IsDone()) {
            std::cerr << "make_helix: failed to create edge on cylinder" << std::endl;
            return nullptr;
        }
        
        // Convert edge to wire
        TopoDS_Edge edge = edgeMaker.Edge();
        BRepBuilderAPI_MakeWire wireMaker(edge);
        wireMaker.Build();
        
        if (!wireMaker.IsDone()) {
            std::cerr << "make_helix: failed to create wire from edge" << std::endl;
            return nullptr;
        }
        
        return std::make_unique<OcctShape>(wireMaker.Wire());
    } catch (const Standard_Failure& e) {
        std::cerr << "make_helix exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "make_helix: unknown exception" << std::endl;
        return nullptr;
    }
}

// ============================================================
// BOOLEAN OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> boolean_fuse(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        BRepAlgoAPI_Fuse fuse(shape1.get(), shape2.get());
        fuse.Build();
        if (!fuse.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(fuse.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> boolean_cut(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        BRepAlgoAPI_Cut cut(shape1.get(), shape2.get());
        cut.Build();
        if (!cut.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(cut.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> boolean_common(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        BRepAlgoAPI_Common common(shape1.get(), shape2.get());
        common.Build();
        if (!common.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(common.Shape());
    } catch (...) {
        return nullptr;
    }
}

// ============================================================
// MODIFICATION OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> fillet_all_edges(const OcctShape& shape, double radius) {
    try {
        BRepFilletAPI_MakeFillet fillet(shape.get());
        TopExp_Explorer explorer(shape.get(), TopAbs_EDGE);
        for (; explorer.More(); explorer.Next()) {
            const TopoDS_Edge& edge = TopoDS::Edge(explorer.Current());
            fillet.Add(radius, edge);
        }
        fillet.Build();
        if (!fillet.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(fillet.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> chamfer_all_edges(const OcctShape& shape, double distance) {
    try {
        BRepFilletAPI_MakeChamfer chamfer(shape.get());
        TopExp_Explorer edgeExplorer(shape.get(), TopAbs_EDGE);
        for (; edgeExplorer.More(); edgeExplorer.Next()) {
            const TopoDS_Edge& edge = TopoDS::Edge(edgeExplorer.Current());
            chamfer.Add(distance, edge);
        }
        chamfer.Build();
        if (!chamfer.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(chamfer.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_shell(const OcctShape& shape, double thickness) {
    try {
        TopTools_ListOfShape facesToRemove;
        // Get first face to open the shell
        TopExp_Explorer explorer(shape.get(), TopAbs_FACE);
        if (explorer.More()) {
            facesToRemove.Append(explorer.Current());
        }

        BRepOffsetAPI_MakeThickSolid maker;
        maker.MakeThickSolidByJoin(shape.get(), facesToRemove, thickness, 1e-6);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> offset_solid(const OcctShape& shape, double offset) {
    try {
        BRepOffsetAPI_MakeOffsetShape maker;
        maker.PerformByJoin(shape.get(), offset, 1e-6);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> fillet_edges(
    const OcctShape& shape,
    rust::Slice<const int32_t> edge_indices,
    rust::Slice<const double> radii
) {
    try {
        if (edge_indices.size() != radii.size()) {
            std::cerr << "fillet_edges: edge_indices and radii must have same length" << std::endl;
            return nullptr;
        }
        if (edge_indices.empty()) {
            return std::make_unique<OcctShape>(shape.get());
        }

        // Build indexed map of edges
        TopTools_IndexedMapOfShape edgeMap;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edgeMap);

        BRepFilletAPI_MakeFillet fillet(shape.get());

        for (size_t i = 0; i < edge_indices.size(); i++) {
            int32_t idx = edge_indices[i] + 1; // Convert to 1-based
            if (idx < 1 || idx > edgeMap.Extent()) {
                std::cerr << "fillet_edges: edge index " << edge_indices[i] 
                          << " out of range (0-" << edgeMap.Extent() - 1 << ")" << std::endl;
                continue;
            }
            const TopoDS_Edge& edge = TopoDS::Edge(edgeMap(idx));
            fillet.Add(radii[i], edge);
        }

        fillet.Build();
        if (!fillet.IsDone()) {
            std::cerr << "fillet_edges: fillet operation failed" << std::endl;
            return nullptr;
        }

        return std::make_unique<OcctShape>(fillet.Shape());
    } catch (const Standard_Failure& e) {
        std::cerr << "fillet_edges exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "fillet_edges: unknown exception" << std::endl;
        return nullptr;
    }
}

std::unique_ptr<OcctShape> chamfer_edges(
    const OcctShape& shape,
    rust::Slice<const int32_t> edge_indices,
    rust::Slice<const double> distances
) {
    try {
        if (edge_indices.size() != distances.size()) {
            std::cerr << "chamfer_edges: edge_indices and distances must have same length" << std::endl;
            return nullptr;
        }
        if (edge_indices.empty()) {
            return std::make_unique<OcctShape>(shape.get());
        }

        // Build indexed map of edges
        TopTools_IndexedMapOfShape edgeMap;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edgeMap);

        BRepFilletAPI_MakeChamfer chamfer(shape.get());

        for (size_t i = 0; i < edge_indices.size(); i++) {
            int32_t idx = edge_indices[i] + 1; // Convert to 1-based
            if (idx < 1 || idx > edgeMap.Extent()) {
                std::cerr << "chamfer_edges: edge index " << edge_indices[i] 
                          << " out of range (0-" << edgeMap.Extent() - 1 << ")" << std::endl;
                continue;
            }
            const TopoDS_Edge& edge = TopoDS::Edge(edgeMap(idx));
            chamfer.Add(distances[i], edge);
        }

        chamfer.Build();
        if (!chamfer.IsDone()) {
            std::cerr << "chamfer_edges: chamfer operation failed" << std::endl;
            return nullptr;
        }

        return std::make_unique<OcctShape>(chamfer.Shape());
    } catch (const Standard_Failure& e) {
        std::cerr << "chamfer_edges exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "chamfer_edges: unknown exception" << std::endl;
        return nullptr;
    }
}

std::unique_ptr<OcctShape> add_draft(
    const OcctShape& shape,
    double angle,
    double dir_x, double dir_y, double dir_z,
    double neutral_x, double neutral_y, double neutral_z
) {
    try {
        // Create the draft direction and neutral plane
        gp_Dir direction(dir_x, dir_y, dir_z);
        gp_Pnt neutralPoint(neutral_x, neutral_y, neutral_z);
        gp_Pln neutralPlane(neutralPoint, direction);

        BRepOffsetAPI_DraftAngle draft(shape.get());

        // Add all planar faces that can be drafted
        TopExp_Explorer faceExplorer(shape.get(), TopAbs_FACE);
        for (; faceExplorer.More(); faceExplorer.Next()) {
            const TopoDS_Face& face = TopoDS::Face(faceExplorer.Current());
            
            // Check if face is suitable for drafting (non-planar or not perpendicular to direction)
            BRepAdaptor_Surface adaptor(face);
            if (adaptor.GetType() == GeomAbs_Plane) {
                gp_Pln facePlane = adaptor.Plane();
                gp_Dir faceNormal = facePlane.Axis().Direction();
                
                // Skip faces that are perpendicular to the draft direction
                // (top/bottom faces that shouldn't be drafted)
                double dotProduct = std::abs(faceNormal.Dot(direction));
                if (dotProduct > 0.99) continue; // Nearly perpendicular
                
                // Skip faces that are parallel to the draft direction
                // (already vertical faces)
                if (dotProduct < 0.01) continue;
            }

            try {
                draft.Add(face, direction, angle, neutralPlane);
            } catch (...) {
                // Some faces may not be draftable, skip them
                continue;
            }
        }

        draft.Build();
        if (!draft.IsDone()) {
            std::cerr << "add_draft: draft operation failed" << std::endl;
            return nullptr;
        }

        return std::make_unique<OcctShape>(draft.Shape());
    } catch (const Standard_Failure& e) {
        std::cerr << "add_draft exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "add_draft: unknown exception" << std::endl;
        return nullptr;
    }
}

std::unique_ptr<OcctShape> thicken(
    const OcctShape& shape,
    double thickness,
    bool both_sides
) {
    try {
        if (shape.is_null()) return nullptr;

        // For both_sides, we offset in both directions
        if (both_sides) {
            // Create offset in positive direction
            BRepOffsetAPI_MakeOffsetShape offsetPos;
            offsetPos.PerformBySimple(shape.get(), thickness / 2.0);
            offsetPos.Build();
            if (!offsetPos.IsDone()) {
                std::cerr << "thicken: positive offset failed" << std::endl;
                return nullptr;
            }

            // Create offset in negative direction
            BRepOffsetAPI_MakeOffsetShape offsetNeg;
            offsetNeg.PerformBySimple(shape.get(), -thickness / 2.0);
            offsetNeg.Build();
            if (!offsetNeg.IsDone()) {
                std::cerr << "thicken: negative offset failed" << std::endl;
                return nullptr;
            }

            // Create a solid by sewing the two offset surfaces together
            // This is complex, so we use BRepOffset_MakeOffset for proper solid creation
            BRepOffset_MakeOffset solidMaker;
            solidMaker.Initialize(
                shape.get(),
                thickness,
                1e-6,       // Tol
                BRepOffset_Skin,
                false,      // Intersection
                false,      // SelfInter
                GeomAbs_Arc, // Join type
                true        // ThickeningMode (creates solid from surface)
            );
            solidMaker.MakeOffsetShape();
            
            if (!solidMaker.IsDone()) {
                std::cerr << "thicken: solid creation failed" << std::endl;
                return nullptr;
            }

            return std::make_unique<OcctShape>(solidMaker.Shape());
        } else {
            // Single-sided thickening
            BRepOffset_MakeOffset solidMaker;
            solidMaker.Initialize(
                shape.get(),
                thickness,
                1e-6,
                BRepOffset_Skin,
                false,
                false,
                GeomAbs_Arc,
                true  // ThickeningMode
            );
            solidMaker.MakeOffsetShape();
            
            if (!solidMaker.IsDone()) {
                std::cerr << "thicken: single-sided solid creation failed" << std::endl;
                return nullptr;
            }

            return std::make_unique<OcctShape>(solidMaker.Shape());
        }
    } catch (const Standard_Failure& e) {
        std::cerr << "thicken exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "thicken: unknown exception" << std::endl;
        return nullptr;
    }
}

// ============================================================
// TRANSFORM OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> translate(const OcctShape& shape, double dx, double dy, double dz) {
    try {
        gp_Trsf transform;
        transform.SetTranslation(gp_Vec(dx, dy, dz));
        BRepBuilderAPI_Transform builder(shape.get(), transform, true);
        builder.Build();
        if (!builder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(builder.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> rotate(
    const OcctShape& shape,
    double ox, double oy, double oz,
    double ax, double ay, double az,
    double angle
) {
    try {
        gp_Pnt origin(ox, oy, oz);
        gp_Dir direction(ax, ay, az);
        gp_Ax1 axis(origin, direction);

        gp_Trsf transform;
        transform.SetRotation(axis, angle);
        BRepBuilderAPI_Transform builder(shape.get(), transform, true);
        builder.Build();
        if (!builder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(builder.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> scale_uniform(
    const OcctShape& shape,
    double cx, double cy, double cz,
    double factor
) {
    try {
        gp_Pnt center(cx, cy, cz);
        gp_Trsf transform;
        transform.SetScale(center, factor);
        BRepBuilderAPI_Transform builder(shape.get(), transform, true);
        builder.Build();
        if (!builder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(builder.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> scale_xyz(
    const OcctShape& shape,
    double cx, double cy, double cz,
    double fx, double fy, double fz
) {
    try {
        // First translate to origin
        gp_Trsf toOrigin;
        toOrigin.SetTranslation(gp_Vec(-cx, -cy, -cz));

        // Scale matrix (affine)
        gp_GTrsf scaleTransform;
        scaleTransform.SetValue(1, 1, fx);
        scaleTransform.SetValue(2, 2, fy);
        scaleTransform.SetValue(3, 3, fz);

        // Translate back
        gp_Trsf fromOrigin;
        fromOrigin.SetTranslation(gp_Vec(cx, cy, cz));

        // Apply translations
        BRepBuilderAPI_Transform toOriginBuilder(shape.get(), toOrigin, true);
        toOriginBuilder.Build();
        if (!toOriginBuilder.IsDone()) return nullptr;

        BRepBuilderAPI_GTransform scaleBuilder(toOriginBuilder.Shape(), scaleTransform, true);
        scaleBuilder.Build();
        if (!scaleBuilder.IsDone()) return nullptr;

        BRepBuilderAPI_Transform fromOriginBuilder(scaleBuilder.Shape(), fromOrigin, true);
        fromOriginBuilder.Build();
        if (!fromOriginBuilder.IsDone()) return nullptr;

        return std::make_unique<OcctShape>(fromOriginBuilder.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> mirror(
    const OcctShape& shape,
    double ox, double oy, double oz,
    double nx, double ny, double nz
) {
    try {
        gp_Pnt origin(ox, oy, oz);
        gp_Dir normal(nx, ny, nz);
        gp_Ax2 axis(origin, normal);

        gp_Trsf transform;
        transform.SetMirror(axis);
        BRepBuilderAPI_Transform builder(shape.get(), transform, true);
        builder.Build();
        if (!builder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(builder.Shape());
    } catch (...) {
        return nullptr;
    }
}

// ============================================================
// SURFACE/SOLID GENERATION
// ============================================================

std::unique_ptr<OcctShape> extrude(const OcctShape& shape, double dx, double dy, double dz) {
    try {
        gp_Vec direction(dx, dy, dz);
        BRepPrimAPI_MakePrism prism(shape.get(), direction);
        prism.Build();
        if (!prism.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(prism.Shape());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> revolve(
    const OcctShape& shape,
    double ox, double oy, double oz,
    double ax, double ay, double az,
    double angle
) {
    try {
        gp_Pnt origin(ox, oy, oz);
        gp_Dir direction(ax, ay, az);
        gp_Ax1 axis(origin, direction);

        BRepPrimAPI_MakeRevol revol(shape.get(), axis, angle);
        revol.Build();
        if (!revol.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(revol.Shape());
    } catch (...) {
        return nullptr;
    }
}

// ============================================================
// LOFT/SWEEP OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> make_loft(
    rust::Slice<const OcctShape* const> profiles,
    size_t count,
    bool solid,
    bool ruled
) {
    try {
        if (count < 2) {
            std::cerr << "make_loft: need at least 2 profiles" << std::endl;
            return nullptr;
        }

        BRepOffsetAPI_ThruSections loft(solid, ruled);

        for (size_t i = 0; i < count; i++) {
            if (profiles[i] == nullptr || profiles[i]->is_null()) {
                std::cerr << "make_loft: profile " << i << " is null" << std::endl;
                return nullptr;
            }

            const TopoDS_Shape& shape = profiles[i]->get();

            // Check if it's a wire
            if (shape.ShapeType() == TopAbs_WIRE) {
                loft.AddWire(TopoDS::Wire(shape));
            }
            // If it's an edge, make a wire from it
            else if (shape.ShapeType() == TopAbs_EDGE) {
                BRepBuilderAPI_MakeWire wireMaker(TopoDS::Edge(shape));
                wireMaker.Build();
                if (wireMaker.IsDone()) {
                    loft.AddWire(wireMaker.Wire());
                } else {
                    std::cerr << "make_loft: failed to convert edge to wire at profile " << i << std::endl;
                    return nullptr;
                }
            }
            // If it's a vertex (for tip/point), add it
            else if (shape.ShapeType() == TopAbs_VERTEX) {
                loft.AddVertex(TopoDS::Vertex(shape));
            }
            else {
                std::cerr << "make_loft: profile " << i << " is not a wire, edge, or vertex (type="
                          << shape.ShapeType() << ")" << std::endl;
                return nullptr;
            }
        }

        loft.Build();
        if (!loft.IsDone()) {
            std::cerr << "make_loft: BRepOffsetAPI_ThruSections failed" << std::endl;
            return nullptr;
        }

        return std::make_unique<OcctShape>(loft.Shape());
    } catch (const Standard_Failure& e) {
        std::cerr << "make_loft exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "make_loft: unknown exception" << std::endl;
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_pipe(
    const OcctShape& profile,
    const OcctShape& spine
) {
    try {
        // Get the spine as a wire
        TopoDS_Wire spineWire;
        if (spine.get().ShapeType() == TopAbs_WIRE) {
            spineWire = TopoDS::Wire(spine.get());
        } else if (spine.get().ShapeType() == TopAbs_EDGE) {
            BRepBuilderAPI_MakeWire wireMaker(TopoDS::Edge(spine.get()));
            wireMaker.Build();
            if (!wireMaker.IsDone()) {
                std::cerr << "make_pipe: failed to convert spine edge to wire" << std::endl;
                return nullptr;
            }
            spineWire = wireMaker.Wire();
        } else {
            std::cerr << "make_pipe: spine must be a wire or edge" << std::endl;
            return nullptr;
        }

        // Create the pipe
        BRepOffsetAPI_MakePipe pipe(spineWire, profile.get());
        pipe.Build();
        if (!pipe.IsDone()) {
            std::cerr << "make_pipe: BRepOffsetAPI_MakePipe failed" << std::endl;
            return nullptr;
        }

        return std::make_unique<OcctShape>(pipe.Shape());
    } catch (const Standard_Failure& e) {
        std::cerr << "make_pipe exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "make_pipe: unknown exception" << std::endl;
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_pipe_shell(
    const OcctShape& profile,
    const OcctShape& spine,
    bool with_contact,
    bool with_correction
) {
    try {
        // Get the spine as a wire
        TopoDS_Wire spineWire;
        if (spine.get().ShapeType() == TopAbs_WIRE) {
            spineWire = TopoDS::Wire(spine.get());
        } else if (spine.get().ShapeType() == TopAbs_EDGE) {
            BRepBuilderAPI_MakeWire wireMaker(TopoDS::Edge(spine.get()));
            wireMaker.Build();
            if (!wireMaker.IsDone()) {
                std::cerr << "make_pipe_shell: failed to convert spine edge to wire" << std::endl;
                return nullptr;
            }
            spineWire = wireMaker.Wire();
        } else {
            std::cerr << "make_pipe_shell: spine must be a wire or edge" << std::endl;
            return nullptr;
        }

        // Get the profile as a wire
        TopoDS_Wire profileWire;
        if (profile.get().ShapeType() == TopAbs_WIRE) {
            profileWire = TopoDS::Wire(profile.get());
        } else if (profile.get().ShapeType() == TopAbs_EDGE) {
            BRepBuilderAPI_MakeWire wireMaker(TopoDS::Edge(profile.get()));
            wireMaker.Build();
            if (!wireMaker.IsDone()) {
                std::cerr << "make_pipe_shell: failed to convert profile edge to wire" << std::endl;
                return nullptr;
            }
            profileWire = wireMaker.Wire();
        } else {
            std::cerr << "make_pipe_shell: profile must be a wire or edge" << std::endl;
            return nullptr;
        }

        // Create the pipe shell
        BRepOffsetAPI_MakePipeShell pipeShell(spineWire);

        // Set mode based on parameters
        if (with_contact) {
            pipeShell.SetMode(true); // Keep contact with spine
        }

        if (with_correction) {
            pipeShell.SetForceApproxC1(true); // Force approximation for smooth result
        }

        // Add the profile
        pipeShell.Add(profileWire);

        // Build
        pipeShell.Build();
        if (!pipeShell.IsDone()) {
            std::cerr << "make_pipe_shell: BRepOffsetAPI_MakePipeShell failed" << std::endl;
            return nullptr;
        }

        // Make it solid if possible
        if (pipeShell.MakeSolid()) {
            return std::make_unique<OcctShape>(pipeShell.Shape());
        }

        // Return the shell if we can't make it solid
        return std::make_unique<OcctShape>(pipeShell.Shape());
    } catch (const Standard_Failure& e) {
        std::cerr << "make_pipe_shell exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "make_pipe_shell: unknown exception" << std::endl;
        return nullptr;
    }
}

// ============================================================
// WIRE/SKETCH OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> make_line(double x1, double y1, double z1, double x2, double y2, double z2) {
    try {
        gp_Pnt p1(x1, y1, z1);
        gp_Pnt p2(x2, y2, z2);
        BRepBuilderAPI_MakeEdge maker(p1, p2);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Edge());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_circle(
    double cx, double cy, double cz,
    double nx, double ny, double nz,
    double radius
) {
    try {
        gp_Pnt center(cx, cy, cz);
        gp_Dir normal(nx, ny, nz);
        gp_Ax2 axis(center, normal);
        gp_Circ circle(axis, radius);

        BRepBuilderAPI_MakeEdge maker(circle);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Edge());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_arc(
    double cx, double cy, double cz,
    double nx, double ny, double nz,
    double radius,
    double start_angle, double end_angle
) {
    try {
        gp_Pnt center(cx, cy, cz);
        gp_Dir normal(nx, ny, nz);
        gp_Ax2 axis(center, normal);
        gp_Circ circle(axis, radius);

        BRepBuilderAPI_MakeEdge maker(circle, start_angle, end_angle);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Edge());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_rectangle(double x, double y, double width, double height) {
    try {
        // Create 4 edges
        gp_Pnt p1(x, y, 0);
        gp_Pnt p2(x + width, y, 0);
        gp_Pnt p3(x + width, y + height, 0);
        gp_Pnt p4(x, y + height, 0);

        BRepBuilderAPI_MakeEdge e1Maker(p1, p2);
        BRepBuilderAPI_MakeEdge e2Maker(p2, p3);
        BRepBuilderAPI_MakeEdge e3Maker(p3, p4);
        BRepBuilderAPI_MakeEdge e4Maker(p4, p1);

        e1Maker.Build();
        e2Maker.Build();
        e3Maker.Build();
        e4Maker.Build();

        if (!e1Maker.IsDone() || !e2Maker.IsDone() ||
            !e3Maker.IsDone() || !e4Maker.IsDone()) return nullptr;

        BRepBuilderAPI_MakeWire wireBuilder;
        wireBuilder.Add(e1Maker.Edge());
        wireBuilder.Add(e2Maker.Edge());
        wireBuilder.Add(e3Maker.Edge());
        wireBuilder.Add(e4Maker.Edge());
        wireBuilder.Build();

        if (!wireBuilder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(wireBuilder.Wire());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_face_from_wire(const OcctShape& wire) {
    try {
        TopoDS_Wire w = TopoDS::Wire(wire.get());
        BRepBuilderAPI_MakeFace maker(w);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Face());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_wire_from_edges(rust::Slice<const OcctShape* const> edges, size_t count) {
    try {
        BRepBuilderAPI_MakeWire wireBuilder;
        for (size_t i = 0; i < count && i < edges.size(); ++i) {
            TopoDS_Edge edge = TopoDS::Edge(edges[i]->get());
            wireBuilder.Add(edge);
        }
        wireBuilder.Build();
        if (!wireBuilder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(wireBuilder.Wire());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_polygon_wire(rust::Slice<const Vertex> points) {
    try {
        if (points.size() < 3) return nullptr;

        BRepBuilderAPI_MakeWire wireBuilder;

        for (size_t i = 0; i < points.size(); ++i) {
            const Vertex& p1 = points[i];
            const Vertex& p2 = points[(i + 1) % points.size()];

            gp_Pnt pt1(p1.x, p1.y, 0.0);
            gp_Pnt pt2(p2.x, p2.y, 0.0);

            // Skip degenerate edges
            if (pt1.Distance(pt2) < 1e-7) continue;

            BRepBuilderAPI_MakeEdge edgeMaker(pt1, pt2);
            edgeMaker.Build();
            if (!edgeMaker.IsDone()) continue;

            wireBuilder.Add(edgeMaker.Edge());
        }

        wireBuilder.Build();
        if (!wireBuilder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(wireBuilder.Wire());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> make_polygon_wire_3d(rust::Slice<const Vertex> points) {
    try {
        if (points.size() < 3) return nullptr;

        BRepBuilderAPI_MakeWire wireBuilder;

        for (size_t i = 0; i < points.size(); ++i) {
            const Vertex& p1 = points[i];
            const Vertex& p2 = points[(i + 1) % points.size()];

            gp_Pnt pt1(p1.x, p1.y, p1.z);
            gp_Pnt pt2(p2.x, p2.y, p2.z);

            // Skip degenerate edges
            if (pt1.Distance(pt2) < 1e-7) continue;

            BRepBuilderAPI_MakeEdge edgeMaker(pt1, pt2);
            edgeMaker.Build();
            if (!edgeMaker.IsDone()) continue;

            wireBuilder.Add(edgeMaker.Edge());
        }

        wireBuilder.Build();
        if (!wireBuilder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(wireBuilder.Wire());
    } catch (...) {
        return nullptr;
    }
}

// ============================================================
// TESSELLATION
// ============================================================

MeshResult tessellate(const OcctShape& shape, double deflection) {
    MeshResult result;
    result.vertices = rust::Vec<Vertex>();
    result.normals = rust::Vec<Vertex>();
    result.triangles = rust::Vec<Triangle>();
    result.face_ids = rust::Vec<uint32_t>();
    result.faces = rust::Vec<FaceInfo>();

    try {
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection);
        mesh.Perform();
        if (!mesh.IsDone()) return result;

        // Compute shape bounding box for inlet/outlet cap detection
        Bnd_Box shapeBox;
        BRepBndLib::Add(shape.get(), shapeBox);
        double xmin, ymin, zmin, xmax, ymax, zmax;
        shapeBox.Get(xmin, ymin, zmin, xmax, ymax, zmax);
        double shapeZLength = zmax - zmin;
        double capTolerance = std::max(0.01, shapeZLength * 0.001); // 0.1% of length or 1cm

        size_t vertexOffset = 0;
        uint32_t faceIndex = 0;
        TopExp_Explorer faceExplorer(shape.get(), TopAbs_FACE);

        for (; faceExplorer.More(); faceExplorer.Next(), faceIndex++) {
            const TopoDS_Face& face = TopoDS::Face(faceExplorer.Current());
            TopLoc_Location location;
            Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, location);
            if (triangulation.IsNull()) continue;

            gp_Trsf transform = location.Transformation();

            // Collect face info
            FaceInfo faceInfo;
            faceInfo.index = faceIndex;
            faceInfo.is_reversed = (face.Orientation() == TopAbs_REVERSED);
            
            // Get surface type and properties
            BRepAdaptor_Surface surfAdaptor(face);
            GeomAbs_SurfaceType surfType = surfAdaptor.GetType();
            switch (surfType) {
                case GeomAbs_Plane: faceInfo.surface_type = 0; break;
                case GeomAbs_Cylinder: faceInfo.surface_type = 1; break;
                case GeomAbs_Cone: faceInfo.surface_type = 2; break;
                case GeomAbs_Sphere: faceInfo.surface_type = 3; break;
                case GeomAbs_Torus: faceInfo.surface_type = 4; break;
                case GeomAbs_BezierSurface: faceInfo.surface_type = 5; break;
                case GeomAbs_BSplineSurface: faceInfo.surface_type = 6; break;
                default: faceInfo.surface_type = 7; break;
            }
            
            // Get face normal at center (UV midpoint)
            double uMid = (surfAdaptor.FirstUParameter() + surfAdaptor.LastUParameter()) / 2.0;
            double vMid = (surfAdaptor.FirstVParameter() + surfAdaptor.LastVParameter()) / 2.0;
            gp_Pnt centerPnt;
            gp_Vec du, dv;
            surfAdaptor.D1(uMid, vMid, centerPnt, du, dv);
            gp_Vec faceNormal = du.Crossed(dv);
            if (faceNormal.Magnitude() > 1e-10) {
                faceNormal.Normalize();
                if (faceInfo.is_reversed) faceNormal.Reverse();
            }
            faceInfo.normal_x = faceNormal.X();
            faceInfo.normal_y = faceNormal.Y();
            faceInfo.normal_z = faceNormal.Z();
            
            // Calculate face area
            GProp_GProps props;
            BRepGProp::SurfaceProperties(face, props);
            faceInfo.area = props.Mass();
            
            // Count edges of this face
            int edgeCount = 0;
            for (TopExp_Explorer edgeExp(face, TopAbs_EDGE); edgeExp.More(); edgeExp.Next()) {
                edgeCount++;
            }
            faceInfo.num_edges = edgeCount;
            
            // Get face center of mass for position-based labeling
            gp_Pnt faceCenter = props.CentreOfMass();
            
            // Determine semantic label based on normal direction, surface type, and position
            rust::String label;
            if (surfType == GeomAbs_Plane) {
                // For planar faces, label based on normal direction
                double nx = std::abs(faceInfo.normal_x);
                double ny = std::abs(faceInfo.normal_y);
                double nz = std::abs(faceInfo.normal_z);
                double tolerance = 0.9; // ~25 degrees tolerance
                
                if (nz > tolerance) {
                    // Face normal predominantly in Z direction
                    // Check if this is an inlet/outlet cap (at Z bounds of shape)
                    if (std::abs(faceCenter.Z() - zmin) < capTolerance) {
                        // Face at minimum Z = inlet cap (upstream)
                        label = "inlet_cap";
                    } else if (std::abs(faceCenter.Z() - zmax) < capTolerance) {
                        // Face at maximum Z = outlet cap (downstream)
                        label = "outlet_cap";
                    } else {
                        // Regular top/bottom face
                        label = faceInfo.normal_z > 0 ? "top" : "bottom";
                    }
                } else if (ny > tolerance) {
                    label = faceInfo.normal_y > 0 ? "back" : "front";
                } else if (nx > tolerance) {
                    label = faceInfo.normal_x > 0 ? "right" : "left";
                } else {
                    label = "side";
                }
            } else if (surfType == GeomAbs_Cylinder || surfType == GeomAbs_Cone) {
                label = "curved_side";
            } else if (surfType == GeomAbs_Sphere) {
                label = "spherical";
            } else if (surfType == GeomAbs_Torus) {
                label = "toroidal";
            } else {
                label = "freeform";
            }
            faceInfo.label = label;
            
            result.faces.push_back(faceInfo);

            // Process vertices
            for (int i = 1; i <= triangulation->NbNodes(); i++) {
                gp_Pnt point = triangulation->Node(i).Transformed(transform);
                Vertex v;
                v.x = point.X();
                v.y = point.Y();
                v.z = point.Z();
                result.vertices.push_back(v);

                Vertex n;
                if (triangulation->HasNormals()) {
                    gp_Vec normalVec = triangulation->Normal(i);
                    double len = normalVec.Magnitude();
                    if (len > 1e-10) {
                        n.x = normalVec.X() / len;
                        n.y = normalVec.Y() / len;
                        n.z = normalVec.Z() / len;
                    } else {
                        n.x = 0.0; n.y = 0.0; n.z = 1.0;
                    }
                } else {
                    n.x = 0.0; n.y = 0.0; n.z = 1.0;
                }
                result.normals.push_back(n);
            }

            // Process triangles with face tracking
            bool reversed = (face.Orientation() == TopAbs_REVERSED);
            for (int i = 1; i <= triangulation->NbTriangles(); i++) {
                const Poly_Triangle& tri = triangulation->Triangle(i);
                Standard_Integer n1, n2, n3;
                tri.Get(n1, n2, n3);

                Triangle t;
                if (reversed) {
                    t.v1 = static_cast<uint32_t>(vertexOffset + n1 - 1);
                    t.v2 = static_cast<uint32_t>(vertexOffset + n3 - 1);
                    t.v3 = static_cast<uint32_t>(vertexOffset + n2 - 1);
                } else {
                    t.v1 = static_cast<uint32_t>(vertexOffset + n1 - 1);
                    t.v2 = static_cast<uint32_t>(vertexOffset + n2 - 1);
                    t.v3 = static_cast<uint32_t>(vertexOffset + n3 - 1);
                }
                result.triangles.push_back(t);
                result.face_ids.push_back(faceIndex);
            }
            vertexOffset += triangulation->NbNodes();
        }
    } catch (...) {}

    return result;
}

MeshResult tessellate_with_angle(const OcctShape& shape, double deflection, double angle) {
    MeshResult result;
    result.vertices = rust::Vec<Vertex>();
    result.normals = rust::Vec<Vertex>();
    result.triangles = rust::Vec<Triangle>();
    result.face_ids = rust::Vec<uint32_t>();
    result.faces = rust::Vec<FaceInfo>();

    try {
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection, false, angle);
        mesh.Perform();
        if (!mesh.IsDone()) return result;

        // Compute shape bounding box for inlet/outlet cap detection
        Bnd_Box shapeBox;
        BRepBndLib::Add(shape.get(), shapeBox);
        double xmin, ymin, zmin, xmax, ymax, zmax;
        shapeBox.Get(xmin, ymin, zmin, xmax, ymax, zmax);
        double shapeZLength = zmax - zmin;
        double capTolerance = std::max(0.01, shapeZLength * 0.001); // 0.1% of length or 1cm

        size_t vertexOffset = 0;
        uint32_t faceIndex = 0;
        TopExp_Explorer faceExplorer(shape.get(), TopAbs_FACE);

        for (; faceExplorer.More(); faceExplorer.Next(), faceIndex++) {
            const TopoDS_Face& face = TopoDS::Face(faceExplorer.Current());
            TopLoc_Location location;
            Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, location);
            if (triangulation.IsNull()) continue;

            gp_Trsf transform = location.Transformation();

            // Collect face info
            FaceInfo faceInfo;
            faceInfo.index = faceIndex;
            faceInfo.is_reversed = (face.Orientation() == TopAbs_REVERSED);
            
            // Get surface type and properties
            BRepAdaptor_Surface surfAdaptor(face);
            GeomAbs_SurfaceType surfType = surfAdaptor.GetType();
            switch (surfType) {
                case GeomAbs_Plane: faceInfo.surface_type = 0; break;
                case GeomAbs_Cylinder: faceInfo.surface_type = 1; break;
                case GeomAbs_Cone: faceInfo.surface_type = 2; break;
                case GeomAbs_Sphere: faceInfo.surface_type = 3; break;
                case GeomAbs_Torus: faceInfo.surface_type = 4; break;
                case GeomAbs_BezierSurface: faceInfo.surface_type = 5; break;
                case GeomAbs_BSplineSurface: faceInfo.surface_type = 6; break;
                default: faceInfo.surface_type = 7; break;
            }
            
            // Get face normal at center
            double uMid = (surfAdaptor.FirstUParameter() + surfAdaptor.LastUParameter()) / 2.0;
            double vMid = (surfAdaptor.FirstVParameter() + surfAdaptor.LastVParameter()) / 2.0;
            gp_Pnt centerPnt;
            gp_Vec du, dv;
            surfAdaptor.D1(uMid, vMid, centerPnt, du, dv);
            gp_Vec faceNormal = du.Crossed(dv);
            if (faceNormal.Magnitude() > 1e-10) {
                faceNormal.Normalize();
                if (faceInfo.is_reversed) faceNormal.Reverse();
            }
            faceInfo.normal_x = faceNormal.X();
            faceInfo.normal_y = faceNormal.Y();
            faceInfo.normal_z = faceNormal.Z();
            
            // Calculate face area
            GProp_GProps props;
            BRepGProp::SurfaceProperties(face, props);
            faceInfo.area = props.Mass();
            
            // Count edges
            int edgeCount = 0;
            for (TopExp_Explorer edgeExp(face, TopAbs_EDGE); edgeExp.More(); edgeExp.Next()) {
                edgeCount++;
            }
            faceInfo.num_edges = edgeCount;
            
            // Get face center of mass for position-based labeling
            gp_Pnt faceCenter = props.CentreOfMass();
            
            // Determine semantic label based on normal direction, surface type, and position
            rust::String label;
            if (surfType == GeomAbs_Plane) {
                double nx = std::abs(faceInfo.normal_x);
                double ny = std::abs(faceInfo.normal_y);
                double nz = std::abs(faceInfo.normal_z);
                double tolerance = 0.9;
                
                if (nz > tolerance) {
                    // Face normal predominantly in Z direction
                    // Check if this is an inlet/outlet cap (at Z bounds of shape)
                    if (std::abs(faceCenter.Z() - zmin) < capTolerance) {
                        // Face at minimum Z = inlet cap (upstream)
                        label = "inlet_cap";
                    } else if (std::abs(faceCenter.Z() - zmax) < capTolerance) {
                        // Face at maximum Z = outlet cap (downstream)
                        label = "outlet_cap";
                    } else {
                        // Regular top/bottom face
                        label = faceInfo.normal_z > 0 ? "top" : "bottom";
                    }
                } else if (ny > tolerance) {
                    label = faceInfo.normal_y > 0 ? "back" : "front";
                } else if (nx > tolerance) {
                    label = faceInfo.normal_x > 0 ? "right" : "left";
                } else {
                    label = "side";
                }
            } else if (surfType == GeomAbs_Cylinder || surfType == GeomAbs_Cone) {
                label = "curved_side";
            } else if (surfType == GeomAbs_Sphere) {
                label = "spherical";
            } else if (surfType == GeomAbs_Torus) {
                label = "toroidal";
            } else {
                label = "freeform";
            }
            faceInfo.label = label;
            
            result.faces.push_back(faceInfo);

            // Process vertices
            for (int i = 1; i <= triangulation->NbNodes(); i++) {
                gp_Pnt point = triangulation->Node(i).Transformed(transform);
                Vertex v;
                v.x = point.X(); v.y = point.Y(); v.z = point.Z();
                result.vertices.push_back(v);

                Vertex n;
                if (triangulation->HasNormals()) {
                    gp_Vec normalVec = triangulation->Normal(i);
                    double len = normalVec.Magnitude();
                    if (len > 1e-10) {
                        n.x = normalVec.X() / len;
                        n.y = normalVec.Y() / len;
                        n.z = normalVec.Z() / len;
                    } else {
                        n.x = 0.0; n.y = 0.0; n.z = 1.0;
                    }
                } else {
                    n.x = 0.0; n.y = 0.0; n.z = 1.0;
                }
                result.normals.push_back(n);
            }

            // Process triangles with face tracking
            bool reversed = (face.Orientation() == TopAbs_REVERSED);
            for (int i = 1; i <= triangulation->NbTriangles(); i++) {
                const Poly_Triangle& tri = triangulation->Triangle(i);
                Standard_Integer n1, n2, n3;
                tri.Get(n1, n2, n3);

                Triangle t;
                if (reversed) {
                    t.v1 = static_cast<uint32_t>(vertexOffset + n1 - 1);
                    t.v2 = static_cast<uint32_t>(vertexOffset + n3 - 1);
                    t.v3 = static_cast<uint32_t>(vertexOffset + n2 - 1);
                } else {
                    t.v1 = static_cast<uint32_t>(vertexOffset + n1 - 1);
                    t.v2 = static_cast<uint32_t>(vertexOffset + n2 - 1);
                    t.v3 = static_cast<uint32_t>(vertexOffset + n3 - 1);
                }
                result.triangles.push_back(t);
                result.face_ids.push_back(faceIndex);
            }
            vertexOffset += triangulation->NbNodes();
        }
    } catch (...) {}

    return result;
}

// ============================================================
// BREP I/O
// ============================================================

rust::Vec<uint8_t> write_brep(const OcctShape& shape) {
    rust::Vec<uint8_t> result;
    
    try {
        if (shape.is_null()) return result;
        
        std::ostringstream stream;
        BRepTools::Write(shape.get(), stream);
        std::string data = stream.str();
        
        result.reserve(data.size());
        for (char c : data) {
            result.push_back(static_cast<uint8_t>(c));
        }
    } catch (...) {}
    
    return result;
}

std::unique_ptr<OcctShape> read_brep(rust::Slice<const uint8_t> data) {
    try {
        if (data.empty()) return nullptr;
        
        std::string str(reinterpret_cast<const char*>(data.data()), data.size());
        std::istringstream stream(str);
        
        TopoDS_Shape shape;
        BRep_Builder builder;
        BRepTools::Read(shape, stream, builder);
        
        if (shape.IsNull()) return nullptr;
        return std::make_unique<OcctShape>(shape);
    } catch (...) {
        return nullptr;
    }
}

bool write_brep_file(const OcctShape& shape, rust::Str filename) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        return BRepTools::Write(shape.get(), path.c_str());
    } catch (...) {
        return false;
    }
}

std::unique_ptr<OcctShape> read_brep_file(rust::Str filename) {
    try {
        std::string path(filename.data(), filename.size());
        TopoDS_Shape shape;
        BRep_Builder builder;
        if (!BRepTools::Read(shape, path.c_str(), builder)) return nullptr;
        if (shape.IsNull()) return nullptr;
        return std::make_unique<OcctShape>(shape);
    } catch (...) {
        return nullptr;
    }
}

// ============================================================
// STEP/IGES I/O
// ============================================================

std::unique_ptr<OcctShape> read_step(rust::Str filename) {
    try {
        std::string path(filename.data(), filename.size());
        STEPControl_Reader reader;
        IFSelect_ReturnStatus status = reader.ReadFile(path.c_str());
        if (status != IFSelect_RetDone) return nullptr;
        reader.TransferRoots();
        TopoDS_Shape shape = reader.OneShape();
        if (shape.IsNull()) return nullptr;
        return std::make_unique<OcctShape>(shape);
    } catch (...) {
        return nullptr;
    }
}

bool write_step(const OcctShape& shape, rust::Str filename) {
    try {
        std::string path(filename.data(), filename.size());
        STEPControl_Writer writer;
        IFSelect_ReturnStatus status = writer.Transfer(shape.get(), STEPControl_AsIs);
        if (status != IFSelect_RetDone) return false;
        return writer.Write(path.c_str()) == IFSelect_RetDone;
    } catch (...) {
        return false;
    }
}

	// NOTE:
	// IGES support is now enabled with TKDEIGES library
	std::unique_ptr<OcctShape> read_iges(rust::Str filename) {
	    try {
	        std::string path(filename.data(), filename.size());
	        IGESControl_Reader reader;
	        IFSelect_ReturnStatus status = reader.ReadFile(path.c_str());
	        if (status != IFSelect_RetDone) return nullptr;
	        reader.TransferRoots();
	        TopoDS_Shape shape = reader.OneShape();
	        if (shape.IsNull()) return nullptr;
	        return std::make_unique<OcctShape>(shape);
	    } catch (...) {
	        return nullptr;
	    }
	}
	
	bool write_iges(const OcctShape& shape, rust::Str filename) {
	    try {
	        if (shape.is_null()) return false;
	        std::string path(filename.data(), filename.size());
	        IGESControl_Writer writer;
	        writer.AddShape(shape.get());
	        return writer.Write(path.c_str());
	    } catch (...) {
	        return false;
	    }
	}

// ============================================================
// MODERN FORMAT EXPORT (glTF, OBJ, STL, PLY)
// ============================================================

// Helper: Create XDE document from shape for export
static Handle(TDocStd_Document) create_xde_document(const OcctShape& shape) {
    Handle(TDocStd_Application) app = new TDocStd_Application();
    Handle(TDocStd_Document) doc;
    app->NewDocument("BinXCAF", doc);
    
    Handle(XCAFDoc_ShapeTool) shapeTool = XCAFDoc_DocumentTool::ShapeTool(doc->Main());
    shapeTool->AddShape(shape.get());
    
    return doc;
}

bool write_gltf(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        
        // Tessellate first
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection);
        mesh.Perform();
        if (!mesh.IsDone()) return false;
        
        // Create XDE document
        Handle(TDocStd_Document) doc = create_xde_document(shape);
        
        // Write glTF
        TColStd_IndexedDataMapOfStringString fileInfo;
        RWGltf_CafWriter writer(path.c_str(), false); // false = text format
        Message_ProgressRange progress;
        return writer.Perform(doc, fileInfo, progress);
    } catch (...) {
        return false;
    }
}

bool write_glb(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        
        // Tessellate first
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection);
        mesh.Perform();
        if (!mesh.IsDone()) return false;
        
        // Create XDE document
        Handle(TDocStd_Document) doc = create_xde_document(shape);
        
        // Write GLB (binary)
        TColStd_IndexedDataMapOfStringString fileInfo;
        RWGltf_CafWriter writer(path.c_str(), true); // true = binary format
        Message_ProgressRange progress;
        return writer.Perform(doc, fileInfo, progress);
    } catch (...) {
        return false;
    }
}

bool write_obj(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        
        // Tessellate first
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection);
        mesh.Perform();
        if (!mesh.IsDone()) return false;
        
        // Create XDE document
        Handle(TDocStd_Document) doc = create_xde_document(shape);
        
        // Write OBJ
        RWObj_CafWriter writer(path.c_str());
        Message_ProgressRange progress;
        return writer.Perform(doc, TColStd_IndexedDataMapOfStringString(), progress);
    } catch (...) {
        return false;
    }
}

bool write_stl(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        
        // Tessellate first
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection);
        mesh.Perform();
        if (!mesh.IsDone()) return false;
        
        // Use StlAPI for writing STL from shape
        StlAPI_Writer stlWriter;
        stlWriter.ASCIIMode() = true;
        return stlWriter.Write(shape.get(), path.c_str());
    } catch (...) {
        return false;
    }
}

bool write_stl_binary(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        
        // Tessellate first
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection);
        mesh.Perform();
        if (!mesh.IsDone()) return false;
        
        // Use StlAPI for writing binary STL
        StlAPI_Writer stlWriter;
        stlWriter.ASCIIMode() = false;
        return stlWriter.Write(shape.get(), path.c_str());
    } catch (...) {
        return false;
    }
}

bool write_ply(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        
        // Tessellate first
        BRepMesh_IncrementalMesh mesh(shape.get(), deflection);
        mesh.Perform();
        if (!mesh.IsDone()) return false;
        
        // Create XDE document
        Handle(TDocStd_Document) doc = create_xde_document(shape);
        
        // Write PLY
        RWPly_CafWriter writer(path.c_str());
        Message_ProgressRange progress;
        return writer.Perform(doc, TColStd_IndexedDataMapOfStringString(), progress);
    } catch (...) {
        return false;
    }
}

// ============================================================
// SHAPE ANALYSIS & VALIDATION
// ============================================================

ShapeAnalysisResult analyze_shape(const OcctShape& shape) {
    ShapeAnalysisResult result;
    result.is_valid = false;
    result.num_solids = 0;
    result.num_shells = 0;
    result.num_faces = 0;
    result.num_wires = 0;
    result.num_edges = 0;
    result.num_vertices = 0;
    result.has_free_edges = false;
    result.has_free_vertices = false;
    result.num_small_edges = 0;
    result.num_degenerated_edges = 0;
    result.tolerance = 0.0;

    try {
        if (shape.is_null()) return result;

        // Check validity
        BRepCheck_Analyzer analyzer(shape.get());
        result.is_valid = analyzer.IsValid();

        // Count topology entities
        for (TopExp_Explorer exp(shape.get(), TopAbs_SOLID); exp.More(); exp.Next())
            result.num_solids++;
        for (TopExp_Explorer exp(shape.get(), TopAbs_SHELL); exp.More(); exp.Next())
            result.num_shells++;
        for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next())
            result.num_faces++;
        for (TopExp_Explorer exp(shape.get(), TopAbs_WIRE); exp.More(); exp.Next())
            result.num_wires++;
        for (TopExp_Explorer exp(shape.get(), TopAbs_EDGE); exp.More(); exp.Next())
            result.num_edges++;
        for (TopExp_Explorer exp(shape.get(), TopAbs_VERTEX); exp.More(); exp.Next())
            result.num_vertices++;

        // Analyze shell for free edges
        ShapeAnalysis_Shell shellAnalysis;
        shellAnalysis.LoadShells(shape.get());
        result.has_free_edges = shellAnalysis.HasFreeEdges();
        result.has_free_vertices = shellAnalysis.HasBadEdges();

        // Get shape contents for small faces analysis
        ShapeAnalysis_ShapeContents contents;
        contents.Perform(shape.get());
        result.num_small_edges = contents.NbEdges(); // Will be refined below

        // Count degenerated edges
        int degeneratedCount = 0;
        for (TopExp_Explorer exp(shape.get(), TopAbs_EDGE); exp.More(); exp.Next()) {
            const TopoDS_Edge& edge = TopoDS::Edge(exp.Current());
            if (BRep_Tool::Degenerated(edge)) {
                degeneratedCount++;
            }
        }
        result.num_degenerated_edges = degeneratedCount;

        // Get average tolerance from edges
        double totalTol = 0.0;
        int edgeCount = 0;
        for (TopExp_Explorer exp(shape.get(), TopAbs_EDGE); exp.More(); exp.Next()) {
            const TopoDS_Edge& edge = TopoDS::Edge(exp.Current());
            totalTol += BRep_Tool::Tolerance(edge);
            edgeCount++;
        }
        result.tolerance = (edgeCount > 0) ? (totalTol / edgeCount) : 0.0;

    } catch (...) {}

    return result;
}

bool check_shape_validity(const OcctShape& shape) {
    try {
        if (shape.is_null()) return false;
        BRepCheck_Analyzer analyzer(shape.get());
        return analyzer.IsValid();
    } catch (...) {
        return false;
    }
}

double get_shape_tolerance(const OcctShape& shape) {
    try {
        if (shape.is_null()) return -1.0;
        
        // Calculate average tolerance from all edges
        double totalTol = 0.0;
        int count = 0;
        for (TopExp_Explorer exp(shape.get(), TopAbs_EDGE); exp.More(); exp.Next()) {
            const TopoDS_Edge& edge = TopoDS::Edge(exp.Current());
            totalTol += BRep_Tool::Tolerance(edge);
            count++;
        }
        return (count > 0) ? (totalTol / count) : 0.0;
    } catch (...) {
        return -1.0;
    }
}

std::unique_ptr<OcctShape> fix_shape_advanced(
    const OcctShape& shape,
    bool fix_small_faces,
    bool fix_small_edges,
    bool fix_degenerated,
    bool fix_self_intersection,
    double tolerance
) {
    try {
        if (shape.is_null()) return nullptr;

        TopoDS_Shape result = shape.get();
        double tol = tolerance > 0 ? tolerance : 1e-6;

        // ============================================================
        // STEP 1: Basic shape fix
        // ============================================================
        Handle(ShapeFix_Shape) fixer = new ShapeFix_Shape(result);
        fixer->SetPrecision(tol);
        fixer->SetMinTolerance(tol / 10.0);
        fixer->SetMaxTolerance(tol * 10.0);
        fixer->Perform();
        result = fixer->Shape();

        // ============================================================
        // STEP 2: Fix degenerated edges
        // Degenerated edges are edges with zero or near-zero length
        // that can cause problems in boolean operations
        // ============================================================
        if (fix_degenerated) {
            // Fix each wire's degenerated edges
            for (TopExp_Explorer wireExp(result, TopAbs_WIRE); wireExp.More(); wireExp.Next()) {
                TopoDS_Wire wire = TopoDS::Wire(wireExp.Current());
                
                Handle(ShapeFix_Wire) wireFixer = new ShapeFix_Wire(wire, TopoDS_Face(), tol);
                wireFixer->SetPrecision(tol);
                
                // Fix degenerated edges - removes or repairs edges with zero length
                wireFixer->FixDegenerated();
                
                // Also fix connected edges that might have issues
                wireFixer->FixConnected();
                wireFixer->FixEdgeCurves();
            }
            
            // Fix each edge individually for degeneration
            Handle(ShapeBuild_ReShape) reShape = new ShapeBuild_ReShape();
            
            for (TopExp_Explorer edgeExp(result, TopAbs_EDGE); edgeExp.More(); edgeExp.Next()) {
                TopoDS_Edge edge = TopoDS::Edge(edgeExp.Current());
                
                // Check if edge is degenerated
                if (BRep_Tool::Degenerated(edge)) {
                    // ShapeFix_Edge works on edges in context of faces
                    // For standalone degenerated edges, we mark them for removal
                    // The wireframe fixer below will handle consolidation
                }
            }
            
            // Apply reshaping
            result = reShape->Apply(result);
            
            // Run full shape fix again after degenerated edge handling
            Handle(ShapeFix_Shape) postFixer = new ShapeFix_Shape(result);
            postFixer->SetPrecision(tol);
            postFixer->Perform();
            result = postFixer->Shape();
        }

        // ============================================================
        // STEP 3: Fix small edges (wireframe issues)
        // ============================================================
        if (fix_small_edges) {
            Handle(ShapeFix_Wireframe) wireframeFixer = new ShapeFix_Wireframe(result);
            wireframeFixer->SetPrecision(tol);
            wireframeFixer->SetLimitAngle(0.01); // ~0.57 degrees
            
            // Fix small edges - merges or removes edges smaller than tolerance
            wireframeFixer->FixSmallEdges();
            
            // Fix gaps between edges in wires
            wireframeFixer->FixWireGaps();
            
            result = wireframeFixer->Shape();
        }

        // ============================================================
        // STEP 4: Fix small faces
        // ============================================================
        if (fix_small_faces) {
            // Analyze small faces
            ShapeAnalysis_CheckSmallFace smallFaceChecker;
            smallFaceChecker.SetTolerance(tol);
            
            // Build list of faces to potentially remove/merge
            TopTools_ListOfShape facesToRemove;
            
            for (TopExp_Explorer faceExp(result, TopAbs_FACE); faceExp.More(); faceExp.Next()) {
                TopoDS_Face face = TopoDS::Face(faceExp.Current());
                
                // Check if face is small (spot face)
                // Note: OCCT 7.9 CheckSpotFace signature: (face, tolerance) -> status
                Standard_Integer spotStatus = smallFaceChecker.CheckSpotFace(face, tol);
                if (spotStatus > 0) {
                    // This is a spot face (very small area)
                    // Note: Actual removal requires more complex logic
                    // For now, we mark it for potential processing
                }
            }
            
            // Apply face fixes through ShapeFix_Face
            for (TopExp_Explorer faceExp(result, TopAbs_FACE); faceExp.More(); faceExp.Next()) {
                TopoDS_Face face = TopoDS::Face(faceExp.Current());
                
                Handle(ShapeFix_Face) faceFixer = new ShapeFix_Face(face);
                faceFixer->SetPrecision(tol);
                faceFixer->FixOrientation();
                faceFixer->FixSmallAreaWire(true);
                faceFixer->Perform();
            }
        }

        // ============================================================
        // STEP 5: Fix self-intersections
        // Self-intersecting shapes cause problems in boolean operations
        // Uses BOPAlgo_CheckerSI for detection
        // ============================================================
        if (fix_self_intersection) {
            // First, detect self-intersections
            BOPAlgo_CheckerSI checker;
            
            // Create arguments list properly
            TopTools_ListOfShape argsList;
            argsList.Append(result);
            checker.SetArguments(argsList);
            
            checker.SetNonDestructive(true);
            checker.SetRunParallel(false); // Safer for cross-platform
            checker.SetFuzzyValue(tol);
            checker.Perform();
            
            // Check if there are self-intersections
            if (checker.HasErrors()) {
                // Self-intersections detected
                // Apply healing passes to try to fix them
                
                // Pass 1: Increase tolerance slightly and re-fix
                Handle(ShapeFix_Shape) toleranceFixer = new ShapeFix_Shape(result);
                toleranceFixer->SetPrecision(tol * 2.0);
                toleranceFixer->SetMinTolerance(tol);
                toleranceFixer->SetMaxTolerance(tol * 100.0);
                toleranceFixer->Perform();
                result = toleranceFixer->Shape();
                
                // Pass 2: Fix faces that might be causing intersection
                for (TopExp_Explorer faceExp(result, TopAbs_FACE); faceExp.More(); faceExp.Next()) {
                    TopoDS_Face face = TopoDS::Face(faceExp.Current());
                    
                    Handle(ShapeFix_Face) faceFixer = new ShapeFix_Face(face);
                    faceFixer->SetPrecision(tol * 2.0);
                    faceFixer->FixAddNaturalBound();
                    faceFixer->FixMissingSeam();
                    faceFixer->Perform();
                }
                
                // Pass 3: Final shape healing
                Handle(ShapeFix_Shape) finalFixer = new ShapeFix_Shape(result);
                finalFixer->SetPrecision(tol);
                finalFixer->Perform();
                result = finalFixer->Shape();
            }
        }

        // ============================================================
        // FINAL: Validate result
        // ============================================================
        BRepCheck_Analyzer analyzer(result);
        if (!analyzer.IsValid()) {
            // Shape still has issues - try one more aggressive fix
            Handle(ShapeFix_Shape) lastResort = new ShapeFix_Shape(result);
            lastResort->SetPrecision(tol * 10.0);
            lastResort->SetMaxTolerance(tol * 1000.0);
            lastResort->Perform();
            result = lastResort->Shape();
        }

        return std::make_unique<OcctShape>(result);
    } catch (const Standard_Failure& e) {
        std::cerr << "fix_shape_advanced failed: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "fix_shape_advanced failed: unknown error" << std::endl;
        return nullptr;
    }
}

// ============================================================
// ADVANCED DISTANCE MEASUREMENT
// ============================================================

DistanceResult compute_minimum_distance(const OcctShape& shape1, const OcctShape& shape2) {
    DistanceResult result;
    result.distance = -1.0;
    result.point1_x = 0.0;
    result.point1_y = 0.0;
    result.point1_z = 0.0;
    result.point2_x = 0.0;
    result.point2_y = 0.0;
    result.point2_z = 0.0;
    result.support_type1 = -1;
    result.support_type2 = -1;
    result.valid = false;

    try {
        if (shape1.is_null() || shape2.is_null()) return result;

        BRepExtrema_DistShapeShape distCalc(shape1.get(), shape2.get());
        
        if (!distCalc.IsDone() || distCalc.NbSolution() == 0) return result;

        result.distance = distCalc.Value();
        
        // Get the closest points
        gp_Pnt pt1 = distCalc.PointOnShape1(1);
        gp_Pnt pt2 = distCalc.PointOnShape2(1);
        
        result.point1_x = pt1.X();
        result.point1_y = pt1.Y();
        result.point1_z = pt1.Z();
        result.point2_x = pt2.X();
        result.point2_y = pt2.Y();
        result.point2_z = pt2.Z();

        // Get support types
        BRepExtrema_SupportType type1 = distCalc.SupportTypeShape1(1);
        BRepExtrema_SupportType type2 = distCalc.SupportTypeShape2(1);
        
        result.support_type1 = static_cast<int32_t>(type1);
        result.support_type2 = static_cast<int32_t>(type2);
        result.valid = true;

    } catch (...) {}

    return result;
}

DistanceResult compute_point_to_shape_distance(
    double px, double py, double pz,
    const OcctShape& shape
) {
    DistanceResult result;
    result.distance = -1.0;
    result.point1_x = px;
    result.point1_y = py;
    result.point1_z = pz;
    result.point2_x = 0.0;
    result.point2_y = 0.0;
    result.point2_z = 0.0;
    result.support_type1 = 0; // Vertex (the input point)
    result.support_type2 = -1;
    result.valid = false;

    try {
        if (shape.is_null()) return result;

        // Create a vertex from the point
        BRepBuilderAPI_MakeVertex vertexMaker(gp_Pnt(px, py, pz));
        vertexMaker.Build();
        if (!vertexMaker.IsDone()) return result;
        
        TopoDS_Vertex vertex = vertexMaker.Vertex();
        
        BRepExtrema_DistShapeShape distCalc(vertex, shape.get());
        
        if (!distCalc.IsDone() || distCalc.NbSolution() == 0) return result;

        result.distance = distCalc.Value();
        
        // Get the closest point on shape
        gp_Pnt pt2 = distCalc.PointOnShape2(1);
        result.point2_x = pt2.X();
        result.point2_y = pt2.Y();
        result.point2_z = pt2.Z();

        // Get support type on shape
        BRepExtrema_SupportType type2 = distCalc.SupportTypeShape2(1);
        result.support_type2 = static_cast<int32_t>(type2);
        result.valid = true;

    } catch (...) {}

    return result;
}

// ============================================================
// MEASUREMENT/PROPERTIES
// ============================================================

BoundingBoxResult get_bounding_box(const OcctShape& shape) {
    BoundingBoxResult result;
    result.valid = false;

    try {
        Bnd_Box box;
        BRepBndLib::Add(shape.get(), box);
        if (box.IsVoid()) return result;

        double xmin, ymin, zmin, xmax, ymax, zmax;
        box.Get(xmin, ymin, zmin, xmax, ymax, zmax);

        result.min_x = xmin;
        result.min_y = ymin;
        result.min_z = zmin;
        result.max_x = xmax;
        result.max_y = ymax;
        result.max_z = zmax;
        result.valid = true;
    } catch (...) {}

    return result;
}

ShapeProperties get_shape_properties(const OcctShape& shape) {
    ShapeProperties result;
    result.valid = false;
    result.volume = 0.0;
    result.surface_area = 0.0;
    result.center_x = 0.0;
    result.center_y = 0.0;
    result.center_z = 0.0;

    try {
        GProp_GProps volumeProps;
        BRepGProp::VolumeProperties(shape.get(), volumeProps);
        result.volume = volumeProps.Mass();

        gp_Pnt center = volumeProps.CentreOfMass();
        result.center_x = center.X();
        result.center_y = center.Y();
        result.center_z = center.Z();

        GProp_GProps surfaceProps;
        BRepGProp::SurfaceProperties(shape.get(), surfaceProps);
        result.surface_area = surfaceProps.Mass();

        result.valid = true;
    } catch (...) {}

    return result;
}

double measure_distance(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        BRepExtrema_DistShapeShape distCalc(shape1.get(), shape2.get());
        if (distCalc.IsDone() && distCalc.NbSolution() > 0) {
            return distCalc.Value();
        }
    } catch (...) {}
    return -1.0; // Error indicator
}

rust::Vec<EdgeInfo> get_edges(const OcctShape& shape) {
    rust::Vec<EdgeInfo> edges;

    try {
        TopExp_Explorer explorer(shape.get(), TopAbs_EDGE);
        for (; explorer.More(); explorer.Next()) {
            const TopoDS_Edge& edge = TopoDS::Edge(explorer.Current());

            EdgeInfo info;

            // Get curve properties
            Standard_Real first, last;
            Handle(Geom_Curve) curve = BRep_Tool::Curve(edge, first, last);

            if (!curve.IsNull()) {
                gp_Pnt startPt = curve->Value(first);
                gp_Pnt endPt = curve->Value(last);

                info.start_x = startPt.X();
                info.start_y = startPt.Y();
                info.start_z = startPt.Z();
                info.end_x = endPt.X();
                info.end_y = endPt.Y();
                info.end_z = endPt.Z();

                // Calculate length
                BRepAdaptor_Curve adaptor(edge);
                GProp_GProps props;
                BRepGProp::LinearProperties(edge, props);
                info.length = props.Mass();

                // Determine edge type
                GeomAbs_CurveType curveType = adaptor.GetType();
                switch (curveType) {
                    case GeomAbs_Line: info.edge_type = 0; break;
                    case GeomAbs_Circle: info.edge_type = 2; break;
                    default: info.edge_type = 3; break;
                }

                edges.push_back(info);
            }
        }
    } catch (...) {}

    return edges;
}

// ============================================================
// SHAPE UTILITIES
// ============================================================

bool is_valid(const OcctShape& shape) {
    return !shape.is_null();
}

bool is_null(const OcctShape& shape) {
    return shape.is_null();
}

std::unique_ptr<OcctShape> clone_shape(const OcctShape& shape) {
    try {
        return std::make_unique<OcctShape>(shape.get());
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> fix_shape(const OcctShape& shape) {
    try {
        Handle(ShapeFix_Shape) fixer = new ShapeFix_Shape(shape.get());
        fixer->Perform();
        return std::make_unique<OcctShape>(fixer->Shape());
    } catch (...) {
        return nullptr;
    }
}

int32_t get_shape_type(const OcctShape& shape) {
    try {
        TopAbs_ShapeEnum type = shape.get().ShapeType();
        return static_cast<int32_t>(type);
    } catch (...) {
        return -1;
    }
}

// ============================================================
// HLR PROJECTION (2D Technical Drawings)
// ============================================================

// Helper function to count shape topology for debugging
static void count_shape_topology(const TopoDS_Shape& shape, int& faces, int& edges, int& vertices) {
    faces = 0;
    edges = 0;
    vertices = 0;
    
    for (TopExp_Explorer exp(shape, TopAbs_FACE); exp.More(); exp.Next()) faces++;
    for (TopExp_Explorer exp(shape, TopAbs_EDGE); exp.More(); exp.Next()) edges++;
    for (TopExp_Explorer exp(shape, TopAbs_VERTEX); exp.More(); exp.Next()) vertices++;
}

// Helper function to extract 2D edges from a TopoDS_Shape (improved with logging)
static int extract_2d_edges(
    const TopoDS_Shape& shape,
    int line_type,
    rust::Vec<Line2DFFI>& lines,
    double& min_x, double& min_y,
    double& max_x, double& max_y
) {
    if (shape.IsNull()) {
        return 0;
    }

    int extracted = 0;
    int skipped_null_curve = 0;
    int skipped_degenerate = 0;

    TopExp_Explorer explorer(shape, TopAbs_EDGE);
    for (; explorer.More(); explorer.Next()) {
        const TopoDS_Edge& edge = TopoDS::Edge(explorer.Current());

        Standard_Real first, last;
        Handle(Geom_Curve) curve = BRep_Tool::Curve(edge, first, last);
        if (curve.IsNull()) {
            skipped_null_curve++;
            continue;
        }

        // Get start and end points
        gp_Pnt startPt = curve->Value(first);
        gp_Pnt endPt = curve->Value(last);

        // For HLR output, Z should be near 0 (projected to XY plane)
        Line2DFFI line;
        line.start_x = startPt.X();
        line.start_y = startPt.Y();
        line.end_x = endPt.X();
        line.end_y = endPt.Y();
        line.line_type = line_type;

        // Skip degenerate edges
        double len = std::sqrt(
            std::pow(line.end_x - line.start_x, 2) +
            std::pow(line.end_y - line.start_y, 2)
        );
        if (len <= 1e-7) {
            skipped_degenerate++;
            continue;
        }

        // Update bounding box
        min_x = std::min({min_x, line.start_x, line.end_x});
        min_y = std::min({min_y, line.start_y, line.end_y});
        max_x = std::max({max_x, line.start_x, line.end_x});
        max_y = std::max({max_y, line.start_y, line.end_y});

        lines.push_back(line);
        extracted++;
    }

    // Log extraction results for debugging
    std::cerr << "[HLR] extract_2d_edges type=" << line_type 
              << ": extracted=" << extracted 
              << ", null_curves=" << skipped_null_curve 
              << ", degenerate=" << skipped_degenerate << std::endl;

    return extracted;
}

// Fallback: Extract edges directly from shape bounding box (when HLR fails)
static void extract_bbox_edges(
    const OcctShape& shape,
    rust::Vec<Line2DFFI>& lines,
    double& min_x, double& min_y,
    double& max_x, double& max_y,
    double dir_x, double dir_y, double dir_z,
    double scale
) {
    Bnd_Box bbox;
    BRepBndLib::Add(shape.get(), bbox);
    if (bbox.IsVoid()) return;

    double xmin, ymin, zmin, xmax, ymax, zmax;
    bbox.Get(xmin, ymin, zmin, xmax, ymax, zmax);

    // Project bounding box edges based on view direction
    // For front view (0, -1, 0): project to XZ plane
    // For top view (0, 0, -1): project to XY plane
    // For right view (-1, 0, 0): project to YZ plane

    double p_xmin, p_ymin, p_xmax, p_ymax;

    if (std::abs(dir_y) > 0.9) {
        // Front/Back view - project to XZ
        p_xmin = xmin * scale;
        p_ymin = zmin * scale;
        p_xmax = xmax * scale;
        p_ymax = zmax * scale;
    } else if (std::abs(dir_z) > 0.9) {
        // Top/Bottom view - project to XY
        p_xmin = xmin * scale;
        p_ymin = ymin * scale;
        p_xmax = xmax * scale;
        p_ymax = ymax * scale;
    } else if (std::abs(dir_x) > 0.9) {
        // Left/Right view - project to YZ
        p_xmin = ymin * scale;
        p_ymin = zmin * scale;
        p_xmax = ymax * scale;
        p_ymax = zmax * scale;
    } else {
        // Default/oblique view - project to XY
        p_xmin = xmin * scale;
        p_ymin = ymin * scale;
        p_xmax = xmax * scale;
        p_ymax = ymax * scale;
    }

    // Create 4 edges for bounding box rectangle
    Line2DFFI edges[4];
    // Bottom edge
    edges[0] = {p_xmin, p_ymin, p_xmax, p_ymin, 4}; // outline type
    // Right edge
    edges[1] = {p_xmax, p_ymin, p_xmax, p_ymax, 4};
    // Top edge
    edges[2] = {p_xmax, p_ymax, p_xmin, p_ymax, 4};
    // Left edge
    edges[3] = {p_xmin, p_ymax, p_xmin, p_ymin, 4};

    for (int i = 0; i < 4; i++) {
        lines.push_back(edges[i]);
    }

    min_x = p_xmin;
    min_y = p_ymin;
    max_x = p_xmax;
    max_y = p_ymax;

    std::cerr << "[HLR] Fallback: generated bbox outline with 4 edges" << std::endl;
}

HLRProjectionResult compute_hlr_projection(
    const OcctShape& shape,
    double dir_x, double dir_y, double dir_z,
    double up_x, double up_y, double up_z,
    double scale
) {
    HLRProjectionResult result;
    result.lines = rust::Vec<Line2DFFI>();
    result.min_x = std::numeric_limits<double>::max();
    result.min_y = std::numeric_limits<double>::max();
    result.max_x = std::numeric_limits<double>::lowest();
    result.max_y = std::numeric_limits<double>::lowest();

    try {
        // Validate input shape
        if (shape.is_null()) {
            std::cerr << "[HLR] ERROR: Shape is null" << std::endl;
            return result;
        }

        // Count topology for debugging
        int faces, edges, vertices;
        count_shape_topology(shape.get(), faces, edges, vertices);
        std::cerr << "[HLR] Input shape: " << faces << " faces, " 
                  << edges << " edges, " << vertices << " vertices" << std::endl;

        if (faces == 0 && edges == 0) {
            std::cerr << "[HLR] WARNING: Shape has no faces or edges" << std::endl;
            return result;
        }

        // Normalize view direction
        double len = std::sqrt(dir_x*dir_x + dir_y*dir_y + dir_z*dir_z);
        if (len < 1e-10) {
            std::cerr << "[HLR] ERROR: Invalid view direction (zero length)" << std::endl;
            return result;
        }
        dir_x /= len;
        dir_y /= len;
        dir_z /= len;

        std::cerr << "[HLR] View direction: (" << dir_x << ", " << dir_y << ", " << dir_z << ")" << std::endl;
        std::cerr << "[HLR] Up direction: (" << up_x << ", " << up_y << ", " << up_z << ")" << std::endl;

        // Create projector with view direction
        gp_Dir viewDir(dir_x, dir_y, dir_z);
        gp_Dir upDir(up_x, up_y, up_z);

        // Create coordinate system for projection
        // The X axis of the projection plane is perpendicular to both view and up
        gp_Dir xAxis;
        try {
            xAxis = upDir.Crossed(viewDir);
        } catch (...) {
            std::cerr << "[HLR] WARNING: View and up directions are parallel, using fallback X axis" << std::endl;
            xAxis = gp_Dir(1, 0, 0);
        }

        gp_Ax2 viewAxis(gp_Pnt(0, 0, 0), viewDir, xAxis);
        HLRAlgo_Projector projector(viewAxis);

        std::cerr << "[HLR] Starting HLRBRep_Algo..." << std::endl;

        // Create HLR algorithm
        Handle(HLRBRep_Algo) hlr = new HLRBRep_Algo();
        hlr->Add(shape.get());
        hlr->Projector(projector);
        
        std::cerr << "[HLR] Calling Update()..." << std::endl;
        hlr->Update();
        
        std::cerr << "[HLR] Calling Hide()..." << std::endl;
        hlr->Hide();

        std::cerr << "[HLR] Extracting edges..." << std::endl;

        // Extract results using HLRToShape
        HLRBRep_HLRToShape extractor(hlr);

        int totalExtracted = 0;

        // Extract different line types
        // Visible sharp edges (solid lines)
        TopoDS_Shape visibleSharp = extractor.VCompound();
        totalExtracted += extract_2d_edges(visibleSharp, 0, result.lines, result.min_x, result.min_y, result.max_x, result.max_y);

        // Hidden sharp edges (dashed lines)
        TopoDS_Shape hiddenSharp = extractor.HCompound();
        totalExtracted += extract_2d_edges(hiddenSharp, 1, result.lines, result.min_x, result.min_y, result.max_x, result.max_y);

        // Visible smooth edges
        TopoDS_Shape visibleSmooth = extractor.Rg1LineVCompound();
        totalExtracted += extract_2d_edges(visibleSmooth, 2, result.lines, result.min_x, result.min_y, result.max_x, result.max_y);

        // Hidden smooth edges
        TopoDS_Shape hiddenSmooth = extractor.Rg1LineHCompound();
        totalExtracted += extract_2d_edges(hiddenSmooth, 3, result.lines, result.min_x, result.min_y, result.max_x, result.max_y);

        // Visible outline (silhouette)
        TopoDS_Shape visibleOutline = extractor.OutLineVCompound();
        totalExtracted += extract_2d_edges(visibleOutline, 4, result.lines, result.min_x, result.min_y, result.max_x, result.max_y);

        // Hidden outline
        TopoDS_Shape hiddenOutline = extractor.OutLineHCompound();
        totalExtracted += extract_2d_edges(hiddenOutline, 5, result.lines, result.min_x, result.min_y, result.max_x, result.max_y);

        std::cerr << "[HLR] Total extracted: " << totalExtracted << " lines" << std::endl;

        // Fallback: If HLR produced no lines, create bounding box outline
        if (result.lines.empty()) {
            std::cerr << "[HLR] HLR produced no lines, using bounding box fallback..." << std::endl;
            extract_bbox_edges(shape, result.lines, result.min_x, result.min_y, result.max_x, result.max_y, dir_x, dir_y, dir_z, scale);
        }

        // Apply scale (only if we didn't use fallback which already applies scale)
        if (scale != 1.0 && !result.lines.empty() && totalExtracted > 0) {
            for (auto& line : result.lines) {
                line.start_x *= scale;
                line.start_y *= scale;
                line.end_x *= scale;
                line.end_y *= scale;
            }
            result.min_x *= scale;
            result.min_y *= scale;
            result.max_x *= scale;
            result.max_y *= scale;
        }

        // Handle empty result (no edges found)
        if (result.lines.empty()) {
            result.min_x = 0;
            result.min_y = 0;
            result.max_x = 0;
            result.max_y = 0;
        }

        std::cerr << "[HLR] Final result: " << result.lines.size() << " lines, bbox=("
                  << result.min_x << "," << result.min_y << ")-(" 
                  << result.max_x << "," << result.max_y << ")" << std::endl;

    } catch (const Standard_Failure& e) {
        std::cerr << "[HLR] OCCT Exception: " << e.GetMessageString() << std::endl;
        result.min_x = 0;
        result.min_y = 0;
        result.max_x = 0;
        result.max_y = 0;
    } catch (const std::exception& e) {
        std::cerr << "[HLR] C++ Exception: " << e.what() << std::endl;
        result.min_x = 0;
        result.min_y = 0;
        result.max_x = 0;
        result.max_y = 0;
    } catch (...) {
        std::cerr << "[HLR] Unknown exception occurred" << std::endl;
        result.min_x = 0;
        result.min_y = 0;
        result.max_x = 0;
        result.max_y = 0;
    }

    return result;
}

// ============================================================
// ENHANCED HLR PROJECTION WITH CURVE SUPPORT (V2)
// ============================================================

// Helper to extract curves from edges with proper curve type detection
static int extract_2d_curves(
    const TopoDS_Shape& shape,
    int line_type,
    rust::Vec<Curve2DFFI>& curves,
    rust::Vec<Polyline2DFFI>& polylines,
    double& min_x, double& min_y,
    double& max_x, double& max_y,
    double deflection,
    int& num_lines,
    int& num_arcs,
    int& num_polylines
) {
    if (shape.IsNull()) {
        return 0;
    }

    int extracted = 0;

    TopExp_Explorer explorer(shape, TopAbs_EDGE);
    for (; explorer.More(); explorer.Next()) {
        const TopoDS_Edge& edge = TopoDS::Edge(explorer.Current());

        Standard_Real first, last;
        Handle(Geom_Curve) curve = BRep_Tool::Curve(edge, first, last);
        if (curve.IsNull()) {
            continue;
        }

        // Use BRepAdaptor to get curve type
        BRepAdaptor_Curve adaptor(edge);
        GeomAbs_CurveType curveType = adaptor.GetType();

        // Get start and end points
        gp_Pnt startPt = curve->Value(first);
        gp_Pnt endPt = curve->Value(last);

        // Skip degenerate edges
        double len = startPt.Distance(endPt);
        if (len <= 1e-7 && curveType == GeomAbs_Line) {
            continue;
        }

        // Update bounding box
        min_x = std::min({min_x, startPt.X(), endPt.X()});
        min_y = std::min({min_y, startPt.Y(), endPt.Y()});
        max_x = std::max({max_x, startPt.X(), endPt.X()});
        max_y = std::max({max_y, startPt.Y(), endPt.Y()});

        switch (curveType) {
            case GeomAbs_Line: {
                // Simple line segment
                Curve2DFFI c;
                c.curve_type = 0;  // Line
                c.line_type = line_type;
                c.start_x = startPt.X();
                c.start_y = startPt.Y();
                c.end_x = endPt.X();
                c.end_y = endPt.Y();
                c.center_x = 0;
                c.center_y = 0;
                c.radius = 0;
                c.major_radius = 0;
                c.minor_radius = 0;
                c.start_angle = 0;
                c.end_angle = 0;
                c.rotation = 0;
                c.ccw = false;
                curves.push_back(c);
                num_lines++;
                extracted++;
                break;
            }

            case GeomAbs_Circle: {
                // Circle or arc
                gp_Circ circ = adaptor.Circle();
                gp_Pnt center = circ.Location();
                double radius = circ.Radius();

                // Update bbox with circle extent
                min_x = std::min(min_x, center.X() - radius);
                min_y = std::min(min_y, center.Y() - radius);
                max_x = std::max(max_x, center.X() + radius);
                max_y = std::max(max_y, center.Y() + radius);

                // Calculate angles
                // Note: In 2D HLR output, Z should be ~0, so we project to XY
                gp_Vec toStart(center, startPt);
                gp_Vec toEnd(center, endPt);

                double startAngle = std::atan2(startPt.Y() - center.Y(), startPt.X() - center.X());
                double endAngle = std::atan2(endPt.Y() - center.Y(), endPt.X() - center.X());

                // Determine if it's a full circle or an arc
                bool isFullCircle = (std::abs(first) < 1e-10 && std::abs(last - 2.0 * M_PI) < 1e-10);

                Curve2DFFI c;
                c.curve_type = isFullCircle ? 2 : 1;  // 2=Circle, 1=Arc
                c.line_type = line_type;
                c.start_x = startPt.X();
                c.start_y = startPt.Y();
                c.end_x = endPt.X();
                c.end_y = endPt.Y();
                c.center_x = center.X();
                c.center_y = center.Y();
                c.radius = radius;
                c.major_radius = radius;
                c.minor_radius = radius;
                c.start_angle = startAngle;
                c.end_angle = endAngle;
                c.rotation = 0;
                // Determine arc direction (CCW if edge is not reversed)
                c.ccw = (edge.Orientation() != TopAbs_REVERSED);
                curves.push_back(c);
                num_arcs++;
                extracted++;
                break;
            }

            case GeomAbs_Ellipse: {
                // Ellipse or elliptical arc
                gp_Elips elips = adaptor.Ellipse();
                gp_Pnt center = elips.Location();
                double majorR = elips.MajorRadius();
                double minorR = elips.MinorRadius();

                // Get rotation from the major axis
                gp_Dir xDir = elips.XAxis().Direction();
                double rotation = std::atan2(xDir.Y(), xDir.X());

                // Update bbox
                min_x = std::min(min_x, center.X() - majorR);
                min_y = std::min(min_y, center.Y() - majorR);
                max_x = std::max(max_x, center.X() + majorR);
                max_y = std::max(max_y, center.Y() + majorR);

                // Calculate angles in the ellipse's local coordinate system
                double startAngle = first;
                double endAngle = last;

                Curve2DFFI c;
                c.curve_type = 3;  // Ellipse
                c.line_type = line_type;
                c.start_x = startPt.X();
                c.start_y = startPt.Y();
                c.end_x = endPt.X();
                c.end_y = endPt.Y();
                c.center_x = center.X();
                c.center_y = center.Y();
                c.radius = majorR;  // Use major radius as primary
                c.major_radius = majorR;
                c.minor_radius = minorR;
                c.start_angle = startAngle;
                c.end_angle = endAngle;
                c.rotation = rotation;
                c.ccw = (edge.Orientation() != TopAbs_REVERSED);
                curves.push_back(c);
                num_arcs++;
                extracted++;
                break;
            }

            default: {
                // For BSpline, Bezier, and other complex curves: tessellate to polyline
                Polyline2DFFI polyline;
                polyline.line_type = line_type;

                // Use tangential deflection for smooth tessellation
                GCPnts_TangentialDeflection discretizer(adaptor, deflection, 0.1);
                int nbPoints = discretizer.NbPoints();

                if (nbPoints >= 2) {
                    for (int i = 1; i <= nbPoints; i++) {
                        gp_Pnt pt = discretizer.Value(i);
                        TessPoint2D tp;
                        tp.x = pt.X();
                        tp.y = pt.Y();
                        polyline.points.push_back(tp);

                        // Update bbox
                        min_x = std::min(min_x, pt.X());
                        min_y = std::min(min_y, pt.Y());
                        max_x = std::max(max_x, pt.X());
                        max_y = std::max(max_y, pt.Y());
                    }
                    polylines.push_back(std::move(polyline));
                    num_polylines++;
                    extracted++;
                }
                break;
            }
        }
    }

    return extracted;
}

HLRProjectionResultV2 compute_hlr_projection_v2(
    const OcctShape& shape,
    double dir_x, double dir_y, double dir_z,
    double up_x, double up_y, double up_z,
    double scale,
    double deflection
) {
    HLRProjectionResultV2 result;
    result.curves = rust::Vec<Curve2DFFI>();
    result.polylines = rust::Vec<Polyline2DFFI>();
    result.min_x = std::numeric_limits<double>::max();
    result.min_y = std::numeric_limits<double>::max();
    result.max_x = std::numeric_limits<double>::lowest();
    result.max_y = std::numeric_limits<double>::lowest();
    result.num_edges = 0;
    result.num_lines = 0;
    result.num_arcs = 0;
    result.num_polylines = 0;

    try {
        if (shape.is_null()) {
            std::cerr << "[HLR-V2] ERROR: Shape is null" << std::endl;
            return result;
        }

        // Validate deflection
        if (deflection <= 0) {
            deflection = 0.01;  // Default value
        }

        // Normalize view direction
        double len = std::sqrt(dir_x*dir_x + dir_y*dir_y + dir_z*dir_z);
        if (len < 1e-10) {
            std::cerr << "[HLR-V2] ERROR: Invalid view direction" << std::endl;
            return result;
        }
        dir_x /= len;
        dir_y /= len;
        dir_z /= len;

        std::cerr << "[HLR-V2] View: (" << dir_x << ", " << dir_y << ", " << dir_z << ")" << std::endl;

        // Create projector
        gp_Dir viewDir(dir_x, dir_y, dir_z);
        gp_Dir upDir(up_x, up_y, up_z);
        gp_Dir xAxis;
        try {
            xAxis = upDir.Crossed(viewDir);
        } catch (...) {
            xAxis = gp_Dir(1, 0, 0);
        }

        gp_Ax2 viewAxis(gp_Pnt(0, 0, 0), viewDir, xAxis);
        HLRAlgo_Projector projector(viewAxis);

        // Create HLR algorithm
        Handle(HLRBRep_Algo) hlr = new HLRBRep_Algo();
        hlr->Add(shape.get());
        hlr->Projector(projector);
        hlr->Update();
        hlr->Hide();

        // Extract results
        HLRBRep_HLRToShape extractor(hlr);

        int numLines = 0, numArcs = 0, numPolylines = 0;

        // Extract different line types with curve detection
        TopoDS_Shape visibleSharp = extractor.VCompound();
        result.num_edges += extract_2d_curves(visibleSharp, 0, result.curves, result.polylines,
            result.min_x, result.min_y, result.max_x, result.max_y, deflection,
            numLines, numArcs, numPolylines);

        TopoDS_Shape hiddenSharp = extractor.HCompound();
        result.num_edges += extract_2d_curves(hiddenSharp, 1, result.curves, result.polylines,
            result.min_x, result.min_y, result.max_x, result.max_y, deflection,
            numLines, numArcs, numPolylines);

        TopoDS_Shape visibleSmooth = extractor.Rg1LineVCompound();
        result.num_edges += extract_2d_curves(visibleSmooth, 2, result.curves, result.polylines,
            result.min_x, result.min_y, result.max_x, result.max_y, deflection,
            numLines, numArcs, numPolylines);

        TopoDS_Shape hiddenSmooth = extractor.Rg1LineHCompound();
        result.num_edges += extract_2d_curves(hiddenSmooth, 3, result.curves, result.polylines,
            result.min_x, result.min_y, result.max_x, result.max_y, deflection,
            numLines, numArcs, numPolylines);

        TopoDS_Shape visibleOutline = extractor.OutLineVCompound();
        result.num_edges += extract_2d_curves(visibleOutline, 4, result.curves, result.polylines,
            result.min_x, result.min_y, result.max_x, result.max_y, deflection,
            numLines, numArcs, numPolylines);

        TopoDS_Shape hiddenOutline = extractor.OutLineHCompound();
        result.num_edges += extract_2d_curves(hiddenOutline, 5, result.curves, result.polylines,
            result.min_x, result.min_y, result.max_x, result.max_y, deflection,
            numLines, numArcs, numPolylines);

        result.num_lines = numLines;
        result.num_arcs = numArcs;
        result.num_polylines = numPolylines;

        std::cerr << "[HLR-V2] Extracted: " << numLines << " lines, " 
                  << numArcs << " arcs, " << numPolylines << " polylines" << std::endl;

        // Apply scale
        if (scale != 1.0) {
            for (auto& c : result.curves) {
                c.start_x *= scale;
                c.start_y *= scale;
                c.end_x *= scale;
                c.end_y *= scale;
                c.center_x *= scale;
                c.center_y *= scale;
                c.radius *= scale;
                c.major_radius *= scale;
                c.minor_radius *= scale;
            }
            for (auto& p : result.polylines) {
                for (auto& pt : p.points) {
                    pt.x *= scale;
                    pt.y *= scale;
                }
            }
            result.min_x *= scale;
            result.min_y *= scale;
            result.max_x *= scale;
            result.max_y *= scale;
        }

        // Handle empty result
        if (result.curves.empty() && result.polylines.empty()) {
            result.min_x = 0;
            result.min_y = 0;
            result.max_x = 0;
            result.max_y = 0;
        }

    } catch (const Standard_Failure& e) {
        std::cerr << "[HLR-V2] OCCT Exception: " << e.GetMessageString() << std::endl;
        result.min_x = 0;
        result.min_y = 0;
        result.max_x = 0;
        result.max_y = 0;
    } catch (const std::exception& e) {
        std::cerr << "[HLR-V2] C++ Exception: " << e.what() << std::endl;
    } catch (...) {
        std::cerr << "[HLR-V2] Unknown exception" << std::endl;
    }

    return result;
}

std::unique_ptr<OcctShape> compute_section(
    const OcctShape& shape,
    double origin_x, double origin_y, double origin_z,
    double normal_x, double normal_y, double normal_z
) {
    try {
        if (shape.is_null()) return nullptr;

        // Create the cutting plane
        gp_Pnt origin(origin_x, origin_y, origin_z);
        gp_Dir normal(normal_x, normal_y, normal_z);
        gp_Pln plane(origin, normal);

        // Compute section (intersection curves)
        BRepAlgoAPI_Section section(shape.get(), plane);
        section.Build();

        if (!section.IsDone()) return nullptr;

        return std::make_unique<OcctShape>(section.Shape());
    } catch (...) {
        return nullptr;
    }
}

// ============================================================
// SECTION WITH HATCHING FOR TECHNICAL DRAWINGS
// ============================================================

// Helper: Project a 3D point to 2D using the section plane's coordinate system
static void project_point_to_plane(
    const gp_Pnt& pt3d,
    const gp_Pnt& origin,
    const gp_Dir& xAxis,
    const gp_Dir& yAxis,
    double& x2d,
    double& y2d
) {
    gp_Vec v(origin, pt3d);
    x2d = v.Dot(gp_Vec(xAxis));
    y2d = v.Dot(gp_Vec(yAxis));
}

// Helper: Generate hatch lines for a closed polygon
static void generate_hatch_lines_for_region(
    const std::vector<std::pair<double, double>>& boundary,
    double angle_deg,
    double spacing,
    rust::Vec<HatchLineFFI>& hatch_lines,
    double min_x, double min_y,
    double max_x, double max_y
) {
    if (boundary.size() < 3 || spacing <= 0) return;

    double angle_rad = angle_deg * M_PI / 180.0;
    double cos_a = std::cos(angle_rad);
    double sin_a = std::sin(angle_rad);

    // Calculate the range needed for hatch lines
    // Extend bbox to ensure we cover rotated hatches
    double diag = std::sqrt(std::pow(max_x - min_x, 2) + std::pow(max_y - min_y, 2));
    double cx = (min_x + max_x) / 2.0;
    double cy = (min_y + max_y) / 2.0;

    // Number of hatch lines needed
    int num_lines = static_cast<int>(diag / spacing) + 2;

    // For each potential hatch line
    for (int i = -num_lines; i <= num_lines; i++) {
        double offset = i * spacing;
        
        // Hatch line passes through this point with direction (cos_a, sin_a)
        double hx = cx + offset * sin_a;
        double hy = cy - offset * cos_a;
        
        // Find intersections with all polygon edges
        std::vector<double> intersections;
        
        size_t n = boundary.size();
        for (size_t j = 0; j < n; j++) {
            size_t k = (j + 1) % n;
            
            double x1 = boundary[j].first;
            double y1 = boundary[j].second;
            double x2 = boundary[k].first;
            double y2 = boundary[k].second;
            
            // Edge direction
            double dx = x2 - x1;
            double dy = y2 - y1;
            
            // Parametric intersection
            double denom = dx * sin_a - dy * cos_a;
            if (std::abs(denom) < 1e-10) continue;  // Parallel
            
            double t_edge = ((hx - x1) * sin_a - (hy - y1) * cos_a) / denom;
            
            if (t_edge >= 0.0 && t_edge <= 1.0) {
                // Find parameter along hatch line
                double ix = x1 + t_edge * dx;
                double iy = y1 + t_edge * dy;
                double t_hatch = (ix - hx) * cos_a + (iy - hy) * sin_a;
                intersections.push_back(t_hatch);
            }
        }
        
        // Sort intersections and pair them up
        std::sort(intersections.begin(), intersections.end());
        
        // Create hatch line segments (every other pair)
        for (size_t j = 0; j + 1 < intersections.size(); j += 2) {
            double t1 = intersections[j];
            double t2 = intersections[j + 1];
            
            HatchLineFFI line;
            line.start_x = hx + t1 * cos_a;
            line.start_y = hy + t1 * sin_a;
            line.end_x = hx + t2 * cos_a;
            line.end_y = hy + t2 * sin_a;
            
            // Skip very short lines
            double len = std::sqrt(std::pow(line.end_x - line.start_x, 2) + 
                                   std::pow(line.end_y - line.start_y, 2));
            if (len > 1e-6) {
                hatch_lines.push_back(line);
            }
        }
    }
}

// Helper: Calculate signed area of a polygon (positive = CCW)
static double polygon_signed_area(const std::vector<std::pair<double, double>>& pts) {
    double area = 0.0;
    size_t n = pts.size();
    for (size_t i = 0; i < n; i++) {
        size_t j = (i + 1) % n;
        area += pts[i].first * pts[j].second;
        area -= pts[j].first * pts[i].second;
    }
    return area / 2.0;
}

SectionWithHatchResult compute_section_with_hatch(
    const OcctShape& shape,
    double origin_x, double origin_y, double origin_z,
    double normal_x, double normal_y, double normal_z,
    double up_x, double up_y, double up_z,
    double hatch_angle,
    double hatch_spacing
) {
    SectionWithHatchResult result;
    result.curves = rust::Vec<SectionCurveFFI>();
    result.regions = rust::Vec<HatchRegionFFI>();
    result.min_x = std::numeric_limits<double>::max();
    result.min_y = std::numeric_limits<double>::max();
    result.max_x = std::numeric_limits<double>::lowest();
    result.max_y = std::numeric_limits<double>::lowest();
    result.num_regions = 0;
    result.num_hatch_lines = 0;

    try {
        if (shape.is_null()) {
            std::cerr << "[Section] ERROR: Shape is null" << std::endl;
            return result;
        }

        // Create the cutting plane
        gp_Pnt origin(origin_x, origin_y, origin_z);
        gp_Dir normal(normal_x, normal_y, normal_z);
        gp_Pln plane(origin, normal);

        std::cerr << "[Section] Computing section at (" << origin_x << ", " 
                  << origin_y << ", " << origin_z << ")" << std::endl;

        // Compute section
        BRepAlgoAPI_Section section(shape.get(), plane);
        section.Build();

        if (!section.IsDone()) {
            std::cerr << "[Section] ERROR: Section operation failed" << std::endl;
            return result;
        }

        TopoDS_Shape sectionShape = section.Shape();

        // Set up 2D coordinate system on the plane
        gp_Dir upDir(up_x, up_y, up_z);
        gp_Dir xAxis;
        try {
            xAxis = upDir.Crossed(normal);
        } catch (...) {
            xAxis = gp_Dir(1, 0, 0);
        }
        gp_Dir yAxis = normal.Crossed(xAxis);

        std::cerr << "[Section] X-axis: (" << xAxis.X() << ", " << xAxis.Y() << ", " << xAxis.Z() << ")" << std::endl;

        // Find closed wires using ShapeAnalysis_FreeBounds
        ShapeAnalysis_FreeBounds freeBounds(sectionShape, Standard_False);
        TopoDS_Compound closedWires = freeBounds.GetClosedWires();
        TopoDS_Compound openWires = freeBounds.GetOpenWires();

        int closedCount = 0, openCount = 0;
        
        // Process closed wires (these become hatch regions)
        for (TopExp_Explorer exp(closedWires, TopAbs_WIRE); exp.More(); exp.Next()) {
            TopoDS_Wire wire = TopoDS::Wire(exp.Current());
            closedCount++;

            std::vector<std::pair<double, double>> boundary;
            SectionCurveFFI curve;
            curve.is_closed = true;

            // Extract points from the wire
            for (BRepTools_WireExplorer wexp(wire); wexp.More(); wexp.Next()) {
                TopoDS_Edge edge = wexp.Current();
                TopoDS_Vertex v1 = wexp.CurrentVertex();
                gp_Pnt pt = BRep_Tool::Pnt(v1);

                double x2d, y2d;
                project_point_to_plane(pt, origin, xAxis, yAxis, x2d, y2d);

                TessPoint2D tp;
                tp.x = x2d;
                tp.y = y2d;
                curve.points.push_back(tp);
                boundary.push_back({x2d, y2d});

                result.min_x = std::min(result.min_x, x2d);
                result.min_y = std::min(result.min_y, y2d);
                result.max_x = std::max(result.max_x, x2d);
                result.max_y = std::max(result.max_y, y2d);
            }

            if (boundary.size() >= 3) {
                result.curves.push_back(std::move(curve));

                // Create hatch region
                HatchRegionFFI region;
                region.area = std::abs(polygon_signed_area(boundary));
                region.is_outer = polygon_signed_area(boundary) > 0;  // CCW = outer

                // Copy boundary points
                for (const auto& p : boundary) {
                    TessPoint2D tp;
                    tp.x = p.first;
                    tp.y = p.second;
                    region.boundary.push_back(tp);
                }

                // Generate hatch lines for this region
                generate_hatch_lines_for_region(
                    boundary,
                    hatch_angle,
                    hatch_spacing,
                    region.hatch_lines,
                    result.min_x, result.min_y,
                    result.max_x, result.max_y
                );

                result.num_hatch_lines += region.hatch_lines.size();
                result.regions.push_back(std::move(region));
            }
        }

        // Process open wires (just curves, no hatching)
        for (TopExp_Explorer exp(openWires, TopAbs_WIRE); exp.More(); exp.Next()) {
            TopoDS_Wire wire = TopoDS::Wire(exp.Current());
            openCount++;

            SectionCurveFFI curve;
            curve.is_closed = false;

            for (BRepTools_WireExplorer wexp(wire); wexp.More(); wexp.Next()) {
                TopoDS_Vertex v1 = wexp.CurrentVertex();
                gp_Pnt pt = BRep_Tool::Pnt(v1);

                double x2d, y2d;
                project_point_to_plane(pt, origin, xAxis, yAxis, x2d, y2d);

                TessPoint2D tp;
                tp.x = x2d;
                tp.y = y2d;
                curve.points.push_back(tp);

                result.min_x = std::min(result.min_x, x2d);
                result.min_y = std::min(result.min_y, y2d);
                result.max_x = std::max(result.max_x, x2d);
                result.max_y = std::max(result.max_y, y2d);
            }

            if (curve.points.size() >= 2) {
                result.curves.push_back(std::move(curve));
            }
        }

        result.num_regions = closedCount;

        std::cerr << "[Section] Found " << closedCount << " closed wires, " 
                  << openCount << " open wires, " 
                  << result.num_hatch_lines << " hatch lines" << std::endl;

        // Handle empty result
        if (result.curves.empty()) {
            result.min_x = 0;
            result.min_y = 0;
            result.max_x = 0;
            result.max_y = 0;
        }

    } catch (const Standard_Failure& e) {
        std::cerr << "[Section] OCCT Exception: " << e.GetMessageString() << std::endl;
        result.min_x = 0;
        result.min_y = 0;
        result.max_x = 0;
        result.max_y = 0;
    } catch (const std::exception& e) {
        std::cerr << "[Section] C++ Exception: " << e.what() << std::endl;
    } catch (...) {
        std::cerr << "[Section] Unknown exception" << std::endl;
    }

    return result;
}

// ============================================================
// TOPOLOGY EXTRACTION FOR INTERACTIVE SELECTION
// ============================================================

rust::Vec<VertexInfo> get_topology_vertices(const OcctShape& shape) {
    rust::Vec<VertexInfo> result;

    try {
        if (shape.is_null()) return result;

        // Build indexed map of all vertices
        TopTools_IndexedMapOfShape vertexMap;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, vertexMap);

        // Build vertex-edge adjacency map
        TopTools_IndexedDataMapOfShapeListOfShape vertexEdgeMap;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_EDGE, vertexEdgeMap);

        // Process each vertex
        for (int i = 1; i <= vertexMap.Extent(); i++) {
            const TopoDS_Vertex& vertex = TopoDS::Vertex(vertexMap(i));
            gp_Pnt point = BRep_Tool::Pnt(vertex);
            double tolerance = BRep_Tool::Tolerance(vertex);

            VertexInfo info;
            info.index = static_cast<uint32_t>(i - 1); // 0-based
            info.x = point.X();
            info.y = point.Y();
            info.z = point.Z();
            info.tolerance = tolerance;

            // Count connected edges
            int edgeCount = 0;
            if (vertexEdgeMap.Contains(vertex)) {
                const TopTools_ListOfShape& edges = vertexEdgeMap.FindFromKey(vertex);
                edgeCount = edges.Extent();
            }
            info.num_edges = edgeCount;

            result.push_back(info);
        }

        std::cerr << "[Topology] Extracted " << result.size() << " vertices" << std::endl;

    } catch (const Standard_Failure& e) {
        std::cerr << "[Topology] OCCT Exception in get_topology_vertices: " << e.GetMessageString() << std::endl;
    } catch (...) {
        std::cerr << "[Topology] Unknown exception in get_topology_vertices" << std::endl;
    }

    return result;
}

rust::Vec<EdgeTessellation> tessellate_edges(const OcctShape& shape, double deflection) {
    rust::Vec<EdgeTessellation> result;

    try {
        if (shape.is_null()) return result;

        // Build indexed maps for topology
        TopTools_IndexedMapOfShape edgeMap;
        TopTools_IndexedMapOfShape vertexMap;
        TopTools_IndexedMapOfShape faceMap;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edgeMap);
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, vertexMap);
        TopExp::MapShapes(shape.get(), TopAbs_FACE, faceMap);

        // Build edge-face adjacency map
        TopTools_IndexedDataMapOfShapeListOfShape edgeFaceMap;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, edgeFaceMap);

        // Process each edge
        for (int i = 1; i <= edgeMap.Extent(); i++) {
            const TopoDS_Edge& edge = TopoDS::Edge(edgeMap(i));

            EdgeTessellation edgeTess;
            edgeTess.index = static_cast<uint32_t>(i - 1); // 0-based
            edgeTess.is_degenerated = BRep_Tool::Degenerated(edge);
            edgeTess.points = rust::Vec<EdgePoint>();
            edgeTess.adjacent_faces = rust::Vec<uint32_t>();

            // Get edge vertices
            TopoDS_Vertex v1, v2;
            TopExp::Vertices(edge, v1, v2);

            // Find vertex indices
            edgeTess.start_vertex = v1.IsNull() ? 0 : static_cast<uint32_t>(vertexMap.FindIndex(v1) - 1);
            edgeTess.end_vertex = v2.IsNull() ? 0 : static_cast<uint32_t>(vertexMap.FindIndex(v2) - 1);

            // Get edge length
            GProp_GProps props;
            BRepGProp::LinearProperties(edge, props);
            edgeTess.length = props.Mass();

            // Get curve type and tessellate
            if (!edgeTess.is_degenerated) {
                BRepAdaptor_Curve adaptor(edge);
                GeomAbs_CurveType curveType = adaptor.GetType();

                // Map curve type to our enum
                switch (curveType) {
                    case GeomAbs_Line: edgeTess.curve_type = 0; break;
                    case GeomAbs_Circle: edgeTess.curve_type = 1; break;
                    case GeomAbs_Ellipse: edgeTess.curve_type = 2; break;
                    case GeomAbs_Hyperbola: edgeTess.curve_type = 3; break;
                    case GeomAbs_Parabola: edgeTess.curve_type = 4; break;
                    case GeomAbs_BezierCurve: edgeTess.curve_type = 5; break;
                    case GeomAbs_BSplineCurve: edgeTess.curve_type = 6; break;
                    case GeomAbs_OffsetCurve: edgeTess.curve_type = 7; break;
                    default: edgeTess.curve_type = 8; break;
                }

                // Tessellate the curve
                double firstParam = adaptor.FirstParameter();
                double lastParam = adaptor.LastParameter();

                // Use GCPnts_TangentialDeflection for high-quality tessellation
                // It adapts point density based on curvature
                GCPnts_TangentialDeflection tessellator(adaptor, deflection, 0.1); // deflection, angular deflection

                if (tessellator.NbPoints() > 0) {
                    double totalParam = lastParam - firstParam;
                    for (int j = 1; j <= tessellator.NbPoints(); j++) {
                        double param = tessellator.Parameter(j);
                        gp_Pnt pnt = tessellator.Value(j);

                        EdgePoint ep;
                        ep.x = pnt.X();
                        ep.y = pnt.Y();
                        ep.z = pnt.Z();
                        ep.parameter = (totalParam > 1e-10) ? (param - firstParam) / totalParam : 0.0;

                        edgeTess.points.push_back(ep);
                    }
                } else {
                    // Fallback: just use start and end points
                    gp_Pnt startPt = adaptor.Value(firstParam);
                    gp_Pnt endPt = adaptor.Value(lastParam);

                    EdgePoint ep1;
                    ep1.x = startPt.X();
                    ep1.y = startPt.Y();
                    ep1.z = startPt.Z();
                    ep1.parameter = 0.0;
                    edgeTess.points.push_back(ep1);

                    EdgePoint ep2;
                    ep2.x = endPt.X();
                    ep2.y = endPt.Y();
                    ep2.z = endPt.Z();
                    ep2.parameter = 1.0;
                    edgeTess.points.push_back(ep2);
                }
            } else {
                edgeTess.curve_type = 8; // Other/degenerated
            }

            // Get adjacent faces
            if (edgeFaceMap.Contains(edge)) {
                const TopTools_ListOfShape& faces = edgeFaceMap.FindFromKey(edge);
                TopTools_ListIteratorOfListOfShape faceIt(faces);
                for (; faceIt.More(); faceIt.Next()) {
                    int faceIdx = faceMap.FindIndex(faceIt.Value());
                    if (faceIdx > 0) {
                        edgeTess.adjacent_faces.push_back(static_cast<uint32_t>(faceIdx - 1));
                    }
                }
            }

            result.push_back(edgeTess);
        }

        std::cerr << "[Topology] Tessellated " << result.size() << " edges" << std::endl;

    } catch (const Standard_Failure& e) {
        std::cerr << "[Topology] OCCT Exception in tessellate_edges: " << e.GetMessageString() << std::endl;
    } catch (...) {
        std::cerr << "[Topology] Unknown exception in tessellate_edges" << std::endl;
    }

    return result;
}

TopologyResult get_full_topology(const OcctShape& shape, double edge_deflection) {
    TopologyResult result;
    result.vertices = rust::Vec<VertexInfo>();
    result.edges = rust::Vec<EdgeTessellation>();
    result.faces = rust::Vec<FaceTopologyInfo>();
    result.vertex_to_edges = rust::Vec<uint32_t>();
    result.vertex_to_edges_offset = rust::Vec<uint32_t>();
    result.edge_to_faces = rust::Vec<uint32_t>();
    result.edge_to_faces_offset = rust::Vec<uint32_t>();

    try {
        if (shape.is_null()) return result;

        // Build all indexed maps
        TopTools_IndexedMapOfShape vertexMap;
        TopTools_IndexedMapOfShape edgeMap;
        TopTools_IndexedMapOfShape faceMap;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, vertexMap);
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edgeMap);
        TopExp::MapShapes(shape.get(), TopAbs_FACE, faceMap);

        // Build adjacency maps
        TopTools_IndexedDataMapOfShapeListOfShape vertexEdgeMap;
        TopTools_IndexedDataMapOfShapeListOfShape edgeFaceMap;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_EDGE, vertexEdgeMap);
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, edgeFaceMap);

        // =====================
        // Extract vertices
        // =====================
        for (int i = 1; i <= vertexMap.Extent(); i++) {
            const TopoDS_Vertex& vertex = TopoDS::Vertex(vertexMap(i));
            gp_Pnt point = BRep_Tool::Pnt(vertex);

            VertexInfo info;
            info.index = static_cast<uint32_t>(i - 1);
            info.x = point.X();
            info.y = point.Y();
            info.z = point.Z();
            info.tolerance = BRep_Tool::Tolerance(vertex);

            int edgeCount = 0;
            if (vertexEdgeMap.Contains(vertex)) {
                edgeCount = vertexEdgeMap.FindFromKey(vertex).Extent();
            }
            info.num_edges = edgeCount;

            result.vertices.push_back(info);
        }

        // =====================
        // Build vertex-to-edges adjacency (CSR format)
        // =====================
        result.vertex_to_edges_offset.push_back(0);
        for (int i = 1; i <= vertexMap.Extent(); i++) {
            const TopoDS_Vertex& vertex = TopoDS::Vertex(vertexMap(i));

            if (vertexEdgeMap.Contains(vertex)) {
                const TopTools_ListOfShape& edges = vertexEdgeMap.FindFromKey(vertex);
                TopTools_ListIteratorOfListOfShape edgeIt(edges);
                for (; edgeIt.More(); edgeIt.Next()) {
                    int edgeIdx = edgeMap.FindIndex(edgeIt.Value());
                    if (edgeIdx > 0) {
                        result.vertex_to_edges.push_back(static_cast<uint32_t>(edgeIdx - 1));
                    }
                }
            }

            result.vertex_to_edges_offset.push_back(static_cast<uint32_t>(result.vertex_to_edges.size()));
        }

        // =====================
        // Tessellate edges
        // =====================
        result.edge_to_faces_offset.push_back(0);
        for (int i = 1; i <= edgeMap.Extent(); i++) {
            const TopoDS_Edge& edge = TopoDS::Edge(edgeMap(i));

            EdgeTessellation edgeTess;
            edgeTess.index = static_cast<uint32_t>(i - 1);
            edgeTess.is_degenerated = BRep_Tool::Degenerated(edge);
            edgeTess.points = rust::Vec<EdgePoint>();
            edgeTess.adjacent_faces = rust::Vec<uint32_t>();

            // Get vertices
            TopoDS_Vertex v1, v2;
            TopExp::Vertices(edge, v1, v2);
            edgeTess.start_vertex = v1.IsNull() ? 0 : static_cast<uint32_t>(vertexMap.FindIndex(v1) - 1);
            edgeTess.end_vertex = v2.IsNull() ? 0 : static_cast<uint32_t>(vertexMap.FindIndex(v2) - 1);

            // Get length
            GProp_GProps props;
            BRepGProp::LinearProperties(edge, props);
            edgeTess.length = props.Mass();

            // Tessellate if not degenerated
            if (!edgeTess.is_degenerated) {
                BRepAdaptor_Curve adaptor(edge);
                GeomAbs_CurveType curveType = adaptor.GetType();

                switch (curveType) {
                    case GeomAbs_Line: edgeTess.curve_type = 0; break;
                    case GeomAbs_Circle: edgeTess.curve_type = 1; break;
                    case GeomAbs_Ellipse: edgeTess.curve_type = 2; break;
                    case GeomAbs_Hyperbola: edgeTess.curve_type = 3; break;
                    case GeomAbs_Parabola: edgeTess.curve_type = 4; break;
                    case GeomAbs_BezierCurve: edgeTess.curve_type = 5; break;
                    case GeomAbs_BSplineCurve: edgeTess.curve_type = 6; break;
                    case GeomAbs_OffsetCurve: edgeTess.curve_type = 7; break;
                    default: edgeTess.curve_type = 8; break;
                }

                double firstParam = adaptor.FirstParameter();
                double lastParam = adaptor.LastParameter();

                GCPnts_TangentialDeflection tessellator(adaptor, edge_deflection, 0.1);

                if (tessellator.NbPoints() > 0) {
                    double totalParam = lastParam - firstParam;
                    for (int j = 1; j <= tessellator.NbPoints(); j++) {
                        double param = tessellator.Parameter(j);
                        gp_Pnt pnt = tessellator.Value(j);

                        EdgePoint ep;
                        ep.x = pnt.X();
                        ep.y = pnt.Y();
                        ep.z = pnt.Z();
                        ep.parameter = (totalParam > 1e-10) ? (param - firstParam) / totalParam : 0.0;
                        edgeTess.points.push_back(ep);
                    }
                } else {
                    // Fallback
                    gp_Pnt startPt = adaptor.Value(firstParam);
                    gp_Pnt endPt = adaptor.Value(lastParam);

                    EdgePoint ep1 = {startPt.X(), startPt.Y(), startPt.Z(), 0.0};
                    EdgePoint ep2 = {endPt.X(), endPt.Y(), endPt.Z(), 1.0};
                    edgeTess.points.push_back(ep1);
                    edgeTess.points.push_back(ep2);
                }
            } else {
                edgeTess.curve_type = 8;
            }

            // Get adjacent faces and build CSR adjacency
            if (edgeFaceMap.Contains(edge)) {
                const TopTools_ListOfShape& faces = edgeFaceMap.FindFromKey(edge);
                TopTools_ListIteratorOfListOfShape faceIt(faces);
                for (; faceIt.More(); faceIt.Next()) {
                    int faceIdx = faceMap.FindIndex(faceIt.Value());
                    if (faceIdx > 0) {
                        uint32_t faceIdx0 = static_cast<uint32_t>(faceIdx - 1);
                        edgeTess.adjacent_faces.push_back(faceIdx0);
                        result.edge_to_faces.push_back(faceIdx0);
                    }
                }
            }

            result.edge_to_faces_offset.push_back(static_cast<uint32_t>(result.edge_to_faces.size()));
            result.edges.push_back(edgeTess);
        }

        // =====================
        // Extract faces
        // =====================
        TopTools_IndexedDataMapOfShapeListOfShape faceEdgeMap;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, faceEdgeMap);
        
        for (int i = 1; i <= faceMap.Extent(); i++) {
            const TopoDS_Face& face = TopoDS::Face(faceMap(i));
            
            FaceTopologyInfo faceInfo;
            faceInfo.index = static_cast<uint32_t>(i - 1);
            faceInfo.is_reversed = (face.Orientation() == TopAbs_REVERSED);
            faceInfo.boundary_edges = rust::Vec<uint32_t>();
            
            // Get surface type
            BRepAdaptor_Surface adaptor(face);
            GeomAbs_SurfaceType surfType = adaptor.GetType();
            
            switch (surfType) {
                case GeomAbs_Plane: faceInfo.surface_type = 0; break;
                case GeomAbs_Cylinder: faceInfo.surface_type = 1; break;
                case GeomAbs_Cone: faceInfo.surface_type = 2; break;
                case GeomAbs_Sphere: faceInfo.surface_type = 3; break;
                case GeomAbs_Torus: faceInfo.surface_type = 4; break;
                case GeomAbs_BezierSurface: faceInfo.surface_type = 5; break;
                case GeomAbs_BSplineSurface: faceInfo.surface_type = 6; break;
                case GeomAbs_SurfaceOfRevolution: faceInfo.surface_type = 7; break;
                case GeomAbs_SurfaceOfExtrusion: faceInfo.surface_type = 8; break;
                case GeomAbs_OffsetSurface: faceInfo.surface_type = 9; break;
                default: faceInfo.surface_type = 10; break;
            }
            
            // Get area
            GProp_GProps props;
            BRepGProp::SurfaceProperties(face, props);
            faceInfo.area = props.Mass();
            
            // Get center point (mass center of surface)
            gp_Pnt center = props.CentreOfMass();
            faceInfo.center_x = center.X();
            faceInfo.center_y = center.Y();
            faceInfo.center_z = center.Z();
            
            // Get normal at center
            // Project center onto surface to get UV parameters
            double uMid = (adaptor.FirstUParameter() + adaptor.LastUParameter()) / 2.0;
            double vMid = (adaptor.FirstVParameter() + adaptor.LastVParameter()) / 2.0;
            
            gp_Pnt pnt;
            gp_Vec d1u, d1v;
            adaptor.D1(uMid, vMid, pnt, d1u, d1v);
            
            gp_Vec normal = d1u.Crossed(d1v);
            if (normal.Magnitude() > 1e-10) {
                normal.Normalize();
                // Flip normal if face is reversed
                if (faceInfo.is_reversed) {
                    normal.Reverse();
                }
            } else {
                normal = gp_Vec(0, 0, 1); // fallback
            }
            
            faceInfo.normal_x = normal.X();
            faceInfo.normal_y = normal.Y();
            faceInfo.normal_z = normal.Z();
            
            // Get boundary edges
            int edgeCount = 0;
            for (TopExp_Explorer edgeExp(face, TopAbs_EDGE); edgeExp.More(); edgeExp.Next()) {
                const TopoDS_Edge& edge = TopoDS::Edge(edgeExp.Current());
                int edgeIdx = edgeMap.FindIndex(edge);
                if (edgeIdx > 0) {
                    faceInfo.boundary_edges.push_back(static_cast<uint32_t>(edgeIdx - 1));
                    edgeCount++;
                }
            }
            faceInfo.num_edges = edgeCount;
            
            result.faces.push_back(faceInfo);
        }

        std::cerr << "[Topology] Full topology: " << result.vertices.size() << " vertices, "
                  << result.edges.size() << " edges, " << result.faces.size() << " faces" << std::endl;

    } catch (const Standard_Failure& e) {
        std::cerr << "[Topology] OCCT Exception in get_full_topology: " << e.GetMessageString() << std::endl;
    } catch (...) {
        std::cerr << "[Topology] Unknown exception in get_full_topology" << std::endl;
    }

    return result;
}

// ============================================================
// EXPLODE/IMPLODE VIEW OPERATIONS
// ============================================================

ExplodedPart get_exploded_part_info(
    const TopoDS_Shape& subShape,
    uint32_t index,
    const gp_Pnt& parentCenter,
    double distance,
    double deflection
) {
    ExplodedPart part;
    part.index = index;
    part.shape_type = static_cast<int32_t>(subShape.ShapeType());
    
    // Calculate center of mass of this sub-shape
    GProp_GProps props;
    if (subShape.ShapeType() <= TopAbs_SOLID) {
        BRepGProp::VolumeProperties(subShape, props);
    } else {
        BRepGProp::SurfaceProperties(subShape, props);
    }
    gp_Pnt subCenter = props.CentreOfMass();
    
    // Store original center
    part.center_x = subCenter.X();
    part.center_y = subCenter.Y();
    part.center_z = subCenter.Z();
    
    // Calculate direction vector from parent center to sub-shape center
    gp_Vec direction(parentCenter, subCenter);
    double magnitude = direction.Magnitude();
    
    if (magnitude > 1e-10) {
        // Normalize and scale by distance
        direction.Normalize();
        part.offset_x = direction.X() * distance;
        part.offset_y = direction.Y() * distance;
        part.offset_z = direction.Z() * distance;
    } else {
        // If centers coincide, use a default direction based on index
        // This handles cases where sub-shapes are at the same position
        double angle = (2.0 * M_PI * index) / 8.0; // Spread evenly
        part.offset_x = std::cos(angle) * distance;
        part.offset_y = std::sin(angle) * distance;
        part.offset_z = 0.0;
    }
    
    // Tessellate the sub-shape for rendering
    BRepMesh_IncrementalMesh mesh(subShape, deflection);
    mesh.Perform();
    
    // Extract mesh data for this part
    part.vertices = rust::Vec<Vertex>();
    part.normals = rust::Vec<Vertex>();
    part.triangles = rust::Vec<Triangle>();
    
    size_t vertexOffset = 0;
    TopExp_Explorer faceExplorer(subShape, TopAbs_FACE);
    
    for (; faceExplorer.More(); faceExplorer.Next()) {
        const TopoDS_Face& face = TopoDS::Face(faceExplorer.Current());
        TopLoc_Location location;
        Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, location);
        if (triangulation.IsNull()) continue;
        
        gp_Trsf transform = location.Transformation();
        
        // Process vertices
        for (int i = 1; i <= triangulation->NbNodes(); i++) {
            gp_Pnt point = triangulation->Node(i).Transformed(transform);
            Vertex v;
            v.x = point.X();
            v.y = point.Y();
            v.z = point.Z();
            part.vertices.push_back(v);
            
            Vertex n;
            if (triangulation->HasNormals()) {
                gp_Vec normalVec = triangulation->Normal(i);
                double len = normalVec.Magnitude();
                if (len > 1e-10) {
                    n.x = normalVec.X() / len;
                    n.y = normalVec.Y() / len;
                    n.z = normalVec.Z() / len;
                } else {
                    n.x = 0.0; n.y = 0.0; n.z = 1.0;
                }
            } else {
                n.x = 0.0; n.y = 0.0; n.z = 1.0;
            }
            part.normals.push_back(n);
        }
        
        // Process triangles
        bool reversed = (face.Orientation() == TopAbs_REVERSED);
        for (int i = 1; i <= triangulation->NbTriangles(); i++) {
            const Poly_Triangle& tri = triangulation->Triangle(i);
            Standard_Integer n1, n2, n3;
            tri.Get(n1, n2, n3);
            
            Triangle t;
            if (reversed) {
                t.v1 = static_cast<uint32_t>(vertexOffset + n1 - 1);
                t.v2 = static_cast<uint32_t>(vertexOffset + n3 - 1);
                t.v3 = static_cast<uint32_t>(vertexOffset + n2 - 1);
            } else {
                t.v1 = static_cast<uint32_t>(vertexOffset + n1 - 1);
                t.v2 = static_cast<uint32_t>(vertexOffset + n2 - 1);
                t.v3 = static_cast<uint32_t>(vertexOffset + n3 - 1);
            }
            part.triangles.push_back(t);
        }
        vertexOffset += triangulation->NbNodes();
    }
    
    return part;
}

ExplodeResult explode_shape(
    const OcctShape& shape,
    int32_t level,
    double distance,
    double deflection
) {
    ExplodeResult result;
    result.parts = rust::Vec<ExplodedPart>();
    result.parent_center_x = 0.0;
    result.parent_center_y = 0.0;
    result.parent_center_z = 0.0;
    result.success = false;
    
    try {
        if (shape.is_null()) {
            std::cerr << "[Explode] Shape is null" << std::endl;
            return result;
        }
        
        // Calculate parent center of mass
        GProp_GProps parentProps;
        BRepGProp::VolumeProperties(shape.get(), parentProps);
        gp_Pnt parentCenter = parentProps.CentreOfMass();
        
        result.parent_center_x = parentCenter.X();
        result.parent_center_y = parentCenter.Y();
        result.parent_center_z = parentCenter.Z();
        
        // Determine topology type to explore based on level
        // Level 0: Solids (highest level for assembled parts)
        // Level 1: Shells
        // Level 2: Faces (individual surfaces)
        TopAbs_ShapeEnum exploreType;
        switch (level) {
            case 0:
                exploreType = TopAbs_SOLID;
                break;
            case 1:
                exploreType = TopAbs_SHELL;
                break;
            case 2:
            default:
                exploreType = TopAbs_FACE;
                break;
        }
        
        // First pass: check if we have any sub-shapes at this level
        TopExp_Explorer checkExp(shape.get(), exploreType);
        int count = 0;
        for (; checkExp.More(); checkExp.Next()) {
            count++;
        }
        
        // If no sub-shapes found at requested level, try the next level down
        if (count == 0 && level < 2) {
            return explode_shape(shape, level + 1, distance, deflection);
        }
        
        // If still no sub-shapes, return the whole shape as one part
        if (count == 0) {
            ExplodedPart wholePart = get_exploded_part_info(
                shape.get(), 0, parentCenter, 0.0, deflection
            );
            result.parts.push_back(wholePart);
            result.success = true;
            return result;
        }
        
        // Extract sub-shapes
        uint32_t index = 0;
        TopExp_Explorer explorer(shape.get(), exploreType);
        
        for (; explorer.More(); explorer.Next(), index++) {
            const TopoDS_Shape& subShape = explorer.Current();
            
            ExplodedPart part = get_exploded_part_info(
                subShape, index, parentCenter, distance, deflection
            );
            result.parts.push_back(part);
        }
        
        result.success = true;
        std::cerr << "[Explode] Successfully extracted " << result.parts.size() 
                  << " parts at level " << level << std::endl;
                  
    } catch (const Standard_Failure& e) {
        std::cerr << "[Explode] Exception: " << e.GetMessageString() << std::endl;
    } catch (...) {
        std::cerr << "[Explode] Unknown exception" << std::endl;
    }
    
    return result;
}

rust::Vec<ExplodedPart> get_shape_components(
    const OcctShape& shape,
    int32_t level,
    double deflection
) {
    rust::Vec<ExplodedPart> parts;
    
    try {
        if (shape.is_null()) return parts;
        
        // Calculate parent center
        GProp_GProps parentProps;
        BRepGProp::VolumeProperties(shape.get(), parentProps);
        gp_Pnt parentCenter = parentProps.CentreOfMass();
        
        TopAbs_ShapeEnum exploreType;
        switch (level) {
            case 0: exploreType = TopAbs_SOLID; break;
            case 1: exploreType = TopAbs_SHELL; break;
            case 2: 
            default: exploreType = TopAbs_FACE; break;
        }
        
        uint32_t index = 0;
        TopExp_Explorer explorer(shape.get(), exploreType);
        
        for (; explorer.More(); explorer.Next(), index++) {
            const TopoDS_Shape& subShape = explorer.Current();
            
            // Get part info with zero distance (original positions)
            ExplodedPart part = get_exploded_part_info(
                subShape, index, parentCenter, 0.0, deflection
            );
            parts.push_back(part);
        }
        
    } catch (...) {
        std::cerr << "[GetComponents] Unknown exception" << std::endl;
    }
    
    return parts;
}

int32_t count_shape_components(const OcctShape& shape, int32_t level) {
    try {
        if (shape.is_null()) return 0;
        
        TopAbs_ShapeEnum exploreType;
        switch (level) {
            case 0: exploreType = TopAbs_SOLID; break;
            case 1: exploreType = TopAbs_SHELL; break;
            case 2:
            default: exploreType = TopAbs_FACE; break;
        }
        
        int32_t count = 0;
        TopExp_Explorer explorer(shape.get(), exploreType);
        for (; explorer.More(); explorer.Next()) {
            count++;
        }
        
        return count;
    } catch (...) {
        return 0;
    }
}

} // namespace cadhy_cad
