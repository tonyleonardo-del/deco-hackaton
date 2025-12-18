export default async function SearchRedditDevelopers(props, ctx) {
  const { keywords, limit = 3 } = props;
  
  console.log('[SearchRedditDevelopers] Searching with keywords:', keywords);
  
  try {
    const subreddits = ['programming', 'webdev', 'reactjs', 'javascript'];
    const searchQuery = encodeURIComponent(keywords);
    
    const candidates = [];
    const processedUsers = new Set();
    
    for (const subreddit of subreddits) {
      if (candidates.length >= limit) break;
      
      try {
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${searchQuery}&sort=relevance&limit=10&restrict_sr=1`;
        console.log('[SearchRedditDevelopers] Searching subreddit:', subreddit);
        
        const response = await ctx.env['i:http'].HTTP_FETCH({
          url: searchUrl,
          method: 'GET',
          headers: {
            'User-Agent': 'Deco-Recruiting-Hub/1.0'
          },
          responseType: 'json'
        });
        
        const data = response.body;
        const posts = data.data?.children || [];
        
        for (const post of posts) {
          if (candidates.length >= limit) break;
          
          const author = post.data.author;
          if (!author || author === '[deleted]' || processedUsers.has(author)) continue;
          
          try {
            const userUrl = `https://www.reddit.com/user/${author}/about.json`;
            const userResponse = await ctx.env['i:http'].HTTP_FETCH({
              url: userUrl,
              method: 'GET',
              headers: {
                'User-Agent': 'Deco-Recruiting-Hub/1.0'
              },
              responseType: 'json'
            });
            
            const userData = userResponse.body;
            const user = userData.data;
            
            processedUsers.add(author);
            
            candidates.push({
              name: user.name || author,
              username: author,
              profileUrl: `https://www.reddit.com/user/${author}`,
              bio: `Usuário ativo em r/${subreddit} com posts sobre ${keywords}`,
              karma: user.total_karma || 0,
              platform: 'Reddit',
              skills: [subreddit, keywords.split(' ')[0]]
            });
            
            console.log('[SearchRedditDevelopers] Processed user:', author);
          } catch (userError) {
            console.error('[SearchRedditDevelopers] Error fetching user:', author);
          }
        }
      } catch (subError) {
        console.error('[SearchRedditDevelopers] Error in subreddit:', subreddit);
      }
    }
    
    console.log('[SearchRedditDevelopers] Total candidates found:', candidates.length);
    return { candidates };
    
  } catch (error) {
    console.error('[SearchRedditDevelopers] Error:', error.message);
    return { candidates: [] };
  }
}

// Metadata exports
export const name = "SearchRedditDevelopers";
export const description = "Busca desenvolvedores ativos no Reddit por keywords em subreddits de programação";
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
      "default": 3
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