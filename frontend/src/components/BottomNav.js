const BottomNav = ({ tabs, currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 z-50 backdrop-blur-xl bg-slate-900/95">
      <div className="max-w-md mx-auto flex items-center justify-around py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`nav-${tab.id}`}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all transform hover:scale-105 active:scale-95 ${
                isActive
                  ? "text-cyan-400 bg-cyan-500/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
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