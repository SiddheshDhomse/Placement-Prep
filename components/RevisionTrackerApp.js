"use client";

import { useEffect, useMemo, useState } from "react";
import TrackerNav from "./TrackerNav";

const INTERVALS = [1, 3, 7, 15, 30, 60];
const INTERVAL_LABELS = ["Day 1", "Day 3", "Day 7", "Day 15", "Day 30", "Day 60"];

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateFromStr(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function fmtDate(value) {
  return dateFromStr(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(fromDate, toDate) {
  return Math.round((dateFromStr(toDate) - dateFromStr(fromDate)) / 86400000);
}

function addDays(value, days) {
  const date = dateFromStr(value);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeProblemId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeProblem(raw) {
  return {
    id: raw.id || makeProblemId(),
    name: raw.name || "",
    topic: raw.topic || "",
    difficulty: ["Easy", "Medium", "Hard"].includes(raw.difficulty) ? raw.difficulty : "Medium",
    timeTaken: raw.timeTaken || "",
    dateSolved: raw.dateSolved || todayStr(),
    approach: raw.approach || "",
    insight: raw.insight || "",
    revisionsDone: raw.revisionsDone || {},
    markedTodayDone: Boolean(raw.markedTodayDone),
    _markedDate: raw._markedDate || ""
  };
}

export default function RevisionTrackerApp() {
  const [problems, setProblems] = useState([]);
  const [filterDiff, setFilterDiff] = useState("All");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [status, setStatus] = useState("Loading...");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({
    name: "",
    topic: "",
    difficulty: "Medium",
    timeTaken: "",
    dateSolved: todayStr(),
    approach: "",
    insight: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  async function readJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error("The server returned an invalid response.");
    }
  }

  async function persist(nextProblems, successMessage = "Saved") {
    setProblems(nextProblems);
    setStatus("Saving...");
    try {
      const response = await fetch("/api/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problems: nextProblems })
      });
      const payload = await readJson(response);
      if (!response.ok) {
        setStatus(payload.error || "Save failed");
        return;
      }
      setLoadError("");
      setStatus(successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/revision");
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load revision tracker data.");
        }
        setProblems((payload.problems || []).map(normalizeProblem));
        setLoadError("");
        setStatus("Loaded");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load revision tracker data.";
        setProblems([]);
        setLoadError(message);
        setStatus(message);
      }
    }
    load();
  }, []);

  function getNextInterval(problem) {
    for (const interval of INTERVALS) {
      if (!problem.revisionsDone?.[interval]) {
        return { interval, date: addDays(problem.dateSolved, interval) };
      }
    }
    return null;
  }

  function getPrevInterval(problem) {
    for (let index = INTERVALS.length - 1; index >= 0; index -= 1) {
      const interval = INTERVALS[index];
      if (problem.revisionsDone?.[interval]) return interval;
    }
    return null;
  }

  const dueProblems = useMemo(() => {
    const today = todayStr();
    return problems
      .filter(problem => {
        const next = getNextInterval(problem);
        return next && daysBetween(today, next.date) <= 0;
      })
      .sort((a, b) => {
        const aNext = getNextInterval(a);
        const bNext = getNextInterval(b);
        return daysBetween(today, aNext.date) - daysBetween(today, bNext.date);
      });
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter(problem => {
      const matchesDiff = filterDiff === "All" || problem.difficulty === filterDiff;
      const text = `${problem.name} ${problem.topic}`.toLowerCase();
      return matchesDiff && text.includes(query.toLowerCase());
    });
  }, [filterDiff, problems, query]);

  function addProblem() {
    if (!form.name.trim()) {
      window.alert("Please enter a problem name.");
      return;
    }
    const nextProblems = [normalizeProblem({ ...form, id: makeProblemId() }), ...problems];
    persist(nextProblems, "Problem added");
    setForm({ name: "", topic: "", difficulty: "Medium", timeTaken: "", dateSolved: todayStr(), approach: "", insight: "" });
    setActiveTab("all");
  }

  function deleteProblem(id) {
    const problem = problems.find(item => item.id === id);
    if (!problem) return;
    if (!window.confirm(`Delete "${problem.name}"? This cannot be undone.`)) return;
    persist(problems.filter(item => item.id !== id), "Problem deleted");
  }

  function openEdit(id) {
    const problem = problems.find(item => item.id === id);
    if (!problem) return;
    setEditingId(id);
    setEditForm({ ...problem });
  }

  function saveEdit() {
    if (!editForm.name?.trim()) {
      window.alert("Problem name cannot be empty.");
      return;
    }
    const nextProblems = problems.map(problem => problem.id === editingId ? normalizeProblem(editForm) : problem);
    persist(nextProblems, "Problem updated");
    setEditingId(null);
  }

  function markRevisionDone(id) {
    const nextProblems = problems.map(problem => {
      if (problem.id !== id) return problem;
      const next = getNextInterval(problem);
      if (!next) return problem;
      return {
        ...problem,
        revisionsDone: { ...problem.revisionsDone, [next.interval]: todayStr() },
        markedTodayDone: true,
        _markedDate: todayStr()
      };
    });
    persist(nextProblems, "Revision marked");
  }

  function unmarkRevision(id) {
    const nextProblems = problems.map(problem => {
      if (problem.id !== id) return problem;
      const previous = getPrevInterval(problem);
      if (!previous) return problem;
      const revisionsDone = { ...problem.revisionsDone };
      delete revisionsDone[previous];
      return { ...problem, revisionsDone, markedTodayDone: false, _markedDate: "" };
    });
    persist(nextProblems, "Revision undone");
  }

  const topicMap = useMemo(() => {
    const map = {};
    problems.forEach(problem => {
      const topic = problem.topic || "Other";
      if (!map[topic]) map[topic] = { total: 0, done: 0 };
      map[topic].total += 1;
      if (!getNextInterval(problem)) map[topic].done += 1;
    });
    return map;
  }, [problems]);

  return (
    <div className="page">
      <div className="container">
        <TrackerNav current="revision" />

        <div className="top">
          <div>
            <h1>DSA Revision Tracker</h1>
            <div className="sub">Spaced repetition - revise every 1, 3, 7, 15, 30, 60 days</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("add")}>+ Add problem</button>
        </div>

        <div className="save-state">{status}</div>
        {loadError ? <div className="error-banner">{loadError}</div> : null}

        <div className="tabs">
          {["today", "add", "all", "stats"].map(tab => (
            <div key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
              {tab === "today" ? "Today's revision" : tab === "add" ? "Add problem" : tab === "all" ? "All problems" : "Stats"}
            </div>
          ))}
        </div>

        {activeTab === "today" ? (
          <div>
            <div className="today-header">
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Today's revision</div>
                <div className="today-date">{fmtDate(todayStr())}</div>
              </div>
              <div className="rev-count">{dueProblems.length === 0 ? "Nothing due today" : `${dueProblems.length} problem${dueProblems.length > 1 ? "s" : ""} to revise`}</div>
            </div>
            <div className="interval-info">
              {dueProblems.length === 0 ? (
                <div className="icard"><div className="icard-n" style={{ color: "#10b981" }}>0</div><div className="icard-l">Due today</div></div>
              ) : INTERVALS.map(interval => {
                const count = dueProblems.filter(problem => getNextInterval(problem)?.interval === interval).length;
                if (!count) return null;
                return <div key={interval} className="icard"><div className="icard-n" style={{ color: "#f59e0b" }}>{count}</div><div className="icard-l">{INTERVAL_LABELS[INTERVALS.indexOf(interval)]} revision</div></div>;
              })}
            </div>
            <div>
              {dueProblems.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">&#10003;</div><div style={{ fontWeight: 600, marginBottom: 6 }}>You're all caught up!</div><div>No revisions due today.</div></div>
              ) : dueProblems.map(problem => {
                const next = getNextInterval(problem);
                const overdueDays = Math.max(0, -daysBetween(todayStr(), next.date));
                const alreadyMarked = problem.markedTodayDone && problem._markedDate === todayStr();
                return (
                  <div key={problem.id} className={`rev-card ${alreadyMarked ? "done-today" : overdueDays > 0 ? "urgent" : "today-due"}`}>
                    <div className="rev-top">
                      <div className="rev-name">{problem.name}</div>
                      <span className={`diff-badge ${problem.difficulty === "Easy" ? "d-easy" : problem.difficulty === "Hard" ? "d-hard" : "d-med"}`}>{problem.difficulty}</span>
                    </div>
                    <div className="rev-meta">
                      <span>📅 Solved {fmtDate(problem.dateSolved)}</span>
                      {problem.topic ? <span>📄 {problem.topic}</span> : null}
                      {problem.timeTaken ? <span>⏱ {problem.timeTaken}</span> : null}
                      <span style={{ color: overdueDays > 0 ? "#f87171" : "#f59e0b" }}>
                        {overdueDays > 0 ? `${overdueDays}d overdue` : `${INTERVAL_LABELS[INTERVALS.indexOf(next.interval)]} revision`}
                      </span>
                    </div>
                    {problem.approach ? <div className="rev-approach"><strong style={{ color: "#6366f1" }}>Approach:</strong> {problem.approach}</div> : null}
                    {problem.insight ? <div className="rev-approach" style={{ borderLeftColor: "#f59e0b" }}><strong style={{ color: "#f59e0b" }}>Key insight:</strong> {problem.insight}</div> : null}
                    <div className="rev-actions">
                      {alreadyMarked ? (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => unmarkRevision(problem.id)}>Undo</button>
                          <span className="next-badge nb-green">Done for today</span>
                        </>
                      ) : (
                        <button className="btn btn-green btn-sm" onClick={() => markRevisionDone(problem.id)}>&#10003; Revised</button>
                      )}
                      <span className="interval-chip">{INTERVALS.map(interval => <span key={interval} style={{ color: problem.revisionsDone?.[interval] ? "#10b981" : "#334155" }}>{interval}d </span>)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTab === "add" ? (
          <div className="form-card">
            <div className="form-title">Log a new problem</div>
            <div className="row2">
              <div className="field"><label>Problem name / number</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Topic / pattern</label><input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} /></div>
            </div>
            <div className="row3">
              <div className="field"><label>Difficulty</label><select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
              <div className="field"><label>Time taken</label><input value={form.timeTaken} onChange={e => setForm({ ...form, timeTaken: e.target.value })} /></div>
              <div className="field"><label>Date solved</label><input type="date" value={form.dateSolved} onChange={e => setForm({ ...form, dateSolved: e.target.value })} /></div>
            </div>
            <div className="field"><label>Approach</label><textarea value={form.approach} onChange={e => setForm({ ...form, approach: e.target.value })} /></div>
            <div className="field"><label>Key insight</label><input value={form.insight} onChange={e => setForm({ ...form, insight: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={addProblem}>Save problem</button>
              <button className="btn btn-ghost" onClick={() => setForm({ name: "", topic: "", difficulty: "Medium", timeTaken: "", dateSolved: todayStr(), approach: "", insight: "" })}>Clear</button>
            </div>
          </div>
        ) : null}

        {activeTab === "all" ? (
          <div>
            <div className="filter-row">
              <input className="search-input" placeholder="Search problems..." value={query} onChange={e => setQuery(e.target.value)} />
              {["All", "Easy", "Medium", "Hard"].map(diff => (
                <button key={diff} className={`filter-btn ${filterDiff === diff ? "active" : ""}`} onClick={() => setFilterDiff(diff)}>{diff}</button>
              ))}
            </div>
            {filteredProblems.length === 0 ? <div className="empty-state"><div className="empty-icon">&#128218;</div><div>No matching problems</div></div> : filteredProblems.map((problem, index) => {
              const next = getNextInterval(problem);
              const doneCount = INTERVALS.filter(interval => problem.revisionsDone?.[interval]).length;
              return (
                <div className="prob-card" key={problem.id}>
                  <div className="prob-num">#{index + 1}</div>
                  <div className="prob-body">
                    <div className="prob-name">{problem.name}</div>
                    <div className="prob-meta">
                      {problem.topic || "-"} · {fmtDate(problem.dateSolved)} · {next ? `Next revision: ${fmtDate(next.date)}` : "Fully revised"} · {doneCount}/{INTERVALS.length}
                    </div>
                  </div>
                  <div className="prob-actions">
                    <span className={`diff-badge ${problem.difficulty === "Easy" ? "d-easy" : problem.difficulty === "Hard" ? "d-hard" : "d-med"}`}>{problem.difficulty}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(problem.id)}>Edit</button>
                    <button className="delete-btn" onClick={() => deleteProblem(problem.id)} title="Delete">&#128465;</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {activeTab === "stats" ? (
          <div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-n" style={{ color: "#6366f1" }}>{problems.length}</div><div className="stat-l">Total problems</div></div>
              <div className="stat-card"><div className="stat-n" style={{ color: "#10b981" }}>{problems.filter(problem => !getNextInterval(problem)).length}</div><div className="stat-l">Fully revised</div></div>
              <div className="stat-card"><div className="stat-n" style={{ color: "#f59e0b" }}>{dueProblems.length}</div><div className="stat-l">Due now</div></div>
              <div className="stat-card"><div className="stat-n" style={{ color: "#a78bfa" }}>{Object.keys(topicMap).length}</div><div className="stat-l">Topics</div></div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>By topic</div>
            <div className="topic-grid">
              {Object.entries(topicMap).map(([topic, value]) => {
                const maxTotal = Math.max(1, ...Object.values(topicMap).map(item => item.total));
                return (
                  <div className="topic-card" key={topic}>
                    <div className="topic-name">{topic}</div>
                    <div className="topic-bar-bg"><div className="topic-bar-fill" style={{ width: `${Math.round(value.total / maxTotal * 100)}%` }} /></div>
                    <div className="topic-count">{value.total} problems · {value.done} fully revised</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {editingId ? (
          <div className="modal-bg open" onClick={event => { if (event.target === event.currentTarget) setEditingId(null); }}>
            <div className="modal">
              <button className="modal-close" onClick={() => setEditingId(null)}>&#10005;</button>
              <div className="modal-title">Edit problem</div>
              <div className="field"><label>Problem name</label><input value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div className="row2">
                <div className="field"><label>Topic</label><input value={editForm.topic || ""} onChange={e => setEditForm({ ...editForm, topic: e.target.value })} /></div>
                <div className="field"><label>Difficulty</label><select value={editForm.difficulty || "Medium"} onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
              </div>
              <div className="field"><label>Time taken</label><input value={editForm.timeTaken || ""} onChange={e => setEditForm({ ...editForm, timeTaken: e.target.value })} /></div>
              <div className="field"><label>Approach</label><textarea value={editForm.approach || ""} onChange={e => setEditForm({ ...editForm, approach: e.target.value })} /></div>
              <div className="field"><label>Key insight</label><input value={editForm.insight || ""} onChange={e => setEditForm({ ...editForm, insight: e.target.value })} /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .page { background: #0f172a; min-height: 100vh; padding: 16px 12px 40px; }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { font-size: 20px; font-weight: 700; margin: 0; }
        .sub, .save-state { font-size: 12px; color: #94a3b8; margin-top: 3px; }
        .error-banner { margin: 10px 0 14px; background: #4c1d1d; color: #fecaca; border: 1px solid #7f1d1d; border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.5; }
        .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
        .tab { padding: 7px 16px; border-radius: 8px; border: .5px solid #334155; font-size: 13px; font-weight: 500; cursor: pointer; background: #1e293b; color: #94a3b8; }
        .tab.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .form-card,.prob-card,.stat-card,.topic-card,.rev-card,.icard,.modal { background: #1e293b; border: .5px solid #334155; }
        .form-card { border-radius: 12px; padding: 18px; margin-bottom: 16px; }
        .form-title { font-size: 14px; font-weight: 600; margin-bottom: 14px; }
        .field { margin-bottom: 12px; }
        .field label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; margin-bottom: 5px; }
        .field input,.field select,.field textarea,.search-input { width: 100%; background: #0f172a; border: .5px solid #334155; color: #f1f5f9; border-radius: 8px; padding: 9px 12px; font-size: 13px; font-family: inherit; }
        .field textarea { min-height: 80px; resize: vertical; }
        .row2,.row3,.stats-grid,.topic-grid { display: grid; gap: 12px; }
        .row2 { grid-template-columns: 1fr 1fr; }
        .row3 { grid-template-columns: 1fr 1fr 1fr; }
        .btn { padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
        .btn-primary { background: #6366f1; color: #fff; } .btn-ghost { background: none; border: .5px solid #334155; color: #94a3b8; } .btn-sm { padding: 5px 12px; font-size: 11px; border-radius: 6px; } .btn-green { background: #064e3b; color: #10b981; }
        .today-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .today-date { font-size: 13px; color: #94a3b8; }
        .rev-count { font-size: 13px; font-weight: 600; color: #6366f1; }
        .interval-info { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
        .icard { border-radius: 8px; padding: 8px 12px; flex: 1; min-width: 80px; text-align: center; }
        .icard-n { font-size: 13px; font-weight: 700; }
        .icard-l { font-size: 10px; color: #94a3b8; margin-top: 2px; }
        .empty-state { text-align: center; padding: 48px 20px; color: #94a3b8; font-size: 14px; }
        .empty-icon { font-size: 36px; margin-bottom: 10px; }
        .rev-card { border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; border-left: 3px solid #334155; }
        .rev-card.urgent { border-left-color: #f87171; } .rev-card.today-due { border-left-color: #f59e0b; } .rev-card.done-today { border-left-color: #10b981; opacity: .55; }
        .rev-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
        .rev-name { font-size: 14px; font-weight: 600; flex: 1; }
        .diff-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
        .d-easy { background: #064e3b; color: #10b981; } .d-med { background: #1d3a6e; color: #3b82f6; } .d-hard { background: #4c1d1d; color: #f87171; }
        .rev-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
        .rev-approach { font-size: 12px; color: #94a3b8; background: #0f172a; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; line-height: 1.5; border-left: 2px solid #334155; }
        .rev-actions,.filter-row,.prob-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .next-badge { font-size: 10px; padding: 3px 8px; border-radius: 20px; font-weight: 600; }
        .nb-green { background: #064e3b; color: #10b981; }
        .interval-chip { font-size: 10px; color: #94a3b8; margin-left: auto; }
        .filter-row { margin-bottom: 12px; }
        .filter-btn { padding: 5px 12px; border-radius: 6px; border: .5px solid #334155; font-size: 11px; font-weight: 500; cursor: pointer; background: #1e293b; color: #94a3b8; }
        .filter-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .prob-card { border-radius: 10px; padding: 12px 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 10px; }
        .prob-num { font-size: 12px; font-weight: 700; color: #94a3b8; width: 32px; }
        .prob-body { flex: 1; min-width: 0; }
        .prob-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prob-meta,.stat-l,.topic-count { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .delete-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px; }
        .stats-grid,.topic-grid { grid-template-columns: repeat(2,1fr); margin-bottom: 16px; }
        .stat-card { border-radius: 10px; padding: 14px; text-align: center; }
        .stat-n { font-size: 26px; font-weight: 700; }
        .topic-card { border-radius: 8px; padding: 10px 12px; }
        .topic-name { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
        .topic-bar-bg { background: #334155; border-radius: 3px; height: 5px; overflow: hidden; }
        .topic-bar-fill { height: 100%; border-radius: 3px; background: #6366f1; }
        .modal-bg { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 100; align-items: center; justify-content: center; padding: 16px; }
        .modal-bg.open { display: flex; }
        .modal { border-radius: 14px; padding: 20px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
        .modal-close { float: right; background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; margin-top: -4px; }
        @media (max-width: 700px) { .row2,.row3,.stats-grid,.topic-grid { grid-template-columns: 1fr; } .prob-card { flex-direction: column; align-items: flex-start; } .interval-chip { margin-left: 0; } }
      `}</style>
    </div>
  );
}
