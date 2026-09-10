const requestBtn = document.getElementById('request-btn');
const reportTypeSel = document.getElementById('report-type');
const jobIdEl = document.getElementById('job-id');
const jobStatusEl = document.getElementById('job-status');
const progressFillEl = document.getElementById('progress-fill');
const progressTextEl = document.getElementById('progress-text');
const downloadBtn = document.getElementById('download-btn');
const downloadOutput = document.getElementById('download-output');
let pollTimer = null;
let currentJobId = null;
function renderJob(job) {
  const id = job.id || job.jobId;
  jobIdEl.textContent = id;
  jobStatusEl.textContent = job.status;
  jobStatusEl.className = 'badge status-' + job.status.toLowerCase();
  progressFillEl.style.width = job.progress + '%';
  progressTextEl.textContent = job.progress + '%';
  downloadBtn.disabled = job.status !== 'DONE';
}
function startPolling(jobId) {
  currentJobId = jobId;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const res = await fetch(`/api/reports/${jobId}`);
    const job = await res.json();
    const gotId = job.id || job.jobId;
    if (gotId !== currentJobId) return;
    renderJob(job);
    if (job.status === 'DONE') clearInterval(pollTimer);
  }, 1000);
}
requestBtn.addEventListener('click', async () => {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportType: reportTypeSel.value })
  });
  const body = await res.json();
  downloadOutput.classList.add('hidden');
  renderJob({ id: body.jobId, status: body.status, progress: body.progress });
  startPolling(body.jobId);
});
downloadBtn.addEventListener('click', async () => {
  const jobId = jobIdEl.textContent;
  const res = await fetch(`/api/reports/${jobId}/download`);
  const body = await res.json();
  downloadOutput.textContent = res.ok ? (body.content || body.data) : `Error: ${body.error}`;
  downloadOutput.classList.remove('hidden');
});
(() => {
  const pending = sessionStorage.getItem('__toolingToast');
  if (pending) {
    sessionStorage.removeItem('__toolingToast');
    const t = document.createElement('div');
    t.className = 'tooling-toast';
    t.textContent = pending;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await fetch('/api/reset', { method: 'POST' });
      sessionStorage.setItem('__toolingToast', 'Data reset');
      location.reload();
    });
  }
})();