INSERT INTO organizations (id, name)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'TaskManagement Demo'
);

INSERT INTO users (id, email, display_name)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'developer@example.test',
  'Local Developer'
);

INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'owner'
);

INSERT INTO projects (id, organization_id, name, created_by)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'First Project',
  '22222222-2222-4222-8222-222222222222'
);
