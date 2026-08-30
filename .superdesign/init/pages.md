# Page dependency trees

## `/` — consumer chat

Entry: `src/ChatApp.tsx`

- `src/ChatApp.tsx`
  - `src/BtrWorkspace.tsx`
  - `src/SouthChart.tsx`
  - `src/NorthChart.tsx`
  - `src/pdfReport.ts`
  - `src/chat.css`
  - `shared/telugu.ts`
  - `shared/constants.ts`
  - `shared/kp.ts`
  - `shared/additionalDashas.ts`

## `/#pro` — professional workspace

Entry: `src/App.tsx`

- `src/App.tsx`
  - `src/ConsultationToolsPanel.tsx`
  - `src/PrashnaPanel.tsx`
  - `src/SouthChart.tsx`
  - `src/NorthChart.tsx`
  - `src/pdfReport.ts`
  - `src/styles.css`
  - shared chart/calculation modules

## `/#review` — review studio

- `src/ReviewStudio.tsx`
  - `src/review.css`
  - `src/review-editor.css`

## `/?chart=TOKEN` — shared chart

- `SharedChartView` in `src/ChatApp.tsx`
  - `src/SouthChart.tsx`
  - `src/NorthChart.tsx`
  - `src/chat.css`
