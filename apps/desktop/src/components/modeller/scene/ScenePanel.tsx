/**
 * Scene Panel Component - CADHY
 *
 * Outliner/Scene tree panel with:
 * - Hierarchical tree view organized by Areas
 * - Quick visibility/lock toggles
 * - Multi-select support
 * - Search/filter
 * - Type-specific icons for shapes
 * - Material preview circles
 */

import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  Delete01Icon,
  FilterIcon,
  Folder01Icon,
  FolderOpenIcon,
  LockIcon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  Search01Icon,
  SortingAZ01Icon,
  SquareUnlock02Icon,
  Target01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React, { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useVirtualList } from "@/hooks/use-virtual-list"
import {
  type AnySceneObject,
  type ObjectType,
  type SceneArea,
  type ShapeObject,
  useAreas,
  useModellerStore,
  useObjects,
  useSelectedIds,
} from "@/stores/modeller"
import { getObjectIcon } from "./scene-utils"

// ============================================================================
// TYPES
// ============================================================================

interface ScenePanelProps {
  className?: string
}

type SortMode = "name" | "type" | "created" | "area"
type FilterType = "all" | ObjectType

// ============================================================================
// SCENE OBJECT ITEM (Improved with type-specific icons and material preview)
// ============================================================================

interface SceneObjectItemProps {
  object: AnySceneObject
  index: number
  isSelected: boolean
  onSelect: (id: string, additive: boolean) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onFocus: (id: string) => void
  onColorChange?: (id: string, color: string) => void
  isDraggable?: boolean
}

const SceneObjectItem = React.memo(function SceneObjectItem({
  object,
  index,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onFocus,
  onColorChange,
  isDraggable = false,
}: SceneObjectItemProps) {
  const { t } = useTranslation()

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", object.id)
    console.log("[DragDrop] Drag start:", object.id, object.name)
    e.currentTarget.classList.add("opacity-50")
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50")
  }

  // Get material info for preview
  const getMaterialInfo = (
    obj: AnySceneObject
  ): { color: string | null; textureId: string | null; texturePreview: string | null } => {
    if ("material" in obj && obj.material) {
      const mat = obj.material as { color: string; pbr?: { albedoTextureId?: string } }
      const textureId = mat.pbr?.albedoTextureId || null
      // Generate texture preview URL if texture is set
      const texturePreview = textureId ? `/textures/${textureId}/albedo.jpg` : null
      return {
        color: mat.color,
        textureId,
        texturePreview,
      }
    }
    return { color: null, textureId: null, texturePreview: null }
  }

  const materialInfo = getMaterialInfo(object)
  const shapeType = object.type === "shape" ? (object as ShapeObject).shapeType : undefined
  const Icon = getObjectIcon(object.type, shapeType)
  const typeLabel =
    object.type === "shape" && shapeType
      ? t(`scenePanel.shapeTypes.${shapeType}`)
      : t(`scenePanel.types.${object.type}`)

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => onSelect(object.id, e.ctrlKey || e.metaKey || e.shiftKey)}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onFocus(object.id)
      }}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1.5 rounded-2xl cursor-pointer transition-all",
        "hover:bg-muted/50",
        isSelected && "bg-primary/15 ring-1 ring-primary/40",
        !object.visible && "opacity-50",
        isDraggable && "cursor-move"
      )}
    >
      {/* Index number */}
      <span className="w-4 text-xs text-muted-foreground/60 font-mono shrink-0">{index}</span>

      {/* Type icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="shrink-0">
            <HugeiconsIcon
              icon={Icon}
              className={cn(
                "size-3.5",
                object.type === "channel" && "text-cyan-500",
                object.type === "transition" && "text-amber-500",
                object.type === "chute" && "text-orange-500",
                object.type === "shape" && "text-indigo-400",
                object.type === "structure" && "text-emerald-500",
                object.type === "annotation" && "text-purple-400"
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {typeLabel}
        </TooltipContent>
      </Tooltip>

      {/* Name */}
      <span
        className={cn(
          "text-xs flex-1 truncate",
          object.locked && "italic",
          !object.visible && "line-through text-muted-foreground"
        )}
      >
        {object.name}
      </span>

      {/* Material preview circle - shows texture if available, otherwise color */}
      {(materialInfo.texturePreview || materialInfo.color) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="size-3.5 rounded-full border border-border/50 shrink-0 shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  style={{
                    backgroundColor: materialInfo.texturePreview
                      ? undefined
                      : (materialInfo.color ?? undefined),
                  }}
                >
                  {materialInfo.texturePreview && (
                    <img
                      src={materialInfo.texturePreview}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        if (e.currentTarget.parentElement && materialInfo.color) {
                          e.currentTarget.parentElement.style.backgroundColor = materialInfo.color
                        }
                      }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="left"
                align="center"
                className="w-auto p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("scenePanel.materialColor")}
                  </span>
                  <input
                    type="color"
                    value={materialInfo.color || "#6366f1"}
                    onChange={(e) => {
                      e.stopPropagation()
                      onColorChange?.(object.id, e.target.value)
                    }}
                    className="w-16 h-8 rounded-2xl cursor-pointer border-0 p-0"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
            {materialInfo.color
              ? `${t("scenePanel.material")}: ${materialInfo.color}`
              : t("scenePanel.material")}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Quick actions - visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                onFocus(object.id)
              }}
            >
              <HugeiconsIcon icon={Target01Icon} className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
            {t("scenePanel.zoomToObject")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility(object.id)
              }}
            >
              <HugeiconsIcon icon={object.visible ? ViewIcon : ViewOffIcon} className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
            {object.visible ? t("scenePanel.hide") : t("scenePanel.show")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock(object.id)
              }}
            >
              <HugeiconsIcon
                icon={object.locked ? LockIcon : SquareUnlock02Icon}
                className="size-3"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
            {object.locked ? t("scenePanel.unlock") : t("scenePanel.lock")}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Context menu */}
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
            >
              <HugeiconsIcon icon={MoreVerticalIcon} className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onFocus(object.id)}>
                <HugeiconsIcon icon={Target01Icon} className="size-3.5 mr-2" />
                {t("scenePanel.zoomToObject")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(object.id)}>
                <HugeiconsIcon icon={Copy01Icon} className="size-3.5 mr-2" />
                {t("scenePanel.duplicate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(object.id)}
                className="text-destructive focus:text-destructive"
              >
                <HugeiconsIcon icon={Delete01Icon} className="size-3.5 mr-2" />
                {t("scenePanel.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
          {t("common.more")}
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

// ============================================================================
// AREA GROUP (New hierarchical grouping)
// ============================================================================

interface AreaGroupProps {
  area: SceneArea
  objects: AnySceneObject[]
  selectedIds: string[]
  onSelect: (id: string, additive: boolean) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onFocus: (id: string) => void
  onColorChange?: (id: string, color: string) => void
  onRenameArea: (areaId: string) => void
  onDeleteArea: (areaId: string) => void
  onDropObject?: (objectId: string, areaId: string) => void
}

const AreaGroup = React.memo(function AreaGroup({
  area,
  objects,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onFocus,
  onColorChange,
  onRenameArea,
  onDeleteArea,
  onDropObject,
}: AreaGroupProps) {
  const { t } = useTranslation()
  const { toggleAreaCollapsed } = useModellerStore()
  const selectedInArea = objects.filter((o) => selectedIds.includes(o.id)).length
  const [isDragOver, setIsDragOver] = React.useState(false)
  const dragOverCounterRef = React.useRef(0)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"

    if (!isDragOver) {
      setIsDragOver(true)
    }

    // Expand area if collapsed when dragging over it
    if (area.collapsed) {
      toggleAreaCollapsed(area.id)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragOverCounterRef.current++
    setIsDragOver(true)

    // Expand area if collapsed when dragging over it
    if (area.collapsed) {
      toggleAreaCollapsed(area.id)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragOverCounterRef.current--

    // Only set dragOver to false when we've actually left the drop zone
    if (dragOverCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragOverCounterRef.current = 0
    setIsDragOver(false)

    const objectId = e.dataTransfer.getData("text/plain")
    console.log("[DragDrop] Drop event:", {
      objectId,
      areaId: area.id,
      onDropObject: !!onDropObject,
    })

    if (objectId && onDropObject) {
      console.log("[DragDrop] Calling onDropObject:", objectId, "->", area.id)
      onDropObject(objectId, area.id)
    } else {
      console.warn("[DragDrop] Missing data:", { objectId, hasOnDropObject: !!onDropObject })
    }
  }

  return (
    <Collapsible open={!area.collapsed} onOpenChange={() => toggleAreaCollapsed(area.id)}>
      {/* Use a div wrapper to avoid button-in-button nesting */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded-2xl transition-colors group",
          isDragOver && "bg-primary/20 ring-2 ring-primary border-primary/50"
        )}
      >
        <CollapsibleTrigger
          className="flex items-center gap-2 flex-1 min-w-0"
          onDragOver={(e) => {
            // Prevent trigger from interfering with drop
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            // Prevent trigger from handling drop, let parent handle it
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <HugeiconsIcon
            icon={area.collapsed ? ArrowRight01Icon : ArrowDown01Icon}
            className="size-3 text-muted-foreground shrink-0"
          />
          <HugeiconsIcon
            icon={Folder01Icon}
            className="size-3.5 shrink-0"
            style={{ color: area.color }}
          />
          <span className="text-xs font-medium flex-1 text-left truncate">
            {area.name} ({area.index})
          </span>
        </CollapsibleTrigger>
        <Badge variant="secondary" className="h-4 px-1.5 text-xs shrink-0">
          {objects.length}
        </Badge>
        {selectedInArea > 0 && (
          <Badge variant="default" className="h-4 px-1.5 text-xs shrink-0">
            {selectedInArea}
          </Badge>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation()
                  onRenameArea(area.id)
                }}
              >
                <HugeiconsIcon icon={PencilEdit01Icon} className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
              {t("scenePanel.renameArea")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteArea(area.id)
                }}
              >
                <HugeiconsIcon icon={Delete01Icon} className="size-3 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
              {t("scenePanel.deleteArea")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <CollapsibleContent>
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "ml-4 pl-2 border-l space-y-0.5 py-1 transition-colors min-h-[40px]",
            isDragOver ? "bg-primary/10 border-primary/50 border-l-2" : "border-border/40"
          )}
        >
          {objects.length === 0 ? (
            <div
              className={cn(
                "text-xs py-2 px-2 italic transition-colors",
                isDragOver ? "text-primary font-medium" : "text-muted-foreground/50"
              )}
            >
              {isDragOver ? t("scenePanel.dropHere") : t("scenePanel.emptyArea")}
            </div>
          ) : (
            objects.map((obj, idx) => (
              <SceneObjectItem
                key={obj.id}
                object={obj}
                index={idx}
                isSelected={selectedIds.includes(obj.id)}
                onSelect={onSelect}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onFocus={onFocus}
                onColorChange={onColorChange}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

// ============================================================================
// UNASSIGNED OBJECTS GROUP
// ============================================================================

interface UnassignedGroupProps {
  objects: AnySceneObject[]
  selectedIds: string[]
  onSelect: (id: string, additive: boolean) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onFocus: (id: string) => void
  onColorChange?: (id: string, color: string) => void
}

const UnassignedGroup = React.memo(function UnassignedGroup({
  objects,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onFocus,
  onColorChange,
}: UnassignedGroupProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(true)
  const selectedInGroup = objects.filter((o) => selectedIds.includes(o.id)).length

  if (objects.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded-2xl transition-colors">
        <HugeiconsIcon
          icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon}
          className="size-3 text-muted-foreground"
        />
        <HugeiconsIcon icon={Folder01Icon} className="size-3.5 text-muted-foreground/50 shrink-0" />
        <span className="text-xs font-medium flex-1 text-left truncate text-muted-foreground">
          {t("scenePanel.unassigned")}
        </span>
        <Badge variant="secondary" className="h-4 px-1.5 text-xs">
          {objects.length}
        </Badge>
        {selectedInGroup > 0 && (
          <Badge variant="default" className="h-4 px-1.5 text-xs">
            {selectedInGroup}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 pl-2 border-l border-border/40 space-y-0.5 py-1">
          {objects.map((obj, idx) => (
            <SceneObjectItem
              key={obj.id}
              object={obj}
              index={idx}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onFocus={onFocus}
              onColorChange={onColorChange}
              isDraggable={true}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScenePanel({ className }: ScenePanelProps) {
  const { t } = useTranslation()
  const objects = useObjects()
  const selectedIds = useSelectedIds()
  const areas = useAreas()
  const {
    select,
    updateObject,
    deleteObject,
    duplicateObject,
    focusObject,
    createArea,
    deleteArea,
    renameArea,
    moveObjectToArea,
  } = useModellerStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortMode, setSortMode] = useState<SortMode>("area")
  const [renamingAreaId, setRenamingAreaId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Filter and sort objects
  const filteredObjects = useMemo(() => {
    let result = [...objects]

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((o) => o.name.toLowerCase().includes(query))
    }

    // Filter by type
    if (filterType !== "all") {
      result = result.filter((o) => o.type === filterType)
    }

    // Sort
    switch (sortMode) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "type":
        result.sort((a, b) => a.type.localeCompare(b.type))
        break
      case "created":
        result.sort((a, b) => b.createdAt - a.createdAt)
        break
      default:
        // Keep original order, will be grouped by area
        break
    }

    return result
  }, [objects, searchQuery, filterType, sortMode])

  // Group objects by area
  const objectsByArea = useMemo(() => {
    const groups: Record<string, AnySceneObject[]> = {}
    for (const area of areas) {
      groups[area.id] = filteredObjects.filter((o) => o.areaId === area.id)
    }
    // Objects without area
    groups.unassigned = filteredObjects.filter((o) => !o.areaId)
    return groups
  }, [filteredObjects, areas])

  // Virtualization for flat list mode
  const { parentRef, virtualItems, totalSize } = useVirtualList({
    items: filteredObjects,
    estimateSize: 40,
    overscan: 5,
  })

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      select(id, additive)
    },
    [select]
  )

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const obj = objects.find((o) => o.id === id)
      if (obj) {
        updateObject(id, { visible: !obj.visible })
      }
    },
    [objects, updateObject]
  )

  const handleToggleLock = useCallback(
    (id: string) => {
      const obj = objects.find((o) => o.id === id)
      if (obj) {
        updateObject(id, { locked: !obj.locked })
      }
    },
    [objects, updateObject]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteObject(id)
    },
    [deleteObject]
  )

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateObject(id)
    },
    [duplicateObject]
  )

  const handleFocus = useCallback(
    (id: string) => {
      focusObject(id)
    },
    [focusObject]
  )

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      const obj = objects.find((o) => o.id === id)
      if (obj && "material" in obj && obj.material) {
        updateObject(id, {
          material: { ...obj.material, color },
        })
      }
    },
    [objects, updateObject]
  )

  const handleCreateArea = useCallback(() => {
    const newId = createArea()
    setRenamingAreaId(newId)
    setRenameValue("Area")
  }, [createArea])

  const handleRenameArea = useCallback(
    (areaId: string) => {
      const area = areas.find((a) => a.id === areaId)
      if (area) {
        setRenamingAreaId(areaId)
        setRenameValue(area.name)
      }
    },
    [areas]
  )

  const handleConfirmRename = useCallback(() => {
    if (renamingAreaId && renameValue.trim()) {
      renameArea(renamingAreaId, renameValue.trim())
    }
    setRenamingAreaId(null)
    setRenameValue("")
  }, [renamingAreaId, renameValue, renameArea])

  const handleDeleteArea = useCallback(
    (areaId: string) => {
      deleteArea(areaId)
    },
    [deleteArea]
  )

  const handleDropObject = useCallback(
    (objectId: string, areaId: string) => {
      console.log("[DragDrop] handleDropObject called:", objectId, "->", areaId)
      const obj = objects.find((o) => o.id === objectId)
      if (!obj) {
        console.error("[DragDrop] Object not found:", objectId)
        return
      }
      console.log("[DragDrop] Moving object:", obj.name, "from area:", obj.areaId, "to:", areaId)
      moveObjectToArea(objectId, areaId)
    },
    [moveObjectToArea, objects]
  )

  const objectTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: objects.length }
    for (const obj of objects) {
      counts[obj.type] = (counts[obj.type] || 0) + 1
    }
    return counts
  }, [objects])

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="px-3 py-2 space-y-2">
        {/* Search */}
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("scenePanel.searchObjects")}
            className="h-7 pl-7 text-xs"
          />
        </div>

        {/* Filters & Sort */}
        <div className="flex items-center gap-1">
          {/* Type filter */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
                    <HugeiconsIcon icon={FilterIcon} className="size-3" />
                    {filterType === "all"
                      ? t("scenePanel.all")
                      : t(`scenePanel.types.${filterType}`)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  <DropdownMenuItem onClick={() => setFilterType("all")}>
                    {t("scenePanel.all")} ({objectTypeCounts.all || 0})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.entries(objectTypeCounts)
                    .filter(([key]) => key !== "all")
                    .map(([type, count]) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => setFilterType(type as ObjectType)}
                      >
                        {t(`scenePanel.types.${type}`)} ({count})
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
              {t("scenePanel.filter")}
            </TooltipContent>
          </Tooltip>

          {/* Sort */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
                    <HugeiconsIcon icon={SortingAZ01Icon} className="size-3" />
                    {t(`scenePanel.sortModes.${sortMode}`)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  <DropdownMenuItem onClick={() => setSortMode("area")}>
                    {t("scenePanel.byArea")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode("name")}>
                    {t("scenePanel.byName")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode("type")}>
                    {t("scenePanel.byType")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode("created")}>
                    {t("scenePanel.byCreated")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
              {t("scenePanel.sort")}
            </TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          {/* Add Area button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 gap-1"
                onClick={handleCreateArea}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3" />
                {t("scenePanel.addArea")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs px-1.5 py-0.5 h-6">
              {t("scenePanel.addArea")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Object List */}
      <ScrollArea className="flex-1 min-h-0" showFadeMasks>
        {objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <HugeiconsIcon icon={FolderOpenIcon} className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("scenePanel.emptyScene")}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("scenePanel.emptySceneDesc")}
            </p>
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <HugeiconsIcon icon={Search01Icon} className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">{t("scenePanel.noMatchingObjects")}</p>
          </div>
        ) : sortMode === "area" ? (
          // Grouped by area
          <div className="p-2 space-y-1">
            {/* Rename dialog overlay */}
            {renamingAreaId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background border rounded-2xl p-4 shadow-lg w-64">
                  <h3 className="text-sm font-medium mb-3">{t("scenePanel.renameArea")}</h3>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename()
                      if (e.key === "Escape") {
                        setRenamingAreaId(null)
                        setRenameValue("")
                      }
                    }}
                    className="h-8 text-sm mb-3"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenamingAreaId(null)
                        setRenameValue("")
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button size="sm" onClick={handleConfirmRename}>
                      {t("common.save")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Areas */}
            {areas.map((area) => (
              <AreaGroup
                key={area.id}
                area={area}
                objects={objectsByArea[area.id] || []}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onFocus={handleFocus}
                onColorChange={handleColorChange}
                onRenameArea={handleRenameArea}
                onDeleteArea={handleDeleteArea}
                onDropObject={handleDropObject}
              />
            ))}

            {/* Unassigned objects */}
            <UnassignedGroup
              objects={objectsByArea.unassigned || []}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onFocus={handleFocus}
              onColorChange={handleColorChange}
            />
          </div>
        ) : (
          // Flat list (virtualized for performance)
          <div ref={parentRef} className="h-full overflow-auto p-2">
            <div style={{ height: totalSize, position: "relative" }}>
              {virtualItems.map((virtualItem) => {
                const obj = filteredObjects[virtualItem.index]
                return (
                  <div
                    key={obj.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                      height: virtualItem.size,
                    }}
                  >
                    <SceneObjectItem
                      object={obj}
                      index={virtualItem.index}
                      isSelected={selectedIds.includes(obj.id)}
                      onSelect={handleSelect}
                      onToggleVisibility={handleToggleVisibility}
                      onToggleLock={handleToggleLock}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onFocus={handleFocus}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default ScenePanel
