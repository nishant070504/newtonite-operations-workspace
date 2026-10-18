import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

type UserRecord = { id: string; email: string; passwordHash: string; createdAt: Date };
type TeamRecord = { id: string; name: string; createdAt: Date };
type MemberRecord = { id: string; userId: string; teamId: string; role: 'MEMBER' | 'TEAM_LEAD' | 'ADMIN' };
type IssueRecord = { id: string; key: string; teamId: string; title: string; description: string; status: string; priority: string; version: number; dueDate: Date | null; createdAt: Date; updatedAt: Date; assigneeId: string | null };
type ActivityRecord = { id: string; issueId: string; actorId: string; action: string; fromValue: string | null; toValue: string | null; metadata: unknown; createdAt: Date };
type IdempotencyRecord = { idempotencyKey: string; userId: string; operation: string; response: unknown; createdAt: Date };

export type PrismaClientLike = {
  user: { findUnique(args: { where: { email?: string; id?: string } }): Promise<UserRecord | null>; create(args: { data: { email: string; passwordHash: string } }): Promise<UserRecord> };
  team: { create(args: { data: { name: string } }): Promise<TeamRecord> };
  teamMember: { create(args: { data: { userId: string; teamId: string; role: MemberRecord['role'] } }): Promise<MemberRecord>; findFirst(args: { where: { userId: string; teamId: string } }): Promise<MemberRecord | null> };
  issue: { findMany(args: { where?: Record<string, unknown>; orderBy: { updatedAt: 'asc' | 'desc' }; select?: Record<string, boolean> }): Promise<IssueRecord[]>; findUnique(args: { where: { id: string } }): Promise<IssueRecord | null>; create(args: { data: { key: string; teamId: string; title: string; description: string; status: string; priority: string; assigneeId: string | null } }): Promise<IssueRecord>; updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>; };
  issueActivity: { create(args: { data: { issueId: string; actorId: string; action: string; fromValue?: string | null; toValue?: string | null; metadata?: unknown } }): Promise<ActivityRecord>; findMany(args: { where: { issueId: string }; orderBy: { createdAt: 'asc' | 'desc' } }): Promise<ActivityRecord[]> };
  idempotencyKey: { findUnique(args: { where: { idempotencyKey: string } }): Promise<IdempotencyRecord | null>; create(args: { data: { idempotencyKey: string; userId: string; operation: string; response: unknown } }): Promise<IdempotencyRecord> };
  $transaction<T>(callback: (transaction: PrismaClientLike) => Promise<T>): Promise<T>;
};

type AppOptions = { prisma: PrismaClientLike; jwtSecret: string };
type AuthRequest = Request & { userId?: string };
type Role = MemberRecord['role'];

const credentialsSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });
const issueSchema = z.object({ teamId: z.string().uuid(), title: z.string().trim().min(1).max(160), description: z.string().trim().max(5000).default(''), priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'), status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'DEPLOYED']).default('TODO') });
const updateIssueSchema = z.object({ version: z.number().int().positive(), title: z.string().trim().min(1).max(160).optional(), description: z.string().trim().max(5000).optional(), priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(), status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'DEPLOYED']).optional() });

const transitions: Record<string, string[]> = {
  BACKLOG: ['TODO'],
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['BLOCKED', 'DONE'],
  BLOCKED: ['TODO', 'IN_PROGRESS'],
  DONE: ['DEPLOYED'],
  DEPLOYED: [],
};

function issueResponse(issue: IssueRecord) {
  return { id: issue.id, key: issue.key, teamId: issue.teamId, title: issue.title, description: issue.description, status: issue.status, priority: issue.priority, version: issue.version, dueDate: issue.dueDate, createdAt: issue.createdAt, updatedAt: issue.updatedAt, assigneeId: issue.assigneeId };
}

function signToken(userId: string, jwtSecret: string) { return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '8h' }); }
function hasRole(role: Role, minimum: Role) { const rank: Record<Role, number> = { MEMBER: 1, TEAM_LEAD: 2, ADMIN: 3 }; return rank[role] >= rank[minimum]; }
function authRequired(jwtSecret: string) {
  return (request: AuthRequest, response: Response, next: NextFunction) => {
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' });
    try {
      const payload = jwt.verify(header.slice(7), jwtSecret);
      if (typeof payload !== 'object' || typeof payload.sub !== 'string') return response.status(401).json({ error: 'Authentication required' });
      request.userId = payload.sub;
      return next();
    } catch { return response.status(401).json({ error: 'Authentication required' }); }
  };
}

async function membership(prisma: PrismaClientLike, userId: string, teamId: string) { return prisma.teamMember.findFirst({ where: { userId, teamId } }); }
function conflict(response: Response, message: string, issue?: IssueRecord | null) { return response.status(409).json({ error: message, ...(issue ? { current: issueResponse(issue) } : {}) }); }

export function createApp({ prisma, jwtSecret }: AppOptions) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  const requireAuth = authRequired(jwtSecret);

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));

  app.post('/auth/signup', async (request, response, next) => {
    try {
      const parsed = credentialsSchema.safeParse(request.body);
      if (!parsed.success) return response.status(400).json({ error: 'Email and password are required' });
      const email = parsed.data.email.toLowerCase();
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return response.status(409).json({ error: 'Unable to create account with those details' });
      const user = await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
      const team = await prisma.team.create({ data: { name: `${email.split('@')[0]}'s workspace` } });
      await prisma.teamMember.create({ data: { userId: user.id, teamId: team.id, role: 'ADMIN' } });
      return response.status(201).json({ token: signToken(user.id, jwtSecret), user: { id: user.id, email: user.email }, team: { id: team.id, name: team.name } });
    } catch (error) { return next(error); }
  });

  app.post('/auth/login', async (request, response, next) => {
    try {
      const parsed = credentialsSchema.safeParse(request.body);
      if (!parsed.success) return response.status(400).json({ error: 'Email and password are required' });
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return response.status(401).json({ error: 'Invalid email or password' });
      return response.json({ token: signToken(user.id, jwtSecret), user: { id: user.id, email: user.email } });
    } catch (error) { return next(error); }
  });

  app.get('/auth/me', requireAuth, async (request: AuthRequest, response, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.userId } });
      if (!user) return response.status(401).json({ error: 'Authentication required' });
      return response.json({ id: user.id, email: user.email });
    } catch (error) { return next(error); }
  });

  app.get('/issues', requireAuth, async (request: AuthRequest, response, next) => {
    try {
      const teamId = typeof request.query.teamId === 'string' ? request.query.teamId : '';
      if (!request.userId || !teamId) return response.status(400).json({ error: 'teamId is required' });
      const member = await membership(prisma, request.userId, teamId);
      if (!member) return response.status(403).json({ error: 'You do not have access to this team' });
      const where: Record<string, unknown> = { teamId };
      if (request.query.scope === 'mine') where.assigneeId = request.userId;
      if (request.query.scope === 'unassigned') where.assigneeId = null;
      const issues = await prisma.issue.findMany({ where, orderBy: { updatedAt: 'desc' }, select: { id: true, key: true, title: true, description: true, status: true, priority: true, version: true, dueDate: true, createdAt: true, updatedAt: true, assigneeId: true, teamId: true } });
      return response.json({ issues: issues.map(issueResponse) });
    } catch (error) { return next(error); }
  });

  app.post('/issues', requireAuth, async (request: AuthRequest, response, next) => {
    try {
      const parsed = issueSchema.safeParse(request.body);
      if (!parsed.success || !request.userId) return response.status(400).json({ error: 'A valid team and issue title are required' });
      const member = await membership(prisma, request.userId, parsed.data.teamId);
      if (!member) return response.status(403).json({ error: 'You do not have access to this team' });
      const idempotencyKey = request.header('idempotency-key');
      const operation = 'create_issue';
      if (idempotencyKey) {
        const previous = await prisma.idempotencyKey.findUnique({ where: { idempotencyKey } });
        if (previous?.userId === request.userId && previous.operation === operation) return response.status(200).json(previous.response);
      }
      const created = await prisma.$transaction(async (transaction) => {
        const issue = await transaction.issue.create({ data: { key: `OPS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, teamId: parsed.data.teamId, title: parsed.data.title, description: parsed.data.description, priority: parsed.data.priority, status: parsed.data.status, assigneeId: null } });
        await transaction.issueActivity.create({ data: { issueId: issue.id, actorId: request.userId as string, action: 'created', toValue: issue.status, metadata: { title: issue.title } } });
        const payload = { issue: issueResponse(issue) };
        if (idempotencyKey) await transaction.idempotencyKey.create({ data: { idempotencyKey, userId: request.userId as string, operation, response: payload } });
        return payload;
      });
      return response.status(idempotencyKey ? 201 : 201).json(created);
    } catch (error) { return next(error); }
  });

  app.post('/issues/:id/claim', requireAuth, async (request: AuthRequest, response, next) => {
    try {
      if (!request.userId) return response.status(401).json({ error: 'Authentication required' });
      const issue = await prisma.issue.findUnique({ where: { id: String(request.params.id) } });
      if (!issue) return response.status(404).json({ error: 'Issue not found' });
      if (!(await membership(prisma, request.userId, issue.teamId))) return response.status(403).json({ error: 'You do not have access to this team' });
      const result = await prisma.issue.updateMany({ where: { id: issue.id, assigneeId: null }, data: { assigneeId: request.userId, version: { increment: 1 } } });
      if (result.count !== 1) return conflict(response, 'This issue was already claimed', await prisma.issue.findUnique({ where: { id: issue.id } }));
      const claimed = await prisma.issue.findUnique({ where: { id: issue.id } });
      await prisma.issueActivity.create({ data: { issueId: issue.id, actorId: request.userId, action: 'assigned', toValue: request.userId } });
      return response.json({ issue: issueResponse(claimed as IssueRecord) });
    } catch (error) { return next(error); }
  });

  app.patch('/issues/:id', requireAuth, async (request: AuthRequest, response, next) => {
    try {
      if (!request.userId) return response.status(401).json({ error: 'Authentication required' });
      const parsed = updateIssueSchema.safeParse(request.body);
      if (!parsed.success) return response.status(400).json({ error: 'version and a valid issue update are required' });
      const existing = await prisma.issue.findUnique({ where: { id: String(request.params.id) } });
      if (!existing) return response.status(404).json({ error: 'Issue not found' });
      const member = await membership(prisma, request.userId, existing.teamId);
      if (!member) return response.status(403).json({ error: 'You do not have access to this team' });
      if (!hasRole(member.role, 'TEAM_LEAD') && existing.assigneeId !== request.userId) return response.status(403).json({ error: 'You are not allowed to update this issue' });
      if (parsed.data.status && parsed.data.status !== existing.status && !transitions[existing.status]?.includes(parsed.data.status)) return response.status(422).json({ error: `Cannot move an issue from ${existing.status} to ${parsed.data.status}` });
      const data: Record<string, unknown> = { version: { increment: 1 } };
      for (const field of ['title', 'description', 'priority', 'status'] as const) if (parsed.data[field] !== undefined) data[field] = parsed.data[field];
      const result = await prisma.issue.updateMany({ where: { id: existing.id, version: parsed.data.version }, data });
      if (result.count !== 1) return conflict(response, 'This issue changed since you opened it', await prisma.issue.findUnique({ where: { id: existing.id } }));
      const updated = await prisma.issue.findUnique({ where: { id: existing.id } });
      await prisma.issueActivity.create({ data: { issueId: existing.id, actorId: request.userId, action: parsed.data.status ? 'status_changed' : 'updated', fromValue: parsed.data.status ? existing.status : null, toValue: parsed.data.status ?? null, metadata: { fields: Object.keys(parsed.data).filter((field) => field !== 'version') } } });
      return response.json({ issue: issueResponse(updated as IssueRecord) });
    } catch (error) { return next(error); }
  });

  app.get('/issues/:id/activity', requireAuth, async (request: AuthRequest, response, next) => {
    try {
      const issue = await prisma.issue.findUnique({ where: { id: String(request.params.id) } });
      if (!issue || !request.userId || !(await membership(prisma, request.userId, issue.teamId))) return response.status(404).json({ error: 'Issue not found' });
      const activities = await prisma.issueActivity.findMany({ where: { issueId: issue.id }, orderBy: { createdAt: 'asc' } });
      return response.json({ activities });
    } catch (error) { return next(error); }
  });

  app.use(errorHandler);
  return app;
}

function errorHandler(error: unknown, request: Request, response: Response, next: NextFunction) {
  void error; void request; void next;
  return response.status(500).json({ error: 'Something went wrong' });
}
