// Step execution functions

// Step: analyze-job-description
export const step_0_execute = export default async function(input, ctx) {
  try {
    const location = input.location || 'Brazil';
    const systemPrompt = `Você é um especialista em análise de descrições de vagas.\nExtraia os seguintes campos:\n- role: cargo\n- seniority: junior|mid|senior|lead\n- must_have_skills: habilidades obrigatórias\n- nice_to_have_skills: desejáveis\n- keywords: termos de busca\n- location: ${location}\n- boolean_search: string booleana`;

    const result = await ctx.env['i:ai-generation'].AI_GENERATE_OBJECT({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${input.jobDescription}\n\nLocation: ${location}` }
      ],
      schema: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          seniority: { type: 'string', enum: ['junior', 'mid', 'senior', 'lead'] },
          must_have_skills: { type: 'array', items: { type: 'string' } },
          nice_to_have_skills: { type: 'array', items: { type: 'string' } },
          keywords: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          boolean_search: { type: 'string' }
        },
        required: ['role', 'seniority', 'must_have_skills', 'keywords', 'location', 'boolean_search']
      },
      temperature: 0.3
    });

    return {
      jobData: result.object || {},
      rawJobDescription: input.jobDescription
    };
  } catch (error) {
    return {
      jobData: { location: input.location || 'Brazil' },
      rawJobDescription: input.jobDescription,
      error: String(error)
    };
  }
};

// Step: search-candidates-multiplatform
export const step_1_execute = export default async function(input, ctx) {
  const startTime = Date.now();
  const debugLog = { timestamp: new Date().toISOString(), input: {}, platforms: {}, summary: {}, errors: [] };
  const limit = Math.min(input.limit || 5, 30);
  const location = input.location || 'Brazil';
  const topKeywords = (input.keywords || []).slice(0, 3);
  const keywords = topKeywords.join(' ');

  // 🧪 DETECÇÃO DE MOCK
  const jobDesc = (input.rawJobDescription || '').toUpperCase();
  const keywordsStr = keywords.toUpperCase();
  const useMock = jobDesc.includes('MOCK') || keywordsStr.includes('MOCK');

  debugLog.input = { keywords: input.keywords, limit, location, keywordsUsed: topKeywords, mockMode: useMock };

  // 🧪 MODO MOCK: Retorna candidatos mockados
  if (useMock) {
    debugLog.summary.mode = 'MOCK';
    debugLog.platforms.mock = { name: 'Mock Data', candidatesCount: limit, note: 'Using mock data for testing' };
    
    const mockResult = await ctx.env['i:self'].MockCandidateSearch({
      keywords: topKeywords,
      limit: limit,
      location: location
    });
    
    return mockResult;
  }

  // 🌐 MODO REAL: Busca em APIs públicas
  if (!keywords) {
    return { candidates: [], platformStats: { github: 0, devto: 0, reddit: 0, total: 0 }, searchDebugLog: debugLog };
  }

  const [githubResults, devtoResults, redditResults] = await Promise.allSettled([
    (async () => {
      const platformLog = { name: 'GitHub', startTime: Date.now(), requests: [], candidates: [], errors: [] };
      try {
        const perPage = Math.min(Math.ceil(limit / 2), 10);
        const locationQ = location ? `+location:${location}` : '';
        const searchUrl = `https://api.github.com/search/users?q=${encodeURIComponent(keywords)}${locationQ}&per_page=${perPage}`;
        
        const response = await ctx.env['i:http'].HTTP_FETCH({
          url: searchUrl,
          method: 'GET',
          headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'DecoWorkflow' },
          timeout: 15000
        });
        
        if (response.status !== 200) return [];
        
        const data = JSON.parse(response.body || '{}');
        const users = data.items || [];
        
        const candidates = users.slice(0, perPage).map(user => ({
          name: user.login,
          platform: 'github',
          profile_url: user.html_url,
          summary: `GitHub user | Score: ${user.score || 0}`,
          location: location
        }));
        
        platformLog.candidatesCount = candidates.length;
        debugLog.platforms.github = platformLog;
        return candidates;
      } catch (error) {
        platformLog.errors.push(String(error));
        debugLog.platforms.github = platformLog;
        return [];
      }
    })(),

    (async () => {
      const platformLog = { name: 'Dev.to', startTime: Date.now(), candidates: [], errors: [] };
      try {
        const mainKeyword = topKeywords[0];
        const perPage = Math.min(Math.ceil(limit / 3), 10);
        const searchUrl = `https://dev.to/api/articles?tag=${encodeURIComponent(mainKeyword)}&per_page=${perPage}`;
        
        const response = await ctx.env['i:http'].HTTP_FETCH({
          url: searchUrl,
          method: 'GET',
          headers: { 'User-Agent': 'DecoWorkflow' },
          timeout: 15000
        });
        
        if (response.status !== 200) return [];
        
        const articles = JSON.parse(response.body || '[]');
        const candidates = [];
        const seen = new Set();
        
        for (const article of articles) {
          if (!seen.has(article.user.username)) {
            seen.add(article.user.username);
            candidates.push({
              name: article.user.name || article.user.username,
              platform: 'dev.to',
              profile_url: `https://dev.to/${article.user.username}`,
              summary: `${article.user.summary || 'Dev.to writer'} | ${article.public_reactions_count || 0} reactions`,
              location: location
            });
          }
          if (candidates.length >= perPage) break;
        }
        
        platformLog.candidatesCount = candidates.length;
        debugLog.platforms.devto = platformLog;
        return candidates;
      } catch (error) {
        platformLog.errors.push(String(error));
        debugLog.platforms.devto = platformLog;
        return [];
      }
    })(),

    (async () => {
      const platformLog = { name: 'Reddit', startTime: Date.now(), candidates: [], errors: [] };
      try {
        const kw = keywords.toLowerCase();
        const subreddit = kw.includes('python') ? 'Python'
          : kw.includes('javascript') || kw.includes('react') ? 'javascript'
          : kw.includes('devops') ? 'devops'
          : 'programming';
        
        const perPage = Math.min(Math.ceil(limit / 3), 10);
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(keywords)}&limit=${perPage}&t=year`;
        
        const response = await ctx.env['i:http'].HTTP_FETCH({
          url: searchUrl,
          method: 'GET',
          headers: { 'User-Agent': 'DecoWorkflow/1.0' },
          timeout: 15000
        });
        
        if (response.status !== 200) return [];
        
        const data = JSON.parse(response.body || '{}');
        const posts = data.data?.children || [];
        const candidates = [];
        const seen = new Set();
        
        for (const post of posts) {
          const author = post.data.author;
          if (author && author !== '[deleted]' && !seen.has(author)) {
            seen.add(author);
            candidates.push({
              name: author,
              platform: 'reddit',
              profile_url: `https://reddit.com/u/${author}`,
              summary: `r/${subreddit} | ${post.data.score || 0} karma`,
              location: location
            });
          }
          if (candidates.length >= perPage) break;
        }
        
        platformLog.candidatesCount = candidates.length;
        debugLog.platforms.reddit = platformLog;
        return candidates;
      } catch (error) {
        platformLog.errors.push(String(error));
        debugLog.platforms.reddit = platformLog;
        return [];
      }
    })()
  ]);

  const allCandidates = [];
  const stats = { github: 0, devto: 0, reddit: 0, total: 0, errors: [] };

  if (githubResults.status === 'fulfilled') {
    allCandidates.push(...githubResults.value);
    stats.github = githubResults.value.length;
  }
  
  if (devtoResults.status === 'fulfilled') {
    allCandidates.push(...devtoResults.value);
    stats.devto = devtoResults.value.length;
  }
  
  if (redditResults.status === 'fulfilled') {
    allCandidates.push(...redditResults.value);
    stats.reddit = redditResults.value.length;
  }

  stats.total = allCandidates.length;

  return {
    candidates: allCandidates.slice(0, limit),
    platformStats: stats,
    searchDebugLog: debugLog
  };
};

// Step: score-candidates
export const step_2_execute = export default async function(input, ctx) {
  const candidates = input.candidates || [];
  if (candidates.length === 0) return { scoredCandidates: [], jobData: input.jobData };

  const systemPrompt = `Score candidate fit (0-100). Be concise.`;
  
  const scoringPromises = candidates.map(candidate =>
    ctx.env['i:ai-generation'].AI_GENERATE_OBJECT({
      model: 'openai:gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `JOB: ${JSON.stringify(input.jobData)}\n\nCANDIDATE: ${JSON.stringify(candidate)}` }
      ],
      schema: {
        type: 'object',
        properties: {
          score: { type: 'number', minimum: 0, maximum: 100 },
          rationale: { type: 'string', maxLength: 200 }
        },
        required: ['score', 'rationale']
      },
      temperature: 0.3,
      max_tokens: 150
    })
    .then(result => ({ ...candidate, score: result.object?.score || 0, rationale: result.object?.rationale || '' }))
    .catch(error => ({ ...candidate, score: 0, rationale: `Error: ${String(error).substring(0, 100)}` }))
  );

  const scoredCandidates = await Promise.all(scoringPromises);
  return { scoredCandidates, jobData: input.jobData };
};

// Step: rank-candidates
export const step_3_execute = export default async function(input, ctx) {
  const scoredCandidates = input.scoredCandidates || [];
  const ranked = [...scoredCandidates].sort((a, b) => (b.score || 0) - (a.score || 0));
  const topCount = input.topCandidatesCount || 3;
  const topCandidates = ranked.slice(0, topCount);
  const totalCandidates = ranked.length;
  const averageScore = totalCandidates > 0 ? ranked.reduce((sum, c) => sum + (c.score || 0), 0) / totalCandidates : 0;
  const highestScore = ranked[0]?.score || 0;
  return {
    topCandidates,
    allRankedCandidates: ranked,
    jobData: input.jobData,
    summary: { totalCandidates, topCandidatesCount: topCandidates.length, averageScore: Math.round(averageScore * 100) / 100, highestScore }
  };
};

// Step: save-to-airtable
export const step_4_execute = export default async function(input, ctx) {
  const debugLog = { step: 'init', logs: [], response: {} };
  
  try {
    const airtableToken = input.airtableToken;
    const airtableBaseId = input.airtableBaseId;
    const airtableTableName = input.airtableTableName;
    
    if (!airtableToken || !airtableBaseId || !airtableTableName) {
      debugLog.logs.push('❌ Missing Airtable credentials');
      return { savedRecords: [], successCount: 0, failureCount: 0, debugLog, error: 'Missing credentials' };
    }
    
    const candidates = input.topCandidates || [];
    const jobTitle = input.jobData?.role || 'Unknown';
    const location = input.jobData?.location || 'Unknown';
    
    if (candidates.length === 0) {
      return { savedRecords: [], successCount: 0, failureCount: 0, debugLog };
    }
    
    const records = candidates.map(c => ({ 
      fields: { 
        jobTitle, 
        location,
        name: c.name || 'Unknown', 
        platform: c.platform || 'unknown', 
        profileUrl: c.profile_url || '', 
        score: c.score || 0, 
        rationale: c.rationale || '' 
      } 
    }));
    
    const url = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}`;
    const requestBody = { records };
    
    debugLog.logs.push(`POST ${url}`);
    
    const response = await ctx.env['i:http'].HTTP_FETCH({ 
      url, 
      method: 'POST', 
      headers: { 
        'Authorization': `Bearer ${airtableToken}`, 
        'Content-Type': 'application/json' 
      }, 
      body: JSON.stringify(requestBody),
      timeout: 30000
    });
    
    debugLog.response.status = response.status;
    
    const result = JSON.parse(response.body || '{}');
    
    if (response.status >= 200 && response.status < 300) {
      debugLog.logs.push(`✅ ${result.records?.length || 0} saved`);
      return { savedRecords: result.records || [], successCount: result.records?.length || 0, failureCount: 0, debugLog };
    } else {
      debugLog.logs.push(`❌ FAILED ${response.status}: ${result.error?.message}`);
      return { savedRecords: [], successCount: 0, failureCount: candidates.length, debugLog, error: result.error?.message };
    }
  } catch (error) {
    debugLog.logs.push(`💥 ${String(error)}`);
    return { savedRecords: [], successCount: 0, failureCount: input.topCandidates?.length || 0, debugLog, error: String(error) };
  }
};

// Step: format-results
export const step_5_execute = export default async function(input, ctx) {
  return {
    job: { 
      role: input.jobData?.role || 'Unknown', 
      seniority: input.jobData?.seniority || 'mid', 
      location: input.jobData?.location || 'Brazil',
      analyzed_at: new Date().toISOString() 
    },
    candidates: (input.topCandidates || []).map(c => ({ 
      name: c.name, 
      platform: c.platform, 
      profile_url: c.profile_url, 
      score: c.score, 
      rationale: c.rationale,
      location: c.location 
    })),
    summary: { ...input.summary, platformStats: input.platformStats || {} },
    persistence: { 
      airtable: { 
        saved: input.airtableResult?.successCount || 0, 
        failed: input.airtableResult?.failureCount || 0, 
        error: input.airtableResult?.error || null 
      } 
    },
    debug: { searchAPIs: input.searchDebugLog || null }
  };
};

// Metadata exports
export const name = "IntelligentHuntingWorkflow";
export const description = "🧪 V3: Busca MOCK ou REAL (3 plataformas) + Location Brazil + Airtable";
export const stepsMetadata = [
  {
    "def": {
      "name": "analyze-job-description",
      "description": "Step 1: Analisa vaga + location",
      "inputSchema": {
        "type": "object",
        "properties": {
          "jobDescription": {
            "type": "string"
          },
          "location": {
            "type": "string",
            "description": "Location filter (default: Brazil)"
          }
        },
        "required": [
          "jobDescription"
        ]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "jobData": {
            "type": "object"
          },
          "rawJobDescription": {
            "type": "string"
          }
        },
        "required": [
          "jobData",
          "rawJobDescription"
        ]
      },
      "dependencies": [
        {
          "integrationId": "i:ai-generation",
          "toolNames": [
            "AI_GENERATE_OBJECT"
          ]
        }
      ]
    },
    "input": {
      "jobDescription": "@input.jobDescription"
    }
  },
  {
    "def": {
      "name": "search-candidates-multiplatform",
      "description": "Step 2: 🧪 MOCK ou REAL (GitHub + Dev.to + Reddit)",
      "inputSchema": {
        "type": "object",
        "properties": {
          "keywords": {
            "type": "array"
          },
          "limit": {
            "type": "number",
            "description": "Max candidates to return (default: 5, max: 30)"
          },
          "location": {
            "type": "string"
          },
          "rawJobDescription": {
            "type": "string"
          }
        },
        "required": [
          "keywords"
        ]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "candidates": {
            "type": "array"
          },
          "platformStats": {
            "type": "object"
          },
          "searchDebugLog": {
            "type": "object"
          }
        },
        "required": [
          "candidates",
          "platformStats",
          "searchDebugLog"
        ]
      },
      "dependencies": [
        {
          "integrationId": "i:http",
          "toolNames": [
            "HTTP_FETCH"
          ]
        },
        {
          "integrationId": "i:self",
          "toolNames": [
            "MockCandidateSearch"
          ]
        }
      ]
    },
    "input": {
      "keywords": "@analyze-job-description.jobData.keywords",
      "location": "@analyze-job-description.jobData.location",
      "rawJobDescription": "@analyze-job-description.rawJobDescription"
    }
  },
  {
    "def": {
      "name": "score-candidates",
      "description": "Step 3: AI Scoring",
      "inputSchema": {
        "type": "object",
        "properties": {
          "candidates": {
            "type": "array"
          },
          "jobData": {
            "type": "object"
          }
        },
        "required": [
          "candidates",
          "jobData"
        ]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "scoredCandidates": {
            "type": "array"
          },
          "jobData": {
            "type": "object"
          }
        },
        "required": [
          "scoredCandidates",
          "jobData"
        ]
      },
      "dependencies": [
        {
          "integrationId": "i:ai-generation",
          "toolNames": [
            "AI_GENERATE_OBJECT"
          ]
        }
      ]
    },
    "input": {
      "candidates": "@search-candidates-multiplatform.candidates",
      "jobData": "@analyze-job-description.jobData"
    }
  },
  {
    "def": {
      "name": "rank-candidates",
      "description": "Step 4: Ranking",
      "inputSchema": {
        "type": "object",
        "properties": {
          "scoredCandidates": {
            "type": "array"
          },
          "jobData": {
            "type": "object"
          },
          "topCandidatesCount": {
            "type": "number"
          }
        },
        "required": [
          "scoredCandidates",
          "jobData"
        ]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "topCandidates": {
            "type": "array"
          },
          "allRankedCandidates": {
            "type": "array"
          },
          "jobData": {
            "type": "object"
          },
          "summary": {
            "type": "object"
          }
        },
        "required": [
          "topCandidates",
          "jobData",
          "summary",
          "allRankedCandidates"
        ]
      },
      "dependencies": []
    },
    "input": {
      "scoredCandidates": "@score-candidates.scoredCandidates",
      "jobData": "@score-candidates.jobData",
      "topCandidatesCount": "@input.topCandidatesCount"
    }
  },
  {
    "def": {
      "name": "save-to-airtable",
      "description": "Step 5: Airtable (via input credentials)",
      "inputSchema": {
        "type": "object",
        "properties": {
          "topCandidates": {
            "type": "array"
          },
          "jobData": {
            "type": "object"
          },
          "airtableToken": {
            "type": "string"
          },
          "airtableBaseId": {
            "type": "string"
          },
          "airtableTableName": {
            "type": "string"
          }
        },
        "required": [
          "topCandidates",
          "jobData"
        ]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "savedRecords": {
            "type": "array"
          },
          "successCount": {
            "type": "number"
          },
          "failureCount": {
            "type": "number"
          },
          "debugLog": {
            "type": "object"
          }
        },
        "required": [
          "savedRecords",
          "successCount",
          "failureCount",
          "debugLog"
        ]
      },
      "dependencies": [
        {
          "integrationId": "i:http",
          "toolNames": [
            "HTTP_FETCH"
          ]
        }
      ]
    },
    "input": {
      "topCandidates": "@rank-candidates.topCandidates",
      "jobData": "@rank-candidates.jobData",
      "airtableToken": "@input.airtableToken",
      "airtableBaseId": "@input.airtableBaseId",
      "airtableTableName": "@input.airtableTableName"
    }
  },
  {
    "def": {
      "name": "format-results",
      "description": "Step 6: Format output",
      "inputSchema": {
        "type": "object",
        "properties": {
          "topCandidates": {
            "type": "array"
          },
          "jobData": {
            "type": "object"
          },
          "summary": {
            "type": "object"
          },
          "airtableResult": {
            "type": "object"
          },
          "platformStats": {
            "type": "object"
          },
          "searchDebugLog": {
            "type": "object"
          }
        },
        "required": [
          "topCandidates",
          "jobData",
          "summary"
        ]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "job": {
            "type": "object"
          },
          "candidates": {
            "type": "array"
          },
          "summary": {
            "type": "object"
          },
          "persistence": {
            "type": "object"
          },
          "debug": {
            "type": "object"
          }
        },
        "required": [
          "job",
          "candidates",
          "summary",
          "persistence",
          "debug"
        ]
      },
      "dependencies": []
    },
    "input": {
      "topCandidates": "@rank-candidates.topCandidates",
      "jobData": "@rank-candidates.jobData",
      "summary": "@rank-candidates.summary",
      "airtableResult": "@save-to-airtable",
      "platformStats": "@search-candidates-multiplatform.platformStats",
      "searchDebugLog": "@search-candidates-multiplatform.searchDebugLog"
    }
  }
];