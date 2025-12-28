/**
 * @fileoverview Space File Browser - File browser component
 * @module editors/space_file
 */

import { Button, Input, ScrollArea } from "@cadhy/ui"
import {
  Delete02Icon,
  File01Icon,
  Folder01Icon,
  GridIcon,
  Menu02Icon,
  RefreshIcon,
  Search01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo } from "react"

import { useFileBrowserStore } from "./SF_store"
import type { FileEntry, FileType, SortField, ViewMode } from "./SF_types"
import { formatFileSize, isCADFile } from "./SF_types"

// ============================================================================
// FILE ICON COMPONENT
// ============================================================================

interface FileIconProps {
  type: FileType
  size?: number
}

function FileIcon({ type, size = 24 }: FileIconProps) {
  const iconClass = `w-${size / 4} h-${size / 4}`

  switch (type) {
    case "folder":
      return <HugeiconsIcon icon={Folder01Icon} className={iconClass} />
    case "cad_project":
      return (
        <div
          className={`${iconClass} bg-primary/20 rounded flex items-center justify-center text-xs font-bold text-primary`}
        >
          CD
        </div>
      )
    case "step":
    case "iges":
    case "brep":
      return (
        <div
          className={`${iconClass} bg-blue-500/20 rounded flex items-center justify-center text-xs font-bold text-blue-500`}
        >
          3D
        </div>
      )
    case "stl":
    case "obj":
    case "gltf":
      return (
        <div
          className={`${iconClass} bg-green-500/20 rounded flex items-center justify-center text-xs font-bold text-green-500`}
        >
          M
        </div>
      )
    default:
      return <HugeiconsIcon icon={File01Icon} className={iconClass} />
  }
}

// ============================================================================
// FILE ENTRY COMPONENT
// ============================================================================

interface FileEntryItemProps {
  entry: FileEntry
  isSelected: boolean
  viewMode: ViewMode
  onSelect: (additive: boolean) => void
  onOpen: () => void
}

function FileEntryItem({ entry, isSelected, viewMode, onSelect, onOpen }: FileEntryItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(e.ctrlKey || e.metaKey)
  }

  const handleDoubleClick = () => {
    onOpen()
  }

  if (viewMode === "grid") {
    return (
      <div
        className={`flex flex-col items-center p-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
          isSelected ? "bg-accent ring-2 ring-primary" : ""
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div className="w-12 h-12 flex items-center justify-center mb-2">
          {entry.thumbnailUrl ? (
            <img
              src={entry.thumbnailUrl}
              alt={entry.name}
              className="max-w-full max-h-full object-contain rounded"
            />
          ) : (
            <FileIcon type={entry.type} size={48} />
          )}
        </div>
        <span className="text-sm text-center truncate w-full" title={entry.name}>
          {entry.name}
        </span>
        {!entry.isDirectory && (
          <span className="text-xs text-muted-foreground">{formatFileSize(entry.size)}</span>
        )}
      </div>
    )
  }

  // List view
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-accent/50 transition-colors ${
        isSelected ? "bg-accent ring-1 ring-primary" : ""
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <FileIcon type={entry.type} size={24} />
      <span className="flex-1 truncate">{entry.name}</span>
      {viewMode === "details" && (
        <>
          <span className="text-sm text-muted-foreground w-20 text-right">
            {entry.isDirectory ? "--" : formatFileSize(entry.size)}
          </span>
          <span className="text-sm text-muted-foreground w-32">
            {entry.modifiedAt.toLocaleDateString()}
          </span>
        </>
      )}
    </div>
  )
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  viewMode: ViewMode
  sortField: SortField
  filterText: string
  onViewModeChange: (mode: ViewMode) => void
  onSortChange: (field: SortField) => void
  onFilterChange: (text: string) => void
  onRefresh: () => void
  selectedCount: number
  onDelete: () => void
}

function Toolbar({
  viewMode,
  filterText,
  onViewModeChange,
  onFilterChange,
  onRefresh,
  selectedCount,
  onDelete,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <div className="flex-1 flex items-center gap-2">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Filter files..."
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
            className="pl-8 h-8 w-48"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("list")}
        >
          <HugeiconsIcon icon={Menu02Icon} className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("grid")}
        >
          <HugeiconsIcon icon={GridIcon} className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      <Button variant="ghost" size="icon" onClick={onRefresh}>
        <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4" />
      </Button>

      {selectedCount > 0 && (
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

interface SidebarProps {
  bookmarks: Array<{ id: string; name: string; path: string }>
  onNavigate: (path: string) => void
  onAddBookmark: () => void
}

function Sidebar({ bookmarks, onNavigate, onAddBookmark }: SidebarProps) {
  return (
    <div className="w-48 border-r p-2 flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Quick Access</h3>
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => onNavigate("/")}
          >
            <HugeiconsIcon icon={Folder01Icon} className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => onNavigate("/projects")}
          >
            <HugeiconsIcon icon={Folder01Icon} className="h-4 w-4 mr-2" />
            Projects
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Bookmarks</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddBookmark}>
            <HugeiconsIcon icon={StarIcon} className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-1">
          {bookmarks.map((bookmark) => (
            <Button
              key={bookmark.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onNavigate(bookmark.path)}
            >
              <HugeiconsIcon
                icon={StarIcon}
                className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400"
              />
              {bookmark.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN FILE BROWSER COMPONENT
// ============================================================================

export function FileBrowser() {
  const {
    currentPath,
    entries,
    selectedIds,
    viewMode,
    sortField,
    sortOrder,
    filterText,
    isLoading,
    settings,
    navigateTo,
    refresh,
    select,
    setViewMode,
    setSort,
    setFilter,
    deleteSelected,
    addBookmark,
    addRecentFile,
  } = useFileBrowserStore()

  // Filter and sort entries
  const displayedEntries = useMemo(() => {
    let result = entries

    // Filter
    if (filterText) {
      const lower = filterText.toLowerCase()
      result = result.filter((e) => e.name.toLowerCase().includes(lower))
    }

    // Sort
    result = [...result].sort((a, b) => {
      // Folders first
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }

      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
        case "size":
          comparison = a.size - b.size
          break
        case "modified":
          comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime()
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [entries, filterText, sortField, sortOrder])

  const handleOpen = (entry: FileEntry) => {
    if (entry.isDirectory) {
      navigateTo(entry.path)
    } else {
      addRecentFile(entry)
      // TODO: Open file
    }
  }

  const handleAddBookmark = () => {
    addBookmark(currentPath, currentPath.split("/").pop() ?? "Bookmark")
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        viewMode={viewMode}
        sortField={sortField}
        filterText={filterText}
        onViewModeChange={setViewMode}
        onSortChange={setSort}
        onFilterChange={setFilter}
        onRefresh={refresh}
        selectedCount={selectedIds.size}
        onDelete={deleteSelected}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          bookmarks={settings.bookmarks}
          onNavigate={navigateTo}
          onAddBookmark={handleAddBookmark}
        />

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading...
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No files found
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 p-4"
                  : "flex flex-col gap-1 p-2"
              }
            >
              {displayedEntries.map((entry) => (
                <FileEntryItem
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedIds.has(entry.id)}
                  viewMode={viewMode}
                  onSelect={(additive) => select(entry.id, additive)}
                  onOpen={() => handleOpen(entry)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

export default FileBrowser
