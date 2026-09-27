import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMatchNotes,
  saveMatchNotes,
  upsertAnchoredNote,
  addFreeformNote,
  updateNoteText,
  deleteMatchNote,
  type MatchNote,
} from "./notes.js";

describe("match notes persistence", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    (
      globalThis as unknown as { localStorage: typeof mockStorage }
    ).localStorage = mockStorage;
  });

  it("returns an empty array when nothing is saved", () => {
    expect(loadMatchNotes("game-1")).toEqual([]);
  });

  it("saves and loads notes for a game", () => {
    const note: MatchNote = {
      id: "n1",
      frameIndex: 120,
      text: "hello",
      createdAt: 1,
      updatedAt: 1,
    };
    saveMatchNotes("game-1", [note]);
    expect(loadMatchNotes("game-1")).toEqual([note]);
  });

  it("removes the storage entry when saving an empty array", () => {
    saveMatchNotes("game-1", [
      { id: "n1", frameIndex: 0, text: "x", createdAt: 1, updatedAt: 1 },
    ]);
    saveMatchNotes("game-1", []);
    expect(localStorage.getItem("rmgr_notes_game-1")).toBeNull();
  });

  it("keeps notes for different games separate", () => {
    addFreeformNote("game-1", 10, "note for game 1");
    addFreeformNote("game-2", 20, "note for game 2");
    expect(loadMatchNotes("game-1")).toHaveLength(1);
    expect(loadMatchNotes("game-2")).toHaveLength(1);
    expect(loadMatchNotes("game-1")[0]!.text).toBe("note for game 1");
  });

  describe("upsertAnchoredNote", () => {
    it("creates a new anchored note", () => {
      const notes = upsertAnchoredNote("game-1", 500, "opening comment");
      expect(notes).toHaveLength(1);
      expect(notes[0]!.eventFrameIndex).toBe(500);
      expect(notes[0]!.frameIndex).toBe(500);
      expect(notes[0]!.text).toBe("opening comment");
    });

    it("replaces the existing note for the same eventFrameIndex instead of adding a second one", () => {
      upsertAnchoredNote("game-1", 500, "first draft");
      const notes = upsertAnchoredNote("game-1", 500, "revised");
      expect(notes).toHaveLength(1);
      expect(notes[0]!.text).toBe("revised");
    });

    it("keeps notes anchored to different events separate", () => {
      upsertAnchoredNote("game-1", 500, "a");
      const notes = upsertAnchoredNote("game-1", 900, "b");
      expect(notes).toHaveLength(2);
    });
  });

  describe("addFreeformNote", () => {
    it("always adds a new note, even at a repeated frame index", () => {
      addFreeformNote("game-1", 300, "first");
      const notes = addFreeformNote("game-1", 300, "second");
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.text)).toEqual(["first", "second"]);
    });

    it("does not set eventFrameIndex", () => {
      const notes = addFreeformNote("game-1", 300, "freeform");
      expect(notes[0]!.eventFrameIndex).toBeUndefined();
    });
  });

  describe("updateNoteText", () => {
    it("updates the text of an existing note by id", () => {
      const [created] = addFreeformNote("game-1", 300, "original");
      const notes = updateNoteText("game-1", created!.id, "edited");
      expect(notes[0]!.text).toBe("edited");
      expect(notes[0]!.id).toBe(created!.id);
    });

    it("is a no-op for an unknown note id", () => {
      addFreeformNote("game-1", 300, "original");
      const notes = updateNoteText("game-1", "does-not-exist", "edited");
      expect(notes).toHaveLength(1);
      expect(notes[0]!.text).toBe("original");
    });
  });

  describe("deleteMatchNote", () => {
    it("removes a note by id", () => {
      const [created] = addFreeformNote("game-1", 300, "to delete");
      const notes = deleteMatchNote("game-1", created!.id);
      expect(notes).toHaveLength(0);
      expect(loadMatchNotes("game-1")).toHaveLength(0);
    });
  });
});
