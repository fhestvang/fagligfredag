# Planning: Slide Creator Skill

## Vision

Natural language → professionally formatted slides → PowerPoint/Google Slides output.

**Inspiration**: Implement Consulting's tool (screenshot) showing code-driven slide generation with PowerPoint integration.

---

## Use Cases

### Primary
1. **Data storytelling** - "Create a slide deck summarizing Q4 taxi trip trends"
2. **Report generation** - "Turn this dbt model documentation into a presentation"
3. **Dashboard snapshots** - "Export these Power BI visuals as a slide deck"

### Secondary
4. **Template population** - "Fill this template with data from fct_trips"
5. **Incremental updates** - "Add a new slide with this week's metrics"

---

## Architecture Options

### Option A: Python-pptx Direct

```
Natural Language Request
        ↓
    Claude Agent
        ↓
    python-pptx
        ↓
    .pptx file
```

**Pros**: Simple, no external dependencies
**Cons**: Limited design capabilities, manual styling

### Option B: Template-Based

```
Request + Template Selection
        ↓
    Claude Agent
        ↓
    Template Engine (Jinja2)
        ↓
    python-pptx with master slides
        ↓
    Branded .pptx
```

**Pros**: Consistent branding, reusable layouts
**Cons**: Requires template library upfront

### Option C: Office/Graph API Integration

```
Request
        ↓
    Claude Agent
        ↓
    Microsoft Graph API
        ↓
    PowerPoint Online (live edit)
```

**Pros**: Real-time collaboration, cloud-native
**Cons**: Auth complexity, API rate limits

### Option D: MCP-Style Tool (like screenshot)

```
Request
        ↓
    Claude Agent
        ↓
    Slide MCP Server
    ├── insert_slide()
    ├── add_title()
    ├── add_chart()
    ├── add_image()
    └── export()
        ↓
    PowerPoint / Google Slides
```

**Pros**: Mirrors Power BI MCP pattern, granular control
**Cons**: More infrastructure to build

---

## Proposed: Hybrid Approach

Start simple (Option A), add templates (Option B), evolve to MCP (Option D).

```
Phase 1: python-pptx basics
Phase 2: Template library + branding
Phase 3: MCP server for granular control
Phase 4: Graph API for cloud integration
```

---

## Core Components

### 1. Slide Schema

```python
@dataclass
class Slide:
    layout: str  # "title", "content", "two_column", "chart", "image"
    title: str
    subtitle: str | None
    content: list[ContentBlock]
    notes: str | None

@dataclass
class ContentBlock:
    type: str  # "text", "bullet", "chart", "image", "table"
    data: dict
    position: str | None  # "left", "right", "full"
```

### 2. Layout Library

| Layout | Use Case |
|--------|----------|
| `title_slide` | Deck opener |
| `section_header` | Topic divider |
| `content` | Text + bullets |
| `two_column` | Comparison |
| `chart_full` | Single visualization |
| `chart_with_text` | Chart + commentary |
| `image_full` | Full-bleed image |
| `data_table` | Tabular data |
| `key_metrics` | KPI dashboard |
| `quote` | Testimonial/callout |

### 3. Data Connectors

```python
# Pull data from our stack
class DataSources:
    def from_dbt_model(model_name: str) -> DataFrame
    def from_dax_query(query: str) -> DataFrame
    def from_powerbi_visual(visual_id: str) -> Image
    def from_csv(path: str) -> DataFrame
```

### 4. Skill Interface

```
/slides create "Q4 Trip Analysis" --template executive --data fct_trips
/slides add-chart --type bar --title "Trips by Borough" --query "..."
/slides add-slide --layout two_column --title "YoY Comparison"
/slides export --format pptx --output ./output/q4_analysis.pptx
```

---

## Example Workflow

**Request**: "Create a 5-slide deck on taxi trip patterns for executives"

**Agent generates**:

```yaml
deck:
  title: "NYC Taxi Trip Analysis"
  template: executive
  slides:
    - layout: title_slide
      title: "NYC Taxi Trip Analysis"
      subtitle: "Q4 2024 Executive Summary"

    - layout: key_metrics
      title: "Key Metrics"
      metrics:
        - label: "Total Trips"
          value: "{{query:total_trips}}"
          trend: "+12% YoY"
        - label: "Revenue"
          value: "{{query:total_revenue}}"
          trend: "+8% YoY"

    - layout: chart_full
      title: "Trip Volume by Month"
      chart:
        type: line
        data: "{{dbt:int_trips_monthly}}"

    - layout: two_column
      title: "Peak Hours Analysis"
      left:
        type: chart
        data: "{{query:weekday_hourly}}"
      right:
        type: bullets
        items:
          - "Morning rush: 7-9 AM"
          - "Evening rush: 5-7 PM"
          - "Weekend patterns differ"

    - layout: content
      title: "Recommendations"
      bullets:
        - "Increase fleet during peak hours"
        - "Target airport routes for growth"
        - "Monitor payment type shifts"
```

---

## Technical Requirements

### Dependencies
```
python-pptx      # PowerPoint generation
pandas           # Data manipulation
plotly/matplotlib # Chart generation
Pillow           # Image processing
jinja2           # Template rendering
```

### Optional
```
msal             # Microsoft auth (for Graph API)
google-api-python-client  # Google Slides
```

---

## Implementation Phases

### Phase 1: MVP (Week 1)
- [ ] Basic python-pptx wrapper
- [ ] 3 core layouts: title, content, chart
- [ ] CLI skill: `/slides create`
- [ ] Export to .pptx

### Phase 2: Templates (Week 2)
- [ ] Template library (5 layouts)
- [ ] Brand colors/fonts config
- [ ] Data binding syntax `{{query:...}}`
- [ ] dbt model integration

### Phase 3: Intelligence (Week 3-4)
- [ ] Natural language → slide structure
- [ ] Auto-suggest layouts based on data
- [ ] Chart type recommendation
- [ ] Content summarization

### Phase 4: MCP Server (Week 5+)
- [ ] Slide MCP server (like Power BI MCP)
- [ ] Granular operations (insert, update, delete)
- [ ] Real-time preview
- [ ] Google Slides support

---

## Open Questions

1. **Primary output format**: PowerPoint only, or Google Slides too?
2. **Template source**: Build from scratch or use existing corporate templates?
3. **Chart rendering**: Static images or native PowerPoint charts?
4. **Data freshness**: Generate once or live data connection?
5. **Collaboration**: Single export or cloud-native editing?

---

## Integration with Existing Stack

```
dbt models ──────┐
                 ├──→ Slide Creator ──→ .pptx
Power BI MCP ────┤
                 │
Natural Language─┘
```

**Synergy**:
- Reuse Power BI MCP for visual exports
- Query dbt models directly for data
- Same agent orchestration as CI/CD plan

---

## Success Criteria

1. **Time**: < 2 minutes from request to slide deck
2. **Quality**: Output requires < 20% manual editing
3. **Adoption**: Team uses it weekly for reporting
4. **Consistency**: All decks match brand guidelines

---

## Next Steps

1. Decide on primary output format (PowerPoint vs Google Slides)
2. Collect 3-5 example slide decks as reference
3. Build MVP with python-pptx
4. Test with real data from fct_trips

---

## References

- Implement Consulting screenshot (inspiration)
- [python-pptx docs](https://python-pptx.readthedocs.io/)
- [Microsoft Graph PowerPoint API](https://docs.microsoft.com/en-us/graph/api/resources/presentation)
