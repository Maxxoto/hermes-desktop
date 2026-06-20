import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagBadge from "../features/tags/TagBadge";

describe("TagBadge", () => {
  it("renders tag name with color", () => {
    render(<TagBadge name="Important" color="#FF453A" />);
    expect(screen.getByText("Important")).toBeInTheDocument();
    const badge = screen.getByText("Important").closest("span");
    expect(badge).toHaveStyle({ backgroundColor: "#FF453A33" });
  });

  it("renders without remove button when no onRemove", () => {
    render(<TagBadge name="No Remove" color="#0A84FF" />);
    expect(screen.queryByLabelText("Remove tag No Remove")).not.toBeInTheDocument();
  });

  it("calls onRemove when remove button clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<TagBadge name="Removable" color="#30D158" onRemove={onRemove} />);

    const removeBtn = screen.getByLabelText("Remove tag Removable");
    await user.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
