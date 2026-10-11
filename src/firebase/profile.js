export function personalProfile(state) {
  if (!state.user || state.snapshot?.firebaseUid !== state.user.uid || state.snapshot.profile.status !== 'read') return null;
  const profile = state.snapshot.profile.data;
  if (!profile) return null;
  return { ...profile, full_name: profile.name || '', phone: profile.phoneNumber || profile.phone || '', farm_size: profile.farm_size || profile.farmSize || '' };
}
export function personalProfileView(state) {
  const profile = personalProfile(state);
  return { loading: state.loading, error: state.error, userId: state.user?.uid ?? null,
    email: profile?.email || '', name: profile?.full_name || '', role: profile?.role || null,
    district: profile?.district || '', phone: profile?.phone || '', crop: profile?.crop || '',
    farmSize: profile?.farm_size || '', tehsil: profile?.tehsil || '', signedIn: !!state.user,
    readOnly: true, identityProvider: 'firebase',
    updateProfile: async () => ({ error: new Error('Update this profile in the AgriWatch mobile app.') }),
  };
}
