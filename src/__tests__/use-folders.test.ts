import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFolderStore } from "../features/folders/use-folders";

// Reset the store before each test
beforeEach(() => {
  useFolderStore.setState({ folders: [], sessionFolders: {} });
  localStorage.clear();
});

describe("useFolderStore", () => {
  it("creates a folder and returns it", () => {
    const folder = useFolderStore.getState().createFolder("Work");
    expect(folder.name).toBe("Work");
    expect(folder.parentId).toBeNull();
    expect(folder.id).toMatch(/^folder_/);
    expect(folder.createdAt).toBeGreaterThan(0);
    expect(useFolderStore.getState().folders).toHaveLength(1);
  });

  it("renames a folder", () => {
    const folder = useFolderStore.getState().createFolder("Old Name");
    useFolderStore.getState().renameFolder(folder.id, "New Name");
    const renamed = useFolderStore.getState().folders.find((f) => f.id === folder.id);
    expect(renamed?.name).toBe("New Name");
  });

  it("deletes a folder and moves sessions to root", () => {
    const folder = useFolderStore.getState().createFolder("Delete Me");
    useFolderStore.getState().moveSession("sess_1", folder.id);
    useFolderStore.getState().moveSession("sess_2", folder.id);

    useFolderStore.getState().deleteFolder(folder.id);

    expect(useFolderStore.getState().folders).toHaveLength(0);
    // Sessions should be moved to root (removed from sessionFolders)
    expect(useFolderStore.getState().sessionFolders["sess_1"]).toBeUndefined();
    expect(useFolderStore.getState().sessionFolders["sess_2"]).toBeUndefined();
  });

  it("deletes child folders and moves their sessions to root", () => {
    const parent = useFolderStore.getState().createFolder("Parent");
    const child = useFolderStore.getState().createFolder("Child", parent.id);
    useFolderStore.getState().moveSession("sess_1", child.id);

    useFolderStore.getState().deleteFolder(parent.id);

    expect(useFolderStore.getState().folders).toHaveLength(0);
    expect(useFolderStore.getState().sessionFolders["sess_1"]).toBeUndefined();
  });

  it("moveSession assigns session to folder", () => {
    const folder = useFolderStore.getState().createFolder("Projects");
    useFolderStore.getState().moveSession("sess_1", folder.id);
    expect(useFolderStore.getState().sessionFolders["sess_1"]).toBe(folder.id);
  });

  it("moveSession with null removes session from folder", () => {
    const folder = useFolderStore.getState().createFolder("Projects");
    useFolderStore.getState().moveSession("sess_1", folder.id);
    useFolderStore.getState().moveSession("sess_1", null);
    expect(useFolderStore.getState().sessionFolders["sess_1"]).toBeUndefined();
  });

  it("getFolderChildren returns children of a parent", () => {
    const parent = useFolderStore.getState().createFolder("Parent");
    useFolderStore.getState().createFolder("Child A", parent.id);
    useFolderStore.getState().createFolder("Child B", parent.id);
    useFolderStore.getState().createFolder("Root Only");

    const children = useFolderStore.getState().getFolderChildren(parent.id);
    expect(children).toHaveLength(2);
    expect(children.map((f) => f.name).sort()).toEqual(["Child A", "Child B"]);
  });

  it("getFolderChildren returns root folders for null parentId", () => {
    useFolderStore.getState().createFolder("Root 1");
    useFolderStore.getState().createFolder("Root 2");
    const parent = useFolderStore.getState().createFolder("Parent");
    useFolderStore.getState().createFolder("Child", parent.id);

    const rootChildren = useFolderStore.getState().getFolderChildren(null);
    expect(rootChildren).toHaveLength(3);
  });

  it("getSessionsInFolder returns session IDs in a folder", () => {
    const folder = useFolderStore.getState().createFolder("Work");
    useFolderStore.getState().moveSession("sess_1", folder.id);
    useFolderStore.getState().moveSession("sess_2", folder.id);
    useFolderStore.getState().moveSession("sess_3", null);

    const sessions = useFolderStore.getState().getSessionsInFolder(folder.id);
    expect(sessions.sort()).toEqual(["sess_1", "sess_2"]);
  });

  it("persists across reload (simulated)", () => {
    const folder = useFolderStore.getState().createFolder("Persisted");
    useFolderStore.getState().moveSession("sess_1", folder.id);

    // Read from localStorage and verify
    const stored = JSON.parse(localStorage.getItem("hermes-folders") || "{}");
    expect(stored.state.folders).toHaveLength(1);
    expect(stored.state.folders[0].name).toBe("Persisted");
    expect(stored.state.sessionFolders["sess_1"]).toBe(folder.id);
  });
});
