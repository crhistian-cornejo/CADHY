/**
 * @file projection.cpp
 * @brief Implementation of projection operations (HLR, sections, silhouettes)
 *
 * Comprehensive Hidden Line Removal and technical drawing projections using
 * OpenCASCADE HLRBRep and BRepAlgo libraries.
 */

#include "cadhy/projection/projection.hpp"
#include "cadhy/mesh/mesh.hpp"
#include "cadhy/analysis/analysis.hpp"

// OpenCASCADE HLR
#include <HLRBRep_Algo.hxx>
#include <HLRBRep_HLRToShape.hxx>
#include <HLRAlgo_Projector.hxx>
#include <HLRBRep_PolyAlgo.hxx>
#include <HLRBRep_PolyHLRToShape.hxx>

// Section and projection
#include <BRepAlgoAPI_Section.hxx>
#include <BRepProj_Projection.hxx>

// Geometry
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Dir.hxx>
#include <gp_Ax2.hxx>
#include <gp_Ax3.hxx>
#include <gp_Pln.hxx>
#include <gp_Trsf.hxx>

// Topology
#include <TopoDS.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Compound.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_HSequenceOfShape.hxx>

// B-Rep
#include <BRep_Tool.hxx>
#include <BRep_Builder.hxx>
#include <BRepTools.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepBndLib.hxx>
#include <BRepGProp.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepMesh_IncrementalMesh.hxx>

// Geometry adaptor
#include <Geom_Plane.hxx>
#include <Geom_Surface.hxx>
#include <Geom_Curve.hxx>
#include <Geom_CylindricalSurface.hxx>
#include <Geom_ConicalSurface.hxx>
#include <GeomAPI_ProjectPointOnSurf.hxx>
#include <GeomAPI_ProjectPointOnCurve.hxx>
#include <GCPnts_UniformAbscissa.hxx>
#include <GeomAdaptor_Curve.hxx>

// Properties
#include <GProp_GProps.hxx>

// Bounding box
#include <Bnd_Box.hxx>

// Math
#include <cmath>
#include <algorithm>
#include <sstream>
#include <iomanip>

namespace cadhy::projection {

//------------------------------------------------------------------------------
// Anonymous namespace for helpers
//------------------------------------------------------------------------------
namespace {

constexpr double PI = 3.14159265358979323846;

/// Convert Point3D to gp_Pnt
inline gp_Pnt to_gp_pnt(const Point3D& p) {
    return gp_Pnt(p.x, p.y, p.z);
}

/// Convert gp_Pnt to Point3D
inline Point3D from_gp_pnt(const gp_Pnt& p) {
    return Point3D{p.X(), p.Y(), p.Z()};
}

/// Convert Vector3D to gp_Dir
inline gp_Dir to_gp_dir(const Vector3D& v) {
    double len = std::sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 1e-10) return gp_Dir(0, 0, 1);
    return gp_Dir(v.x / len, v.y / len, v.z / len);
}

/// Convert Vector3D to gp_Vec
inline gp_Vec to_gp_vec(const Vector3D& v) {
    return gp_Vec(v.x, v.y, v.z);
}

/// Get shape from OcctShape
inline const TopoDS_Shape& get_shape(const OcctShape& s) {
    return s.get();
}

/// Create OcctShape from TopoDS_Shape
inline std::unique_ptr<OcctShape> make_shape(const TopoDS_Shape& shape) {
    if (shape.IsNull()) return nullptr;
    return std::make_unique<OcctShape>(shape);
}

/// Compute bounding box of shape
BoundingBox3D compute_bbox(const TopoDS_Shape& shape) {
    Bnd_Box box;
    BRepBndLib::Add(shape, box);

    if (box.IsVoid()) {
        return BoundingBox3D{{0, 0, 0}, {0, 0, 0}};
    }

    double xmin, ymin, zmin, xmax, ymax, zmax;
    box.Get(xmin, ymin, zmin, xmax, ymax, zmax);

    return BoundingBox3D{
        Point3D{xmin, ymin, zmin},
        Point3D{xmax, ymax, zmax}
    };
}

/// Extract edges from compound/wire to polylines
std::vector<Polyline2D> edges_to_polylines(const TopoDS_Shape& shape, LineType type,
                                            const gp_Trsf& transform, int edge_idx = -1) {
    std::vector<Polyline2D> result;

    TopExp_Explorer exp(shape, TopAbs_EDGE);
    int idx = 0;

    for (; exp.More(); exp.Next(), ++idx) {
        const TopoDS_Edge& edge = TopoDS::Edge(exp.Current());

        double first, last;
        Handle(Geom_Curve) curve = BRep_Tool::Curve(edge, first, last);

        if (curve.IsNull()) continue;

        Polyline2D poly;
        poly.type = type;
        poly.source_edge = (edge_idx >= 0) ? edge_idx : idx;
        poly.source_face = -1;

        // Sample curve points
        GeomAdaptor_Curve adaptor(curve, first, last);
        GCPnts_UniformAbscissa sampler(adaptor, 20); // 20 points per curve

        if (sampler.IsDone()) {
            for (int i = 1; i <= sampler.NbPoints(); ++i) {
                gp_Pnt p = curve->Value(sampler.Parameter(i));
                p.Transform(transform);
                poly.points.emplace_back(p.X(), p.Y());
            }
        } else {
            // Fallback: just use endpoints
            gp_Pnt p1 = curve->Value(first);
            gp_Pnt p2 = curve->Value(last);
            p1.Transform(transform);
            p2.Transform(transform);
            poly.points.emplace_back(p1.X(), p1.Y());
            poly.points.emplace_back(p2.X(), p2.Y());
        }

        if (poly.points.size() >= 2) {
            result.push_back(std::move(poly));
        }
    }

    return result;
}

/// Convert edge to Line2D (for straight edges)
Line2D edge_to_line(const TopoDS_Edge& edge, LineType type,
                    const gp_Trsf& transform, int edge_idx = -1) {
    double first, last;
    Handle(Geom_Curve) curve = BRep_Tool::Curve(edge, first, last);

    gp_Pnt p1 = curve.IsNull() ? gp_Pnt() : curve->Value(first);
    gp_Pnt p2 = curve.IsNull() ? gp_Pnt() : curve->Value(last);

    p1.Transform(transform);
    p2.Transform(transform);

    return Line2D{p1.X(), p1.Y(), p2.X(), p2.Y(), type, edge_idx, -1};
}

/// Create projector from view direction
HLRAlgo_Projector create_projector(const Vector3D& dir, const Point3D& focus, bool perspective) {
    gp_Dir view_dir = to_gp_dir(dir);
    gp_Pnt focal = to_gp_pnt(focus);

    // Create coordinate system for projection
    // Z axis is the view direction (what we're looking along)
    gp_Dir z_dir = view_dir;

    // Find a suitable up vector (Y direction)
    gp_Dir up(0, 0, 1);
    if (std::abs(z_dir.Z()) > 0.99) {
        up = gp_Dir(0, 1, 0);
    }

    // X direction is perpendicular to both
    gp_Dir x_dir = up.Crossed(z_dir);
    gp_Dir y_dir = z_dir.Crossed(x_dir);

    gp_Ax2 axes(focal, z_dir, x_dir);

    return HLRAlgo_Projector(axes, perspective);
}

} // anonymous namespace

//------------------------------------------------------------------------------
// View Direction Functions
//------------------------------------------------------------------------------

Vector3D view_direction_vector(ViewDirection view) {
    switch (view) {
        case ViewDirection::Front:     return Vector3D{0, -1, 0};
        case ViewDirection::Back:      return Vector3D{0, 1, 0};
        case ViewDirection::Left:      return Vector3D{-1, 0, 0};
        case ViewDirection::Right:     return Vector3D{1, 0, 0};
        case ViewDirection::Top:       return Vector3D{0, 0, -1};
        case ViewDirection::Bottom:    return Vector3D{0, 0, 1};
        case ViewDirection::Isometric: {
            double v = 1.0 / std::sqrt(3.0);
            return Vector3D{v, v, v};
        }
        case ViewDirection::Dimetric: {
            // Common dimetric: 7° from vertical
            return Vector3D{0.354, 0.354, 0.866};
        }
        case ViewDirection::Trimetric: {
            return Vector3D{0.5, 0.707, 0.5};
        }
        default:
            return Vector3D{0, -1, 0};
    }
}

ProjectionParams standard_view(ViewDirection view, const BoundingBox3D& bbox) {
    ProjectionParams params;

    // Compute center of bounding box
    params.focus_point = Point3D{
        (bbox.min.x + bbox.max.x) / 2.0,
        (bbox.min.y + bbox.max.y) / 2.0,
        (bbox.min.z + bbox.max.z) / 2.0
    };

    // Compute diagonal for distance
    double dx = bbox.max.x - bbox.min.x;
    double dy = bbox.max.y - bbox.min.y;
    double dz = bbox.max.z - bbox.min.z;
    double diagonal = std::sqrt(dx*dx + dy*dy + dz*dz);

    Vector3D dir = view_direction_vector(view);
    double distance = diagonal * 2.0;

    params.eye_position = Point3D{
        params.focus_point.x - dir.x * distance,
        params.focus_point.y - dir.y * distance,
        params.focus_point.z - dir.z * distance
    };

    // Up direction based on view
    switch (view) {
        case ViewDirection::Top:
        case ViewDirection::Bottom:
            params.up_direction = Vector3D{0, 1, 0};
            break;
        default:
            params.up_direction = Vector3D{0, 0, 1};
            break;
    }

    params.perspective = false;
    params.focal_length = 50.0;
    params.scale = 1.0 / diagonal;

    return params;
}

//------------------------------------------------------------------------------
// Hidden Line Removal (HLR)
//------------------------------------------------------------------------------

HLRResult compute_hlr(const OcctShape& shape, ViewDirection view) {
    return compute_hlr_direction(shape, view_direction_vector(view), HLROptions{});
}

HLRResult compute_hlr_custom(const OcctShape& shape, const ProjectionParams& params,
                             const HLROptions& options) {
    Vector3D dir{
        params.focus_point.x - params.eye_position.x,
        params.focus_point.y - params.eye_position.y,
        params.focus_point.z - params.eye_position.z
    };
    return compute_hlr_direction(shape, dir, options);
}

HLRResult compute_hlr_direction(const OcctShape& shape, const Vector3D& direction,
                                 const HLROptions& options) {
    HLRResult result;
    const TopoDS_Shape& s = get_shape(shape);

    if (s.IsNull()) return result;

    try {
        // Use polygon-based HLR if requested (faster but less accurate)
        if (options.use_poly_algo) {
            return compute_hlr_poly(shape, ViewDirection::Custom, options.poly_deflection);
        }

        // Compute bounding box for view
        result.view_box = compute_bbox(s);

        // Create projector
        HLRAlgo_Projector projector = create_projector(
            direction,
            Point3D{0, 0, 0},
            false
        );

        // Create HLR algorithm
        Handle(HLRBRep_Algo) hlr = new HLRBRep_Algo();
        hlr->Add(s);
        hlr->Projector(projector);
        hlr->Update();
        hlr->Hide();

        // Extract results
        HLRBRep_HLRToShape hlr_to_shape(hlr);

        // Identity transform (projection already applied by HLR)
        gp_Trsf identity;

        // Visible sharp edges
        TopoDS_Shape visible_sharp = hlr_to_shape.VCompound();
        if (!visible_sharp.IsNull()) {
            auto polys = edges_to_polylines(visible_sharp, LineType::VisibleSharp, identity);
            result.curves.insert(result.curves.end(), polys.begin(), polys.end());
        }

        // Visible smooth edges
        if (options.compute_smooth) {
            TopoDS_Shape visible_smooth = hlr_to_shape.Rg1LineVCompound();
            if (!visible_smooth.IsNull()) {
                auto polys = edges_to_polylines(visible_smooth, LineType::VisibleSmooth, identity);
                result.curves.insert(result.curves.end(), polys.begin(), polys.end());
            }
        }

        // Visible outlines (silhouettes)
        if (options.compute_outlines) {
            TopoDS_Shape visible_outline = hlr_to_shape.OutLineVCompound();
            if (!visible_outline.IsNull()) {
                auto polys = edges_to_polylines(visible_outline, LineType::VisibleOutline, identity);
                result.curves.insert(result.curves.end(), polys.begin(), polys.end());
            }
        }

        // Hidden lines
        if (options.compute_hidden) {
            TopoDS_Shape hidden_sharp = hlr_to_shape.HCompound();
            if (!hidden_sharp.IsNull()) {
                auto polys = edges_to_polylines(hidden_sharp, LineType::HiddenSharp, identity);
                result.curves.insert(result.curves.end(), polys.begin(), polys.end());
            }

            if (options.compute_smooth) {
                TopoDS_Shape hidden_smooth = hlr_to_shape.Rg1LineHCompound();
                if (!hidden_smooth.IsNull()) {
                    auto polys = edges_to_polylines(hidden_smooth, LineType::HiddenSmooth, identity);
                    result.curves.insert(result.curves.end(), polys.begin(), polys.end());
                }
            }

            if (options.compute_outlines) {
                TopoDS_Shape hidden_outline = hlr_to_shape.OutLineHCompound();
                if (!hidden_outline.IsNull()) {
                    auto polys = edges_to_polylines(hidden_outline, LineType::HiddenOutline, identity);
                    result.curves.insert(result.curves.end(), polys.begin(), polys.end());
                }
            }
        }

        result.scale = 1.0;

    } catch (...) {
        // Return empty result on failure
    }

    return result;
}

HLRResult compute_hlr_poly(const OcctShape& shape, ViewDirection view, double deflection) {
    HLRResult result;
    const TopoDS_Shape& s = get_shape(shape);

    if (s.IsNull()) return result;

    try {
        // Tessellate first
        BRepMesh_IncrementalMesh mesh(s, deflection);

        // Get view direction
        Vector3D dir = view_direction_vector(view);

        // Create projector
        HLRAlgo_Projector projector = create_projector(dir, Point3D{0, 0, 0}, false);

        // Use polygon-based HLR (faster)
        Handle(HLRBRep_PolyAlgo) poly_hlr = new HLRBRep_PolyAlgo();
        poly_hlr->Load(s);
        poly_hlr->Projector(projector);
        poly_hlr->Update();

        // Extract results
        HLRBRep_PolyHLRToShape poly_to_shape;
        poly_to_shape.Update(poly_hlr);

        gp_Trsf identity;

        // Visible edges
        TopoDS_Shape visible = poly_to_shape.VCompound();
        if (!visible.IsNull()) {
            auto polys = edges_to_polylines(visible, LineType::Visible, identity);
            result.curves.insert(result.curves.end(), polys.begin(), polys.end());
        }

        // Hidden edges
        TopoDS_Shape hidden = poly_to_shape.HCompound();
        if (!hidden.IsNull()) {
            auto polys = edges_to_polylines(hidden, LineType::Hidden, identity);
            result.curves.insert(result.curves.end(), polys.begin(), polys.end());
        }

        // Outlines
        TopoDS_Shape outline = poly_to_shape.OutLineVCompound();
        if (!outline.IsNull()) {
            auto polys = edges_to_polylines(outline, LineType::VisibleOutline, identity);
            result.curves.insert(result.curves.end(), polys.begin(), polys.end());
        }

        result.view_box = compute_bbox(s);
        result.scale = 1.0;

    } catch (...) {
        // Return empty result on failure
    }

    return result;
}

HLRResult compute_visible_lines(const OcctShape& shape, ViewDirection view) {
    HLROptions opts;
    opts.compute_hidden = false;
    return compute_hlr_direction(shape, view_direction_vector(view), opts);
}

HLRResult compute_silhouette(const OcctShape& shape, ViewDirection view) {
    HLROptions opts;
    opts.compute_hidden = false;
    opts.compute_smooth = false;
    opts.compute_outlines = true;
    return compute_hlr_direction(shape, view_direction_vector(view), opts);
}

//------------------------------------------------------------------------------
// Multi-View Projection
//------------------------------------------------------------------------------

EngineeringViews generate_engineering_views(const OcctShape& shape, const HLROptions& options,
                                            bool all_six, bool include_isometric) {
    EngineeringViews views;

    // Primary views (always computed)
    views.front = compute_hlr_direction(shape, view_direction_vector(ViewDirection::Front), options);
    views.top = compute_hlr_direction(shape, view_direction_vector(ViewDirection::Top), options);
    views.right = compute_hlr_direction(shape, view_direction_vector(ViewDirection::Right), options);

    views.include_back = all_six;
    views.include_bottom = all_six;
    views.include_left = all_six;

    // Secondary views (if requested)
    if (all_six) {
        views.back = compute_hlr_direction(shape, view_direction_vector(ViewDirection::Back), options);
        views.bottom = compute_hlr_direction(shape, view_direction_vector(ViewDirection::Bottom), options);
        views.left = compute_hlr_direction(shape, view_direction_vector(ViewDirection::Left), options);
    }

    // Isometric view
    if (include_isometric) {
        views.isometric = compute_hlr_direction(shape, view_direction_vector(ViewDirection::Isometric), options);
    }

    return views;
}

std::vector<HLRResult> generate_multi_view(const OcctShape& shape,
                                            const std::vector<ViewDirection>& views,
                                            const HLROptions& options) {
    std::vector<HLRResult> results;
    results.reserve(views.size());

    for (const auto& view : views) {
        results.push_back(compute_hlr_direction(shape, view_direction_vector(view), options));
    }

    return results;
}

//------------------------------------------------------------------------------
// Section Operations
//------------------------------------------------------------------------------

SectionResult section_by_plane(const OcctShape& shape, const SectionPlane& plane) {
    SectionResult result;
    result.is_closed = false;
    result.section_area = 0.0;
    result.centroid = Point3D{0, 0, 0};

    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) return result;

    try {
        // Create plane
        gp_Pln cutting_plane(to_gp_pnt(plane.point), to_gp_dir(plane.normal));

        // Create section
        BRepAlgoAPI_Section section(s, cutting_plane, Standard_False);
        section.ComputePCurveOn1(Standard_True);
        section.Approximation(Standard_True);
        section.Build();

        if (!section.IsDone()) return result;

        TopoDS_Shape section_shape = section.Shape();
        if (section_shape.IsNull()) return result;

        result.section_shape = make_shape(section_shape);

        // Compute section properties
        GProp_GProps props;
        BRepGProp::LinearProperties(section_shape, props);

        // Check if section forms closed wires
        TopExp_Explorer wire_exp(section_shape, TopAbs_WIRE);
        int wire_count = 0;
        for (; wire_exp.More(); wire_exp.Next()) {
            ++wire_count;
            const TopoDS_Wire& wire = TopoDS::Wire(wire_exp.Current());
            if (wire.Closed()) {
                result.is_closed = true;
            }
        }

        // If closed, compute area
        if (result.is_closed && wire_count > 0) {
            // Try to create a face from the wire(s)
            wire_exp.Init(section_shape, TopAbs_WIRE);
            if (wire_exp.More()) {
                const TopoDS_Wire& wire = TopoDS::Wire(wire_exp.Current());
                try {
                    BRepBuilderAPI_MakeFace face_maker(cutting_plane, wire);
                    if (face_maker.IsDone()) {
                        GProp_GProps face_props;
                        BRepGProp::SurfaceProperties(face_maker.Face(), face_props);
                        result.section_area = face_props.Mass();
                        gp_Pnt cg = face_props.CentreOfMass();
                        result.centroid = from_gp_pnt(cg);
                    }
                } catch (...) {
                    // Face creation failed
                }
            }
        }

        // Create 2D outlines
        gp_Trsf identity;
        result.outlines = edges_to_polylines(section_shape, LineType::Visible, identity);

    } catch (...) {
        // Return empty result on failure
    }

    return result;
}

SectionResult section_at_x(const OcctShape& shape, double x) {
    return section_by_plane(shape, SectionPlane{Point3D{x, 0, 0}, Vector3D{1, 0, 0}});
}

SectionResult section_at_y(const OcctShape& shape, double y) {
    return section_by_plane(shape, SectionPlane{Point3D{0, y, 0}, Vector3D{0, 1, 0}});
}

SectionResult section_at_z(const OcctShape& shape, double z) {
    return section_by_plane(shape, SectionPlane{Point3D{0, 0, z}, Vector3D{0, 0, 1}});
}

std::vector<SectionResult> sections_parallel(const OcctShape& shape, const Vector3D& normal,
                                              double start, double end, int count) {
    std::vector<SectionResult> results;
    results.reserve(count);

    if (count <= 0) return results;

    double step = (count > 1) ? (end - start) / (count - 1) : 0.0;

    for (int i = 0; i < count; ++i) {
        double offset = start + i * step;

        // Point on plane at offset distance along normal
        Point3D point{
            normal.x * offset,
            normal.y * offset,
            normal.z * offset
        };

        results.push_back(section_by_plane(shape, SectionPlane{point, normal}));
    }

    return results;
}

SectionResult section_with_shape(const OcctShape& shape1, const OcctShape& shape2) {
    SectionResult result;
    result.is_closed = false;
    result.section_area = 0.0;
    result.centroid = Point3D{0, 0, 0};

    const TopoDS_Shape& s1 = get_shape(shape1);
    const TopoDS_Shape& s2 = get_shape(shape2);

    if (s1.IsNull() || s2.IsNull()) return result;

    try {
        BRepAlgoAPI_Section section(s1, s2, Standard_False);
        section.Approximation(Standard_True);
        section.Build();

        if (section.IsDone()) {
            TopoDS_Shape section_shape = section.Shape();
            result.section_shape = make_shape(section_shape);

            gp_Trsf identity;
            result.outlines = edges_to_polylines(section_shape, LineType::Visible, identity);
        }
    } catch (...) {
        // Return empty result
    }

    return result;
}

//------------------------------------------------------------------------------
// Section View Generation
//------------------------------------------------------------------------------

SectionView generate_section_view(const OcctShape& shape, const SectionPlane& plane,
                                   ViewDirection view, const SectionViewOptions& options) {
    SectionView result;

    // Compute section
    result.section = section_by_plane(shape, plane);

    // Compute projection
    HLROptions hlr_opts;
    hlr_opts.compute_hidden = options.show_hidden;
    result.projection = compute_hlr_direction(shape, view_direction_vector(view), hlr_opts);

    // Generate hatching if requested
    if (options.show_hatching && result.section.is_closed && result.section.section_area > 0) {
        // Generate hatch lines within section
        BoundingBox3D bbox = result.projection.view_box;

        double cos_angle = std::cos(options.hatch_angle);
        double sin_angle = std::sin(options.hatch_angle);

        double diagonal = std::sqrt(
            std::pow(bbox.max.x - bbox.min.x, 2) +
            std::pow(bbox.max.y - bbox.min.y, 2)
        );

        int line_count = static_cast<int>(diagonal / options.hatch_spacing) + 1;
        double start = -diagonal / 2;

        // Simple hatch generation (actual implementation would clip to section boundary)
        for (int i = 0; i < line_count; ++i) {
            double offset = start + i * options.hatch_spacing;

            Line2D hatch;
            hatch.type = LineType::Visible;
            hatch.source_edge = -1;
            hatch.source_face = -1;

            // Line perpendicular to hatch direction at offset
            hatch.x1 = bbox.min.x + offset * cos_angle;
            hatch.y1 = bbox.min.y + offset * sin_angle;
            hatch.x2 = bbox.max.x + offset * cos_angle;
            hatch.y2 = bbox.max.y + offset * sin_angle;

            result.hatch_lines.push_back(hatch);
        }
    }

    return result;
}

//------------------------------------------------------------------------------
// Projection onto Shapes
//------------------------------------------------------------------------------

Point3D project_point_to_shape(const Point3D& point, const OcctShape& shape) {
    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) return point;

    gp_Pnt p = to_gp_pnt(point);
    gp_Pnt closest = p;
    double min_dist = std::numeric_limits<double>::max();

    // Project to faces
    TopExp_Explorer face_exp(s, TopAbs_FACE);
    for (; face_exp.More(); face_exp.Next()) {
        const TopoDS_Face& face = TopoDS::Face(face_exp.Current());
        Handle(Geom_Surface) surface = BRep_Tool::Surface(face);

        if (!surface.IsNull()) {
            GeomAPI_ProjectPointOnSurf proj(p, surface);
            if (proj.NbPoints() > 0) {
                double dist = proj.LowerDistance();
                if (dist < min_dist) {
                    min_dist = dist;
                    closest = proj.NearestPoint();
                }
            }
        }
    }

    return from_gp_pnt(closest);
}

Point3D project_point_to_plane(const Point3D& point, const SectionPlane& plane) {
    gp_Pnt p = to_gp_pnt(point);
    gp_Pln pln(to_gp_pnt(plane.point), to_gp_dir(plane.normal));

    gp_Pnt projected = pln.Location();
    double dist = pln.Distance(p);

    // Project along normal
    gp_Dir normal = pln.Axis().Direction();
    gp_Vec to_plane = gp_Vec(normal).Multiplied(dist);

    // Determine sign
    gp_Vec p_to_plane_origin(p, pln.Location());
    if (p_to_plane_origin.Dot(gp_Vec(normal)) > 0) {
        projected = p.Translated(to_plane);
    } else {
        projected = p.Translated(to_plane.Reversed());
    }

    return from_gp_pnt(projected);
}

std::unique_ptr<OcctShape> project_curve_to_surface(const OcctShape& curve, const OcctShape& surface,
                                                      const Vector3D& direction) {
    const TopoDS_Shape& c = get_shape(curve);
    const TopoDS_Shape& s = get_shape(surface);

    if (c.IsNull() || s.IsNull()) return nullptr;

    try {
        gp_Dir dir = to_gp_dir(direction);

        // Project wire/edge onto shape
        BRepProj_Projection proj(c, s, dir);

        if (proj.IsDone()) {
            return make_shape(proj.Shape());
        }
    } catch (...) {
    }

    return nullptr;
}

std::unique_ptr<OcctShape> project_wire_to_plane(const OcctShape& wire, const SectionPlane& plane,
                                                   const Vector3D& direction) {
    const TopoDS_Shape& w = get_shape(wire);
    if (w.IsNull()) return nullptr;

    try {
        // Create plane face
        gp_Pln pln(to_gp_pnt(plane.point), to_gp_dir(plane.normal));
        BRepBuilderAPI_MakeFace face_maker(pln, -1e6, 1e6, -1e6, 1e6);

        if (!face_maker.IsDone()) return nullptr;

        gp_Dir dir = to_gp_dir(direction);
        BRepProj_Projection proj(w, face_maker.Face(), dir);

        if (proj.IsDone()) {
            return make_shape(proj.Shape());
        }
    } catch (...) {
    }

    return nullptr;
}

std::unique_ptr<OcctShape> project_shape_to_plane(const OcctShape& shape, const SectionPlane& plane,
                                                    const Vector3D& direction) {
    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) return nullptr;

    try {
        // Create plane face
        gp_Pln pln(to_gp_pnt(plane.point), to_gp_dir(plane.normal));
        BRepBuilderAPI_MakeFace face_maker(pln, -1e6, 1e6, -1e6, 1e6);

        if (!face_maker.IsDone()) return nullptr;

        gp_Dir dir = to_gp_dir(direction);

        // Collect all edges and project
        BRep_Builder builder;
        TopoDS_Compound result_compound;
        builder.MakeCompound(result_compound);

        TopExp_Explorer edge_exp(s, TopAbs_EDGE);
        for (; edge_exp.More(); edge_exp.Next()) {
            try {
                BRepProj_Projection proj(edge_exp.Current(), face_maker.Face(), dir);
                if (proj.IsDone() && !proj.Shape().IsNull()) {
                    builder.Add(result_compound, proj.Shape());
                }
            } catch (...) {
                // Skip failed projections
            }
        }

        return make_shape(result_compound);
    } catch (...) {
    }

    return nullptr;
}

//------------------------------------------------------------------------------
// Silhouette and Outline
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> extract_silhouette(const OcctShape& shape, const Vector3D& view_direction) {
    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) return nullptr;

    try {
        HLRAlgo_Projector projector = create_projector(view_direction, Point3D{0, 0, 0}, false);

        Handle(HLRBRep_Algo) hlr = new HLRBRep_Algo();
        hlr->Add(s);
        hlr->Projector(projector);
        hlr->Update();
        hlr->Hide();

        HLRBRep_HLRToShape hlr_to_shape(hlr);

        TopoDS_Shape outline = hlr_to_shape.OutLineVCompound();
        if (!outline.IsNull()) {
            return make_shape(outline);
        }
    } catch (...) {
    }

    return nullptr;
}

std::unique_ptr<OcctShape> extract_sharp_edges(const OcctShape& shape, double angle_threshold) {
    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) return nullptr;

    BRep_Builder builder;
    TopoDS_Compound result;
    builder.MakeCompound(result);

    // Iterate all edges and check dihedral angle
    TopExp_Explorer edge_exp(s, TopAbs_EDGE);
    for (; edge_exp.More(); edge_exp.Next()) {
        const TopoDS_Edge& edge = TopoDS::Edge(edge_exp.Current());

        // Find adjacent faces
        TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
        TopExp::MapShapesAndAncestors(s, TopAbs_EDGE, TopAbs_FACE, edge_face_map);

        const TopTools_ListOfShape& faces = edge_face_map.FindFromKey(edge);

        if (faces.Extent() == 2) {
            // Edge is shared by two faces - check angle
            TopTools_ListIteratorOfListOfShape it(faces);
            const TopoDS_Face& f1 = TopoDS::Face(it.Value());
            it.Next();
            const TopoDS_Face& f2 = TopoDS::Face(it.Value());

            // Get face normals at edge midpoint
            double first, last;
            Handle(Geom_Curve) curve = BRep_Tool::Curve(edge, first, last);
            if (!curve.IsNull()) {
                gp_Pnt mid_point = curve->Value((first + last) / 2.0);

                Handle(Geom_Surface) surf1 = BRep_Tool::Surface(f1);
                Handle(Geom_Surface) surf2 = BRep_Tool::Surface(f2);

                if (!surf1.IsNull() && !surf2.IsNull()) {
                    // Get normals at this point
                    GeomAPI_ProjectPointOnSurf proj1(mid_point, surf1);
                    GeomAPI_ProjectPointOnSurf proj2(mid_point, surf2);

                    if (proj1.NbPoints() > 0 && proj2.NbPoints() > 0) {
                        double u1, v1, u2, v2;
                        proj1.LowerDistanceParameters(u1, v1);
                        proj2.LowerDistanceParameters(u2, v2);

                        gp_Vec d1u, d1v, d2u, d2v;
                        gp_Pnt p1, p2;
                        surf1->D1(u1, v1, p1, d1u, d1v);
                        surf2->D1(u2, v2, p2, d2u, d2v);

                        gp_Vec n1 = d1u.Crossed(d1v);
                        gp_Vec n2 = d2u.Crossed(d2v);

                        if (n1.Magnitude() > 1e-10 && n2.Magnitude() > 1e-10) {
                            double angle = n1.Angle(n2);
                            if (angle > angle_threshold) {
                                builder.Add(result, edge);
                            }
                        }
                    }
                }
            }
        } else if (faces.Extent() == 1) {
            // Boundary edge - always add
            builder.Add(result, edge);
        }
    }

    return make_shape(result);
}

std::unique_ptr<OcctShape> extract_outline(const OcctShape& shape, const Vector3D& view_direction) {
    return extract_silhouette(shape, view_direction);
}

FeatureEdges extract_feature_edges(const OcctShape& shape, const Vector3D& view_direction,
                                    double crease_angle) {
    FeatureEdges result;

    // Sharp edges
    result.sharp_edges = extract_sharp_edges(shape, crease_angle);

    // Boundary edges
    const TopoDS_Shape& s = get_shape(shape);
    if (!s.IsNull()) {
        BRep_Builder builder;
        TopoDS_Compound boundary;
        builder.MakeCompound(boundary);

        TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
        TopExp::MapShapesAndAncestors(s, TopAbs_EDGE, TopAbs_FACE, edge_face_map);

        for (int i = 1; i <= edge_face_map.Extent(); ++i) {
            const TopoDS_Edge& edge = TopoDS::Edge(edge_face_map.FindKey(i));
            const TopTools_ListOfShape& faces = edge_face_map.FindFromIndex(i);

            if (faces.Extent() == 1) {
                builder.Add(boundary, edge);
            }
        }

        result.boundary_edges = make_shape(boundary);
    }

    // Silhouette edges
    result.silhouette_edges = extract_silhouette(shape, view_direction);

    // Crease edges (same as sharp for now)
    result.crease_edges = extract_sharp_edges(shape, crease_angle);

    return result;
}

//------------------------------------------------------------------------------
// Dimension Extraction
//------------------------------------------------------------------------------

std::vector<ExtractedDimension> extract_dimensions(const HLRResult& projection,
                                                     const OcctShape& original_shape) {
    std::vector<ExtractedDimension> dims;

    // Extract linear dimensions from straight edges
    for (const auto& curve : projection.curves) {
        if (curve.points.size() >= 2 &&
            (curve.type == LineType::VisibleSharp || curve.type == LineType::Visible)) {

            // Check if it's a straight line
            const auto& p1 = curve.points.front();
            const auto& p2 = curve.points.back();

            double dx = p2.first - p1.first;
            double dy = p2.second - p1.second;
            double length = std::sqrt(dx * dx + dy * dy);

            if (length > 1.0) {  // Minimum dimension threshold
                ExtractedDimension dim;
                dim.type = ExtractedDimension::Type::Linear;
                dim.point1 = Point3D{p1.first, p1.second, 0};
                dim.point2 = Point3D{p2.first, p2.second, 0};
                dim.dimension_point = Point3D{
                    (p1.first + p2.first) / 2.0,
                    (p1.second + p2.second) / 2.0 + 5.0,  // Offset for text
                    0
                };
                dim.value = length;
                dim.unit = "mm";
                dims.push_back(dim);
            }
        }
    }

    return dims;
}

std::vector<ExtractedDimension> extract_hole_dimensions(const OcctShape& shape,
                                                          const Vector3D& view_direction) {
    std::vector<ExtractedDimension> dims;

    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) return dims;

    // Find cylindrical faces (potential holes)
    TopExp_Explorer face_exp(s, TopAbs_FACE);
    for (; face_exp.More(); face_exp.Next()) {
        const TopoDS_Face& face = TopoDS::Face(face_exp.Current());
        Handle(Geom_Surface) surface = BRep_Tool::Surface(face);

        if (!surface.IsNull() && surface->IsKind(STANDARD_TYPE(Geom_CylindricalSurface))) {
            Handle(Geom_CylindricalSurface) cyl = Handle(Geom_CylindricalSurface)::DownCast(surface);

            double radius = cyl->Radius();
            gp_Ax3 axis = cyl->Position();

            ExtractedDimension dim;
            dim.type = ExtractedDimension::Type::Diameter;
            dim.value = radius * 2.0;
            dim.unit = "mm";

            gp_Pnt center = axis.Location();
            dim.point1 = from_gp_pnt(center);
            dim.point2 = dim.point1;
            dim.dimension_point = from_gp_pnt(center);

            dims.push_back(dim);
        }
    }

    return dims;
}

//------------------------------------------------------------------------------
// Unfolding
//------------------------------------------------------------------------------

bool can_unfold(const OcctShape& shape) {
    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) return false;

    // Check if all faces are planar or cylindrical (developable)
    TopExp_Explorer face_exp(s, TopAbs_FACE);
    for (; face_exp.More(); face_exp.Next()) {
        const TopoDS_Face& face = TopoDS::Face(face_exp.Current());
        Handle(Geom_Surface) surface = BRep_Tool::Surface(face);

        if (surface.IsNull()) return false;

        // Check if surface is developable
        if (!surface->IsKind(STANDARD_TYPE(Geom_Plane)) &&
            !surface->IsKind(STANDARD_TYPE(Geom_CylindricalSurface)) &&
            !surface->IsKind(STANDARD_TYPE(Geom_ConicalSurface))) {
            return false;
        }
    }

    return true;
}

UnfoldResult unfold_sheet(const OcctShape& shape, double thickness, double k_factor) {
    UnfoldResult result;
    result.success = false;
    result.flat_area = 0.0;

    if (!can_unfold(shape)) {
        result.error_message = "Shape contains non-developable surfaces";
        return result;
    }

    const TopoDS_Shape& s = get_shape(shape);
    if (s.IsNull()) {
        result.error_message = "Invalid shape";
        return result;
    }

    // Basic unfolding algorithm
    // For a complete implementation, this would use a proper sheet metal unfolding library

    BRep_Builder builder;
    TopoDS_Compound flat_pattern;
    builder.MakeCompound(flat_pattern);

    double total_area = 0.0;

    TopExp_Explorer face_exp(s, TopAbs_FACE);
    for (; face_exp.More(); face_exp.Next()) {
        const TopoDS_Face& face = TopoDS::Face(face_exp.Current());

        GProp_GProps props;
        BRepGProp::SurfaceProperties(face, props);
        total_area += props.Mass();

        // For planar faces, add directly to flat pattern
        Handle(Geom_Surface) surface = BRep_Tool::Surface(face);
        if (surface->IsKind(STANDARD_TYPE(Geom_Plane))) {
            builder.Add(flat_pattern, face);
        }
        // Cylindrical/conical faces would need to be unrolled
    }

    result.flat_pattern = make_shape(flat_pattern);
    result.flat_area = total_area;
    result.success = true;

    return result;
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

std::string hlr_to_svg_path(const HLRResult& hlr, bool visible_only) {
    std::ostringstream svg;
    svg << std::fixed << std::setprecision(3);

    // Process polylines
    for (const auto& curve : hlr.curves) {
        if (visible_only) {
            if (curve.type == LineType::Hidden ||
                curve.type == LineType::HiddenSharp ||
                curve.type == LineType::HiddenSmooth ||
                curve.type == LineType::HiddenOutline ||
                curve.type == LineType::HiddenSewn) {
                continue;
            }
        }

        if (curve.points.size() < 2) continue;

        svg << "M " << curve.points[0].first << " " << curve.points[0].second;
        for (size_t i = 1; i < curve.points.size(); ++i) {
            svg << " L " << curve.points[i].first << " " << curve.points[i].second;
        }
        svg << " ";
    }

    // Process simple lines
    for (const auto& line : hlr.lines) {
        if (visible_only) {
            if (line.type == LineType::Hidden ||
                line.type == LineType::HiddenSharp ||
                line.type == LineType::HiddenSmooth ||
                line.type == LineType::HiddenOutline ||
                line.type == LineType::HiddenSewn) {
                continue;
            }
        }

        svg << "M " << line.x1 << " " << line.y1
            << " L " << line.x2 << " " << line.y2 << " ";
    }

    return svg.str();
}

std::string hlr_to_dxf(const HLRResult& hlr) {
    std::ostringstream dxf;
    dxf << std::fixed << std::setprecision(6);

    // DXF header
    dxf << "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
    dxf << "0\nSECTION\n2\nENTITIES\n";

    // Process lines
    for (const auto& line : hlr.lines) {
        dxf << "0\nLINE\n";
        dxf << "8\n";

        // Layer name based on line type
        switch (line.type) {
            case LineType::Hidden:
            case LineType::HiddenSharp:
            case LineType::HiddenSmooth:
            case LineType::HiddenOutline:
                dxf << "HIDDEN\n";
                break;
            default:
                dxf << "VISIBLE\n";
                break;
        }

        dxf << "10\n" << line.x1 << "\n";
        dxf << "20\n" << line.y1 << "\n";
        dxf << "30\n0.0\n";
        dxf << "11\n" << line.x2 << "\n";
        dxf << "21\n" << line.y2 << "\n";
        dxf << "31\n0.0\n";
    }

    // Process polylines
    for (const auto& curve : hlr.curves) {
        if (curve.points.size() < 2) continue;

        dxf << "0\nLWPOLYLINE\n";
        dxf << "8\n";

        switch (curve.type) {
            case LineType::Hidden:
            case LineType::HiddenSharp:
            case LineType::HiddenSmooth:
            case LineType::HiddenOutline:
                dxf << "HIDDEN\n";
                break;
            default:
                dxf << "VISIBLE\n";
                break;
        }

        dxf << "90\n" << curve.points.size() << "\n";
        dxf << "70\n0\n";  // Not closed

        for (const auto& pt : curve.points) {
            dxf << "10\n" << pt.first << "\n";
            dxf << "20\n" << pt.second << "\n";
        }
    }

    dxf << "0\nENDSEC\n0\nEOF\n";

    return dxf.str();
}

HLRResult fit_to_view(const HLRResult& hlr, double width, double height, double margin) {
    HLRResult result = hlr;

    // Find current bounds
    double minx = std::numeric_limits<double>::max();
    double miny = std::numeric_limits<double>::max();
    double maxx = std::numeric_limits<double>::lowest();
    double maxy = std::numeric_limits<double>::lowest();

    for (const auto& curve : hlr.curves) {
        for (const auto& pt : curve.points) {
            minx = std::min(minx, pt.first);
            miny = std::min(miny, pt.second);
            maxx = std::max(maxx, pt.first);
            maxy = std::max(maxy, pt.second);
        }
    }

    for (const auto& line : hlr.lines) {
        minx = std::min(minx, std::min(line.x1, line.x2));
        miny = std::min(miny, std::min(line.y1, line.y2));
        maxx = std::max(maxx, std::max(line.x1, line.x2));
        maxy = std::max(maxy, std::max(line.y1, line.y2));
    }

    if (minx > maxx || miny > maxy) return result;

    // Compute scale and offset
    double data_width = maxx - minx;
    double data_height = maxy - miny;

    double available_width = width - 2 * margin;
    double available_height = height - 2 * margin;

    double scale = std::min(available_width / data_width, available_height / data_height);

    double offset_x = margin + (available_width - data_width * scale) / 2.0 - minx * scale;
    double offset_y = margin + (available_height - data_height * scale) / 2.0 - miny * scale;

    // Transform all points
    for (auto& curve : result.curves) {
        for (auto& pt : curve.points) {
            pt.first = pt.first * scale + offset_x;
            pt.second = pt.second * scale + offset_y;
        }
    }

    for (auto& line : result.lines) {
        line.x1 = line.x1 * scale + offset_x;
        line.y1 = line.y1 * scale + offset_y;
        line.x2 = line.x2 * scale + offset_x;
        line.y2 = line.y2 * scale + offset_y;
    }

    result.scale = scale;
    result.view_box = BoundingBox3D{
        Point3D{0, 0, 0},
        Point3D{width, height, 0}
    };

    return result;
}

HLRResult merge_hlr(const std::vector<HLRResult>& results) {
    HLRResult merged;

    for (const auto& hlr : results) {
        merged.lines.insert(merged.lines.end(), hlr.lines.begin(), hlr.lines.end());
        merged.curves.insert(merged.curves.end(), hlr.curves.begin(), hlr.curves.end());
    }

    // Compute combined bounding box
    if (!results.empty()) {
        double minx = std::numeric_limits<double>::max();
        double miny = std::numeric_limits<double>::max();
        double minz = std::numeric_limits<double>::max();
        double maxx = std::numeric_limits<double>::lowest();
        double maxy = std::numeric_limits<double>::lowest();
        double maxz = std::numeric_limits<double>::lowest();

        for (const auto& hlr : results) {
            minx = std::min(minx, hlr.view_box.min.x);
            miny = std::min(miny, hlr.view_box.min.y);
            minz = std::min(minz, hlr.view_box.min.z);
            maxx = std::max(maxx, hlr.view_box.max.x);
            maxy = std::max(maxy, hlr.view_box.max.y);
            maxz = std::max(maxz, hlr.view_box.max.z);
        }

        merged.view_box = BoundingBox3D{
            Point3D{minx, miny, minz},
            Point3D{maxx, maxy, maxz}
        };
    }

    merged.scale = 1.0;
    return merged;
}

HLRResult simplify_hlr(const HLRResult& hlr, double min_length) {
    HLRResult result;
    result.view_box = hlr.view_box;
    result.scale = hlr.scale;

    // Filter lines
    for (const auto& line : hlr.lines) {
        double dx = line.x2 - line.x1;
        double dy = line.y2 - line.y1;
        double length = std::sqrt(dx * dx + dy * dy);

        if (length >= min_length) {
            result.lines.push_back(line);
        }
    }

    // Filter curves
    for (const auto& curve : hlr.curves) {
        if (curve.points.size() < 2) continue;

        // Compute curve length
        double total_length = 0;
        for (size_t i = 1; i < curve.points.size(); ++i) {
            double dx = curve.points[i].first - curve.points[i-1].first;
            double dy = curve.points[i].second - curve.points[i-1].second;
            total_length += std::sqrt(dx * dx + dy * dy);
        }

        if (total_length >= min_length) {
            result.curves.push_back(curve);
        }
    }

    return result;
}

} // namespace cadhy::projection
