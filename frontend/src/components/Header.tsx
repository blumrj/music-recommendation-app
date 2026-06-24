interface HeaderProps {
  isLoggedIn?: boolean;
  onLogout?: () => void;
  onAboutDora?: () => void;
  onToggleSidebar?: () => void;
}

const ABOUT_ICON = "/win98-icons/help_question_mark-0.png";

const Header = ({ isLoggedIn = false, onLogout, onAboutDora, onToggleSidebar }: HeaderProps) => {
  return (
    <div className="flex items-center justify-between px-sm py-sm gap-sm bg-primary border-xp-bottom shadow-xp-inset min-h-13.5">
      {/* Left Side: Hamburger (mobile) + App Logo */}
      <div className="flex items-center gap-sm flex-1">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden button p-1"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
        )}
        <div className="text-4xl font-bold text-text-primary">DORA</div>
      </div>

      {/* Right Side: Buttons */}
      <div className="flex gap-md items-center">
        {isLoggedIn && <button onClick={onLogout}>Logout</button>}
        <img
          src={ABOUT_ICON}
          alt="About DORA"
          onClick={onAboutDora}
          className="w-6 h-6 cursor-pointer hover:opacity-70"
          title="About DORA"
        />
      </div>
    </div>
  );
};

export default Header;
