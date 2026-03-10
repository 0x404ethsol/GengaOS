import { useEffect, useMemo, useState } from "react";
import { getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";

type ProvenanceEvent = {
  provenanceId: string;
  projectId: string;
  shotId: string;
  model: string;
  extensionIds: string[];
  sourceAssets: string[];
};

type VariantRecord = {
  variantId: string;
  projectId: string;
  shotId: string;
  qualityScore: number;
  timingScore: number;
  actingScore: number;
  continuityScore: number;
  selected: boolean;
};

interface RightsReviewPanelProps {
  projectId: string;
  onStatus: (value: string) => void;
}

export function RightsReviewPanel({ projectId, onStatus }: RightsReviewPanelProps) {
  const [events, setEvents] = useState<ProvenanceEvent[]>([]);
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");

  const refresh = async () => {
    const [provenance, telemetry] = await Promise.all([
      controlApi.getProvenance(projectId),
      controlApi.getVariantTelemetry(projectId)
    ]);
    const eventList = (provenance.events ?? []) as ProvenanceEvent[];
    const variantList = (telemetry.variants ?? []) as VariantRecord[];
    setEvents(eventList);
    setVariants(variantList);
    if (!variantA && variantList[0]) setVariantA(variantList[0].variantId);
    if (!variantB && variantList[1]) setVariantB(variantList[1].variantId);
  };

  useEffect(() => {
    refresh();
  }, [projectId]);

  const compare = useMemo(() => {
    const a = variants.find((variant) => variant.variantId === variantA);
    const b = variants.find((variant) => variant.variantId === variantB);
    if (!a || !b) return null;
    return {
      quality: Number((a.qualityScore - b.qualityScore).toFixed(2)),
      timing: Number((a.timingScore - b.timingScore).toFixed(2)),
      acting: Number((a.actingScore - b.actingScore).toFixed(2)),
      continuity: Number((a.continuityScore - b.continuityScore).toFixed(2))
    };
  }, [variantA, variantB, variants]);

  const coachHints = useMemo(() => {
    const selected = variants.find((variant) => variant.variantId === variantA) ?? variants[0];
    if (!selected) return ["Generate a variant to unlock performance coach hints."];
    const hints = [];
    if (selected.timingScore < 0.7) hints.push("Increase anticipation holds by 1-2 frames before impact.");
    if (selected.actingScore < 0.7) hints.push("Boost eye-line commitment on key emotional beats.");
    if (selected.continuityScore < 0.7) hints.push("Re-run continuity pass for props and camera axis consistency.");
    if (!hints.length) hints.push("Performance looks strong. Preserve current acting and timing profile.");
    return hints;
  }, [variantA, variants]);

  const exportReport = () => {
    const report = {
      projectId,
      generatedAt: new Date().toISOString(),
      provenanceEvents: events,
      variants
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `genga-rights-report-${projectId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onStatus("Rights/provenance report exported");
  };

  return (
    <section className="panel-block rights-panel">
      <div className="panel-head">
        <h2>{getAnimeSectionLabel("deliver")} Rights + Review Intelligence</h2>
        <button type="button" className="ghost-button" onClick={refresh}>Refresh</button>
      </div>
      <p className="muted">Immutable provenance + variant telemetry for rights confidence, A/B review, and performance coaching.</p>

      <div className="video-stats">
        <span className="pill">Provenance: {events.length}</span>
        <span className="pill">Variants: {variants.length}</span>
      </div>

      <button type="button" onClick={exportReport}>Export Rights Report</button>

      <div className="grid-two">
        <label>
          Variant A
          <select value={variantA} onChange={(event) => setVariantA(event.target.value)}>
            <option value="">Select</option>
            {variants.map((variant) => (
              <option key={variant.variantId} value={variant.variantId}>
                {variant.variantId} ({variant.shotId})
              </option>
            ))}
          </select>
        </label>
        <label>
          Variant B
          <select value={variantB} onChange={(event) => setVariantB(event.target.value)}>
            <option value="">Select</option>
            {variants.map((variant) => (
              <option key={variant.variantId} value={variant.variantId}>
                {variant.variantId} ({variant.shotId})
              </option>
            ))}
          </select>
        </label>
      </div>

      {compare ? (
        <div className="style-dna-meta">
          <p className="muted"><strong>Quality Δ:</strong> {compare.quality}</p>
          <p className="muted"><strong>Timing Δ:</strong> {compare.timing}</p>
          <p className="muted"><strong>Acting Δ:</strong> {compare.acting}</p>
          <p className="muted"><strong>Continuity Δ:</strong> {compare.continuity}</p>
        </div>
      ) : (
        <p className="muted">Pick two variants to compare.</p>
      )}

      <div className="style-drift-review">
        <strong>Performance Coach</strong>
        {coachHints.map((hint, index) => (
          <p className="muted" key={`hint-${index}`}>{hint}</p>
        ))}
      </div>
    </section>
  );
}
