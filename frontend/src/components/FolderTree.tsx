import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface FolderTreeProps {
  onFolderSelect: (folderId: string, folderName: string) => void;
  selectedFolder?: string;
}

interface TreeNode {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: TreeNode[];
}

const getFolderData = (): TreeNode[] => [
  {
    id: "music",
    label: "Music",
    icon: "🎵",
    path: "/",
    children: [
      {
        id: "todays-picks",
        label: "Today's Picks",
        icon: "📅",
        path: "/",
      },
      {
        id: "favorites",
        label: "Favorites",
        icon: "❤️",
        path: "/favorites",
      },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    icon: "👤",
    path: "/profile",
  },
];

const FolderTree = ({ onFolderSelect, selectedFolder }: FolderTreeProps) => {
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["music"])
  );
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);

  const FOLDER_DATA = getFolderData();

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleNodeClick = (node: TreeNode) => {
    onFolderSelect(node.id, node.label);
    navigate(node.path);
  };

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div
        key={node.id}
        style={{
          marginLeft: `${depth * 16}px`,
          userSelect: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "2px 4px",
            cursor: "pointer",
            backgroundColor:
              selectedFolder === node.id ? "#7B5BA8" : hoveredFolder === node.id ? "#B4A8D4" : "transparent",
            color: selectedFolder === node.id ? "#fff" : "#000",
            borderRadius: "2px",
            fontSize: "12px",
            fontFamily: "MS Sans Serif, Arial, sans-serif",
            minHeight: "18px",
          }}
          onClick={() => handleNodeClick(node)}
          onDoubleClick={() => hasChildren && toggleFolder(node.id)}
          onMouseEnter={() => setHoveredFolder(node.id)}
          onMouseLeave={() => setHoveredFolder(null)}
        >
          {hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "16px",
                height: "16px",
                marginRight: "2px",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              {isExpanded ? "▼" : "►"}
            </span>
          )}
          {!hasChildren && (
            <span style={{ width: "16px", marginRight: "2px" }} />
          )}
          {depth === 0 && (
            <span style={{ marginRight: "4px" }}>{node.icon}</span>
          )}
          {depth > 0 && (
            <span style={{ marginRight: "4px" }}>-</span>
          )}
          <span>{node.label}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: "220px",
        background: "#c0c0c0",
        borderRight: "2px solid",
        borderColor: "#dfdfdf #808080 #808080 #dfdfdf",
        boxShadow: "inset 1px 1px 0px rgba(255,255,255,0.5), inset -1px -1px 0px rgba(0,0,0,0.2)",
        padding: "4px",
        overflowY: "auto",
        height: "100%",
        fontFamily: "MS Sans Serif, Arial, sans-serif",
      }}
    >
      {FOLDER_DATA.map((node) => renderNode(node))}
    </div>
  );
};

export default FolderTree;
