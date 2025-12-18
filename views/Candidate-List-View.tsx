import { useState } from 'react';

export const App = (props) => {
  const [keywords, setKeywords] = useState('react, typescript, javascript');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setCandidates([]);

    try {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      
      const toolInput = {
        keywords: keywordArray,
        limit: 10,
        location: 'Brazil'
      };
      
      const result = await callTool({
        integrationId: 'i:self',
        toolName: 'MockCandidateSearch',
        input: toolInput
      });
      
      let foundCandidates = null;
      
      if (result && typeof result === 'object') {
        if (result.structuredContent?.candidates) {
          foundCandidates = result.structuredContent.candidates;
        }
        else if (result.candidates) {
          foundCandidates = result.candidates;
        }
        else if (Array.isArray(result)) {
          foundCandidates = result;
        }
        else if (result.content?.candidates) {
          foundCandidates = result.content.candidates;
        }
        else if (result.data?.candidates) {
          foundCandidates = result.data.candidates;
        }
        
        if (foundCandidates && Array.isArray(foundCandidates)) {
          setCandidates(foundCandidates);
        } else {
          throw new Error('Não foi possível encontrar array de candidatos na resposta');
        }
      } else {
        throw new Error('Resposta inválida do MockCandidateSearch');
      }
      
      setLoading(false);
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getPlatformColor = (platform) => {
    const colors = {
      github: 'bg-gray-900 text-white',
      linkedin: 'bg-blue-600 text-white',
      'dev.to': 'bg-black text-white',
      devto: 'bg-black text-white',
      default: 'bg-purple-600 text-white'
    };
    return colors[platform?.toLowerCase()] || colors.default;
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      github: '⚡',
      linkedin: '💼',
      'dev.to': '📝',
      devto: '📝',
      default: '🌐'
    };
    return icons[platform?.toLowerCase()] || icons.default;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Busca de Candidatos
              </h1>
              <p className="text-gray-600 text-sm">
                Encontre os melhores talentos para sua equipe
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            🔍 O que você procura?
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSearch()}
              placeholder="Ex: react, typescript, node.js, senior developer..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              disabled={loading}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Buscando...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Buscar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <p className="text-red-800 font-semibold text-lg">Ops! Algo deu errado</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results Header */}
        {candidates.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full font-bold text-lg">
                {candidates.length}
              </div>
              <div>
                <p className="text-gray-900 font-semibold">Candidatos encontrados</p>
                <p className="text-gray-500 text-sm">Clique em um perfil para ver mais detalhes</p>
              </div>
            </div>
          </div>
        )}

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {candidates.map((candidate, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-300 group"
            >
              <div className="p-6">
                {/* Header com Avatar e Nome */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                    {getInitials(candidate.name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {candidate.name || 'Nome não disponível'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`${getPlatformColor(candidate.platform)} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5`}>
                        <span>{getPlatformIcon(candidate.platform)}</span>
                        {candidate.platform?.toUpperCase() || 'PLATFORM'}
                      </span>
                      {candidate.location && (
                        <span className="text-gray-500 text-sm flex items-center gap-1">
                          📍 {candidate.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary/Bio */}
                {(candidate.summary || candidate.bio) && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {candidate.summary || candidate.bio}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                {candidate.profile_url && (
                  <a
                    href={candidate.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <span>🔗</span>
                    Ver Perfil Completo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && candidates.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
            <div className="text-8xl mb-6 animate-bounce">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Pronto para começar?
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Digite as habilidades ou palavras-chave que você procura e clique em <strong>Buscar</strong> para encontrar candidatos incríveis!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>💡</span>
              <span>Dica: Experimente buscar por "react", "typescript" ou "senior developer"</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
            <div className="text-8xl mb-6 animate-spin">⏳</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Buscando candidatos...
            </h3>
            <p className="text-gray-600">
              Estamos procurando os melhores talentos para você
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Metadata exports
export const name = "Candidate List View";
export const description = "Lista simples e visual de candidatos retornados pelo MockCandidateSearch";