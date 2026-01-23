# Webapp Revision Plan

## Overview

Complete rebuild of the webapp to create a **dbt teaching/demo tool** focused on:
1. Editing source data (JSON files) to simulate source system changes
2. Visualizing the dbt DAG with selector syntax demos
3. Showing before/after diffs at row and aggregate level
4. Predicting impact of changes and suggesting dbt commands

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           FRONTEND                               │
│                         (Next.js)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Navigation Bar                          │ │
│  │  [Source Editor] [Data Explorer] [DAG] [Refresh]          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │                  │  │                                      │ │
│  │  Source Editor   │  │  Impact Panel                        │ │
│  │  ─────────────   │  │  ────────────                        │ │
│  │  - JSON table    │  │  - Affected models (highlighted)     │ │
│  │  - Add/edit/del  │  │  - Schema drift warnings             │ │
│  │  - Add columns   │  │  - Suggested dbt commands            │ │
│  │  - Save to file  │  │  - Copy command button               │ │
│  │                  │  │                                      │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    DAG Visualizer                            ││
│  │  ────────────────────────────────                            ││
│  │  - Interactive node graph (React Flow)                       ││
│  │  - Click node → show data preview                            ││
│  │  - Selector demo: +model, model+, +model+                    ││
│  │  - Highlight upstream/downstream                             ││
│  │  - Color by layer (source/staging/intermediate/marts)        ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    Data Explorer                             ││
│  │  ────────────────────────────────                            ││
│  │  - Browse all layers (source → staging → marts)              ││
│  │  - Before/after diff view                                    ││
│  │  - Row-level diffs (added/modified/deleted)                  ││
│  │  - Aggregate diffs (counts, schema changes)                  ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                           BACKEND                                │
│                         (FastAPI)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /api/source                                                     │
│  ├── GET  /tables         - List source JSON files              │
│  ├── GET  /tables/{name}  - Read source table data              │
│  ├── PUT  /tables/{name}  - Save source table data              │
│  ├── POST /tables/{name}/rows      - Add row                    │
│  ├── PUT  /tables/{name}/rows/{id} - Update row                 │
│  ├── DELETE /tables/{name}/rows/{id} - Delete row               │
│  ├── POST /tables/{name}/columns   - Add column                 │
│  └── POST /reload         - Reload from dlt (reset)             │
│                                                                  │
│  /api/data                                                       │
│  ├── GET  /layers         - List layers (staging, marts, etc)   │
│  ├── GET  /tables/{layer} - List tables in layer                │
│  ├── GET  /query          - Query table with pagination         │
│  └── GET  /schema/{layer}/{table} - Get table schema            │
│                                                                  │
│  /api/dag                                                        │
│  ├── GET  /              - Get full DAG from manifest.json      │
│  ├── GET  /select        - Get nodes for selector (e.g., +model)│
│  └── GET  /model/{name}  - Get model details + preview          │
│                                                                  │
│  /api/diff                                                       │
│  ├── POST /snapshot      - Take snapshot of current state       │
│  ├── GET  /snapshots     - List available snapshots             │
│  └── POST /compare       - Compare two snapshots                │
│                                                                  │
│  /api/impact                                                     │
│  ├── POST /analyze       - Analyze impact of source changes     │
│  └── GET  /commands      - Get suggested dbt commands           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FILE SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  data/                                                           │
│  ├── source/                    # Editable JSON source files    │
│  │   ├── trips.json             # Main trips data               │
│  │   ├── payment_types.json     # Lookup table                  │
│  │   ├── rate_codes.json        # Lookup table                  │
│  │   └── vendors.json           # Lookup table                  │
│  │                                                               │
│  ├── snapshots/                 # Before/after snapshots        │
│  │   ├── 2024-01-19_10-30.json  # Timestamped snapshots         │
│  │   └── ...                                                     │
│  │                                                               │
│  └── nyc_taxi.duckdb            # DuckDB database               │
│                                                                  │
│  dbt_project/                                                    │
│  └── target/                                                     │
│      └── manifest.json          # DAG source (after dbt parse)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Source System Design

### JSON File Structure

Each source table is a JSON file with this structure:

```json
{
  "schema": {
    "columns": [
      {"name": "id", "type": "integer", "nullable": false},
      {"name": "pickup_datetime", "type": "timestamp", "nullable": false},
      {"name": "amount", "type": "decimal", "nullable": true}
    ],
    "primary_key": "id"
  },
  "data": [
    {"id": 1, "pickup_datetime": "2024-01-01T08:30:00", "amount": 15.50},
    {"id": 2, "pickup_datetime": "2024-01-01T09:15:00", "amount": 22.00}
  ],
  "metadata": {
    "source": "nyc_tlc",
    "last_modified": "2024-01-19T10:30:00",
    "row_count": 2
  }
}
```

### dbt Source Configuration

New dbt source that reads from JSON files:

```yaml
# dbt_project/models/staging/_sources.yml
sources:
  - name: source_system
    description: Editable JSON source files (simulated source system)
    tables:
      - name: trips
        description: Raw trip records
      - name: payment_types
        description: Payment type lookup
      - name: rate_codes
        description: Rate code lookup
      - name: vendors
        description: Vendor lookup
```

### Staging Models

```sql
-- dbt_project/models/staging/stg_trips.sql
with source as (
    select * from read_json_auto('{{ var("source_path") }}/trips.json')
),
...
```

## DAG Visualization

### Features

1. **Interactive Graph**
   - Nodes colored by layer (source=blue, staging=yellow, intermediate=orange, marts=green)
   - Edges show dependencies
   - Zoom, pan, fit-to-screen

2. **Node Interaction**
   - Click node → highlight it
   - Show data preview panel (first 10 rows)
   - Show model SQL (collapsible)

3. **Selector Demo**
   - Input field to type selector (e.g., `stg_trips+`)
   - Highlight matching nodes
   - Show what `dbt run --select <selector>` would run
   - Buttons for common patterns: `+model`, `model+`, `+model+`

4. **Dependency Highlighting**
   - Hover node → dim non-related nodes
   - Click "Show Upstream" → highlight ancestors
   - Click "Show Downstream" → highlight descendants

## Diff System

### Snapshot Structure

```json
{
  "timestamp": "2024-01-19T10:30:00",
  "label": "Before adding new column",
  "tables": {
    "staging.stg_trips": {
      "row_count": 1000,
      "schema": [...],
      "checksum": "abc123",
      "sample_data": [...]
    },
    "marts.fct_trips": {
      "row_count": 1000,
      "schema": [...],
      "checksum": "def456",
      "sample_data": [...]
    }
  }
}
```

### Diff Types

1. **Aggregate Diff**
   - Row count changes (+50, -10)
   - Schema changes (new columns, removed columns, type changes)
   - Tables added/removed

2. **Row-Level Diff**
   - New rows (green highlight)
   - Deleted rows (red highlight)
   - Modified rows (yellow highlight, show old→new values)

## Impact Analysis

### When Source Changes

The impact panel analyzes:

1. **Schema Changes**
   - New column added → "Column `tip_amount` added to source"
   - Column removed → "WARNING: Column `old_col` removed - downstream models may fail"
   - Type change → "WARNING: Column `amount` type changed from INT to VARCHAR"

2. **Affected Models**
   - Parse DAG to find all downstream models
   - Categorize: "Will update" vs "May fail"

3. **Suggested Commands**

```
Suggested dbt commands:
──────────────────────

1. Update affected models:
   dbt run --select source:source_system.trips+

2. Test after changes:
   dbt test --select source:source_system.trips+

3. Full rebuild (if schema changed):
   dbt run --full-refresh --select stg_trips+
```

## User Flow

### Demo Scenario: Adding a Column

1. **Open Source Editor**
   - See `trips.json` with current columns

2. **Add Column**
   - Click "Add Column" → enter `congestion_surcharge` (decimal)
   - New column appears in table with NULL values
   - Fill in some values

3. **See Impact Panel Update**
   - Shows: "New column: congestion_surcharge"
   - Shows: "Affected models: stg_trips → int_trips_enriched → fct_trips"
   - Shows: "Suggested: `dbt run --select stg_trips+`"

4. **Save Changes**
   - Click "Save" → writes to `data/source/trips.json`

5. **Run dbt in VS Code**
   - Copy suggested command
   - Run in terminal
   - See dbt output

6. **Return to Webapp**
   - Click "Refresh"
   - Open Data Explorer
   - See new column propagated through layers
   - View diff: "Before vs After"

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React Query (data fetching)
- React Flow (DAG visualization)
- Tailwind CSS (styling)
- Lucide Icons

### Backend
- FastAPI
- DuckDB (read transformed data)
- JSON file I/O (source system)
- dbt manifest.json parsing

## File Structure

```
webapp/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── source.py      # Source JSON CRUD
│   │   │   ├── data.py        # DuckDB queries
│   │   │   ├── dag.py         # DAG/manifest parsing
│   │   │   ├── diff.py        # Snapshot/compare
│   │   │   └── impact.py      # Impact analysis
│   │   ├── services/
│   │   │   ├── source_service.py
│   │   │   ├── duckdb_service.py
│   │   │   ├── dag_service.py
│   │   │   ├── diff_service.py
│   │   │   └── impact_service.py
│   │   └── models/
│   │       ├── source.py
│   │       ├── dag.py
│   │       └── diff.py
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Main layout with panels
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── source-editor/
    │   │   │   ├── SourceEditor.tsx
    │   │   │   ├── TableEditor.tsx
    │   │   │   ├── ColumnManager.tsx
    │   │   │   └── RowEditor.tsx
    │   │   ├── data-explorer/
    │   │   │   ├── DataExplorer.tsx
    │   │   │   ├── TableView.tsx
    │   │   │   └── DiffView.tsx
    │   │   ├── dag/
    │   │   │   ├── DagView.tsx
    │   │   │   ├── DagNode.tsx
    │   │   │   ├── SelectorInput.tsx
    │   │   │   └── ModelPreview.tsx
    │   │   ├── impact/
    │   │   │   ├── ImpactPanel.tsx
    │   │   │   ├── AffectedModels.tsx
    │   │   │   └── CommandSuggestions.tsx
    │   │   └── ui/
    │   │       ├── Button.tsx
    │   │       ├── Table.tsx
    │   │       └── ...
    │   ├── hooks/
    │   │   ├── useSource.ts
    │   │   ├── useDag.ts
    │   │   └── useDiff.ts
    │   └── lib/
    │       ├── api.ts
    │       └── types.ts
    └── package.json
```

## Implementation Phases

### Phase 1: Source System
- [ ] Create `data/source/` folder structure
- [ ] Build JSON CRUD backend endpoints
- [ ] Build Source Editor frontend component
- [ ] Update dbt models to read from JSON files
- [ ] Add "Reload from dlt" endpoint

### Phase 2: Data Explorer
- [ ] Build layer/table browser
- [ ] Build table view with pagination
- [ ] Read from DuckDB (transformed data)

### Phase 3: DAG Visualization
- [ ] Parse dbt manifest.json
- [ ] Build React Flow graph
- [ ] Implement selector highlighting
- [ ] Add model preview panel

### Phase 4: Diff System
- [ ] Build snapshot service
- [ ] Build comparison logic
- [ ] Build diff UI (aggregate + row-level)

### Phase 5: Impact Analysis
- [ ] Build change detection
- [ ] Build downstream analysis
- [ ] Build command suggestion logic
- [ ] Build Impact Panel UI

### Phase 6: Polish
- [ ] Responsive layout
- [ ] Error handling
- [ ] Loading states
- [ ] Keyboard shortcuts
