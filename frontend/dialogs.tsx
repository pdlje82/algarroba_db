import React, { useEffect, useRef, useState } from "react";
import { api, type Ref, type Catalog } from "./types";
export function Refs({
  refs,
  open,
}: {
  refs: Ref[];
  open: (ref: Ref) => void;
}) {
  return (
    <div className="refs">
      {refs.map((ref, i) => (
        <button
          key={i}
          onClick={() => open(ref)}
          title={ref.locator || "Open source"}
        >
          {ref.source_id}{" "}
          <span>{ref.page != null ? "p" + ref.page : "Source"} ↗</span>
        </button>
      ))}
    </div>
  );
}

export function ResearchPanel({
  context,
  catalog,
  close,
  complete,
}: {
  context: any;
  catalog: Catalog | null;
  close: () => void;
  complete: (task: any) => void;
}) {
  const defaults =
    context.filters?.domain === "funding"
      ? ["Funding", "Requirements", "Sources"]
      : context.filters?.domain === "ecosystem"
        ? ["Ecosystem conditions", "Sources"]
        : context.filters?.domain === "technology"
          ? ["Irrigation", "Drone technology", "Sources"]
          : ["Sources"];
  const [areas, setAreas] = useState<string[]>(defaults),
    [custom, setCustom] = useState(""),
    [instruction, setInstruction] = useState("Find more information"),
    [scope, setScope] = useState("Library only"),
    [extension, setExtension] = useState(""),
    [files, setFiles] = useState<string[]>([]),
    [prompt, setPrompt] = useState(""),
    [previewId, setPreviewId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [gapMode, setGapMode] = useState("area"),
    [gapFrom, setGapFrom] = useState(
      context.centre || context.selected_topic_ids[0] || "",
    ),
    [gapTo, setGapTo] = useState(
      context.selected_topic_ids.find((id: string) => id !== context.centre) ||
        "",
    ),
    [gapTerm, setGapTerm] = useState(context.search || "");
  const gap =
    gapMode === "topics"
      ? { kind: "existing-topics", from_id: gapFrom, to_id: gapTo }
      : gapMode === "term"
        ? { kind: "unmatched-term", from_id: gapFrom, term: gapTerm.trim() }
        : null;
  const gapError =
    gap &&
    (!gapFrom ||
      (gapMode === "topics" ? !gapTo || gapTo === gapFrom : !gapTerm.trim()))
      ? "Choose two different topics, or a starting topic and a new term."
      : "";
  const gapLabel = gap
    ? "Investigate connection: " +
      (catalog?.topics.find((t) => t.id === gapFrom)?.label || gapFrom) +
      " → " +
      (gapMode === "topics"
        ? catalog?.topics.find((t) => t.id === gapTo)?.label || gapTo
        : gapTerm.trim())
    : "";
  const draft = () => ({
    context: {
      ...context,
      ...(gap
        ? {
            gap,
            selected_topic_ids: [
              ...new Set([gapFrom, ...(gapMode === "topics" ? [gapTo] : [])]),
            ],
          }
        : {}),
    },
    areas,
    custom_topics: [custom, gapLabel].filter(Boolean).join("\n"),
    instruction,
    source_scope: scope,
    library_files: files,
    proposed_extension: extension,
    task_id: previewId || undefined,
  });
  const preview = async () => {
    if (gapError) {
      setError(gapError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/research/preview", {
        method: "POST",
        body: JSON.stringify(draft()),
      });
      setPrompt(result.prompt);
      setPreviewId(result.task_id);
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  };
  const save = async (copy = false) => {
    if (gapError) {
      setError(gapError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const task = await api("/api/research", {
        method: "POST",
        body: JSON.stringify({ ...draft(), prompt: prompt || undefined }),
      });
      if (copy) {
        try {
          await navigator.clipboard.writeText(task.prompt);
        } catch {
          setError(
            "Task saved. Select the preview text and press Ctrl+C to copy it.",
          );
          setPrompt(task.prompt);
          setBusy(false);
          return;
        }
      }
      complete(task);
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  };
  const changed = () => {
    setPrompt("");
    setPreviewId("");
  };
  return (
    <div className="modal-shade">
      <section
        className="modal research-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Research this area"
      >
        <button
          className="close"
          aria-label="Close research panel"
          onClick={close}
        >
          ×
        </button>
        <div className="eyebrow">CONTINUE THE DISCOVERY IN CODEX</div>
        <h2>Research this area</h2>
        <p>Keep the question attached to the knowledge you were exploring.</p>
        <div className="research-context">
          <div>
            <span>CENTRE</span>
            <strong>{context.centre_label}</strong>
          </div>
          <div>
            <span>SEARCH</span>
            <strong>{context.search || "No search term"}</strong>
          </div>
          <div>
            <span>DOMAIN</span>
            <strong>{context.filters?.domain || "all"}</strong>
          </div>
          <div>
            <span>GROUPING</span>
            <strong>{context.grouping}</strong>
          </div>
        </div>
        <p className="small-note">
          {context.selected_topic_ids.length} selected topic(s) ·{" "}
          {context.routes.length} captured route(s) · revision{" "}
          {context.knowledge_revision}
        </p>
        <label className="field">
          Research focus
          <select
            aria-label="Research focus"
            value={gapMode}
            onChange={(e) => {
              setGapMode(e.target.value);
              changed();
            }}
          >
            <option value="area">This area or selected route</option>
            <option value="topics">
              A connection between two existing topics
            </option>
            <option value="term">A connection to a new term</option>
          </select>
        </label>
        {gap && (
          <div className="research-gap">
            <label className="field">
              Starting topic
              <select
                aria-label="Research starting topic"
                value={gapFrom}
                onChange={(e) => {
                  setGapFrom(e.target.value);
                  changed();
                }}
              >
                <option value="">Choose a topic</option>
                {catalog?.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {gapMode === "topics" ? (
              <label className="field">
                Other topic
                <select
                  aria-label="Research other topic"
                  value={gapTo}
                  onChange={(e) => {
                    setGapTo(e.target.value);
                    changed();
                  }}
                >
                  <option value="">Choose a topic</option>
                  {catalog?.topics
                    .filter((t) => t.id !== gapFrom)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <label className="field">
                New term
                <input
                  aria-label="Research new term"
                  value={gapTerm}
                  onChange={(e) => {
                    setGapTerm(e.target.value);
                    changed();
                  }}
                />
              </label>
            )}
            <p className="small-note">
              This saves a question to investigate. It does not add an
              established connection.
            </p>
          </div>
        )}
        <h3>Areas to explore</h3>
        <div className="area-grid">
          {[
            "Ecosystem conditions",
            "Irrigation",
            "Drone technology",
            "Funding",
            "Requirements",
            "Sources",
          ].map((a) => (
            <label key={a}>
              <input
                type="checkbox"
                checked={areas.includes(a)}
                onChange={(e) => {
                  setAreas(
                    e.target.checked
                      ? [...areas, a]
                      : areas.filter((x) => x !== a),
                  );
                  changed();
                }}
              />
              {a}
            </label>
          ))}
        </div>
        <label className="field">
          Add another topic
          <input
            placeholder="For example, soil microorganisms"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              changed();
            }}
          />
        </label>
        <label className="field">
          What should Codex find out?
          <input
            list="instructions"
            value={instruction}
            onChange={(e) => {
              setInstruction(e.target.value);
              changed();
            }}
          />
          <datalist id="instructions">
            <option>Find more information</option>
            <option>Explain this connection</option>
            <option>Check this finding</option>
            <option>Connect a named document</option>
          </datalist>
        </label>
        <label className="field">
          Sources
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              changed();
            }}
          >
            <option>Library only</option>
            <option>Library and web</option>
          </select>
        </label>
        <details>
          <summary>Choose library documents (optional)</summary>
          {catalog?.sources.map((s) => (
            <label className="file-option" key={s.id}>
              <input
                type="checkbox"
                checked={files.includes(s.filename)}
                onChange={(e) => {
                  setFiles(
                    e.target.checked
                      ? [...files, s.filename]
                      : files.filter((x) => x !== s.filename),
                  );
                  changed();
                }}
              />
              {s.id} · {s.filename}
            </label>
          ))}
        </details>
        <details>
          <summary>Propose a substantial new knowledge area</summary>
          <p className="small-note">
            Ordinary topics within restoration, water, drones and funding need
            no separate approval. A substantial extension is saved for a user
            decision.
          </p>
          <input
            aria-label="Proposed domain extension"
            placeholder="New area and why it belongs"
            value={extension}
            onChange={(e) => {
              setExtension(e.target.value);
              changed();
            }}
          />
        </details>
        {error && <div className="notice error">{error}</div>}
        {prompt && (
          <label className="field prompt-field">
            Editable Codex prompt
            <textarea
              aria-label="Editable Codex prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
        )}
        <div className="modal-actions">
          <button onClick={preview} disabled={busy}>
            Preview prompt
          </button>
          <button onClick={() => save(false)} disabled={busy}>
            Save task
          </button>
          <button className="solid" onClick={() => save(true)} disabled={busy}>
            Copy prompt & save
          </button>
        </div>
        <p className="small-note">
          A fixed template prepares the prompt. You choose when to paste it into
          Codex Desktop. Useful discoveries outside this question still enrich
          the shared graph.
        </p>
      </section>
    </div>
  );
}
