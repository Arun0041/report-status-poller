const request = require('supertest');
const { app, server } = require('../server');

afterAll(async () => {
  await request(app).post('/api/reset');
  server.close();
});

beforeEach(async () => {
  await request(app).post('/api/reset');
});

describe('Report Poller API Tests', () => {
  
  test('new jobs should initialize with progress 0', async () => {
    const res = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    expect(res.status).toBe(201);
    expect(res.body.progress).toBe(0);
  });

  test('should reject requests with invalid report types', async () => {
    const res = await request(app).post('/api/reports').send({ reportType: 'INVALID_TYPE' });
    expect(res.status).toBe(400); 
  });

  test('job IDs should be unique and not cycle back to 0', async () => {
    // create a few jobs to trigger the cycle bug
    await request(app).post('/api/reports').send({ reportType: 'SUMMARY' }); 
    await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    await request(app).post('/api/reports').send({ reportType: 'SUMMARY' }); 
    
    const res = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    expect(res.body.jobId).not.toBe('job-0');
    expect(res.body.jobId).not.toBe('job-1');
  });

  test('progress state should be independent for each job', async () => {
    const res1 = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    
    // give the first job a moment to process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const res2 = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    
    expect(res2.body.status).toBe('QUEUED');
    
    const getRes2 = await request(app).get(`/api/reports/${res2.body.jobId}`);
    expect(getRes2.body.progress).toBeLessThan(100); 
  });

  test('isDownloadReady flag should accurately reflect DONE status', async () => {
    const res = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    const jobId = res.body.jobId;
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const getRes = await request(app).get(`/api/reports/${jobId}`);
    expect(getRes.body.status).toBe('DONE');
    expect(getRes.body.isDownloadReady).toBe(true);
  });

  test('progress tracker should not exceed 100%', async () => {
    const res = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    const jobId = res.body.jobId;
    
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    const getRes = await request(app).get(`/api/reports/${jobId}`);
    expect(getRes.body.status).toBe('DONE');
    expect(getRes.body.progress).toBe(100);
  });

  test('requesting a fake job ID should return a 404', async () => {
    const res = await request(app).get('/api/reports/fake-job-id-999');
    expect(res.status).toBe(404);
  });

  test('successful report download should return 200 OK', async () => {
    const res = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    const jobId = res.body.jobId;
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const dlRes = await request(app).get(`/api/reports/${jobId}/download`);
    expect(dlRes.status).toBe(200); 
  });

  test('users should be able to download the same report multiple times', async () => {
    const res = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    const jobId = res.body.jobId;
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await request(app).get(`/api/reports/${jobId}/download`); 
    const dlRes2 = await request(app).get(`/api/reports/${jobId}/download`); 
    
    expect(dlRes2.status).toBe(200); 
  });

  test('downloading an incomplete report should return 409 Conflict', async () => {
    const res = await request(app).post('/api/reports').send({ reportType: 'SUMMARY' });
    const jobId = res.body.jobId;
    
    const dlRes = await request(app).get(`/api/reports/${jobId}/download`);
    expect(dlRes.status).toBe(409); 
  });
});
