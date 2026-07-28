const API_BASE = '/api/v1';

let state = {
  token: localStorage.getItem('token') || null,
  user: null,
  activeLapgiatId: null
};

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filterDate').value = '2026-06-24';
  document.getElementById('inputTanggal').value = today;

  if (state.token) {
    fetchProfile();
  } else {
    showView('loginView');
  }

  // Hash Router Listener
  window.addEventListener('hashchange', handleRoute);
});

function showView(viewId) {
  ['loginView', 'dashboardView', 'exportView'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === viewId) ? 'block' : 'none';
  });

  const navbar = document.getElementById('navbar');
  if (navbar) navbar.style.display = (viewId === 'loginView') ? 'none' : 'flex';
}

function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  if (!state.token) {
    showView('loginView');
    return;
  }

  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  if (hash === '#export') {
    showView('exportView');
    document.getElementById('navExport')?.classList.add('active');
    loadPdfPreview();
  } else {
    showView('dashboardView');
    document.getElementById('navDashboard')?.classList.add('active');
    loadLapgiatData();
  }
}

// 1. AUTHENTICATION HANDLERS
async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('loginUsername').value;
  const passwordInput = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'Login gagal.');
      return;
    }

    state.token = data.data.token;
    state.user = data.data.user;
    localStorage.setItem('token', state.token);

    updateNavbarUser();
    window.location.hash = '#dashboard';
    handleRoute();
  } catch (err) {
    alert('Terjadi kesalahan jaringan.');
  }
}

async function fetchProfile() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (!data.success) {
      logout();
      return;
    }

    state.user = data.data;
    updateNavbarUser();
    handleRoute();
  } catch (err) {
    logout();
  }
}

function updateNavbarUser() {
  if (!state.user) return;
  document.getElementById('navUserName').innerText = state.user.nama || state.user.username;
  document.getElementById('navUserRole').innerText = state.user.role;
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  showView('loginView');
}

// 2. LAPGIAT DATA HANDLERS
async function loadLapgiatData() {
  const tanggal = document.getElementById('filterDate').value;
  const jenjang = document.getElementById('filterJenjang').value;
  const status = document.getElementById('filterStatus').value;

  let url = `${API_BASE}/lapgiat?`;
  if (tanggal) url += `tanggal=${tanggal}&`;
  if (jenjang) url += `jenjang=${jenjang}&`;
  if (status) url += `status=${status}&`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (data.success) {
      renderLapgiatTable(data.data);
      updateDashboardStats(data.data);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderLapgiatTable(items) {
  const tbody = document.getElementById('lapgiatTableBody');
  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 2rem;">Belum ada data laporan kegiatan untuk filter ini.</td></tr>`;
    return;
  }

  items.forEach((item, index) => {
    const tr = document.createElement('tr');

    const statusBadgeClass = {
      'APPROVED': 'badge-approved',
      'SUBMITTED': 'badge-submitted',
      'REVISED': 'badge-revised',
      'REJECTED': 'badge-rejected'
    }[item.status] || 'badge-submitted';

    const isPengurus = state.user && (state.user.role === 'PENGURUS_DAERAH' || state.user.role === 'SUPER_ADMIN');

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${item.satdik ? item.satdik.nama : '-'}</strong></td>
      <td>${item.tanggalKegiatan}</td>
      <td>${item.uraianKegiatan}</td>
      <td>${item.keteranganPeserta}</td>
      <td><span class="badge ${statusBadgeClass}">${item.status}</span></td>
      <td>
        ${isPengurus ? `<button class="btn-primary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="openReviewModal('${item.id}')">Review</button>` : `<span style="font-size: 0.8rem; color: #64748b;">-</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateDashboardStats(items) {
  document.getElementById('statTotalLapgiat').innerText = items.length;
  document.getElementById('statApprovedCount').innerText = items.filter(i => i.status === 'APPROVED').length;
  document.getElementById('statRevisedCount').innerText = items.filter(i => i.status === 'REVISED').length;
}

// 3. CREATE LAPGIAT MODAL
function openCreateModal() {
  document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
  document.getElementById('createModal').style.display = 'none';
}

function previewImages(event) {
  const container = document.getElementById('photoPreviewContainer');
  container.innerHTML = '';
  const files = event.target.files;

  for (let file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'preview-item';
      container.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

async function submitLapgiat(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('tanggalKegiatan', document.getElementById('inputTanggal').value);
  formData.append('uraianKegiatan', document.getElementById('inputUraian').value);
  formData.append('keteranganPeserta', document.getElementById('inputKeterangan').value);

  const fileInput = document.getElementById('inputPhotos');
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('photos', fileInput.files[i]);
  }

  try {
    const res = await fetch(`${API_BASE}/lapgiat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` },
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      alert('Laporan berhasil dikirim!');
      closeCreateModal();
      loadLapgiatData();
    } else {
      alert(data.message || 'Gagal mengirim laporan.');
    }
  } catch (err) {
    alert('Terjadi kesalahan saat pengiriman.');
  }
}

// 4. APPROVAL / REVIEW MODAL
async function openReviewModal(id) {
  state.activeLapgiatId = id;
  try {
    const res = await fetch(`${API_BASE}/lapgiat/${id}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (data.success) {
      const item = data.data;
      document.getElementById('reviewDetails').innerHTML = `
        <p><strong>Satdik:</strong> ${item.satdik ? item.satdik.nama : '-'}</p>
        <p><strong>Tanggal:</strong> ${item.tanggalKegiatan}</p>
        <p><strong>Kegiatan:</strong> ${item.uraianKegiatan}</p>
        <p><strong>Keterangan:</strong> ${item.keteranganPeserta}</p>
      `;
      document.getElementById('reviewNotes').value = item.notes || '';
      document.getElementById('reviewModal').style.display = 'flex';
    }
  } catch (err) {
    alert('Gagal memuat detail.');
  }
}

function closeReviewModal() {
  document.getElementById('reviewModal').style.display = 'none';
}

async function processApproval(status) {
  if (!state.activeLapgiatId) return;
  const notes = document.getElementById('reviewNotes').value;

  try {
    const res = await fetch(`${API_BASE}/lapgiat/${state.activeLapgiatId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ status, notes })
    });

    const data = await res.json();
    if (data.success) {
      alert(`Status laporan berhasil diperbarui menjadi ${status}!`);
      closeReviewModal();
      loadLapgiatData();
    } else {
      alert(data.message || 'Gagal memperbarui status.');
    }
  } catch (err) {
    alert('Terjadi kesalahan.');
  }
}

// 5. EXPORT HANDLERS
function loadPdfPreview() {
  const date = document.getElementById('exportDate').value || '2026-06-24';
  const iframe = document.getElementById('pdfPreviewFrame');
  iframe.src = `${API_BASE}/export/pdf?tanggal=${date}&token=${state.token}`;
}

async function downloadPdf() {
  const date = document.getElementById('exportDate').value || '2026-06-24';
  try {
    const res = await fetch(`${API_BASE}/export/pdf?tanggal=${date}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lapgiat_${date}.pdf`;
    a.click();
  } catch (err) {
    alert('Gagal mengunduh PDF.');
  }
}

async function downloadExcel() {
  const date = document.getElementById('exportDate').value || '2026-06-24';
  try {
    const res = await fetch(`${API_BASE}/export/excel?tanggal=${date}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) {
      const jsonStr = JSON.stringify(data.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lapgiat_Rekapan_${date}.json`;
      a.click();
    }
  } catch (err) {
    alert('Gagal mengunduh Excel.');
  }
}
