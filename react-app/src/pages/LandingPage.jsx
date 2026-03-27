import '../styles/landing.css';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { publicApi } from '../utils/api';
import {
  Brain, Users, FileVideo, HeadphonesIcon, UserCheck, BarChart3,
  Trophy, Monitor, ChevronRight, Menu, X, Mail, Github, Twitter,
  Linkedin, BookOpen, Sparkles, Eye, MessageCircle, Check, Rocket
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ===== Scroll-driven floating rocket ===== */
function FloatingRocket() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1500], [0, -600]);
  const rotate = useTransform(scrollY, [0, 1500], [45, -15]);
  const x = useTransform(scrollY, [0, 800, 1500], [0, 30, -20]);

  return (
    <motion.div
      className="ld-floating-rocket"
      style={{ y, rotate, x }}
    >
      <Rocket size={48} />
    </motion.div>
  );
}

/* ===== Parallax wrapper ===== */
function ParallaxSection({ children, className, id, speed = 0.15 }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [80 * speed, -80 * speed]);

  return (
    <section id={id} className={className} ref={ref}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </section>
  );
}

/* ===== Auth Modal ===== */
function AuthModal({ isOpen, onClose, initialTab }) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState(initialTab || 'login');

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab || 'login');
  }, [isOpen, initialTab]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regGroup, setRegGroup] = useState('');
  const [regError, setRegError] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyInfo, setVerifyInfo] = useState('');

  const { login, register, verifyEmailCode } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    publicApi.getGroups().then(setGroups).catch(() => setGroups([]));
  }, []);

  const mapAuthError = (raw, fallback) => {
    const msg = String(raw || '').toLowerCase();
    if (msg.includes('not verified')) return t('authEmailNotVerified');
    if (msg.includes('already registered')) return t('authEmailAlreadyRegistered');
    if (msg.includes('invalid or expired verification code')) return t('authInvalidVerificationCode');
    if (msg.includes('failed to fetch') || msg.includes('networkerror')) return t('authServerUnavailable');
    return raw || fallback;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const res = await login(loginEmail, loginPass);
    if (res?.user) {
      onClose();
      navigate(res.user.role === 'teacher' ? '/teacher' : '/student');
    } else {
      setLoginError(mapAuthError(res?.error, t('loginError')));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setVerifyError('');
    setVerifyInfo('');
    const res = await register(regName, regEmail, regPass, regRole, regGroup);
    if (res?.error) {
      setRegError(mapAuthError(res.error, t('loginError')));
    } else {
      setPendingVerificationEmail(regEmail);
      setVerificationCode('');
      setVerifyInfo(t('authRegisterCheckEmail'));
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyInfo('');

    const res = await verifyEmailCode(pendingVerificationEmail, verificationCode);
    if (res?.error) {
      setVerifyError(mapAuthError(res.error, t('authInvalidVerificationCode')));
      return;
    }

    onClose();
    navigate(res.user.role === 'teacher' ? '/teacher' : '/student');
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setLoginError('');
    setRegError('');
    setVerifyError('');
    setVerifyInfo('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="ld-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="ld-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="ld-modal-close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="ld-modal-header">
              <BookOpen size={28} color="#6366f1" />
              <h2>StudyHubAi</h2>
              <p>{t('authPlatform')}</p>
            </div>

            <div className="ld-modal-tabs">
              <button
                className={`ld-modal-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => switchTab('login')}
              >
                {t('login')}
              </button>
              <button
                className={`ld-modal-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => switchTab('register')}
              >
                {t('register')}
              </button>
            </div>

            {activeTab === 'login' && (
              <form className="ld-modal-form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder={t('password')}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                />
                <button type="submit" className="ld-btn ld-btn-primary ld-btn-full">{t('login')}</button>
                {loginError && <p className="ld-modal-error">{loginError}</p>}
                <p className="ld-modal-hint">{t('loginHint')}</p>
              </form>
            )}

            {activeTab === 'register' && (
              <form className="ld-modal-form" onSubmit={handleRegister}>
                <input
                  type="text"
                  placeholder={t('name')}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder={t('password')}
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  required
                  minLength={6}
                />
                <div className="ld-role-toggle">
                  <button
                    type="button"
                    className={`ld-role-btn ${regRole === 'student' ? 'active' : ''}`}
                    onClick={() => setRegRole('student')}
                  >
                    {t('student')}
                  </button>
                  <button
                    type="button"
                    className={`ld-role-btn ${regRole === 'teacher' ? 'active' : ''}`}
                    onClick={() => setRegRole('teacher')}
                  >
                    {t('teacher')}
                  </button>
                </div>
                {regRole === 'student' && (
                  <select value={regGroup} onChange={(e) => setRegGroup(e.target.value)} required>
                    <option value="">{t('selectGroup')}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
                <button type="submit" className="ld-btn ld-btn-primary ld-btn-full">{t('register')}</button>
                {regError && <p className="ld-modal-error">{regError}</p>}

                {pendingVerificationEmail && (
                  <>
                    <p className="ld-modal-hint">{verifyInfo || t('authRegisterCheckEmail')}</p>
                    <input
                      type="text"
                      placeholder={t('authVerificationCodePlaceholder')}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                    />
                    <button type="button" className="ld-btn ld-btn-primary ld-btn-full" onClick={handleVerifyCode}>
                      {t('authVerifyCode')}
                    </button>
                    {verifyError && <p className="ld-modal-error">{verifyError}</p>}
                    {verifyInfo === t('authVerificationSuccess') && <p className="ld-modal-hint">{verifyInfo}</p>}
                  </>
                )}
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===== Navbar ===== */
function Navbar({ onLogin, onSignup }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <nav className="ld-nav">
      <div className="ld-nav-inner">
        <Link to="/" className="ld-logo">
          <BookOpen size={28} />
          <span>StudyHubAi</span>
        </Link>

        <div className="ld-nav-links">
          <a href="#features">{t('navFeatures')}</a>
          <a href="#pricing">{t('navPricing')}</a>
          <a href="#about">{t('navAbout')}</a>
        </div>

        <div className="ld-nav-actions">
          <LanguageSwitcher />
          <button className="ld-btn ld-btn-ghost" onClick={onLogin}>{t('logIn')}</button>
          <button className="ld-btn ld-btn-primary" onClick={onSignup}>{t('signUpFree')}</button>
        </div>

        <button className="ld-mobile-toggle" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`ld-mobile-menu ${open ? 'open' : ''}`}>
        <LanguageSwitcher />
        <a href="#features" onClick={() => setOpen(false)}>{t('navFeatures')}</a>
        <a href="#pricing" onClick={() => setOpen(false)}>{t('navPricing')}</a>
        <a href="#about" onClick={() => setOpen(false)}>{t('navAbout')}</a>
        <button className="ld-btn ld-btn-primary" onClick={() => { setOpen(false); onSignup(); }}>{t('getStarted')}</button>
      </div>
    </nav>
  );
}

/* ===== Hero ===== */
function Hero({ onSignup }) {
  const { t } = useLang();
  return (
    <section className="ld-hero">
      {/* Animated gradient blobs */}
      <div className="ld-hero-blobs">
        <div className="ld-blob ld-blob-1" />
        <div className="ld-blob ld-blob-2" />
        <div className="ld-blob ld-blob-3" />
      </div>

      <FloatingRocket />

      <div className="ld-hero-inner">
        <motion.div
          className="ld-hero-content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="ld-badge">
            <Sparkles size={16} />
            {t('badgeText')}
          </motion.div>
          <motion.h1 variants={fadeUp}>
            {t('heroTitle')}
            <span>{t('heroSubtitle')}</span>
          </motion.h1>
          <motion.p variants={fadeUp}>
            {t('heroDesc')}
          </motion.p>
          <motion.div variants={fadeUp} className="ld-hero-buttons">
            <button className="ld-btn ld-btn-primary ld-btn-lg" onClick={onSignup}>
              {t('startFree')} <ChevronRight size={18} />
            </button>
            <a href="#features" className="ld-btn ld-btn-outline ld-btn-lg">
              {t('seeFeatures')}
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          className="ld-hero-visual"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="ld-dashboard-mock">
            <div className="ld-mock-dots">
              <span /><span /><span />
              <small>{t('dashboardPreview')}</small>
            </div>
            <div className="ld-mock-grid">
              <div className="ld-mock-row">
                <div className="ld-mock-cell" style={{ height: 80, background: '#eef2ff' }}>
                  <BarChart3 size={32} color="#818cf8" />
                </div>
                <div className="ld-mock-cell" style={{ height: 80, background: '#f3e8ff' }}>
                  <Users size={32} color="#a78bfa" />
                </div>
              </div>
              <div className="ld-mock-row">
                <div className="ld-mock-cell" style={{ height: 96, background: 'linear-gradient(135deg, #eef2ff, #f3e8ff)' }}>
                  <Monitor size={40} color="#a5b4fc" />
                </div>
              </div>
              <div className="ld-mock-row">
                <div className="ld-mock-cell" style={{ height: 64, background: '#ecfdf5' }}>
                  <Trophy size={24} color="#6ee7b7" />
                </div>
                <div className="ld-mock-cell" style={{ height: 64, background: '#eff6ff' }}>
                  <Brain size={24} color="#93c5fd" />
                </div>
                <div className="ld-mock-cell" style={{ height: 64, background: '#fff7ed' }}>
                  <MessageCircle size={24} color="#fdba74" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const getTeacherFeatures = (t) => [
  { key: 'ai', icon: Brain, title: t('featTeacherAI'), desc: t('featTeacherAIDesc') },
  { key: 'groups', icon: Users, title: t('featTeacherGroups'), desc: t('featTeacherGroupsDesc') },
  { key: 'materials', icon: FileVideo, title: t('featTeacherMaterials'), desc: t('featTeacherMaterialsDesc') },
  { key: 'support', icon: HeadphonesIcon, title: t('featTeacherSupport'), desc: t('featTeacherSupportDesc') },
];

const getStudentFeatures = (t) => [
  { key: 'access', icon: UserCheck, title: t('featStudentAccess'), desc: t('featStudentAccessDesc') },
  { key: 'progress', icon: BarChart3, title: t('featStudentProgress'), desc: t('featStudentProgressDesc') },
  { key: 'leaderboard', icon: Trophy, title: t('featStudentLeaderboard'), desc: t('featStudentLeaderboardDesc') },
  { key: 'results', icon: Eye, title: t('featStudentResults'), desc: t('featStudentResultsDesc') },
];

function FeatureCard({ icon: Icon, title, desc, color }) {
  return (
    <motion.div variants={fadeUp} className="ld-feature-card">
      <div className={`ld-feature-icon ${color}`}>
        <Icon size={24} />
      </div>
      <h4>{title}</h4>
      <p>{desc}</p>
    </motion.div>
  );
}

function Features() {
  const { t, lang } = useLang();
  const teacherFeatures = getTeacherFeatures(t);
  const studentFeatures = getStudentFeatures(t);

  return (
    <ParallaxSection id="features" className="ld-section ld-features" speed={0.2}>
      <div className="ld-container">
        <motion.div
          className="ld-section-header"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp}
        >
          <h2>{t('featuresTitle')}</h2>
          <p>{t('featuresDesc')}</p>
        </motion.div>

        <div className="ld-features-label teacher">{t('forTeachers')}</div>
        <motion.div
          key={`teacher-${lang}`}
          className="ld-features-grid"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={stagger}
        >
          {teacherFeatures.map((f) => <FeatureCard key={f.key} {...f} color="indigo" />)}
        </motion.div>

        <div className="ld-features-label student">{t('forStudents')}</div>
        <motion.div
          key={`student-${lang}`}
          className="ld-features-grid"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={stagger}
        >
          {studentFeatures.map((f) => <FeatureCard key={f.key} {...f} color="purple" />)}
        </motion.div>
      </div>
    </ParallaxSection>
  );
}

const students = [
  { name: 'Aisulu K.', score: 95, color: '#34d399' },
  { name: 'Arman T.', score: 82, color: '#818cf8' },
  { name: 'Dana M.', score: 74, color: '#fbbf24' },
  { name: 'Nurlan S.', score: 58, color: '#f87171' },
];

const getCheckItems = (t) => [
  t('analyticsCheck1'),
  t('analyticsCheck2'),
  t('analyticsCheck3'),
  t('analyticsCheck4'),
];

function Analytics() {
  const { t } = useLang();
  const checkItems = getCheckItems(t);

  return (
    <ParallaxSection id="about" className="ld-section ld-analytics" speed={0.25}>
      <div className="ld-analytics-inner">
        <motion.div
          className="ld-analytics-content"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        >
          <motion.h2 variants={fadeUp}>
            {t('analyticsTitle1')}<br />{t('analyticsTitle2')}
          </motion.h2>
          <motion.p variants={fadeUp}>
            {t('analyticsDesc')}
          </motion.p>
          <motion.div variants={fadeUp} className="ld-check-list">
            {checkItems.map((item, idx) => (
              <div key={idx} className="ld-check-item">
                <div className="ld-check-icon">
                  <Check size={14} color="#fff" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="ld-analytics-visual"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="ld-analytics-card">
            <h4>{t('studentPerformance')}</h4>
            {students.map((s) => (
              <div key={s.name} className="ld-progress-row">
                <div className="ld-progress-info">
                  <span>{s.name}</span>
                  <span>{s.score}%</span>
                </div>
                <div className="ld-progress-bar">
                  <div className="ld-progress-fill" style={{ width: `${s.score}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </ParallaxSection>
  );
}

const getPlans = (t) => [
  {
    key: 'basic',
    name: t('planBasic'),
    price: t('planFree'),
    period: '',
    desc: t('planBasicDesc'),
    features: [t('planBasicF1'), t('planBasicF2'), t('planBasicF3'), t('planBasicF4'), t('planBasicF5')],
    cta: t('getStarted'),
    featured: false,
  },
  {
    key: 'pro',
    name: t('planPro'),
    price: '$19',
    period: '/month',
    desc: t('planProDesc'),
    features: [t('planProF1'), t('planProF2'), t('planProF3'), t('planProF4'), t('planProF5'), t('planProF6')],
    cta: t('startFreeTrial'),
    featured: true,
  },
  {
    key: 'institution',
    name: t('planInstitution'),
    price: '$79',
    period: '/month',
    desc: t('planInstDesc'),
    features: [t('planInstF1'), t('planInstF2'), t('planInstF3'), t('planInstF4'), t('planInstF5'), t('planInstF6'), t('planInstF7')],
    cta: t('contactSales'),
    featured: false,
  },
];

function Pricing({ onSignup }) {
  const { t } = useLang();
  const plans = getPlans(t);

  return (
    <section id="pricing" className="ld-section ld-pricing">
      <div className="ld-container">
        <motion.div
          className="ld-section-header"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
        >
          <h2>{t('pricingTitle')}</h2>
          <p>{t('pricingDesc')}</p>
        </motion.div>

        <motion.div
          className="ld-pricing-grid"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={stagger}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.key}
              variants={fadeUp}
              className={`ld-price-card ${plan.featured ? 'featured' : ''}`}
            >
              {plan.featured && <div className="ld-price-badge">{t('mostPopular')}</div>}
              <h3>{plan.name}</h3>
              <div className="price">
                {plan.price}
                {plan.period && <span className="price-period">{plan.period}</span>}
              </div>
              <p className="price-desc">{plan.desc}</p>
              <ul className="ld-price-features">
                {plan.features.map((f, idx) => (
                  <li key={idx}>
                    <Check size={16} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`ld-price-cta ${plan.featured ? 'white' : 'primary'}`}
                onClick={onSignup}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useLang();
  return (
    <footer className="ld-footer">
      <div className="ld-footer-inner">
        <div className="ld-footer-grid">
          <div className="ld-footer-brand">
            <div className="ld-logo" style={{ color: '#fff' }}>
              <BookOpen size={24} color="#818cf8" />
              <span>StudyHubAi</span>
            </div>
            <p>{t('footerDesc')}</p>
          </div>

          <div>
            <h4>{t('product')}</h4>
            <div className="ld-footer-links">
              <a href="#features">{t('navFeatures')}</a>
              <a href="#pricing">{t('navPricing')}</a>
              <a href="#about">{t('navAbout')}</a>
            </div>
          </div>

          <div>
            <h4>{t('support')}</h4>
            <div className="ld-footer-links">
              <a href="#">{t('helpCenter')}</a>
              <a href="#">{t('contactUs')}</a>
              <a href="#">{t('privacyPolicy')}</a>
            </div>
          </div>

          <div>
            <h4>{t('stayUpdated')}</h4>
            <p className="ld-newsletter-desc">{t('newsletterDesc')}</p>
            <div className="ld-newsletter-form">
              <input type="email" placeholder="your@email.com" />
              <button><Mail size={18} /></button>
            </div>
          </div>
        </div>

        <div className="ld-footer-bottom">
          <p>{t('footerCopy')}</p>
          <div className="ld-socials">
            <a href="#"><Twitter size={20} /></a>
            <a href="#"><Github size={20} /></a>
            <a href="#"><Linkedin size={20} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('login');

  const openLogin = () => { setModalTab('login'); setModalOpen(true); };
  const openSignup = () => { setModalTab('register'); setModalOpen(true); };

  return (
    <div className="landing">
      <Navbar onLogin={openLogin} onSignup={openSignup} />
      <Hero onSignup={openSignup} />
      <Features />
      <Analytics />
      <Pricing onSignup={openSignup} />
      <Footer />
      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} initialTab={modalTab} />
    </div>
  );
}
