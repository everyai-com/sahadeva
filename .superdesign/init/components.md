# Shared UI components

The product uses custom React/vanilla-CSS components rather than a third-party UI kit. The primary reusable patterns live inside `src/ChatApp.tsx`; the standalone structured workflow is below.

## `src/BtrWorkspace.tsx` — `BtrWorkspace`

Structured modal workspace for 3–8 birth-time-rectification events, precision, confidence, persistence, and ranked results.

```tsx
import { useEffect, useMemo, useState } from "react";
type Precision="day"|"month"|"year"|"range";
type Topic="career"|"marriage"|"wealth"|"education"|"children"|"property"|"spirituality";
type Event={id:string;topic:Topic;label:string;precision:Precision;date:string;endDate:string;confidence:number};
export type BtrSession={earliestTime:string;latestTime:string;stepMinutes:number;events:Event[]};
type Result={rankedClusters:Array<{startTime:string;endTime:string;bestScore:number;holdoutScore:number|null;candidateCount:number;signature?:string}>;notice:string;diagnostics?:{conclusive:boolean;spread:number;eventCount:number;leaveOneOut:Array<{eventId:string;topRange:string}>}};
const topics:Topic[]=["career","marriage","wealth","education","children","property","spirituality"];
const blank=():Event=>({id:crypto.randomUUID(),topic:"career",label:"",precision:"day",date:"",endDate:"",confidence:4});
// Full implementation: src/BtrWorkspace.tsx. Visual structure: overlay → scrollable workspace → header → range controls → repeated event cards → sticky actions → results.
```

## `src/ChatApp.tsx` reusable patterns

- `ReadingQualityActions`: section picker, feedback, follow-up, regenerate, download, share.
- `AccountSheet`: authentication/profile sheet.
- `Onboarding`: three-step birth-data setup.
- `DetailSheet`: chart/evidence workspace.
- `Message`: user and assistant bubbles with streamed state.
- `BtrWorkspace`: imported structured modal.

These are currently colocated in one large file and should be extracted during implementation after a design is approved.
