import { useEffect, useMemo, useState } from "react";
import { getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";

type BoardTask = {
  taskId: string;
  shotId: string;
  title: string;
  status: string;
  dependsOn: string[];
  estimateHours: number;
};

interface EpisodeBoardPanelProps {
  projectId: string;
  onStatus: (value: string) => void;
}

export function EpisodeBoardPanel({ projectId, onStatus }: EpisodeBoardPanelProps) {
  const [episodeId, setEpisodeId] = useState("ep-001");
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [blockedTasks, setBlockedTasks] = useState<string[]>([]);
  const [risk, setRisk] = useState("low");

  const loadBoard = async () => {
    const board = await controlApi.getEpisodeBoard(projectId);
    setEpisodeId(board.episodeId ?? "ep-001");
    setTasks((board.tasks ?? []) as BoardTask[]);
  };

  useEffect(() => {
    loadBoard();
  }, [projectId]);

  const saveBoard = async () => {
    await controlApi.updateEpisodeBoard(projectId, { episodeId, tasks });
    onStatus(`Episode board saved (${tasks.length} tasks)`);
  };

  const analyze = async () => {
    const result = await controlApi.analyzeEpisodeBoard(projectId);
    setCriticalPath(result.criticalPath ?? []);
    setBlockedTasks(result.blockedTasks ?? []);
    setRisk(result.releaseRisk ?? "low");
    onStatus(`Critical path updated: ${result.releaseRisk} release risk`);
  };

  const addTask = () => {
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    setTasks((current) => [
      ...current,
      { taskId, shotId: "shot-new", title: "New Task", status: "todo", dependsOn: [], estimateHours: 2 }
    ]);
  };

  const updateTask = (taskId: string, patch: Partial<BoardTask>) => {
    setTasks((current) => current.map((task) => (task.taskId === taskId ? { ...task, ...patch } : task)));
  };

  const taskIds = useMemo(() => tasks.map((task) => task.taskId), [tasks]);

  return (
    <section className="panel-block episode-board-panel">
      <div className="panel-head">
        <h2>{getAnimeSectionLabel("deliver")} Episode Board</h2>
        <button type="button" className="ghost-button" onClick={addTask}>Add Task</button>
      </div>
      <p className="muted">Plan dependencies, identify blocked shots, and monitor the critical path to release.</p>

      <div className="row-buttons">
        <button type="button" className="ghost-button" onClick={saveBoard}>Save Board</button>
        <button type="button" className="ghost-button" onClick={analyze}>Analyze Critical Path</button>
      </div>

      <div className="video-stats">
        <span className="pill">Episode: {episodeId}</span>
        <span className="pill">Tasks: {tasks.length}</span>
        <span className="pill">Risk: {risk}</span>
      </div>

      <div className="clip-list">
        {tasks.map((task) => {
          const isCritical = criticalPath.includes(task.taskId);
          const isBlocked = blockedTasks.includes(task.taskId);
          return (
            <article
              key={task.taskId}
              className={`clip-item ${isCritical ? "board-critical" : ""} ${isBlocked ? "board-blocked" : ""}`}
            >
              <div className="clip-item-head">
                <strong>{task.title}</strong>
                <div className="row-buttons">
                  {isCritical ? <span className="pill">Critical</span> : null}
                  {isBlocked ? <span className="pill">Blocked</span> : null}
                </div>
              </div>

              <div className="grid-two">
                <label>
                  Shot
                  <input value={task.shotId} onChange={(event) => updateTask(task.taskId, { shotId: event.target.value })} />
                </label>
                <label>
                  Status
                  <select value={task.status} onChange={(event) => updateTask(task.taskId, { status: event.target.value })}>
                    <option value="todo">todo</option>
                    <option value="in_progress">in_progress</option>
                    <option value="done">done</option>
                    <option value="blocked">blocked</option>
                  </select>
                </label>
              </div>

              <label>
                Title
                <input value={task.title} onChange={(event) => updateTask(task.taskId, { title: event.target.value })} />
              </label>

              <label>
                Depends On (comma-separated task IDs)
                <input
                  value={task.dependsOn.join(",")}
                  onChange={(event) =>
                    updateTask(task.taskId, {
                      dependsOn: event.target.value.split(",").map((item) => item.trim()).filter((item) => item && taskIds.includes(item))
                    })
                  }
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}
