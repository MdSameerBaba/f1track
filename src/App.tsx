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
import { getRadioFromFirestore, saveRadioToFirestore } from "./api/firebase";
import * as IDBCache from "./api/cache";
import teamsData from "./data/teams.json";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const SEASON = 2026;

type PageTab = "calendar" | "race" | "standings" | "regulations" | "teams" | "drivers" | "constructor-standings" | "news";
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
  <>
    <style>{`
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      .skeleton-loader {
        animation: shimmer 2s infinite;
        background: linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%);
        background-size: 1000px 100%;
      }
    `}</style>
    <div className="calendar-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="race-card" style={{ opacity: 0.6 }}>
          <div className="skeleton-loader" style={{
            height: 12, width: "40%", borderRadius: 2, marginBottom: 12,
          }} />
          <div className="skeleton-loader" style={{
            height: 24, width: "70%", borderRadius: 2, marginBottom: 6,
          }} />
          <div className="skeleton-loader" style={{
            height: 14, width: "50%", borderRadius: 2, marginBottom: 16,
          }} />
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3].map(n => (
              <div key={n} className="skeleton-loader" style={{
                flex: 1, height: 44, borderRadius: 3,
              }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </>
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
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ─── PAGE ─── */
  .page {
    padding: 36px 32px;
    max-width: 1440px;
    margin: 0 auto;
    animation: fadeIn 0.4s ease-out;
  }
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
    .page { padding: 20px 16px; animation: fadeIn 0.4s ease-out; }
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

  /* ─── DRIVER RADIO DRAWER ─── */
  .drawer-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  .driver-drawer {
    position: fixed; right: 0; top: 0; bottom: 0; z-index: 501;
    width: 380px; max-width: 100vw;
    background: #0a0b12;
    border-left: 1px solid rgba(255,255,255,0.1);
    display: flex; flex-direction: column;
    animation: slideInRight 0.3s cubic-bezier(0.34,1.56,0.64,1);
    overflow: hidden;
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  .drawer-header {
    display: flex; align-items: center; gap: 14px;
    padding: 20px 20px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .drawer-team-bar {
    width: 4px; height: 48px; border-radius: 3px; flex-shrink: 0;
  }
  .drawer-driver-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px; font-weight: 900; color: #fff;
    letter-spacing: 1px; line-height: 1.1;
  }
  .drawer-driver-sub {
    font-size: 11px; color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    letter-spacing: 1.5px; text-transform: uppercase;
  }
  .drawer-close {
    margin-left: auto; background: none; border: none;
    color: var(--muted); font-size: 20px; cursor: pointer;
    padding: 8px; border-radius: 4px;
    transition: color 0.2s, background 0.2s;
  }
  .drawer-close:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .drawer-body {
    flex: 1; overflow-y: auto; padding: 20px;
    display: flex; flex-direction: column; gap: 18px;
  }
  .drawer-section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    color: var(--red); text-transform: uppercase; margin-bottom: 10px;
  }
  .telemetry-dials {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  }
  .telemetry-dial {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px; padding: 12px 10px;
    text-align: center;
  }
  .dial-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px; color: var(--muted);
    letter-spacing: 2px; text-transform: uppercase;
    margin-bottom: 4px;
  }
  .dial-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px; font-weight: 700; color: #fff;
  }
  .dial-unit {
    font-size: 9px; color: var(--muted); margin-top: 2px;
  }
  .radio-clip-list { display: flex; flex-direction: column; gap: 8px; }
  .radio-clip {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px; padding: 12px;
  }
  .radio-clip-meta {
    font-size: 10px; color: var(--muted);
    margin-bottom: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    letter-spacing: 1px;
  }
  .radio-clip audio {
    width: 100%; height: 32px;
    filter: invert(1) hue-rotate(180deg);
  }
  .tyre-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* ─── NEWS PAGE ─── */
  .news-page { padding: 32px 28px; }
  .news-ticker-bar {
    display: flex; align-items: center; overflow: hidden;
    background: rgba(225,6,0,0.08); border: 1px solid rgba(225,6,0,0.2);
    border-radius: 4px; padding: 0 16px;
    height: 36px; margin-bottom: 28px; gap: 14px;
  }
  .news-ticker-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 900; letter-spacing: 3px;
    color: var(--red); text-transform: uppercase; white-space: nowrap;
    border-right: 1px solid rgba(225,6,0,0.3); padding-right: 14px;
    flex-shrink: 0;
  }
  .news-ticker-scroll {
    flex: 1; overflow: hidden; white-space: nowrap;
  }
  .news-ticker-inner {
    display: inline-block;
    animation: ticker-scroll 30s linear infinite;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; color: rgba(255,255,255,0.7);
    letter-spacing: 0.5px;
  }
  @keyframes ticker-scroll {
    from { transform: translateX(100%); }
    to   { transform: translateX(-100%); }
  }
  .news-controls {
    display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; align-items: center;
  }
  .news-search {
    flex: 1; min-width: 200px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 10px 14px;
    color: var(--text); font-size: 14px; font-family: inherit;
    outline: none; transition: border-color 0.2s;
  }
  .news-search:focus { border-color: var(--red); }
  .news-search::placeholder { color: var(--muted); }
  .news-filter-btn {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 8px 14px;
    color: var(--muted); font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; cursor: pointer; transition: all 0.2s;
  }
  .news-filter-btn:hover, .news-filter-btn.active {
    background: rgba(225,6,0,0.1); border-color: var(--red); color: var(--text);
  }
  .news-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  .news-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px; overflow: hidden;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    cursor: pointer; position: relative;
  }
  .news-card:hover {
    transform: translateY(-4px);
    border-color: rgba(225,6,0,0.3);
    box-shadow: 0 12px 40px rgba(225,6,0,0.1);
  }
  .news-card-img {
    width: 100%; height: 180px; object-fit: cover;
    display: block; background: var(--surface2);
  }
  .news-card-img-placeholder {
    width: 100%; height: 180px;
    background: linear-gradient(135deg, var(--surface2) 0%, var(--surface3) 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 40px;
  }
  .news-card-body { padding: 16px; }
  .news-card-meta {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 8px;
  }
  .news-card-source {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--red);
  }
  .news-card-time {
    font-size: 10px; color: var(--muted);
    margin-left: auto;
  }
  .news-card-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 17px; font-weight: 700; color: var(--text);
    line-height: 1.3; margin-bottom: 8px;
    display: -webkit-box; -webkit-line-clamp: 3;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .news-card-desc {
    font-size: 12px; color: var(--muted);
    line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
    margin-bottom: 10px;
  }
  .news-card-footer {
    display: flex; align-items: center; gap: 8px;
    padding-top: 10px; border-top: 1px solid var(--border);
  }
  .news-card-read-time {
    font-size: 10px; color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    letter-spacing: 1px;
  }
  .news-card-link {
    margin-left: auto; font-size: 10px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--red);
    text-decoration: none;
  }
  .news-card-link:hover { text-decoration: underline; }
  .news-loading {
    text-align: center; padding: 80px 20px;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .news-empty {
    text-align: center; padding: 60px 20px;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; letter-spacing: 1.5px;
  }

  /* ─── CACHE STATUS CARD ─── */
  .cache-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 20px;
    margin-bottom: 20px;
  }
  .cache-card-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 2.5px;
    color: var(--red); text-transform: uppercase; margin-bottom: 14px;
  }
  .cache-stats {
    display: flex; gap: 20px; margin-bottom: 14px; flex-wrap: wrap;
  }
  .cache-stat-item {
    font-family: 'Barlow Condensed', sans-serif; font-size: 13px;
    color: var(--muted);
  }
  .cache-stat-item strong { color: var(--text); margin-right: 4px; }
  .cache-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .cache-btn {
    padding: 7px 14px; border-radius: 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; border: none; cursor: pointer;
    transition: all 0.2s;
  }
  .cache-btn-primary { background: rgba(0,230,118,0.12); color: #00e676; }
  .cache-btn-primary:hover { background: rgba(0,230,118,0.22); }
  .cache-btn-danger  { background: rgba(255,82,82,0.12); color: #ff5252; }
  .cache-btn-danger:hover  { background: rgba(255,82,82,0.22); }
  .cache-btn-firebase { background: rgba(255,160,0,0.12); color: #ffa000; }
  .cache-btn-firebase:hover { background: rgba(255,160,0,0.22); }
  .cache-progress-bar {
    height: 3px; border-radius: 2px;
    background: var(--surface3); overflow: hidden;
    margin-top: 10px;
  }
  .cache-progress-fill {
    height: 100%; background: var(--green);
    transition: width 0.4s ease;
  }
`;

// ── LEADERBOARD COMPONENT ────────────────────────────────────────────────────

interface LeaderboardProps {
  lapData: LapSnapshot[];
  lapIndex: number;
  totalLaps: number;
  drivers: Driver[];
  onScrub: (lap: number) => void;
  onDriverClick?: (driverCode: string) => void;
}

const Leaderboard: FC<LeaderboardProps> = ({ lapData, lapIndex, totalLaps, drivers, onScrub, onDriverClick }) => {
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
              style={{ top: idx * ROW_H, cursor: onDriverClick ? "pointer" : "default" }}
              onClick={() => onDriverClick?.(id)}
              title={onDriverClick ? `Click to view ${driver.name} telemetry` : undefined}
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

// ── LIVE FEED PANEL COMPONENT ────────────────────────────────────────────────

interface LiveFeedEvent {
  id: string;
  timestamp: number;
  type: "incident" | "pit-stop" | "safety-car" | "position-change" | "dnf";
  message: string;
  driver?: string;
}

interface LiveFeedPanelProps {
  lapData: LapSnapshot[] | null;
  drivers: Driver[] | null;
  currentLapIndex: number;
  totalLaps: number;
  raceIsLive: boolean;
}

const LiveFeedPanel: FC<LiveFeedPanelProps> = ({
  lapData, drivers, currentLapIndex, totalLaps, raceIsLive,
}) => {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastLapRef = useRef(0);

  // Auto-scroll to latest event
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Detect race events based on lap transitions
  useEffect(() => {
    if (!lapData || !drivers || lapData.length === 0) return;

    const lapIndex = Math.min(currentLapIndex, lapData.length - 1);
    if (lapIndex === lastLapRef.current) return;

    const currentLap = lapData[lapIndex];
    const prevLap = lastLapRef.current > 0 ? lapData[lastLapRef.current - 1] : null;
    lastLapRef.current = lapIndex;

    const newEvents: LiveFeedEvent[] = [];

    // Detect position changes
    if (prevLap) {
      prevLap.order.forEach((driverId, prevPos) => {
        const newPos = currentLap.order.indexOf(driverId);
        if (newPos !== prevPos && newPos !== -1) {
          const driver = drivers.find(d => d.id === driverId);
          const posChange = prevPos - newPos;
          if (posChange > 0) {
            newEvents.push({
              id: `pos-${driverId}-${lapIndex}`,
              timestamp: Date.now(),
              type: "position-change",
              message: `${driver?.name || driverId} gained a position!`,
              driver: driverId,
            });
          } else if (posChange < -1) {
            newEvents.push({
              id: `pos-drop-${driverId}-${lapIndex}`,
              timestamp: Date.now(),
              type: "incident",
              message: `${driver?.name || driverId} lost position`,
              driver: driverId,
            });
          }
        }
      });
    }

    // Simulate safety car or random race events (in real scenario, from API)
    if (lapIndex > 0 && lapIndex % 15 === 0 && Math.random() < 0.1) {
      newEvents.push({
        id: `sc-${lapIndex}`,
        timestamp: Date.now(),
        type: "safety-car",
        message: "Safety Car deployed on circuit",
      });
    }

    // Add simulated pit stop events
    if (lapIndex > 5 && lapIndex % 20 === 15 && Math.random() < 0.15) {
      const randomDriver = drivers[Math.floor(Math.random() * Math.min(drivers.length, 10))];
      newEvents.push({
        id: `pit-${randomDriver?.id}-${lapIndex}`,
        timestamp: Date.now(),
        type: "pit-stop",
        message: `${randomDriver?.name || "Driver"} came into the pits`,
        driver: randomDriver?.id,
      });
    }

    // Add generated events to feed
    if (newEvents.length > 0) {
      setEvents(prev => [...prev, ...newEvents].slice(-15)); // Keep last 15 events
    }
  }, [lapData, drivers, currentLapIndex]);

  if (!raceIsLive) {
    return (
      <div style={{
        marginTop: 40,
        padding: "20px",
        backgroundColor: "rgba(0,0,0,0.3)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)",
        color: "var(--muted)",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 10,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          Race Live Feed
        </div>
        <div style={{ fontSize: 12 }}>Live feed appears during active race days</div>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 40,
      padding: "20px",
      backgroundColor: "rgba(0,0,0,0.3)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--accent)",
          fontFamily: "'Barlow Condensed', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ animation: "pulse 1.5s infinite", display: "inline-block" }}>●</span>
          Race Live Feed
        </div>
        <label style={{ fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          Auto-scroll
        </label>
      </div>

      <div
        ref={feedRef}
        style={{
          height: "200px",
          overflowY: "auto",
          borderRadius: 4,
          backgroundColor: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "12px",
        }}
      >
        {events.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", paddingTop: "60px" }}>
            Waiting for race events…
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              style={{
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontSize: 12,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <div style={{
                minWidth: "60px",
                color: event.type === "position-change" ? "var(--green)" : 
                       event.type === "safety-car" ? "var(--yellow)" :
                       event.type === "pit-stop" ? "var(--blue)" :
                       event.type === "dnf" ? "var(--red)" : "var(--muted)",
                fontWeight: 700,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}>
                {event.type === "position-change" && "POS↑"}
                {event.type === "incident" && "INC"}
                {event.type === "safety-car" && "SC"}
                {event.type === "pit-stop" && "PIT"}
                {event.type === "dnf" && "DNF"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)" }}>
                {event.message}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        marginTop: 12,
        fontSize: 10,
        color: "var(--muted)",
        fontStyle: "italic",
      }}>
        Updates every 15 seconds during live race. {events.length} event{events.length !== 1 ? "s" : ""} recorded.
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};

// ── CIRCUIT MAP COMPONENT ────────────────────────────────────────────────────

// A realistic F1-style SVG circuit path (normalized 0-1 coordinates on 600x400 canvas)
// Points define a complex winding circuit resembling a modern F1 track
const CIRCUIT_PATH_POINTS: [number, number][] = [
  [0.82, 0.50], [0.88, 0.45], [0.93, 0.38], [0.92, 0.28], [0.86, 0.22],
  [0.78, 0.18], [0.68, 0.17], [0.58, 0.20], [0.50, 0.26], [0.43, 0.24],
  [0.37, 0.18], [0.28, 0.16], [0.20, 0.20], [0.14, 0.28], [0.11, 0.38],
  [0.13, 0.48], [0.18, 0.56], [0.16, 0.65], [0.20, 0.73], [0.28, 0.78],
  [0.38, 0.80], [0.46, 0.76], [0.50, 0.68], [0.55, 0.73], [0.62, 0.80],
  [0.70, 0.82], [0.78, 0.78], [0.84, 0.70], [0.86, 0.61], [0.82, 0.50],
];

const W = 600, H = 380;
const TRACK_PTS = CIRCUIT_PATH_POINTS.map(([x, y]) => [x * W, y * H] as [number, number]);

// Build cumulative arc-length table for path parameterization
function buildArcTable(pts: [number, number][]): number[] {
  const table = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    table.push(table[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return table;
}

const ARC_TABLE = buildArcTable(TRACK_PTS);
const TOTAL_LENGTH = ARC_TABLE[ARC_TABLE.length - 1];

// Get XY position at t ∈ [0,1] along the track
function getTrackPoint(t: number): [number, number] {
  const target = ((t % 1) + 1) % 1 * TOTAL_LENGTH;
  let lo = 0, hi = ARC_TABLE.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ARC_TABLE[mid + 1] < target) lo = mid + 1;
    else hi = mid;
  }
  const seg = lo;
  const segLen = ARC_TABLE[seg + 1] - ARC_TABLE[seg];
  const alpha = segLen > 0 ? (target - ARC_TABLE[seg]) / segLen : 0;
  const p0 = TRACK_PTS[seg];
  const p1 = TRACK_PTS[(seg + 1) % TRACK_PTS.length];
  return [p0[0] + alpha * (p1[0] - p0[0]), p0[1] + alpha * (p1[1] - p0[1])];
}

// Compute local curvature at t → speed multiplier (slow in corners, fast on straights)
function getSpeedMultiplier(t: number): number {
  const dt = 0.015;
  const [x0, y0] = getTrackPoint(t - dt);
  const [x1, y1] = getTrackPoint(t);
  const [x2, y2] = getTrackPoint(t + dt);
  const dx1 = x1 - x0, dy1 = y1 - y0;
  const dx2 = x2 - x1, dy2 = y2 - y1;
  const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
  const len = Math.sqrt(dx1 * dx1 + dy1 * dy1) * Math.sqrt(dx2 * dx2 + dy2 * dy2) + 0.0001;
  const curvature = cross / (len * len);
  // High curvature → slow (0.3x), low curvature → fast (1.0x)
  return Math.max(0.3, 1 - curvature * 120);
}

interface CircuitMapProps {
  lapData: LapSnapshot[];
  drivers: Driver[] | null;
  currentLapIndex: number;
  circuitName: string;
  onDriverClick?: (driverCode: string) => void;
}

const CircuitMap: FC<CircuitMapProps> = ({ lapData, drivers, currentLapIndex, circuitName, onDriverClick }) => {
  const [hoveredDriver, setHoveredDriver] = useState<string | null>(null);

  // Each driver's current track position 0→1 (always moves forward)
  const positionsRef = useRef<Record<string, number>>({});
  const animFrameRef = useRef<number>(0);
  const lastTimeRef  = useRef<number>(0);
  // Target positions computed from lap data (leader at front, others behind)
  const targetPosRef = useRef<Record<string, number>>({});
  const [, forceRender] = useState(0);

  const snap = lapData[Math.min(currentLapIndex, lapData.length - 1)];

  // Recompute target positions when lap changes
  useEffect(() => {
    if (!snap) return;
    const n = snap.order.length;
    // Leader is at position 0.98 (just before S/F line), rest spread back in order
    // Spacing: roughly 1/n of the track between each driver
    const spacing = 0.82 / n;
    snap.order.forEach((code, rankIdx) => {
      // rankIdx 0 = leader (furthest ahead), higher = further back
      const target = ((0.98 - rankIdx * spacing) + 1) % 1;
      targetPosRef.current[code] = target;
      // Init on first load
      if (positionsRef.current[code] === undefined) {
        positionsRef.current[code] = target;
      }
    });
  }, [snap?.lap, currentLapIndex]);

  // Animation loop — lerp toward target, ALWAYS forward
  useEffect(() => {
    if (!snap) return;

    function animate(now: number) {
      const dt = Math.min((now - (lastTimeRef.current || now)) / 1000, 0.05);
      lastTimeRef.current = now;

      let dirty = false;
      snap.order.forEach((code) => {
        const cur = positionsRef.current[code] ?? 0;
        const tgt = targetPosRef.current[code] ?? cur;

        // Always approach target going FORWARD (increasing t, wrapping at 1→0)
        let diff = tgt - cur;
        // If negative, it means we need to go forward past the finish line
        if (diff < -0.3) diff += 1;
        // Only ever move forward (positive diff)
        if (diff < 0) diff = 0;

        const curveFactor = getSpeedMultiplier(cur);
        const step = Math.min(diff, dt * curveFactor * 1.2);
        const next = (cur + step) % 1;
        if (Math.abs(next - cur) > 0.00001) {
          positionsRef.current[code] = next;
          dirty = true;
        }
      });

      if (dirty) forceRender(t => t + 1);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [snap]);

  if (!snap) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>Loading circuit data…</div>;
  }


  // SVG path string from points
  const pathD = TRACK_PTS.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";

  // Sector colouring — split path into 3 roughly equal sectors
  const s1pts = TRACK_PTS.slice(0, 10);
  const s2pts = TRACK_PTS.slice(9, 20);
  const s3pts = TRACK_PTS.slice(19);
  const sectorPath = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

  return (
    <div style={{
      marginTop: 32,
      background: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 13, fontWeight: 800, letterSpacing: 3,
          textTransform: "uppercase", color: "var(--accent)",
        }}>
          🏎 {circuitName}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1.5 }}>
          LAP {snap.lap} · {snap.order.length} CARS
        </div>
        {snap.safetycar && (
          <div style={{
            background: "rgba(255,214,0,0.15)", border: "1px solid rgba(255,214,0,0.4)",
            color: "#ffd700", padding: "3px 10px", borderRadius: 3,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2,
          }}>🟡 SC</div>
        )}
      </div>

      {/* SVG Map */}
      <div style={{ position: "relative", padding: "12px 12px 8px" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
          {/* Outer glow track base */}
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round" />
          {/* Track tarmac */}
          <path d={pathD} fill="none" stroke="#1a1c28" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" />
          {/* Sector 1 — purple */}
          <path d={sectorPath(s1pts)} fill="none" stroke="rgba(168,85,247,0.55)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Sector 2 — green */}
          <path d={sectorPath(s2pts)} fill="none" stroke="rgba(0,230,118,0.55)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Sector 3 — amber */}
          <path d={sectorPath(s3pts)} fill="none" stroke="rgba(255,160,0,0.55)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {/* White centreline dashes */}
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="8 10" />

          {/* Start/Finish line */}
          {(() => {
            const [sx, sy] = TRACK_PTS[0];
            const [nx, ny] = TRACK_PTS[1];
            const ang = Math.atan2(ny - sy, nx - sx) + Math.PI / 2;
            return (
              <line
                x1={sx + Math.cos(ang) * 12} y1={sy + Math.sin(ang) * 12}
                x2={sx - Math.cos(ang) * 12} y2={sy - Math.sin(ang) * 12}
                stroke="#fff" strokeWidth="3" strokeLinecap="round"
              />
            );
          })()}
          <text x={TRACK_PTS[0][0] + 8} y={TRACK_PTS[0][1] - 10}
            fill="#00e676" fontSize="10" fontWeight="800"
            fontFamily="'Barlow Condensed', sans-serif" letterSpacing="1">
            S/F
          </text>

          {/* Driver dots */}
          {snap.order.map((code, rankIdx) => {
            const driver = drivers?.find(d => d.id === code);
            const t = positionsRef.current[code] ?? (rankIdx / snap.order.length);
            const [x, y] = getTrackPoint(t);
            const isHovered = hoveredDriver === code;
            const isDNF = false;
            const pos = rankIdx + 1; // P1 leader at top

            return (
              <g
                key={code}
                style={{ cursor: onDriverClick ? "pointer" : "default" }}
                onMouseEnter={() => setHoveredDriver(code)}
                onMouseLeave={() => setHoveredDriver(null)}
                onClick={() => onDriverClick?.(code)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle cx={x} cy={y} r={14}
                    fill="none" stroke={driver?.color || "#888"}
                    strokeWidth="1.5" opacity="0.5"
                    style={{ filter: `drop-shadow(0 0 6px ${driver?.color || "#fff"})` }}
                  />
                )}
                {/* Driver dot */}
                <circle
                  cx={x} cy={y}
                  r={isDNF ? 5 : isHovered ? 9 : 7}
                  fill={isDNF ? "#ff5252" : (driver?.color || "#888")}
                  opacity={isDNF ? 0.5 : 1}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${driver?.color || "#fff"})` : undefined,
                    transition: "r 0.15s ease",
                  }}
                />
                {/* Driver code chip */}
                <rect
                  x={x - 12} y={y - 20}
                  width="24" height="14"
                  fill={driver?.color || "#888"}
                  opacity={isHovered ? 1 : 0.9}
                  rx="2"
                />
                <text
                  x={x} y={y - 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="8" fontWeight="900"
                  fontFamily="'Barlow Condensed', sans-serif"
                  letterSpacing="0.5"
                  style={{ pointerEvents: "none" }}
                >
                  {code}
                </text>
                {/* Position number below */}
                <text
                  x={x} y={y + 16}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="700"
                  fontFamily="'Barlow Condensed', sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  P{pos}
                </text>
                {/* Full name tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect x={x - 44} y={y + 24} width="88" height="20" rx="3"
                      fill="rgba(0,0,0,0.92)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <text x={x} y={y + 34} textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize="10" fontWeight="700"
                      fontFamily="'Barlow Condensed', sans-serif">
                      {driver?.name.split(" ").slice(-1)[0] || code} · {driver?.team?.split(" ")[0]}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Sector legend */}
        <div style={{
          display: "flex", gap: 16, padding: "6px 8px 4px",
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          {[
            { label: "Sector 1", color: "rgba(168,85,247,0.8)" },
            { label: "Sector 2", color: "rgba(0,230,118,0.8)" },
            { label: "Sector 3", color: "rgba(255,160,0,0.8)" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 3, borderRadius: 2, background: s.color }} />
              <span style={{ color: "var(--muted)" }}>{s.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", color: "var(--muted)" }}>
            {onDriverClick ? "Click driver to open cockpit" : "Hover for details"}
          </div>
        </div>
      </div>
    </div>
  );
};




// ── DRIVER COCKPIT DRAWER ────────────────────────────────────────────────────

interface DriverDrawerProps {
  driver: Driver | null;
  sessionKey: number | null;
  onClose: () => void;
}

const TYRE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SOFT:        { label: "SOFT",        color: "#e10600", bg: "rgba(225,6,0,0.15)"        },
  MEDIUM:      { label: "MEDIUM",      color: "#ffd700", bg: "rgba(255,215,0,0.12)"      },
  HARD:        { label: "HARD",        color: "#e8e8f0", bg: "rgba(232,232,240,0.1)"     },
  INTERMEDIATE:{ label: "INTER",       color: "#00c853", bg: "rgba(0,200,83,0.12)"       },
  WET:         { label: "WET",         color: "#2979ff", bg: "rgba(41,121,255,0.15)"     },
};

const DriverDrawer: FC<DriverDrawerProps> = ({ driver, sessionKey, onClose }) => {
  const [radioClips, setRadioClips] = useState<Array<{ date: string; recording_url: string }>>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioStatus, setRadioStatus] = useState<"idle" | "firestore-hit" | "api-fetched" | "none">("idle");

  // Simulated telemetry — in a live race these would be polled from OpenF1 /car_data
  const speed   = Math.floor(Math.random() * 80 + 240);
  const rpm     = Math.floor(Math.random() * 3000 + 9000);
  const gear    = Math.floor(Math.random() * 5 + 3);
  const throttle= Math.floor(Math.random() * 40 + 60);
  const brake   = throttle > 90 ? 0 : Math.floor(Math.random() * 20);
  const drs     = Math.random() > 0.5;

  const tyres = ["SOFT", "MEDIUM", "HARD"];
  const currentTyre = tyres[Math.floor(Math.random() * tyres.length)];
  const tyreAge = Math.floor(Math.random() * 20 + 1);
  const tyreCfg = TYRE_CONFIG[currentTyre];

  useEffect(() => {
    if (!driver || !sessionKey) return;
    setRadioLoading(true);
    setRadioClips([]);
    setRadioStatus("idle");

    (async () => {
      const driverNumber = driver.number;
      console.log(`[Radio] Checking Firestore for session=${sessionKey} driver=${driverNumber}`);

      // 1. Try Firestore first
      const cached = await getRadioFromFirestore(sessionKey, driverNumber);
      if (cached && cached.length > 0) {
        console.log(`[Radio] Firestore HIT — ${cached.length} clips`);
        setRadioClips(cached);
        setRadioStatus("firestore-hit");
        setRadioLoading(false);
        return;
      }

      // 2. Fall back to OpenF1 API — use the /api/openf1 proxy to avoid CORS
      console.log(`[Radio] Firestore MISS — fetching from OpenF1 via proxy...`);
      try {
        // Use the Vite dev proxy: /api/openf1 → https://api.openf1.org/v1
        const url = `/api/openf1/team_radio?session_key=${sessionKey}&driver_number=${driverNumber}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const clips = (data as any[]).map((c: any) => {
          // recording_url comes from livetiming.formula1.com — rewrite via /api/f1audio proxy
          let audioUrl = c.recording_url ?? "";
          if (audioUrl.includes("livetiming.formula1.com")) {
            // e.g. https://livetiming.formula1.com/static/2024/2024-03-02_Bahrain/...
            // → /api/f1audio/static/2024/...
            audioUrl = audioUrl.replace("https://livetiming.formula1.com", "/api/f1audio");
          }
          return {
            date: c.date,
            recording_url: audioUrl,
          };
        });
        console.log(`[Radio] OpenF1 returned ${clips.length} clips`);
        setRadioClips(clips);
        setRadioStatus(clips.length > 0 ? "api-fetched" : "none");

        // 3. Cache to Firestore (store original URLs so they're rewritten on next load too)
        if (clips.length > 0) {
          console.log("[Radio] Saving to Firestore...");
          await saveRadioToFirestore(sessionKey, driverNumber, clips);
          console.log("[Radio] Saved to Firestore ✓");
        }
      } catch (err) {
        console.error("[Radio] Fetch error:", err);
        setRadioStatus("none");
      } finally {
        setRadioLoading(false);
      }
    })();
  }, [driver?.number, sessionKey]);

  if (!driver) return null;

  const formatDate = (d: string) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return d; }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="driver-drawer">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-team-bar" style={{ background: driver.color }} />
          <div>
            <div className="drawer-driver-name">{driver.name}</div>
            <div className="drawer-driver-sub">{driver.team} · #{driver.number}</div>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {/* TELEMETRY DIALS */}
          <div>
            <div className="drawer-section-title">Live Telemetry</div>
            <div className="telemetry-dials">
              <div className="telemetry-dial">
                <div className="dial-label">Speed</div>
                <div className="dial-value" style={{ color: "#00e676" }}>{speed}</div>
                <div className="dial-unit">km/h</div>
              </div>
              <div className="telemetry-dial">
                <div className="dial-label">RPM</div>
                <div className="dial-value" style={{ color: "#ffd700" }}>{rpm.toLocaleString()}</div>
                <div className="dial-unit">rpm</div>
              </div>
              <div className="telemetry-dial">
                <div className="dial-label">Gear</div>
                <div className="dial-value">{gear}</div>
                <div className="dial-unit">{drs ? "🟢 DRS" : "DRS OFF"}</div>
              </div>
            </div>

            {/* Throttle / Brake bars */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
                  <span>THROTTLE</span><span>{throttle}%</span>
                </div>
                <div style={{ height: 6, background: "var(--surface3)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${throttle}%`, background: "#00e676", borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
                  <span>BRAKE</span><span>{brake}%</span>
                </div>
                <div style={{ height: 6, background: "var(--surface3)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${brake}%`, background: "#ff5252", borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* TYRE STRATEGY */}
          <div>
            <div className="drawer-section-title">Tyre Strategy</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                className="tyre-badge"
                style={{ background: tyreCfg.bg, color: tyreCfg.color, border: `1px solid ${tyreCfg.color}40` }}
              >
                ● {tyreCfg.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Lap age: <strong style={{ color: "var(--text)" }}>{tyreAge}</strong></span>
            </div>
          </div>

          {/* TEAM RADIO */}
          <div>
            <div className="drawer-section-title">
              Team Radio
              {radioStatus === "firestore-hit" && (
                <span style={{ marginLeft: 8, color: "#ffa000", fontSize: 9 }}>☁ CACHED</span>
              )}
              {radioStatus === "api-fetched" && (
                <span style={{ marginLeft: 8, color: "#00e676", fontSize: 9 }}>● LIVE</span>
              )}
            </div>
            {radioLoading && (
              <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0" }}>
                Fetching radio transmissions…
              </div>
            )}
            {!radioLoading && radioClips.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0" }}>
                {radioStatus === "none" ? "No radio clips found for this session." : "Loading..."}
              </div>
            )}
            {!radioLoading && radioClips.length > 0 && (
              <div className="radio-clip-list">
                {radioClips.slice(-6).reverse().map((clip, i) => (
                  <div key={i} className="radio-clip">
                    <div className="radio-clip-meta">
                      🎙 {formatDate(clip.date)}
                    </div>
                    <audio controls src={clip.recording_url} preload="none" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── NEWS PAGE ─────────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  enclosure?: { link: string };
  author?: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function readingTime(text: string): string {
  const words = text?.split(" ").length ?? 0;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

const RSS_SOURCES = [
  { key: "f1", label: "F1 Official", url: "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.formula1.com%2Fen%2Flatest%2Fall.xml&api_key=free&count=20" },
  { key: "reddit", label: "r/formula1", url: "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.reddit.com%2Fr%2Fformula1%2F.rss&api_key=free&count=20" },
];

const NewsPage: FC = () => {
  const [articles, setArticles]       = useState<NewsItem[]>([]);
  const [loading,  setLoading]        = useState(true);
  const [search,   setSearch]         = useState("");
  const [source,   setSource]         = useState<"f1" | "reddit" | "all">("all");

  useEffect(() => {
    setLoading(true);
    const fetches = RSS_SOURCES.map(s =>
      fetch(s.url)
        .then(r => r.json())
        .then((d: any) => (d.items || []).map((item: any) => ({
          ...item,
          _source: s.key,
          _sourceLabel: s.label,
        })))
        .catch(() => [])
    );
    Promise.all(fetches).then(results => {
      const allItems = results.flat().sort(
        (a: any, b: any) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      setArticles(allItems as any);
      setLoading(false);
    });
  }, []);

  const filtered = articles.filter(a => {
    const srcMatch = source === "all" || (a as any)._source === source;
    const q = search.toLowerCase();
    const textMatch = !q ||
      a.title?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q);
    return srcMatch && textMatch;
  });

  const tickerText = articles.slice(0, 8).map(a => a.title).join("   ·   ");

  return (
    <div className="news-page">
      {/* Breaking ticker */}
      <div className="news-ticker-bar">
        <div className="news-ticker-label">⚑ BREAKING</div>
        <div className="news-ticker-scroll">
          <span className="news-ticker-inner">
            {tickerText || "Loading latest F1 news…"}
          </span>
        </div>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 36, fontWeight: 900, color: "var(--text)",
          letterSpacing: 2, textTransform: "uppercase",
        }}>
          F1 NEWS <span style={{ color: "var(--red)" }}>FEED</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          Live aggregated news from official F1 channels and the community
        </div>
      </div>

      {/* Controls */}
      <div className="news-controls">
        <input
          className="news-search"
          placeholder="Search headlines, drivers, teams…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {["all", "f1", "reddit"].map(s => (
          <button
            key={s}
            className={`news-filter-btn${source === s ? " active" : ""}`}
            onClick={() => setSource(s as any)}
          >
            {s === "all" ? "All Sources" : s === "f1" ? "F1 Official" : "Reddit"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="news-loading">
          <div style={{ fontSize: 28, marginBottom: 12 }}>🏎️</div>
          Fetching latest paddock news…
        </div>
      ) : filtered.length === 0 ? (
        <div className="news-empty">
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
          No articles match your search.
        </div>
      ) : (
        <div className="news-grid">
          {filtered.map((article, i) => {
            const imgUrl = (article as any).enclosure?.link || (article as any).thumbnail;
            const hasImg = imgUrl && imgUrl.startsWith("http");
            return (
              <a
                key={i}
                className="news-card"
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                {hasImg ? (
                  <img
                    className="news-card-img"
                    src={imgUrl}
                    alt={article.title}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="news-card-img-placeholder">🏁</div>
                )}
                <div className="news-card-body">
                  <div className="news-card-meta">
                    <span className="news-card-source">{(article as any)._sourceLabel}</span>
                    <span className="news-card-time">{timeAgo(article.pubDate)}</span>
                  </div>
                  <div className="news-card-title">{article.title}</div>
                  <div className="news-card-desc">
                    {article.description?.replace(/<[^>]+>/g, "")}
                  </div>
                  <div className="news-card-footer">
                    <span className="news-card-read-time">
                      📖 {readingTime(article.description || "")}
                    </span>
                    <span className="news-card-link">Read More →</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
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
  const [drawerDriver, setDrawerDriver] = useState<Driver | null>(null);
  // sessionKey is the OpenF1 session key; for now we approximate from the race
  const sessionKey: number | null = null; // Will be populated by the live data hook when available
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

            {/* ── 3-COLUMN BROADCAST LAYOUT ─────────────────────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "320px 1fr 300px",
              gridTemplateRows: "auto",
              gap: 14,
              marginTop: 16,
              alignItems: "start",
            }}>
              {/* LEFT — Position Chart + Live Feed stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <PositionChart
                  lapData={effectiveLapData}
                  drivers={drivers}
                  currentLapIndex={lapIndex}
                />
                <LiveFeedPanel
                  lapData={effectiveLapData}
                  drivers={drivers}
                  currentLapIndex={lapIndex}
                  totalLaps={totalLaps}
                  raceIsLive={raceIsLive}
                />
              </div>

              {/* CENTER — Circuit Map hero */}
              <div>
                <CircuitMap
                  lapData={effectiveLapData}
                  drivers={drivers}
                  currentLapIndex={lapIndex}
                  circuitName={activeRace.circuit}
                  onDriverClick={(driverCode) => {
                    const d = drivers?.find(dr => dr.id === driverCode) ?? null;
                    setDrawerDriver(d);
                  }}
                />
              </div>

              {/* RIGHT — Leaderboard */}
              <div style={{ position: "sticky", top: 80 }}>
                <Leaderboard
                  lapData={effectiveLapData}
                  lapIndex={lapIndex}
                  totalLaps={totalLaps}
                  drivers={drivers}
                  onScrub={handleScrub}
                  onDriverClick={(driverCode) => {
                    const d = drivers?.find(dr => dr.id === driverCode) ?? null;
                    setDrawerDriver(d);
                  }}
                />
              </div>
            </div>
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
      {/* Driver Cockpit Drawer */}
      {drawerDriver && (
        <DriverDrawer
          driver={drawerDriver}
          sessionKey={sessionKey}
          onClose={() => setDrawerDriver(null)}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginTop: 24 }}>
        {teams.map(team => (
          <div key={team.id} style={{
            background: "var(--surface)",
            border: `1px solid ${team.color}33`,
            borderRadius: 4,
            padding: 0,
            cursor: "pointer",
            transition: "all 0.2s",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${team.color}99`;
            e.currentTarget.style.boxShadow = `0 0 12px ${team.color}22`;
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${team.color}33`;
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)";
          }}>
            {/* Team Logo Header */}
            <div style={{
              background: `linear-gradient(135deg, ${team.color}15 0%, ${team.color}05 100%)`,
              padding: 16,
              borderBottom: `1px solid ${team.color}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 100,
            }}>
              {team.logo ? (
                <img 
                  src={team.logo} 
                  alt={team.name}
                  style={{ 
                    maxHeight: 80, 
                    maxWidth: "90%", 
                    objectFit: "contain",
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                  }} 
                />
              ) : (
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: team.color,
                  boxShadow: `0 0 12px ${team.color}`,
                }} />
              )}
            </div>
            
            {/* Content Area */}
            <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: "var(--text)",
                letterSpacing: 0.5,
                textTransform: "uppercase" as const,
                marginBottom: 8,
              }}>
                {team.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 12 }}>
                {team.base}
              </div>
              
              <div style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                <div>👤 <strong>Principal:</strong> {team.principal}</div>
                <div>🏗️ <strong>Technical Director:</strong> {team.technicalDirector}</div>
                <div>🏁 <strong>Chassis:</strong> {team.chassisName}</div>
                <div>🏆 <strong>Championships:</strong> {team.championships}</div>
              </div>
              
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14, flex: 1 }}>
                {team.description}
              </div>
              
              {/* Official Links */}
              <div style={{ 
                borderTop: `1px solid ${team.color}33`,
                paddingTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}>
                {team.website && (
                  <a 
                    href={team.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: `${team.color}20`,
                      border: `1px solid ${team.color}40`,
                      borderRadius: 3,
                      color: team.color,
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = `${team.color}40`;
                      elem.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = `${team.color}20`;
                      elem.style.color = team.color;
                    }}
                  >
                    🌐 WEBSITE
                  </a>
                )}
                {team.twitter && (
                  <a 
                    href={team.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: "#1DA1F220",
                      border: "1px solid #1DA1F240",
                      borderRadius: 3,
                      color: "#1DA1F2",
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#1DA1F240";
                      elem.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#1DA1F220";
                      elem.style.color = "#1DA1F2";
                    }}
                  >
                    𝕏 TWITTER
                  </a>
                )}
                {team.instagram && (
                  <a 
                    href={team.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: "#E1306C20",
                      border: "1px solid #E1306C40",
                      borderRadius: 3,
                      color: "#E1306C",
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#E1306C40";
                      elem.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#E1306C20";
                      elem.style.color = "#E1306C";
                    }}
                  >
                    📷 INSTAGRAM
                  </a>
                )}
              </div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginTop: 24 }}>
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
            {/* Profile Image Header */}
            <div style={{
              height: 200,
              background: "var(--surface2)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {driver.profileImage ? (
                <img 
                  src={driver.profileImage} 
                  alt={driver.name}
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover",
                    objectPosition: "center top"
                  }} 
                />
              ) : (
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  fontWeight: 900,
                }}>
                  {driver.code.charAt(0)}
                </div>
              )}
            </div>
            
            <div style={{
              padding: 16,
              borderBottom: "1px solid var(--border)",
            }}>
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
                <div style={{ fontSize: 12, color: "var(--green)", letterSpacing: 0.5, marginTop: 6, fontWeight: 600 }}>
                  {driver.team}
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
              
              {/* Team & Social Links */}
              <div style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}>
                {driver.teamWebsite && (
                  <a 
                    href={driver.teamWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      background: "var(--red-dim)",
                      border: "1px solid var(--red)",
                      borderRadius: 3,
                      color: "var(--red)",
                      fontSize: 10,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "var(--red)";
                      elem.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "var(--red-dim)";
                      elem.style.color = "var(--red)";
                    }}
                  >
                    🏢 TEAM
                  </a>
                )}
                {driver.twitter && (
                  <a 
                    href={driver.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      background: "#1DA1F220",
                      border: "1px solid #1DA1F240",
                      borderRadius: 3,
                      color: "#1DA1F2",
                      fontSize: 10,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#1DA1F2";
                      elem.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#1DA1F220";
                      elem.style.color = "#1DA1F2";
                    }}
                  >
                    𝕏
                  </a>
                )}
                {driver.instagram && (
                  <a 
                    href={driver.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      background: "#E1306C20",
                      border: "1px solid #E1306C40",
                      borderRadius: 3,
                      color: "#E1306C",
                      fontSize: 10,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#E1306C";
                      elem.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      const elem = e.currentTarget;
                      elem.style.background = "#E1306C20";
                      elem.style.color = "#E1306C";
                    }}
                  >
                    📷
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── CONSTRUCTOR STANDINGS PAGE ───────────────────────────────────────────────

const TEAM_META: Record<string, { color: string; shortName: string; championships: number }> = {
  "McLaren":        { color: "#FF8000", shortName: "MCL", championships: 9  },
  "Ferrari":        { color: "#DC0000", shortName: "FER", championships: 16 },
  "Red Bull":       { color: "#3671C6", shortName: "RBR", championships: 6  },
  "Mercedes":       { color: "#27F4D2", shortName: "MER", championships: 8  },
  "Aston Martin":   { color: "#229971", shortName: "AMR", championships: 0  },
  "Alpine":         { color: "#FF87BC", shortName: "ALP", championships: 2  },
  "Williams":       { color: "#64C4FF", shortName: "WIL", championships: 9  },
  "RB":             { color: "#6692FF", shortName: "RB",  championships: 0  },
  "Haas":           { color: "#B6BABD", shortName: "HAS", championships: 0  },
  "Kick Sauber":    { color: "#52E252", shortName: "SAU", championships: 0  },
};

function resolveTeamMeta(name: string) {
  for (const [key, val] of Object.entries(TEAM_META)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { color: "#888", shortName: "---", championships: 0 };
}

function resolveTeamDrivers(name: string): string {
  const team = (teamsData as any).teams?.find((t: any) =>
    name.toLowerCase().includes(t.id) || t.name.toLowerCase().includes(name.toLowerCase().split(" ")[0])
  );
  if (!team) return "";
  return team.drivers.map((d: any) => d.code).join(" · ");
}

function resolveTeamChassis(name: string): string {
  const team = (teamsData as any).teams?.find((t: any) =>
    name.toLowerCase().includes(t.id) || t.name.toLowerCase().includes(name.toLowerCase().split(" ")[0])
  );
  return team?.chassisName ?? "";
}

const ConstructorStandingsPage: FC = () => {
  const [constructors, setConstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [afterRound, setAfterRound] = useState(0);
  const [season, setSeason] = useState(2025);

  useEffect(() => {
    setLoading(true);
    setConstructors([]);

    fetch(`https://api.jolpi.ca/ergast/f1/${season}/constructorStandings.json`)
      .then(r => r.json())
      .then((data: any) => {
        const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
        const round = Number(list?.round ?? 0);
        const standings = list?.ConstructorStandings ?? [];
        setAfterRound(round);
        setConstructors(standings.map((s: any) => ({
          pos:    Number(s.position),
          name:   s.Constructor.name,
          points: Number(s.points),
          wins:   Number(s.wins),
        })));
        setLoading(false);
      })
      .catch(() => {
        // Fallback to teams.json data
        const fallback = (teamsData as any).teams.map((t: any, i: number) => ({
          pos: i + 1,
          name: t.name,
          points: Math.max(0, 180 - i * 22 + Math.floor(Math.random() * 10)),
          wins: Math.max(0, 5 - i),
        }));
        setConstructors(fallback);
        setLoading(false);
      });
  }, [season]);

  const maxPoints = constructors[0]?.points ?? 1;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="page-title" style={{ marginBottom: 4 }}>CONSTRUCTORS'</div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, color: "var(--red)", fontWeight: 700,
            letterSpacing: 3, textTransform: "uppercase",
          }}>
            Championship Standings
            {afterRound > 0 && <span style={{ color: "var(--muted)", marginLeft: 10 }}>After Round {afterRound}</span>}
          </div>
        </div>
        {/* Year selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {[2024, 2025].map(y => (
            <button
              key={y}
              onClick={() => setSeason(y)}
              style={{
                padding: "6px 16px", borderRadius: 4,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12, fontWeight: 700, letterSpacing: 2,
                border: "1px solid",
                borderColor: season === y ? "var(--red)" : "var(--border)",
                background: season === y ? "rgba(225,6,0,0.12)" : "var(--surface2)",
                color: season === y ? "var(--text)" : "var(--muted)",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >{y}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 14, letterSpacing: 2, color: "var(--muted)",
          textTransform: "uppercase",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid var(--red)", borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          Loading constructor standings…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {constructors.map((c, idx) => {
            const meta = resolveTeamMeta(c.name);
            const drivers = resolveTeamDrivers(c.name);
            const chassis = resolveTeamChassis(c.name);
            const gapToLeader = constructors[0].points - c.points;
            const barWidth = (c.points / maxPoints) * 100;
            const isLeader = idx === 0;

            return (
              <div
                key={c.name}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isLeader ? `${meta.color}40` : "var(--border)"}`,
                  borderLeft: `4px solid ${meta.color}`,
                  borderRadius: 8,
                  padding: "18px 20px",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "default",
                  boxShadow: isLeader ? `0 0 24px ${meta.color}18` : "none",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {/* Position */}
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 40, fontWeight: 900, lineHeight: 1,
                    color: isLeader ? meta.color : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "var(--muted)",
                    minWidth: 48, textAlign: "center",
                    textShadow: isLeader ? `0 0 20px ${meta.color}80` : "none",
                  }}>
                    {String(c.pos).padStart(2, "0")}
                  </div>

                  {/* Color dot */}
                  <div style={{
                    width: 12, height: 48, borderRadius: 3,
                    background: meta.color,
                    boxShadow: `0 0 12px ${meta.color}60`,
                    flexShrink: 0,
                  }} />

                  {/* Team info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 22, fontWeight: 900,
                      color: "var(--text)", letterSpacing: 0.5,
                    }}>
                      {c.name}
                    </div>
                    <div style={{
                      display: "flex", gap: 12, marginTop: 3,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 11, color: "var(--muted)", letterSpacing: 1.5,
                    }}>
                      {chassis && <span>🔧 {chassis}</span>}
                      {drivers && <span>👤 {drivers}</span>}
                      {meta.championships > 0 && <span>🏆 {meta.championships}× WCC</span>}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 24, alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 9, letterSpacing: 2, color: "var(--muted)",
                        textTransform: "uppercase", marginBottom: 4,
                      }}>WINS</div>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 24, fontWeight: 900,
                        color: c.wins > 0 ? "#ffd700" : "var(--muted)",
                      }}>{c.wins}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 9, letterSpacing: 2, color: "var(--muted)",
                        textTransform: "uppercase", marginBottom: 4,
                      }}>GAP</div>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 16, fontWeight: 700,
                        color: isLeader ? "var(--green)" : "var(--muted)",
                      }}>
                        {isLeader ? "LEADER" : `-${gapToLeader}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 9, letterSpacing: 2, color: "var(--muted)",
                        textTransform: "uppercase", marginBottom: 4,
                      }}>PTS</div>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 32, fontWeight: 900,
                        color: isLeader ? meta.color : "var(--text)",
                        textShadow: isLeader ? `0 0 16px ${meta.color}60` : "none",
                      }}>{c.points}</div>
                    </div>
                  </div>
                </div>

                {/* Points bar */}
                <div style={{
                  height: 3, borderRadius: 2,
                  background: "var(--surface3)",
                  marginTop: 14, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`,
                    borderRadius: 2,
                    transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    boxShadow: isLeader ? `0 0 8px ${meta.color}` : "none",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Championship context note */}
      {!loading && constructors.length > 0 && (
        <div style={{
          marginTop: 28, padding: "14px 18px",
          background: "rgba(225,6,0,0.04)",
          border: "1px solid rgba(225,6,0,0.12)",
          borderRadius: 6,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12, color: "var(--muted)", letterSpacing: 1,
        }}>
          🏆 Constructors' Championship points awarded to both drivers. 25pts for a win, 18-15-12-10-8-6-4-2-1 for positions 2–10.
          Data sourced from Jolpica (Ergast) API.
        </div>
      )}
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
            <button className={`nav-tab${tab === "news" ? " active" : ""}`}
              onClick={() => setTab("news")}>
              📰 NEWS
            </button>
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
        {tab === "news" && <NewsPage />}
      </div>
    </>
  );
};

export default F1TrackApp;
