const BottomNav = ({ tabs, currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 z-40">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`nav-${tab.id}`}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isActive
                  ? "text-cyan-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon size={24} className={isActive ? "animate-pulse" : ""} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;