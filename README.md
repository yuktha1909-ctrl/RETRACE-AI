# RETRACE AI

> AI-powered task extraction and change tracking using NVIDIA Nemotron via Nebius Token Factory.

## 🚀 Overview

RETRACE AI is an AI-powered productivity tool that converts unstructured information into a clear, actionable task plan.

It uses **NVIDIA Nemotron** through the **Nebius Token Factory API** to identify tasks, deadlines, and priorities from user-provided text.

RETRACE AI also compares the current analysis with a previous analysis to show **what changed** — including newly added tasks, removed tasks, and changes in deadlines or priorities.

---

## ✨ Features

- 🤖 AI-powered task extraction
- 📋 Automatic task and deadline identification
- 🔥 Priority classification: HIGH, MEDIUM, LOW
- 📊 Action Plan dashboard
- 🔄 What Changed comparison
- ➕ Detects newly added tasks
- ➖ Detects removed tasks
- ✏️ Detects deadline and priority changes
- 💾 Saves analysis data locally in the browser
- 🌐 React-based web interface
- ⚡ FastAPI backend
- 🧠 NVIDIA Nemotron model through Nebius Token Factory

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │      User Input      │
                    │  Notes / Information │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │      RETRACE AI      │
                    └──────────┬───────────┘
                               │
                         HTTP POST
                               │
                               ▼
                    ┌──────────────────────┐
                    │    FastAPI Backend   │
                    │      /analyze        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Nebius Token       │
                    │      Factory API     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   NVIDIA Nemotron   │
                    │        Model         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Tasks + Deadlines  │
                    │      + Priority      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Action Plan      │
                    │   + What Changed     │
                    └──────────────────────┘
                    