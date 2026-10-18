import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, type PrismaClientLike } from './app.js';

type User = { id: string; email: string; passwordHash: string; createdAt: Date };
type Team = { id: string; name: string; createdAt: Date };
type Member = { id: string; userId: string; teamId: string; role: 'MEMBER' | 'TEAM_LEAD' | 'ADMIN' };
type Issue = { id: string; key: string; teamId: string; title: string; description: string; status: string; priority: string; version: number; dueDate: Date | null; createdAt: Date; updatedAt: Date; assigneeId: string | null };
type Activity = { id: string; issueId: string; actorId: string; action: string; fromValue: string | null; toValue: string | null; metadata: unknown; createdAt: Date };
type Idempotency = { idempotencyKey: string; userId: string; operation: string; response: unknown; createdAt: Date };

function makePrisma() {
  const users: User[] = [];
  const teams: Team[] = [];
  const members: Member[] = [];
  const issues: Issue[] = [];
  const activities: Activity[] = [];
  const idempotencies: Idempotency[] = [];
  const prisma: PrismaClientLike = {
    user: {
      findUnique: async ({ where }) => users.find((user) => (where.email && user.email === where.email) || (where.id && user.id === where.id)) ?? null,
      create: async ({ data }) => { const user = { id: `user-${users.length + 1}`, ...data, createdAt: new Date() }; users.push(user); return user; },
    },
    team: {
      create: async ({ data }) => { const team = { id: `00000000-0000-4000-8000-${String(teams.length + 1).padStart(12, '0')}`, ...data, createdAt: new Date() }; teams.push(team); return team; },
    },
    teamMember: {
      create: async ({ data }) => { const member = { id: `member-${members.length + 1}`, ...data, role: data.role }; members.push(member); return member; },
      findFirst: async ({ where }) => members.find((member) => member.userId === where.userId && member.teamId === where.teamId) ?? null,
    },
    issue: {
      findMany: async ({ where }) => issues.filter((issue) => Object.entries(where ?? {}).every(([key, value]) => issue[key as keyof Issue] === value)),
      findUnique: async ({ where }) => issues.find((issue) => issue.id === where.id) ?? null,
      create: async ({ data }) => { const issue = { id: `issue-${issues.length + 1}`, ...data, version: 1, dueDate: null, createdAt: new Date(), updatedAt: new Date() }; issues.push(issue); return issue; },
      updateMany: async ({ where, data }) => { const issue = issues.find((candidate) => Object.entries(where).every(([key, value]) => candidate[key as keyof Issue] === value)); if (!issue) return { count: 0 }; for (const [key, value] of Object.entries(data)) (issue as unknown as Record<string, unknown>)[key] = key === 'version' ? issue.version + 1 : value; issue.updatedAt = new Date(); return { count: 1 }; },
    },
    issueActivity: {
      create: async ({ data }) => { const activity = { id: `activity-${activities.length + 1}`, issueId: data.issueId, actorId: data.actorId, action: data.action, fromValue: data.fromValue ?? null, toValue: data.toValue ?? null, metadata: data.metadata ?? null, createdAt: new Date() }; activities.push(activity); return activity; },
      findMany: async () => activities,
    },
    idempotencyKey: {
      findUnique: async ({ where }) => idempotencies.find((item) => item.idempotencyKey === where.idempotencyKey) ?? null,
      create: async ({ data }) => { const record = { idempotencyKey: data.idempotencyKey, userId: data.userId, operation: data.operation, response: data.response, createdAt: new Date() }; idempotencies.push(record); return record; },
    },
    $transaction: async (callback) => callback(prisma),
  };
  return prisma;
}

describe('operations API', () => {
  it('creates an account and protects scoped issue routes with a token', async () => {
    const app = createApp({ prisma: makePrisma(), jwtSecret: 'test-secret' });
    const signup = await request(app).post('/auth/signup').send({ email: 'owner@example.com', password: 'correct horse battery staple' });
    expect(signup.status).toBe(201);
    expect(signup.body.token).toEqual(expect.any(String));
    expect((await request(app).get('/issues')).status).toBe(401);
    expect((await request(app).get('/issues').query({ teamId: signup.body.team.id }).set('Authorization', `Bearer ${signup.body.token}`)).status).toBe(200);
  });

  it('prevents duplicate create retries, invalid transitions, and stale writes', async () => {
    const app = createApp({ prisma: makePrisma(), jwtSecret: 'test-secret' });
    const signup = await request(app).post('/auth/signup').send({ email: 'owner@example.com', password: 'correct horse battery staple' });
    const headers = { Authorization: `Bearer ${signup.body.token}`, 'Idempotency-Key': 'create-1' };
    const first = await request(app).post('/issues').set(headers).send({ teamId: signup.body.team.id, title: 'Investigate customer report' });
    const retry = await request(app).post('/issues').set(headers).send({ teamId: signup.body.team.id, title: 'Investigate customer report' });
    expect(retry.body.issue.id).toBe(first.body.issue.id);
    expect((await request(app).patch(`/issues/${first.body.issue.id}`).set('Authorization', headers.Authorization).send({ version: 1, status: 'DONE' })).status).toBe(422);
    expect((await request(app).patch(`/issues/${first.body.issue.id}`).set('Authorization', headers.Authorization).send({ version: 1, status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await request(app).patch(`/issues/${first.body.issue.id}`).set('Authorization', headers.Authorization).send({ version: 1, title: 'Stale overwrite' })).status).toBe(409);
  });

  it('allows only one concurrent claim and records activity', async () => {
    const app = createApp({ prisma: makePrisma(), jwtSecret: 'test-secret' });
    const signup = await request(app).post('/auth/signup').send({ email: 'owner@example.com', password: 'correct horse battery staple' });
    const token = signup.body.token as string;
    const created = await request(app).post('/issues').set('Authorization', `Bearer ${token}`).send({ teamId: signup.body.team.id, title: 'Unassigned request' });
    expect((await request(app).post(`/issues/${created.body.issue.id}/claim`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).post(`/issues/${created.body.issue.id}/claim`).set('Authorization', `Bearer ${token}`)).status).toBe(409);
    const activity = await request(app).get(`/issues/${created.body.issue.id}/activity`).set('Authorization', `Bearer ${token}`);
    expect(activity.body.activities.map((item: Activity) => item.action)).toEqual(['created', 'assigned']);
  });
});
