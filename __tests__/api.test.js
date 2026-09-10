const request = require('supertest');
const { app, server } = require('../server');
jest.setTimeout(30000);
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
afterAll(async () => {
  await request(app).post('/api/reset');
  server.close();
});
describe('report poller api bugs', () => {
// Bug 1
  test('new job starts with progress 0', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const res = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('QUEUED');
    expect(res.body.progress).toBe(0);
  });
// Bug 2
  test('rejects bad reportType with 400', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    let r = await agent.post('/api/reports').send({ reportType: 'WRONG' });
    expect(r.status).toBe(400);
    r = await agent.post('/api/reports').send({ reportType: 'summary' });
    expect(r.status).toBe(400);
    r = await agent.post('/api/reports').send({ reportType: '' });
    expect(r.status).toBe(400);
    r = await agent.post('/api/reports').send({});
    expect(r.status).toBe(400);
  });
// Bug 3
  test('first job still becomes DONE after second job created', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const first = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    const id1 = first.body.jobId;
    await sleep(300);
    await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    await sleep(4500);
    const check = await agent.get('/api/reports/' + id1);
    expect(check.body.status).toBe('DONE');
  });
// Bug 4
  test('download returns 200 with content', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const created = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    await sleep(4500);
    const dl = await agent.get('/api/reports/' + created.body.jobId + '/download');
    expect(dl.status).toBe(200);
    const text = dl.body.content || dl.body.data;
    expect(text).toBeDefined();
  });
// Bug 5
  test('can download same report twice', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const created = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    await sleep(4500);
    const id = created.body.jobId;
    const one = await agent.get('/api/reports/' + id + '/download');
    expect(one.status).toBe(200);
    const two = await agent.get('/api/reports/' + id + '/download');
    expect(two.status).toBe(200);
    expect(two.body.content || two.body.data).toBe(one.body.content || one.body.data);
  });
// Bug 8
  test('isDownloadReady is true once DONE', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const created = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    await sleep(4500);
    const g = await agent.get('/api/reports/' + created.body.jobId);
    expect(g.body.status).toBe('DONE');
    expect(g.body.isDownloadReady).toBe(true);
  });
// Bug 9
  test('progress never goes past 100', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const created = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    await sleep(4500);
    const g = await agent.get('/api/reports/' + created.body.jobId);
    expect(g.body.status).toBe('DONE');
    expect(g.body.progress).toBe(100);
  });
// Bug 10
  test('unknown job id gives 404', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const g = await agent.get('/api/reports/does-not-exist-123');
    expect(g.status).toBe(404);
  });
// Bug 12
  test('cannot download while PROCESSING', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const created = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
    await sleep(1600);
    const mid = await agent.get('/api/reports/' + created.body.jobId);
    expect(['QUEUED', 'PROCESSING']).toContain(mid.body.status);
    const dl = await agent.get('/api/reports/' + created.body.jobId + '/download');
    expect(dl.status).toBe(409);
    const bad = await agent.get('/api/reports/nope-not-here/download');
    expect(bad.status).toBe(404);
  });
// Bug 14
  test('job ids never repeat', async () => {
    const agent = request.agent(app);
    await agent.post('/api/reset');
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const r = await agent.post('/api/reports').send({ reportType: 'SUMMARY' });
      ids.push(r.body.jobId);
    }
    expect(new Set(ids).size).toBe(5);
    expect(ids).not.toContain('job-0');
  });
});