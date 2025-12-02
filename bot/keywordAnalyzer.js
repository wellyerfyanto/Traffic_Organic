const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Indonesian stopwords
const STOPWORDS_ID = [
    'yang', 'dan', 'di', 'dengan', 'ini', 'itu', 'untuk', 'dari', 'dalam',
    'tidak', 'akan', 'pada', 'ke', 'kami', 'adalah', 'yaitu', 'atau',
    'sebagai', 'ada', 'oleh', 'terhadap', 'saat', 'sebelum', 'sesudah',
    'ketika', 'jika', 'agar', 'supaya', 'sebab', 'karena',
    'itu', 'ini', 'saya', 'kamu', 'kita', 'mereka', 'dia', 'anda',
    'sudah', 'telah', 'akan', 'lagi', 'dapat', 'bisa', 'harus',
    'perlu', 'ingin', 'mau', 'sering', 'kadang', 'jarang', 'selalu',
    'bukan', 'tanpa', 'seperti', 'untuk', 'dari', 'dalam', 'pada',
    'karena', 'sebagai', 'antara', 'atas', 'bawah', 'depan', 'belakang',
    'luar', 'samping', 'setiap', 'suatu', 'sendiri', 'sama', 'lain',
    'tersebut', 'begitu', 'demikian', 'maka', 'namun', 'tetapi',
    'sedangkan', 'sementara', 'walaupun', 'meskipun', 'kecuali',
    'sampai', 'hingga', 'agar', 'supaya', 'sehingga', 'apabila',
    'kalau', 'bila', 'andaikan', 'seandainya', 'seolah-olah',
    'serupa', 'tanpa', 'dengan', 'untuk', 'dari', 'dalam', 'pada',
    'ke', 'oleh', 'karena', 'sebab', 'maka'
];

class KeywordAnalyzer {
    constructor() {
        this.stopwords = STOPWORDS_ID;
    }

    // Main analysis method
    async analyze(targetUrl) {
        console.log(`🔍 Starting keyword analysis for: ${targetUrl}`);
        
        try {
            // MODULE 1: Content Analysis
            const contentAnalysis = await this.analyzeContent(targetUrl);
            
            // MODULE 2: Contextual Suggestions
            const contextualSuggestions = await this.getContextualSuggestions(contentAnalysis.seedKeywords);
            
            // MODULE 3: Competitor SERP Analysis
            const competitorAnalysis = await this.analyzeCompetitors(contentAnalysis.seedKeywords);
            
            // Combine & filter all keywords
            const allKeywords = [
                ...contentAnalysis.keywords,
                ...contextualSuggestions,
                ...competitorAnalysis.keywords
            ];
            
            const filteredKeywords = this.filterAndRankKeywords(allKeywords);
            
            return {
                success: true,
                targetUrl: targetUrl,
                keywords: filteredKeywords,
                stats: {
                    contentKeywords: contentAnalysis.keywords.length,
                    contextualSuggestions: contextualSuggestions.length,
                    competitorKeywords: competitorAnalysis.keywords.length,
                    totalFiltered: filteredKeywords.length
                },
                details: {
                    content: contentAnalysis,
                    contextual: contextualSuggestions,
                    competitors: competitorAnalysis
                }
            };
            
        } catch (error) {
            console.error('❌ Keyword analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // MODULE 1: Content Analysis
    async analyzeContent(url) {
        console.log('📄 MODULE 1: Content Analysis...');
        
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=site-per-process',
                    '--window-size=1920,1080'
                ]
            });
            
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            const pageData = await page.evaluate(() => {
                const title = document.title;
                const h1 = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
                const h2 = Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim());
                const h3 = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
                
                const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim());
                const articles = Array.from(document.querySelectorAll('article')).map(a => a.textContent.trim());
                const mainContent = Array.from(document.querySelectorAll('[class*="content"], [class*="post"], [class*="article"]'))
                    .map(el => el.textContent.trim());
                
                const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
                const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
                
                const linkTexts = Array.from(document.querySelectorAll('a'))
                    .map(a => a.textContent.trim())
                    .filter(text => text.length > 3 && text.length < 50);
                
                return {
                    title,
                    h1,
                    h2,
                    h3,
                    paragraphs: paragraphs.filter(p => p.length > 10),
                    articles,
                    mainContent,
                    metaKeywords,
                    metaDescription,
                    linkTexts
                };
            });
            
            await browser.close();
            
            const allText = [
                pageData.title,
                ...pageData.h1,
                ...pageData.h2,
                ...pageData.h3,
                ...pageData.paragraphs,
                ...pageData.articles,
                ...pageData.mainContent,
                pageData.metaKeywords,
                pageData.metaDescription,
                ...pageData.linkTexts
            ].join(' ');
            
            const words = allText.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2);
            
            const wordFreq = {};
            words.forEach(word => {
                if (!this.stopwords.includes(word)) {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                }
            });
            
            const keywords = Object.entries(wordFreq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([word]) => word);
            
            const seedKeywords = keywords.slice(0, 5);
            
            return {
                keywords,
                seedKeywords,
                wordCount: words.length,
                uniqueWords: Object.keys(wordFreq).length,
                topWords: Object.entries(wordFreq)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
            };
            
        } catch (error) {
            if (browser) await browser.close();
            throw error;
        }
    }

    // MODULE 2: Contextual Suggestions
    async getContextualSuggestions(seedKeywords) {
        console.log('🔍 MODULE 2: Getting contextual suggestions...');
        
        const suggestions = [];
        
        for (const keyword of seedKeywords.slice(0, 3)) {
            try {
                const autocomplete = await this.fetchGoogleAutocomplete(keyword);
                suggestions.push(...autocomplete);
                
                const related = await this.fetchRelatedSearches(keyword);
                suggestions.push(...related);
                
            } catch (error) {
                console.log(`⚠️ Failed to get suggestions for: ${keyword}`);
            }
        }
        
        return [...new Set(suggestions)].slice(0, 15);
    }

    async fetchGoogleAutocomplete(keyword) {
        const mockSuggestions = [
            `${keyword} terbaru`,
            `${keyword} 2025`,
            `apa itu ${keyword}`,
            `${keyword} terbaik`,
            `cara ${keyword}`,
            `harga ${keyword}`,
            `${keyword} gratis`,
            `${keyword} premium`,
            `belajar ${keyword}`,
            `${keyword} untuk pemula`
        ];
        
        return mockSuggestions.slice(0, 5);
    }

    async fetchRelatedSearches(keyword) {
        const mockRelated = [
            `${keyword} vs alternatif`,
            `perbedaan ${keyword}`,
            `kelebihan ${keyword}`,
            `kekurangan ${keyword}`,
            `review ${keyword}`,
            `${keyword} tutorial`,
            `${keyword} download`,
            `${keyword} online`,
            `${keyword} offline`,
            `${keyword} terpercaya`
        ];
        
        return mockRelated.slice(0, 5);
    }

    // MODULE 3: Competitor Analysis
    async analyzeCompetitors(seedKeywords) {
        console.log('🏆 MODULE 3: Analyzing competitor SERP...');
        
        const competitorKeywords = [];
        
        for (const keyword of seedKeywords.slice(0, 2)) {
            try {
                const serpResults = await this.fetchSERP(keyword);
                
                const titles = serpResults.map(r => r.title);
                const titleKeywords = this.extractKeywordsFromArray(titles);
                
                const descriptions = serpResults.map(r => r.description);
                const descKeywords = this.extractKeywordsFromArray(descriptions);
                
                competitorKeywords.push(...titleKeywords, ...descKeywords);
                
            } catch (error) {
                console.log(`⚠️ Failed SERP analysis for: ${keyword}`);
            }
        }
        
        return {
            keywords: [...new Set(competitorKeywords)].slice(0, 10),
            totalCompetitors: 10
        };
    }

    async fetchSERP(keyword) {
        return [
            {
                title: `Complete Guide ${keyword} 2025`,
                description: `Learn all about ${keyword} with complete and latest tutorials`
            },
            {
                title: `${keyword} Free - Download Now`,
                description: `Get ${keyword} free version with complete features`
            },
            {
                title: `Review ${keyword}: Pros and Cons`,
                description: `Read complete review about ${keyword} before deciding`
            },
            {
                title: `How to Use ${keyword} for Beginners`,
                description: `Step by step tutorial using ${keyword} from scratch`
            },
            {
                title: `${keyword} Premium vs Free`,
                description: `Feature comparison ${keyword} premium and free versions`
            }
        ];
    }

    // Helper methods
    extractKeywordsFromArray(texts) {
        const allText = texts.join(' ');
        const words = allText.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopwords.includes(word));
        
        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }

    filterAndRankKeywords(allKeywords) {
        const unique = [...new Set(allKeywords)];
        
        const filtered = unique.filter(keyword => 
            keyword.length > 2 && 
            !this.stopwords.includes(keyword.toLowerCase()) &&
            !/\d+/.test(keyword)
        );
        
        const ranked = filtered
            .map(keyword => ({
                keyword,
                score: this.calculateKeywordScore(keyword)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
            .map(item => item.keyword);
        
        return ranked;
    }

    calculateKeywordScore(keyword) {
        let score = 0;
        
        score += keyword.length * 0.5;
        
        const wordCount = keyword.split(' ').length;
        if (wordCount >= 2 && wordCount <= 3) {
            score += 15;
        }
        
        if (/[A-Z]/.test(keyword.slice(1))) {
            score += 5;
        }
        
        return score;
    }
}

module.exports = KeywordAnalyzer;