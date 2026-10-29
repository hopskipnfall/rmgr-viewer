import { describe, it, expect } from "vitest";
import { escapeHtml } from "./html.js";

describe("escapeHtml", () => {
  it("escapes markup and both quote styles so it is safe inside attributes", () => {
    expect(escapeHtml(`use "dash" & <wait> it's`)).toBe(
      "use &quot;dash&quot; &amp; &lt;wait&gt; it&#39;s",
    );
  });
});
