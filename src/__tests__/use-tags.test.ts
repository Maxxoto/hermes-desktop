import { describe, it, expect, beforeEach } from "vitest";
import { useTagStore } from "../features/tags/use-tags";

// Reset the store before each test
beforeEach(() => {
  useTagStore.setState({ tags: [], sessionTags: {} });
  localStorage.clear();
});

describe("useTagStore", () => {
  it("creates a tag and returns it", () => {
    const tag = useTagStore.getState().createTag("Important");
    expect(tag.name).toBe("Important");
    expect(tag.id).toMatch(/^tag_/);
    expect(tag.color).toBe("#FF453A"); // default red
    expect(useTagStore.getState().tags).toHaveLength(1);
  });

  it("creates a tag with custom color", () => {
    const tag = useTagStore.getState().createTag("Custom", "#0A84FF");
    expect(tag.color).toBe("#0A84FF");
  });

  it("renames a tag", () => {
    const tag = useTagStore.getState().createTag("Old Name");
    useTagStore.getState().renameTag(tag.id, "New Name");
    const renamed = useTagStore.getState().tags.find((t) => t.id === tag.id);
    expect(renamed?.name).toBe("New Name");
  });

  it("deletes a tag from all sessions", () => {
    const tag = useTagStore.getState().createTag("Delete Me");
    useTagStore.getState().addTagToSession("sess_1", tag.id);
    useTagStore.getState().addTagToSession("sess_2", tag.id);

    useTagStore.getState().deleteTag(tag.id);

    expect(useTagStore.getState().tags).toHaveLength(0);
    expect(useTagStore.getState().sessionTags["sess_1"]).toEqual([]);
    expect(useTagStore.getState().sessionTags["sess_2"]).toEqual([]);
  });

  it("addTagToSession assigns a tag to a session", () => {
    const tag = useTagStore.getState().createTag("Work");
    useTagStore.getState().addTagToSession("sess_1", tag.id);
    expect(useTagStore.getState().sessionTags["sess_1"]).toEqual([tag.id]);
  });

  it("addTagToSession is idempotent", () => {
    const tag = useTagStore.getState().createTag("Work");
    useTagStore.getState().addTagToSession("sess_1", tag.id);
    useTagStore.getState().addTagToSession("sess_1", tag.id);
    expect(useTagStore.getState().sessionTags["sess_1"]).toEqual([tag.id]);
  });

  it("removeTagFromSession removes a tag", () => {
    const tag = useTagStore.getState().createTag("Work");
    useTagStore.getState().addTagToSession("sess_1", tag.id);
    useTagStore.getState().removeTagFromSession("sess_1", tag.id);
    expect(useTagStore.getState().sessionTags["sess_1"]).toEqual([]);
  });

  it("getSessionTags returns tags for a session", () => {
    const tag1 = useTagStore.getState().createTag("Important");
    const tag2 = useTagStore.getState().createTag("Bug");
    useTagStore.getState().addTagToSession("sess_1", tag1.id);
    useTagStore.getState().addTagToSession("sess_1", tag2.id);

    const result = useTagStore.getState().getSessionTags("sess_1");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name).sort()).toEqual(["Bug", "Important"]);
  });

  it("getSessionsWithTag returns sessions with a given tag", () => {
    const tag = useTagStore.getState().createTag("Work");
    useTagStore.getState().addTagToSession("sess_1", tag.id);
    useTagStore.getState().addTagToSession("sess_2", tag.id);
    useTagStore.getState().addTagToSession("sess_3", "other-tag");

    const sessions = useTagStore.getState().getSessionsWithTag(tag.id);
    expect(sessions.sort()).toEqual(["sess_1", "sess_2"]);
  });

  it("updateTagColor updates the color", () => {
    const tag = useTagStore.getState().createTag("Colorful");
    useTagStore.getState().updateTagColor(tag.id, "#30D158");
    const updated = useTagStore.getState().tags.find((t) => t.id === tag.id);
    expect(updated?.color).toBe("#30D158");
  });

  it("persists across reload (simulated)", () => {
    const tag = useTagStore.getState().createTag("Persisted");
    useTagStore.getState().addTagToSession("sess_1", tag.id);

    const stored = JSON.parse(localStorage.getItem("hermes-tags") || "{}");
    expect(stored.state.tags).toHaveLength(1);
    expect(stored.state.tags[0].name).toBe("Persisted");
    expect(stored.state.sessionTags["sess_1"]).toEqual([tag.id]);
  });
});
