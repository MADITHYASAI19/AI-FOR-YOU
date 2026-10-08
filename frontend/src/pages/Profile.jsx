import { useState, useEffect } from "react";
import API from "../utils/api";
import { safeApiCall } from "../utils/asyncHandler";

const Ico = ({ n, size = 18 }) => {
  const paths = {
    check: '<path d="M5 12l5 5 9-10"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, flex: "none" }} dangerouslySetInnerHTML={{ __html: paths[n] || "" }} />;
};

const LeafSvg = () => (
  <svg className="leaf" viewBox="0 0 200 200" fill="currentColor" aria-hidden="true">
    <path d="M20 190C30 120 70 60 150 20c-5 70-40 130-130 170z"/>
    <path d="M60 190c5-50 30-90 80-120-2 50-25 95-80 120z" opacity=".6"/>
  </svg>
);

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ age: "", role: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const [res, err] = await safeApiCall(API.get("/auth/me"));
      if (err) setError("Failed to fetch user profile. Please try logging in again.");
      else if (res) { setUserData(res.data); setEditForm({ age: res.data.age || "", role: res.data.role || "user" }); }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleEditToggle = () => {
    if (!isEditing && userData) setEditForm({ age: userData.age || "", role: userData.role || "user" });
    setIsEditing(!isEditing);
    setSuccessMsg(""); setError("");
  };

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccessMsg("");
    const parsedAge = editForm.age ? parseInt(editForm.age, 10) : null;
    if (parsedAge !== null && (isNaN(parsedAge) || parsedAge < 15 || parsedAge > 80)) {
      setError("Please enter a valid age between 15 and 80."); setSaving(false); return;
    }
    const [res, err] = await safeApiCall(API.put("/auth/me", { age: parsedAge, role: editForm.role }));
    if (err) setError("Failed to update profile.");
    else if (res) { setUserData(res.data); setIsEditing(false); setSuccessMsg("Profile updated successfully!"); }
    setSaving(false);
  };

  const initials = (userData?.username || "U").slice(0, 1).toUpperCase();
  const memberSince = userData?.created_at ? new Date(userData.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Oct 2026";

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Profile</h1>
          <p>Manage your personal information and account security</p>
        </div>
        {userData && (
          <button className="btn btn-outline" onClick={handleEditToggle}>
            <Ico n={isEditing ? "user" : "edit"} size={15} />
            {isEditing ? "Cancel" : "Edit profile"}
          </button>
        )}
      </div>

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {successMsg && <div className="alert-success" style={{ marginBottom: 16 }}>{successMsg}</div>}

      {loading ? (
        <div className="card">
          <div className="empty"><span className="spinner" style={{ width: 32, height: 32 }} /><p style={{ marginTop: 12 }}>Loading profile…</p></div>
        </div>
      ) : userData ? (
        <>
          {/* Hero card */}
          <div className="card prof-hero">
            <LeafSvg />
            <div className="big-av">{initials}</div>
            <div>
              <h2>{userData.username}</h2>
              <p>{userData.email}</p>
              <div className="badges">
                <span className="badge">{userData.role ? userData.role.replace("_", " ") : "User"}</span>
                <span className="badge n">Member since {memberSince}</span>
              </div>
            </div>
            <div className="spacer" />
          </div>

          <div className="grid2">
            {/* Info + edit form */}
            <div className="card">
              <h3>Account Details</h3>
              <p className="sub" style={{ marginBottom: 16 }}>Your personal information and role</p>

              <div className="form">
                <div className="field">
                  <label htmlFor="p-username">Username</label>
                  <div className="iw">
                    <input id="p-username" value={userData.username} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="p-mail">Email</label>
                  <div className="iw">
                    <input id="p-mail" type="email" value={userData.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="p-role">Role</label>
                  <div className="iw">
                    <select
                      id="p-role"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      disabled={!isEditing}
                      style={!isEditing ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                    >
                      <option value="Data Scientist">Data Scientist</option>
                      <option value="ML Engineer">ML Engineer</option>
                      <option value="Data Analyst">Data Analyst</option>
                      <option value="student">Student</option>
                      <option value="professional">Professional</option>
                      <option value="user">User</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="p-age">Age</label>
                  <div className="iw">
                    <input
                      id="p-age"
                      type="number"
                      placeholder="e.g. 25"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      disabled={!isEditing}
                      min="15" max="80"
                      style={!isEditing ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="btns">
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Ico n="save" size={15} />}
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button className="btn btn-outline" onClick={handleEditToggle}>Cancel</button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="stack">
              <div className="card">
                <h3>Account Status</h3>
                <p className="sub" style={{ marginBottom: 14 }}>Your account activity</p>
                <div className="log">
                  <span className="check-ic" style={{ width: 26, height: 26 }}><Ico n="check" size={14} /></span>
                  <div className="t"><b>Email verified</b><br /><small>{userData.email}</small></div>
                  <small>Active</small>
                </div>
                <div className="log">
                  <span className="check-ic" style={{ width: 26, height: 26 }}><Ico n="user" size={14} /></span>
                  <div className="t"><b>Role assigned</b><br /><small>{userData.role || "user"}</small></div>
                  <small>Active</small>
                </div>
                <div className="log" style={{ border: 0 }}>
                  <span className="check-ic" style={{ width: 26, height: 26 }}><Ico n="calendar" size={14} /></span>
                  <div className="t"><b>Member since</b><br /><small>{memberSince}</small></div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="empty">
            <Ico n="user" size={40} style={{ margin: "0 auto 12px", color: "var(--muted)" }} />
            <p style={{ fontWeight: 600 }}>No Profile Data Found</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
