import { useNavigate, useLocation } from "react-router-dom";

interface SidebarNode {
  id: string;
  label: string;
  path: string;
  iconPath: string; // Filename from https://win98icons.alexmeub.com/ (stored in public/win98-icons/)
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const TOGGLE_ICON_OPEN = "/win98-icons/directory_open_cool-2.png";
const TOGGLE_ICON_CLOSED = "/win98-icons/directory_closed_cool-2.png";

const getSidebarData = (): SidebarNode[] => [
  {
    id: "todays-picks",
    label: "Today's Picks",
    path: "/",
    iconPath: "/win98-icons/cd_audio_cd_a-4.png",
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    iconPath: "/win98-icons/msagent_file-1.png",
  },
];

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const SIDEBAR_DATA = getSidebarData();

  const isSelected = (path: string) => location.pathname === path;

  return (
    <div className="w-full h-full bg-primary flex flex-col">
      {/* Toggle Button Header */}
      <div
        className="px-md py-sm border-b border-gray-400 flex items-center justify-center cursor-pointer hover:bg-secondary"
        onClick={onToggle}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={isOpen}
      >
        <img
          src={isOpen ? TOGGLE_ICON_OPEN : TOGGLE_ICON_CLOSED}
          alt={isOpen ? "Collapse" : "Expand"}
          className="w-4 h-4"
        />
      </div>

      {/* Navigation Items */}
      <ul className="flex-1 pt-md">
        {SIDEBAR_DATA.map((node) => (
          <li key={node.id} className="mb-md">
            <span
              onClick={() => navigate(node.path)}
              className={`cursor-pointer flex items-center gap-sm py-xs w-full ${
                isOpen ? "text-md text-left px-sm" : "justify-center"
              } ${
                isSelected(node.path)
                  ? "font-bold text-title"
                  : "hover:text-accent"
              }`}
              title={isOpen ? undefined : node.label}
            >
              <img
                src={node.iconPath}
                alt={node.label}
                className={`${isOpen ? "w-5 h-5" : "w-6 h-6"}`}
                onError={(e) => {
                  // Fallback: show ? if icon not found
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {isOpen && node.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
