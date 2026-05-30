import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://subbu@localhost:5432/ats_score_db' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('Seeding database...');

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      passwordHash: hash,
      role: 'user',
      tier: 'pro',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      passwordHash: hash,
      role: 'user',
      tier: 'free',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@atsanalyzer.com' },
    update: {},
    create: {
      email: 'admin@atsanalyzer.com',
      name: 'Admin User',
      passwordHash: hash,
      role: 'admin',
      tier: 'pro',
    },
  });

  console.log(`Created users: ${alice.email}, ${bob.email}, ${admin.email}`);

  // ── Resumes ───────────────────────────────────────────────────────────────
  const resume1 = await prisma.resume.create({
    data: {
      userId: alice.id,
      originalName: 'alice_resume_software_engineer.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 45200,
      extractedText: `Alice Johnson
alice@example.com | github.com/alicejohnson | LinkedIn

EXPERIENCE
Software Engineer — TechCorp Inc (2021–Present)
• Built scalable REST APIs using Node.js and TypeScript
• Led migration from monolith to microservices architecture
• Improved CI/CD pipeline reducing deployment time by 40%
• Technologies: Node.js, TypeScript, React, PostgreSQL, Docker, AWS

Junior Developer — StartupXYZ (2019–2021)
• Developed full-stack features using React and Express
• Wrote unit and integration tests achieving 80% code coverage

EDUCATION
B.Tech Computer Science — State University (2015–2019)

SKILLS
Node.js, TypeScript, React, PostgreSQL, Docker, AWS, Git, REST API, GraphQL`,
    },
  });

  const resume2 = await prisma.resume.create({
    data: {
      userId: alice.id,
      originalName: 'alice_resume_fullstack.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 38900,
      extractedText: `Alice Johnson — Full Stack Developer
alice@example.com

SKILLS: React, Next.js, Node.js, TypeScript, MongoDB, Redis, Docker

EXPERIENCE
Full Stack Developer — WebAgency (2020–Present)
• Delivered 15+ client projects using React and Node.js
• Built real-time features using WebSockets and Redis pub/sub`,
    },
  });

  const resume3 = await prisma.resume.create({
    data: {
      userId: bob.id,
      originalName: 'bob_data_analyst_resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 52100,
      extractedText: `Bob Smith — Data Analyst
bob@example.com

EXPERIENCE
Data Analyst — FinanceCo (2022–Present)
• Analyzed large datasets using Python, Pandas, and SQL
• Built dashboards in Tableau and Power BI for executive reporting
• Wrote complex SQL queries against PostgreSQL and BigQuery

SKILLS
Python, SQL, Pandas, NumPy, Tableau, Power BI, Excel, BigQuery, R`,
    },
  });

  console.log(`Created 3 resumes`);

  // ── ResumeVersions ────────────────────────────────────────────────────────
  await prisma.resumeVersion.createMany({
    data: [
      { resumeId: resume1.id, versionNum: 1, label: 'Original', score: 62, domain: 'software_engineering' },
      { resumeId: resume1.id, versionNum: 2, label: 'After keyword fix', score: 78, domain: 'software_engineering' },
      { resumeId: resume2.id, versionNum: 1, label: 'Original', score: 55, domain: 'fullstack' },
      { resumeId: resume3.id, versionNum: 1, label: 'Original', score: 70, domain: 'data_analytics' },
    ],
  });

  console.log(`Created resume versions`);

  // ── Analyses ──────────────────────────────────────────────────────────────
  const analysis1 = await prisma.analysis.create({
    data: {
      userId: alice.id,
      resumeId: resume1.id,
      mode: 'standard',
      domain: 'software_engineering',
      score: 78,
      keywordsMatched: ['Node.js', 'TypeScript', 'REST API', 'Docker', 'AWS', 'PostgreSQL', 'React', 'CI/CD'],
      keywordsMissed: ['Kubernetes', 'Terraform', 'Redis', 'gRPC', 'Kafka'],
      suggestions: [
        'Add Kubernetes experience or willingness to learn',
        'Mention specific AWS services (EC2, Lambda, S3)',
        'Quantify the microservices migration impact with metrics',
        'Add a summary section at the top',
      ],
      warnings: ['Missing cloud certification mention'],
      breakdown: {
        keywords: 78,
        formatting: 85,
        experience: 80,
        education: 70,
        skills: 75,
      },
      jobDescription: 'Senior Software Engineer at CloudCo. Requirements: Node.js, TypeScript, AWS, Docker, Kubernetes, REST API, PostgreSQL, CI/CD.',
      emailSent: true,
      processingMs: 1240,
    },
  });

  const analysis2 = await prisma.analysis.create({
    data: {
      userId: alice.id,
      resumeId: resume1.id,
      mode: 'deep',
      domain: 'software_engineering',
      score: 85,
      keywordsMatched: ['Node.js', 'TypeScript', 'REST API', 'Docker', 'AWS', 'PostgreSQL', 'React', 'CI/CD', 'Microservices'],
      keywordsMissed: ['Kubernetes', 'Redis'],
      suggestions: [
        'Highlight leadership experience more prominently',
        'Add Kubernetes to skills (even as learning)',
      ],
      warnings: [],
      breakdown: {
        keywords: 85,
        formatting: 88,
        experience: 87,
        education: 70,
        skills: 82,
      },
      jobDescription: 'Lead Backend Engineer. Must have: Node.js, TypeScript, Microservices, AWS, Docker, PostgreSQL.',
      emailSent: false,
      processingMs: 2890,
    },
  });

  const analysis3 = await prisma.analysis.create({
    data: {
      userId: bob.id,
      resumeId: resume3.id,
      mode: 'standard',
      domain: 'data_analytics',
      score: 70,
      keywordsMatched: ['Python', 'SQL', 'Pandas', 'Tableau', 'PostgreSQL', 'BigQuery'],
      keywordsMissed: ['Machine Learning', 'Spark', 'Airflow', 'dbt', 'Looker'],
      suggestions: [
        'Add dbt or data pipeline tools to strengthen the profile',
        'Mention specific KPIs or business impact from dashboard work',
        'Include a projects section with links to public work',
      ],
      warnings: ['No mention of data modelling experience'],
      breakdown: {
        keywords: 70,
        formatting: 72,
        experience: 75,
        education: 65,
        skills: 68,
      },
      jobDescription: 'Data Analyst at FinTech startup. Required: Python, SQL, Tableau, BigQuery, dbt, Airflow.',
      emailSent: true,
      processingMs: 1560,
    },
  });

  console.log(`Created 3 analyses`);

  // ── Cover Letters ─────────────────────────────────────────────────────────
  await prisma.coverLetter.create({
    data: {
      userId: alice.id,
      resumeText: resume1.extractedText!,
      jobDescription: 'Senior Software Engineer at CloudCo...',
      companyName: 'CloudCo',
      role: 'Senior Software Engineer',
      tone: 'professional',
      generatedText: `Dear Hiring Manager,

I am excited to apply for the Senior Software Engineer position at CloudCo. With over 4 years of experience building scalable backend systems using Node.js and TypeScript, I am confident I can contribute meaningfully to your engineering team.

At TechCorp Inc, I led the migration of a monolithic application to a microservices architecture deployed on AWS, resulting in a 40% reduction in deployment time through improved CI/CD pipelines. My hands-on experience with Docker, PostgreSQL, and REST API design aligns directly with the requirements listed in your job description.

I am particularly drawn to CloudCo's mission to simplify cloud infrastructure for developers. I would welcome the opportunity to bring my technical expertise and collaborative mindset to your team.

Thank you for your consideration. I look forward to discussing how I can contribute to CloudCo's growth.

Sincerely,
Alice Johnson`,
    },
  });

  await prisma.coverLetter.create({
    data: {
      userId: bob.id,
      resumeText: resume3.extractedText!,
      jobDescription: 'Data Analyst at FinTech startup...',
      companyName: 'FinTech Startup',
      role: 'Senior Data Analyst',
      tone: 'confident',
      generatedText: `Dear Hiring Team,

I am applying for the Senior Data Analyst role at your FinTech startup. My background in SQL, Python, and business intelligence tools positions me to deliver actionable insights that drive product decisions.

At FinanceCo, I built executive-level dashboards in Tableau and Power BI, processing millions of rows via BigQuery. I am eager to deepen my expertise in dbt and Airflow within a fast-paced startup environment.

I would love to explore how my skills can support your data team.

Best regards,
Bob Smith`,
    },
  });

  console.log(`Created 2 cover letters`);

  // ── Interview Sessions ────────────────────────────────────────────────────
  await prisma.interviewSession.create({
    data: {
      userId: alice.id,
      resumeText: resume1.extractedText!,
      jobDescription: 'Senior Software Engineer at CloudCo...',
      domain: 'software_engineering',
      difficulty: 'medium',
      questions: [
        { q: 'Describe your experience migrating a monolith to microservices. What challenges did you face?', category: 'experience' },
        { q: 'How do you approach designing a REST API for high-traffic scenarios?', category: 'technical' },
        { q: 'Walk me through your CI/CD pipeline setup at TechCorp.', category: 'technical' },
        { q: 'How do you handle database migrations in a live production environment?', category: 'technical' },
        { q: 'Tell me about a time you improved team productivity. What was your approach?', category: 'behavioral' },
      ],
    },
  });

  await prisma.interviewSession.create({
    data: {
      userId: bob.id,
      resumeText: resume3.extractedText!,
      jobDescription: 'Data Analyst at FinTech...',
      domain: 'data_analytics',
      difficulty: 'easy',
      questions: [
        { q: 'How do you approach cleaning and validating a new dataset?', category: 'technical' },
        { q: 'Describe a dashboard you built. What business decision did it support?', category: 'experience' },
        { q: 'What is the difference between a LEFT JOIN and an INNER JOIN? Give an example.', category: 'technical' },
        { q: 'How do you prioritize when multiple stakeholders request reports simultaneously?', category: 'behavioral' },
      ],
    },
  });

  console.log(`Created 2 interview sessions`);

  // ── Batch Jobs ────────────────────────────────────────────────────────────
  await prisma.batchJob.create({
    data: {
      userId: alice.id,
      status: 'completed',
      totalJDs: 5,
      completedJDs: 5,
      domain: 'software_engineering',
      results: [
        { jd: 'CloudCo Senior Engineer', score: 78, topMissingKeywords: ['Kubernetes', 'Terraform'] },
        { jd: 'StartupABC Backend Lead', score: 82, topMissingKeywords: ['gRPC'] },
        { jd: 'BigCorp Platform Engineer', score: 65, topMissingKeywords: ['Go', 'Terraform', 'Helm'] },
        { jd: 'RemoteCo Full Stack', score: 88, topMissingKeywords: [] },
        { jd: 'FinTech API Developer', score: 74, topMissingKeywords: ['Kafka', 'Redis'] },
      ],
    },
  });

  await prisma.batchJob.create({
    data: {
      userId: bob.id,
      status: 'pending',
      totalJDs: 3,
      completedJDs: 0,
      domain: 'data_analytics',
      results: undefined,
    },
  });

  console.log(`Created 2 batch jobs`);

  // ── API Keys ──────────────────────────────────────────────────────────────
  await prisma.apiKey.create({
    data: {
      userId: alice.id,
      key: 'ats_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      name: 'Production Integration',
      usageCount: 142,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.apiKey.create({
    data: {
      userId: alice.id,
      key: 'ats_test_f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3',
      name: 'Dev/Testing',
      usageCount: 23,
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.apiKey.create({
    data: {
      userId: bob.id,
      key: 'ats_live_0a1b2c3d4e5f0a1b2c3d4e5f0a1b2c3d',
      name: 'My App',
      usageCount: 7,
      isActive: true,
    },
  });

  console.log(`Created 3 API keys`);

  // ── Notifications ─────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        title: 'Analysis Complete',
        message: 'Your resume scored 78/100 for the Software Engineer role at CloudCo.',
        type: 'success',
        read: true,
        link: `/analyses/${analysis1.id}`,
      },
      {
        userId: alice.id,
        title: 'Deep Analysis Ready',
        message: 'Your deep analysis is complete. Score improved to 85/100.',
        type: 'success',
        read: false,
        link: `/analyses/${analysis2.id}`,
      },
      {
        userId: alice.id,
        title: 'Batch Job Finished',
        message: 'Your batch job across 5 job descriptions is complete. Best match: 88/100.',
        type: 'info',
        read: false,
      },
      {
        userId: bob.id,
        title: 'Analysis Complete',
        message: 'Your resume scored 70/100 for the Data Analyst role.',
        type: 'success',
        read: false,
        link: `/analyses/${analysis3.id}`,
      },
      {
        userId: bob.id,
        title: 'Welcome to ATS Analyzer!',
        message: 'Upload your resume to get your first ATS score.',
        type: 'info',
        read: true,
      },
    ],
  });

  console.log(`Created 5 notifications`);
  console.log('\n✅ Seed complete!');
  console.log('\nTest accounts (password: password123):');
  console.log('  alice@example.com  — pro tier');
  console.log('  bob@example.com    — free tier');
  console.log('  admin@atsanalyzer.com — admin');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
