// Checks a rewritten resume for skills and technologies the original resume never mentioned.
// The prompt forbids inventing them, but a prompt is only a request; this check makes it a rule. A rewrite that
// claims React when the original resume has no React is refused, however the AI came to write it.
//
// Two sources of "technology names" are checked:
//   1. a built-in list of common, unambiguous technologies (React, Docker, PostgreSQL ...);
//   2. technology-looking words in the job description itself (TypeScript, GraphQL, Node.js, C++ ...), because
//      a job description is exactly where an AI is tempted to copy skills from.
// A name counts as "claimed" if it appears in the rewrite and NOT in the original resume.
// This cannot catch every possible invention (soft skills, achievements, unusual tools); it removes the most
// harmful and most common one, and the prompt covers the rest.

// Only names that are rarely ordinary English words (so "Go", "Swift", "Spark", "Express", "Spring" are left out).
const KNOWN_TECH = [
  'React', 'Angular', 'Vue', 'Svelte', 'Next.js', 'Nuxt', 'Node.js', 'NestJS', 'Django', 'Flask', 'FastAPI',
  'Laravel', 'TypeScript', 'JavaScript', 'Python', 'Java', 'Kotlin', 'Scala', 'C++', 'C#', 'PHP', 'Golang',
  'GraphQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka', 'RabbitMQ', 'DynamoDB',
  'Cassandra', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'AWS', 'Azure', 'GCP', 'Firebase',
  'Tailwind', 'Redux', 'jQuery', 'Webpack', 'Vite', 'Jest', 'Cypress', 'Selenium', 'Playwright', 'Storybook',
  'Tableau', 'Snowflake', 'Airflow', 'Hadoop', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Figma', 'Linux',
  'GitHub', 'GitLab', 'Jira', 'Spring Boot', 'Power BI', 'Next.js', 'Sass',
];

// Shorthand a resume may use instead of the full name; it counts as evidence for the full name.
const ALIASES: Record<string, string[]> = {
  javascript: ['js', 'ecmascript'], typescript: ['ts'], kubernetes: ['k8s'], postgresql: ['postgres'],
  mongodb: ['mongo'], 'node.js': ['node', 'nodejs'], aws: ['amazon web services'], gcp: ['google cloud'],
  'c#': ['csharp'], 'power bi': ['powerbi'], 'spring boot': ['springboot'], golang: ['go'],
  elasticsearch: ['elk', 'elastic'], 'next.js': ['nextjs'], tensorflow: ['tf'],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BOUNDARY_BEFORE = '(?<![A-Za-z0-9])';
const BOUNDARY_AFTER = '(?![A-Za-z0-9+#])';

/** A pattern that matches the name as a whole word, and its usual spellings ("React", "React.js", "ReactJS"). */
function patternFor(term: string): RegExp {
  const lower = term.toLowerCase();
  let body: string;
  if (lower.endsWith('.js')) {
    const root = escape(lower.slice(0, -3));
    body = `${root}(?:\\.js|\\s?js)`;                    // Next.js, Nextjs, Next js
  } else if (/[A-Za-z]$/.test(term) && !lower.includes(' ')) {
    body = `${escape(lower)}(?:\\.?js)?`;                // React, React.js, ReactJS
  } else {
    body = escape(lower).replace(/ /g, '\\s+');
  }
  return new RegExp(`${BOUNDARY_BEFORE}${body}${BOUNDARY_AFTER}`, 'i');
}

/** Technology-looking words in the job description: CamelCase (TypeScript), or containing . + # (Node.js, C++). */
function techWordsFrom(text: string): string[] {
  const words = text.match(/[A-Za-z][A-Za-z0-9+#.]*[A-Za-z0-9+#]|[A-Za-z]/g) ?? [];
  const out = new Set<string>();
  for (const w of words) {
    const camel = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+$/.test(w);          // TypeScript, GraphQL, PostgreSQL
    const dotted = /^[A-Za-z]+\.(?:js|NET|net)$/i.test(w);                  // Node.js, ASP.NET
    const symbol = /^[A-Za-z]+[+#]+$/.test(w);                              // C++, C#
    if ((camel || dotted || symbol) && w.length <= 30) out.add(w);
  }
  return [...out];
}

/** Technology names the rewrite claims that the original resume does not contain. Empty means nothing suspicious. */
export function findUnsupportedTerms(originalResume: string, jobDescription: string, rewritten: string): string[] {
  const candidates = new Map<string, string>();   // lower-case key -> display form
  for (const t of [...KNOWN_TECH, ...techWordsFrom(jobDescription)]) candidates.set(t.toLowerCase(), t);
  const found: string[] = [];
  for (const term of candidates.values()) {
    const re = patternFor(term);
    if (!re.test(rewritten)) continue;
    const supported = re.test(originalResume) || (ALIASES[term.toLowerCase()] ?? []).some(a => patternFor(a).test(originalResume));
    if (!supported) found.push(term);
  }
  return found;
}
