import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagPicker from "../features/tags/TagPicker";
import { useTagStore } from "../features/tags/use-tags";

beforeEach(() => {
  useTagStore.setState({ tags: [], sessionTags: {} });
  localStorage.clear();
});

describe("TagPicker", () => {
  it("shows existing tags", () => {
    useTagStore.getState().createTag("Bug");
    useTagStore.getState().createTag("Feature");
    render(<TagPicker sessionId="sess_1" onClose={() => {}} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("shows create new tag button", () => {
    render(<TagPicker sessionId="sess_1" onClose={() => {}} />);
    expect(screen.getByText("Create new tag")).toBeInTheDocument();
  });

  it("create new tag input works", async () => {
    const user = userEvent.setup();
    render(<TagPicker sessionId="sess_1" onClose={() => {}} />);
    await user.click(screen.getByText("Create new tag"));

    const input = screen.getByPlaceholderText("Tag name...");
    await user.type(input, "New Tag{Enter}");

    const tags = useTagStore.getState().tags;
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("New Tag");
    // Should also be assigned to the session
    expect(useTagStore.getState().sessionTags["sess_1"]).toEqual([tags[0].id]);
  });

  it("toggle tag on session adds and removes", async () => {
    const user = userEvent.setup();
    const tag = useTagStore.getState().createTag("Toggle Me");
    render(<TagPicker sessionId="sess_1" onClose={() => {}} />);

    // Click to add
    await user.click(screen.getByText("Toggle Me"));
    expect(useTagStore.getState().sessionTags["sess_1"]).toEqual([tag.id]);

    // Click again to remove
    await user.click(screen.getByText("Toggle Me"));
    expect(useTagStore.getState().sessionTags["sess_1"]).toEqual([]);
  });
});
