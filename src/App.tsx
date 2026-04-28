// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — 2026 Season Race Tracking System
// React + TypeScript · Dynamic data from Jolpica + OpenF1 APIs
// Falls back to static data when APIs are unavailable
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, type FC } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { Race, Driver, LapSnapshot, Highlight } from "./api/types";
import { useSchedule, useStandings, useLiveRaceData, useQualifyingData, usePracticeData } from "./hooks/useF1Data";
import type { QualifyingEntry, PracticeSession, PracticeEntry } from "./hooks/useF1Data";
import { FALLBACK_HIGHLIGHTS } from "./hooks/fallbackData";
import { getCircuitInfo, type CircuitInfo } from "./data/circuits";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const SEASON = 2026;

type PageTab = "calendar" | "race" | "standings" | "regulations" | "teams" | "drivers" | "constructor-standings";
type RaceSection = "fri" | "sat" | "race";
type SpeedOption = { label: string; value: number };

const SPEED_OPTIONS: SpeedOption[] = [
  { label: "1×", value: 1000 },
  { label: "2×", value: 600 },
  { label: "5×", value: 250 },
  { label: "10×", value: 80 },
];

const AVAILABLE_YEARS = [2024, 2025, 2026] as const;

// ── HELPERS ──────────────────────────────────────────────────────────────────

function daysUntilRace(raceDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const rd = new Date(raceDate);
  rd.setHours(0, 0, 0, 0);
  return Math.ceil((rd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDriverFromList(drivers: Driver[], id: string): Driver {
  return drivers.find(d => d.id === id) ?? drivers[0] ?? {
    id, number: 0, name: id, team: "Unknown", color: "#888", flag: "🏁",
  };
}

// ── DATA SOURCE BADGE ────────────────────────────────────────────────────────

const DataBadge: FC<{ dataSource: "openf1" | "jolpica" | "simulation"; error?: string | null }> = ({ dataSource, error }) => {
  const cfg = {
    openf1:     { label: "LIVE API (OpenF1)",  color: "#00e676" },
    jolpica:    { label: "RACE RESULTS (Jolpica)", color: "#64B5F6" },
    simulation: { label: "OFFLINE / STATIC",    color: "#ff6b35" },
  }[dataSource];

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 3,
      background: `${cfg.color}11`,
      border: `1px solid ${cfg.color}33`,
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      textTransform: "uppercase" as const,
      color: cfg.color,
      marginLeft: 8,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: cfg.color,
        boxShadow: `0 0 6px ${cfg.color}`,
      }} />
      {cfg.label}
      {error && (
        <span style={{ opacity: 0.7, marginLeft: 4 }} title={error}>⚠</span>
      )}
    </div>
  );
};

// ── LOADING SKELETON ─────────────────────────────────────────────────────────

const LoadingSkeleton: FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="calendar-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="race-card" style={{ opacity: 0.4 }}>
        <div style={{
          height: 12, width: "40%", background: "var(--surface2)",
          borderRadius: 2, marginBottom: 12,
        }} />
        <div style={{
          height: 24, width: "70%", background: "var(--surface2)",
          borderRadius: 2, marginBottom: 6,
        }} />
        <div style={{
          height: 14, width: "50%", background: "var(--surface2)",
          borderRadius: 2, marginBottom: 16,
        }} />
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{
              flex: 1, height: 44, background: "var(--surface2)", borderRadius: 3,
            }} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── STYLES ───────────────────────────────────────────────────────────────────

const STYLES = `
  :root {
    --bg: #060608;
    --surface: #0d0e14;
    --surface2: #13141d;
    --surface3: #191a26;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.15);
    --red: #e10600;
    --red-dim: rgba(225,6,0,0.12);
    --gold: #ffd700;
    --green: #00e676;
    --text: #e8e8f0;
    --muted: #5a5a72;
    --accent: #ff6b35;
    --row-h: 56px;
    --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .f1-app {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(225,6,0,0.08) 0%, transparent 60%),
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px);
    background-attachment: fixed;
  }

  /* ─── NAV ─── */
  .nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(6,6,8,0.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 28px; height: 56px;
  }
  .nav-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 22px; letter-spacing: 3px;
    color: var(--red); margin-right: 36px;
    text-transform: uppercase;
    user-select: none;
  }
  .nav-logo span { color: var(--text); }
  .nav-tabs { display: flex; gap: 2px; flex: 1; }
  .nav-tab {
    display: flex; align-items: center;
    padding: 0 20px; height: 56px;
    background: none; border: none;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; letter-spacing: 1.5px;
    text-transform: uppercase; cursor: pointer;
    transition: color 0.2s;
    border-bottom: 3px solid transparent;
    position: relative;
  }
  .nav-tab:hover { color: var(--text); }
  .nav-tab.active { color: var(--text); border-bottom-color: var(--red); }
  .nav-season {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600; font-size: 12px; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
  }

  .live-dot {
    display: inline-block; width: 7px; height: 7px;
    background: var(--red); border-radius: 50%;
    margin-right: 6px;
    box-shadow: 0 0 10px var(--red), 0 0 20px rgba(225,6,0,0.3);
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.35; transform: scale(0.65); }
  }

  /* ─── PAGE ─── */
  .page { padding: 36px 32px; max-width: 1440px; margin: 0 auto; }
  .page-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 52px; letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 4px;
    color: var(--text); line-height: 1;
  }
  .page-sub {
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; font-weight: 600;
    letter-spacing: 2px; margin-bottom: 32px;
    text-transform: uppercase;
    display: flex; align-items: center; gap: 4px;
    flex-wrap: wrap;
  }

  /* ─── CALENDAR GRID ─── */
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
    gap: 14px;
  }
  .race-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 18px 20px;
    cursor: pointer;
    transition: border-color 0.25s, transform 0.2s var(--spring), box-shadow 0.25s;
    position: relative;
    overflow: hidden;
  }
  .race-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: transparent;
    transition: background 0.2s, height 0.2s;
  }
  .race-card:hover {
    border-color: var(--border-hover);
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  }
  .race-card:hover::before { background: var(--red); height: 3px; }
  .race-card.completed { opacity: 0.7; }
  .race-card.completed:hover { opacity: 1; }
  .race-card.completed::before { background: var(--muted); height: 2px; }
  .race-card.next {
    border-color: rgba(225,6,0,0.4);
    box-shadow: 0 0 30px rgba(225,6,0,0.06);
  }
  .race-card.next::before { background: var(--red); height: 3px; }

  .card-round {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 10px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .sprint-badge {
    background: rgba(255,107,53,0.12);
    color: var(--accent);
    font-size: 9px; letter-spacing: 1.2px; padding: 2px 7px;
    border-radius: 2px;
    border: 1px solid rgba(255,107,53,0.25);
  }
  .card-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 24px; letter-spacing: 0.5px;
    color: var(--text); margin-bottom: 2px;
    text-transform: uppercase;
  }
  .card-circuit {
    color: var(--muted); font-size: 12px; margin-bottom: 16px;
    font-weight: 500;
  }
  .card-dates { display: flex; gap: 6px; }
  .card-date-block {
    flex: 1; padding: 10px 0;
    background: var(--surface2);
    border-radius: 3px; text-align: center;
  }
  .date-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 1.8px;
    color: var(--muted); text-transform: uppercase;
    display: block; margin-bottom: 3px;
  }
  .date-val { font-size: 12px; font-weight: 600; color: var(--text); }
  .date-val.race { color: var(--red); font-weight: 700; }

  .card-bottom {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    min-height: 28px;
  }
  .countdown {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 15px;
    color: var(--red); letter-spacing: 0.5px;
  }
  .countdown.muted { color: var(--muted); }
  .status-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; letter-spacing: 1.5px;
    font-weight: 700; text-transform: uppercase;
    padding: 3px 10px; border-radius: 2px;
  }
  .status-label.next {
    color: var(--red);
    background: var(--red-dim);
    border: 1px solid rgba(225,6,0,0.2);
  }
  .status-label.completed {
    color: var(--muted);
    background: rgba(90,90,114,0.15);
  }

  /* ─── SECTION TABS ─── */
  .section-tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
  .section-tab {
    padding: 9px 18px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 12px; letter-spacing: 1.2px;
    text-transform: uppercase; cursor: pointer;
    transition: all 0.2s;
  }
  .section-tab:hover { color: var(--text); border-color: var(--border-hover); }
  .section-tab.active {
    background: var(--red); color: #fff;
    border-color: var(--red);
    box-shadow: 0 2px 12px rgba(225,6,0,0.3);
  }

  /* ─── RACE HEADER ─── */
  .race-header {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 22px 28px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 24px;
    flex-wrap: wrap;
    position: relative;
    overflow: hidden;
  }
  .race-header-banner {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-size: cover;
    background-position: center;
    opacity: 0.25;
    z-index: 0;
  }
  .race-header-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
    width: 100%;
  }
  .race-header-info { flex: 1; min-width: 200px; }
  .race-header-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 38px; letter-spacing: 1px;
    color: var(--text); text-transform: uppercase;
    line-height: 1.1;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
  }
  .race-header-circuit {
    color: var(--muted); font-size: 13px; margin-top: 4px;
    font-weight: 500;
  }

  .controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; position: relative; z-index: 1; }
  .btn {
    padding: 9px 22px;
    background: var(--red); color: #fff;
    border: none; border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.2s;
    box-shadow: 0 2px 10px rgba(225,6,0,0.25);
  }
  .btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(225,6,0,0.35); }
  .btn:active { transform: translateY(0); }
  .btn.secondary {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
    box-shadow: none;
  }
  .btn.secondary:hover { border-color: var(--border-hover); box-shadow: none; }
  .speed-select {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 12px;
    border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; letter-spacing: 1px;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .speed-select:hover { border-color: var(--border-hover); }
  .speed-select:focus { outline: none; border-color: var(--red); }

  .lap-info {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 14px; color: var(--muted);
    letter-spacing: 1px; text-transform: uppercase;
  }
  .lap-number { color: var(--text); font-size: 24px; }

  /* ─── LEADERBOARD ─── */
  .leaderboard {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .lb-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: 48px 1fr 80px 100px;
    gap: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
    background: var(--surface2);
  }
  .lb-list {
    position: relative;
    overflow: hidden;
  }
  .lb-row {
    display: grid;
    grid-template-columns: 48px 1fr 80px 100px;
    gap: 8px;
    padding: 0 20px;
    height: var(--row-h);
    align-items: center;
    border-bottom: 1px solid var(--border);
    position: absolute;
    left: 0; right: 0;
    transition: top 0.55s var(--spring),
                background-color 0.4s ease;
    will-change: top;
  }
  .lb-row:hover { background: rgba(255,255,255,0.025); }

  .lb-row.gained { animation: gainFlash 0.75s ease forwards; }
  .lb-row.lost   { animation: lostFlash 0.75s ease forwards; }
  @keyframes gainFlash {
    0%   { background-color: rgba(0, 230, 118, 0.2); }
    100% { background-color: transparent; }
  }
  @keyframes lostFlash {
    0%   { background-color: rgba(255, 82, 82, 0.2); }
    100% { background-color: transparent; }
  }

  .pos-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 20px; color: var(--muted);
    text-align: center;
  }
  .pos-num.p1 { color: var(--gold); text-shadow: 0 0 12px rgba(255,215,0,0.3); }
  .pos-num.p2 { color: #c0c0c0; }
  .pos-num.p3 { color: #cd7f32; }

  .driver-cell { display: flex; align-items: center; gap: 10px; }
  .team-bar {
    width: 3px; height: 36px; border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 0 0 6px currentColor;
  }
  .driver-abbr {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 17px; letter-spacing: 0.5px;
    color: var(--text); min-width: 36px;
  }
  .driver-name-full { font-size: 12px; color: var(--muted); }
  .driver-team-name { font-size: 10px; color: var(--muted); opacity: 0.6; }

  .pos-change {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px;
    text-align: center; letter-spacing: 0.5px;
  }
  .pos-change.up   { color: var(--green); }
  .pos-change.down { color: #ff5252; }
  .pos-change.same { color: var(--muted); }

  .gap-cell {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; color: var(--muted);
    text-align: right; letter-spacing: 0.5px;
  }
  .gap-cell.leader {
    color: var(--gold); font-weight: 700;
    font-size: 11px; letter-spacing: 1px;
  }

  .sc-banner {
    background: linear-gradient(90deg, rgba(255,215,0,0.12), rgba(255,215,0,0.03), transparent);
    border-left: 3px solid var(--gold);
    padding: 12px 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 14px; letter-spacing: 2px;
    color: var(--gold); text-transform: uppercase;
    display: flex; align-items: center; gap: 10px;
    animation: scSlideIn 0.4s var(--spring);
  }
  .sc-banner .sc-text { animation: scBlink 1s ease-in-out infinite; }
  @keyframes scSlideIn {
    from { opacity: 0; transform: translateX(-30px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes scBlink {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.5; }
  }

  .replay-bar {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 20px;
    background: var(--surface2);
    border-top: 1px solid var(--border);
  }
  .replay-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; color: var(--muted); letter-spacing: 1px;
    min-width: 48px; text-align: center;
  }
  .replay-slider {
    flex: 1;
    -webkit-appearance: none; appearance: none;
    height: 3px; border-radius: 2px;
    background: rgba(255,255,255,0.08);
    cursor: pointer; outline: none;
  }
  .replay-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%; background: var(--red);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(225,6,0,0.5);
    transition: transform 0.15s;
  }
  .replay-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
  .replay-slider::-moz-range-thumb {
    width: 14px; height: 14px;
    border-radius: 50%; background: var(--red);
    cursor: pointer; border: none;
    box-shadow: 0 0 10px rgba(225,6,0,0.5);
  }

  /* ─── HIGHLIGHTS ─── */
  .highlights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px; margin-top: 24px;
  }
  .highlight-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 20px 22px;
    cursor: default;
    transition: border-color 0.25s, transform 0.2s var(--spring);
    position: relative; overflow: hidden;
  }
  .highlight-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: transparent; transition: background 0.2s;
  }
  .highlight-card:hover {
    border-color: var(--border-hover);
    transform: translateY(-2px);
  }
  .highlight-card:hover::before { background: var(--red); }
  .hl-type {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 12px;
    display: flex; align-items: center; gap: 7px;
  }
  .hl-dot {
    width: 6px; height: 6px; border-radius: 50%;
    box-shadow: 0 0 6px currentColor;
  }
  .hl-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 18px; margin-bottom: 8px;
    text-transform: uppercase; letter-spacing: 0.3px;
    color: var(--text);
  }
  .hl-desc { font-size: 13px; color: var(--muted); line-height: 1.6; }
  .hl-time {
    font-size: 11px; color: var(--muted); margin-top: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    letter-spacing: 1px; font-weight: 600;
  }

  /* ─── RACE SELECT ─── */
  .race-select-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px; margin-bottom: 24px;
  }
  .race-select-btn {
    padding: 12px 16px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 3px;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600; font-size: 13px; letter-spacing: 0.5px;
    cursor: pointer; transition: all 0.2s;
    text-align: left; text-transform: uppercase;
  }
  .race-select-btn:hover {
    border-color: var(--border-hover); color: var(--text);
  }
  .race-select-btn.active {
    border-color: var(--red); color: var(--text);
    background: var(--red-dim);
    box-shadow: 0 0 12px rgba(225,6,0,0.1);
  }

  /* ─── STANDINGS ─── */
  .standings-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden; margin-top: 24px;
  }
  .standings-table { width: 100%; border-collapse: collapse; }
  .standings-table th {
    text-align: left; padding: 14px 18px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .standings-table td {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .standings-table tr:last-child td { border-bottom: none; }
  .standings-table tr { transition: background 0.2s; }
  .standings-table tr:hover td { background: rgba(255,255,255,0.02); }
  .pts-bar-wrap { display: flex; align-items: center; gap: 10px; }
  .pts-bar {
    height: 4px; border-radius: 2px;
    opacity: 0.7;
    transition: width 0.5s var(--spring);
  }
  .pts-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 18px; color: var(--text);
    min-width: 36px;
  }
  .pts-num.zero { color: var(--muted); }

  /* ─── SCROLLBAR ─── */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }

  /* ─── YEAR SELECTOR ─── */
  .year-selector {
    display: flex; gap: 6px; flex-wrap: wrap;
  }
  .year-btn {
    padding: 10px 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 18px; letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center;
  }
  .year-btn:hover {
    border-color: var(--border-hover); color: var(--text);
  }
  .year-btn.active {
    border-color: var(--red); color: var(--text);
    background: var(--red-dim);
    box-shadow: 0 0 16px rgba(225,6,0,0.15);
  }

  /* ─── TRACK MODAL ─── */
  .track-modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 40px 20px;
    overflow-y: auto;
    animation: modalFadeIn 0.3s ease;
  }
  @keyframes modalFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .track-modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    max-width: 740px; width: 100%;
    position: relative;
    animation: modalSlideUp 0.35s var(--spring);
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .track-modal-close {
    position: absolute; top: 14px; right: 16px; z-index: 10;
    width: 36px; height: 36px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 50%; color: var(--muted);
    font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .track-modal-close:hover {
    color: var(--text); border-color: var(--red);
    background: var(--red-dim);
  }
  .track-modal-header {
    padding: 28px 28px 20px;
    border-bottom: 1px solid var(--border);
  }
  .track-modal-round {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 8px;
  }
  .track-modal-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 36px; letter-spacing: 1px;
    color: var(--text); text-transform: uppercase; line-height: 1.1;
    margin-bottom: 4px;
  }
  .track-modal-circuit {
    color: var(--muted); font-size: 14px; font-weight: 500;
  }
  .track-modal-image-wrap {
    padding: 20px 28px;
    display: flex; justify-content: center;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
  }
  .track-modal-image {
    max-width: 100%; max-height: 320px;
    object-fit: contain;
    border-radius: 4px;
    filter: brightness(0.95) contrast(1.05);
  }
  .track-modal-image-placeholder {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px; padding: 48px 28px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
  }
  .track-modal-image-placeholder span:first-child {
    font-size: 48px;
  }
  .track-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-bottom: 1px solid var(--border);
  }
  .track-stat {
    padding: 16px 20px; text-align: center;
    border-right: 1px solid var(--border);
  }
  .track-stat:last-child { border-right: none; }
  .track-stat-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 6px;
  }
  .track-stat-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 18px; color: var(--text);
    letter-spacing: 0.5px;
  }
  .track-section {
    padding: 20px 28px;
    border-bottom: 1px solid var(--border);
  }
  .track-section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    color: var(--red); text-transform: uppercase; margin-bottom: 14px;
  }
  .track-history-text {
    color: var(--text); font-size: 14px; line-height: 1.7;
    margin: 0; opacity: 0.85;
  }
  .track-turns-list {
    display: flex; flex-direction: column; gap: 10px;
  }
  .track-turn-card {
    padding: 14px 16px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    border-left: 3px solid var(--red);
    transition: border-color 0.2s;
  }
  .track-turn-card:hover {
    border-left-color: var(--gold);
  }
  .track-turn-header {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 8px;
  }
  .track-turn-number {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 14px;
    color: var(--red); letter-spacing: 0.5px;
    background: var(--red-dim);
    padding: 2px 8px; border-radius: 2px;
    min-width: 36px; text-align: center;
  }
  .track-turn-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 16px; color: var(--text);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .track-turn-desc {
    font-size: 13px; color: var(--muted); line-height: 1.6;
    margin: 0;
  }

  /* ─── QUALIFYING / PRACTICE RESULTS ─── */
  .quali-wrap, .practice-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .quali-header-bar, .practice-header-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .quali-title, .practice-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 22px; letter-spacing: 1px;
    text-transform: uppercase; color: var(--text);
  }
  .quali-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; padding: 4px 10px;
    border-radius: 3px; border: 1px solid;
  }
  .quali-badge.live { color: var(--green); border-color: var(--green); background: rgba(0,230,118,0.06); }
  .quali-badge.offline { color: var(--muted); border-color: var(--border); }

  .quali-table, .practice-table {
    width: 100%; border-collapse: collapse;
  }
  .quali-table th, .practice-table th {
    text-align: left; padding: 12px 18px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .quali-table td, .practice-table td {
    padding: 10px 18px; border-bottom: 1px solid var(--border);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; color: var(--text);
  }
  .quali-table tr:hover, .practice-table tr:hover {
    background: rgba(255,255,255,0.02);
  }
  .quali-table tr.eliminated-q1 { opacity: 0.55; }
  .quali-table tr.eliminated-q2 { opacity: 0.75; }
  .quali-table tr.pole td { background: rgba(255,215,0,0.04); }

  .quali-pos {
    font-weight: 900; font-size: 18px; color: var(--muted);
    text-align: center; width: 36px;
  }
  .quali-pos.p1 { color: var(--gold); text-shadow: 0 0 12px rgba(255,215,0,0.3); }
  .quali-pos.p2 { color: #c0c0c0; }
  .quali-pos.p3 { color: #cd7f32; }

  .quali-driver { display: flex; align-items: center; gap: 10px; }
  .quali-team-bar {
    width: 3px; height: 32px; border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 0 0 6px currentColor;
  }
  .quali-code {
    font-weight: 800; font-size: 16px; letter-spacing: 0.5px;
    color: var(--text); min-width: 36px;
  }
  .quali-name { font-size: 12px; color: var(--muted); }
  .quali-team { font-size: 10px; color: var(--muted); opacity: 0.6; }

  .quali-time {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 13px; letter-spacing: 0.5px;
  }
  .quali-time.best { color: #a855f7; font-weight: 700; }
  .quali-time.eliminated { color: #ff5252; }
  .quali-time.no-time { color: var(--muted); opacity: 0.4; font-size: 11px; }

  .quali-zone-divider td {
    padding: 0; height: 3px;
    background: linear-gradient(90deg, rgba(225,6,0,0.3), transparent);
    border: none;
  }

  .fp-tabs {
    display: flex; gap: 2px; padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .fp-tab {
    padding: 8px 18px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase;
    background: transparent; border: 1px solid var(--border);
    color: var(--muted); border-radius: 3px;
    cursor: pointer; transition: all 0.2s;
  }
  .fp-tab:hover { color: var(--text); border-color: var(--border-hover); }
  .fp-tab.active {
    color: var(--text); border-color: var(--red);
    background: var(--red-dim);
  }

  .practice-gap {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 12px; letter-spacing: 0.5px;
  }
  .practice-gap.leader { color: var(--gold); font-weight: 700; }
  .practice-gap.gap { color: var(--muted); }

  .practice-sector {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 12px; color: var(--muted);
  }

  .practice-laps-count {
    font-size: 12px; color: var(--muted); text-align: center;
  }

  .session-loading {
    text-align: center; padding: 60px 20px; color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif; font-size: 15px;
    letter-spacing: 1px; text-transform: uppercase;
  }
  .session-loading .spinner {
    width: 24px; height: 24px; border: 2px solid var(--red);
    border-top-color: transparent; border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 16px;
  }
  .session-error {
    text-align: center; padding: 40px 20px; color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif; font-size: 14px;
    letter-spacing: 1px; text-transform: uppercase;
  }
  .session-error-icon { color: #ff5252; font-size: 24px; margin-bottom: 10px; }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 768px) {
    .page { padding: 20px 16px; }
    .page-title { font-size: 36px; }
    .nav { padding: 0 16px; }
    .nav-logo { margin-right: 16px; font-size: 18px; }
    .nav-tab { padding: 0 12px; font-size: 11px; }
    .nav-season { display: none; }
    .lb-header, .lb-row { grid-template-columns: 36px 1fr 60px; }
    .lb-header > *:nth-child(4),
    .lb-row > *:nth-child(4) { display: none; }
    .calendar-grid { grid-template-columns: 1fr; }
    .highlights-grid { grid-template-columns: 1fr; }
    .race-header { flex-direction: column; align-items: flex-start; }
    .controls { width: 100%; }
    .race-header-name { font-size: 28px; }
    .track-modal { margin: 10px; }
    .track-modal-name { font-size: 24px; }
    .track-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .track-stat:nth-child(2) { border-right: none; }
    .quali-table th:nth-child(n+4), .quali-table td:nth-child(n+4) { display: none; }
    .practice-table th:nth-child(n+5), .practice-table td:nth-child(n+5) { display: none; }
    .fp-tabs { gap: 4px; padding: 10px 14px; }
    .fp-tab { padding: 6px 12px; font-size: 11px; }
  }
`;

// ── LEADERBOARD COMPONENT ────────────────────────────────────────────────────

interface LeaderboardProps {
  lapData: LapSnapshot[];
  lapIndex: number;
  totalLaps: number;
  drivers: Driver[];
  onScrub: (lap: number) => void;
}

const Leaderboard: FC<LeaderboardProps> = ({ lapData, lapIndex, totalLaps, drivers, onScrub }) => {
  const prevOrderRef = useRef<string[]>([]);
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({});

  const currentSnap = lapData[lapIndex];
  const currentOrder = currentSnap?.order ?? [];
  const isSC = currentSnap?.safetycar ?? false;

  useEffect(() => {
    const prevOrder = prevOrderRef.current;
    if (prevOrder.length === 0) {
      prevOrderRef.current = currentOrder;
      return;
    }

    const newFlash: Record<string, "up" | "down"> = {};
    currentOrder.forEach((id, i) => {
      const prevIdx = prevOrder.indexOf(id);
      if (prevIdx > i) newFlash[id] = "up";
      else if (prevIdx < i) newFlash[id] = "down";
    });

    setFlashMap(newFlash);
    prevOrderRef.current = currentOrder;

    const t = setTimeout(() => setFlashMap({}), 850);
    return () => clearTimeout(t);
  }, [lapIndex]);

  // Gap computation — use real gaps from data if available, else simulate
  const gapTimes = useRef<Record<string, number>>({});
  useEffect(() => {
    const snapGaps = lapData[lapIndex]?.gaps;
    if (snapGaps && Object.keys(snapGaps).length > 0) {
      gapTimes.current = snapGaps;
    } else {
      const gaps: Record<string, number> = {};
      currentOrder.forEach((id, idx) => {
        if (idx === 0) { gaps[id] = 0; return; }
        const prev = gapTimes.current[id] ?? (idx * 1.24 + Math.random() * 0.5);
        gaps[id] = Math.max(0.1, prev + (Math.random() - 0.5) * 0.3);
      });
      gapTimes.current = gaps;
    }
  }, [lapIndex]);

  const ROW_H = 56;

  const getDriver = (id: string) => getDriverFromList(drivers, id);

  return (
    <div className="leaderboard">
      {isSC && (
        <div className="sc-banner">
          <span style={{ fontSize: 20 }}>🟡</span>
          <span className="sc-text">SAFETY CAR DEPLOYED</span>
          <span style={{ fontSize: 11, opacity: 0.6, marginLeft: "auto" }}>
            FIELD BUNCHING UP
          </span>
        </div>
      )}
      <div className="lb-header">
        <span>POS</span>
        <span>DRIVER</span>
        <span style={{ textAlign: "center" }}>+/−</span>
        <span style={{ textAlign: "right" }}>GAP</span>
      </div>
      <div className="lb-list" style={{ height: currentOrder.length * ROW_H }}>
        {currentOrder.map((id, idx) => {
          const driver = getDriver(id);
          const prevOrder = prevOrderRef.current;
          const prevIdx = prevOrder.length > 0 ? prevOrder.indexOf(id) : idx;
          const delta = prevIdx - idx;
          const flash = flashMap[id];
          const pos = idx + 1;
          const gapVal = gapTimes.current[id] ?? 0;
          const gap = idx === 0 ? "INTERVAL" : `+${gapVal.toFixed(3)}s`;

          return (
            <div
              key={id}
              className={`lb-row${flash === "up" ? " gained" : flash === "down" ? " lost" : ""}`}
              style={{ top: idx * ROW_H }}
            >
              <div className={`pos-num${pos === 1 ? " p1" : pos === 2 ? " p2" : pos === 3 ? " p3" : ""}`}>
                {String(pos).padStart(2, "0")}
              </div>
              <div className="driver-cell">
                <div className="team-bar" style={{ backgroundColor: driver.color, color: driver.color }} />
                <div>
                  <div className="driver-abbr">{driver.flag} {driver.id}</div>
                  <div className="driver-name-full">{driver.name}</div>
                  <div className="driver-team-name">{driver.team}</div>
                </div>
              </div>
              <div className={`pos-change ${delta > 0 ? "up" : delta < 0 ? "down" : "same"}`}>
                {delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : "—"}
              </div>
              <div className={`gap-cell${idx === 0 ? " leader" : ""}`}>{gap}</div>
            </div>
          );
        })}
      </div>
      <div className="replay-bar">
        <span className="replay-label">LAP 0</span>
        <input
          type="range" min={0} max={totalLaps} value={lapIndex}
          className="replay-slider"
          onChange={e => onScrub(Number(e.target.value))}
        />
        <span className="replay-label">LAP {totalLaps}</span>
      </div>
    </div>
  );
};

// ── HIGHLIGHTS GRID ──────────────────────────────────────────────────────────

const HighlightsGrid: FC<{ items: Highlight[]; title: string }> = ({ items, title }) => (
  <div>
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
      fontSize: 24, letterSpacing: 1, textTransform: "uppercase" as const,
      color: "var(--text)", marginBottom: 6,
    }}>
      {title}
    </div>
    <div style={{
      color: "var(--muted)", fontSize: 12, letterSpacing: 1, marginBottom: 18,
      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      textTransform: "uppercase" as const,
    }}>
      SESSION EVENTS & KEY MOMENTS
    </div>
    <div className="highlights-grid">
      {items.map((h, i) => (
        <div className="highlight-card" key={i}>
          <div className="hl-type" style={{ color: h.color }}>
            <div className="hl-dot" style={{ background: h.color, color: h.color }} />
            {h.type}
          </div>
          <div className="hl-title">{h.title}</div>
          <div className="hl-desc">{h.desc}</div>
          <div className="hl-time">{h.time}</div>
        </div>
      ))}
    </div>
  </div>
);

// ── QUALIFYING RESULTS COMPONENT ─────────────────────────────────────────────

interface QualifyingResultsProps {
  qualifying: QualifyingEntry[] | null;
  loading: boolean;
  error: string | null;
  raceName?: string;
}

const QualifyingResults: FC<QualifyingResultsProps> = ({ qualifying, loading, error, raceName }) => {
  if (loading) {
    return (
      <div className="session-loading">
        <div className="spinner" />
        LOADING QUALIFYING DATA…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !qualifying || qualifying.length === 0) {
    return (
      <div className="session-error">
        <div className="session-error-icon">⚠</div>
        {error ? `QUALIFYING DATA UNAVAILABLE: ${error}` : "NO QUALIFYING DATA AVAILABLE FOR THIS RACE"}
      </div>
    );
  }

  // Find the best Q3 time for purple highlight
  const bestQ3 = qualifying.find(q => q.q3 && q.position === 1);

  return (
    <div className="quali-wrap">
      <div className="quali-header-bar">
        <div className="quali-title">
          {raceName ? `${raceName} — ` : ""}Qualifying Results
        </div>
        <div className="quali-badge live">JOLPICA API</div>
      </div>
      <table className="quali-table">
        <thead>
          <tr>
            <th style={{ width: 50, textAlign: "center" }}>POS</th>
            <th>DRIVER</th>
            <th style={{ width: 120, textAlign: "center" }}>Q1</th>
            <th style={{ width: 120, textAlign: "center" }}>Q2</th>
            <th style={{ width: 120, textAlign: "center" }}>Q3</th>
          </tr>
        </thead>
        <tbody>
          {qualifying.map((q, i) => {
            const isQ1Zone = i >= 15;  // P16-P20 eliminated in Q1
            const isQ2Zone = i >= 10 && i < 15;  // P11-P15 eliminated in Q2
            const isPole = i === 0;
            const rowClass = [
              isPole ? "pole" : "",
              isQ1Zone ? "eliminated-q1" : "",
              isQ2Zone ? "eliminated-q2" : "",
            ].filter(Boolean).join(" ");

            // Insert zone divider rows
            const showQ1Divider = i === 15;
            const showQ2Divider = i === 10;

            return (
              <React.Fragment key={q.id}>
                {showQ2Divider && (
                  <tr className="quali-zone-divider">
                    <td colSpan={5} title="Q2 Elimination Zone" />
                  </tr>
                )}
                {showQ1Divider && (
                  <tr className="quali-zone-divider">
                    <td colSpan={5} title="Q1 Elimination Zone" />
                  </tr>
                )}
                <tr className={rowClass}>
                  <td>
                    <div className={`quali-pos${i < 3 ? ` p${i + 1}` : ""}`}>
                      {q.position}
                    </div>
                  </td>
                  <td>
                    <div className="quali-driver">
                      <div className="quali-team-bar" style={{ background: q.teamColor, color: q.teamColor }} />
                      {q.headshot && (
                        <img
                          src={q.headshot}
                          alt={q.name}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 3,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{q.flag}</span>
                          <span className="quali-code">{q.id}</span>
                        </div>
                        <div className="quali-name">{q.name}</div>
                        <div className="quali-team">{q.team}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`quali-time${q.eliminated === "Q1" ? " eliminated" : ""}`}>
                      {q.q1 ?? <span className="quali-time no-time">—</span>}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {q.q2 ? (
                      <span className={`quali-time${q.eliminated === "Q2" ? " eliminated" : ""}`}>
                        {q.q2}
                      </span>
                    ) : (
                      <span className="quali-time no-time">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {q.q3 ? (
                      <span className={`quali-time${isPole ? " best" : ""}`}>
                        {q.q3}
                      </span>
                    ) : (
                      <span className="quali-time no-time">—</span>
                    )}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ── PRACTICE RESULTS COMPONENT ───────────────────────────────────────────────

interface PracticeResultsProps {
  sessions: PracticeSession[] | null;
  loading: boolean;
  error: string | null;
  raceName?: string;
}

const PracticeResults: FC<PracticeResultsProps> = ({ sessions, loading, error, raceName }) => {
  const [activeFP, setActiveFP] = useState(0);

  // Reset to first tab when sessions change
  useEffect(() => { setActiveFP(0); }, [sessions]);

  if (loading) {
    return (
      <div className="session-loading">
        <div className="spinner" />
        LOADING PRACTICE DATA…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !sessions || sessions.length === 0) {
    return (
      <div className="session-error">
        <div className="session-error-icon">⚠</div>
        {error ? `PRACTICE DATA UNAVAILABLE: ${error}` : "NO PRACTICE DATA AVAILABLE FOR THIS RACE"}
      </div>
    );
  }

  const activeSession = sessions[activeFP] ?? sessions[0];
  const entries = activeSession?.entries ?? [];

  return (
    <div className="practice-wrap">
      <div className="practice-header-bar">
        <div className="practice-title">
          {raceName ? `${raceName} — ` : ""}Practice Sessions
        </div>
        <div className="quali-badge live">OPENF1 API</div>
      </div>
      <div className="fp-tabs">
        {sessions.map((s, i) => (
          <button
            key={s.name}
            className={`fp-tab${i === activeFP ? " active" : ""}`}
            onClick={() => setActiveFP(i)}
          >
            ◆ {s.name}
          </button>
        ))}
      </div>
      <table className="practice-table">
        <thead>
          <tr>
            <th style={{ width: 50, textAlign: "center" }}>POS</th>
            <th>DRIVER</th>
            <th style={{ width: 130, textAlign: "center" }}>BEST LAP</th>
            <th style={{ width: 100, textAlign: "center" }}>GAP</th>
            <th style={{ width: 80, textAlign: "center" }}>S1</th>
            <th style={{ width: 80, textAlign: "center" }}>S2</th>
            <th style={{ width: 80, textAlign: "center" }}>S3</th>
            <th style={{ width: 50, textAlign: "center" }}>LAPS</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.id}>
              <td>
                <div className={`quali-pos${i < 3 ? ` p${i + 1}` : ""}`}>
                  {e.position}
                </div>
              </td>
              <td>
                <div className="quali-driver">
                  <div className="quali-team-bar" style={{ background: e.teamColor, color: e.teamColor }} />
                  {e.headshot && <img src={e.headshot} alt={e.name} style={{ width: 40, height: 40, borderRadius: 3, objectFit: "cover" }} />}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{e.flag}</span>
                      <span className="quali-code">{e.id}</span>
                    </div>
                    <div className="quali-name">{e.name}</div>
                    <div className="quali-team">{e.team}</div>
                  </div>
                </div>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className={`quali-time${i === 0 ? " best" : ""}`}>
                  {e.bestLapFormatted}
                </span>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className={`practice-gap${e.gap === "LEADER" ? " leader" : " gap"}`}>
                  {e.gap === "LEADER" ? "LEADER" : e.gap}
                </span>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className="practice-sector">
                  {e.sector1 != null ? e.sector1.toFixed(3) : "—"}
                </span>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className="practice-sector">
                  {e.sector2 != null ? e.sector2.toFixed(3) : "—"}
                </span>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className="practice-sector">
                  {e.sector3 != null ? e.sector3.toFixed(3) : "—"}
                </span>
              </td>
              <td className="practice-laps-count">{e.lapCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── POSITION CHART COMPONENT ─────────────────────────────────────────────────

interface PositionChartProps {
  lapData: LapSnapshot[];
  drivers: Driver[] | null;
  currentLapIndex: number;
}

const PositionChart: FC<PositionChartProps> = ({ lapData, drivers, currentLapIndex }) => {
  // Transform lapData into chart data format
  const chartData = lapData.slice(0, currentLapIndex + 1).map((snapshot) => {
    const dataPoint: Record<string, any> = {
      lap: snapshot.lap,
    };

    // Create position entry for each driver in the order
    snapshot.order.forEach((driverCode, index) => {
      const driver = drivers?.find(d => d.id === driverCode);
      const displayName = driver?.name.split(" ")[1] || driverCode; // Use last name
      dataPoint[driverCode] = index + 1; // Position (1-based)
    });

    return dataPoint;
  });

  // Generate colors for each driver (from drivers array)
  const getDriverColor = (driverCode: string): string => {
    const driver = drivers?.find(d => d.id === driverCode);
    return driver?.color || "#888";
  };

  // Get last known order to determine which drivers to show
  const lastSnapshot = lapData[Math.min(currentLapIndex, lapData.length - 1)];
  const activeDrivers = lastSnapshot?.order || [];

  return (
    <div style={{
      marginTop: 40,
      padding: "20px",
      backgroundColor: "rgba(0,0,0,0.3)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: "uppercase",
        marginBottom: 20,
        color: "var(--accent)",
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        Position Changes Over Race
      </div>

      <div style={{ width: "100%", height: 400, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="lap"
              stroke="rgba(255,255,255,0.6)"
              style={{ fontSize: 12 }}
            />
            <YAxis
              reversed={true}
              domain={[1, Math.max(20, activeDrivers.length)]}
              stroke="rgba(255,255,255,0.6)"
              style={{ fontSize: 12 }}
              label={{ value: "Position", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
              }}
              labelStyle={{ color: "#fff" }}
              formatter={(value) => {
                const pos = value as number;
                return [`P${pos}`, ""];
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="line"
            />

            {/* Render a line for each active driver */}
            {activeDrivers.slice(0, 10).map((driverCode) => {
              const driver = drivers?.find(d => d.id === driverCode);
              const displayName = driver?.name.split(" ")[1] || driverCode;
              return (
                <Line
                  key={driverCode}
                  type="monotone"
                  dataKey={driverCode}
                  stroke={getDriverColor(driverCode)}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={500}
                  name={displayName}
                  strokeWidth={2}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        marginTop: 15,
        fontSize: 11,
        color: "var(--muted)",
        fontStyle: "italic",
      }}>
        Showing top 10 drivers. Chart updates as race progresses.
      </div>
    </div>
  );
};

// ── RACE TRACKER PAGE ────────────────────────────────────────────────────────

const RaceTrackerPage: FC = () => {
  const [selectedYear, setSelectedYear] = useState(2025);
  const { races: yearRaces, loading: scheduleLoading } = useSchedule(selectedYear);
  const raceList = yearRaces ?? [];

  // For prior years, all races are "completed"; for current/future, filter
  const selectableRaces = selectedYear < SEASON
    ? raceList
    : raceList.filter(r => r.status === "completed" || r.status === "next");

  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  // Reset selection when year changes
  useEffect(() => {
    setSelectedRace(null);
  }, [selectedYear]);

  // Default selection when races load
  useEffect(() => {
    if (!selectedRace && selectableRaces.length > 0) {
      setSelectedRace(selectableRaces[0]);
    }
  }, [yearRaces]);

  const activeRace = selectedRace ?? selectableRaces[0] ?? raceList[0];

  // Fetch live race data from OpenF1 (falls back to simulation)
  const {
    lapData,
    drivers,
    loading: raceLoading,
    error: raceError,
    isLive: raceIsLive,
    dataSource: raceDataSource,
    sourceYear,
  } = useLiveRaceData(selectedYear, activeRace?.countryCode ?? "", activeRace?.city, activeRace?.round);
  const showingPriorYear = raceIsLive && sourceYear !== null && sourceYear !== selectedYear;

  // Qualifying data
  const {
    qualifying: qualifyingData,
    loading: qualiLoading,
    error: qualiError,
  } = useQualifyingData(selectedYear, activeRace?.round ?? 0, activeRace?.country);

  // Practice data
  const {
    sessions: practiceSessions,
    loading: practiceLoading,
    error: practiceError,
  } = usePracticeData(selectedYear, activeRace?.countryCode ?? "");

  const [lapIndex, setLapIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [section, setSection] = useState<RaceSection>("race");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveLapData = lapData ?? [];
  const totalLaps = Math.max(0, effectiveLapData.length - 1);

  // Reset playback when race changes
  useEffect(() => {
    setPlaying(false);
    setLapIndex(0);
  }, [activeRace?.round, selectedYear]);

  // Playback interval
  useEffect(() => {
    if (playing && totalLaps > 0) {
      intervalRef.current = setInterval(() => {
        setLapIndex(i => {
          if (i >= totalLaps) { setPlaying(false); return i; }
          return i + 1;
        });
      }, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, totalLaps]);

  const reset = useCallback(() => { setPlaying(false); setLapIndex(0); }, []);
  const togglePlay = useCallback(() => setPlaying(p => !p), []);
  const handleScrub = useCallback((lap: number) => { setPlaying(false); setLapIndex(lap); }, []);

  if (scheduleLoading) {
    return (
      <div className="page">
        <div className="page-title">Race Tracker</div>
        <div className="page-sub">LOADING {selectedYear} SCHEDULE…</div>
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  if (!activeRace) {
    return (
      <div className="page">
        <div className="page-title">Race Tracker</div>
        <div className="page-sub">NO RACE DATA AVAILABLE FOR {selectedYear}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">Race Tracker</div>
      <div className="page-sub">
        LAP-BY-LAP {raceIsLive ? "REPLAY" : "SIMULATION"}
        {showingPriorYear
          ? ` · SHOWING ${sourceYear} DATA`
          : ` · ${selectedYear} SEASON`}
        <DataBadge dataSource={raceDataSource} error={raceError} />
      </div>

      {/* Year selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, color: "var(--muted)", letterSpacing: 2,
          textTransform: "uppercase", marginBottom: 10,
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
        }}>
          SELECT SEASON
        </div>
        <div className="year-selector">
          {AVAILABLE_YEARS.map(yr => (
            <button
              key={yr}
              className={`year-btn${selectedYear === yr ? " active" : ""}`}
              onClick={() => setSelectedYear(yr)}
            >
              {yr}
              {yr === SEASON && (
                <span style={{
                  marginLeft: 6, fontSize: 8, color: "var(--accent)",
                  letterSpacing: 1, fontWeight: 700,
                }}>CURRENT</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Race weekend selector */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          fontSize: 11, color: "var(--muted)", letterSpacing: 2,
          textTransform: "uppercase", marginBottom: 10,
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
        }}>
          SELECT RACE WEEKEND · {selectedYear}
        </div>
        <div className="race-select-grid">
          {selectableRaces.map(r => (
            <button
              key={r.round}
              className={`race-select-btn${activeRace.round === r.round ? " active" : ""}`}
              onClick={() => setSelectedRace(r)}
            >
              {r.country} R{String(r.round).padStart(2, "0")} · {r.name}
              {r.status === "next" && (
                <span style={{
                  marginLeft: 8, color: "var(--accent)", fontSize: 9,
                  letterSpacing: 1, fontWeight: 700,
                }}>NEXT</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Session tabs */}
      <div className="section-tabs">
        <button className={`section-tab${section === "fri" ? " active" : ""}`}
          onClick={() => setSection("fri")}>◆ Friday Practice</button>
        <button className={`section-tab${section === "sat" ? " active" : ""}`}
          onClick={() => setSection("sat")}>◆ Saturday Qualifying</button>
        <button className={`section-tab${section === "race" ? " active" : ""}`}
          onClick={() => setSection("race")}>◆ Race Day</button>
      </div>

      {section === "race" ? (
        raceLoading ? (
          <div style={{
            textAlign: "center", padding: 60, color: "var(--muted)",
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16,
            letterSpacing: 1, textTransform: "uppercase",
          }}>
            <div style={{
              width: 24, height: 24, border: "2px solid var(--red)",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            LOADING RACE DATA…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div className="race-header">
              {activeRace.circuitId && getCircuitInfo(activeRace.circuitId, activeRace.circuit)?.bannerUrl && (
                <div 
                  className="race-header-banner"
                  style={{
                    backgroundImage: `url('${getCircuitInfo(activeRace.circuitId, activeRace.circuit)?.bannerUrl}')`,
                  }}
                />
              )}
              <div className="race-header-content">
                <div className="race-header-info">
                  <div className="race-header-name">
                    {activeRace.country} {activeRace.name}
                  </div>
                  <div className="race-header-circuit">
                    {activeRace.circuit} · {activeRace.city}
                    {raceIsLive && (
                      <span style={{
                        marginLeft: 10, color: "var(--green)", fontSize: 11,
                        fontWeight: 700, letterSpacing: 1,
                      }}>
                        ● REAL DATA{showingPriorYear ? ` (${sourceYear} SEASON)` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="controls">
                  <div className="lap-info">
                    LAP <span className="lap-number">{lapIndex}</span>/{totalLaps}
                  </div>
                  <button className="btn secondary" onClick={reset}>↺ RESET</button>
                  <button className="btn" onClick={togglePlay}>
                    {playing ? "⏸ PAUSE" : lapIndex === 0 ? "▶ PLAY" : "▶ RESUME"}
                  </button>
                  <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
                    className="speed-select">
                    {SPEED_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label} Speed</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Leaderboard
              lapData={effectiveLapData}
              lapIndex={lapIndex}
              totalLaps={totalLaps}
              drivers={drivers}
              onScrub={handleScrub}
            />

            <PositionChart
              lapData={effectiveLapData}
              drivers={drivers}
              currentLapIndex={lapIndex}
            />
          </>
        )
      ) : section === "sat" ? (
        <QualifyingResults
          qualifying={qualifyingData}
          loading={qualiLoading}
          error={qualiError}
          raceName={activeRace?.country}
        />
      ) : (
        <PracticeResults
          sessions={practiceSessions}
          loading={practiceLoading}
          error={practiceError}
          raceName={activeRace?.country}
        />
      )}
    </div>
  );
};

// ── TRACK DETAIL MODAL ───────────────────────────────────────────────────────

interface TrackModalProps {
  race: Race;
  onClose: () => void;
}

const TrackDetailModal: FC<TrackModalProps> = ({ race, onClose }) => {
  const info = getCircuitInfo(race.circuitId, race.circuit);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="track-modal-overlay" onClick={onClose}>
      <div className="track-modal" onClick={e => e.stopPropagation()}>
        <button className="track-modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="track-modal-header">
          <div className="track-modal-round">
            ROUND {String(race.round).padStart(2, "0")}
            {race.sprint && <span className="sprint-badge" style={{ marginLeft: 10 }}>SPRINT</span>}
          </div>
          <div className="track-modal-name">{race.country} {race.name}</div>
          <div className="track-modal-circuit">{race.circuit} · {race.city}</div>
        </div>

        {/* Track Image */}
        {info?.imageUrl ? (
          <div className="track-modal-image-wrap">
            <img
              src={info.imageUrl}
              alt={`${info.name} layout`}
              className="track-modal-image"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="track-modal-image-placeholder">
            <span>🏎️</span>
            <span>TRACK LAYOUT</span>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Image not available</span>
          </div>
        )}

        {info ? (
          <>
            {/* Stats Grid */}
            <div className="track-stats-grid">
              <div className="track-stat">
                <div className="track-stat-label">LENGTH</div>
                <div className="track-stat-value">{info.lengthKm} km</div>
              </div>
              <div className="track-stat">
                <div className="track-stat-label">TURNS</div>
                <div className="track-stat-value">{info.turns}</div>
              </div>
              <div className="track-stat">
                <div className="track-stat-label">FIRST GP</div>
                <div className="track-stat-value">{info.firstGP}</div>
              </div>
              <div className="track-stat">
                <div className="track-stat-label">LAP RECORD</div>
                <div className="track-stat-value" style={{ fontSize: 13 }}>{info.lapRecord}</div>
              </div>
            </div>

            {/* History */}
            <div className="track-section">
              <div className="track-section-title">CIRCUIT HISTORY</div>
              <p className="track-history-text">{info.history}</p>
            </div>

            {/* Notable Turns */}
            <div className="track-section">
              <div className="track-section-title">NOTABLE TURNS & DIFFICULT CORNERS</div>
              <div className="track-turns-list">
                {info.notableTurns.map((turn, i) => (
                  <div key={i} className="track-turn-card">
                    <div className="track-turn-header">
                      <span className="track-turn-number">T{turn.number}</span>
                      <span className="track-turn-name">{turn.name}</span>
                    </div>
                    <p className="track-turn-desc">{turn.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            padding: "40px 20px", textAlign: "center",
            color: "var(--muted)", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 14, letterSpacing: 1,
          }}>
            Detailed circuit information not available for this track.
          </div>
        )}

        {/* Race Dates */}
        <div className="track-section" style={{ borderBottom: "none" }}>
          <div className="track-section-title">RACE WEEKEND SCHEDULE</div>
          <div className="card-dates" style={{ maxWidth: 400 }}>
            <div className="card-date-block">
              <span className="date-label">FRIDAY</span>
              <span className="date-val">{race.dates.fri}</span>
            </div>
            <div className="card-date-block">
              <span className="date-label">SATURDAY</span>
              <span className="date-val">{race.dates.sat}</span>
            </div>
            <div className="card-date-block">
              <span className="date-label">RACE</span>
              <span className="date-val race">{race.dates.sun || race.dates.sat}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── CALENDAR PAGE ────────────────────────────────────────────────────────────

const CalendarPage: FC = () => {
  const { races, loading, error, isLive } = useSchedule(SEASON);
  const [filter, setFilter] = useState<"all" | "sprint">("all");
  const [modalRace, setModalRace] = useState<Race | null>(null);

  if (loading) {
    return (
      <div className="page">
        <div className="page-title">{SEASON} Season Calendar</div>
        <div className="page-sub">LOADING SCHEDULE…</div>
        <LoadingSkeleton count={8} />
      </div>
    );
  }

  const raceList = races ?? [];
  const filtered = filter === "sprint" ? raceList.filter(r => r.sprint) : raceList;
  const sprintCount = raceList.filter(r => r.sprint).length;

  return (
    <div className="page">
      <div className="page-title">{SEASON} Season Calendar</div>
      <div className="page-sub">
        {raceList.length} GRAND PRIX · {sprintCount} SPRINT WEEKENDS · NEW ERA REGULATIONS
        <DataBadge dataSource={isLive ? "jolpica" : "simulation"} error={error} />
      </div>

      <div className="section-tabs" style={{ marginBottom: 24 }}>
        <button className={`section-tab${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}>All Races</button>
        <button className={`section-tab${filter === "sprint" ? " active" : ""}`}
          onClick={() => setFilter("sprint")}>Sprint Weekends</button>
      </div>

      <div className="calendar-grid">
        {filtered.map(race => {
          const days = daysUntilRace(race.raceDate);
          const isToday = days === 0;

          return (
            <div key={race.round}
              className={`race-card${race.status === "completed" ? " completed" : ""}${race.status === "next" ? " next" : ""}`}
              onClick={() => setModalRace(race)}>
              <div className="card-round">
                <span>
                  ROUND {String(race.round).padStart(2, "0")}
                  {race.status === "completed" && " · ✓ COMPLETED"}
                  {race.status === "next" && " · NEXT RACE"}
                </span>
                {race.sprint && <span className="sprint-badge">SPRINT</span>}
              </div>
              <div className="card-name">{race.country} {race.name}</div>
              <div className="card-circuit">{race.circuit} · {race.city}</div>
              <div className="card-dates">
                <div className="card-date-block">
                  <span className="date-label">FRIDAY</span>
                  <span className="date-val">{race.dates.fri}</span>
                </div>
                <div className="card-date-block">
                  <span className="date-label">SATURDAY</span>
                  <span className="date-val">{race.dates.sat}</span>
                </div>
                <div className="card-date-block">
                  <span className="date-label">RACE</span>
                  <span className="date-val race">{race.dates.sun || race.dates.sat}</span>
                </div>
              </div>
              <div className="card-bottom">
                {race.status === "completed" && (
                  <span className="status-label completed">✓ RESULT</span>
                )}
                {race.status === "next" && (
                  <>
                    <span className="countdown">
                      {isToday ? "RACE DAY!" : `IN ${days} DAYS`}
                    </span>
                    <span className="status-label next">NEXT RACE</span>
                  </>
                )}
                {race.status === "upcoming" && (
                  <span className="countdown muted">
                    {days > 0 ? `IN ${days} DAYS` : "TBD"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Track Detail Modal */}
      {modalRace && (
        <TrackDetailModal race={modalRace} onClose={() => setModalRace(null)} />
      )}
    </div>
  );
};

// ── STANDINGS PAGE ───────────────────────────────────────────────────────────

const StandingsPage: FC = () => {
  const { standings, afterRound, loading, error, isLive } = useStandings(SEASON);

  if (loading) {
    return (
      <div className="page">
        <div className="page-title">Championship Standings</div>
        <div className="page-sub">LOADING STANDINGS…</div>
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  const standingsList = standings ?? [];
  const maxPts = standingsList[0]?.pts ?? 1;
  const roundLabel = afterRound > 0 ? `AFTER ROUND ${afterRound}` : "PRE-SEASON";

  return (
    <div className="page">
      <div className="page-title">Championship Standings</div>
      <div className="page-sub">
        {roundLabel}
        <DataBadge dataSource={isLive ? "jolpica" : "simulation"} error={error} />
      </div>

      <div className="standings-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>POS</th>
              <th>DRIVER</th>
              <th>TEAM</th>
              <th style={{ width: 80 }}>WINS</th>
              <th style={{ width: 220 }}>POINTS</th>
            </tr>
          </thead>
          <tbody>
            {standingsList.map((s, i) => {
              const barW = maxPts > 0 ? (s.pts / maxPts) * 160 : 0;
              const pos = s.position ?? i + 1;

              return (
                <tr key={s.id}>
                  <td>
                    <span className={`pos-num${pos === 1 ? " p1" : pos === 2 ? " p2" : pos === 3 ? " p3" : ""}`}
                      style={{ fontSize: 18 }}>
                      {String(pos).padStart(2, "0")}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 3, height: 30, borderRadius: 2,
                        background: s.teamColor, flexShrink: 0,
                        boxShadow: `0 0 6px ${s.teamColor}`,
                      }} />
                      <div>
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 800, fontSize: 16, letterSpacing: 0.5,
                        }}>
                          {s.id}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12, fontWeight: 500 }}>{s.team}</td>
                  <td style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 14,
                    color: s.wins > 0 ? "var(--gold)" : "var(--muted)",
                  }}>
                    {s.wins}
                  </td>
                  <td>
                    <div className="pts-bar-wrap">
                      <span className={`pts-num${s.pts === 0 ? " zero" : ""}`}>{s.pts}</span>
                      {s.pts > 0 && (
                        <div className="pts-bar" style={{ width: barW, background: s.teamColor }} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── REGULATIONS PAGE ─────────────────────────────────────────────────────────

const RegulationsPage: FC = () => {
  const [regulations, setRegulations] = React.useState<any>(null);
  const [selectedYear, setSelectedYear] = React.useState(2026);

  React.useEffect(() => {
    fetch("/src/data/regulations.json")
      .then(r => r.json())
      .then(data => setRegulations(data))
      .catch(() => console.warn("Regulations data not available"));
  }, []);

  const yearRegs = regulations?.regulations?.filter((r: any) => r.year === selectedYear) ?? [];

  return (
    <div className="page">
      <div className="page-title">Regulations & Rules</div>
      <div style={{ marginBottom: 24, display: "flex", gap: 12 }}>
        {[2024, 2025, 2026].map(y => (
          <button
            key={y}
            className={`race-select-btn${y === selectedYear ? " active" : ""}`}
            onClick={() => setSelectedYear(y)}
            style={{ cursor: "pointer" }}
          >
            {y}
          </button>
        ))}
      </div>

      {!yearRegs || yearRegs.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          No regulations data available
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          {yearRegs.map((cat: any, i: number) => (
            <div key={i} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "24px 20px",
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase" as const,
                color: "var(--text)",
                marginBottom: 16,
              }}>
                {cat.category}
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {cat.changes.map((change: any, j: number) => (
                  <div key={j} style={{
                    borderLeft: "3px solid var(--red)",
                    paddingLeft: 16,
                  }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--text)",
                      marginBottom: 6,
                    }}>
                      {change.title}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginBottom: 8,
                      lineHeight: 1.6,
                    }}>
                      {change.description}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "var(--text)",
                      background: "var(--surface2)",
                      padding: "8px 12px",
                      borderRadius: 3,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: 0.5,
                    }}>
                      <strong>IMPACT:</strong> {change.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── TEAMS PAGE ───────────────────────────────────────────────────────────────

const TeamsPage: FC = () => {
  const [teams, setTeams] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch("/src/data/teams.json")
      .then(r => r.json())
      .then(data => setTeams(data.teams))
      .catch(() => console.warn("Teams data not available"));
  }, []);

  return (
    <div className="page">
      <div className="page-title">Teams Overview</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginTop: 24 }}>
        {teams.map(team => (
          <div key={team.id} style={{
            background: "var(--surface)",
            border: `1px solid ${team.color}33`,
            borderRadius: 4,
            padding: 20,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${team.color}99`;
            e.currentTarget.style.boxShadow = `0 0 12px ${team.color}22`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${team.color}33`;
            e.currentTarget.style.boxShadow = "none";
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: team.color,
                boxShadow: `0 0 12px ${team.color}`,
              }} />
              <div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "var(--text)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase" as const,
                }}>
                  {team.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" as const }}>
                  {team.base}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              <div>👤 <strong>Principal:</strong> {team.principal}</div>
              <div>🏗️ <strong>Technical Director:</strong> {team.technicalDirector}</div>
              <div>🏁 <strong>Chassis:</strong> {team.chassisName}</div>
              <div>🏆 <strong>Championships:</strong> {team.championships}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              {team.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── DRIVERS PAGE ─────────────────────────────────────────────────────────────

const DriversPage: FC = () => {
  const [drivers, setDrivers] = React.useState<any[]>([]);
  const { races: yearRaces } = useSchedule(2026);

  React.useEffect(() => {
    fetch("/src/data/drivers-extra.json")
      .then(r => r.json())
      .then(data => setDrivers(data.drivers))
      .catch(() => console.warn("Drivers data not available"));
  }, []);

  return (
    <div className="page">
      <div className="page-title">Driver Profiles</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 24 }}>
        {drivers.map(driver => (
          <div key={driver.code} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            overflow: "hidden",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.borderColor = "var(--red)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}>
            <div style={{
              padding: 16,
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "var(--surface2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 900,
                }}>
                  {driver.code.charAt(0)}
                </div>
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "var(--text)",
                    letterSpacing: 0.5,
                  }}>
                    {driver.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, marginTop: 4 }}>
                    #{driver.number} · {driver.nationality}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" as const, fontWeight: 700 }}>Career Stats</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "var(--surface2)", padding: 10, borderRadius: 3, textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{driver.careerHighlights.worldChampionships}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>TITLES</div>
                  </div>
                  <div style={{ background: "var(--surface2)", padding: 10, borderRadius: 3, textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{driver.careerHighlights.raceWins}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>WINS</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div style={{ background: "var(--surface2)", padding: 10, borderRadius: 3, textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{driver.careerHighlights.polePositions}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>POLES</div>
                  </div>
                  <div style={{ background: "var(--surface2)", padding: 10, borderRadius: 3, textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{driver.careerHighlights.fastestLaps}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>FASTEST LAPS</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" as const, fontWeight: 700 }}>Specialties</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {driver.specialties.map((s: string) => (
                    <span key={s} style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      background: "var(--red-dim)",
                      border: "1px solid var(--red)",
                      color: "var(--red)",
                      borderRadius: 3,
                      fontWeight: 600,
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── CONSTRUCTOR STANDINGS PAGE ───────────────────────────────────────────────

const ConstructorStandingsPage: FC = () => {
  const { races: yearRaces } = useSchedule(2026);
  const [constructors, setConstructors] = React.useState<any[]>([]);

  React.useEffect(() => {
    // For now, display placeholder — would fetch from Jolpica standings + compute constructor points
    const mockConstructors = [
      { name: "Mercedes", points: 45, wins: 2, color: "#00d4be" },
      { name: "Red Bull Racing", points: 38, wins: 1, color: "#1e3050" },
      { name: "Ferrari", points: 32, wins: 0, color: "#dc0000" },
    ];
    setConstructors(mockConstructors);
  }, []);

  return (
    <div className="page">
      <div className="page-title">Constructor Championship</div>
      <div className="standings-wrap" style={{ marginTop: 24 }}>
        <table className="standings-table">
          <thead>
            <tr>
              <th style={{ width: 60, textAlign: "center" }}>POS</th>
              <th>TEAM</th>
              <th style={{ width: 100, textAlign: "right" }}>POINTS</th>
              <th style={{ width: 80, textAlign: "center" }}>WINS</th>
            </tr>
          </thead>
          <tbody>
            {constructors.map((c, i) => (
              <tr key={c.name}>
                <td style={{ textAlign: "center", fontWeight: 700, fontSize: 18 }}>{i + 1}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: c.color,
                      boxShadow: `0 0 8px ${c.color}`,
                    }} />
                    <span>{c.name}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: 16 }}>{c.points}</td>
                <td style={{ textAlign: "center" }}>{c.wins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── ROOT APP ─────────────────────────────────────────────────────────────────

const F1TrackApp: FC = () => {
  const [tab, setTab] = useState<PageTab>("calendar");

  return (
    <>
      <style>{STYLES}</style>
      <div className="f1-app">
        <nav className="nav">
          <div className="nav-logo">F1<span>TRACK</span></div>
          <div className="nav-tabs">
            <button className={`nav-tab${tab === "calendar" ? " active" : ""}`}
              onClick={() => setTab("calendar")}>CALENDAR</button>
            <button className={`nav-tab${tab === "race" ? " active" : ""}`}
              onClick={() => setTab("race")}>
              <span className="live-dot" />RACE TRACKER
            </button>
            <button className={`nav-tab${tab === "standings" ? " active" : ""}`}
              onClick={() => setTab("standings")}>STANDINGS</button>
            <button className={`nav-tab${tab === "constructor-standings" ? " active" : ""}`}
              onClick={() => setTab("constructor-standings")}>CONSTRUCTORS</button>
            <button className={`nav-tab${tab === "teams" ? " active" : ""}`}
              onClick={() => setTab("teams")}>TEAMS</button>
            <button className={`nav-tab${tab === "drivers" ? " active" : ""}`}
              onClick={() => setTab("drivers")}>DRIVERS</button>
            <button className={`nav-tab${tab === "regulations" ? " active" : ""}`}
              onClick={() => setTab("regulations")}>REGS</button>
          </div>
          <div className="nav-season">{SEASON}</div>
        </nav>

        {tab === "calendar" && <CalendarPage />}
        {tab === "race" && <RaceTrackerPage />}
        {tab === "standings" && <StandingsPage />}
        {tab === "constructor-standings" && <ConstructorStandingsPage />}
        {tab === "teams" && <TeamsPage />}
        {tab === "drivers" && <DriversPage />}
        {tab === "regulations" && <RegulationsPage />}
      </div>
    </>
  );
};

export default F1TrackApp;
