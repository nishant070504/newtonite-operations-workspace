# Engineering Decisions

## 1. A small vertical slice instead of a broad task-management product

### Context

The brief values correctness, authorization, concurrency, history, and explainable engineering decisions more than a large number of screens.

### Options considered

- Build a broad front-end-only task manager with many views.
- Build a narrow API and UI slice with explicit rules that can be tested.
- Build every suggested feature, including comments, notifications, workers, and real-time updates.

### Choice

This project focuses on the issue lifecycle: authenticate, scope work to a team, create an issue, list it, claim it, update it, validate transitions, prevent stale writes, and inspect activity.

The dashboard adds the review experience around that slice: teams, filters, search, pagination, details, editing, and labels.

### Trade-off

The product is easier to explain and the critical behaviours are testable, but several features from the broader brief are intentionally not implemented yet. The README records those limitations rather than presenting prototype behaviour as production behaviour.

## 2. Express, Prisma, and PostgreSQL

### Context

The backend needs typed validation, relational constraints, indexes, transactions, and straightforward API tests within a small implementation.

### Options considered

- Express with Prisma and PostgreSQL.
- A heavier full-stack framework.
- A browser-only database or local storage.

### Choice

The API uses Express, Zod, Prisma, and PostgreSQL. Express keeps the HTTP boundary visible. Zod validates external input. Prisma provides a typed relational model and transaction boundary. PostgreSQL provides the constraints, indexes, and concurrency primitives expected by the brief.

### Trade-off

This is more operational setup than a local-only prototype, but it creates a credible path to team-scoped data and server-enforced rules. A production submission still needs migrations, seed data, and a reproducible database setup.

## 3. Team membership is the authorization boundary

### Context

A user should not be able to read or change work merely because they know an issue ID. Access must be enforced by the server and scoped to the issue's team.

### Options considered

- Check permissions only in React.
- Store one global role on the user.
- Resolve membership for the requested team on every protected issue operation.

### Choice

Every protected issue route authenticates the JWT, loads the issue or requested team, and checks `TeamMember`. Update permission requires either `TEAM_LEAD` or ownership by the current assignee. The membership table supports a different role for each team.

### Trade-off

Membership lookups add database work to each request, but they keep the rule close to the protected resource and prevent the browser from becoming a security boundary. The next scaling step is to add carefully measured indexes and, if needed, short-lived server-side role caching.

## 4. Workflow transitions are an allow-list

### Context

A status field alone allows invalid jumps such as moving an issue directly from `OPEN` to `CLOSED`. The brief asks for server-enforced workflow rules.

### Options considered

- Accept any enum value supplied by the client.
- Encode transitions in the UI only.
- Define an explicit server-side transition map.

### Choice

The API maintains an allow-list for each status:

```text
BACKLOG -> TODO
TODO -> IN_PROGRESS or BLOCKED
IN_PROGRESS -> BLOCKED or DONE
BLOCKED -> TODO or IN_PROGRESS
DONE -> DEPLOYED
DEPLOYED -> terminal
```

The server rejects invalid transitions with `422 Unprocessable Entity`, regardless of what the client displays.

### Trade-off

The map is simple and auditable, but a future workflow editor would need a persisted policy model rather than a constant. The current approach is the right size for a fixed challenge workflow.

## 5. Optimistic concurrency protects edits and conditional updates protect claims

### Context

Two users may open the same issue. A later save must not silently overwrite a change made after the issue was opened. Two users may also try to claim the same unassigned issue.

### Options considered

- Last write wins.
- Lock the row for the duration of every browser edit.
- Use a version in the update predicate and a conditional update for claims.

### Choice

Every issue begins at version `1`. The client sends the version it read. The API updates only when the stored version still matches, incrementing the version atomically. A mismatch returns `409 Conflict` and the current issue. Claims update only where `assigneeId IS NULL`; exactly one request can succeed.

### Trade-off

The user interface must handle a conflict and ask the user to reload or reconcile. That is preferable to silently losing work and scales better than holding locks across a network interaction.

## 6. Idempotency is applied to issue creation

### Context

Double-clicks, browser retries, and network retries can create duplicate issues when a create request succeeds but the response is lost.

### Options considered

- Ask the client to disable the button and trust it.
- Deduplicate by title and team.
- Accept an `Idempotency-Key`, store the response, and return it for a matching retry.

### Choice

The create endpoint accepts an `Idempotency-Key`. The key is associated with the user and operation. The issue, its creation activity, and the stored response are written inside the same Prisma transaction. A retry with the same key returns the original response.

### Trade-off

Clients must generate and preserve a key for the duration of a retryable operation. Keys also need a retention policy in a long-running production system; the current schema keeps them as an auditable table without expiry handling.

## 7. Important changes have activity records

### Context

An operations tool needs to explain who created, assigned, or changed an issue. A current row alone cannot answer that question.

### Options considered

- Keep only `updatedAt` on the issue.
- Put a JSON history blob on each issue.
- Store append-only activity rows linked to the issue and actor.

### Choice

`IssueActivity` records the actor, action, old value, new value, metadata, and timestamp. The API creates activity for issue creation, assignment, and updates. The activity route uses the same team membership check as the issue route.

### Trade-off

History grows faster than the issue table and will eventually need retention, partitioning, or archival strategy. The model remains queryable and auditable, and its issue/timestamp index supports a chronological detail view.

One remaining hardening task is to place every issue mutation and its activity insert in a single database transaction. Creation already follows that pattern; claim and update should be brought into it before production use.

## 8. Search and pagination should move to the server at scale

### Context

The brief explicitly calls out tens of thousands of items and a growing activity history. Loading everything into the browser is not a scalable final design.

### Options considered

- Keep all filtering and pagination in React.
- Add offset pagination and server-side filtering.
- Add cursor pagination with indexed filters and full-text search where needed.

### Choice

The API currently scopes issue lists by team and supports `mine` and `unassigned` filters. The visible dashboard demonstrates local search, filters, and pagination with a small representative dataset. The production direction is cursor pagination plus indexed server-side filters and search.

### Trade-off

The current UI is quick to demonstrate, but it should not be described as handling tens of thousands of records. Cursor pagination avoids deep offset scans and is the next required backend change.

## 9. Async work belongs behind a transactional outbox

### Context

Notifications and other asynchronous work must survive worker crashes and network retries. Sending a notification directly from the request handler can lose the notification after the database commit.

### Options considered

- Send notifications directly before returning the HTTP response.
- Add a background jobs table after the fact.
- Write an outbox event in the same transaction as the business change, then retry it from a worker.

### Choice

The project does not yet implement the worker or outbox. The intended design is an outbox row written with the issue mutation, claimed by a worker with retry/backoff, and processed by an idempotent handler.

### Trade-off

This adds operational components and monitoring, so it is deliberately deferred from the current vertical slice. It is documented now because it is the correct path for reliable asynchronous behaviour.

## 10. The dashboard and API are separate integration stages

### Context

The repository contains a polished dashboard and a tested API, but they are not yet connected. Pretending they are one finished flow would make the documentation misleading.

### Choice

The README explicitly calls out the boundary: the dashboard uses in-memory representative data, while the API and Prisma schema define the server-side implementation. The next integration stage is authenticated API loading, mutation handling, conflict reconciliation, and replacing browser state with server state.

### Trade-off

This leaves the visible demo and the API at different maturity levels, but the boundary is clear, testable, and easy to explain during a review. It also makes the remaining work visible instead of hiding it behind mock interactions.

## Known limitations

- No migration or repeatable seed script is included yet.
- The browser does not call the API.
- Label changes exist in the dashboard prototype but are not represented in the current API schema.
- Comments, due-date mutation, and reassignment endpoints are not implemented.
- Claim/update activity writes should be transactionally coupled to their issue mutations.
- The API does not yet provide cursor pagination or server-side search.
- No worker, outbox, deployment manifest, hosted demo, or PostgreSQL integration test suite is included.
