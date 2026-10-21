BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL
        CHECK (length(trim(name)) BETWEEN 1 AND 120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL,
    display_name VARCHAR(100) NOT NULL
        CHECK (length(trim(display_name)) BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE organization_members (
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL
        CHECK (length(trim(name)) BETWEEN 1 AND 120),
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT projects_id_org_unique UNIQUE (id, organization_id),
    CONSTRAINT projects_creator_membership_fk
        FOREIGN KEY (organization_id, created_by)
        REFERENCES organization_members (organization_id, user_id)
        ON DELETE RESTRICT
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    title VARCHAR(100) NOT NULL
        CHECK (length(trim(title)) BETWEEN 1 AND 100),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_by UUID NOT NULL,
    assignee_id UUID,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT tasks_project_org_fk
        FOREIGN KEY (project_id, organization_id)
        REFERENCES projects (id, organization_id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_creator_membership_fk
        FOREIGN KEY (organization_id, created_by)
        REFERENCES organization_members (organization_id, user_id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_assignee_membership_fk
        FOREIGN KEY (organization_id, assignee_id)
        REFERENCES organization_members (organization_id, user_id)
        ON DELETE RESTRICT
);

CREATE INDEX projects_org_created_idx
    ON projects (organization_id, created_at DESC)
    WHERE archived_at IS NULL;

CREATE INDEX tasks_project_created_idx
    ON tasks (project_id, created_at DESC, id DESC)
    WHERE archived_at IS NULL;

CREATE INDEX tasks_org_status_created_idx
    ON tasks (organization_id, status, created_at DESC)
    WHERE archived_at IS NULL;

CREATE INDEX tasks_org_assignee_idx
    ON tasks (organization_id, assignee_id)
    WHERE assignee_id IS NOT NULL AND archived_at IS NULL;

COMMIT;
