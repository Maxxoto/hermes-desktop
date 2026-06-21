/**
 * flow-folder-tag-organization.test.tsx — Folder & Tag Organization Flow
 *
 * Integration-level tests for the folder/tag organization system:
 * creating folders, moving sessions, creating tags, assigning tags,
 * and filtering by folder/tag.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFolderStore } from "../features/folders/use-folders";
import { useTagStore } from "../features/tags/use-tags";

beforeEach(() => {
  useFolderStore.setState({ folders: [], sessionFolders: {} });
  useTagStore.setState({ tags: [], sessionTags: {} });
  localStorage.clear();
});

describe("Flow: Folder & Tag Organization", () => {
  // ---- Folder flow ---------------------------------------------------------

  it("full flow: create folder → move session → verify", () => {
    const store = useFolderStore.getState();

    // Step 1: Create a folder
    const folder = store.createFolder("Work Projects");
    expect(useFolderStore.getState().folders).toHaveLength(1);
    expect(useFolderStore.getState().folders[0].name).toBe("Work Projects");

    // Step 2: Move sessions into the folder
    useFolderStore.getState().moveSession("sess_1", folder.id);
    useFolderStore.getState().moveSession("sess_2", folder.id);

    // Step 3: Verify sessions are in the folder
    const sessions = useFolderStore.getState().getSessionsInFolder(folder.id);
    expect(sessions.sort()).toEqual(["sess_1", "sess_2"]);

    // Step 4: Create a child folder
    const child = useFolderStore.getState().createFolder("Frontend", folder.id);
    expect(useFolderStore.getState().folders).toHaveLength(2);

    // Step 5: Move a session to the child
    useFolderStore.getState().moveSession("sess_1", child.id);
    const parentSessions = useFolderStore.getState().getSessionsInFolder(folder.id);
    expect(parentSessions).toEqual(["sess_2"]);
    const childSessions = useFolderStore.getState().getSessionsInFolder(child.id);
    expect(childSessions).toEqual(["sess_1"]);

    // Step 6: Delete parent — child and its sessions move to root
    useFolderStore.getState().deleteFolder(folder.id);
    expect(useFolderStore.getState().folders).toHaveLength(0);
    expect(useFolderStore.getState().sessionFolders["sess_1"]).toBeUndefined();
    expect(useFolderStore.getState().sessionFolders["sess_2"]).toBeUndefined();
  });

  // ---- Tag flow ------------------------------------------------------------

  it("full flow: create tag → assign to session → filter by tag", () => {
    // Step 1: Create tags
    const bugTag = useTagStore.getState().createTag("Bug", "#FF453A");
    const featureTag = useTagStore.getState().createTag("Feature", "#30D158");
    expect(useTagStore.getState().tags).toHaveLength(2);

    // Step 2: Assign tags to sessions
    useTagStore.getState().addTagToSession("sess_1", bugTag.id);
    useTagStore.getState().addTagToSession("sess_1", featureTag.id);
    useTagStore.getState().addTagToSession("sess_2", bugTag.id);

    // Step 3: Get tags for a session
    const sess1Tags = useTagStore.getState().getSessionTags("sess_1");
    expect(sess1Tags).toHaveLength(2);
    expect(sess1Tags.map((t) => t.name).sort()).toEqual(["Bug", "Feature"]);

    // Step 4: Filter sessions by tag
    const bugSessions = useTagStore.getState().getSessionsWithTag(bugTag.id);
    expect(bugSessions.sort()).toEqual(["sess_1", "sess_2"]);

    const featureSessions = useTagStore.getState().getSessionsWithTag(featureTag.id);
    expect(featureSessions).toEqual(["sess_1"]);

    // Step 5: Remove tag from session
    useTagStore.getState().removeTagFromSession("sess_1", bugTag.id);
    const updatedSess1Tags = useTagStore.getState().getSessionTags("sess_1");
    expect(updatedSess1Tags).toHaveLength(1);
    expect(updatedSess1Tags[0].name).toBe("Feature");

    // Step 6: Delete tag — removes from all sessions
    useTagStore.getState().deleteTag(featureTag.id);
    expect(useTagStore.getState().tags).toHaveLength(1);
    expect(useTagStore.getState().getSessionTags("sess_1")).toHaveLength(0);
  });

  // ---- Combined folder + tag flow ------------------------------------------

  it("combined: folder + tag filtering works together", () => {
    const workFolder = useFolderStore.getState().createFolder("Work");
    const personalFolder = useFolderStore.getState().createFolder("Personal");
    const urgentTag = useTagStore.getState().createTag("Urgent", "#FF453A");

    // Assign sessions to folders
    useFolderStore.getState().moveSession("sess_1", workFolder.id);
    useFolderStore.getState().moveSession("sess_2", workFolder.id);
    useFolderStore.getState().moveSession("sess_3", personalFolder.id);

    // Tag some sessions
    useTagStore.getState().addTagToSession("sess_1", urgentTag.id);
    useTagStore.getState().addTagToSession("sess_3", urgentTag.id);

    // Filter by folder
    const workSessions = useFolderStore.getState().getSessionsInFolder(workFolder.id);
    expect(workSessions.sort()).toEqual(["sess_1", "sess_2"]);

    // Filter by tag
    const urgentSessions = useTagStore.getState().getSessionsWithTag(urgentTag.id);
    expect(urgentSessions.sort()).toEqual(["sess_1", "sess_3"]);

    // Combined: sessions in Work folder AND tagged Urgent
    const workUrgent = workSessions.filter((s) => urgentSessions.includes(s));
    expect(workUrgent).toEqual(["sess_1"]);
  });
});
