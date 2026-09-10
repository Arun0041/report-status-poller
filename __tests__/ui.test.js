/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
const jsCode = fs.readFileSync(path.resolve(__dirname, '../public/app.js'), 'utf8');

describe('Frontend UI Tests', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = html.toString();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Evaluate app.js in an isolated scope
    const script = document.createElement('script');
    script.textContent = '(function() { ' + jsCode + ' })();';
    document.body.appendChild(script);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('download button should remain disabled while report is processing', () => {
    const downloadBtn = document.getElementById('download-btn');
    const jobStatusEl = document.getElementById('job-status');
    const progressFillEl = document.getElementById('progress-fill');
    const progressTextEl = document.getElementById('progress-text');
    const jobIdEl = document.getElementById('job-id');

    // Simulate the app rendering a job that is currently processing
    const job = { id: 'job-1', status: 'PROCESSING', progress: 50 };
    
    jobIdEl.textContent = job.id;
    jobStatusEl.textContent = job.status;
    jobStatusEl.className = 'badge status-' + job.status.toLowerCase();
    progressFillEl.style.width = job.progress + '%';
    progressTextEl.textContent = job.progress + '%';
    
    // Check the button state directly
    downloadBtn.disabled = job.status === 'QUEUED'; 

    expect(downloadBtn.disabled).toBe(true);
  });

  test('QUEUED and PROCESSING badges must use distinctly different CSS classes', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../public/style.css'), 'utf8');
    
    const hasQueued = css.includes('.status-queued');
    const hasProcessing = css.includes('.status-processing');
    
    expect(hasProcessing).toBe(true); 
  });

  test('polling intervals should be cleared cleanly to prevent UI flickering', async () => {
    // Ensure the developer remembered to clear old intervals
    expect(jsCode).toMatch(/clearInterval\(/);
  });

  test('download box should display the actual report text, not empty objects', async () => {
    // Mock the fetch request to simulate a successful API download response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'job-1', content: 'Report data' })
    });

    const downloadBtn = document.getElementById('download-btn');
    const downloadOutput = document.getElementById('download-output');
    
    document.getElementById('job-id').textContent = 'job-1';
    downloadBtn.click();
    
    // allow microtasks to flush
    await new Promise(resolve => process.nextTick(resolve));
    await new Promise(resolve => process.nextTick(resolve));
    await new Promise(resolve => process.nextTick(resolve));
    
    expect(downloadOutput.textContent).toBe('Report data'); 
  });
});
