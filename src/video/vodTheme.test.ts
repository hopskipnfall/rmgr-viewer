import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("VOD panel light mode styles", () => {
  const htmlPath = path.resolve(__dirname, "../../index.html");
  const html = fs.readFileSync(htmlPath, "utf-8");

  it("uses theme variables for base VOD controls", () => {
    // .video-sync-btn should use theme-adaptive secondary button variables
    expect(html).toMatch(/\.video-sync-btn\s*\{[^}]*var\(--btn-secondary-bg\)/);
    expect(html).toMatch(
      /\.video-sync-btn:hover\s*\{[^}]*var\(--btn-secondary-hover\)/,
    );

    // .video-offset-badge should use theme-adaptive input variables
    expect(html).toMatch(
      /\.video-offset-badge\s*\{[^}]*var\(--input-bg\)[^}]*var\(--input-border\)/,
    );

    // .form-control should use theme-adaptive input variables and placeholder styling
    expect(html).toMatch(
      /\.form-control\s*\{[^}]*var\(--input-bg\)[^}]*var\(--input-border\)/,
    );
    expect(html).toMatch(
      /\.form-control::placeholder\s*\{[^}]*var\(--text-dim\)/,
    );
  });

  it('defines explicit [data-theme="light"] overrides for VOD panel elements', () => {
    const requiredLightSelectors = [
      '[data-theme="light"] #vodWidget',
      '[data-theme="light"] #vodWidgetHeader',
      '[data-theme="light"] #vodWidgetHeader h2',
      '[data-theme="light"] .vod-youtube-link',
      '[data-theme="light"] .video-sync-btn.active',
      '[data-theme="light"] .video-sync-btn.active.muted',
      '[data-theme="light"] .video-sync-btn.sync-frame-btn',
      '[data-theme="light"] .offset-manual-badge',
      '[data-theme="light"] .vod-unlink-btn',
      '[data-theme="light"] .video-linked-status',
      '[data-theme="light"] .form-error',
      '[data-theme="light"] .form-notice',
      '[data-theme="light"] .form-notice.warning',
      '[data-theme="light"] .form-notice.success',
    ];

    for (const selector of requiredLightSelectors) {
      expect(html).toContain(selector);
    }
  });

  it("defines @media (prefers-color-scheme: light) overrides for VOD panel elements", () => {
    const requiredMediaSelectors = [
      ':root:not([data-theme="dark"]) #vodWidget',
      ':root:not([data-theme="dark"]) #vodWidgetHeader',
      ':root:not([data-theme="dark"]) #vodWidgetHeader h2',
      ':root:not([data-theme="dark"]) .vod-youtube-link',
      ':root:not([data-theme="dark"]) .video-sync-btn.active',
      ':root:not([data-theme="dark"]) .video-sync-btn.active.muted',
      ':root:not([data-theme="dark"]) .video-sync-btn.sync-frame-btn',
      ':root:not([data-theme="dark"]) .offset-manual-badge',
      ':root:not([data-theme="dark"]) .vod-unlink-btn',
      ':root:not([data-theme="dark"]) .video-linked-status',
      ':root:not([data-theme="dark"]) .form-error',
      ':root:not([data-theme="dark"]) .form-notice',
      ':root:not([data-theme="dark"]) .form-notice.warning',
      ':root:not([data-theme="dark"]) .form-notice.success',
    ];

    for (const selector of requiredMediaSelectors) {
      expect(html).toContain(selector);
    }
  });

  it("defines light mode mobile sticky header rules for #vodWidgetHeader", () => {
    expect(html).toContain('[data-theme="light"] #vodWidgetHeader');
    expect(html).toContain(
      "@media (max-width: 768px) and (prefers-color-scheme: light)",
    );
  });

  it("verifies all VOD interactive element IDs are present in index.html", () => {
    const expectedIds = [
      "vodWidget",
      "vodWidgetHeader",
      "vodWidgetBody",
      "vodModeLabel",
      "viewModeCanvasBtn",
      "viewModeCanvasMutedBtn",
      "viewModeVideoBtn",
      "viewModePipBtn",
      "vodSyncLabel",
      "videoOffsetInput",
      "nudgeMinus1sBtn",
      "nudgeMinus1fBtn",
      "nudgePlus1fBtn",
      "nudgePlus1sBtn",
      "offsetManualBadge",
      "clearOffsetOverrideBtn",
      "vodLinkDisplayRow",
      "vodYoutubeLink",
      "vodEditLinkBtn",
      "vodLinkEditRow",
      "videoUrlInput",
      "videoLinkError",
      "videoLinkSaveBtn",
      "videoLinkCancelBtn",
      "unlinkSessionBtn",
      "videoUnlinkBtn",
      "vodSyncBanner",
      "vodSyncBannerText",
      "syncSessionVideosBtn",
      "vodSyncBannerDismissBtn",
    ];

    for (const id of expectedIds) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});
