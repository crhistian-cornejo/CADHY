#!/usr/bin/env python3
"""
LLDB Rust Debug Helpers for CADHY

Provides LLDB commands and pretty printers for debugging Rust code.
Useful for debugging the Tauri backend and CAD kernel.

Usage in LLDB:
  command script import tools/debug/lldb_rust.py

Or add to ~/.lldbinit:
  command script import /path/to/cadhy/tools/debug/lldb_rust.py
"""

import lldb


def __lldb_init_module(debugger, internal_dict):
    """Initialize LLDB module with custom commands."""
    debugger.HandleCommand('command script add -f lldb_rust.rust_backtrace rust_bt')
    debugger.HandleCommand('command script add -f lldb_rust.show_vec show_vec')
    debugger.HandleCommand('command script add -f lldb_rust.show_string show_str')
    debugger.HandleCommand('command script add -f lldb_rust.cadhy_shapes cadhy_shapes')
    print("CADHY Rust debug helpers loaded. Commands: rust_bt, show_vec, show_str, cadhy_shapes")


def rust_backtrace(debugger, command, result, internal_dict):
    """
    Show a cleaned up Rust backtrace without runtime noise.

    Usage: rust_bt
    """
    target = debugger.GetSelectedTarget()
    process = target.GetProcess()
    thread = process.GetSelectedThread()

    result.AppendMessage("Rust Backtrace (filtered):")
    result.AppendMessage("=" * 60)

    frame_num = 0
    for frame in thread:
        name = frame.GetFunctionName()

        # Skip Rust runtime frames
        if name and not any(skip in name for skip in [
            'std::rt::',
            'std::panicking::',
            'std::sys::',
            'core::ops::function::',
            '__rust_begin_short_backtrace',
            '__rust_end_short_backtrace',
            'start_thread',
            'clone',
        ]):
            # Get source location
            line_entry = frame.GetLineEntry()
            if line_entry.IsValid():
                file_spec = line_entry.GetFileSpec()
                filename = file_spec.GetFilename()
                line = line_entry.GetLine()
                location = f"{filename}:{line}"
            else:
                location = "??"

            result.AppendMessage(f"  {frame_num}: {name}")
            result.AppendMessage(f"      at {location}")
            frame_num += 1


def show_vec(debugger, command, result, internal_dict):
    """
    Pretty print a Rust Vec<T>.

    Usage: show_vec <variable>
    Example: show_vec my_vector
    """
    target = debugger.GetSelectedTarget()
    process = target.GetProcess()
    thread = process.GetSelectedThread()
    frame = thread.GetSelectedFrame()

    if not command:
        result.AppendMessage("Usage: show_vec <variable>")
        return

    var = frame.FindVariable(command.strip())
    if not var.IsValid():
        result.AppendMessage(f"Variable '{command}' not found")
        return

    # Vec structure: { buf: RawVec { ptr: Unique { pointer: *const T }, cap }, len }
    len_val = var.GetChildMemberWithName("len")
    if len_val.IsValid():
        length = len_val.GetValueAsUnsigned()
        result.AppendMessage(f"Vec (len={length}):")

        buf = var.GetChildMemberWithName("buf")
        if buf.IsValid():
            ptr = buf.GetChildMemberWithName("ptr")
            if ptr.IsValid():
                for i in range(min(length, 20)):  # Limit to 20 elements
                    elem = ptr.GetChildAtIndex(i)
                    if elem.IsValid():
                        result.AppendMessage(f"  [{i}]: {elem.GetValue()}")

                if length > 20:
                    result.AppendMessage(f"  ... ({length - 20} more elements)")


def show_string(debugger, command, result, internal_dict):
    """
    Pretty print a Rust String or &str.

    Usage: show_str <variable>
    """
    target = debugger.GetSelectedTarget()
    process = target.GetProcess()
    thread = process.GetSelectedThread()
    frame = thread.GetSelectedFrame()

    if not command:
        result.AppendMessage("Usage: show_str <variable>")
        return

    var = frame.FindVariable(command.strip())
    if not var.IsValid():
        result.AppendMessage(f"Variable '{command}' not found")
        return

    # Try to get string data
    vec = var.GetChildMemberWithName("vec")
    if vec.IsValid():
        # It's a String
        len_val = vec.GetChildMemberWithName("len")
        buf = vec.GetChildMemberWithName("buf")
        if len_val.IsValid() and buf.IsValid():
            length = len_val.GetValueAsUnsigned()
            result.AppendMessage(f"String (len={length}): \"{var.GetSummary()}\"")
    else:
        # It might be a &str
        result.AppendMessage(f"str: {var.GetSummary()}")


def cadhy_shapes(debugger, command, result, internal_dict):
    """
    List all CAD shapes in the current scope.

    Usage: cadhy_shapes
    """
    target = debugger.GetSelectedTarget()
    process = target.GetProcess()
    thread = process.GetSelectedThread()
    frame = thread.GetSelectedFrame()

    result.AppendMessage("CADHY Shapes in scope:")
    result.AppendMessage("=" * 60)

    # Look for common CAD types
    cad_types = ['Shape', 'TopoDS_Shape', 'BRepShape', 'Solid', 'Face', 'Edge', 'Vertex']

    found = False
    for var in frame.GetVariables(True, True, True, True):
        type_name = var.GetTypeName()
        if any(t in type_name for t in cad_types):
            result.AppendMessage(f"  {var.GetName()}: {type_name}")
            found = True

    if not found:
        result.AppendMessage("  (no CAD shapes found in current scope)")
