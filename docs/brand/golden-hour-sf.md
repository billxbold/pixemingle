# Pixemingle Brand — Golden Hour SF

## Palette

| Role         | Name           | Hex       | RGB          |
|--------------|----------------|-----------|--------------|
| Primary      | Golden Honey   | #F2C078   | 242,192,120  |
| Secondary    | Terracotta     | #E07A5F   | 224,122,95   |
| Accent       | Sage Green     | #81B29A   | 129,178,154  |
| Outline      | Slate Blue     | #3D405B   | 61,64,91     |
| Background   | Parchment      | #F4F1DE   | 244,241,222  |
| Pop          | Honey          | #F2CC8F   | 242,204,143  |
| Depth        | Deep Green     | #5B8C5A   | 91,140,90    |
| Shadow       | Sienna         | #BC6C4C   | 188,108,76   |

## Rules

- **Outlines**: Always #3D405B slate blue — never black. Apply via swap_outlines.py after every PixelLab generation.
- **Light source**: Top-left, warm golden. Every interior has a diagonal golden light patch on the floor.
- **Background default**: #F4F1DE parchment — no white, no dark backgrounds.
- **UI chrome**: All panels, borders, buttons use palette colors only — parchment bg + slate blue border.
- **Ambient particles**: Floating golden dust motes (#F2CC8F, 30-50% opacity) in every scene.
- **Never say "Ghibli"** in any user-facing copy, code comments, or filenames.

## Aesthetic Reference

Modern San Francisco — SoMa coffee shops, Mission living rooms, rooftop bars, Ferry Building.
Golden 4pm light. Slate blue steel frames. Sage green plants. Terracotta warmth.
Contemporary, not vintage. Tech city with soul.

## Asset Specs

| Asset type        | Size      | Tool          |
|-------------------|-----------|---------------|
| Characters        | 48x48     | PixelLab MCP + swap_outlines.py |
| Portraits         | 128x128   | PixelLab MCP  |
| Venue backgrounds | 960x528   | PixelLab web UI (tiled) |
| Props             | 32-48px   | PixelLab MCP  |
| Floor tiles       | 32x32     | PixelLab MCP  |
| UI panels         | Variable  | CSS (palette colors) |

## PixelLab Generation Settings (locked)

```
size: 48
view: "low top-down"
outline: "single color outline"  → post-process with swap_outlines.py
shading: "medium shading"
detail: "high detail"
proportions: chibi
ai_freedom: 400-500
```
