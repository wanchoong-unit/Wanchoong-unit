/* =============================================================
   선우케어 - 메인 앱 로직
   ============================================================= */

// ===== 데이터 스토어 =====
const STORAGE_KEY = 'seonwoo_care_data';

function getDefaultData() {
  return {
    baby: {
      name: '선우',
      birthDate: '',
      photo: null
    },
    feedings: [],
    sleeps: [],
    diapers: [],
    diaries: []
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // 필드 보정
      if (!data.feedings) data.feedings = [];
      if (!data.sleeps) data.sleeps = [];
      if (!data.diapers) data.diapers = [];
      if (!data.diaries) data.diaries = [];
      if (!data.baby) data.baby = getDefaultData().baby;
      return data;
    }
  } catch (e) {
    console.error('데이터 로드 실패:', e);
  }
  return getDefaultData();
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('데이터 저장 실패:', e);
    showToast('저장 공간이 부족합니다');
  }
}

let appData = loadData();

// ===== 유틸리티 =====
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatTime(date) {
  const d = new Date(date);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekDay = weekDays[d.getDay()];
  return `${month}월 ${day}일 (${weekDay})`;
}

function formatDateFull(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}분`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function formatTimerDisplay(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

function getDayAge(birthDate) {
  if (!birthDate) return 'D+0';
  const birth = new Date(birthDate);
  const now = new Date();
  const diff = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
  return `D+${diff}`;
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// ===== 탭 네비게이션 =====
function switchTab(tabName) {
  // 페이지 전환
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${tabName}`);
  if (page) page.classList.add('active');

  // 네비 활성화
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (navBtn) navBtn.classList.add('active');

  // 각 페이지별 렌더링
  if (tabName === 'home') renderHome();
  if (tabName === 'feeding') renderFeedingHistory();
  if (tabName === 'sleep') renderSleepHistory();
  if (tabName === 'diaper') renderDiaperHistory();
  if (tabName === 'diary') renderDiaryList();
}

// ===== 홈 페이지 =====
function renderHome() {
  updateHeaderDate();
  updateProfile();
  updateTodaySummary();
  renderTimeline();
}

function updateHeaderDate() {
  const el = document.getElementById('header-date');
  el.textContent = formatDate(new Date());
}

function updateProfile() {
  document.getElementById('baby-name').textContent = appData.baby.name || '선우';
  document.getElementById('baby-age').textContent = getDayAge(appData.baby.birthDate);

  const img = document.getElementById('profile-img');
  const placeholder = document.querySelector('.profile-placeholder');
  if (appData.baby.photo) {
    img.src = appData.baby.photo;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    img.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

function updateTodaySummary() {
  // 수유
  const todayFeedings = appData.feedings.filter(f => isToday(f.startTime));
  document.getElementById('today-feeding').textContent = `${todayFeedings.length}회`;

  // 수면
  const todaySleeps = appData.sleeps.filter(s => isToday(s.startTime));
  const totalSleepMin = todaySleeps.reduce((sum, s) => sum + (s.duration || 0), 0);
  document.getElementById('today-sleep').textContent = formatDuration(totalSleepMin);

  // 기저귀
  const todayDiapers = appData.diapers.filter(d => isToday(d.time));
  document.getElementById('today-diaper').textContent = `${todayDiapers.length}회`;

  // 일기
  const today = formatDateFull(new Date());
  const todayDiaries = appData.diaries.filter(d => d.date === today);
  document.getElementById('today-diary').textContent = `${todayDiaries.length}개`;
}

function renderTimeline() {
  const container = document.getElementById('timeline');
  const emptyEl = document.getElementById('empty-timeline');

  // 오늘의 모든 기록 수집
  const items = [];

  appData.feedings.filter(f => isToday(f.startTime)).forEach(f => {
    const typeLabels = {
      breast_left: '모유 (왼쪽)',
      breast_right: '모유 (오른쪽)',
      bottle: '젖병',
      formula: '분유'
    };
    let detail = typeLabels[f.type] || f.type;
    if (f.duration) detail += ` · ${formatDuration(f.duration)}`;
    if (f.amount) detail += ` · ${f.amount}ml`;
    items.push({
      time: new Date(f.startTime),
      icon: '🍼',
      title: '수유',
      detail,
      id: f.id,
      category: 'feeding'
    });
  });

  appData.sleeps.filter(s => isToday(s.startTime)).forEach(s => {
    items.push({
      time: new Date(s.startTime),
      icon: '😴',
      title: '수면',
      detail: formatDuration(s.duration || 0),
      id: s.id,
      category: 'sleep'
    });
  });

  appData.diapers.filter(d => isToday(d.time)).forEach(d => {
    const typeLabels = { pee: '소변', poop: '대변', both: '소변 + 대변' };
    items.push({
      time: new Date(d.time),
      icon: d.type === 'pee' ? '💧' : d.type === 'poop' ? '💩' : '💧💩',
      title: '기저귀',
      detail: typeLabels[d.type] || d.type,
      id: d.id,
      category: 'diaper'
    });
  });

  // 시간순 정렬 (최신순)
  items.sort((a, b) => b.time - a.time);

  // 기존 타임라인 아이템 제거
  container.querySelectorAll('.timeline-item').forEach(el => el.remove());

  if (items.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'timeline-item';
    el.innerHTML = `
      <div class="timeline-icon">${item.icon}</div>
      <div class="timeline-info">
        <div class="title">${item.title}</div>
        <div class="detail">${item.detail}</div>
      </div>
      <div class="timeline-time">${formatTime(item.time)}</div>
      <button class="timeline-delete" onclick="deleteRecord('${item.category}','${item.id}')">&times;</button>
    `;
    container.appendChild(el);
  });
}

function deleteRecord(category, id) {
  if (!confirm('이 기록을 삭제할까요?')) return;

  if (category === 'feeding') {
    appData.feedings = appData.feedings.filter(f => f.id !== id);
  } else if (category === 'sleep') {
    appData.sleeps = appData.sleeps.filter(s => s.id !== id);
  } else if (category === 'diaper') {
    appData.diapers = appData.diapers.filter(d => d.id !== id);
  }

  saveData(appData);
  renderHome();
  showToast('기록이 삭제되었습니다');
}

// ===== 수유 기능 =====
let feedingTimer = null;
let feedingStartTime = null;
let feedingElapsed = 0;
let selectedFeedingType = 'breast_left';

function selectFeedingType(btn) {
  document.querySelectorAll('.feeding-type-selector .type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedFeedingType = btn.dataset.type;
}

function toggleFeedingTimer() {
  const btn = document.getElementById('btn-feeding-start');
  const saveBtn = document.getElementById('btn-feeding-save');
  const card = document.getElementById('feeding-timer-card');

  if (feedingTimer) {
    // 정지
    clearInterval(feedingTimer);
    feedingTimer = null;
    btn.textContent = '다시 시작';
    btn.classList.remove('running');
    saveBtn.style.display = 'inline-block';
    card.classList.remove('timer-active');
  } else {
    // 시작
    if (!feedingStartTime) {
      feedingStartTime = new Date();
      feedingElapsed = 0;
    }
    feedingTimer = setInterval(() => {
      feedingElapsed++;
      document.getElementById('feeding-timer').textContent = formatTimerDisplay(feedingElapsed);
    }, 1000);
    btn.textContent = '일시정지';
    btn.classList.add('running');
    saveBtn.style.display = 'none';
    card.classList.add('timer-active');
  }
}

function saveFeedingRecord() {
  if (!feedingStartTime) {
    showToast('먼저 타이머를 시작해주세요');
    return;
  }

  const record = {
    id: uuid(),
    type: selectedFeedingType,
    startTime: feedingStartTime.toISOString(),
    endTime: new Date().toISOString(),
    duration: Math.round(feedingElapsed / 60 * 10) / 10,
    amount: parseInt(document.getElementById('feeding-amount').value) || 0
  };

  appData.feedings.push(record);
  saveData(appData);

  // 리셋
  resetFeedingTimer();
  renderFeedingHistory();
  showToast('수유 기록이 저장되었습니다!');
}

function resetFeedingTimer() {
  if (feedingTimer) clearInterval(feedingTimer);
  feedingTimer = null;
  feedingStartTime = null;
  feedingElapsed = 0;
  document.getElementById('feeding-timer').textContent = '00:00:00';
  document.getElementById('btn-feeding-start').textContent = '시작';
  document.getElementById('btn-feeding-start').classList.remove('running');
  document.getElementById('btn-feeding-save').style.display = 'none';
  document.getElementById('feeding-timer-card').classList.remove('timer-active');
  document.getElementById('feeding-amount').value = '';
}

function renderFeedingHistory() {
  const container = document.getElementById('feeding-history');
  const todayRecords = appData.feedings
    .filter(f => isToday(f.startTime))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  if (todayRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>오늘의 수유 기록이 없어요</p></div>';
    return;
  }

  const typeLabels = {
    breast_left: '🤱 왼쪽',
    breast_right: '🤱 오른쪽',
    bottle: '🍼 젖병',
    formula: '🥛 분유'
  };

  container.innerHTML = todayRecords.map(r => `
    <div class="record-item">
      <div class="rec-icon">🍼</div>
      <div class="rec-info">
        <div class="rec-title">${typeLabels[r.type] || r.type}</div>
        <div class="rec-detail">${r.duration ? formatDuration(r.duration) : ''}${r.amount ? ' · ' + r.amount + 'ml' : ''}</div>
      </div>
      <div class="rec-time">${formatTime(r.startTime)}</div>
      <button class="rec-delete" onclick="deleteRecord('feeding','${r.id}')">&times;</button>
    </div>
  `).join('');
}

// ===== 수면 기능 =====
let sleepTimer = null;
let sleepStartTime = null;
let sleepElapsed = 0;

function toggleSleepTimer() {
  const btn = document.getElementById('btn-sleep-start');
  const saveBtn = document.getElementById('btn-sleep-save');
  const card = document.getElementById('sleep-timer-card');

  if (sleepTimer) {
    clearInterval(sleepTimer);
    sleepTimer = null;
    btn.textContent = '다시 시작';
    btn.classList.remove('running');
    saveBtn.style.display = 'inline-block';
    card.classList.remove('timer-active');
  } else {
    if (!sleepStartTime) {
      sleepStartTime = new Date();
      sleepElapsed = 0;
    }
    sleepTimer = setInterval(() => {
      sleepElapsed++;
      document.getElementById('sleep-timer').textContent = formatTimerDisplay(sleepElapsed);
    }, 1000);
    btn.textContent = '일어남';
    btn.classList.add('running');
    saveBtn.style.display = 'none';
    card.classList.add('timer-active');
  }
}

function saveSleepRecord() {
  if (!sleepStartTime) {
    showToast('먼저 타이머를 시작해주세요');
    return;
  }

  const record = {
    id: uuid(),
    startTime: sleepStartTime.toISOString(),
    endTime: new Date().toISOString(),
    duration: Math.round(sleepElapsed / 60 * 10) / 10
  };

  appData.sleeps.push(record);
  saveData(appData);

  // 리셋
  resetSleepTimer();
  renderSleepHistory();
  showToast('수면 기록이 저장되었습니다!');
}

function resetSleepTimer() {
  if (sleepTimer) clearInterval(sleepTimer);
  sleepTimer = null;
  sleepStartTime = null;
  sleepElapsed = 0;
  document.getElementById('sleep-timer').textContent = '00:00:00';
  document.getElementById('btn-sleep-start').textContent = '재우기 시작';
  document.getElementById('btn-sleep-start').classList.remove('running');
  document.getElementById('btn-sleep-save').style.display = 'none';
  document.getElementById('sleep-timer-card').classList.remove('timer-active');
}

function renderSleepHistory() {
  const container = document.getElementById('sleep-history');
  const todayRecords = appData.sleeps
    .filter(s => isToday(s.startTime))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  if (todayRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>오늘의 수면 기록이 없어요</p></div>';
    return;
  }

  container.innerHTML = todayRecords.map(r => `
    <div class="record-item">
      <div class="rec-icon">😴</div>
      <div class="rec-info">
        <div class="rec-title">수면</div>
        <div class="rec-detail">${formatTime(r.startTime)} ~ ${formatTime(r.endTime)} · ${formatDuration(r.duration)}</div>
      </div>
      <div class="rec-time">${formatTime(r.startTime)}</div>
      <button class="rec-delete" onclick="deleteRecord('sleep','${r.id}')">&times;</button>
    </div>
  `).join('');
}

// ===== 기저귀 기능 =====
function saveDiaperRecord(type) {
  const record = {
    id: uuid(),
    time: new Date().toISOString(),
    type: type
  };

  appData.diapers.push(record);
  saveData(appData);

  renderDiaperHistory();

  const labels = { pee: '소변', poop: '대변', both: '혼합' };
  showToast(`기저귀(${labels[type]}) 기록 완료!`);
}

function renderDiaperHistory() {
  const container = document.getElementById('diaper-history');
  const todayRecords = appData.diapers
    .filter(d => isToday(d.time))
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  if (todayRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>오늘의 기저귀 기록이 없어요</p></div>';
    return;
  }

  const typeIcons = { pee: '💧', poop: '💩', both: '💧💩' };
  const typeLabels = { pee: '소변', poop: '대변', both: '소변 + 대변' };

  container.innerHTML = todayRecords.map(r => `
    <div class="record-item">
      <div class="rec-icon">${typeIcons[r.type] || '🧷'}</div>
      <div class="rec-info">
        <div class="rec-title">${typeLabels[r.type] || r.type}</div>
      </div>
      <div class="rec-time">${formatTime(r.time)}</div>
      <button class="rec-delete" onclick="deleteRecord('diaper','${r.id}')">&times;</button>
    </div>
  `).join('');
}

// ===== 일기 기능 =====
let diaryPhotos = []; // 임시 사진 저장 (base64 배열)

function handleDiaryPhotos(event) {
  const files = event.target.files;
  if (!files.length) return;

  Array.from(files).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('사진 크기는 5MB 이하만 가능합니다');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // 이미지 리사이즈 (저장 용량 절약)
      resizeImage(e.target.result, 800, (resized) => {
        diaryPhotos.push(resized);
        renderDiaryPhotoPreview();
      });
    };
    reader.readAsDataURL(file);
  });

  // input 초기화 (같은 파일 재선택 허용)
  event.target.value = '';
}

function resizeImage(dataUrl, maxWidth, callback) {
  const img = new Image();
  img.onload = () => {
    let w = img.width;
    let h = img.height;
    if (w > maxWidth) {
      h = Math.round(h * maxWidth / w);
      w = maxWidth;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.7));
  };
  img.src = dataUrl;
}

function renderDiaryPhotoPreview() {
  const container = document.getElementById('diary-photo-preview');
  container.innerHTML = diaryPhotos.map((photo, i) => `
    <div class="photo-preview-item">
      <img src="${photo}" alt="사진 ${i+1}" onclick="viewPhoto('${photo.substring(0, 50)}')">
      <button class="photo-remove" onclick="removeDiaryPhoto(${i})">&times;</button>
    </div>
  `).join('');
}

function removeDiaryPhoto(index) {
  diaryPhotos.splice(index, 1);
  renderDiaryPhotoPreview();
}

function saveDiaryEntry() {
  const dateInput = document.getElementById('diary-date');
  const contentInput = document.getElementById('diary-content');

  const date = dateInput.value;
  const content = contentInput.value.trim();

  if (!date) {
    showToast('날짜를 선택해주세요');
    return;
  }

  if (!content && diaryPhotos.length === 0) {
    showToast('내용이나 사진을 추가해주세요');
    return;
  }

  const entry = {
    id: uuid(),
    date: date,
    content: content,
    photos: [...diaryPhotos],
    createdAt: new Date().toISOString()
  };

  appData.diaries.push(entry);
  saveData(appData);

  // 리셋
  contentInput.value = '';
  diaryPhotos = [];
  renderDiaryPhotoPreview();
  renderDiaryList();

  showToast('일기가 저장되었습니다!');
}

function renderDiaryList() {
  const container = document.getElementById('diary-list');
  const entries = [...appData.diaries].sort((a, b) =>
    new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (entries.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>아직 일기가 없어요</p><p class="sub">선우의 첫 번째 일기를 써보세요!</p></div>';
    return;
  }

  container.innerHTML = entries.map(entry => `
    <div class="diary-entry">
      <div class="diary-entry-header">
        <span class="diary-entry-date">${formatDate(entry.date + 'T00:00:00')}</span>
        <button class="diary-entry-delete" onclick="deleteDiary('${entry.id}')">&times;</button>
      </div>
      ${entry.content ? `<div class="diary-entry-content">${escapeHtml(entry.content)}</div>` : ''}
      ${entry.photos && entry.photos.length > 0 ? `
        <div class="diary-entry-photos">
          ${entry.photos.map(p => `<img src="${p}" alt="사진" onclick="openPhotoViewer(this.src)">`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function deleteDiary(id) {
  if (!confirm('이 일기를 삭제할까요?')) return;
  appData.diaries = appData.diaries.filter(d => d.id !== id);
  saveData(appData);
  renderDiaryList();
  showToast('일기가 삭제되었습니다');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== 사진 뷰어 =====
function openPhotoViewer(src) {
  document.getElementById('photo-viewer-img').src = src;
  document.getElementById('photo-viewer').style.display = 'flex';
}

function closePhotoViewer() {
  document.getElementById('photo-viewer').style.display = 'none';
  document.getElementById('photo-viewer-img').src = '';
}

// ===== 프로필 사진 =====
function changeProfilePhoto() {
  document.getElementById('profile-photo-input').click();
}

function handleProfilePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    resizeImage(e.target.result, 200, (resized) => {
      appData.baby.photo = resized;
      saveData(appData);
      updateProfile();
      showToast('프로필 사진이 변경되었습니다');
    });
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ===== 설정 =====
function openSettings() {
  document.getElementById('setting-name').value = appData.baby.name || '';
  document.getElementById('setting-birthdate').value = appData.baby.birthDate || '';
  document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettings() {
  document.getElementById('settings-modal').style.display = 'none';
}

function saveBabySettings() {
  appData.baby.name = document.getElementById('setting-name').value.trim() || '선우';
  appData.baby.birthDate = document.getElementById('setting-birthdate').value || '';
  saveData(appData);
  updateProfile();
  // 일기 페이지 제목도 갱신
  const diaryTitle = document.querySelector('#page-diary .page-title h2');
  if (diaryTitle) diaryTitle.textContent = `📔 ${appData.baby.name} 일기`;
}

function confirmDataReset() {
  if (!confirm('정말로 모든 데이터를 초기화할까요?\n이 작업은 되돌릴 수 없습니다.')) return;
  if (!confirm('마지막 확인입니다. 모든 기록이 삭제됩니다.')) return;

  localStorage.removeItem(STORAGE_KEY);
  appData = getDefaultData();
  closeSettings();
  switchTab('home');
  showToast('모든 데이터가 초기화되었습니다');
}

// ===== PWA 서비스워커 등록 =====
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// ===== 초기화 =====
function init() {
  // 날짜 기본값 설정
  document.getElementById('diary-date').value = formatDateFull(new Date());

  // 일기 페이지 제목 업데이트
  const diaryTitle = document.querySelector('#page-diary .page-title h2');
  if (diaryTitle) diaryTitle.textContent = `📔 ${appData.baby.name} 일기`;

  // 홈 렌더링
  renderHome();

  // PWA
  registerSW();
}

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
