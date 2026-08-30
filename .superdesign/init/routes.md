# Routes

Routing is handled in `src/main.tsx` without React Router.

| URL | Component | Purpose |
|---|---|---|
| `/` | `src/ChatApp.tsx` | Consumer onboarding, chat, full readings, BTR, details |
| `/#pro` | `src/App.tsx` | Professional calculation workspace |
| `/#review` | `src/ReviewStudio.tsx` | Reviewer knowledge/rule studio |
| `/?chart=TOKEN` | `SharedChartView` in `src/ChatApp.tsx` | Read-only shared chart |
| `/?share=…` | `src/App.tsx` | Professional share workflow |

The root switch source is fully included in `layouts.md`.
