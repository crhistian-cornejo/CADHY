/**
 * Recent Projects Store Tests - @cadhy/desktop
 *
 * Tests for the recent projects store including:
 * - Project management (add, update, remove, clear)
 * - Folder management (create, update, delete)
 * - Folder-project relationships
 * - Limits and constraints
 */

import { beforeEach, describe, expect, test } from "bun:test"
import type { RecentProject } from "@cadhy/types"
import { useRecentProjectsStore } from "../stores/recent-projects-store"

// Helper to create a test project
const createTestProject = (
  overrides?: Partial<Omit<RecentProject, "lastOpened" | "openCount">>
): Omit<RecentProject, "lastOpened" | "openCount"> => ({
  id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: "Test Project",
  path: "/test/path/project.cadhy",
  folderId: undefined,
  thumbnail: undefined,
  ...overrides,
})

describe("Recent Projects Store", () => {
  beforeEach(() => {
    // Reset store to initial state
    useRecentProjectsStore.setState({
      projects: [],
      folders: [],
      maxProjects: 20,
      maxProjectsPerFolder: 10,
      isLoadingThumbnails: false,
    })
  })

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe("Initial State", () => {
    test("should have empty projects array", () => {
      const state = useRecentProjectsStore.getState()
      expect(state.projects).toEqual([])
    })

    test("should have empty folders array", () => {
      const state = useRecentProjectsStore.getState()
      expect(state.folders).toEqual([])
    })

    test("should have correct default limits", () => {
      const state = useRecentProjectsStore.getState()
      expect(state.maxProjects).toBe(20)
      expect(state.maxProjectsPerFolder).toBe(10)
    })
  })

  // ============================================================
  // Project Management Tests
  // ============================================================

  describe("Project Management", () => {
    describe("addProject", () => {
      test("should add a new project", () => {
        const { addProject } = useRecentProjectsStore.getState()
        const project = createTestProject({ name: "My Project" })

        addProject(project)

        const state = useRecentProjectsStore.getState()
        expect(state.projects).toHaveLength(1)
        expect(state.projects[0].name).toBe("My Project")
      })

      test("should set openCount to 1 for new project", () => {
        const { addProject } = useRecentProjectsStore.getState()
        const project = createTestProject()

        addProject(project)

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].openCount).toBe(1)
      })

      test("should set lastOpened timestamp", () => {
        const { addProject } = useRecentProjectsStore.getState()
        const before = Date.now()
        const project = createTestProject()

        addProject(project)

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].lastOpened).toBeGreaterThanOrEqual(before)
      })

      test("should add project at beginning of list", () => {
        const { addProject } = useRecentProjectsStore.getState()

        addProject(createTestProject({ id: "first", name: "First" }))
        addProject(createTestProject({ id: "second", name: "Second" }))

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].name).toBe("Second")
        expect(state.projects[1].name).toBe("First")
      })

      test("should increment openCount if project already exists", () => {
        const { addProject } = useRecentProjectsStore.getState()
        const project = createTestProject({ id: "existing" })

        addProject(project)
        addProject(project) // Add again

        const state = useRecentProjectsStore.getState()
        expect(state.projects).toHaveLength(1)
        expect(state.projects[0].openCount).toBe(2)
      })

      test("should preserve folderId when re-adding existing project", () => {
        const { addProject, assignProjectToFolder, createFolder } =
          useRecentProjectsStore.getState()
        const project = createTestProject({ id: "existing" })

        addProject(project)
        const folder = createFolder("Work")
        assignProjectToFolder(project.id, folder.id)

        // Re-add the same project
        addProject(project)

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].folderId).toBe(folder.id)
      })

      test("should limit total projects to maxProjects", () => {
        useRecentProjectsStore.setState({ maxProjects: 3 })
        const { addProject } = useRecentProjectsStore.getState()

        for (let i = 0; i < 5; i++) {
          addProject(createTestProject({ id: `project-${i}`, name: `Project ${i}` }))
        }

        const state = useRecentProjectsStore.getState()
        expect(state.projects).toHaveLength(3)
        // Most recent should be first
        expect(state.projects[0].name).toBe("Project 4")
      })
    })

    describe("updateProject", () => {
      test("should update project properties", () => {
        const { addProject, updateProject } = useRecentProjectsStore.getState()
        const project = createTestProject({ id: "test" })
        addProject(project)

        updateProject("test", { name: "Updated Name" })

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].name).toBe("Updated Name")
      })

      test("should not affect other projects", () => {
        const { addProject, updateProject } = useRecentProjectsStore.getState()
        addProject(createTestProject({ id: "first", name: "First" }))
        addProject(createTestProject({ id: "second", name: "Second" }))

        updateProject("first", { name: "Updated" })

        const state = useRecentProjectsStore.getState()
        const second = state.projects.find((p) => p.id === "second")
        expect(second?.name).toBe("Second")
      })
    })

    describe("removeProject", () => {
      test("should remove project from store", () => {
        const { addProject, removeProject } = useRecentProjectsStore.getState()
        const project = createTestProject({ id: "to-remove" })
        addProject(project)

        removeProject("to-remove")

        const state = useRecentProjectsStore.getState()
        expect(state.projects).toHaveLength(0)
      })

      test("should keep other projects", () => {
        const { addProject, removeProject } = useRecentProjectsStore.getState()
        addProject(createTestProject({ id: "keep", name: "Keep" }))
        addProject(createTestProject({ id: "remove", name: "Remove" }))

        removeProject("remove")

        const state = useRecentProjectsStore.getState()
        expect(state.projects).toHaveLength(1)
        expect(state.projects[0].name).toBe("Keep")
      })
    })

    describe("clearAllProjects", () => {
      test("should remove all projects", () => {
        const { addProject, clearAllProjects } = useRecentProjectsStore.getState()
        addProject(createTestProject({ id: "first" }))
        addProject(createTestProject({ id: "second" }))
        addProject(createTestProject({ id: "third" }))

        clearAllProjects()

        const state = useRecentProjectsStore.getState()
        expect(state.projects).toHaveLength(0)
      })
    })

    describe("getProjectById", () => {
      test("should return project by ID", () => {
        const { addProject, getProjectById } = useRecentProjectsStore.getState()
        addProject(createTestProject({ id: "target", name: "Target" }))
        addProject(createTestProject({ id: "other", name: "Other" }))

        const project = getProjectById("target")

        expect(project?.name).toBe("Target")
      })

      test("should return undefined for invalid ID", () => {
        const { getProjectById } = useRecentProjectsStore.getState()

        const project = getProjectById("nonexistent")

        expect(project).toBeUndefined()
      })
    })

    describe("getProjectByPath", () => {
      test("should return project by path", () => {
        const { addProject, getProjectByPath } = useRecentProjectsStore.getState()
        addProject(createTestProject({ path: "/my/project.cadhy", name: "MyProject" }))

        const project = getProjectByPath("/my/project.cadhy")

        expect(project?.name).toBe("MyProject")
      })

      test("should return undefined for invalid path", () => {
        const { getProjectByPath } = useRecentProjectsStore.getState()

        const project = getProjectByPath("/nonexistent/path")

        expect(project).toBeUndefined()
      })
    })

    describe("incrementOpenCount", () => {
      test("should increment open count", () => {
        const { addProject, incrementOpenCount } = useRecentProjectsStore.getState()
        addProject(createTestProject({ id: "test" }))

        incrementOpenCount("test")

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].openCount).toBe(2) // Initial 1 + increment
      })

      test("should update lastOpened timestamp", () => {
        const { addProject, incrementOpenCount } = useRecentProjectsStore.getState()
        addProject(createTestProject({ id: "test" }))
        const before = Date.now()

        incrementOpenCount("test")

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].lastOpened).toBeGreaterThanOrEqual(before)
      })
    })

    describe("setThumbnail", () => {
      test("should set thumbnail for project", () => {
        const { addProject, setThumbnail } = useRecentProjectsStore.getState()
        addProject(createTestProject({ id: "test" }))

        setThumbnail("test", "data:image/png;base64,xyz")

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].thumbnail).toBe("data:image/png;base64,xyz")
      })
    })
  })

  // ============================================================
  // Folder Management Tests
  // ============================================================

  describe("Folder Management", () => {
    describe("createFolder", () => {
      test("should create a new folder", () => {
        const { createFolder } = useRecentProjectsStore.getState()

        const folder = createFolder("Work Projects")

        expect(folder.name).toBe("Work Projects")
        expect(folder.id).toBeDefined()
      })

      test("should set default color preset to blue", () => {
        const { createFolder } = useRecentProjectsStore.getState()

        const folder = createFolder("Test")

        expect(folder.colorPreset).toBe("blue")
      })

      test("should allow custom color preset", () => {
        const { createFolder } = useRecentProjectsStore.getState()

        const folder = createFolder("Test", "green")

        expect(folder.colorPreset).toBe("green")
      })

      test("should set timestamps", () => {
        const { createFolder } = useRecentProjectsStore.getState()
        const before = Date.now()

        const folder = createFolder("Test")

        expect(folder.createdAt).toBeGreaterThanOrEqual(before)
        expect(folder.modifiedAt).toBeGreaterThanOrEqual(before)
      })

      test("should add folder to store", () => {
        const { createFolder } = useRecentProjectsStore.getState()

        createFolder("Folder 1")
        createFolder("Folder 2")

        const state = useRecentProjectsStore.getState()
        expect(state.folders).toHaveLength(2)
      })

      test("should set sortOrder incrementally", () => {
        const { createFolder } = useRecentProjectsStore.getState()

        const folder1 = createFolder("First")
        const folder2 = createFolder("Second")

        expect(folder1.sortOrder).toBe(0)
        expect(folder2.sortOrder).toBe(1)
      })
    })

    describe("updateFolder", () => {
      test("should update folder properties", () => {
        const { createFolder, updateFolder } = useRecentProjectsStore.getState()
        const folder = createFolder("Original")

        updateFolder(folder.id, { name: "Updated" })

        const state = useRecentProjectsStore.getState()
        expect(state.folders[0].name).toBe("Updated")
      })

      test("should update modifiedAt timestamp", () => {
        const { createFolder, updateFolder } = useRecentProjectsStore.getState()
        const folder = createFolder("Test")
        const originalModified = folder.modifiedAt

        // Small delay to ensure different timestamp
        updateFolder(folder.id, { name: "Updated" })

        const state = useRecentProjectsStore.getState()
        expect(state.folders[0].modifiedAt).toBeGreaterThanOrEqual(originalModified)
      })
    })

    describe("deleteFolder", () => {
      test("should remove folder from store", () => {
        const { createFolder, deleteFolder } = useRecentProjectsStore.getState()
        const folder = createFolder("To Delete")

        deleteFolder(folder.id)

        const state = useRecentProjectsStore.getState()
        expect(state.folders).toHaveLength(0)
      })

      test("should unassign projects from deleted folder", () => {
        const { addProject, createFolder, assignProjectToFolder, deleteFolder } =
          useRecentProjectsStore.getState()
        const project = createTestProject({ id: "test" })
        addProject(project)
        const folder = createFolder("Work")
        assignProjectToFolder(project.id, folder.id)

        deleteFolder(folder.id)

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].folderId).toBeUndefined()
      })
    })

    describe("getFolderById", () => {
      test("should return folder by ID", () => {
        const { createFolder, getFolderById } = useRecentProjectsStore.getState()
        const folder = createFolder("Target")

        const result = getFolderById(folder.id)

        expect(result?.name).toBe("Target")
      })

      test("should return undefined for invalid ID", () => {
        const { getFolderById } = useRecentProjectsStore.getState()

        const result = getFolderById("nonexistent")

        expect(result).toBeUndefined()
      })
    })
  })

  // ============================================================
  // Folder-Project Relationship Tests
  // ============================================================

  describe("Folder-Project Relationships", () => {
    describe("assignProjectToFolder", () => {
      test("should assign project to folder", () => {
        const { addProject, createFolder, assignProjectToFolder } =
          useRecentProjectsStore.getState()
        const project = createTestProject({ id: "test" })
        addProject(project)
        const folder = createFolder("Work")

        const success = assignProjectToFolder(project.id, folder.id)

        expect(success).toBe(true)
        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].folderId).toBe(folder.id)
      })

      test("should remove project from folder when folderId is undefined", () => {
        const { addProject, createFolder, assignProjectToFolder } =
          useRecentProjectsStore.getState()
        const project = createTestProject({ id: "test" })
        addProject(project)
        const folder = createFolder("Work")
        assignProjectToFolder(project.id, folder.id)

        assignProjectToFolder(project.id, undefined)

        const state = useRecentProjectsStore.getState()
        expect(state.projects[0].folderId).toBeUndefined()
      })

      test("should reject if folder is at capacity", () => {
        useRecentProjectsStore.setState({ maxProjectsPerFolder: 2 })
        const { addProject, createFolder, assignProjectToFolder } =
          useRecentProjectsStore.getState()

        const folder = createFolder("Small Folder")
        addProject(createTestProject({ id: "p1" }))
        addProject(createTestProject({ id: "p2" }))
        addProject(createTestProject({ id: "p3" }))

        assignProjectToFolder("p1", folder.id)
        assignProjectToFolder("p2", folder.id)
        const success = assignProjectToFolder("p3", folder.id)

        expect(success).toBe(false)
        const state = useRecentProjectsStore.getState()
        const p3 = state.projects.find((p) => p.id === "p3")
        expect(p3?.folderId).toBeUndefined()
      })
    })

    describe("getProjectsInFolder", () => {
      test("should return projects in folder", () => {
        const { addProject, createFolder, assignProjectToFolder, getProjectsInFolder } =
          useRecentProjectsStore.getState()

        const folder = createFolder("Work")
        addProject(createTestProject({ id: "in-folder", name: "In Folder" }))
        addProject(createTestProject({ id: "not-in-folder", name: "Not In Folder" }))
        assignProjectToFolder("in-folder", folder.id)

        const projects = getProjectsInFolder(folder.id)

        expect(projects).toHaveLength(1)
        expect(projects[0].name).toBe("In Folder")
      })

      test("should return empty array for folder with no projects", () => {
        const { createFolder, getProjectsInFolder } = useRecentProjectsStore.getState()
        const folder = createFolder("Empty")

        const projects = getProjectsInFolder(folder.id)

        expect(projects).toEqual([])
      })
    })

    describe("getUnfolderedProjects", () => {
      test("should return projects not in any folder", () => {
        const { addProject, createFolder, assignProjectToFolder, getUnfolderedProjects } =
          useRecentProjectsStore.getState()

        const folder = createFolder("Work")
        addProject(createTestProject({ id: "in-folder", name: "In Folder" }))
        addProject(createTestProject({ id: "no-folder", name: "No Folder" }))
        assignProjectToFolder("in-folder", folder.id)

        const projects = getUnfolderedProjects()

        expect(projects).toHaveLength(1)
        expect(projects[0].name).toBe("No Folder")
      })
    })

    describe("canAddToFolder", () => {
      test("should return true if folder has space", () => {
        const { createFolder, canAddToFolder } = useRecentProjectsStore.getState()
        const folder = createFolder("Test")

        expect(canAddToFolder(folder.id)).toBe(true)
      })

      test("should return false if folder is at capacity", () => {
        useRecentProjectsStore.setState({ maxProjectsPerFolder: 1 })
        const { addProject, createFolder, assignProjectToFolder, canAddToFolder } =
          useRecentProjectsStore.getState()

        const folder = createFolder("Small")
        addProject(createTestProject({ id: "p1" }))
        assignProjectToFolder("p1", folder.id)

        expect(canAddToFolder(folder.id)).toBe(false)
      })
    })
  })
})
