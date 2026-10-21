import express, { type ErrorRequestHandler, type Express } from 'express';
import { z } from 'zod';
import { db } from './db.js';

const uuidSchema = z.string().uuid();
const taskBodySchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    description: z.string().max(10_000).nullable().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  })
  .strict();

function parseUuid(value: string): string | null {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function developmentUserId(): string | null {
  if (process.env.NODE_ENV !== 'development') return null;
  const parsed = uuidSchema.safeParse(process.env.DEV_USER_ID);
  return parsed.success ? parsed.data : null;
}

function resolveUserId(req: express.Request): string | null {
  if (process.env.NODE_ENV === 'development') {
    const headerUser = req.header('X-Dev-User-Id');
    if (headerUser) {
      const parsed = uuidSchema.safeParse(headerUser);
      if (parsed.success) return parsed.data;
    }
  }
  return developmentUserId();
}

async function isOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM organization_members
        WHERE organization_id = $1 AND user_id = $2
     ) AS exists`,
    [organizationId, userId],
  );
  return result.rows[0]?.exists === true;
}

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.status(200).json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  app.use((req, res, next) => {
    const userId = resolveUserId(req);
    if (!userId) {
      res.status(503).json({
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message:
            'A development-only identity is available only in NODE_ENV=development.',
        },
      });
      return;
    }
    res.locals.userId = userId;
    next();
  });

  app.get(
    '/api/v1/organizations/:organizationId/projects/:projectId/tasks',
    async (req, res, next) => {
      try {
        const organizationId = parseUuid(req.params.organizationId ?? '');
        const projectId = parseUuid(req.params.projectId ?? '');
        const userId = res.locals.userId as string;

        if (!organizationId || !projectId) {
          res.status(400).json({
            error: {
              code: 'INVALID_ID',
              message: 'Organization and project IDs must be UUIDs.',
            },
          });
          return;
        }

        if (!(await isOrganizationMember(organizationId, userId))) {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'You are not a member of this organization.',
            },
          });
          return;
        }

        const result = await db.query(
          `SELECT t.id, t.organization_id AS "organizationId",
                  t.project_id AS "projectId", t.title, t.description,
                  t.status, t.priority, t.created_by AS "createdBy",
                  t.assignee_id AS "assigneeId", t.due_at AS "dueAt",
                  t.created_at AS "createdAt", t.updated_at AS "updatedAt"
             FROM tasks t
            WHERE t.organization_id = $1
              AND t.project_id = $2
              AND t.archived_at IS NULL
            ORDER BY t.created_at DESC, t.id DESC
            LIMIT 100`,
          [organizationId, projectId],
        );

        res.status(200).json({ data: result.rows });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/organizations/:organizationId/projects/:projectId/tasks',
    async (req, res, next) => {
      try {
        const organizationId = parseUuid(req.params.organizationId ?? '');
        const projectId = parseUuid(req.params.projectId ?? '');
        const userId = res.locals.userId as string;

        if (!organizationId || !projectId) {
          res.status(400).json({
            error: {
              code: 'INVALID_ID',
              message: 'Organization and project IDs must be UUIDs.',
            },
          });
          return;
        }

        const body = taskBodySchema.safeParse(req.body);
        if (!body.success) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request body is invalid.',
              details: body.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              })),
            },
          });
          return;
        }

        if (!(await isOrganizationMember(organizationId, userId))) {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'You are not a member of this organization.',
            },
          });
          return;
        }

        const { title, description, priority, assigneeId } = body.data;
        const result = await db.query(
          `INSERT INTO tasks (
             organization_id, project_id, title, description, priority,
             created_by, assignee_id
           )
           SELECT p.organization_id, p.id, $4, $5, $6, $3, $7
             FROM projects p
            WHERE p.organization_id = $1
              AND p.id = $2
              AND p.archived_at IS NULL
              AND EXISTS (
                SELECT 1 FROM organization_members creator
                 WHERE creator.organization_id = p.organization_id
                   AND creator.user_id = $3
              )
              AND (
                $7::uuid IS NULL OR EXISTS (
                  SELECT 1 FROM organization_members assignee
                   WHERE assignee.organization_id = p.organization_id
                     AND assignee.user_id = $7
                )
              )
           RETURNING id, organization_id AS "organizationId",
                     project_id AS "projectId", title, description,
                     status, priority, created_by AS "createdBy",
                     assignee_id AS "assigneeId", due_at AS "dueAt",
                     created_at AS "createdAt", updated_at AS "updatedAt"`,
          [
            organizationId,
            projectId,
            userId,
            title,
            description ?? null,
            priority ?? 'medium',
            assigneeId ?? null,
          ],
        );

        if (result.rowCount !== 1) {
          res.status(404).json({
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project was not found.',
            },
          });
          return;
        }

        res.status(201).json({ data: result.rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON.',
        },
      });
      return;
    }

    console.error('Unhandled request error', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  };
  app.use(errorHandler);

  return app;
}
