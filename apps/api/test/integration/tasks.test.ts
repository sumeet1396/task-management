import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db.js';
import { OUTSIDER_USER_ID, SEED, tasksPath } from '../helpers/constants.js';
import {
  resetTaskData,
  runMigrations,
  withDbClient,
} from '../helpers/setup.js';

const app = createApp();

function memberRequest(method: 'get' | 'post', url: string) {
  return request(app)[method](url).set('X-Dev-User-Id', SEED.memberUserId);
}

function outsiderRequest(method: 'get' | 'post', url: string) {
  return request(app)[method](url).set('X-Dev-User-Id', OUTSIDER_USER_ID);
}

before(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for integration tests');
  }
  await runMigrations();
});

beforeEach(async () => {
  await resetTaskData();
});

after(async () => {
  await db.end();
});

describe('tasks API', () => {
  it('creates and lists tasks for the seeded project', async () => {
    const createResponse = await memberRequest(
      'post',
      tasksPath(SEED.organizationId, SEED.projectId),
    )
      .send({ title: 'Ship Week 1 slice' })
      .expect(201);

    assert.equal(createResponse.body.data.title, 'Ship Week 1 slice');
    assert.equal(createResponse.body.data.projectId, SEED.projectId);

    const listResponse = await memberRequest(
      'get',
      tasksPath(SEED.organizationId, SEED.projectId),
    ).expect(200);

    assert.equal(listResponse.body.data.length, 1);
    assert.equal(listResponse.body.data[0].title, 'Ship Week 1 slice');
  });

  it('returns 400 with a consistent validation shape for invalid titles', async () => {
    const emptyTitle = await memberRequest(
      'post',
      tasksPath(SEED.organizationId, SEED.projectId),
    )
      .send({ title: '   ' })
      .expect(400);

    assert.equal(emptyTitle.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(emptyTitle.body.error.details));

    const tooLong = await memberRequest(
      'post',
      tasksPath(SEED.organizationId, SEED.projectId),
    )
      .send({ title: 'x'.repeat(101) })
      .expect(400);

    assert.equal(tooLong.body.error.code, 'VALIDATION_ERROR');
    assert.equal(tooLong.body.error.message, 'Request body is invalid.');
  });

  it('denies non-members from reading and creating tasks', async () => {
    await outsiderRequest(
      'get',
      tasksPath(SEED.organizationId, SEED.projectId),
    ).expect(403);

    await outsiderRequest(
      'post',
      tasksPath(SEED.organizationId, SEED.projectId),
    )
      .send({ title: 'Should not persist' })
      .expect(403);

    const listResponse = await memberRequest(
      'get',
      tasksPath(SEED.organizationId, SEED.projectId),
    ).expect(200);

    assert.equal(listResponse.body.data.length, 0);
  });
});

describe('PostgreSQL tenant constraints', () => {
  it('rejects cross-organization project/task relationships', async () => {
    await withDbClient(async (client) => {
      const otherOrgId = '55555555-5555-4555-8555-555555555555';
      await client.query(
        `INSERT INTO organizations (id, name) VALUES ($1, 'Other Org')
         ON CONFLICT (id) DO NOTHING`,
        [otherOrgId],
      );

      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO tasks (
               organization_id, project_id, title, created_by
             ) VALUES ($1, $2, 'Cross-org task', $3)`,
            [otherOrgId, SEED.projectId, SEED.memberUserId],
          ),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          return (
            'code' in error && (error as { code: string }).code === '23503'
          );
        },
      );
    });
  });

  it('rejects assignments to users who are not organization members', async () => {
    await withDbClient(async (client) => {
      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO tasks (
               organization_id, project_id, title, created_by, assignee_id
             ) VALUES ($1, $2, 'Bad assignee', $3, $4)`,
            [
              SEED.organizationId,
              SEED.projectId,
              SEED.memberUserId,
              OUTSIDER_USER_ID,
            ],
          ),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          return (
            'code' in error && (error as { code: string }).code === '23503'
          );
        },
      );
    });
  });
});
