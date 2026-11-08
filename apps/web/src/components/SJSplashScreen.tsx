import React, { useState, useEffect, useRef } from 'react';

interface SJSplashScreenProps {
  onFinished?: () => void;
  duration?: number;
}

export default function SJSplashScreen({ onFinished, duration = 1800 }: SJSplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing SurgePilot AI...');
  const [isFading, setIsFading] = useState(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const startTime = Date.now();
    let hasCompleted = false;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 25) {
        setStatusText('Initializing H3 Geospatial Matrix...');
      } else if (pct < 55) {
        setStatusText('Connecting to PostGIS Spatial Engine...');
      } else if (pct < 85) {
        setStatusText('Syncing Live Flight & Transit Feeds...');
      } else {
        setStatusText('SurgePilot Radar Ready!');
      }

      if (pct >= 100 && !hasCompleted) {
        hasCompleted = true;
        clearInterval(interval);
        setIsFading(true);
        setTimeout(() => {
          if (onFinishedRef.current) onFinishedRef.current();
        }, 300);
      }
    }, 30);

    const fallbackTimer = setTimeout(() => {
      if (!hasCompleted) {
        hasCompleted = true;
        clearInterval(interval);
        setIsFading(true);
        setTimeout(() => {
          if (onFinishedRef.current) onFinishedRef.current();
        }, 300);
      }
    }, duration + 500);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimer);
    };
  }, [duration]);

  const handleSkip = () => {
    setIsFading(true);
    setTimeout(() => {
      if (onFinishedRef.current) onFinishedRef.current();
    }, 150);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#090d16',
        backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.1) 40%, rgba(9, 13, 22, 0.98) 80%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        opacity: isFading ? 0 : 1,
        transform: isFading ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        pointerEvents: isFading ? 'none' : 'auto',
        overflow: 'hidden'
      }}
    >
      {/* Background Glow Effects */}
      <div
        style={{
          position: 'absolute',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(70px)',
          animation: 'sjPulse 4s infinite alternate ease-in-out'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(60px)',
          animation: 'sjPulse 3s infinite alternate-reverse ease-in-out'
        }}
      />

      {/* Main Glass Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          padding: '44px 40px',
          borderRadius: '24px',
          background: 'rgba(19, 26, 41, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          maxWidth: '440px',
          width: '90%'
        }}
      >
        {/* Animated 3D Continuous Rotating SJ Logo Emblem */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1000px', width: '130px', height: '130px' }}>
          {/* Outer Orbit Ring 1 (Clockwise) */}
          <div
            style={{
              position: 'absolute',
              width: '124px',
              height: '124px',
              borderRadius: '36px',
              border: '2px dashed rgba(16, 185, 129, 0.8)',
              animation: 'sjSpinClockwise 7s linear infinite',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
            }}
          />
          {/* Outer Orbit Ring 2 (Counter-Clockwise) */}
          <div
            style={{
              position: 'absolute',
              width: '108px',
              height: '108px',
              borderRadius: '30px',
              border: '2px dotted rgba(6, 182, 212, 0.85)',
              animation: 'sjSpinCounter 10s linear infinite'
            }}
          />

          {/* Central 3D Spinning SJ Logo Badge */}
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 45px rgba(16, 185, 129, 0.8), inset 0 2px 6px rgba(255, 255, 255, 0.6)',
              animation: 'sj3DSpinContinuous 4s linear infinite',
              transformStyle: 'preserve-3d'
            }}
          >
            <span
              style={{
                fontSize: '2.6rem',
                fontWeight: 900,
                color: '#ffffff',
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 255, 255, 0.8)',
                letterSpacing: '-1.5px',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              SJ
            </span>
          </div>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            SurgePilot<span style={{ color: '#10b981' }}>.ai</span>
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'rgba(255, 255, 255, 0.6)',
              margin: '6px 0 0 0',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            Real-Time PostGIS &amp; H3 Surge Optimization
          </p>
        </div>

        {/* Progress Bar Container */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              padding: '2px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                borderRadius: '999px',
                transition: 'width 0.1s ease-out',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.9)'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>{statusText}</span>
            <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>{progress}%</span>
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          style={{
            marginTop: '4px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            padding: '4px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s',
            fontWeight: 500
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)')}
        >
          Skip Intro &rarr;
        </button>
      </div>

      <style>{`
        @keyframes sjPulse {
          0% { transform: scale(0.9) translate(-10px, -10px); opacity: 0.5; }
          100% { transform: scale(1.1) translate(10px, 10px); opacity: 0.9; }
        }
        @keyframes sjSpinClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sjSpinCounter {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes sj3DSpinContinuous {
          0% { transform: rotateY(0deg) rotateX(5deg); }
          50% { transform: rotateY(180deg) rotateX(-5deg); }
          100% { transform: rotateY(360deg) rotateX(5deg); }
        }
      `}</style>
    </div>
  );
}
