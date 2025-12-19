/**
 * Scene Panel Component - CADHY
 *
 * Outliner/Scene tree panel with:
 * - Hierarchical tree view of all objects
 * - Drag & drop reorganization (future)
 * - Quick visibility/lock toggles
 * - Multi-select support
 * - Search/filter
 * - Group objects
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
  ScrollArea,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  CubeIcon,
  Delete01Icon,
  FilterIcon,
  FolderOpenIcon,
  LockIcon,
  MoreVerticalIcon,
  Search01Icon,
  SortingAZ01Icon,
  SquareUnlock02Icon,
  Target01Icon,
  ViewIcon,
  ViewOffIcon,
  WaterEnergyIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React, { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useVirtualList } from "@/hooks/useVirtualList"
import {
  type AnySceneObject,
  type ObjectType,
  useLayers,
  useModellerStore,
  useObjects,
  useSelectedIds,
} from "@/stores/modeller-store"

// ============================================================================
// TYPES
// ============================================================================

interface ScenePanelProps {
  className?: string
}

type SortMode = "name" | "type" | "created" | "layer"
type FilterType = "all" | ObjectType

// ============================================================================
// SCENE OBJECT ITEM
// ============================================================================

interface SceneObjectItemProps {
  object: AnySceneObject
  isSelected: boolean
  layerColor: string
  onSelect: (id: string, additive: boolean) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onFocus: (id: string) => void
}

const SceneObjectItem = React.memo(function SceneObjectItem({
  object,
  isSelected,
  layerColor,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onFocus,
}: SceneObjectItemProps) {
  const { t } = useTranslation()

  const getObjectIcon = (type: ObjectType) => {
    switch (type) {
      case "channel":
        return WaterEnergyIcon
      default:
        return CubeIcon
    }
  }

  const getObjectColor = (obj: AnySceneObject) => {
    if (obj.type === "shape") {
      return (obj as { material?: { color: string } }).material?.color ?? "#6366f1"
    }
    if (obj.type === "channel") {
      return "#0ea5e9"
    }
    return layerColor
  }

  return (
    <div
      onClick={(e) => onSelect(object.id, e.ctrlKey || e.metaKey || e.shiftKey)}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onFocus(object.id)
      }}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all",
        "hover:bg-muted/50",
        isSelected && "bg-primary/15 ring-1 ring-primary/40",
        !object.visible && "opacity-50"
      )}
    >
      {/* Color indicator */}
      <div
        className="size-2.5 rounded-sm shrink-0"
        style={{ backgroundColor: getObjectColor(object) }}
      />

      {/* Icon */}
      <HugeiconsIcon
        icon={getObjectIcon(object.type)}
        className={cn(
          "size-3.5 shrink-0",
          object.type === "channel" ? "text-cyan-500" : "text-muted-foreground"
        )}
      />

      {/* Name */}
      <span
        className={cn(
          "text-[11px] flex-1 truncate",
          object.locked && "italic",
          !object.visible && "line-through text-muted-foreground"
        )}
      >
        {object.name}
      </span>

      {/* Quick actions - visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-5 w-5"
          onClick={(e) => {
            e.stopPropagation()
            onFocus(object.id)
          }}
          title={t("scenePanel.zoomToObject")}
        >
          <HugeiconsIcon icon={Target01Icon} className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-5 w-5"
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility(object.id)
          }}
          title={object.visible ? t("scenePanel.hide") : t("scenePanel.show")}
        >
          <HugeiconsIcon icon={object.visible ? ViewIcon : ViewOffIcon} className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-5 w-5"
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock(object.id)
          }}
          title={object.locked ? t("scenePanel.unlock") : t("scenePanel.lock")}
        >
          <HugeiconsIcon icon={object.locked ? LockIcon : SquareUnlock02Icon} className="size-3" />
        </Button>
      </div>

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
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
    </div>
  )
})

// ============================================================================
// LAYER GROUP
// ============================================================================

interface LayerGroupProps {
  layerId: string
  layerName: string
  layerColor: string
  objects: AnySceneObject[]
  selectedIds: string[]
  onSelect: (id: string, additive: boolean) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onFocus: (id: string) => void
  defaultOpen?: boolean
}

const LayerGroup = React.memo(function LayerGroup({
  layerId,
  layerName,
  layerColor,
  objects,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onFocus,
  defaultOpen = true,
}: LayerGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const selectedInLayer = objects.filter((o) => selectedIds.includes(o.id)).length

  if (objects.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded-md transition-colors">
        <HugeiconsIcon
          icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon}
          className="size-3 text-muted-foreground"
        />
        <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: layerColor }} />
        <span className="text-[11px] font-medium flex-1 text-left truncate">{layerName}</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
          {objects.length}
        </Badge>
        {selectedInLayer > 0 && (
          <Badge variant="default" className="h-4 px-1.5 text-[9px]">
            {selectedInLayer}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 pl-2 border-l border-border/40 space-y-0.5 py-1">
          {objects.map((obj) => (
            <SceneObjectItem
              key={obj.id}
              object={obj}
              isSelected={selectedIds.includes(obj.id)}
              layerColor={layerColor}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onFocus={onFocus}
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
  const layers = useLayers()
  const {
    select,
    selectMultiple,
    updateObject,
    deleteObject,
    duplicateObject,
    selectAll,
    deselectAll,
    focusObject,
  } = useModellerStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortMode, setSortMode] = useState<SortMode>("layer")

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
        // Keep original order, will be grouped by layer
        break
    }

    return result
  }, [objects, searchQuery, filterType, sortMode])

  // Group objects by layer
  const objectsByLayer = useMemo(() => {
    const groups: Record<string, AnySceneObject[]> = {}
    for (const layer of layers) {
      groups[layer.id] = filteredObjects.filter((o) => o.layerId === layer.id)
    }
    return groups
  }, [filteredObjects, layers])

  // Virtualization for flat list mode (when sortMode !== "layer")
  const { parentRef, virtualItems, totalSize } = useVirtualList({
    items: filteredObjects,
    estimateSize: 40, // Estimated height of each SceneObjectItem
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
      <div className="px-3 py-2 border-b border-border/40 space-y-2">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2">
                <HugeiconsIcon icon={FilterIcon} className="size-3" />
                {filterType === "all" ? t("scenePanel.all") : filterType}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              <DropdownMenuItem onClick={() => setFilterType("all")}>
                {t("scenePanel.all")} ({objectTypeCounts.all || 0})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType("shape")}>
                <HugeiconsIcon icon={CubeIcon} className="size-3.5 mr-2" />
                {t("scenePanel.shapes")} ({objectTypeCounts.shape || 0})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("channel")}>
                <HugeiconsIcon icon={WaterEnergyIcon} className="size-3.5 mr-2 text-cyan-500" />
                {t("scenePanel.channels")} ({objectTypeCounts.channel || 0})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2">
                <HugeiconsIcon icon={SortingAZ01Icon} className="size-3" />
                {sortMode}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              <DropdownMenuItem onClick={() => setSortMode("layer")}>
                {t("scenePanel.byLayer")}
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

          <div className="flex-1" />

          {/* Quick actions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={selectAll}
            title={t("scenePanel.selectAll")}
          >
            {t("scenePanel.selectAll")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={deselectAll}
            title={t("scenePanel.selectNone")}
          >
            {t("scenePanel.selectNone")}
          </Button>
        </div>
      </div>

      {/* Object List */}
      <ScrollArea className="flex-1 min-h-0">
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
        ) : sortMode === "layer" ? (
          // Grouped by layer
          <div className="p-2 space-y-1">
            {layers.map((layer) => (
              <LayerGroup
                key={layer.id}
                layerId={layer.id}
                layerName={layer.name}
                layerColor={layer.color}
                objects={objectsByLayer[layer.id] || []}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onFocus={handleFocus}
              />
            ))}
          </div>
        ) : (
          // Flat list (virtualized for performance)
          <div ref={parentRef} className="h-full overflow-auto p-2">
            <div style={{ height: totalSize, position: "relative" }}>
              {virtualItems.map((virtualItem) => {
                const obj = filteredObjects[virtualItem.index]
                const layer = layers.find((l) => l.id === obj.layerId)
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
                      isSelected={selectedIds.includes(obj.id)}
                      layerColor={layer?.color ?? "#6366f1"}
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

      {/* Footer stats */}
      <div className="px-3 py-1.5 border-t border-border/40 bg-muted/20">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {objects.length}{" "}
            {objects.length !== 1 ? t("scenePanel.objects") : t("scenePanel.object")}
          </span>
          {selectedIds.length > 0 && (
            <span className="text-primary">
              {selectedIds.length} {t("scenePanel.selected")}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScenePanel
