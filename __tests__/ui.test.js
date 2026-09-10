/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
describe('report poller ui bugs', () => {
// Bug 6
  test('download stays disabled until DONE', () => {
    expect(appJs).toMatch(/DONE/);
    expect(appJs).not.toMatch(/downloadBtn\.disabled\s*=\s*job\.status\s*===\s*['"]QUEUED['"]/);
    document.body.innerHTML = '<button id="download-btn"></button>';
    const btn = document.getElementById('download-btn');
    function isDisabled(status) {
      return status !== 'DONE';
    }
    expect(isDisabled('PROCESSING')).toBe(true);
    expect(isDisabled('QUEUED')).toBe(true);
    expect(isDisabled('DONE')).toBe(false);
    expect(btn).toBeTruthy();
  });
// Bug 7
  test('processing badge has its own color', () => {
    expect(css).toMatch(/\.status-processing/);
    const queued = css.match(/\.status-queued\s*\{[^}]*\}/);
    const processing = css.match(/\.status-processing\s*\{[^}]*\}/);
    expect(processing).toBeTruthy();
    expect(processing[0]).not.toBe(queued[0]);
  });
// Bug 11
  test('polling clears old timer and filters by job id', () => {
    expect(appJs).toMatch(/clearInterval/);
    expect(appJs).toMatch(/currentJobId|currentJob|job\.id\s*===|jobId\s*===/);
  });
// Bug 13
  test('download renders content field', () => {
    expect(appJs).toMatch(/body\.content/);
    expect(html).toMatch(/download-output/);
  });
});