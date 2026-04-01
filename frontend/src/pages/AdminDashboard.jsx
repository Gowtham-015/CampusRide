import React, { useEffect, useMemo, useState } from "react";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./AdminDashboard.css";

const STATUS_META = {
  open: { label: "Open", tone: "warning" },
  under_review: { label: "Under Review", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
  exported_to_authorities: { label: "Exported", tone: "success" },
};

function formatDate(value, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime ? date.toLocaleString("en-IN") : date.toLocaleDateString("en-IN");
}

function toneClass(tone) {
  if (!tone) return "tone-muted";
  return `tone-${tone}`;
}

export default function AdminDashboard({ navigate, defaultTab, onTabChange }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(defaultTab || "Overview");

  const applyTab = (next) => {
    setTab(next);
    onTabChange?.(next);
  };
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [kycList, setKycList] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, userId: null, reason: "", name: "" });
  const [revokeModal, setRevokeModal] = useState({ open: false, userId: null, reason: "", name: "" });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  const loadTab = async (activeTab) => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "Overview") {
        const data = await api.getAdminStats();
        setStats(data);
      }
      if (activeTab === "Users") {
        const data = await api.getAllAdminUsers();
        setUsers(data.users || []);
      }
      if (activeTab === "Rides") {
        const data = await api.getAllAdminRides();
        setRides(data.rides || []);
      }
      if (activeTab === "Bookings") {
        const data = await api.getAllAdminBookings();
        setBookings(data.bookings || []);
      }
      if (activeTab === "KYC Review") {
        const data = await api.getAllKyc();
        setKycList(Array.isArray(data) ? data : []);
      }
      if (activeTab === "Incidents") {
        const data = await api.getAllIncidents();
        setIncidents(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError(e.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const reviewKyc = async (userId, action) => {
    const reason = action === "reject" ? (prompt("Enter rejection reason:") || "").trim() : "";
    try {
      await api.reviewKyc({ userId, action, rejectReason: reason });
      setKycList((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                kycData: {
                  ...u.kycData,
                  status: action === "approve" ? "approved" : "rejected",
                  rejectReason: reason,
                  reviewedAt: new Date().toISOString(),
                },
              }
            : u
        )
      );
    } catch (e) {
      alert(e.message || "Could not update KYC.");
    }
  };

  const requestDeleteUser = (userId, name) => {
    if (!userId) return;
    if (userId === user?._id || userId === user?.id) {
      alert("You can't delete the currently logged-in account.");
      return;
    }
    setDeleteModal({ open: true, userId, reason: "", name: name || "" });
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.userId) return;
    const reason = deleteModal.reason.trim();
    if (!reason) {
      setError("Please enter a reason. The user will be notified with this message.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await api.deleteAdminUser(deleteModal.userId, reason);
      setDeleteModal({ open: false, userId: null, reason: "", name: "" });
      await loadTab("Users");
    } catch (e) {
      setError(e.message || "Could not delete user.");
    } finally {
      setActionLoading(false);
    }
  };

  const requestRevokeKyc = (userId, name) => {
    if (!userId) return;
    setRevokeModal({ open: true, userId, reason: "", name: name || "" });
  };

  const confirmRevokeKyc = async () => {
    if (!revokeModal.userId) return;
    const reason = revokeModal.reason.trim();
    if (!reason) {
      setError("Please enter a reason. The user will be notified with this message.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await api.revokeKyc({ userId: revokeModal.userId, reason });
      setRevokeModal({ open: false, userId: null, reason: "", name: "" });
      await loadTab("KYC Review");
    } catch (e) {
      setError(e.message || "Could not revoke KYC.");
    } finally {
      setActionLoading(false);
    }
  };

  if (user?.role !== "admin" && user?.role !== "superadmin") {
    return (
      <div className="narrow-wrap fade-up" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 44 }}>🔒</div>
        <h2 className="heading mt-20">Admin Only</h2>
        <p className="text-muted mt-8">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-page fade-up">
      <section className="admin-hero">
        <div>
          <p className="eyebrow mb-8">Control Panel</p>
          <h1 className="heading admin-title">Admin Dashboard</h1>
          <p className="text-muted mt-8">Monitor platform activity, review compliance, and take action faster.</p>
        </div>
        <div className="admin-hero-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => applyTab("KYC Review")}>
            Review KYC
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("admin-settings")}>
            Settings
          </button>
        </div>
      </section>

      {error && <div className="alert alert-error mb-16">{error}</div>}
      {loading && <div className="admin-loading">Loading data...</div>}

      {!loading && tab === "Overview" && <OverviewSection stats={stats} goTo={applyTab} />}
      {!loading && tab === "Users" && (
        <UsersSection
          users={filteredUsers}
          search={search}
          setSearch={setSearch}
          onRequestDeleteUser={requestDeleteUser}
          currentUserId={user?._id || user?.id}
        />
      )}
      {!loading && tab === "Rides" && <RidesSection rides={rides} />}
      {!loading && tab === "Bookings" && <BookingsSection bookings={bookings} />}
      {!loading && tab === "KYC Review" && (
        <KycSection kycList={kycList} reviewKyc={reviewKyc} onRequestRevokeKyc={requestRevokeKyc} />
      )}
      {!loading && tab === "Incidents" && <IncidentsSection incidents={incidents} onRefresh={() => loadTab("Incidents")} />}

      {deleteModal.open && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="del-title">
          <div className="admin-modal">
            <h3 id="del-title" className="admin-modal-title">
              Remove account{deleteModal.name ? `: ${deleteModal.name}` : ""}
            </h3>
            <p className="text-muted text-sm mb-12">
              This cannot be undone. Enter a reason — if the user is online, they will see it immediately; otherwise explain the action in your own follow-up if needed.
            </p>
            <label className="admin-modal-label">Reason for removal (sent to the user)</label>
            <textarea
              className="input admin-modal-textarea"
              rows={4}
              placeholder="e.g. Violation of community guidelines — repeated unsafe ride reports."
              value={deleteModal.reason}
              onChange={(e) => setDeleteModal((m) => ({ ...m, reason: e.target.value }))}
            />
            <div className="admin-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" disabled={actionLoading} onClick={() => setDeleteModal({ open: false, userId: null, reason: "", name: "" })}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={actionLoading} onClick={confirmDeleteUser}>
                {actionLoading ? "Removing…" : "Remove account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeModal.open && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rev-title">
          <div className="admin-modal">
            <h3 id="rev-title" className="admin-modal-title">
              Revoke KYC{revokeModal.name ? `: ${revokeModal.name}` : ""}
            </h3>
            <p className="text-muted text-sm mb-12">The user will receive this as an in-app notification (and a toast if they are online).</p>
            <label className="admin-modal-label">Reason for revoking verification</label>
            <textarea
              className="input admin-modal-textarea"
              rows={4}
              placeholder="e.g. Documents could not be verified — please resubmit clear photos."
              value={revokeModal.reason}
              onChange={(e) => setRevokeModal((m) => ({ ...m, reason: e.target.value }))}
            />
            <div className="admin-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" disabled={actionLoading} onClick={() => setRevokeModal({ open: false, userId: null, reason: "", name: "" })}>
                Cancel
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={actionLoading} onClick={confirmRevokeKyc}>
                {actionLoading ? "Revoking…" : "Revoke KYC"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewSection({ stats, goTo }) {
  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Total Rides", value: stats?.totalRides ?? 0 },
    { label: "Total Bookings", value: stats?.totalBookings ?? 0 },
    { label: "Completed Rides", value: stats?.completedRides ?? 0 },
    { label: "Active Rides", value: stats?.activeRides ?? 0 },
    { label: "Pending KYC", value: stats?.pendingVerifications ?? 0, tone: "warning" },
    { label: "Revenue", value: `₹${stats?.totalRevenue ?? 0}`, tone: "success" },
    { label: "Rides Today", value: stats?.ridesToday ?? 0 },
  ];

  return (
    <section className="admin-section">
      <div className="metrics-grid">
        {cards.map((card) => (
          <article key={card.label} className="metric-card">
            <p className="metric-label">{card.label}</p>
            <p className={`metric-value ${toneClass(card.tone)}`}>{card.value}</p>
          </article>
        ))}
      </div>

      <div className="quick-actions">
        <button className="qa-card" onClick={() => goTo("Users")}>
          <p className="qa-title">Manage Users</p>
          <p className="qa-sub">Search and review user accounts quickly.</p>
        </button>
        <button className="qa-card" onClick={() => goTo("KYC Review")}>
          <p className="qa-title">Process KYC Queue</p>
          <p className="qa-sub">Approve or reject pending verification requests.</p>
        </button>
        <button className="qa-card" onClick={() => goTo("Incidents")}>
          <p className="qa-title">Incident Response</p>
          <p className="qa-sub">Track open reports and escalate if needed.</p>
        </button>
      </div>
    </section>
  );
}

function UsersSection({ users, search, setSearch, onRequestDeleteUser, currentUserId }) {
  return (
    <section className="admin-section">
      <input
        className="input admin-search"
        placeholder="Search by name, email or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {users.length === 0 ? (
        <EmptyState title="No users found" subtitle="Try a different search query." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>KYC</th>
                <th>College</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="entity-name">{u.name || "—"}</div>
                    <div className="entity-sub">{u.email || "—"}</div>
                  </td>
                  <td>
                    <span className={`pill role-${u.role || "seeker"}`}>{u.role || "seeker"}</span>
                  </td>
                  <td>
                    <span className={`pill status-${u.kycData?.status || "pending"}`}>{u.kycData?.status || "not submitted"}</span>
                  </td>
                  <td>{u.college || "—"}</td>
                  <td>{u.phone || "—"}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={u._id === currentUserId}
                      onClick={() => onRequestDeleteUser?.(u._id, u.name)}
                      title={u._id === currentUserId ? "You cannot delete yourself" : "Delete user"}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RidesSection({ rides }) {
  return (
    <section className="admin-section">
      {rides.length === 0 ? (
        <EmptyState title="No rides found" subtitle="Rides will appear here once created." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Route</th>
                <th>Date</th>
                <th>Time</th>
                <th>Seats</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((r) => (
                <tr key={r._id}>
                  <td>{r.providerId?.name || "—"}</td>
                  <td>
                    <div className="entity-name">{r.pickup?.label || "—"}</div>
                    <div className="entity-sub">to {r.drop?.label || "—"}</div>
                  </td>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.time || "—"}</td>
                  <td>{r.seatsAvailable ?? "—"}</td>
                  <td>₹{r.costPerSeat ?? "—"}</td>
                  <td>
                    <span className={`pill status-${r.status || "pending"}`}>{r.status || "pending"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BookingsSection({ bookings }) {
  return (
    <section className="admin-section">
      {bookings.length === 0 ? (
        <EmptyState title="No bookings found" subtitle="Bookings will show up after user requests." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Seeker</th>
                <th>Route</th>
                <th>Phone</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <div className="entity-name">{b.seekerId?.name || "—"}</div>
                    <div className="entity-sub">{b.seekerId?.email || "—"}</div>
                  </td>
                  <td>
                    <div className="entity-name">{b.rideId?.pickup?.label || "—"}</div>
                    <div className="entity-sub">to {b.rideId?.drop?.label || "—"}</div>
                  </td>
                  <td>{b.seekerId?.phone || "—"}</td>
                  <td>₹{b.rideId?.costPerSeat ?? "—"}</td>
                  <td>
                    <span className={`pill status-${b.status || "pending"}`}>{b.status || "pending"}</span>
                  </td>
                  <td>{formatDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function KycSection({ kycList, reviewKyc, onRequestRevokeKyc }) {
  return (
    <section className="admin-section">
      {kycList.length === 0 ? (
        <EmptyState title="No KYC submissions yet" subtitle="Submitted KYC requests will appear here." />
      ) : (
        <div className="kyc-grid">
          {kycList.map((u) => {
            const status = u.kycData?.status || "pending";
            const docs = [
              { label: "Aadhar Card", url: u.kycData?.studentIdUrl },
              { label: "Driving Licence", url: u.kycData?.licenseUrl },
              { label: "Selfie", url: u.kycData?.selfieUrl },
            ];
            return (
              <article key={u._id} className="kyc-card">
                <div className="kyc-head">
                  <div>
                    <p className="entity-name">{u.name || "—"}</p>
                    <p className="entity-sub">{u.email || "—"}</p>
                    <p className="entity-sub">Submitted: {formatDate(u.kycData?.submittedAt, true)}</p>
                  </div>
                  <span className={`pill status-${status}`}>{status}</span>
                </div>

                <div className="kyc-doc-grid">
                  {docs.map((doc) => (
                    <div key={doc.label}>
                      <p className="doc-label">{doc.label}</p>
                      <div className="doc-frame">
                        {doc.url ? <img src={doc.url} alt={doc.label} className="doc-image" /> : <p className="doc-empty">Not uploaded</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {u.kycData?.status === "rejected" && u.kycData?.rejectReason ? (
                  <p className="kyc-reason">Rejection reason: {u.kycData.rejectReason}</p>
                ) : null}

                {status === "approved" ? (
                  <div className="kyc-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => onRequestRevokeKyc?.(u._id, u.name)}>
                      🧹 Revoke KYC
                    </button>
                  </div>
                ) : (
                  <div className="kyc-actions">
                    <button className="btn btn-success btn-sm" onClick={() => reviewKyc(u._id, "approve")}>
                      Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => reviewKyc(u._id, "reject")}>
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function IncidentsSection({ incidents, onRefresh }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState({});
  const [localError, setLocalError] = useState("");

  const openReporterEmail = (email, name, incId) => {
    if (!email) return;
    const subject = encodeURIComponent(`CampusRide Incident — contact regarding report`);
    const body = encodeURIComponent(
      `Dear ${name || "there"},\n\nThis is regarding your incident report${incId ? ` (${String(incId).slice(-8)})` : ""} on CampusRide.\n\nRegards,\nCampusRide Admin`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const openReporterCall = (phone) => {
    if (!phone) return;
    window.open(`tel:${phone.replace(/\s/g, "")}`);
  };

  const filtered = filter === "all" ? incidents : incidents.filter((i) => i.status === filter);

  const updateStatus = async (incId, status) => {
    setUpdating((u) => ({ ...u, [incId]: true }));
    setLocalError("");
    try {
      const token = localStorage.getItem("cr_token");
      const res = await fetch(`/incidents/${incId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Status update failed.");
      onRefresh();
    } catch (e) {
      setLocalError(e.message || "Could not update incident status.");
    } finally {
      setUpdating((u) => ({ ...u, [incId]: false }));
    }
  };

  const exportToAuthority = async (incId) => {
    setUpdating((u) => ({ ...u, [incId]: true }));
    setLocalError("");
    try {
      await api.exportIncident(incId);
      onRefresh();
    } catch (e) {
      setLocalError(e.message || "Could not export incident.");
    } finally {
      setUpdating((u) => ({ ...u, [incId]: false }));
    }
  };

  const filters = [
    { key: "all", label: "All", count: incidents.length },
    { key: "open", label: "Open", count: incidents.filter((i) => i.status === "open").length },
    { key: "under_review", label: "Under Review", count: incidents.filter((i) => i.status === "under_review").length },
    { key: "resolved", label: "Resolved", count: incidents.filter((i) => i.status === "resolved").length },
  ];

  return (
    <section className="admin-section">
      {localError ? <div className="alert alert-error mb-16">{localError}</div> : null}
      {incidents.length === 0 ? (
        <EmptyState title="No incidents reported" subtitle="Incidents will appear here once users submit reports." />
      ) : (
        <>
          <div className="filters-row">
            {filters.map((f) => (
              <button key={f.key} className={`filter-pill ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <div className="incident-list">
            {filtered.map((inc) => {
              const isOpen = expanded === inc._id;
              const meta = STATUS_META[inc.status] || { label: inc.status || "unknown", tone: "muted" };
              const canMarkReview = inc.status === "open";
              const canResolve = inc.status === "under_review";
              const canExport = inc.status === "under_review";

              return (
                <article key={inc._id} className="incident-card">
                  <button className="incident-head" onClick={() => setExpanded(isOpen ? null : inc._id)}>
                    <div>
                      <p className="entity-name">{inc.reportedBy?.name || "Unknown reporter"}</p>
                      <p className="entity-sub">Incident report</p>
                    </div>
                    <div className="incident-head-right">
                      <span className={`pill ${toneClass(meta.tone)}`}>{meta.label}</span>
                      <span className="incident-arrow">{isOpen ? "▾" : "▸"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="incident-body">
                      <div className="incident-reporter-bar">
                        <div className="detail-label">Reporter</div>
                        <div className="incident-reporter-row">
                          <div>
                            <div className="participant-name">{inc.reportedBy?.name || "—"}</div>
                            <div className="participant-sub">{inc.reportedBy?.email || "—"}</div>
                          </div>
                          <div className="incident-contact-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={!inc.reportedBy?.email}
                              onClick={(e) => {
                                e.stopPropagation();
                                openReporterEmail(inc.reportedBy?.email, inc.reportedBy?.name, inc._id);
                              }}
                            >
                              ✉ Email
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={!inc.reportedBy?.phone}
                              onClick={(e) => {
                                e.stopPropagation();
                                openReporterCall(inc.reportedBy?.phone);
                              }}
                            >
                              📞 Call
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="incident-participants">
                        <div className="participant-card">
                          <div className="detail-label">Seeker</div>
                          <div className="participant-name">{inc.seeker?.name || "—"}</div>
                          <div className="participant-sub">{inc.seeker?.email || "—"}</div>
                          <div className="participant-sub">{inc.seeker?.phone || ""}</div>
                        </div>
                        <div className="participant-card">
                          <div className="detail-label">Provider</div>
                          <div className="participant-name">{inc.rideId?.providerId?.name || "—"}</div>
                          <div className="participant-sub">{inc.rideId?.providerId?.email || "—"}</div>
                          <div className="participant-sub">{inc.rideId?.providerId?.phone || ""}</div>
                        </div>
                      </div>

                      <div className="incident-details-grid">
                        <div>
                          <div className="detail-label">Date Reported</div>
                          <div className="detail-value">{formatDate(inc.createdAt, true)}</div>
                        </div>
                        <div>
                          <div className="detail-label">Type</div>
                          <div className="detail-value">{inc.type || "—"}</div>
                        </div>
                      </div>

                      <div className="incident-description-wrap">
                        <div className="detail-label">Description</div>
                        <p className="incident-description">{inc.description || "No description provided."}</p>
                      </div>

                      <div className="incident-actions">
                        {canMarkReview && (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={updating[inc._id]}
                            onClick={() => updateStatus(inc._id, "under_review")}
                          >
                            🔍 Review
                          </button>
                        )}

                        {canResolve && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={updating[inc._id]}
                              onClick={() => updateStatus(inc._id, "resolved")}
                            >
                              ✅ Resolve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={updating[inc._id]}
                              onClick={() => exportToAuthority(inc._id)}
                            >
                              🚨 Export
                            </button>
                          </>
                        )}

                        {!canMarkReview && !canResolve && !canExport ? (
                          <div className="text-muted text-sm">This incident is already finalized. No further decisions available.</div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="admin-empty">
      <p className="admin-empty-title">{title}</p>
      <p className="admin-empty-sub">{subtitle}</p>
    </div>
  );
}
