import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import {
  LayoutDashboard,
  Upload,
  MessageCircle,
  Brain,
  CalendarClock,
  UserRound,
  LogOut,
  BookOpen,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Documents", icon: Upload },
  { to: "/chat", label: "Ask My Notes", icon: MessageCircle },
  { to: "/quizzes", label: "Quizzes", icon: Brain },
  { to: "/study-plan", label: "Study Planner", icon: CalendarClock },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-6 py-6">
        <BookOpen className="h-6 w-6 text-moss" strokeWidth={1.75} />
        <span className="font-display text-lg tracking-tight text-ink">StudyMate AI</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-moss-light text-moss-dark font-medium"
                  : "text-ink-soft hover:bg-paper hover:text-ink"
              }`
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line px-3 py-4">
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
          <p className="truncate text-xs text-ink-soft">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper hover:text-danger"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </aside>
  );
}
