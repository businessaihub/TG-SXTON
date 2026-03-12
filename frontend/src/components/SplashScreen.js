import { useState, useEffect, useRef } from "react";

const SplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [videoDone, setVideoDone] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Minimum display: 2.5s, then fade out 0.5s, then signal parent
    const timer = setTimeout(() => {
      setFadeOut(true);
      setVideoDone(true);
    }, 2500);
    const finish = setTimeout(onFinish, 3000);
    return () => { clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0f]"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.5s ease-out",
      }}
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        onEnded={() => { setVideoDone(true); }}
        onError={() => { setVideoDone(true); onFinish(); }}
      />
      {videoDone && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
