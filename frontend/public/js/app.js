const API_BASE = '/api/v1';

let state = {
  token: localStorage.getItem('token') || null,
  user: null,
  activeLapgiatId: null,
  editingLapgiatId: null
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(value, maxLength = 70) {
  const raw = String(value || '');
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength)}...`;
}

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const filterDate = document.getElementById('filterDate');
  if (filterDate) filterDate.value = '2026-06-24';
  const inputTanggal = document.getElementById('inputTanggal');
  if (inputTanggal) inputTanggal.value = today;

  if (state.token) {
    fetchProfile();
  } else {
    showView('loginView');
  }

  // Hash Router Listener
  window.addEventListener('hashchange', handleRoute);

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeNavMenu);
  });
});

function showView(viewId) {
  ['loginView', 'dashboardView', 'exportView'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === viewId) ? 'block' : 'none';
  });

  const navbar = document.getElementById('navbar');
  if (navbar) navbar.style.display = (viewId === 'loginView') ? 'none' : 'flex';

  const mobileActionBar = document.getElementById('mobileActionBar');
  if (mobileActionBar) {
    mobileActionBar.style.display = viewId === 'dashboardView' ? 'flex' : 'none';
  }

  closeNavMenu();
}

function toggleNavMenu() {
  const menu = document.getElementById('navbarMenu');
  if (!menu) return;
  menu.classList.toggle('is-open');
}

function closeNavMenu() {
  const menu = document.getElementById('navbarMenu');
  if (!menu) return;
  menu.classList.remove('is-open');
}

function setMobileActionState(active) {
  const filterBtn = document.getElementById('mobileFilterBtn');
  const createBtn = document.getElementById('mobileCreateBtn');

  if (filterBtn) filterBtn.classList.toggle('is-active', active === 'filter');
  if (createBtn) createBtn.classList.toggle('is-active', active === 'create');
}

function scrollToDashboardFilter() {
  const filterCard = document.getElementById('dashboardFilterCard');
  if (!filterCard) return;

  setMobileActionState('filter');

  filterCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const filterDate = document.getElementById('filterDate');
  if (filterDate) {
    setTimeout(() => {
      filterDate.focus();
    }, 250);
  }

  setTimeout(() => {
    setMobileActionState('');
  }, 1400);
}

function setDashboardSummary(items) {
  const satdikCount = document.getElementById('statSatdikCount');
  if (satdikCount) {
    satdikCount.innerText = items.length > 0 ? new Set(items.map(i => i.satdik?.id).filter(Boolean)).size : 0;
  }
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
  closeNavMenu();
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
      setDashboardSummary(data.data);
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

    const canEdit = state.user && (state.user.role === 'KASATDIK' || state.user.role === 'PENGURUS_DAERAH' || state.user.role === 'SUPER_ADMIN');
    const isOwnReport = state.user && item.createdBy === state.user.id;
    const shortUraian = truncateText(item.uraianKegiatan, 80);
    const shortPeserta = truncateText(item.keteranganPeserta, 70);

    tr.innerHTML = `
      <td data-label="No">${index + 1}</td>
      <td data-label="Satuan Pendidikan"><strong>${item.satdik ? item.satdik.nama : '-'}</strong></td>
      <td data-label="Tanggal">${item.tanggalKegiatan}</td>
      <td data-label="Uraian Kegiatan"><span class="lapgiat-ellipsis" title="${escapeHtml(item.uraianKegiatan || '')}">${escapeHtml(shortUraian)}</span></td>
      <td data-label="Keterangan Peserta"><span class="lapgiat-ellipsis" title="${escapeHtml(item.keteranganPeserta || '')}">${escapeHtml(shortPeserta)}</span></td>
      <td data-label="Status"><span class="badge ${statusBadgeClass}">${item.status}</span></td>
      <td data-label="Aksi">
        ${isPengurus ? `<button class="btn-primary btn-inline" onclick="openReviewModal('${item.id}')">Review</button>` : ''}
        ${canEdit && isOwnReport ? `<button class="btn-primary btn-inline" style="background: #2563eb;" onclick="openEditModal('${item.id}')">Update</button>` : ''}
        <button class="btn-primary btn-inline" style="background: #10b981;" onclick="openReviewModal('${item.id}')">Preview</button>
        <button class="btn-primary btn-inline btn-detail" onclick="openReviewModal('${item.id}')">Detail</button>
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
  setMobileActionState('create');
  document.getElementById('createModal').style.display = 'flex';
  document.getElementById('createModalTitle').innerText = 'Buat Laporan Kegiatan Harian';
  document.getElementById('submitLapgiatBtn').innerText = 'Kirim Laporan';
  document.getElementById('createLapgiatForm').reset();
  document.getElementById('photoPreviewContainer').innerHTML = '';
  state.editingLapgiatId = null;
}

function closeCreateModal() {
  setMobileActionState('');
  document.getElementById('createModal').style.display = 'none';
  document.getElementById('createLapgiatForm').reset();
  document.getElementById('photoPreviewContainer').innerHTML = '';
  state.editingLapgiatId = null;
}

function openEditModal(id) {
  state.editingLapgiatId = id;
  document.getElementById('createModal').style.display = 'flex';
  document.getElementById('createModalTitle').innerText = 'Perbarui Laporan Kegiatan';
  document.getElementById('submitLapgiatBtn').innerText = 'Simpan Perubahan';

  fetch(`${API_BASE}/lapgiat/${id}`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.message || 'Gagal memuat laporan');
      const item = data.data;
      document.getElementById('inputTanggal').value = item.tanggalKegiatan || '';
      document.getElementById('inputUraian').value = item.uraianKegiatan || '';
      document.getElementById('inputKeterangan').value = item.keteranganPeserta || '';
    })
    .catch(() => {
      alert('Gagal memuat detail laporan untuk diubah.');
      closeCreateModal();
    });
}

function previewImages(event) {
  const container = document.getElementById('photoPreviewContainer');
  container.innerHTML = '';
  const files = Array.from(event.target.files || []);

  if (files.length > 4) {
    alert('Maksimal 4 foto dokumentasi yang bisa diunggah.');
    event.target.value = '';
    return;
  }

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
  const satdikId = state.user?.satdik?.id || state.user?.satdikId;
  if (satdikId) formData.append('satdikId', satdikId);

  const fileInput = document.getElementById('inputPhotos');
  const files = Array.from(fileInput.files || []);
  if (files.length > 4) {
    alert('Maksimal 4 foto dokumentasi yang bisa diunggah.');
    return;
  }
  for (let i = 0; i < files.length; i++) {
    formData.append('photos', files[i]);
  }

  try {
    const url = state.editingLapgiatId ? `${API_BASE}/lapgiat/${state.editingLapgiatId}` : `${API_BASE}/lapgiat`;
    const method = state.editingLapgiatId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${state.token}` },
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      alert(state.editingLapgiatId ? 'Laporan berhasil diperbarui!' : 'Laporan berhasil dikirim!');
      closeCreateModal();
      loadLapgiatData();
    } else {
      alert(data.message || (state.editingLapgiatId ? 'Gagal memperbarui laporan.' : 'Gagal mengirim laporan.'));
    }
  } catch (err) {
    alert(state.editingLapgiatId ? 'Terjadi kesalahan saat pembaruan.' : 'Terjadi kesalahan saat pengiriman.');
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
      const mediaHtml = (item.media && item.media.length > 0)
        ? `<div style="margin-top: 1rem;"><strong>Dokumentasi Foto:</strong><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 0.5rem;">${item.media.map(media => `<img src="${media.path || ''}" alt="Dokumentasi laporan" style="width: 100%; max-height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;">`).join('')}</div></div>`
        : '<p style="margin-top: 1rem;"><strong>Dokumentasi Foto:</strong> Tidak ada foto dokumentasi.</p>';

      document.getElementById('reviewDetails').innerHTML = `
        <p><strong>Satdik:</strong> ${escapeHtml(item.satdik ? item.satdik.nama : '-')}</p>
        <p><strong>Tanggal:</strong> ${escapeHtml(item.tanggalKegiatan)}</p>
        <div style="margin-top: 0.5rem;"><strong>Kegiatan & Keterangan:</strong><br>${escapeHtml(item.uraianKegiatan || '-')}</div>
        <div style="margin-top: 0.5rem; white-space: pre-line;">${escapeHtml(item.keteranganPeserta || '-')}</div>
        ${mediaHtml}
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
async function loadPdfPreview() {
  const date = document.getElementById('exportDate').value || '2026-06-24';
  const iframe = document.getElementById('pdfPreviewFrame');
  const status = document.getElementById('pdfPreviewStatus');
  iframe.src = 'about:blank';
  if (status) status.innerText = 'Memuat pratinjau PDF...';

  if (!state.token) {
    if (status) status.innerHTML = '<span style="color: #dc2626;">Silakan login terlebih dahulu untuk melihat pratinjau.</span>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/export/pdf?tanggal=${date}&_=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!res.ok) {
      throw new Error('Gagal memuat PDF');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    iframe.src = url;
    if (status) status.innerText = 'Pratinjau PDF berhasil dimuat.';
  } catch (err) {
    if (status) status.innerHTML = '<span style="color: #dc2626;">Pratinjau PDF gagal dimuat. Silakan coba lagi.</span>';
  }
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
