import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getAnimeSectionLabel, type SceneIdea } from "@genga/contracts";
import { controlApi } from "../lib/api";

interface SceneIdeaCloudProps {
  projectId: string;
  querySeed?: string;
  graphContext?: string[];
  onUseIdea: (idea: SceneIdea) => void;
  onRemix: (payload: Record<string, unknown>) => void;
}

export function SceneIdeaCloud({
  projectId,
  querySeed = "anime",
  graphContext = [],
  onUseIdea,
  onRemix
}: SceneIdeaCloudProps) {
  const [query, setQuery] = useState(querySeed);
  const [ideas, setIdeas] = useState<SceneIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphContextKey = useMemo(() => graphContext.join("|"), [graphContext]);

  const fetchIdeas = async (nextQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await controlApi.getSceneIdeas(nextQuery, 18);
      const ranked = await controlApi.rankInspiration(projectId, nextQuery, graphContext, 18);
      const ideas = (ranked.ideas ?? response.ideas ?? []) as SceneIdea[];
      setIdeas(ideas);
    } catch {
      setError("Scene feed unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(querySeed);
    fetchIdeas(querySeed);
  }, [graphContextKey, projectId, querySeed]);

  const remix = async (idea: SceneIdea) => {
    const result = await controlApi.remixInspiration(projectId, idea.id);
    onRemix((result.nodePrefill ?? {}) as Record<string, unknown>);
  };

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const idea of ideas) {
      for (const tag of idea.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [ideas]);

  return (
    <section className="panel-block idea-cloud">
      <div className="panel-head">
        <h2>{getAnimeSectionLabel("shoot")} {getAnimeSectionLabel("ideas")}</h2>
        <button type="button" className="ghost-button" onClick={() => fetchIdeas(query)}>
          Refresh Feed
        </button>
      </div>
      <p className="muted">
        Pre-generated anime beats drifting in real time so directors never start from zero.
      </p>

      <div className="idea-controls">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by mood, setting, or theme"
          aria-label="Scene idea search"
        />
        <button type="button" onClick={() => fetchIdeas(query)}>
          Search
        </button>
      </div>

      <div className="tag-row">
        {topTags.length ? (
          topTags.map((tag) => (
            <button key={tag} type="button" className="tag-pill" onClick={() => fetchIdeas(tag)}>
              #{tag}
            </button>
          ))
        ) : (
          <span className="muted">No tags yet</span>
        )}
      </div>

      <div className="idea-cloud-canvas">
        {ideas.map((idea, index) => (
          <article
            key={idea.id}
            className="idea-card"
            style={
              {
                "--delay": `${(index % 7) * 0.9}s`,
                "--float-duration": `${14 + (index % 5) * 2}s`,
                "--spin-duration": `${18 + (index % 6) * 2}s`
              } as CSSProperties
            }
          >
            <p className="idea-theme">{idea.theme}</p>
            <h3>{idea.title}</h3>
            <p className="muted">{idea.promptSeed}</p>
            {"rankScore" in idea ? <p className="muted">Rank: {(idea as { rankScore: number }).rankScore}</p> : null}
            <div className="idea-card-foot">
              <span className="pill">{idea.mood}</span>
              <div className="row-buttons">
                <button type="button" className="ghost-button" onClick={() => onUseIdea(idea)}>
                  Use
                </button>
                <button type="button" className="ghost-button" onClick={() => remix(idea)}>
                  Remix
                </button>
              </div>
            </div>
          </article>
        ))}
        {!ideas.length && !loading && !error ? <p className="muted">No ideas yet</p> : null}
        {loading ? <p className="muted">Loading scene sky...</p> : null}
        {error ? <p className="muted">{error}</p> : null}
      </div>
    </section>
  );
}
