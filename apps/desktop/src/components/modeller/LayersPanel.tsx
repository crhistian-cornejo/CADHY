/**
 * Layers Panel Component - CADHY
 *
 * Layer management panel with:
 * - Layer list with visibility/lock toggles
 * - Layer creation and editing
 * - Color assignment
 * - Object count per layer
 * - Layer filtering
 */

import {
  Badge,
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
} from "@cadhy/ui"
import {
  Add01Icon,
  Delete01Icon,
  Edit01Icon,
  Layers01Icon,
  LockIcon,
  Search01Icon,
  SquareUnlock02Icon,
  Tick01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { type Layer, useLayers, useModellerStore, useObjects } from "@/stores/modeller-store"

// ============================================================================
// TYPES
// ============================================================================

interface LayersPanelProps {
  className?: string
}

// ============================================================================
// LAYER COLOR PICKER
// ============================================================================

const LAYER_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#6b7280",
  "#374151",
  "#1f2937",
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        className="size-5 rounded border border-border shadow-sm transition-transform hover:scale-110"
        style={{ backgroundColor: value }}
      />
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-5 gap-1">
          {LAYER_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={cn(
                "size-6 rounded-sm border transition-transform hover:scale-110",
                value === color && "ring-2 ring-primary ring-offset-1"
              )}
              style={{ backgroundColor: color }}
            >
              {value === color && (
                <HugeiconsIcon icon={Tick01Icon} className="size-4 text-white mx-auto" />
              )}
            </button>
          ))}
        </div>
        <Separator className="my-2" />
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="size-6 cursor-pointer rounded border"
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="h-6 text-[10px] font-mono flex-1"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// LAYER ITEM
// ============================================================================

interface LayerItemProps {
  layer: Layer
  objectCount: number
  isActive: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onUpdateColor: (color: string) => void
  onUpdateName: (name: string) => void
  onDelete: () => void
  onSelectObjects: () => void
}

function LayerItem({
  layer,
  objectCount,
  isActive,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onUpdateColor,
  onUpdateName,
  onDelete,
  onSelectObjects,
}: LayerItemProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(layer.name)

  const handleNameSubmit = () => {
    if (editName.trim()) {
      onUpdateName(editName.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit()
    } else if (e.key === "Escape") {
      setEditName(layer.name)
      setIsEditing(false)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors",
            "hover:bg-muted/50",
            isActive && "bg-primary/10 border-l-2 border-primary"
          )}
          onClick={onSelect}
          onDoubleClick={() => setIsEditing(true)}
        >
          {/* Color */}
          <ColorPicker value={layer.color} onChange={onUpdateColor} />

          {/* Name */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="h-5 text-[10px] px-1"
              />
            ) : (
              <span
                className={cn(
                  "text-xs truncate block",
                  !layer.visible && "text-muted-foreground line-through"
                )}
              >
                {layer.name}
              </span>
            )}
          </div>

          {/* Object Count */}
          {objectCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              {objectCount}
            </Badge>
          )}

          {/* Controls */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility()
              }}
              className="h-5 w-5"
            >
              <HugeiconsIcon
                icon={layer.visible ? ViewIcon : ViewOffIcon}
                className={cn("size-3", !layer.visible && "text-muted-foreground")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock()
              }}
              className="h-5 w-5"
            >
              <HugeiconsIcon
                icon={layer.locked ? LockIcon : SquareUnlock02Icon}
                className={cn("size-3", layer.locked && "text-amber-500")}
              />
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => setIsEditing(true)}>
          <HugeiconsIcon icon={Edit01Icon} className="size-4 mr-2" />
          {t("layersPanel.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onSelectObjects}>
          <HugeiconsIcon icon={Layers01Icon} className="size-4 mr-2" />
          {t("layersPanel.selectObjects", { count: objectCount })}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onToggleVisibility}>
          <HugeiconsIcon icon={layer.visible ? ViewOffIcon : ViewIcon} className="size-4 mr-2" />
          {layer.visible ? t("layersPanel.hideLayer") : t("layersPanel.showLayer")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onToggleLock}>
          <HugeiconsIcon
            icon={layer.locked ? SquareUnlock02Icon : LockIcon}
            className="size-4 mr-2"
          />
          {layer.locked ? t("layersPanel.unlockLayer") : t("layersPanel.lockLayer")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          disabled={layer.id === "default"}
          className="text-destructive focus:text-destructive"
        >
          <HugeiconsIcon icon={Delete01Icon} className="size-4 mr-2" />
          {t("layersPanel.deleteLayer")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ============================================================================
// NEW LAYER DIALOG
// ============================================================================

interface NewLayerFormProps {
  onClose: () => void
}

function NewLayerForm({ onClose }: NewLayerFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(t("layersPanel.newLayer"))
  const [color, setColor] = useState("#6366f1")
  const { addLayer } = useModellerStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      addLayer(name.trim(), color)
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground">{t("layersPanel.layerName")}</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("layersPanel.layerNamePlaceholder")}
          autoFocus
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground">{t("layersPanel.color")}</label>
        <div className="flex items-center gap-2">
          <ColorPicker value={color} onChange={setColor} />
          <span className="text-xs font-mono text-muted-foreground">{color}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="sm">
          {t("createPanel.create")}
        </Button>
      </div>
    </form>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LayersPanel({ className }: LayersPanelProps) {
  const { t } = useTranslation()
  const layers = useLayers()
  const objects = useObjects()
  const [activeLayerId, setActiveLayerId] = useState<string>("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewLayerForm, setShowNewLayerForm] = useState(false)

  const { updateLayer, deleteLayer, toggleLayerVisibility, toggleLayerLock, selectByLayer } =
    useModellerStore()

  // Get object count per layer
  const getObjectCount = useCallback(
    (layerId: string) => {
      return objects.filter((o) => o.layerId === layerId).length
    },
    [objects]
  )

  // Filter layers
  const filteredLayers = layers.filter((layer) =>
    layer.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Bulk actions
  const handleShowAll = () => {
    layers.forEach((layer) => {
      if (!layer.visible) {
        toggleLayerVisibility(layer.id)
      }
    })
  }

  const handleHideAll = () => {
    layers.forEach((layer) => {
      if (layer.visible) {
        toggleLayerVisibility(layer.id)
      }
    })
  }

  const handleUnlockAll = () => {
    layers.forEach((layer) => {
      if (layer.locked) {
        toggleLayerLock(layer.id)
      }
    })
  }

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Layers01Icon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">{t("layersPanel.title")}</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {layers.length}
          </Badge>
        </div>
        <Popover open={showNewLayerForm} onOpenChange={setShowNewLayerForm}>
          <PopoverTrigger className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-muted transition-colors">
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <NewLayerForm onClose={() => setShowNewLayerForm(false)} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-border/40">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("layersPanel.searchLayers")}
            className="h-6 pl-7 text-[10px]"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowAll}
            className="h-5 px-1.5 text-[10px]"
          >
            <HugeiconsIcon icon={ViewIcon} className="size-3 mr-1" />
            {t("layersPanel.showAll")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHideAll}
            className="h-5 px-1.5 text-[10px]"
          >
            <HugeiconsIcon icon={ViewOffIcon} className="size-3 mr-1" />
            {t("layersPanel.hideAll")}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUnlockAll}
          className="h-5 px-1.5 text-[10px]"
        >
          <HugeiconsIcon icon={SquareUnlock02Icon} className="size-3 mr-1" />
          {t("layersPanel.unlockAll")}
        </Button>
      </div>

      {/* Layer List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-1">
          {filteredLayers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              objectCount={getObjectCount(layer.id)}
              isActive={activeLayerId === layer.id}
              onSelect={() => setActiveLayerId(layer.id)}
              onToggleVisibility={() => toggleLayerVisibility(layer.id)}
              onToggleLock={() => toggleLayerLock(layer.id)}
              onUpdateColor={(color) => updateLayer(layer.id, { color })}
              onUpdateName={(name) => updateLayer(layer.id, { name })}
              onDelete={() => deleteLayer(layer.id)}
              onSelectObjects={() => selectByLayer(layer.id)}
            />
          ))}

          {filteredLayers.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground">{t("layersPanel.noLayersFound")}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          {objects.length} {t("statusBar.objects").toLowerCase()}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {layers.filter((l) => l.visible).length}/{layers.length} visible
        </span>
      </div>
    </div>
  )
}

export default LayersPanel
