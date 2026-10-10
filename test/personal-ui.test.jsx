import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ personal: {}, legacy: {}, from: vi.fn(), sendPhoneOtp: vi.fn(), verifyPhoneOtp: vi.fn(), getSignupRequest: vi.fn() }));
vi.mock('../src/firebase/PersonalAuthContext', () => ({ usePersonalAuth: () => mocks.personal }));
vi.mock('../src/supabase/useSupabaseAuth', () => ({ useSupabaseAuth: () => mocks.legacy }));
vi.mock('../src/supabase/config', () => ({ supabase: { from: mocks.from, auth: { signOut: vi.fn(async () => ({ error: null })) } } }));
vi.mock('../src/services/authService', () => ({ sendPhoneOtp: mocks.sendPhoneOtp, verifyPhoneOtp: mocks.verifyPhoneOtp, getSignupRequest: mocks.getSignupRequest, normalizeDbRole: role => role === 'admin' ? 'pdma' : role }));
vi.mock('../src/i18n/LanguageContext', () => ({ useLanguage: () => ({ lang: 'en', t: key => key }) }));
vi.mock('../src/components/LanguageToggle', () => ({ default: () => <button>Language</button> }));
vi.mock('../src/components/ThemeToggle', () => ({ default: () => <button>Theme</button> }));
vi.mock('../src/components/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../src/components/NotAdminPending', () => ({ default: () => <p>Admin approval required</p> }));
import Login from '../src/pages/Login';
import RequirePersonalAuth from '../src/components/RequirePersonalAuth';
import RequirePortalAuth from '../src/components/RequirePortalAuth';
import RequireAdminAuth from '../src/components/RequireAdminAuth';
import ProfileDropdown from '../src/components/ProfileDropdown';
import { grantPortalAccess } from '../src/utils/authAccess';

function roleState(role = 'public') {
  return { user: { uid: 'firebase-uid' }, loading: false, error: null, access: { firebaseUid: 'firebase-uid', status: 'portal', portal: role, storedRoles: [role], storedProfileRole: role === 'public' ? 'citizen' : 'farmer' } };
}
function queryResult(data) {
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn(async () => ({ data, error: null })) };
  mocks.from.mockReturnValue(chain); return chain;
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  mocks.personal = { user: null, loading: false, access: null, error: null, sendOtp: vi.fn(async () => {}), cancelOtp: vi.fn(), confirmOtp: vi.fn(async () => roleState()), signOut: vi.fn(async () => {}), refresh: vi.fn(async () => roleState()) };
  mocks.legacy = { user: null, loading: false, signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}) };
});
afterEach(cleanup);
function login() {
  render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/public" element={<p>Public dashboard</p>} /><Route path="/farmer" element={<p>Farmer dashboard</p>} /><Route path="/personal-account" element={<p>Account setup</p>} /><Route path="/pdma" element={<p>PDMA dashboard</p>} /></Routes></MemoryRouter>);
}
describe('existing login UI with separate personal and staff auth', () => {
  it('Farmer hint sends Firebase OTP and stored Public role opens Public without Supabase role grants', async () => {
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await waitFor(() => expect(mocks.personal.sendOtp).toHaveBeenCalledTimes(1));
    expect(mocks.personal.sendOtp.mock.calls[0][0]).toBe('+923110000000');
    expect(mocks.sendPhoneOtp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify and continue'));
    await screen.findByText('Public dashboard');
    expect(mocks.getSignupRequest).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('agriwatch_portal_access')).toBeNull();
  });
  it('General Public hint cannot override a stored Farmer role', async () => {
    mocks.personal.confirmOtp.mockResolvedValue(roleState('farmer')); login();
    fireEvent.click(screen.getByText('rolePublicLabel'));
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify and continue'));
    await screen.findByText('Farmer dashboard');
  });
  it('PDMA uses its original Supabase phone flow and approved stored registration', async () => {
    mocks.verifyPhoneOtp.mockResolvedValue({ user: { id: 'staff-uuid' } });
    mocks.getSignupRequest.mockResolvedValue({ status: 'approved', role: 'pdma' }); login();
    fireEvent.click(screen.getByText('roleAdminLabel'));
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    expect(mocks.sendPhoneOtp).toHaveBeenCalledTimes(1);
    expect(mocks.personal.sendOtp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText(/verifyContinueAs/));
    await screen.findByText('PDMA dashboard');
    expect(JSON.parse(sessionStorage.getItem('agriwatch_portal_access'))).toMatchObject({ userId: 'staff-uuid', role: 'pdma' });
  });
  it('PDMA Google still uses the dedicated callback; personal Google does not create a legacy account', async () => {
    login(); fireEvent.click(screen.getByText('continueWithGoogle'));
    expect(mocks.legacy.signIn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('roleAdminLabel')); fireEvent.click(screen.getByText('continueWithGoogle'));
    await waitFor(() => expect(mocks.legacy.signIn).toHaveBeenCalledTimes(1));
    expect(mocks.legacy.signIn.mock.calls[0][0]).toContain('/auth/callback');
  });
});
describe('role guards keep Firebase personal and Supabase staff permissions separate', () => {
  function guarded(element, path) {
    render(<MemoryRouter initialEntries={[path]}><Routes><Route element={element}><Route path={path} element={<p>Permitted page</p>} /></Route><Route path="/login" element={<p>Personal login</p>} /><Route path="/admin-portal/login" element={<p>Admin login</p>} /><Route path="/public" element={<p>Stored Public destination</p>} /><Route path="/personal-account" element={<p>Account setup</p>} /></Routes></MemoryRouter>);
  }
  it('stored Public cannot enter Farmer even with a forged browser Farmer grant', async () => {
    mocks.personal = { ...mocks.personal, ...roleState() }; grantPortalAccess('firebase-uid', 'farmer');
    guarded(<RequirePersonalAuth role="farmer" />, '/farmer');
    await screen.findByText('Stored Public destination');
  });
  it('personal Firebase identity alone cannot enter PDMA', async () => {
    mocks.personal = { ...mocks.personal, ...roleState() }; guarded(<RequirePortalAuth role="pdma" />, '/pdma');
    await screen.findByText('Personal login');
  });
  it('approved PDMA Supabase account still enters its original guarded portal', async () => {
    mocks.legacy.user = { id: 'staff-uuid' }; grantPortalAccess('staff-uuid', 'pdma'); queryResult({ status: 'approved', role: 'pdma' });
    guarded(<RequirePortalAuth role="pdma" />, '/pdma');
    await screen.findByText('Permitted page');
    expect(mocks.from).toHaveBeenCalledWith('website_signup_requests');
  });
  it('Admin still requires a Supabase admins allowlist row', async () => {
    mocks.legacy.user = { id: 'admin-uuid' }; queryResult({ user_id: 'admin-uuid' });
    guarded(<RequireAdminAuth />, '/admin-portal');
    await screen.findByText('Permitted page');
    expect(mocks.from).toHaveBeenCalledWith('admins');
  });
  it('non-admin Supabase users remain pending and Firebase cannot supply Admin permission', async () => {
    mocks.personal = { ...mocks.personal, ...roleState() }; mocks.legacy.user = { id: 'not-admin' }; queryResult(null);
    guarded(<RequireAdminAuth />, '/admin-portal');
    await screen.findByText('Admin approval required');
  });
});
it('personal profile menu signs out Firebase, not Supabase, and offers no unowned portal switches', async () => {
  mocks.personal = { ...mocks.personal, ...roleState() };
  render(<MemoryRouter><Routes><Route path="/" element={<ProfileDropdown displayName="Stored name" initials="SN" currentRole="public" userId="firebase-uid" profileHref="/public/settings" />} /><Route path="/login" element={<p>Signed out login</p>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { expanded: false }));
  expect(screen.queryByText('switchAccount')).toBeNull();
  fireEvent.click(screen.getByText('signOut'));
  await screen.findByText('Signed out login');
  expect(mocks.personal.signOut).toHaveBeenCalledTimes(1);
});
