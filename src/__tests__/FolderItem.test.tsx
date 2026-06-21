import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FolderItem from "../features/folders/FolderItem";
import { useFolderStore } from "../features/folders/use-folders";

beforeEach(() => {
  useFolderStore.setState({ folders: [], sessionFolders: {} });
  localStorage.clear();
});

describe("FolderItem", () => {
  it("renders folder name", () => {
    const folder = useFolderStore.getState().createFolder("My Folder");
    render(
      <FolderItem
        folderId={folder.id}
        name="My Folder"
        depth={0}
        isExpanded={false}
        onToggle={vi.fn()}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("My Folder")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const folder = useFolderStore.getState().createFolder("Click Me");
    render(
      <FolderItem
        folderId={folder.id}
        name="Click Me"
        depth={0}
        isExpanded={false}
        onToggle={vi.fn()}
        isSelected={false}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByText("Click Me"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("click rename shows edit input", async () => {
    const user = userEvent.setup();
    const folder = useFolderStore.getState().createFolder("Rename Me");
    render(
      <FolderItem
        folderId={folder.id}
        name="Rename Me"
        depth={0}
        isExpanded={false}
        onToggle={vi.fn()}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    const renameBtn = screen.getByTitle("Rename folder");
    await user.click(renameBtn);
    expect(screen.getByDisplayValue("Rename Me")).toBeInTheDocument();
  });

  it("Enter commits rename", async () => {
    const user = userEvent.setup();
    const folder = useFolderStore.getState().createFolder("Old Name");
    render(
      <FolderItem
        folderId={folder.id}
        name="Old Name"
        depth={0}
        isExpanded={false}
        onToggle={vi.fn()}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle("Rename folder"));
    const input = screen.getByDisplayValue("Old Name");
    await user.clear(input);
    await fireEvent.change(input, { target: { value: "New Name" } });
    await user.keyboard("{Enter}");

    const renamed = useFolderStore.getState().folders.find((f) => f.id === folder.id);
    expect(renamed?.name).toBe("New Name");
  });

  it("delete button shows confirmation", async () => {
    const user = userEvent.setup();
    const folder = useFolderStore.getState().createFolder("Delete Me");
    render(
      <FolderItem
        folderId={folder.id}
        name="Delete Me"
        depth={0}
        isExpanded={false}
        onToggle={vi.fn()}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle("Delete folder"));
    expect(screen.getByText("Delete folder?")).toBeInTheDocument();
  });
});
