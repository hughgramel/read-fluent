"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/userService';
import { ReadingSessionService, ReadingSession } from '@/services/readingSessionService';
import { FiEdit2 } from 'react-icons/fi';
import { FaCalendarCheck, FaBookOpen, FaCreditCard, FaGraduationCap, FaRegListAlt, FaInfoCircle, FaGithub, FaReddit, FaDiscord, FaFileAlt, FaCopyright, FaSyncAlt } from 'react-icons/fa';

export default function Home() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [dailyGoal, setDailyGoal] = useState(1500);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState<string>('1500');

  // On mount, fetch reading sessions
  useEffect(() => {
    if (!user?.uid) return;
    ReadingSessionService.getUserSessions(user.uid).then(setSessions);
  }, [user]);

  // On mount, load daily goal from Firebase
  useEffect(() => {
    if (!user?.uid) return;
    UserService.getDailyGoal(user.uid).then(goal => {
      setDailyGoal(goal);
      setGoalInput(String(goal));
    }).catch(() => {
      setDailyGoal(1500);
      setGoalInput('1500');
    });
  }, [user]);

  // Helper: get today's date string (YYYY-MM-DD)
  function getToday() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  // Helper: compare two dates by local year, month, and day
  function isSameLocalDay(dateA: Date, dateB: Date) {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }
  const today = new Date();
  const sessionsToday = sessions
    ? sessions.filter((s) => {
        if (!s.timestamp) return false;
        let sessionDate: Date;
        if (typeof s.timestamp === 'string') {
          sessionDate = new Date(s.timestamp);
        } else if (s.timestamp instanceof Date) {
          sessionDate = s.timestamp;
        } else if (typeof s.timestamp === 'object' && s.timestamp !== null && typeof (s.timestamp as any).toDate === 'function') {
          sessionDate = (s.timestamp as any).toDate();
        } else {
          return false;
        }
        return isSameLocalDay(sessionDate, today);
      })
    : [];
  const wordsReadToday = sessionsToday.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const pct = Math.min(100, (wordsReadToday / dailyGoal) * 100);
  const dashoffset = 282.743 * (1 - pct / 100);

  const PIN_LIGHT_GRAY = '#9aa1b2'; // match Sidebar.tsx

  return (
    <div className="page-container">
      <div className="pr-8 pb-10 transition-all duration-300" style={{ marginLeft: 80, paddingTop: 24, maxWidth: 1200 }}>
        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-3xl font-extrabold theme-text tracking-tight" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>Home</h1>
          <div style={{ height: 4, width: 48, background: 'var(--primary-color)', borderRadius: 2 }} />
        </div>
        {/* Daily Goals Row */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6 mt-12">
            <h2 className="text-xl font-bold theme-primary tracking-tight" style={{ fontFamily: 'var(--font-family)', letterSpacing: '-0.01em', fontWeight: 700 }}>Daily Goals</h2>
            <div className="flex-1 border-t theme-border" />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-6 min-h-[180px]">
            {/* Card 2: Reading */}
            <div className="card-themed-primary flex flex-col items-center w-full max-w-[240px] min-w-[180px] p-4" style={{ minHeight: 260, position: 'relative' }}>
              <div className="w-full text-left mb-2 flex items-center justify-between">
                <span className="text-lg font-semibold theme-text">Reading</span>
                <button
                  onClick={() => setShowGoalModal(true)}
                  style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: PIN_LIGHT_GRAY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Edit goal"
                  aria-label="Edit goal"
                >
                  <FiEdit2 size={18} />
                </button>
              </div>
              {/* Progress Circle */}
              <div className="relative flex items-center justify-center w-36 h-36 my-2">
                <svg className="w-36 h-36 rotate-[-90deg]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--primary-color)" strokeWidth="10" strokeDasharray="282.743" strokeDashoffset={dashoffset} strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold theme-text">{wordsReadToday} / {dailyGoal}</span>
              </div>
              <div className="theme-text-secondary text-sm text-center mb-4">Read {dailyGoal} words from any imported text.</div>
            </div>
          </div>
        </div>
        {/* Statistics Row Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6 mt-12">
            <h2 className="text-xl font-bold theme-primary tracking-tight" style={{ fontFamily: 'var(--font-family)', letterSpacing: '-0.01em', fontWeight: 700 }}>Statistics</h2>
            <div className="flex-1 border-t theme-border" />
          </div>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card-themed-accent p-4 flex items-center gap-3 min-w-[180px]">
              <FaCalendarCheck size={28} style={{ color: 'var(--primary-color)' }} />
              <div className="flex flex-col flex-1">
                <span className="text-2xl font-bold theme-primary">1</span>
                <span className="theme-text text-base">Days of activity</span>
              </div>
            </div>
            <div className="card-themed-accent p-4 flex items-center gap-3 min-w-[180px]">
              <FaBookOpen size={28} style={{ color: 'var(--primary-color)' }} />
              <div className="flex flex-col flex-1">
                <span className="text-2xl font-bold theme-primary">0</span>
                <span className="theme-text text-base">Read words</span>
              </div>
            </div>
            <div className="card-themed-accent p-4 flex items-center gap-3 min-w-[180px]">
              <FaCreditCard size={28} style={{ color: 'var(--primary-color)' }} />
              <div className="flex flex-col flex-1">
                <span className="text-2xl font-bold theme-primary">21</span>
                <span className="theme-text text-base">Known words</span>
              </div>
            </div>
            <div className="card-themed-accent p-4 flex items-center gap-3 min-w-[180px]">
              <FaGraduationCap size={28} style={{ color: 'var(--primary-color)' }} />
              <div className="flex flex-col flex-1">
                <span className="text-2xl font-bold theme-primary">0</span>
                <span className="theme-text text-base">Words currently studied</span>
              </div>
            </div>
            <div className="card-themed-accent p-4 flex items-center gap-3 min-w-[180px]">
              <FaRegListAlt size={28} style={{ color: 'var(--primary-color)' }} />
              <div className="flex flex-col flex-1">
                <span className="text-2xl font-bold theme-primary">6</span>
                <span className="theme-text text-base">Known lemmas</span>
              </div>
            </div>
          </div>
        </div>
        {/* About Row Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6 mt-12">
            <h2 className="text-xl font-bold theme-primary tracking-tight" style={{ fontFamily: 'var(--font-family)', letterSpacing: '-0.01em', fontWeight: 700 }}>About</h2>
            <div className="flex-1 border-t theme-border" />
          </div>
          {/* About Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* App Info */}
            <div className="card-themed-secondary p-6 min-w-[260px] flex flex-col">
              <h3 className="text-xl font-bold mb-2 theme-text">ReadFluent</h3>
              <p className="theme-text-secondary mb-4">You can find more information about ReadFluent on these links.</p>
              <div className="flex flex-col gap-2 mt-auto">
                <a href="#" className="flex items-center gap-2 theme-primary font-semibold hover:underline"><FaCopyright /> Attributions</a>
                <a href="#" className="flex items-center gap-2 theme-primary font-semibold hover:underline"><FaFileAlt /> Overview</a>
                <a href="/patch-notes" className="flex items-center gap-2 theme-primary font-semibold hover:underline"><FaInfoCircle /> Patch Notes</a>
              </div>
            </div>
            {/* Contact */}
            <div className="card-themed-secondary p-6 min-w-[260px] flex flex-col">
              <h3 className="text-xl font-bold mb-2 theme-text">Contact</h3>
              <p className="theme-text-secondary mb-4">You can contact the developer of ReadFluent on these platforms.</p>
              <div className="flex flex-col gap-2 mt-auto">
                <a href="https://discord.gg/your-link" className="flex items-center gap-2 theme-primary font-semibold hover:underline"><FaDiscord /> Discord chat</a>
                <a href="https://github.com/your-repo" className="flex items-center gap-2 theme-primary font-semibold hover:underline"><FaGithub /> Github</a>
                <a href="https://reddit.com/r/your-subreddit" className="flex items-center gap-2 theme-primary font-semibold hover:underline"><FaReddit /> Reddit</a>
              </div>
            </div>
            {/* Version */}
            <div className="card-themed-secondary p-6 min-w-[260px] flex flex-col">
              <h3 className="text-xl font-bold mb-2 theme-text">Version</h3>
              <p className="theme-text-secondary mb-4">The current ReadFluent version is v0.1.0.</p>
              <div className="flex flex-col gap-2 mt-auto">
                <a href="/patch-notes" className="flex items-center gap-2 theme-primary font-semibold hover:underline"><FaSyncAlt /> Update notes</a>
              </div>
            </div>
          </div>
        </div>
        {/* Daily Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.32)' }}>
            <div className="card-themed p-8 max-w-md w-full relative" style={{ fontFamily: 'var(--font-family)', minWidth: 340 }}>
              <button
                onClick={() => setShowGoalModal(false)}
                className="absolute top-3 right-3 theme-text-secondary hover:theme-primary text-2xl font-bold transition-colors"
                style={{ background: 'none', border: 'none', lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-2xl font-extrabold mb-4 theme-text tracking-tight text-center">Edit daily reading goal</h2>
              <div className="theme-primary text-white rounded-lg p-4 mb-6 text-sm flex items-flex-start gap-3" style={{ backgroundColor: 'var(--primary-color)', borderRadius: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 18, marginRight: 8, lineHeight: 1 }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" fillOpacity="0.18"/><path d="M12 8v4m0 4h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span>This setting will only affect today's and upcoming days' goal. Past days' goals will not be affected.</span>
              </div>
              <div className="flex flex-col gap-4 items-center">
                <label className="font-semibold theme-text w-full text-left mb-1">Goal quantity</label>
                <input
                  type="number"
                  min={100}
                  max={10000}
                  value={goalInput}
                  onChange={e => {
                    let val = e.target.value;
                    if (/^0+\d/.test(val)) {
                      val = val.replace(/^0+/, '');
                    }
                    if (val === '0') {
                      val = '';
                    }
                    if (/^\d*$/.test(val)) {
                      setGoalInput(val);
                    }
                  }}
                  className="input-themed text-lg text-center"
                  style={{ width: 180 }}
                />
                <div className="flex flex-row justify-end gap-4 w-full mt-6">
                  <button
                    onClick={() => setShowGoalModal(false)}
                    className="px-4 py-2 rounded-full font-semibold theme-text-secondary bg-gray-100 hover:bg-gray-200 transition-colors text-base border-none focus:outline-none"
                  >Cancel</button>
                  <button
                    onClick={async () => {
                      const num = Number(goalInput);
                      if (!isNaN(num) && num >= 100 && num <= 10000) {
                        if (!user?.uid) {
                          alert('You must be signed in to save your goal.');
                          return;
                        }
                        try {
                          await UserService.setDailyGoal(user.uid, num);
                          setDailyGoal(num);
                          setShowGoalModal(false);
                        } catch (err) {
                          alert('Failed to save your goal. Please try again.');
                        }
                      }
                    }}
                    className="btn-primary px-6 py-2 rounded-full font-bold text-base"
                  >Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 