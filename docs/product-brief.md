# ProjectPulse: Product Brief (Short)

**Pitch:** A focused, real-time project workspace for small teams that find Jira too heavy and Trello too shallow.

## 1. Problem

Teams need one place to see what's being worked on, who owns it, its status, and what was decided. Today that info is scattered across spreadsheets, chat and heavy tools. Boards go stale, assignments get missed, and there's no durable record of changes.

## 2. Goals

1. Strict multi-organization data isolation (non-negotiable).
2. Fast task management: create, assign, update, find.
3. Reliable real-time collaboration, including across disconnects.
4. Durable activity trail plus asynchronous notifications.
5. Simple progress and overdue reporting.
6. Operable from day one: logs, metrics, health checks.

_Learning goal:_ each major feature should teach something concrete (tenancy, real-time semantics, background jobs, pagination, observability).

## 3. Target Clients

| Segment                                                                                        | Fit                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------ |
| **Primary:** small product/engineering teams (5 to 50 people), startups, agencies, internal IT | Strong                         |
| **Secondary:** project-based orgs (consultancies, design studios, marketing teams)             | Good                           |
| **Tertiary:** freelancers working across multiple client orgs                                  | Validates multi-org membership |
| **Not targeted:** large enterprises needing SSO, compliance, custom workflows                  | Out of scope                   |

**Personas:** Team Lead (plans and tracks), Contributor (executes tasks), Org Admin (manages members), Viewer/Stakeholder (read-mostly), Operator (runs the system).

## 4. Roles (Fixed in v1)

| Capability                                       | Owner | Admin | Member | Viewer |
| ------------------------------------------------ | ----- | ----- | ------ | ------ |
| Manage members and roles                         | Yes   | Yes   | No     | No     |
| Create projects and tasks, assign, update status | Yes   | Yes   | Yes    | No     |
| Chat in project rooms                            | Yes   | Yes   | Yes    | TBD    |
| View projects, tasks, reports                    | Yes   | Yes   | Yes    | Yes    |
| Access another org's data                        | Never | Never | Never  | Never  |

## 5. Features

**P0 = must have, P1 = should have, P2 = later**

**Organizations and access**

- P0: sign up/in, create org, invite members, roles, multi-org switching, tenant-scoped access everywhere (API, IDs, real-time), automated isolation tests
- P1: password reset, email verification

**Projects and tasks**

- P0: create/edit/archive projects; tasks with title, description, priority, due date, assignee; status workflow (To Do, In Progress, In Review, Done); filter by status/assignee/priority/due date; cursor pagination
- P1: board and list views, "my tasks", optimistic concurrency
- P2: labels, subtasks, dependencies, attachments

**Real-time collaboration**

- P0: project chat with persisted history, live task updates, authenticated and authorized connections, **reconnect catch-up with no silent loss** (resume from last-seen event ID, fall back to refetch)
- P1: presence, task comments
- P2: typing indicators, mentions, reactions

**Activity and notifications**

- P0: immutable activity records (task created/assigned/status changed, member changes), per-project and per-task feeds, asynchronous in-app notifications with retries and idempotency, unread count
- P1: email notifications
- P2: preferences, mentions, watchers

**Reporting and operations**

- P0: progress by status, overdue tasks, health endpoints, structured JSON logs (request/org/user IDs), core metrics (latency, errors, connections, queue depth)
- P1: workload by member, dashboards and alerts, rate limiting
- P2: throughput trends, distributed tracing

## 6. Non-Functional Requirements

- **Security:** tenant isolation enforced in the data layer (consider Postgres row-level security); authorization on every request and subscription.
- **Performance (targets):** API reads under 200 ms p95; task lists under 300 ms p95 at 10,000 tasks; live events under 1 s.
- **Reliability:** no silent loss of assignments, activity or chat; idempotent retryable jobs; app still works via refetch if real-time fails.
- **Architecture:** modular monolith, stateless app instances, pub/sub-ready real-time layer.
- **Quality:** unit, integration and E2E tests; CI; migrations; ADRs for key decisions.

## 7. Success Metrics

- Zero cross-tenant leaks in the isolation test suite
- 100% of assignment/status changes produce an activity record
- 100% of missed events recovered after simulated disconnects
- Task list p95 within target at 10,000+ tasks
- Zero duplicate notifications under forced retries
- Each major capability documented with design trade-offs; one-command local demo

## 8. Out of Scope (v1)

Billing, mobile apps, microservices, Kubernetes, AI features, custom permission editor, SSO/SCIM/compliance, third-party integrations and public API, attachments, time tracking, custom workflows.

## 9. Delivery Phases

| Phase | Focus                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------- |
| 0     | Foundations: CI, auth, org/membership model, tenant-scoping pattern, isolation tests, health and logging |
| 1     | Projects, tasks, status workflow, filtering, cursor pagination, RBAC                                     |
| 2     | Activity records, async notification pipeline, in-app UI                                                 |
| 3     | Real-time layer, live updates, chat, sequencing, reconnect catch-up, failure tests                       |
| 4     | Reports, metrics, dashboards, rate limiting, load testing                                                |
| 5     | Hardening, docs, ADRs, demo data, deployment                                                             |

## 10. Key Risks

| Risk                                 | Mitigation                                                               |
| ------------------------------------ | ------------------------------------------------------------------------ |
| Missing tenant scope on a query      | Central tenant-scoped data layer, cross-tenant tests, row-level security |
| Lost or reordered real-time events   | Per-project sequence numbers, catch-up endpoint, DB as source of truth   |
| Access persists after member removal | Re-check on subscribe, disconnect on removal                             |
| Duplicate/lost notifications         | Idempotency keys, transactional outbox, retries, dead-letter queue       |
| Scope creep                          | Firm out-of-scope list; extend only when it teaches something            |

## 11. Open Decisions

1. Org-wide or project-level access in v1? (Recommend org-wide.)
2. Can Viewers chat?
3. Global user account with multiple org memberships? (Recommend yes.)
4. WebSockets or SSE plus REST?
5. Fixed statuses or per-project workflows later?
6. Soft vs hard delete; activity retention?
7. Email notifications in v1 or deferred?
8. Tenancy model: shared schema with tenant ID (pragmatic default), schema-per-tenant, or DB-per-tenant?
9. Tech stack and deployment target (record in ADRs).

## 12. Assumptions

Web only, desktop-first, English, single region; under 100 members and 100,000 tasks per org; single-engineer delivery.
