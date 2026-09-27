'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import {
  FileSearch,
  Activity,
  CheckCircle,
  Mail,
  ArrowRight,
  Zap,
  Shield,
  Target,
  TrendingUp,
} from 'lucide-react';
import UploadSection from '@/components/UploadSection';
import { useRef } from 'react';
import { useT } from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const t = useT();
  // Titles with a highlighted part: the translation marks where it goes with {hl}.
  const [heroBefore, heroAfter] = t('landing.heroTitle').split('{hl}');
  const [featBefore, featAfter] = t('landing.featuresTitle').split('{hl}');

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background selection:bg-indigo-500/20 overflow-x-hidden"
    >
      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 glass-effect py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">ATS Analyzer</span>
        </div>

        <div className="flex gap-4 items-center text-sm font-medium text-apple-text-gray">
          <a href="#how-it-works" className="hover:text-foreground transition-colors hidden sm:block">{t('landing.navHow')}</a>
          <a href="#features" className="hover:text-foreground transition-colors hidden sm:block">{t('landing.navFeatures')}</a>
          <a href="/login" className="hover:text-foreground transition-colors hidden sm:block">{t('auth.signIn')}</a>
          <a href="/dashboard" className="hover:text-foreground transition-colors hidden sm:block">{t('landing.navDashboard')}</a>
          <LanguageSwitcher />
          <a href="#upload" className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-300">
            {t('landing.tryFree')}
          </a>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden flex flex-col items-center justify-center min-h-screen">
        {/* Animated mesh blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[640px] h-[640px] bg-indigo-500/20 dark:bg-indigo-500/12 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-[520px] h-[520px] bg-violet-500/18 dark:bg-violet-500/10 rounded-full blur-3xl animate-blob-alt" />
          <div
            className="absolute bottom-1/4 left-1/3 w-[420px] h-[420px] bg-blue-500/14 dark:bg-blue-500/8 rounded-full blur-3xl animate-blob"
            style={{ animationDelay: '2s' }}
          />
        </div>

        {/* Subtle dot-grid overlay */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(99,102,241,0.07)_1px,transparent_1px)] bg-[size:36px_36px]" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="text-center max-w-5xl mx-auto z-10 flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-indigo-500/25 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-8">
              <Zap className="w-3.5 h-3.5" />
              {t('landing.badge')}
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-balance mb-7 leading-[1.04]"
          >
            {heroBefore}<span className="gradient-text">{t('landing.heroHighlight')}</span>{heroAfter}
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-apple-text-gray text-balance mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            {t('landing.heroSubtitle')}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <a
              href="#upload"
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-full font-bold text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center"
            >
              {t('landing.ctaAnalyse')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 glass-effect rounded-full font-semibold text-lg hover:border-indigo-500/40 transition-all duration-300 text-center"
            >
              {t('landing.ctaHow')}
            </a>
          </motion.div>

          {/* Floating ATS preview card */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg mx-auto"
          >
            <div className="animate-float">
              <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-indigo-500/12 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-semibold text-apple-text-gray">{t('landing.previewTitle')}</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-green-400/10 text-green-500 font-bold border border-green-500/20">
                    {t('landing.pass')}
                  </span>
                </div>

                <div className="flex items-center gap-6 mb-5">
                  {/* Mini radial gauge */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <defs>
                        <linearGradient id="heroGauge" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="8" />
                      <circle
                        cx="40" cy="40" r="30"
                        fill="none"
                        stroke="url(#heroGauge)"
                        strokeWidth="8"
                        strokeDasharray="188.4"
                        strokeDashoffset="47"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold gradient-text">75%</span>
                    </div>
                  </div>

                  {/* Category mini bars */}
                  <div className="flex-1 space-y-2">
                    {[
                      { label: t('landing.keywords'), val: 82, color: 'from-indigo-500 to-violet-500' },
                      { label: t('landing.formatting'), val: 90, color: 'from-green-400 to-emerald-500' },
                      { label: t('landing.impact'), val: 64, color: 'from-amber-400 to-orange-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-xs text-apple-text-gray w-20">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-apple-gray rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                            style={{ width: `${item.val}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right">{item.val}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-500/6 border border-indigo-500/12 rounded-xl p-3">
                  <p className="text-xs text-apple-text-gray leading-relaxed">
                    <span className="font-semibold text-foreground">{t('landing.topSuggestion')}</span>{' '}
                    {t('landing.topSuggestionText')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── How It Works — Bento Grid ────────────────────── */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-indigo-500/22 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-6">
              <Target className="w-3.5 h-3.5" />
              {t('landing.processBadge')}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('landing.processTitle')}</h2>
            <p className="text-xl text-apple-text-gray max-w-xl mx-auto">
              {t('landing.processSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: t('landing.step1Title'),
                desc: t('landing.step1Desc'),
                icon: FileSearch,
                color: 'from-indigo-500 to-blue-500',
              },
              {
                step: '02',
                title: t('landing.step2Title'),
                desc: t('landing.step2Desc'),
                icon: Activity,
                color: 'from-violet-500 to-indigo-500',
              },
              {
                step: '03',
                title: t('landing.step3Title'),
                desc: t('landing.step3Desc'),
                icon: CheckCircle,
                color: 'from-blue-500 to-violet-500',
              },
              {
                step: '04',
                title: t('landing.step4Title'),
                desc: t('landing.step4Desc'),
                icon: Mail,
                color: 'from-purple-500 to-violet-500',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.6,
                  delay: idx * 0.1,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="bento-card p-7 group cursor-default"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mb-2 tracking-wider uppercase">
                  {t('landing.step', { n: item.step })}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-apple-text-gray text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-indigo-500/22 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-6">
                  <Shield className="w-3.5 h-3.5" />
                  {t('landing.navFeatures')}
                </div>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                  {featBefore}<span className="gradient-text">{t('landing.featuresHighlight')}</span>{featAfter}
                </h2>
              </div>

              <div className="space-y-5">
                {[
                  t('landing.feature1'),
                  t('landing.feature2'),
                  t('landing.feature3'),
                  t('landing.feature4'),
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-indigo-500/30">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-base font-medium text-apple-text-gray/90 group-hover:text-foreground transition-colors">
                      {feature}
                    </p>
                  </motion.div>
                ))}
              </div>

              <a
                href="#upload"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-full font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 group"
              >
                {t('landing.ctaFree')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            {/* Right: score mock */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-gradient-to-br from-indigo-500/15 to-violet-500/15 rounded-[3rem] blur-2xl" />
              <div className="glass-strong rounded-[2.5rem] p-8 relative">
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    <svg className="w-44 h-44 -rotate-90" viewBox="0 0 176 176">
                      <defs>
                        <linearGradient id="featGauge" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <circle cx="88" cy="88" r="72" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="13" />
                      <circle
                        cx="88" cy="88" r="72"
                        fill="none"
                        stroke="url(#featGauge)"
                        strokeWidth="13"
                        strokeDasharray="452.4"
                        strokeDashoffset="99.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold gradient-text">78%</span>
                      <span className="text-sm text-apple-text-gray font-medium mt-1">{t('landing.atsScore')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: t('landing.keywordsMatch'), value: 82, color: 'from-indigo-500 to-blue-500', badge: t('landing.good') },
                    { label: t('landing.formatting'), value: 92, color: 'from-green-400 to-emerald-500', badge: t('landing.excellent') },
                    { label: t('landing.impactScore'), value: 63, color: 'from-amber-400 to-orange-500', badge: t('landing.improve') },
                  ].map((item, idx) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-apple-text-gray w-32 shrink-0">
                        {item.label}
                      </span>
                      <div className="flex-1 h-2 bg-apple-gray rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.value}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.1, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                        />
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full glass-effect font-semibold w-16 text-center">
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Upload Section ───────────────────────────────── */}
      <section id="upload" className="py-32 px-6 relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-indigo-500/22 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-6">
              <TrendingUp className="w-3.5 h-3.5" />
              {t('landing.uploadBadge')}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('landing.uploadTitle')}</h2>
            <p className="text-xl text-apple-text-gray">
              {t('landing.uploadSubtitle')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <UploadSection />
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="py-12 border-t border-indigo-500/10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold">ATS Analyzer</span>
        </div>
        <p className="text-apple-text-gray text-sm">
          &copy; {new Date().getFullYear()} ATS Analyzer. {t('landing.rights')}
        </p>
      </footer>
    </div>
  );
}
