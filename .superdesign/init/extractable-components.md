# Extractable components

## ChatHeader
- Source: `src/ChatApp.tsx`
- Category: layout
- Description: Sticky translucent header with account, subject/thread identity, new chat and details.
- Extractable props: `subjectName`, `subjectMeta`, `accountInitial`, `threadCount`.
- Hardcoded: Sahadeva name, icon semantics, circular action style.

## Composer
- Source: `src/ChatApp.tsx`
- Category: layout
- Description: Bottom message composer with one-line input and send action.
- Extractable props: `placeholder`, `disabled`, `value`.
- Hardcoded: upward-arrow send icon and pill treatment.

## ReadingQualityActions
- Source: `src/ChatApp.tsx`
- Category: basic
- Description: Per-reading section feedback and downstream actions.
- Extractable props: `sections`, `language`, `selectedSection`, `feedbackState`.
- Hardcoded: action semantics and compact pill layout.

## BtrWorkspace
- Source: `src/BtrWorkspace.tsx`
- Category: layout
- Description: Full-screen responsive structured rectification workflow.
- Extractable props: `language`, `eventCount`, `busy`, `hasResult`.
- Hardcoded: workflow order and event card structure.

## DetailSheet
- Source: `src/ChatApp.tsx`
- Category: layout
- Description: Chart evidence sheet/dock with tabs and technical exploration.
- Extractable props: `activeTab`, `dockSize`, `subjectName`.
- Hardcoded: chart/evidence taxonomy.

## ReviewStudioShell
- Source: `src/ReviewStudio.tsx`
- Category: layout
- Description: Reviewer master-detail queue with filters and editor.
- Extractable props: `selectedItem`, `moduleFilter`, `queueCount`.
- Hardcoded: review workflow actions.
