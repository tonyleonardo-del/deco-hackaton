export default async function(input, ctx) {
  const limit = Math.min(input.limit || 5, 10);
  const location = input.location || 'Brazil';
  
  // Mock de candidatos realistas
  const mockCandidates = [
    {
      name: 'Ana Silva',
      platform: 'github',
      profile_url: 'https://github.com/anasilva-dev',
      summary: '8 anos de exp. | TypeScript, React, Node.js | Contribuidora open-source | 500+ repos',
      location: 'São Paulo, Brazil'
    },
    {
      name: 'Carlos Mendes',
      platform: 'linkedin',
      profile_url: 'https://linkedin.com/in/carlos-mendes-dev',
      summary: 'Tech Lead @ Nubank | 10+ anos | Cloudflare Workers, Deno, AI tools',
      location: 'Rio de Janeiro, Brazil'
    },
    {
      name: 'Beatriz Costa',
      platform: 'github',
      profile_url: 'https://github.com/beatrizcosta',
      summary: 'Senior Frontend Engineer | React 18+, TypeScript | Ex-Google',
      location: 'São Paulo, Brazil'
    },
    {
      name: 'Rafael Oliveira',
      platform: 'dev.to',
      profile_url: 'https://dev.to/rafaeloliveira',
      summary: 'Full-Stack Dev | Node.js, React, CI/CD | 2500+ followers | Weekly blogger',
      location: 'Belo Horizonte, Brazil'
    },
    {
      name: 'Juliana Santos',
      platform: 'linkedin',
      profile_url: 'https://linkedin.com/in/juliana-santos-tech',
      summary: 'Senior Software Engineer @ iFood | React, TypeScript, GraphQL | Speaker',
      location: 'Campinas, Brazil'
    },
    {
      name: 'Pedro Almeida',
      platform: 'github',
      profile_url: 'https://github.com/pedroalmeida',
      summary: 'Staff Engineer | Deno core contributor | Rust + TypeScript',
      location: 'São Paulo, Brazil'
    },
    {
      name: 'Mariana Ferreira',
      platform: 'linkedin',
      profile_url: 'https://linkedin.com/in/mariana-ferreira-dev',
      summary: 'Lead Frontend @ Stone | React, Next.js, A11y advocate | 7 anos exp',
      location: 'Rio de Janeiro, Brazil'
    },
    {
      name: 'Lucas Martins',
      platform: 'github',
      profile_url: 'https://github.com/lucasmartins',
      summary: 'Senior Backend Dev | Node.js, TypeScript, Cloudflare Workers | 500+ stars',
      location: 'São Paulo, Brazil'
    }
  ];
  
  const selectedCandidates = mockCandidates.slice(0, limit);
  
  const platformStats = {
    github: selectedCandidates.filter(c => c.platform === 'github').length,
    linkedin: selectedCandidates.filter(c => c.platform === 'linkedin').length,
    devto: selectedCandidates.filter(c => c.platform === 'dev.to').length,
    total: selectedCandidates.length
  };
  
  const searchDebugLog = {
    timestamp: new Date().toISOString(),
    mode: 'MOCK',
    input: { keywords: input.keywords, limit, location },
    platforms: {
      mock: {
        name: 'Mock Data',
        candidatesCount: selectedCandidates.length,
        note: 'Using mock data for testing'
      }
    },
    summary: {
      totalCandidates: selectedCandidates.length,
      sources: ['mock']
    }
  };
  
  return {
    candidates: selectedCandidates,
    platformStats,
    searchDebugLog
  };
}

// Metadata exports
export const name = "MockCandidateSearch";
export const description = "Retorna candidatos mockados para testes. Use quando jobDescription contiver 'MOCK' ou 'TEST'.";
export const inputSchema = {
  "type": "object",
  "properties": {
    "keywords": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Keywords da vaga (ignoradas no mock)"
    },
    "limit": {
      "type": "number",
      "description": "Número de candidatos (default: 5)"
    },
    "location": {
      "type": "string",
      "description": "Localização"
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
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "platform": {
            "type": "string"
          },
          "profile_url": {
            "type": "string"
          },
          "summary": {
            "type": "string"
          },
          "location": {
            "type": "string"
          }
        }
      }
    },
    "platformStats": {
      "type": "object",
      "properties": {
        "github": {
          "type": "number"
        },
        "linkedin": {
          "type": "number"
        },
        "devto": {
          "type": "number"
        },
        "total": {
          "type": "number"
        }
      }
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
};