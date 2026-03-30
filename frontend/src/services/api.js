const BASE = import.meta.env.VITE_API_URL || '';

export const getToken   = ()  => localStorage.getItem('cr_token');
export const setToken   = (t) => localStorage.setItem('cr_token', t);
export const removeToken= ()  => localStorage.removeItem('cr_token');
export const getUser    = ()  => { try { return JSON.parse(localStorage.getItem('cr_user')); } catch { return null; } };
export const setUser    = (u) => localStorage.setItem('cr_user', JSON.stringify(u));
export const removeUser = ()  => localStorage.removeItem('cr_user');

const req = async (path, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res  = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed: ${res.status}`);
  return data;
};

export const login    = (body)       => req('/auth/login',     { method: 'POST', body: JSON.stringify(body) });
export const register = (body)       => req('/auth/register',  { method: 'POST', body: JSON.stringify(body) });
export const getMe    = ()           => req('/auth/me');
export const sendOtp  = (email, phone) => req('/auth/send-otp',  { method: 'POST', body: JSON.stringify({ email, phone }) });
export const verifyOtp= (email, otp) => req('/auth/verify-otp',{ method: 'POST', body: JSON.stringify({ email, otp }) });

export const getProfile    = ()     => req('/users/profile');
export const updateProfile = (body) => req('/users/profile', { method: 'PUT', body: JSON.stringify(body) });

export const createRide     = (body) => req('/ride/create', { method: 'POST', body: JSON.stringify(body) });
export const getMyRides     = ()     => req('/ride/my');
export const getRide        = (id)   => req(`/ride/${id}`);
export const updateRide     = (id,b) => req(`/ride/${id}`, { method: 'PUT',    body: JSON.stringify(b) });
export const deleteRide     = (id)   => req(`/ride/${id}`, { method: 'DELETE' });
export const noMatchSuggest = (p)    => req(`/ride/no-match-suggest?lat=${p.lat}&lng=${p.lng}`);
export const getAllRides     = (p = {}) => {
  const q = new URLSearchParams();
  if (p.date) q.set('date', p.date);
  return req(`/ride/all?${q}`);
};
export const searchRides    = (p)    => {
  const q = new URLSearchParams();
  if (p.lat)         q.set('lat', p.lat);
  if (p.lng)         q.set('lng', p.lng);
  if (p.maxDistance) q.set('maxDistance', p.maxDistance);
  if (p.date)        q.set('date', p.date);
  return req(`/ride/search?${q}`);
};
export const startRide       = (id)         => req(`/ride/${id}/start`,    { method: 'POST' });
export const completeRide    = (id)         => req(`/ride/${id}/complete`, { method: 'POST' });
export const cancelRide      = (id, reason) => req(`/ride/${id}/cancel`,   { method: 'POST', body: JSON.stringify({ reason }) });
export const pickupPassenger = (id)         => req(`/ride/${id}/pickup`,   { method: 'POST' });
export const dropPassenger   = (id)         => req(`/ride/${id}/drop`,     { method: 'POST' });
export const getRideStatus   = (id)         => req(`/ride/${id}/status`);
export const submitChecklist = (id, body)   => req(`/ride/${id}/checklist`,{ method: 'POST', body: JSON.stringify(body) });

export const requestBooking     = (rideId)            => req('/booking/request', { method: 'POST', body: JSON.stringify({ rideId }) });
export const respondBooking     = (bookingId, status) => req('/booking/respond',  { method: 'PUT',  body: JSON.stringify({ bookingId, status }) });
export const getMyBookings      = ()                   => req('/booking/my');
export const getRideRequests    = ()                   => req('/booking/requests');
export const getBookingsForRide = (rideId)             => req(`/booking/ride/${rideId}`);

export const addRating      = (body)   => req('/ratings/add', { method: 'POST', body: JSON.stringify(body) });
export const getUserRatings = (userId) => req(`/ratings/${userId}`);

export const submitKyc      = (body)   => req('/kyc/submit',                  { method: 'POST', body: JSON.stringify(body) });
export const getKycStatus   = ()       => req('/kyc/status');
export const getAllKyc       = ()       => req('/kyc/admin/all');
export const getKycImages   = (userId) => req(`/kyc/admin/images/${userId}`);
export const reviewKyc      = (body)   => req('/kyc/admin/review',             { method: 'POST', body: JSON.stringify(body) });

export const updateLocation  = (body)   => req('/tracking/update', { method: 'POST', body: JSON.stringify(body) });
export const getTracking     = (rideId) => req(`/tracking/${rideId}`);
export const endRideTracking = (rideId) => req('/tracking/end',    { method: 'POST', body: JSON.stringify({ rideId }) });

export const createAlert       = (body) => req('/alerts',       { method: 'POST',   body: JSON.stringify(body) });
export const getMyAlerts       = ()     => req('/alerts/my');
export const deleteAlert       = (id)   => req(`/alerts/${id}`, { method: 'DELETE' });
export const checkAlertMatches = (id)   => req(`/alerts/${id}/check`);

export const triggerSOS              = (body)        => req('/sos/trigger',              { method: 'POST', body: JSON.stringify(body) });
export const getActiveSOSForRide     = (rideId)      => req(`/sos/ride/${rideId}/active`);
export const acknowledgeSOS          = (sosId)       => req(`/sos/${sosId}/acknowledge`, { method: 'POST' });
export const resolveSOS              = (sosId, body) => req(`/sos/${sosId}/resolve`,     { method: 'POST', body: JSON.stringify(body) });
export const updateEmergencyContacts = (contacts)    => req('/sos/contacts',             { method: 'PUT',  body: JSON.stringify({ emergencyContacts: contacts }) });

export const reportIncident  = (body)         => req('/incidents/report',        { method: 'POST', body: JSON.stringify(body) });
export const addEvidence     = (id, evidence) => req(`/incidents/${id}/evidence`,{ method: 'POST', body: JSON.stringify({ evidence }) });
export const getMyIncidents  = ()             => req('/incidents/my');
export const getAllIncidents  = ()             => req('/incidents/all');
export const exportIncident  = (id)           => req(`/incidents/${id}/export`,  { method: 'POST' });

export const getAdminStats      = ()            => req('/admin/dashboard');
export const getAllAdminUsers   = (p = {})      => req(`/admin/users?${new URLSearchParams(p)}`);
export const getAllAdminRides   = (p = {})      => req(`/admin/rides?${new URLSearchParams(p)}`);
export const getAllAdminBookings= (p = {})      => req(`/admin/bookings?${new URLSearchParams(p)}`);
export const getAdminSettings   = ()            => req('/admin/settings');
export const setAdminSetting    = (key, value)  => req('/admin/settings', { method: 'POST', body: JSON.stringify({ key, value }) });
export const verifyDocument     = (body)        => req('/admin/verifications/verify', { method: 'POST', body: JSON.stringify(body) });
