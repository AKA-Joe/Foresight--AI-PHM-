import { useEffect, useState } from 'react';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [fadeOut, setFadeOut] = useState(false);
  const [barProgress, setBarProgress] = useState(0);
  const [textPhase, setTextPhase] = useState(0);

  useEffect(() => {
    const totalDuration = 2200;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / totalDuration) * 100);
      setBarProgress(progress);
      if (elapsed > 600) setTextPhase(1);
      if (elapsed > 1200) setTextPhase(2);
      if (progress >= 100) {
        clearInterval(interval);
        setFadeOut(true);
        setTimeout(onDone, 500);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [onDone]);

  const bgGradient = 'radial-gradient(ellipse at 50% 30%, #0a1e3d 0%, #020810 60%, #010208 100%)';
  const ringColor1 = '#3b82f6';
  const ringColor2 = '#f59e0b';
  const dotColor  = '#60a5fa';
  const textColor = '#f0f6ff';
  const subColor  = '#6b8ab5';
  const tagBg     = 'rgba(59,130,246,0.08)';
  const tagBorder = 'rgba(59,130,246,0.15)';
  const tagColor  = '#3b82f6';
  const barBg     = 'rgba(59,130,246,0.08)';
  const barFill   = 'linear-gradient(90deg, #3b82f6, #f59e0b)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bgGradient,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease',
        fontFamily: '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
      }}
    >
      {/* Animated Logo Ring */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0 }}>
          {/* Outer ring - rotates */}
          <g style={{ transformOrigin: '60px 60px', animation: 'splashRingSpin 3s linear infinite' }}>
            <circle cx="60" cy="60" r="48" fill="none" stroke={ringColor1} strokeWidth="1.5" opacity="0.6" />
            <circle cx="60" cy="60" r="42" fill="none" stroke={ringColor1} strokeWidth="0.5" opacity="0.3"
              strokeDasharray="8 4" />
          </g>
          {/* Middle ring - counter rotates */}
          <g style={{ transformOrigin: '60px 60px', animation: 'splashRingSpinRev 2s linear infinite' }}>
            <circle cx="60" cy="60" r="28" fill="none" stroke={ringColor2} strokeWidth="1.5" opacity="0.8" />
            <circle cx="60" cy="60" r="22" fill="none" stroke={ringColor2} strokeWidth="0.5" opacity="0.3" />
          </g>
          {/* Center dot - pulses */}
          <circle cx="60" cy="60" r="6" fill={dotColor} opacity="0.9" style={{ animation: 'splashPulse 1.5s ease-in-out infinite' }} />
          {/* Orbiting dot */}
          <g style={{ transformOrigin: '60px 60px', animation: 'splashRingSpin 4s linear infinite' }}>
            <circle cx="60" cy="18" r="3" fill={ringColor2} opacity="0.8" />
          </g>
        </svg>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: 28, fontWeight: 900, letterSpacing: '0.15em', color: textColor,
        margin: '0 0 6px', textAlign: 'center', fontFamily: '"Noto Sans SC","PingFang SC",sans-serif',
      }}>
        明鉴——AI+设备预测性维护平台
      </h1>
      <p style={{
        fontSize: 13, color: subColor, letterSpacing: '0.3em', margin: '0 0 24px',
        fontWeight: 500, textAlign: 'center',
      }}>
        非标设备 5G+AI 预测性维护
      </p>

      {/* Tech tags */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['5G MEC', 'TADPE 引擎', '时序预测', '数字孪生'].map((tag, i) => (
          <span key={tag} style={{
            fontSize: 10, padding: '3px 12px', borderRadius: 6,
            background: tagBg, border: `1px solid ${tagBorder}`,
            color: tagColor, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace',
            letterSpacing: '0.05em',
            opacity: textPhase >= 1 ? 1 : 0,
            transform: textPhase >= 1 ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.4s ease ${0.1 + i * 0.1}s, transform 0.4s ease ${0.1 + i * 0.1}s`,
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Loading bar */}
      <div style={{
        width: 200, height: 3, borderRadius: 2, background: barBg, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${barProgress}%`, background: barFill, borderRadius: 2,
          transition: 'width 0.1s linear', boxShadow: '0 0 10px rgba(59,130,246,0.5)',
        }} />
      </div>
      <div style={{
        fontSize: 10, color: subColor, marginTop: 8, fontFamily: '"JetBrains Mono",monospace',
        opacity: textPhase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease',
      }}>
        {textPhase < 2 ? '正在初始化...' : '系统就绪'}
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes splashRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes splashRingSpinRev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes splashPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
      `}</style>
    </div>
  );
}
