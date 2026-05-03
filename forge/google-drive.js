// Google Drive integration — client-side only, no backend.
// Uses Google Identity Services (GIS) token model; drive.file scope only
// (app can only see files it created — never the user's full Drive).
//
// SETUP:
//   1. Go to https://console.cloud.google.com/apis/credentials
//   2. Create an OAuth 2.0 Web Application credential
//   3. Add your app's origin(s) to Authorized JavaScript Origins
//   4. Copy the Client ID and paste it below

const GOOGLE_CLIENT_ID = ''; // ← paste your OAuth 2.0 Client ID here (see SETUP comment above)

const DRIVE_SCOPE  = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API    = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API   = 'https://www.googleapis.com/upload/drive/v3';

let _tokenClient     = null;
let _accessToken     = null;
let _tokenExpiry     = 0;
let _userInfo        = null;   // { name, email, picture }
let _onStatusChange  = null;   // callback(isConnected, userInfo)
let _pendingAction   = null;   // action to run after sign-in completes

function initGoogleDrive(onStatusChange) {
  _onStatusChange = onStatusChange;

  if (!GOOGLE_CLIENT_ID) {
    console.info('[Drive] No GOOGLE_CLIENT_ID configured — Google Drive disabled.');
    return;
  }

  if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
    console.warn('[Drive] Google Identity Services not available.');
    return;
  }

  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    state: state,
    callback: _handleTokenResponse,
  });

  // Tokens are requested on-demand (save/open click), not at init.
  // Restore connected UI state from localStorage so buttons appear, but
  // don't request a token until the user actually triggers a Drive action.
  const wasConnected = localStorage.getItem('drive_connected') === '1';
  _onStatusChange?.(wasConnected, null);
}

function _handleTokenResponse(response) {
  if (response.error) {
    console.error('[Drive] Auth error:', response.error);
    _pendingAction = null;
    setLoadingState(false);
    if (response.error === 'popup_blocked_by_browser') {
      showToast('Popup blocked — please allow popups for this site, then try again.');
    } else if (response.error !== 'access_denied' && response.error !== 'popup_closed_by_user') {
      showToast('Google Drive sign-in failed. Please try again.');
    }
    _onStatusChange?.(false, null);
    return;
  }
  if (!google.accounts.oauth2.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
    _pendingAction = null;
    setLoadingState(false);
    showAlertModal('Google Drive Permission Required',
      'Drive access was not granted. Please try again and accept the Google Drive permission.');
    _onStatusChange?.(false, null);
    return;
  }

  _accessToken = response.access_token;
  _tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
  _fetchUserInfo();
}

async function _fetchUserInfo() {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${_accessToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _userInfo = await res.json(); // { name, email, picture, sub }
    localStorage.setItem('drive_connected', '1');
    _onStatusChange?.(true, _userInfo);
    if (_pendingAction) { const fn = _pendingAction; _pendingAction = null; fn(); }
  } catch (e) {
    console.error('[Drive] Failed to fetch user info:', e);
    localStorage.setItem('drive_connected', '1');
    _onStatusChange?.(true, null);
    // userinfo failure doesn't invalidate the access token — proceed with pending action
    if (_pendingAction) { const fn = _pendingAction; _pendingAction = null; fn(); }
  }
}

function signInGoogle(afterSignIn) {
  if (!_tokenClient) {
    showAlertModal('Google Drive Not Configured',
      'Add your Google OAuth Client ID to <code>google-drive.js</code> to enable Google Drive sync.');
    return;
  }
  if (afterSignIn) _pendingAction = afterSignIn;
  _tokenClient.requestAccessToken({ prompt: isGoogleConnected() ? '' : 'consent' });
}

function signOutGoogle() {
  if (_accessToken) {
    google.accounts.oauth2.revoke(_accessToken, () => {});
  }
  _accessToken  = null;
  _tokenExpiry  = 0;
  _userInfo     = null;
  _pendingAction = null;
  localStorage.removeItem('drive_connected');
  _onStatusChange?.(false, null);
}

function isGoogleConnected() {
  return !!_accessToken && Date.now() < _tokenExpiry;
}

function isDriveConfigured() {
  return !!GOOGLE_CLIENT_ID && !!_tokenClient;
}

function _requireAuth(afterAuth) {
  if (isGoogleConnected()) return true;
  signInGoogle(afterAuth);
  return false;
}

async function _driveRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${DRIVE_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${_accessToken}`, ...options.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status}: ${body}`);
  }
  return res;
}

async function _findFile(name) {
  const q = encodeURIComponent(`name='${name}' and trashed=false`);
  const res = await _driveRequest(`/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`);
  const data = await res.json();
  return data.files?.[0] || null;
}

async function saveToDrive(worldName, trvBlob) {
  if (!_requireAuth(() => saveToDrive(worldName, trvBlob))) {
    setLoadingState(true, 'Waiting for Google sign-in…');
    return;
  }

  const filename = `${worldName}.trv`;
  setLoadingState(true, 'Saving to Google Drive…');

  try {
    const existing  = await _findFile(filename);
    const metadata  = { name: filename, mimeType: 'application/octet-stream' };
    const form      = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', trvBlob, filename);

    const url    = existing
      ? `${UPLOAD_API}/files/${existing.id}?uploadType=multipart`
      : `${UPLOAD_API}/files?uploadType=multipart`;
    const method = existing ? 'PATCH' : 'POST';

    await _driveRequest(url, { method, body: form });
    setLoadingState(false);
    showToast(`"${filename}" backed up to Google Drive ✓`);
  } catch (e) {
    setLoadingState(false);
    console.error('[Drive] Save error:', e);
    showAlertModal('Google Drive Backup Failed', e.message);
  }
}

async function listDriveFiles() {
  if (!_requireAuth(() => window.openDriveFilePicker())) return [];
  try {
    const q   = encodeURIComponent(`(name contains '.trv' or name contains '.wbundle') and trashed=false`);
    const res = await _driveRequest(
      `/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime+desc`
    );
    const data = await res.json();
    return data.files || [];
  } catch (e) {
    console.error('[Drive] List error:', e);
    showAlertModal('Drive Error', 'Could not list Google Drive files: ' + e.message);
    return [];
  }
}

async function loadFromDrive(fileId) {
  if (!isGoogleConnected()) return null;
  try {
    const res = await _driveRequest(`/files/${fileId}?alt=media`);
    return await res.blob();
  } catch (e) {
    console.error('[Drive] Load error:', e);
    showAlertModal('Drive Load Failed', e.message);
    return null;
  }
}

window.googleDrive = {
  init:          initGoogleDrive,
  signIn:        signInGoogle,
  signOut:       signOutGoogle,
  save:          saveToDrive,
  list:          listDriveFiles,
  load:          loadFromDrive,
  isConnected:   isGoogleConnected,
  isConfigured:  isDriveConfigured,
  getUserInfo:   () => _userInfo,
};
