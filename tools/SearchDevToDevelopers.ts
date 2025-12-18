export default async function SearchDevToDevelopers(props, ctx) {
  const { keywords, limit = 5 } = props;
  
  console.log('[SearchDevToDevelopers] Searching with keywords:', keywords);
  
  try {
    const searchQuery = encodeURIComponent(keywords.split(' ')[0]);
    const articlesUrl = `https://dev.to/api/articles?per_page=20&tag=${searchQuery}`;
    
    console.log('[SearchDevToDevelopers] Dev.to API URL:', articlesUrl);
    
    const articlesResponse = await ctx.env['i:http'].HTTP_FETCH({
      url: articlesUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Deco-Recruiting-Hub'
      },
      responseType: 'json'
    });
    
    const articles = articlesResponse.body;
    console.log('[SearchDevToDevelopers] Found articles:', articles.length);
    
    const candidates = [];
    const processedUsers = new Set();
    
    for (const article of articles) {
      if (candidates.length >= limit) break;
      
      const username = article.user?.username;
      if (!username || processedUsers.has(username)) continue;
      
      try {
        const userUrl = `https://dev.to/api/users/${username}`;
        const userResponse = await ctx.env['i:http'].HTTP_FETCH({
          url: userUrl,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Deco-Recruiting-Hub'
          },
          responseType: 'json'
        });
        
        const userData = userResponse.body;
        processedUsers.add(username);
        
        const userArticles = articles.filter(a => a.user?.username === username);
        const tags = [...new Set(userArticles.flatMap(a => a.tag_list || []))];
        
        candidates.push({
          name: userData.name || username,
          username: username,
          profileUrl: `https://dev.to/${username}`,
          bio: userData.summary || `Autor no Dev.to escrevendo sobre ${tags.slice(0, 3).join(', ')}`,
          websiteUrl: userData.website_url || '',
          platform: 'Dev.to',
          articles: userArticles.length,
          skills: tags.slice(0, 5)
        });
        
        console.log('[SearchDevToDevelopers] Processed user:', username);
      } catch (userError) {
        console.error('[SearchDevToDevelopers] Error fetching user:', username);
      }
    }
    
    console.log('[SearchDevToDevelopers] Total candidates found:', candidates.length);
    return { candidates };
    
  } catch (error) {
    console.error('[SearchDevToDevelopers] Error:', error.message);
    return { candidates: [] };
  }
}

// Metadata exports
export const name = "SearchDevToDevelopers";
export const description = "Busca autores ativos no Dev.to por keywords e tags de tecnologia";
export const inputSchema = {
  "type": "object",
  "properties": {
    "keywords": {
      "type": "string",
      "description": "Keywords para buscar"
    },
    "limit": {
      "type": "number",
      "description": "Número máximo de resultados",
      "default": 5
    }
  },
  "required": [
    "keywords"
  ]
};
export const outputSchema = {
  "type": "object",
  "properties": {
    "candidates": {
      "type": "array",
      "items": {
        "type": "object"
      }
    }
  }
};
export const dependencies = [
  {
    "integrationId": "i:http",
    "toolNames": [
      "HTTP_FETCH"
    ]
  }
];