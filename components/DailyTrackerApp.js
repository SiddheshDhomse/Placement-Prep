"use client";

import { useEffect, useMemo, useState } from "react";
import TrackerNav from "./TrackerNav";

const BLOCKS = [
  { id: "b1", time: "7:30 - 8:15", title: "Morning routine", sub: "Freshen up, breakfast - no phone scrolling", tag: "45 min", tc: "t-misc", bc: "b-misc", sect: "Morning" },
  { id: "b2", time: "8:15 - 9:00", title: "Morning run", sub: "Your existing routine - energy for the day", tag: "45 min", tc: "t-run", bc: "b-run" },
  { id: "b3", time: "9:00 - 10:00", title: "Notebook review", sub: "Scan yesterday's DSA notes before deep work", tag: "1 hr", tc: "t-misc", bc: "b-misc" },
  { id: "b4", time: "10:00 - 11:30", title: "DSA block 1", sub: "2 problems + notebook entry", tag: "90 min | DSA", tc: "t-dsa", bc: "b-dsa", sect: "DSA - 4 hrs" },
  { id: "b5", time: "11:30 - 11:45", title: "Break", sub: "Walk, water, stretch - no phone", tag: "15 min", tc: "t-break", bc: "b-break" },
  { id: "b6", time: "11:45 - 1:15", title: "DSA block 2", sub: "1 medium + spaced repetition revision", tag: "90 min | DSA", tc: "t-dsa", bc: "b-dsa" },
  { id: "b7", time: "2:15 - 3:45", title: "Project block 1", sub: "React / Spring Boot feature build", tag: "90 min | Project", tc: "t-proj", bc: "b-proj", sect: "Project - 3 hrs" },
  { id: "b8", time: "4:00 - 5:30", title: "Project block 2", sub: "Continue + GitHub commit", tag: "90 min | Project", tc: "t-proj", bc: "b-proj" },
  { id: "b9", time: "7:30 - 9:00", title: "CS fundamentals", sub: "DBMS / OS / OOP / Networks - 1 topic/week", tag: "90 min | Revision", tc: "t-rev", bc: "b-rev", sect: "Evening" }
];

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDayDiff(startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date(`${todayKey()}T00:00:00`);
  return Math.round((today - start) / 86400000);
}

function emptyDayState() {
  return { blocks: {}, lc1: "", lc2: "", lc3: "", lcPattern: "", notes: "", tomorrow: "" };
}

export default function DailyTrackerApp() {
  const [data, setData] = useState(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [status, setStatus] = useState("Loading...");

  async function persist(nextData, successMessage = "Saved") {
    setData(nextData);
    setStatus("Saving...");
    const response = await fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData)
    });
    if (!response.ok) {
      setStatus("Save failed");
      return;
    }
    setStatus(successMessage);
  }

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/daily");
      const payload = await response.json();
      const startDate = payload.startDate || todayKey();
      const nextData = { startDate, days: payload.days || {} };
      setData(nextData);
      const day = Math.min(Math.max(getDayDiff(startDate) + 1, 1), 90);
      setCurrentDay(day);
      setStatus("Loaded");
      if (!payload.startDate) {
        await persist(nextData, "Initialized");
      }
    }
    load();
  }, []);

  const dayState = useMemo(() => {
    if (!data) return emptyDayState();
    return data.days[String(currentDay)] || emptyDayState();
  }, [currentDay, data]);

  const doneBlocks = useMemo(() => Object.values(dayState.blocks || {}).filter(Boolean).length, [dayState]);

  function patchDay(patch) {
    if (!data) return;
    const key = String(currentDay);
    const existing = data.days[key] || emptyDayState();
    const nextDay = { ...existing, ...patch };
    const nextData = {
      ...data,
      days: {
        ...data.days,
        [key]: nextDay
      }
    };
    persist(nextData);
  }

  function toggleBlock(id) {
    patchDay({
      blocks: {
        ...(dayState.blocks || {}),
        [id]: !dayState.blocks?.[id]
      }
    });
  }

  function handleInputChange(field, value) {
    patchDay({ [field]: value });
  }

  function resetDay() {
    if (!data || !window.confirm(`Reset all data for Day ${currentDay}?`)) return;
    const nextDays = { ...data.days };
    delete nextDays[String(currentDay)];
    persist({ ...data, days: nextDays }, "Day reset");
  }

  function calcStreak() {
    if (!data) return 0;
    let streak = 0;
    for (let day = currentDay; day >= 1; day -= 1) {
      const entry = data.days[String(day)] || emptyDayState();
      const done = Object.values(entry.blocks || {}).filter(Boolean).length;
      if (done >= 6) streak += 1;
      else break;
    }
    return streak;
  }

  function calcTotalLC() {
    if (!data) return 0;
    return Object.values(data.days).reduce((total, entry) => {
      return total + [entry.lc1, entry.lc2, entry.lc3].filter(value => value && value.trim()).length;
    }, 0);
  }

  function displayDateForDay(day) {
    if (!data?.startDate) return "";
    const start = new Date(`${data.startDate}T00:00:00`);
    start.setDate(start.getDate() + (day - 1));
    return start.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  }

  if (!data) {
    return <div style={{ padding: 24 }}>Loading tracker...</div>;
  }

  return (
    <div className="page">
      <div className="container">
        <TrackerNav current="daily" />

        <div className="top-bar">
          <div>
            <h1>90-Day SDE Tracker</h1>
            <div className="sub">Siddhesh - VIT Pune 2026 · Java + DSA + Full Stack</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="month-tag">{currentDay <= 30 ? "Month 1" : currentDay <= 60 ? "Month 2" : "Month 3"}</span>
            <button className="reset-btn" onClick={resetDay}>Reset day</button>
          </div>
        </div>

        <div className="save-state">{status}</div>

        <div className="stats">
          <div className="stat"><div className="stat-n n-accent">{currentDay}</div><div className="stat-l">Current day</div></div>
          <div className="stat"><div className="stat-n n-green">{[dayState.lc1, dayState.lc2, dayState.lc3].filter(v => v && v.trim()).length}</div><div className="stat-l">LC solved today</div></div>
          <div className="stat"><div className="stat-n n-amber">{calcStreak()}</div><div className="stat-l">Day streak</div></div>
          <div className="stat"><div className="stat-n n-purple">{calcTotalLC()}</div><div className="stat-l">Total LC solved</div></div>
        </div>

        <div className="day-nav">
          <button onClick={() => setCurrentDay(day => Math.max(1, day - 1))}>&larr;</button>
          <div className="day-info">
            <div className="day-num">Day {currentDay} of 90</div>
            <div className="day-date">{displayDateForDay(currentDay)}</div>
          </div>
          <button onClick={() => setCalendarOpen(true)}>Calendar</button>
          <button onClick={() => setCurrentDay(day => Math.min(90, day + 1))}>&rarr;</button>
        </div>

        <div style={{ marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Today's progress</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{doneBlocks} / {BLOCKS.length} blocks</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.round(doneBlocks / BLOCKS.length * 100)}%` }} /></div>

        <div className="blocks">
          {BLOCKS.map((block, index) => {
            const done = Boolean(dayState.blocks?.[block.id]);
            const showSection = block.sect && (index === 0 || BLOCKS[index - 1].sect !== block.sect);
            return (
              <div key={block.id}>
                {showSection ? <div className="sect-divider">{block.sect}</div> : null}
                <div className={`block ${block.bc} ${done ? "done" : ""}`} onClick={() => toggleBlock(block.id)}>
                  <div className="check">{done ? "✓" : ""}</div>
                  <div className="block-time">{block.time}</div>
                  <div className="block-body">
                    <div className="block-title">{block.title}</div>
                    <div className="block-sub">{block.sub}</div>
                  </div>
                  <span className={`tag ${block.tc}`}>{block.tag}</span>
                </div>
              </div>
            );
          })}
        </div>

        <h2>LeetCode log</h2>
        <div className="card-section">
          {[
            ["lc1", "Problem 1", "badge-e", "Easy"],
            ["lc2", "Problem 2", "badge-m", "Medium"],
            ["lc3", "Problem 3", "badge-m", "Medium"]
          ].map(([field, label, badgeClass, badgeLabel]) => (
            <div className="lc-row" key={field}>
              <span className="lc-label">{label}</span>
              <input className="lc-input" value={dayState[field] || ""} onChange={e => handleInputChange(field, e.target.value)} placeholder="Problem name or number" />
              <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
            </div>
          ))}
          <div className="lc-row" style={{ marginTop: 4 }}>
            <span className="lc-label" style={{ fontSize: 11 }}>Pattern</span>
            <input className="lc-input" value={dayState.lcPattern || ""} onChange={e => handleInputChange("lcPattern", e.target.value)} placeholder="e.g. Two pointers, Sliding window..." />
          </div>
        </div>

        <h2>Notebook entry</h2>
        <div className="card-section">
          <textarea className="nb-input" value={dayState.notes || ""} onChange={e => handleInputChange("notes", e.target.value)} placeholder="Key insight, approach, edge case, complexity..." />
          <div className="nb-row">
            <span className="nb-label">Tomorrow's 3 problems</span>
            <input className="lc-input" value={dayState.tomorrow || ""} onChange={e => handleInputChange("tomorrow", e.target.value)} placeholder="Plan ahead tonight" />
          </div>
        </div>

        <h2>Last 7 days</h2>
        <div className="streak-row">
          {Array.from({ length: 7 }, (_, idx) => currentDay - (6 - idx)).map(day => {
            if (day < 1) return <div key={`empty-${day}`} className="streak-day">-</div>;
            const entry = data.days[String(day)] || emptyDayState();
            const done = Object.values(entry.blocks || {}).filter(Boolean).length;
            const cls = done >= BLOCKS.length ? "great" : done >= 4 ? "done" : "";
            return <div key={day} className={`streak-day ${cls} ${day === currentDay ? "today" : ""}`}>D{day}</div>;
          })}
        </div>

        {calendarOpen ? (
          <div className="modal active" onClick={event => { if (event.target === event.currentTarget) setCalendarOpen(false); }}>
            <div className="cal-container">
              <div className="cal-header">
                <span>90-Day Journey</span>
                <button className="cal-close" onClick={() => setCalendarOpen(false)}>&times;</button>
              </div>
              <div className="cal-grid">
                {Array.from({ length: 90 }, (_, idx) => idx + 1).map(day => {
                  const entry = data.days[String(day)] || emptyDayState();
                  const done = Object.values(entry.blocks || {}).filter(Boolean).length;
                  const cls = day === currentDay ? "active-day" : done >= BLOCKS.length ? "great-day" : done >= 4 ? "done-day" : "";
                  return (
                    <div key={day} className={`cal-day ${cls}`} onClick={() => { setCurrentDay(day); setCalendarOpen(false); }}>
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .page { padding: 16px; background: #0f172a; min-height: 100vh; }
        .container { max-width: 700px; margin: 0 auto; padding-bottom: 40px; }
        h1 { font-size: 20px; font-weight: 700; color: #f1f5f9; margin: 0; }
        h2 { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin: 20px 0 8px; }
        .sub { font-size: 12px; color: #94a3b8; margin-top: 3px; }
        .save-state { font-size: 11px; color: #94a3b8; margin-bottom: 10px; }
        .top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 20px; }
        .stat, .card-section { background: #1e293b; border: 0.5px solid #334155; border-radius: 10px; padding: 12px 14px; }
        .stat-n { font-size: 22px; font-weight: 700; }
        .stat-l { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .n-accent { color: #6366f1; } .n-green { color: #10b981; } .n-amber { color: #f59e0b; } .n-purple { color: #a78bfa; }
        .day-nav { display: flex; align-items: center; gap: 10px; background: #1e293b; border: 0.5px solid #334155; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }
        .day-nav button, .reset-btn, .cal-close { background: none; border: 0.5px solid #334155; color: #f1f5f9; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 13px; }
        .day-info { flex: 1; text-align: center; }
        .day-num { font-size: 16px; font-weight: 700; }
        .day-date { font-size: 11px; color: #94a3b8; }
        .progress-bar { background: #334155; border-radius: 4px; height: 6px; margin: 8px 0 16px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg,#6366f1,#10b981); transition: width .3s; }
        .blocks { display: flex; flex-direction: column; gap: 6px; }
        .block { display: flex; align-items: center; gap: 12px; background: #1e293b; border: 0.5px solid #334155; border-radius: 10px; padding: 10px 14px; cursor: pointer; transition: border-color .15s, opacity .15s; border-left: 3px solid #334155; }
        .block:hover { border-color: #6366f1; }
        .block.done { opacity: .6; }
        .block.done .block-title { text-decoration: line-through; color: #94a3b8; }
        .block-time { font-size: 11px; color: #94a3b8; width: 88px; flex-shrink: 0; text-align: center; line-height: 1.4; }
        .block-body { flex: 1; }
        .block-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .block-sub { font-size: 11px; color: #94a3b8; }
        .tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; }
        .check { width: 20px; height: 20px; border: 2px solid #334155; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; }
        .block.done .check { background: #10b981; border-color: #10b981; }
        .b-run { border-left-color: #10b981; } .b-dsa { border-left-color: #3b82f6; } .b-proj { border-left-color: #f59e0b; } .b-rev { border-left-color: #a78bfa; }
        .t-run { background: #064e3b; color: #10b981; } .t-dsa { background: #1d3a6e; color: #3b82f6; } .t-proj { background: #5c3a0a; color: #f59e0b; } .t-rev { background: #3b2678; color: #a78bfa; }
        .t-break, .t-misc { background: #1e293b; color: #94a3b8; border: 0.5px solid #334155; }
        .lc-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .lc-label, .nb-label { font-size: 12px; color: #94a3b8; width: 80px; }
        .lc-input, .nb-input { width: 100%; background: #0f172a; border: 0.5px solid #334155; color: #f1f5f9; border-radius: 6px; padding: 8px 10px; font-size: 13px; }
        .nb-input { min-height: 90px; resize: vertical; font-family: inherit; }
        .nb-row { display: flex; gap: 8px; margin-top: 8px; align-items: center; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; margin-left: 6px; }
        .badge-e { background: #064e3b; color: #10b981; } .badge-m { background: #1d3a6e; color: #3b82f6; }
        .sect-divider { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; padding: 8px 0 4px; border-top: 0.5px solid #334155; margin-top: 8px; }
        .reset-btn { color: #94a3b8; }
        .month-tag { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: #1d3a6e; color: #3b82f6; }
        .streak-row { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; margin-top: 6px; }
        .streak-day { height: 28px; border-radius: 4px; background: #334155; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; }
        .streak-day.done { background: #1d3a6e; color: #3b82f6; } .streak-day.great { background: #064e3b; color: #10b981; } .streak-day.today { border: 1px solid #6366f1; }
        .modal { display: none; position: fixed; inset: 0; background: rgba(15,23,42,.85); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal.active { display: flex; }
        .cal-container { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; width: 100%; max-width: 420px; }
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-weight: 600; }
        .cal-grid { display: grid; grid-template-columns: repeat(10,1fr); gap: 6px; }
        .cal-day { aspect-ratio: 1; border-radius: 6px; background: #0f172a; border: 1px solid #334155; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; color: #94a3b8; }
        .cal-day.active-day { border: 2px solid #6366f1; color: #f1f5f9; font-weight: 700; background: rgba(99,102,241,.1); }
        .cal-day.done-day { background: #1d3a6e; color: #3b82f6; border-color: #1d3a6e; }
        .cal-day.great-day { background: #064e3b; color: #10b981; border-color: #064e3b; }
        @media (max-width: 700px) { .stats { grid-template-columns: repeat(2,1fr); } }
      `}</style>
    </div>
  );
}
