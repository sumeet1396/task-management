export const SEED = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  memberUserId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
} as const;

export const OUTSIDER_USER_ID = '44444444-4444-4444-8444-444444444444';

export function tasksPath(organizationId: string, projectId: string): string {
  return `/api/v1/organizations/${organizationId}/projects/${projectId}/tasks`;
}
