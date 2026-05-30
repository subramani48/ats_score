const keywordsConfig = require('../config/keywords.json');

const analyzeResume = (text, domain = '') => {
    if (!text || text.trim().length === 0) {
        return {
            score: 0,
            suggestions: ["We couldn't extract any text from your resume. Please check the file format."],
            matchedKeywords: []
        };
    }

    const lowercasedText = text.toLowerCase();
    const selectedDomain = (domain || '').toLowerCase();

    // Load specialized keywords based on domain, if available
    let domainKeywords = [];
    if (selectedDomain && keywordsConfig.domains[selectedDomain]) {
        domainKeywords = keywordsConfig.domains[selectedDomain];
    }

    // Combine common keywords with domain-specific ones
    const ALL_KEYWORDS = [
        ...keywordsConfig.common.technical_skills,
        ...keywordsConfig.common.soft_skills,
        ...domainKeywords
    ];

    // Improved matching using word boundaries for some keywords to avoid partial matches
    const matchedKeywords = ALL_KEYWORDS.filter(keyword => {
        const regex = new RegExp(`\\b${keyword.replace('.', '\\.')}\\b`, 'i');
        return lowercasedText.includes(keyword) || regex.test(lowercasedText);
    });

    const uniqueMatched = [...new Set(matchedKeywords)];

    // Scoring logic: 
    // - Keyword matching (up to 15 keywords for 70 points)
    let keywordScore = Math.min(Math.floor((uniqueMatched.length / 15) * 70), 70);

    // - Achievement matching (30 points)
    let achievementScore = 0;
    if (keywordsConfig.common.achievement_keywords.some(kw => lowercasedText.includes(kw))) {
        achievementScore = 30;
    }

    const score = keywordScore + achievementScore;

    // Generate suggestions based on score and missing elements
    const suggestions = [];
    if (score < 40) {
        suggestions.push(`Your resume is missing many core industry keywords${selectedDomain ? ` for ${selectedDomain}` : ''}. Try adding terms relevant to your target job.`);
    }

    if (achievementScore === 0) {
        suggestions.push("Add more measurable achievements (e.g., 'Increased sales by 20%'). Use action verbs like 'achieved', 'optimized', or 'delivered'.");
    }

    if (uniqueMatched.length < 8) {
        suggestions.push("Improve your bullet points to clearly highlight your technical and soft skills.");
    }

    if (suggestions.length === 0) {
        suggestions.push("Your resume looks great! Keep it customized for each specific job description.");
    }

    return {
        score,
        suggestions,
        matchedKeywords: uniqueMatched
    };
};

module.exports = {
    analyzeResume
};
