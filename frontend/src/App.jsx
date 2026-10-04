import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const STORAGE_KEY = "retrace-ai-data";

function loadSavedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function normalizePriority(value = "") {
  const priority = value.trim().toUpperCase();

  if (priority.includes("HIGH")) return "HIGH";
  if (priority.includes("LOW")) return "LOW";

  return "MEDIUM";
}

function parseTasks(result) {
  if (!result) return [];

  const blocks = result
    .split(/(?=^\s*(?:\d+[\.\)]|-)\s*Task\s*:)/gim)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const getField = (name) => {
      const match = block.match(
        new RegExp("^\\s*" + name + "\\s*:\\s*(.*)$", "im")
      );

      return match ? match[1].trim() : "";
    };

    return {
      id: `${Date.now()}-${index}`,
      title: getField("Task") || block.split("\n")[0],
      deadline: getField("Deadline") || "Not specified",
      priority: normalizePriority(getField("Priority")),
      reason: getField("Reason") || "Extracted by AI",
    };
  });
}

function normalizeTitle(title = "") {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compareTasks(previous, current) {
  const oldTasks = previous?.tasks || [];

  const oldByTitle = new Map(
    oldTasks.map((task) => [normalizeTitle(task.title), task])
  );

  const newByTitle = new Map(
    current.map((task) => [normalizeTitle(task.title), task])
  );

  const added = current.filter(
    (task) => !oldByTitle.has(normalizeTitle(task.title))
  );

  const removed = oldTasks.filter(
    (task) => !newByTitle.has(normalizeTitle(task.title))
  );

  const modified = [];

  current.forEach((task) => {
    const oldTask = oldByTitle.get(normalizeTitle(task.title));

    if (!oldTask) return;

    const changes = [];

    if (oldTask.deadline !== task.deadline) {
      changes.push({
        field: "Deadline",
        before: oldTask.deadline,
        after: task.deadline,
      });
    }

    if (oldTask.priority !== task.priority) {
      changes.push({
        field: "Priority",
        before: oldTask.priority,
        after: task.priority,
      });
    }

    if (changes.length) {
      modified.push({
        task,
        changes,
      });
    }
  });

  return {
    added,
    removed,
    modified,
  };
}

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString();
}

function App() {
  const savedData = loadSavedData();

  const [page, setPage] = useState("Analyze");
  const [input, setInput] = useState("");

  const [tasks, setTasks] = useState(
    savedData.tasks || []
  );

  const [completed, setCompleted] = useState(
    savedData.completed || []
  );

  const [previousAnalysis, setPreviousAnalysis] = useState(
    savedData.previousAnalysis || null
  );

  const [currentAnalysis, setCurrentAnalysis] = useState(
    savedData.currentAnalysis || null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawResult, setRawResult] = useState("");

  /*
   * Keep the latest application state saved in localStorage.
   */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tasks,
          completed,
          previousAnalysis,
          currentAnalysis,
        })
      );
    } catch (err) {
      console.error("Unable to save RETRACE data:", err);
    }
  }, [
    tasks,
    completed,
    previousAnalysis,
    currentAnalysis,
  ]);

  async function analyze(event) {
    event.preventDefault();

    if (!input.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    setRawResult("");

    try {
      const formData = new FormData();
      formData.append("text", input);

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || `Server error: ${response.status}`
        );
      }

      const data = await response.json();
      const result = data.result || "";

      const newTasks = parseTasks(result);

      if (newTasks.length === 0) {
        setRawResult(result);

        setError(
          "The AI returned a response, but no tasks could be extracted. Check the response format."
        );

        return;
      }

      /*
       * Create the new analysis object.
       */
      const newAnalysis = {
        tasks: newTasks,
        analyzedAt: new Date().toISOString(),
      };

      /*
       * IMPORTANT FIX:
       *
       * Before changing React state, save the old currentAnalysis
       * as previousAnalysis directly into localStorage.
       *
       * This makes the What Changed page survive a browser refresh.
       */
      const updatedData = {
        tasks: newTasks,
        completed: [],
        previousAnalysis: currentAnalysis || null,
        currentAnalysis: newAnalysis,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedData)
      );

      /*
       * Now update React state.
       */
      setTasks(newTasks);
      setCompleted([]);

      setPreviousAnalysis(
        currentAnalysis || null
      );

      setCurrentAnalysis(newAnalysis);

      setRawResult(result);

    } catch (err) {
      console.error("Analyze error:", err);

      setError(
        err.message ||
          "Unable to connect. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleTask(id) {
    setCompleted((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  function clearHistory() {
    if (
      !window.confirm(
        "Clear the saved previous and current analyses? This cannot be undone."
      )
    ) {
      return;
    }

    setTasks([]);
    setCompleted([]);
    setPreviousAnalysis(null);
    setCurrentAnalysis(null);
    setRawResult("");
    setError("");

    /*
     * Also immediately update localStorage.
     */
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks: [],
        completed: [],
        previousAnalysis: null,
        currentAnalysis: null,
      })
    );
  }

  const completedCount = completed.length;

  const remainingCount = Math.max(
    0,
    tasks.length - completedCount
  );

  const highCount = tasks.filter(
    (task) => task.priority === "HIGH"
  ).length;

  const changes = compareTasks(
    previousAnalysis,
    tasks
  );

  return (
    <div className="app-shell">
      <div className="ambient" />

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            ✦
          </span>

          <div>
            <h2>RETRACE AI</h2>
            <p>INTELLIGENT TASKS WORKSPACE</p>
          </div>
        </div>

        <nav className="nav-menu">
          {[
            {
              name: "Analyze",
              icon: "⌕",
            },
            {
              name: "My Action Plan",
              icon: "▤",
            },
            {
              name: "What Changed",
              icon: "◷",
            },
          ].map((item) => (
            <button
              key={item.name}
              className={`nav-button ${
                page === item.name
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPage(item.name)
              }
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="model-card">
          <span className="model-icon">
            ✦
          </span>

          <div>
            <strong>
              Nemotron 3 Nano
            </strong>

            <p>NEBIUS AI MODEL</p>
          </div>

          <span className="status-dot" />
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>RETRACE AI v1.0</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="topbar-label">
              Workspace
            </span>

            <h3>{page}</h3>
          </div>

          <span className="topbar-status">
            <span className="status-dot" />
            AI Workspace
          </span>
        </header>

        <section className="page">

          {/* =====================================================
              ANALYZE PAGE
          ====================================================== */}

          {page === "Analyze" && (
            <>
              <div className="hero">
                <div className="eyebrow">
                  <span>✦</span>
                  INTELLIGENT TASK EXTRACTION
                </div>

                <h1>
                  Turn information into
                  <br />
                  <span>clear action.</span>
                </h1>

                <p>
                  Transform messy notes,
                  conversations and instructions
                  into organized, actionable tasks
                  with AI.
                </p>

                <div className="hero-features">
                  <span>
                    ✦ AI powered
                  </span>

                  <span>
                    ◷ Deadline extraction
                  </span>

                  <span>
                    ◎ Priority detection
                  </span>
                </div>
              </div>

              <div className="analysis-grid">

                {/* INPUT */}

                <div className="glass-panel input-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">
                        01 / INPUT
                      </span>

                      <h3>
                        Source information
                      </h3>
                    </div>

                    <span className="panel-icon">
                      ↗
                    </span>
                  </div>

                  <p className="panel-description">
                    Paste your notes,
                    instructions or meeting
                    conversations below.
                  </p>

                  <form onSubmit={analyze}>
                    <textarea
                      className="source-input"
                      value={input}
                      onChange={(event) =>
                        setInput(
                          event.target.value
                        )
                      }
                      placeholder={
                        "Example:\nComplete the frontend by October 3.\nFinish documentation by October 5.\nTest the login system and fix bugs."
                      }
                      rows={10}
                    />

                    <div className="input-footer">
                      <span>
                        {input.length} characters
                      </span>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setInput("");
                          setError("");
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    {error && (
                      <div className="error-message">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={loading}
                    >
                      {loading
                        ? "Analyzing..."
                        : "✦ Analyze with AI →"}
                    </button>
                  </form>
                </div>

                {/* OUTPUT */}

                <div className="glass-panel output-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">
                        02 / OUTPUT
                      </span>

                      <h3>
                        Extracted tasks
                      </h3>
                    </div>

                    <span className="task-count">
                      {tasks.length} tasks
                    </span>
                  </div>

                  {!loading &&
                    tasks.length === 0 && (
                      <div className="output-empty">
                        <div className="empty-icon">
                          ✧
                        </div>

                        <h3>
                          Your tasks will
                          appear here
                        </h3>

                        <p>
                          Submit your
                          information to
                          extract actionable
                          tasks with AI.
                        </p>
                      </div>
                    )}

                  {loading && (
                    <div className="loading-state">
                      <div className="loading-spinner" />

                      <h3>
                        Analyzing information
                      </h3>

                      <p>
                        Nemotron is
                        extracting your
                        tasks...
                      </p>
                    </div>
                  )}

                  {!loading &&
                    tasks.length > 0 && (
                      <div className="output-results">

                        <div className="stats-grid">
                          <div>
                            <span>
                              Total tasks
                            </span>

                            <strong>
                              {tasks.length}
                            </strong>
                          </div>

                          <div>
                            <span>
                              High priority
                            </span>

                            <strong>
                              {highCount}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Completed
                            </span>

                            <strong>
                              {completedCount}
                            </strong>
                          </div>
                        </div>

                        {tasks.map((task) => (
                          <div
                            className="mini-task"
                            key={task.id}
                          >
                            <div>
                              <strong>
                                {task.title}
                              </strong>

                              <p>
                                ◷ {task.deadline}
                              </p>
                            </div>

                            <span
                              className={`priority-badge ${task.priority.toLowerCase()}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                        ))}

                        <button
                          className="secondary-button"
                          onClick={() =>
                            setPage(
                              "My Action Plan"
                            )
                          }
                        >
                          View action plan →
                        </button>

                      </div>
                    )}
                </div>
              </div>
            </>
          )}

          {/* =====================================================
              MY ACTION PLAN
          ====================================================== */}

          {page === "My Action Plan" && (
            <div className="glass-panel action-panel">

              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    YOUR WORKSPACE
                  </span>

                  <h2>
                    My Action Plan
                  </h2>
                </div>

                <span className="task-count">
                  {remainingCount} remaining
                </span>
              </div>

              <div className="stats-grid">
                <div>
                  <span>
                    Total tasks
                  </span>

                  <strong>
                    {tasks.length}
                  </strong>
                </div>

                <div>
                  <span>
                    Completed
                  </span>

                  <strong>
                    {completedCount}
                  </strong>
                </div>

                <div>
                  <span>
                    Remaining
                  </span>

                  <strong>
                    {remainingCount}
                  </strong>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="output-empty">
                  <div className="empty-icon">
                    ▤
                  </div>

                  <h3>
                    No tasks yet
                  </h3>

                  <p>
                    Analyze some information
                    to create your action plan.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setPage("Analyze")
                    }
                  >
                    Go to Analyze →
                  </button>
                </div>
              ) : (
                <div className="output-results">

                  {tasks.map((task) => (
                    <div
                      className="task-card"
                      key={task.id}
                    >
                      <label className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={completed.includes(
                            task.id
                          )}
                          onChange={() =>
                            toggleTask(
                              task.id
                            )
                          }
                        />

                        <span className="task-checkmark" />
                      </label>

                      <div className="task-details">
                        <h3
                          className={
                            completed.includes(
                              task.id
                            )
                              ? "task-completed"
                              : ""
                          }
                        >
                          {task.title}
                        </h3>

                        <p>
                          ◷ {task.deadline}
                        </p>

                        <p>
                          {task.reason}
                        </p>
                      </div>

                      <span
                        className={`priority-badge ${task.priority.toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}

                </div>
              )}
            </div>
          )}

          {/* =====================================================
              WHAT CHANGED
          ====================================================== */}

          {page === "What Changed" && (
            <div className="glass-panel change-panel">

              <span className="panel-kicker">
                ANALYSIS COMPARISON
              </span>

              <h2>
                What Changed
              </h2>

              <p className="panel-description">
                Compare your latest analysis
                with the previous one.
              </p>

              {!previousAnalysis ? (
                <div className="output-empty">
                  <div className="empty-icon">
                    ◷
                  </div>

                  <h3>
                    No previous analysis
                  </h3>

                  <p>
                    Run Analyze once more
                    after your first analysis
                    to compare the two results.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setPage("Analyze")
                    }
                  >
                    Go to Analyze →
                  </button>
                </div>
              ) : (
                <>
                  <div className="comparison-dates">

                    <div>
                      <span>
                        Previous analysis
                      </span>

                      <strong>
                        {formatDate(
                          previousAnalysis.analyzedAt
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Current analysis
                      </span>

                      <strong>
                        {formatDate(
                          currentAnalysis?.analyzedAt
                        )}
                      </strong>
                    </div>

                  </div>

                  <div className="stats-grid">

                    <div>
                      <span>
                        New tasks
                      </span>

                      <strong>
                        {changes.added.length}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Modified
                      </span>

                      <strong>
                        {changes.modified.length}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Removed
                      </span>

                      <strong>
                        {changes.removed.length}
                      </strong>
                    </div>

                  </div>

                  {changes.added.length === 0 &&
                    changes.removed.length === 0 &&
                    changes.modified.length === 0 && (
                      <div className="output-empty">

                        <div className="empty-icon">
                          ✓
                        </div>

                        <h3>
                          No task changes found
                        </h3>

                        <p>
                          The task names,
                          deadlines and
                          priorities match
                          the previous analysis.
                        </p>

                      </div>
                    )}

                  {/* NEW TASKS */}

                  {changes.added.length > 0 && (
                    <div className="change-section">

                      <h3>
                        <span className="change-indicator added" />

                        Newly added tasks
                      </h3>

                      {changes.added.map(
                        (task) => (
                          <div
                            className="mini-task"
                            key={task.id}
                          >
                            <div>
                              <strong>
                                {task.title}
                              </strong>

                              <p>
                                Deadline:{" "}
                                {task.deadline}
                              </p>
                            </div>

                            <span className="priority-badge low">
                              NEW
                            </span>
                          </div>
                        )
                      )}

                    </div>
                  )}

                  {/* MODIFIED TASKS */}

                  {changes.modified.length > 0 && (
                    <div className="change-section">

                      <h3>
                        <span className="change-indicator modified" />

                        Modified tasks
                      </h3>

                      {changes.modified.map(
                        ({
                          task,
                          changes: fields,
                        }) => (
                          <div
                            className="mini-task"
                            key={task.id}
                          >
                            <div>
                              <strong>
                                {task.title}
                              </strong>

                              {fields.map(
                                (field) => (
                                  <p
                                    key={
                                      field.field
                                    }
                                  >
                                    {field.field}:{" "}
                                    {field.before}{" "}
                                    →{" "}
                                    {field.after}
                                  </p>
                                )
                              )}
                            </div>

                            <span className="priority-badge medium">
                              UPDATED
                            </span>
                          </div>
                        )
                      )}

                    </div>
                  )}

                  {/* REMOVED TASKS */}

                  {changes.removed.length > 0 && (
                    <div className="change-section">

                      <h3>
                        <span className="change-indicator removed" />

                        Removed tasks
                      </h3>

                      {changes.removed.map(
                        (task) => (
                          <div
                            className="mini-task"
                            key={task.id}
                          >
                            <div>
                              <strong>
                                {task.title}
                              </strong>

                              <p>
                                Previously:{" "}
                                {task.deadline}
                              </p>
                            </div>

                            <span className="priority-badge high">
                              REMOVED
                            </span>
                          </div>
                        )
                      )}

                    </div>
                  )}
                </>
              )}

              <button
                className="secondary-button clear-history"
                onClick={clearHistory}
              >
                Clear saved analyses
              </button>

            </div>
          )}

        </section>
      </main>
    </div>
  );
}

export default App;