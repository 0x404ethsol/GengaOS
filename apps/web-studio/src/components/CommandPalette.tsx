import { useEffect, useMemo, useState } from "react";
import type { StudioCommand } from "../lib/commands";

interface CommandPaletteProps {
  open: boolean;
  commands: StudioCommand[];
  canUndo?: boolean;
  onUndoLast?: () => void;
  onClose: () => void;
}

export function CommandPalette({ open, commands, canUndo = false, onUndoLast, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<StudioCommand | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPending(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return commands;
    }
    return commands.filter((command) => {
      const haystack = [
        command.label,
        command.description,
        command.scope,
        ...command.keywords
      ].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [commands, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="command-palette-overlay" role="dialog" aria-modal="true">
      <div className="command-palette-panel">
        <div className="command-palette-head">
          <strong>Director Command Palette</strong>
          <div className="row-buttons">
            {canUndo && onUndoLast ? (
              <button type="button" className="ghost-button" onClick={onUndoLast}>
                Undo Last
              </button>
            ) : null}
            <button type="button" className="ghost-button" onClick={onClose}>Close</button>
          </div>
        </div>
        <input
          autoFocus
          placeholder="Type a command..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Command search"
        />
        <div className="command-list">
          {filtered.map((command) => (
            <button
              key={command.id}
              type="button"
              className="command-item"
              onClick={() => {
                if (command.preview) {
                  setPending(command);
                  return;
                }
                command.handler();
                onClose();
              }}
            >
              <span>{command.label}</span>
              <small>{command.scope}</small>
            </button>
          ))}
          {!filtered.length ? <p className="muted">No commands found.</p> : null}
        </div>
        {pending ? (
          <div className="command-preview">
            <strong>Preview</strong>
            <p className="muted">{pending.preview}</p>
            <div className="row-buttons">
              <button
                type="button"
                onClick={() => {
                  pending.handler();
                  setPending(null);
                  onClose();
                }}
              >
                Apply Action
              </button>
              <button type="button" className="ghost-button" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
