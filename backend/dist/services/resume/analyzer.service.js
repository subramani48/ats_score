"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeResume = void 0;
const DOMAIN_KEYWORDS = {
    'node.js': ['javascript', 'node.js', 'nodejs', 'express', 'fastify', 'nestjs', 'mongodb', 'typescript', 'npm', 'pm2', 'microservices', 'rest api', 'graphql', 'websockets', 'jwt', 'redis', 'postgresql', 'docker', 'kubernetes', 'ci/cd'],
    react: ['react', 'next.js', 'nextjs', 'redux', 'context api', 'hooks', 'tailwind', 'styled-components', 'vite', 'webpack', 'typescript', 'jest', 'react-query', 'zustand', 'framer motion', 'shadcn', 'accessibility', 'ssr', 'ssg'],
    python: ['python', 'django', 'flask', 'fastapi', 'numpy', 'pandas', 'scikit-learn', 'tensorflow', 'pytorch', 'celery', 'sqlalchemy', 'pytest', 'docker', 'aws', 'machine learning', 'data analysis', 'rest api', 'pydantic', 'asyncio'],
    devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible', 'jenkins', 'github actions', 'monitoring', 'prometheus', 'grafana', 'helm', 'argocd', 'ci/cd', 'linux', 'bash', 'nginx', 'load balancing', 'iac'],
    cybersecurity: ['penetration testing', 'vulnerability assessment', 'siem', 'firewalls', 'encryption', 'threat intelligence', 'incident response', 'network security', 'owasp', 'zero trust', 'soc', 'iam', 'pki', 'ids/ips', 'compliance', 'cve', 'ctf', 'burp suite', 'nmap', 'metasploit'],
    marketing: ['seo', 'content marketing', 'social media', 'google ads', 'analytics', 'copywriting', 'email marketing', 'branding', 'growth hacking', 'crm', 'conversion rate', 'a/b testing', 'hubspot', 'salesforce', 'roi', 'kpi', 'persona', 'funnel', 'lead generation', 'influencer'],
    laravel: ['php', 'laravel', 'eloquent', 'blade', 'mvc', 'artisan', 'phpunit', 'docker', 'postgres', 'redis', 'queues', 'events', 'api resources', 'sanctum', 'filament', 'livewire', 'inertia.js', 'composer', 'nginx', 'rest api'],
    wordpress: ['php', 'wordpress', 'elementor', 'woocommerce', 'themes', 'plugins', 'wp-cli', 'mysql', 'seo', 'gutenberg', 'custom post types', 'hooks', 'shortcodes', 'acf', 'multisite', 'rest api', 'performance', 'security', 'cpanel'],
    'data engineering': ['apache spark', 'hadoop', 'airflow', 'kafka', 'flink', 'dbt', 'snowflake', 'bigquery', 'redshift', 'etl', 'data pipeline', 'python', 'sql', 'scala', 'databricks', 'delta lake', 'parquet', 'data warehouse', 'glue', 'nifi'],
    'ml engineering': ['pytorch', 'tensorflow', 'mlflow', 'kubeflow', 'feature store', 'model serving', 'a/b testing', 'python', 'scikit-learn', 'transformers', 'langchain', 'vector database', 'embedding', 'fine-tuning', 'rag', 'mlops', 'cuda', 'onnx', 'triton'],
    'cloud architecture': ['aws', 'azure', 'gcp', 'terraform', 'cdk', 'microservices', 'serverless', 'lambda', 'api gateway', 'vpc', 'iam', 'cloudformation', 'cost optimization', 'high availability', 'disaster recovery', 'sla', 'well-architected', 'cdn', 'multi-region'],
    'product management': ['product roadmap', 'user stories', 'okr', 'kpi', 'agile', 'scrum', 'jira', 'stakeholder management', 'a/b testing', 'user research', 'gtm', 'mvp', 'product strategy', 'data-driven', 'prioritization', 'discovery', 'metrics', 'growth', 'figma'],
};
const COMMON_TECHNICAL = ['git', 'rest api', 'sql', 'testing', 'agile', 'architecture', 'ci/cd', 'api design', 'documentation', 'code review'];
const COMMON_SOFT = ['leadership', 'teamwork', 'communication', 'problem solving', 'analytical', 'management', 'collaboration', 'mentoring', 'cross-functional'];
const ACHIEVEMENT_PATTERNS = [
    /\b\d+\s*%/i,
    /\$[\d,]+/,
    /\d+\+?\s*(years?|clients?|projects?|team members?|engineers?)/i,
    /\b(increased|decreased|reduced|improved|grew|saved|generated|delivered|launched|led|built|scaled)\b/i,
    /\b(achieved|optimized|streamlined|automated|migrated|deployed|designed)\b/i,
];
const detectSections = (text) => {
    const lower = text.toLowerCase();
    return {
        summary: /\b(summary|objective|profile|about)\b/.test(lower),
        experience: /\b(experience|employment|work history|professional background)\b/.test(lower),
        education: /\b(education|degree|university|college|bachelor|master)\b/.test(lower),
        skills: /\b(skills|technologies|tech stack|competencies|expertise)\b/.test(lower),
        projects: /\b(projects?|portfolio|open.?source|side projects?)\b/.test(lower),
    };
};
const formattingChecks = (text) => {
    const warnings = [];
    if (/[│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌]/u.test(text))
        warnings.push('Tables/columns detected — most ATS systems cannot parse table content');
    if (text.trim().length < 400)
        warnings.push('Resume appears too short — add more detail (aim for 400–800 words)');
    if (!/\b(19|20)\d{2}\b/.test(text))
        warnings.push('No employment dates detected — add date ranges for each role');
    if (!(ACHIEVEMENT_PATTERNS.some(p => p.test(text))))
        warnings.push('No quantified achievements found — add metrics (%, $, numbers)');
    if ((text.match(/\b(responsible for|duties included|worked on)\b/gi) ?? []).length > 2)
        warnings.push('Weak phrasing detected — replace with action verbs (built, led, delivered)');
    return warnings;
};
const calcReadabilityScore = (text) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (!sentences.length)
        return 5;
    const avgLen = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    if (avgLen < 20)
        return 15;
    if (avgLen < 30)
        return 12;
    if (avgLen < 40)
        return 8;
    return 5;
};
const analyzeResume = (text, domain) => {
    if (!text?.trim()) {
        return {
            score: 0,
            breakdown: { keywordScore: 0, achievementScore: 0, formattingScore: 0, readabilityScore: 0 },
            matchedKeywords: [],
            missingKeywords: [],
            keywordDensity: 0,
            sectionsDetected: detectSections(''),
            warnings: ['Could not extract text from resume — check the file format'],
            suggestions: ['Try re-uploading as a plain PDF or DOCX without tables'],
        };
    }
    const lower = text.toLowerCase();
    const normalizedDomain = domain.toLowerCase();
    const domainKeywords = DOMAIN_KEYWORDS[normalizedDomain] ?? [];
    const allKeywords = [...new Set([...COMMON_TECHNICAL, ...COMMON_SOFT, ...domainKeywords])];
    const matchedKeywords = [];
    const missingKeywords = [];
    for (const kw of allKeywords) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) {
            matchedKeywords.push(kw);
        }
        else if (domainKeywords.includes(kw)) {
            missingKeywords.push(kw);
        }
    }
    const keywordScore = Math.min(40, Math.round((matchedKeywords.length / Math.max(allKeywords.length, 1)) * 100 * 0.4));
    const achievementScore = ACHIEVEMENT_PATTERNS.filter(p => p.test(text)).length >= 3 ? 25 : ACHIEVEMENT_PATTERNS.some(p => p.test(text)) ? 15 : 0;
    const sections = detectSections(text);
    const sectionCount = Object.values(sections).filter(Boolean).length;
    const formattingScore = Math.min(20, sectionCount * 4);
    const readabilityScore = calcReadabilityScore(text);
    const score = keywordScore + achievementScore + formattingScore + readabilityScore;
    const keywordDensity = Math.round((matchedKeywords.length / Math.max(allKeywords.length, 1)) * 100);
    const warnings = formattingChecks(text);
    const suggestions = [];
    if (keywordScore < 20)
        suggestions.push(`Add more ${domain} keywords — you're matching only ${keywordDensity}% of expected terms`);
    if (achievementScore === 0)
        suggestions.push("Add quantified achievements: 'Reduced API latency by 40%' scores far better than 'Improved performance'");
    if (!sections.summary)
        suggestions.push("Add a professional summary tailored to each application — it's the first thing ATS and recruiters read");
    if (!sections.skills)
        suggestions.push('Add a dedicated Skills section listing your technical stack clearly');
    if (missingKeywords.length > 3)
        suggestions.push(`Missing high-value keywords: ${missingKeywords.slice(0, 5).join(', ')} — weave these into your experience bullets`);
    if (suggestions.length === 0)
        suggestions.push('Strong resume! For even better results, tailor the summary and top bullet points to each specific job description.');
    return {
        score: Math.min(100, score),
        breakdown: { keywordScore, achievementScore, formattingScore, readabilityScore },
        matchedKeywords: [...new Set(matchedKeywords)],
        missingKeywords: missingKeywords.slice(0, 15),
        keywordDensity,
        sectionsDetected: sections,
        warnings,
        suggestions,
    };
};
exports.analyzeResume = analyzeResume;
//# sourceMappingURL=analyzer.service.js.map