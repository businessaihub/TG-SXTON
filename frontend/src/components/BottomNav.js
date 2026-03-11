const BottomNav = ({ tabs, currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/95 border-t border-white/10"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="w-full max-w-lg mx-auto flex items-center justify-around py-1.5 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`nav-${tab.id}`}
              className={`flex flex-col items-center gap-0.5 min-w-0 px-1.5 py-1.5 rounded-lg transition-colors active:scale-95 ${
                isActive
                  ? "text-cyan-400 bg-cyan-500/10"
                  : "text-gray-400 active:text-white active:bg-white/5"
              }`}
            >
              <Icon size={20} className={isActive ? "animate-pulse" : ""} />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[48px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;