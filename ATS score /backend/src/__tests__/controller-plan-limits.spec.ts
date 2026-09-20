import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CoverLetterController } from '../modules/cover-letter/cover-letter.controller';
import { InterviewController } from '../modules/interview/interview.controller';
import { BatchController } from '../modules/batch/batch.controller';
import { ApiKeysController } from '../modules/api-keys/api-keys.controller';
import { ResumeController } from '../modules/resume/resume.controller';

// Fix 11: each route checks the plan limit BEFORE doing any (paid) work, and a refusal stops the work.
const user = { id: 'u1', email: 'u@x.co' };
const file = { buffer: Buffer.from('x'), originalname: 'r.pdf', mimetype: 'application/pdf', size: 1 } as Express.Multer.File;

const setup = <T>(build: (work: Record<string, jest.Mock>, subscription: { checkLimit: jest.Mock }) => T, refuse: boolean) => {
  const calls: string[] = [];
  const work = new Proxy({} as Record<string, jest.Mock>, {
    get: (target, key: string) => (target[key] ??= jest.fn(async () => { calls.push(`work:${key}`); return { ok: true }; })),
  });
  const subscription = { checkLimit: jest.fn(async () => { calls.push('check'); if (refuse) throw new ForbiddenException('limit'); return true; }) };
  return { controller: build(work, subscription), work, subscription, calls };
};

describe.each([
  ['cover-letters/generate', 'coverLettersPerMonth', undefined,
    (w: never, s: never) => new CoverLetterController(w, s), (c: CoverLetterController) => c.generate({} as never, user)],
  ['interview/generate', 'interviewsPerMonth', undefined,
    (w: never, s: never) => new InterviewController(w, s), (c: InterviewController) => c.generate({} as never, user)],
  ['batch/analyze', 'batchJDsPerRun', 4,
    (w: never, s: never) => new BatchController(w, s), (c: BatchController) => c.analyze({ jobDescriptions: [1, 2, 3, 4] } as never, user)],
  ['POST api-keys', 'apiKeysMax', undefined,
    (w: never, s: never) => new ApiKeysController(w, s), (c: ApiKeysController) => c.createKey({ name: 'k' }, user)],
  ['POST resumes (logged in)', 'analysesPerMonth', undefined,
    (w: never, s: never) => new ResumeController(w, s),
    (c: ResumeController) => c.uploadAndEnqueue(file, { domain: 'd', name: 'n', email: 'e@x.co' } as never, user)],
] as const)('%s', (_label, feature, requested, build, call) => {
  const expectedArgs = requested === undefined ? ['u1', feature] : ['u1', feature, requested];

  it('checks the plan limit first, then does the work', async () => {
    const { controller, subscription, calls } = setup(build as never, false);
    await (call as (c: unknown) => Promise<unknown>)(controller);
    expect(subscription.checkLimit).toHaveBeenCalledWith(...expectedArgs);
    expect(calls[0]).toBe('check');
    expect(calls.some(c => c.startsWith('work:'))).toBe(true);
  });

  it('does NOT do the work when the limit is reached', async () => {
    const { controller, calls } = setup(build as never, true);
    await expect((call as (c: unknown) => Promise<unknown>)(controller)).rejects.toThrow(ForbiddenException);
    expect(calls).toEqual(['check']);
  });
});

describe('POST resumes: signed-out visitors and bad requests', () => {
  it('a signed-out upload skips the plan check (no plan) and still goes through', async () => {
    const { controller, subscription, calls } = setup((w, s) => new ResumeController(w as never, s as never), true);
    await controller.uploadAndEnqueue(file, { domain: 'd', name: 'n', email: 'e@x.co' } as never, null);
    expect(subscription.checkLimit).not.toHaveBeenCalled();
    expect(calls).toContain('work:enqueue');
  });

  it('a request with no file still gets the 400 first, without a plan check', async () => {
    const { controller, subscription } = setup((w, s) => new ResumeController(w as never, s as never), false);
    await expect(controller.uploadAndEnqueue(undefined, {} as never, user)).rejects.toThrow(BadRequestException);
    expect(subscription.checkLimit).not.toHaveBeenCalled();
  });
});
