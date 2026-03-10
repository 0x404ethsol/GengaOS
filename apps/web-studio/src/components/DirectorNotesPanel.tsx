import { useState } from "react";
import { getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";

export type ParsedDirectorAction = {
  actionId: string;
  label: string;
  command: string;
  payload: Record<string, unknown>;
  confidence: number;
  warnings: string[];
};

interface DirectorNotesPanelProps {
  projectId: string;
  onActionsReady: (actions: ParsedDirectorAction[]) => void;
  onStatus: (value: string) => void;
}

export function DirectorNotesPanel({ projectId, onActionsReady, onStatus }: DirectorNotesPanelProps) {
  const [notes, setNotes] = useState("Retake this beat, tighten camera close-up, and lock style before final.");
  const [actions, setActions] = useState<ParsedDirectorAction[]>([]);

  const parseNotes = async () => {
    const response = await controlApi.parseDirectorNotes(projectId, notes);
    const parsed = (response.actions ?? []) as ParsedDirectorAction[];
    setActions(parsed);
    onActionsReady(parsed);
    onStatus(`Parsed ${parsed.length} note actions into command queue`);
  };

  return (
    <section className="panel-block notes-panel">
      <h2>{getAnimeSectionLabel("scriptDesk")} Director Notes</h2>
      <p className="muted">Convert free-text notes into structured, reviewable commands before applying edits.</p>
      <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      <button type="button" onClick={parseNotes}>Parse Notes</button>

      <div className="issue-list">
        {actions.map((action) => (
          <article key={action.actionId} className="issue-item">
            <div className="issue-item-head">
              <strong>{action.label}</strong>
              <span className="pill">conf {action.confidence}</span>
            </div>
            <p className="muted">{action.command}</p>
            {action.warnings.map((warning, index) => (
              <p className="muted" key={`${action.actionId}-w-${index}`}>{warning}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
