export default async function SearchGitHubDevelopers(props, ctx) {
  const { keywords, limit = 5 } = props;
  
  console.log('[SearchGitHubDevelopers] Searching with keywords:', keywords);
  
  try {
    const searchQuery = encodeURIComponent(keywords);
    const searchUrl = `https://api.github.com/search/users?q=${searchQuery}+type:user&per_page=${limit}&sort=followers`;
    
    console.log('[SearchGitHubDevelopers] GitHub API URL:', searchUrl);
    
    const searchResponse = await ctx.env['i:http'].HTTP_FETCH({
      url: searchUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Deco-Recruiting-Hub'
      },
      responseType: 'json'
    });
    
    const searchData = searchResponse.body;
    console.log('[SearchGitHubDevelopers] Found users:', searchData.total_count);
    
    const candidates = [];
    
    for (const user of (searchData.items || []).slice(0, limit)) {
      try {
        const userResponse = await ctx.env['i:http'].HTTP_FETCH({
          url: user.url,
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Deco-Recruiting-Hub'
          },
          responseType: 'json'
        });
        
        const userData = userResponse.body;
        
        const reposResponse = await ctx.env['i:http'].HTTP_FETCH({
          url: `${user.url}/repos?sort=stars&per_page=10`,
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Deco-Recruiting-Hub'
          },
          responseType: 'json'
        });
        
        const repos = reposResponse.body;
        const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
        
        candidates.push({
          name: userData.name || userData.login,
          username: userData.login,
          profileUrl: userData.html_url,
          avatarUrl: userData.avatar_url,
          bio: userData.bio || 'Sem bio disponível',
          location: userData.location || 'Não especificado',
          repos: userData.public_repos,
          followers: userData.followers,
          platform: 'GitHub',
          skills: languages.slice(0, 5)
        });
        
        console.log('[SearchGitHubDevelopers] Processed user:', userData.login);
      } catch (error) {
        console.error('[SearchGitHubDevelopers] Error processing user:', error.message);
      }
    }
    
    console.log('[SearchGitHubDevelopers] Total candidates found:', candidates.length);
    return { candidates };
    
  } catch (error) {
    console.error('[SearchGitHubDevelopers] Error:', error.message);
    return { candidates: [] };
  }
}

// Metadata exports
export const name = "SearchGitHubDevelopers";
export const description = "Busca desenvolvedores reais no GitHub API por keywords de skills e tecnologias";
export const inputSchema = {
  "type": "object",
  "properties": {
    "keywords": {
      "type": "string",
      "description": "Keywords para buscar (ex: 'react typescript senior')"
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