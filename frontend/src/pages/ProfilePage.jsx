import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { logout } from "../redux/slices/authSlice";
import AppLayout from "../components/AppLayout";
import { Save, Trash2, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = { name, email };
      if (password) payload.password = password;
      const { data } = await api.put("/users/profile", payload);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMessage("Profile updated");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete("/users/profile");
      dispatch(logout());
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete account");
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage your account details.</p>
      </div>

      <form onSubmit={handleSave} className="mb-8 max-w-md space-y-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
        </div>

        {message && <p className="text-sm text-moss">{message}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="max-w-md rounded-xl border border-danger/30 bg-surface p-5">
        <p className="mb-1 text-sm font-medium text-ink">Delete account</p>
        <p className="mb-3 text-sm text-ink-soft">This permanently removes your account and cannot be undone.</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-amber-light"
          >
            <Trash2 className="h-4 w-4" /> Delete account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Confirm delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:bg-paper"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
