/**
 * Logo Dropdown Component - CADHY
 *
 * A logo button that opens a dropdown menu with:
 * - User profile section
 * - File actions (New, Open, Save, Export)
 * - Recent projects
 * - Theme/Language settings
 * - Account settings
 * - Help & About
 *
 * Replaces the avatar-based UserProfileDropdown with a cleaner logo-centric design.
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Kbd,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  Clock01Icon,
  ComputerIcon,
  CreditCardIcon,
  File01Icon,
  FileExportIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  HelpCircleIcon,
  InformationCircleIcon,
  Logout01Icon,
  Moon01Icon,
  Notification01Icon,
  Settings01Icon,
  SparklesIcon,
  Sun01Icon,
  TranslateIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { usePlatform } from "@/hooks/use-platform"
import { type LanguageCode, languages } from "@/i18n"
import { useNavigationStore } from "@/stores/navigation-store"
import { useProjectStore } from "@/stores/project-store"
import { useRecentProjectsStore } from "@/stores/recent-projects-store"
import { useUserProfile } from "@/stores/settings-store"
import { useThemeStore } from "@/stores/theme-store"

// ============================================================================
// TYPES
// ============================================================================

interface DialogActions {
  openHelp: () => void
  openAbout: () => void
  openShortcuts: () => void
  openProfile: () => void
  openNotifications: () => void
  openPrivacy: () => void
}

interface LogoDropdownProps {
  onNewProject: () => void
  onOpenProject: () => void
  dialogActions: DialogActions
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LogoDropdown({ onNewProject, onOpenProject, dialogActions }: LogoDropdownProps) {
  const { t, i18n } = useTranslation()
  const profile = useUserProfile()
  const { theme, setTheme } = useThemeStore()
  const { setView } = useNavigationStore()
  const { isMacOS } = usePlatform()
  const saveCurrentProject = useProjectStore((s) => s.saveCurrentProject)
  const currentProject = useProjectStore((s) => s.currentProject)
  const recentProjects = useRecentProjectsStore((s) => s.projects)
  const clearRecentProjects = useRecentProjectsStore((s) => s.clearAllProjects)
  const openExistingProject = useProjectStore((s) => s.openExistingProject)
  const setLoading = useProjectStore((s) => s.setLoading)

  const modKey = isMacOS ? "⌘" : "Ctrl"

  const handleOpenRecentProject = useCallback(
    async (path: string) => {
      setLoading(true)
      setView("modeller")
      try {
        await openExistingProject(path)
      } catch (error) {
        console.error("Failed to open recent project:", error)
        setView("projects")
      }
    },
    [openExistingProject, setLoading, setView]
  )

  const currentLanguage = i18n.language as LanguageCode

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative group transition-all h-8 gap-1 px-2">
          <img
            src="/LOGO.png"
            alt="CADHY"
            className="size-5 transition-transform group-hover:scale-105"
          />
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3 text-muted-foreground group-hover:text-foreground transition-colors"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-64 rounded-2xl">
        {/* User Profile Header */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="size-10 rounded-2xl ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="rounded-2xl text-sm font-medium">
                  {profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold truncate">{profile.name}</span>
                <span className="text-xs text-muted-foreground truncate">{profile.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* File Actions */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("menu.file")}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={onNewProject}>
            <HugeiconsIcon icon={File01Icon} className="size-4 mr-2" />
            {t("menu.newProject")}
            <DropdownMenuShortcut>
              <Kbd>{modKey}N</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenProject}>
            <HugeiconsIcon icon={FolderOpenIcon} className="size-4 mr-2" />
            {t("menu.openProject")}
            <DropdownMenuShortcut>
              <Kbd>{modKey}O</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={Clock01Icon} className="size-4 mr-2" />
              {t("menu.openRecent")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[220px]">
                {recentProjects.length > 0 ? (
                  <>
                    {recentProjects.slice(0, 5).map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleOpenRecentProject(project.path)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium text-sm">{project.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {project.path}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={clearRecentProjects}
                      className="text-destructive focus:text-destructive"
                    >
                      {t("menu.clearRecent")}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                    {t("openProject.noRecent")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => currentProject && saveCurrentProject()}
            disabled={!currentProject}
          >
            <HugeiconsIcon icon={FloppyDiskIcon} className="size-4 mr-2" />
            {t("menu.save")}
            <DropdownMenuShortcut>
              <Kbd>{modKey}S</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!currentProject}>
            <HugeiconsIcon icon={FileExportIcon} className="size-4 mr-2" />
            {t("menu.export")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* View Settings */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("menu.view")}
          </DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={Sun01Icon} className="size-4 mr-2" />
              {t("menu.theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                >
                  <DropdownMenuRadioItem value="light">
                    <HugeiconsIcon icon={Sun01Icon} className="size-4 mr-2" />
                    {t("menu.light")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <HugeiconsIcon icon={Moon01Icon} className="size-4 mr-2" />
                    {t("menu.dark")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <HugeiconsIcon icon={ComputerIcon} className="size-4 mr-2" />
                    {t("menu.system")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={TranslateIcon} className="size-4 mr-2" />
              {t("menu.language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={currentLanguage}
                  onValueChange={handleLanguageChange}
                >
                  {languages.map((lang) => (
                    <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Account */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("menu.account")}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={dialogActions.openProfile}>
            <HugeiconsIcon icon={Settings01Icon} className="size-4 mr-2" />
            {t("menu.preferences")}
            <DropdownMenuShortcut>
              <Kbd>{modKey},</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={SparklesIcon} className="size-4 mr-2" />
            {t("menu.upgradeToPro")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={CreditCardIcon} className="size-4 mr-2" />
            {t("menu.billing")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={dialogActions.openNotifications}>
            <HugeiconsIcon icon={Notification01Icon} className="size-4 mr-2" />
            {t("menu.notifications")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Help */}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={dialogActions.openHelp}>
            <HugeiconsIcon icon={HelpCircleIcon} className="size-4 mr-2" />
            {t("menu.helpSupport")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={dialogActions.openAbout}>
            <HugeiconsIcon icon={InformationCircleIcon} className="size-4 mr-2" />
            {t("menu.about")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <HugeiconsIcon icon={Logout01Icon} className="size-4 mr-2" />
          {t("menu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LogoDropdown
