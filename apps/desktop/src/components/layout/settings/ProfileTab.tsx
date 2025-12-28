/**
 * Profile Tab - Settings Dialog
 *
 * User profile management including name, email, avatar, company, and role.
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Label,
  Separator,
  toast,
} from "@cadhy/ui"
import { Camera01Icon, Edit01Icon, Mail01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { type UserProfile, useSettingsStore } from "@/stores/settings-store"

export function ProfileTab() {
  const { t } = useTranslation()
  const profile = useSettingsStore((s) => s.profile)
  const setProfile = useSettingsStore((s) => s.setProfile)

  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync local state when profile changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditedProfile(profile)
    }
  }, [profile, isEditing])

  const handleSave = () => {
    setProfile(editedProfile)
    setIsEditing(false)
    toast.success(t("settings.profile.saved", "Profile saved"))
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setIsEditing(false)
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) return

    if (file.size > 2 * 1024 * 1024) {
      toast.warning(t("settings.profile.imageTooLarge", "Image too large. Maximum size is 2MB."))
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

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleAvatarChange}
        className="hidden"
      />

      {/* Avatar Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-16 rounded-2xl ring-2 ring-border/50">
              <AvatarImage
                src={isEditing ? editedProfile.avatar : profile.avatar}
                alt={isEditing ? editedProfile.name : profile.name}
              />
              <AvatarFallback className="rounded-2xl text-lg font-semibold">
                {(isEditing ? editedProfile.name : profile.name).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button
                variant="secondary"
                size="icon-xs"
                className="absolute -bottom-1 -right-1 rounded-full size-6 shadow-md"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <HugeiconsIcon icon={Camera01Icon} className="size-3" />
              </Button>
            )}
          </div>
          {!isEditing && (
            <div>
              <h3 className="text-base font-semibold">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          )}
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-2 h-9"
          >
            <HugeiconsIcon icon={Edit01Icon} className="size-4" />
            {t("settings.profile.edit", "Edit")}
          </Button>
        )}
      </div>

      <Separator />

      {/* Profile Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
            <HugeiconsIcon icon={UserIcon} className="size-4 text-muted-foreground" />
            {t("settings.profile.name", "Name")}
          </Label>
          {isEditing ? (
            <Input
              id="name"
              value={editedProfile.name}
              onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
              className="h-10"
              placeholder="Enter your name"
            />
          ) : (
            <p className="text-sm px-3 py-2 bg-muted/50 rounded-xl border">{profile.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
            <HugeiconsIcon icon={Mail01Icon} className="size-4 text-muted-foreground" />
            {t("settings.profile.email", "Email")}
          </Label>
          {isEditing ? (
            <Input
              id="email"
              type="email"
              value={editedProfile.email}
              onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
              className="h-10"
              placeholder="Enter your email"
            />
          ) : (
            <p className="text-sm px-3 py-2 bg-muted/50 rounded-xl border">{profile.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company" className="text-sm font-medium">
            {t("settings.profile.company", "Company")}
          </Label>
          {isEditing ? (
            <Input
              id="company"
              value={editedProfile.company ?? ""}
              onChange={(e) => setEditedProfile({ ...editedProfile, company: e.target.value })}
              className="h-10"
              placeholder="Enter your company"
            />
          ) : (
            <p className="text-sm px-3 py-2 bg-muted/50 rounded-xl border">
              {profile.company || (
                <span className="text-muted-foreground">
                  {t("settings.profile.notSet", "Not set")}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-medium">
            {t("settings.profile.role", "Role")}
          </Label>
          {isEditing ? (
            <Input
              id="role"
              value={editedProfile.role ?? ""}
              onChange={(e) => setEditedProfile({ ...editedProfile, role: e.target.value })}
              className="h-10"
              placeholder="Enter your role"
            />
          ) : (
            <p className="text-sm px-3 py-2 bg-muted/50 rounded-xl border">
              {profile.role || (
                <span className="text-muted-foreground">
                  {t("settings.profile.notSet", "Not set")}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Edit/Save buttons */}
      {isEditing && (
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={handleCancel} className="h-9">
            {t("common.cancel", "Cancel")}
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} className="h-9">
            {t("common.save", "Save")}
          </Button>
        </div>
      )}
    </div>
  )
}
