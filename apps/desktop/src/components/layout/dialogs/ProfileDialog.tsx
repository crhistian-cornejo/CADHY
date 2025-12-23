/**
 * Profile Dialog
 *
 * User profile management dialog with account settings.
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Separator,
  toast,
} from "@cadhy/ui"
import { Camera01Icon, Edit01Icon, Mail01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { type UserProfile, useSettingsStore } from "@/stores/settings-store"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { t } = useTranslation()

  // Use the settings store
  const profile = useSettingsStore((s) => s.profile)
  const setProfile = useSettingsStore((s) => s.setProfile)

  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile)

  // Ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync local state when dialog opens or profile changes
  useEffect(() => {
    if (open) {
      setEditedProfile(profile)
      setIsEditing(false)
    }
  }, [open, profile])

  const handleSave = () => {
    setProfile(editedProfile)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setIsEditing(false)
  }

  // Handle avatar file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) return

    // Validate size (max 2MB for localStorage)
    if (file.size > 2 * 1024 * 1024) {
      toast.warning(t("profile.imageTooLarge", "Image too large. Maximum size is 2MB."))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) {
        setEditedProfile({ ...editedProfile, avatar: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  // Trigger file input click
  const handleAvatarButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm w-[95vw] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-2xl bg-primary/10">
              <HugeiconsIcon icon={UserIcon} className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{t("profile.title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("profile.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[300px]">
          <div className="p-4 space-y-4">
            {/* Hidden file input for avatar upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />

            {/* Avatar Section */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="size-14 rounded-2xl">
                  <AvatarImage
                    src={isEditing ? editedProfile.avatar : profile.avatar}
                    alt={isEditing ? editedProfile.name : profile.name}
                  />
                  <AvatarFallback className="rounded-2xl text-base">
                    {(isEditing ? editedProfile.name : profile.name).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    className="absolute -bottom-1 -right-1 rounded-full size-5"
                    onClick={handleAvatarButtonClick}
                    type="button"
                  >
                    <HugeiconsIcon icon={Camera01Icon} className="size-3" />
                  </Button>
                )}
              </div>
              {!isEditing && (
                <div>
                  <h3 className="text-sm font-medium">{profile.name}</h3>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Profile Fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="flex items-center gap-1.5 text-xs">
                  <HugeiconsIcon icon={UserIcon} className="size-3.5" />
                  {t("profile.name")}
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={editedProfile.name}
                    onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs px-2.5 py-1.5 bg-muted/30 rounded-2xl">{profile.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1.5 text-xs">
                  <HugeiconsIcon icon={Mail01Icon} className="size-3.5" />
                  {t("profile.email")}
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs px-2.5 py-1.5 bg-muted/30 rounded-2xl">{profile.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs">
                  {t("profile.company")}
                </Label>
                {isEditing ? (
                  <Input
                    id="company"
                    value={editedProfile.company ?? ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, company: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs px-2.5 py-1.5 bg-muted/30 rounded-2xl">
                    {profile.company || t("profile.notSet")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs">
                  {t("profile.role")}
                </Label>
                {isEditing ? (
                  <Input
                    id="role"
                    value={editedProfile.role ?? ""}
                    onChange={(e) => setEditedProfile({ ...editedProfile, role: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs px-2.5 py-1.5 bg-muted/30 rounded-2xl">
                    {profile.role || t("profile.notSet")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/50 bg-muted/30">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                {t("common.cancel")}
              </Button>
              <Button variant="default" size="sm" onClick={handleSave}>
                {t("common.save")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
              >
                <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
                {t("profile.edit")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                {t("common.close")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
