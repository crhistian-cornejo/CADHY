/**
 * @file boolean.cpp
 * @brief Implementation of boolean operations
 *
 * Uses OpenCASCADE BRepAlgoAPI for solid boolean operations.
 */

#include <cadhy/boolean/boolean.hpp>

#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepAlgoAPI_Section.hxx>
#include <BRepAlgoAPI_Splitter.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <ShapeUpgrade_UnifySameDomain.hxx>
#include <ShapeFix_Shape.hxx>
#include <TopTools_ListOfShape.hxx>
#include <BOPAlgo_PaveFiller.hxx>
#include <BOPAlgo_MakerVolume.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Compound.hxx>
#include <BRep_Builder.hxx>
#include <TopExp_Explorer.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <gp_Pln.hxx>
#include <BRepPrimAPI_MakeHalfSpace.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>

namespace cadhy::boolean {

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

namespace {

/// Apply boolean options to operation
template<typename T>
void apply_options(T& op, const BooleanOptions& options) {
    op.SetFuzzyValue(options.fuzzy_tolerance);
    op.SetRunParallel(options.parallel);
    op.SetNonDestructive(options.non_destructive);

    if (options.check_inverted) {
        op.SetCheckInverted(true);
    }

    if (options.glue) {
        op.SetGlue(BOPAlgo_GlueShift);
    }
}

/// Validate and clean result
std::unique_ptr<OcctShape> finalize_result(const TopoDS_Shape& result) {
    if (result.IsNull()) {
        return nullptr;
    }

    // Unify same domain faces to clean up result
    ShapeUpgrade_UnifySameDomain unifier(result);
    unifier.Build();

    TopoDS_Shape final_shape = unifier.Shape().IsNull() ? result : unifier.Shape();

    return std::make_unique<OcctShape>(final_shape);
}

/// Get const reference to underlying shape
inline const TopoDS_Shape& get_shape(const OcctShape& s) {
    return s.get();
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Basic Boolean Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> fuse(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    BRepAlgoAPI_Fuse op(get_shape(shape1), get_shape(shape2));
    op.Build();
    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

std::unique_ptr<OcctShape> fuse_with_options(
    const OcctShape& shape1,
    const OcctShape& shape2,
    const BooleanOptions& options
) {
    TopTools_ListOfShape args, tools;
    args.Append(get_shape(shape1));
    tools.Append(get_shape(shape2));

    BRepAlgoAPI_Fuse op;
    op.SetArguments(args);
    op.SetTools(tools);
    apply_options(op, options);
    op.Build();

    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

std::unique_ptr<OcctShape> cut(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    BRepAlgoAPI_Cut op(get_shape(shape1), get_shape(shape2));
    op.Build();
    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

std::unique_ptr<OcctShape> cut_with_options(
    const OcctShape& shape1,
    const OcctShape& shape2,
    const BooleanOptions& options
) {
    TopTools_ListOfShape args, tools;
    args.Append(get_shape(shape1));
    tools.Append(get_shape(shape2));

    BRepAlgoAPI_Cut op;
    op.SetArguments(args);
    op.SetTools(tools);
    apply_options(op, options);
    op.Build();

    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

std::unique_ptr<OcctShape> common(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    BRepAlgoAPI_Common op(get_shape(shape1), get_shape(shape2));
    op.Build();
    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

std::unique_ptr<OcctShape> common_with_options(
    const OcctShape& shape1,
    const OcctShape& shape2,
    const BooleanOptions& options
) {
    TopTools_ListOfShape args, tools;
    args.Append(get_shape(shape1));
    tools.Append(get_shape(shape2));

    BRepAlgoAPI_Common op;
    op.SetArguments(args);
    op.SetTools(tools);
    apply_options(op, options);
    op.Build();

    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

//------------------------------------------------------------------------------
// Multi-Shape Boolean Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> fuse_many(
    const std::vector<const OcctShape*>& shapes
) {
    if (shapes.empty()) return nullptr;
    if (shapes.size() == 1 && shapes[0]) {
        return std::make_unique<OcctShape>(get_shape(*shapes[0]));
    }

    TopTools_ListOfShape args;
    for (const auto* s : shapes) {
        if (s && !s->is_null()) {
            args.Append(get_shape(*s));
        }
    }

    if (args.Size() < 2) return nullptr;

    // Use first shape as argument, rest as tools
    TopTools_ListOfShape tools;
    auto it = args.cbegin();
    TopoDS_Shape first_shape = *it;
    ++it;

    TopTools_ListOfShape first_list;
    first_list.Append(first_shape);

    while (it != args.cend()) {
        tools.Append(*it);
        ++it;
    }

    BRepAlgoAPI_Fuse op;
    op.SetArguments(first_list);
    op.SetTools(tools);
    op.SetRunParallel(true);
    op.Build();

    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

std::unique_ptr<OcctShape> cut_many(
    const OcctShape& base,
    const std::vector<const OcctShape*>& tools
) {
    if (base.is_null() || tools.empty()) return nullptr;

    TopTools_ListOfShape base_list, tool_list;
    base_list.Append(get_shape(base));

    for (const auto* t : tools) {
        if (t && !t->is_null()) {
            tool_list.Append(get_shape(*t));
        }
    }

    if (tool_list.IsEmpty()) return nullptr;

    BRepAlgoAPI_Cut op;
    op.SetArguments(base_list);
    op.SetTools(tool_list);
    op.SetRunParallel(true);
    op.Build();

    if (!op.IsDone() || op.HasErrors()) {
        return nullptr;
    }
    return finalize_result(op.Shape());
}

std::unique_ptr<OcctShape> common_many(
    const std::vector<const OcctShape*>& shapes
) {
    if (shapes.size() < 2) return nullptr;

    std::unique_ptr<OcctShape> result;
    for (size_t i = 0; i < shapes.size(); ++i) {
        if (!shapes[i] || shapes[i]->is_null()) continue;

        if (!result) {
            result = std::make_unique<OcctShape>(get_shape(*shapes[i]));
        } else {
            result = common(*result, *shapes[i]);
            if (!result) return nullptr;
        }
    }
    return result;
}

//------------------------------------------------------------------------------
// Section Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> section(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    BRepAlgoAPI_Section op(get_shape(shape1), get_shape(shape2));
    op.ComputePCurveOn1(Standard_True);
    op.Approximation(Standard_True);
    op.Build();

    if (!op.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(op.Shape());
}

std::unique_ptr<OcctShape> section_with_plane(
    const OcctShape& shape,
    const Point3D& plane_origin,
    const Vector3D& plane_normal
) {
    gp_Pln plane(plane_origin.to_gp_pnt(), plane_normal.to_gp_dir());

    BRepAlgoAPI_Section op(get_shape(shape), plane, Standard_False);
    op.ComputePCurveOn1(Standard_True);
    op.Approximation(Standard_True);
    op.Build();

    if (!op.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(op.Shape());
}

std::vector<std::unique_ptr<OcctShape>> multi_section(
    const OcctShape& shape,
    const Vector3D& direction,
    double spacing,
    int count
) {
    std::vector<std::unique_ptr<OcctShape>> results;
    results.reserve(count);

    Vector3D norm_dir = direction.normalized();

    for (int i = 0; i < count; ++i) {
        double offset = i * spacing;
        Point3D origin{
            norm_dir.x * offset,
            norm_dir.y * offset,
            norm_dir.z * offset
        };

        auto sect = section_with_plane(shape, origin, norm_dir);
        if (sect) {
            results.push_back(std::move(sect));
        }
    }

    return results;
}

//------------------------------------------------------------------------------
// Split Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> split(
    const OcctShape& shape,
    const std::vector<const OcctShape*>& tools
) {
    TopTools_ListOfShape args, tool_list;
    args.Append(get_shape(shape));

    for (const auto* t : tools) {
        if (t && !t->is_null()) {
            tool_list.Append(get_shape(*t));
        }
    }

    if (tool_list.IsEmpty()) return nullptr;

    BRepAlgoAPI_Splitter splitter;
    splitter.SetArguments(args);
    splitter.SetTools(tool_list);
    splitter.SetRunParallel(true);
    splitter.Build();

    if (!splitter.IsDone() || splitter.HasErrors()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(splitter.Shape());
}

std::unique_ptr<OcctShape> split_with_plane(
    const OcctShape& shape,
    const Point3D& plane_origin,
    const Vector3D& plane_normal
) {
    gp_Pln plane(plane_origin.to_gp_pnt(), plane_normal.to_gp_dir());
    BRepBuilderAPI_MakeFace face_maker(plane, -1e6, 1e6, -1e6, 1e6);

    if (!face_maker.IsDone()) return nullptr;

    TopTools_ListOfShape args, tools;
    args.Append(get_shape(shape));
    tools.Append(face_maker.Face());

    BRepAlgoAPI_Splitter splitter;
    splitter.SetArguments(args);
    splitter.SetTools(tools);
    splitter.SetRunParallel(true);
    splitter.Build();

    if (!splitter.IsDone() || splitter.HasErrors()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(splitter.Shape());
}

std::vector<std::unique_ptr<OcctShape>> split_to_parts(
    const OcctShape& shape,
    const OcctShape& tool
) {
    std::vector<std::unique_ptr<OcctShape>> results;

    auto split_result = split(shape, {&tool});
    if (!split_result) return results;

    // Extract individual solids
    TopExp_Explorer exp(get_shape(*split_result), TopAbs_SOLID);
    for (; exp.More(); exp.Next()) {
        results.push_back(std::make_unique<OcctShape>(exp.Current()));
    }

    // If no solids found, try shells
    if (results.empty()) {
        TopExp_Explorer shell_exp(get_shape(*split_result), TopAbs_SHELL);
        for (; shell_exp.More(); shell_exp.Next()) {
            results.push_back(std::make_unique<OcctShape>(shell_exp.Current()));
        }
    }

    return results;
}

//------------------------------------------------------------------------------
// Volume Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_volume(
    const std::vector<const OcctShape*>& shells
) {
    TopTools_ListOfShape shell_list;
    for (const auto* s : shells) {
        if (s && !s->is_null()) {
            shell_list.Append(get_shape(*s));
        }
    }

    if (shell_list.IsEmpty()) return nullptr;

    BOPAlgo_MakerVolume maker;
    maker.SetArguments(shell_list);
    maker.SetRunParallel(true);
    maker.Perform();

    if (maker.HasErrors()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> fill_between(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    // Simple implementation: create a compound and make volume
    std::vector<const OcctShape*> shapes = {&shape1, &shape2};
    return make_volume(shapes);
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

bool shapes_intersect(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    BRepExtrema_DistShapeShape dist(get_shape(shape1), get_shape(shape2));
    dist.Perform();

    if (!dist.IsDone()) return false;

    // If distance is very small, shapes are touching or intersecting
    return dist.Value() < TOLERANCE;
}

IntersectionType get_intersection_type(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    // Quick distance check first
    BRepExtrema_DistShapeShape dist(get_shape(shape1), get_shape(shape2));
    dist.Perform();

    if (!dist.IsDone()) return IntersectionType::None;

    double min_dist = dist.Value();

    // Shapes don't touch
    if (min_dist > TOLERANCE) {
        return IntersectionType::None;
    }

    // Try common operation
    auto common_result = common(shape1, shape2);
    if (!common_result || common_result->is_null()) {
        return IntersectionType::Touch;
    }

    // Calculate volumes
    GProp_GProps props1, props2, props_common;
    BRepGProp::VolumeProperties(get_shape(shape1), props1);
    BRepGProp::VolumeProperties(get_shape(shape2), props2);
    BRepGProp::VolumeProperties(get_shape(*common_result), props_common);

    double vol1 = props1.Mass();
    double vol2 = props2.Mass();
    double vol_common = props_common.Mass();

    // Check for containment
    if (vol_common > 0) {
        if (std::abs(vol_common - vol1) < TOLERANCE * vol1) {
            return IntersectionType::Contained;  // Shape1 contained in shape2
        }
        if (std::abs(vol_common - vol2) < TOLERANCE * vol2) {
            return IntersectionType::Contains;  // Shape1 contains shape2
        }
        return IntersectionType::Overlap;
    }

    return IntersectionType::Touch;
}

bool can_perform_boolean(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    // Check if shapes are valid
    if (shape1.is_null() || shape2.is_null()) return false;

    BRepCheck_Analyzer analyzer1(get_shape(shape1));
    BRepCheck_Analyzer analyzer2(get_shape(shape2));

    return analyzer1.IsValid() && analyzer2.IsValid();
}

} // namespace cadhy::boolean
