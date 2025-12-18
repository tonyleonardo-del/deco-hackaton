import { useState } from 'react';

export const App = (props) => {
  console.log('[IntelligentRecruitingHub] Component mounted');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [savedToAirtable, setSavedToAirtable] = useState(false);

  const addLog = (message, type = 'info', details = null) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logEntry = { timestamp, message, type, details };
    setLogs(prev => [...prev, logEntry]);
    console.log(`[${type.toUpperCase()}] ${message}`, details || '');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Por favor, descreva os requisitos da vaga');
      return;
    }

    setLoading(true);
    setError(null);
    setSavedToAirtable(false);
    setCandidates([]);
    setAnalyzedData(null);
    setLogs([]);
    
    addLog('🚀 Iniciando busca de candidatos...', 'info');
    addLog(`📝 Query original: "${searchQuery}"`, 'debug');

    try {
      // Etapa 1: Analisar requisitos
      addLog('🔍 Analisando descrição da vaga...', 'info');
      
      const words = searchQuery.toLowerCase().split(/\s+/);
      addLog(`📊 Total de palavras: ${words.length}`, 'debug');
      
      const techKeywords = words.filter(w => 
        w.length > 3 && !['para', 'com', 'sobre', 'deve', 'preciso', 'busco', 'desenvolvedor', 'experiência'].includes(w)
      );
      
      addLog(`🔑 Keywords extraídas: [${techKeywords.join(', ')}]`, 'debug');
      
      const analyzedJobData = {
        role: 'Developer',
        seniority: searchQuery.toLowerCase().includes('senior') || searchQuery.toLowerCase().includes('sênior') ? 'Senior' : 
                   searchQuery.toLowerCase().includes('junior') || searchQuery.toLowerCase().includes('júnior') ? 'Junior' : 'Pleno',
        skills: techKeywords.slice(0, 5),
        keywords: techKeywords.slice(0, 8)
      };
      
      setAnalyzedData(analyzedJobData);
      addLog(`✅ Requisitos extraídos: ${analyzedJobData.role} ${analyzedJobData.seniority}`, 'success');
      addLog(`🛠️ Skills: [${analyzedJobData.skills.join(', ')}]`, 'info');
      addLog(`🔑 Keywords para busca: [${analyzedJobData.keywords.join(', ')}]`, 'info');

      if (analyzedJobData.keywords.length === 0) {
        addLog('⚠️ Nenhuma keyword identificada. Usando keywords padrão...', 'warning');
        analyzedJobData.keywords = ['react', 'typescript', 'javascript'];
      }

      // Etapa 2: Buscar candidatos usando MockCandidateSearch
      addLog('🌐 Preparando chamada MockCandidateSearch...', 'info');
      
      const keywordsArray = analyzedJobData.keywords.slice(0, 3);
      const toolInput = { 
        keywords: keywordsArray,
        limit: 8,
        location: 'Brazil'
      };
      
      addLog(`🔗 Tool: MockCandidateSearch`, 'debug');
      addLog(`📥 Input completo: ${JSON.stringify(toolInput, null, 2)}`, 'debug');
      addLog(`📋 Tipo de keywords: ${Array.isArray(toolInput.keywords) ? 'ARRAY ✅' : 'NÃO É ARRAY ❌'}`, 'debug');
      addLog(`📋 Conteúdo keywords: [${toolInput.keywords.map(k => `"${k}"`).join(', ')}]`, 'debug');
      
      addLog('⏳ Fazendo requisição...', 'info');
      const startTime = Date.now();
      
      let searchResult;
      try {
        searchResult = await callTool({
          integrationId: 'i:self',
          toolName: 'MockCandidateSearch',
          input: toolInput
        });
        
        const elapsed = Date.now() - startTime;
        addLog(`✅ Requisição completada em ${elapsed}ms`, 'success');
        addLog(`📤 Response Type: ${typeof searchResult}`, 'debug');
        addLog(`📤 Response Keys: [${Object.keys(searchResult || {}).join(', ')}]`, 'debug');
        addLog(`📤 Response completo:\n${JSON.stringify(searchResult, null, 2)}`, 'debug');
        
      } catch (toolError) {
        const elapsed = Date.now() - startTime;
        addLog(`❌ ERRO na chamada MockCandidateSearch (${elapsed}ms)`, 'error');
        addLog(`📛 Error message: ${toolError.message}`, 'error');
        addLog(`📛 Error type: ${toolError.constructor.name}`, 'error');
        addLog(`📛 Error stack:\n${toolError.stack}`, 'debug');
        
        if (toolError.response) {
          addLog(`📛 Response data: ${JSON.stringify(toolError.response, null, 2)}`, 'error');
        }
        
        throw toolError;
      }
      
      // Validar resposta
      if (!searchResult) {
        addLog('❌ searchResult é null/undefined', 'error');
        throw new Error('MockCandidateSearch retornou resposta vazia');
      }
      
      if (!searchResult.candidates) {
        addLog('⚠️ searchResult.candidates não existe', 'warning');
        addLog(`📋 Estrutura recebida: ${JSON.stringify(Object.keys(searchResult))}`, 'debug');
        searchResult.candidates = [];
      }
      
      addLog(`📊 Candidatos encontrados: ${searchResult.candidates.length}`, 'info');
      
      let allCandidates = searchResult.candidates || [];
      
      if (allCandidates.length === 0) {
        addLog('❌ Nenhum candidato retornado pelo MockCandidateSearch', 'error');
        setError('Nenhum candidato encontrado. Tente outras keywords.');
        setLoading(false);
        return;
      }
      
      addLog(`🏆 Total de candidatos MOCK: ${allCandidates.length}`, 'info');
      allCandidates.forEach((c, i) => {
        addLog(`   👤 [#${i+1}] Raw: ${JSON.stringify(c)}`, 'debug');
      });
      
      // Função auxiliar para extrair skills
      const extractSkills = (text) => {
        if (!text) return [];
        const techTerms = ['react', 'typescript', 'javascript', 'node', 'python', 'java', 'rust', 'go', 
                           'docker', 'kubernetes', 'aws', 'graphql', 'mongodb', 'postgresql', 
                           'next.js', 'vue', 'angular', 'deno', 'cloudflare'];
        const lowerText = text.toLowerCase();
        return techTerms.filter(term => lowerText.includes(term));
      };
      
      // Normalizar campos (profile_url → profileUrl, adicionar campos faltantes)
      addLog('🔄 Normalizando dados dos candidatos...', 'info');
      allCandidates = allCandidates.map((c, idx) => {
        const normalized = {
          name: c.name || 'Nome não disponível',
          platform: c.platform || 'unknown',
          profileUrl: c.profile_url || c.profileUrl || '#',
          bio: c.summary || c.bio || 'Sem descrição disponível',
          location: c.location || 'Brazil',
          skills: extractSkills(c.summary || c.bio || ''),
          followers: Math.floor(Math.random() * 1000) + 100,
          repos: Math.floor(Math.random() * 100) + 20,
          karma: Math.floor(Math.random() * 5000) + 1000,
          articles: Math.floor(Math.random() * 20) + 5
        };
        
        addLog(`   ✓ [#${idx+1}] ${normalized.name} - ${normalized.skills.length} skills extraídas`, 'debug');
        return normalized;
      });

      // Etapa 3: Calcular scores
      addLog('🧠 Calculando scores de compatibilidade...', 'info');
      addLog(`📐 Algoritmo: match de skills (40-80) + bonus de métricas (0-20)`, 'debug');
      
      const scoredCandidates = allCandidates.map((candidate, idx) => {
        const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
        const jobSkills = analyzedJobData.skills.map(s => s.toLowerCase());
        
        addLog(`🔢 [Candidato ${idx+1}] ${candidate.name} (${candidate.platform})`, 'debug');
        addLog(`   Skills candidato: [${candidateSkills.join(', ')}]`, 'debug');
        addLog(`   Skills vaga: [${jobSkills.join(', ')}]`, 'debug');
        
        let matchCount = 0;
        jobSkills.forEach(jobSkill => {
          if (candidateSkills.some(cs => cs.includes(jobSkill) || jobSkill.includes(cs))) {
            matchCount++;
            addLog(`   ✓ Match: ${jobSkill}`, 'debug');
          }
        });
        
        let score = 40 + (matchCount / Math.max(jobSkills.length, 1)) * 40;
        addLog(`   Base score: ${score.toFixed(1)} (${matchCount}/${jobSkills.length} skills)`, 'debug');
        
        let bonus = 0;
        if (candidate.followers > 100) { score += 5; bonus += 5; }
        if (candidate.repos > 20) { score += 5; bonus += 5; }
        if (candidate.karma > 1000) { score += 5; bonus += 5; }
        if (candidate.articles > 5) { score += 5; bonus += 5; }
        
        if (bonus > 0) {
          addLog(`   Bonus: +${bonus} pontos`, 'debug');
        }
        
        score = Math.min(Math.round(score), 100);
        addLog(`   Score final: ${score}/100`, 'debug');
        
        const justification = `Match de ${matchCount}/${jobSkills.length} skills requeridas. ` +
          (candidate.followers ? `${candidate.followers} seguidores. ` : '') +
          (candidate.repos ? `${candidate.repos} repositórios públicos. ` : '') +
          (candidate.karma ? `${candidate.karma} karma. ` : '') +
          (candidate.articles ? `${candidate.articles} artigos.` : '');
        
        return {
          ...candidate,
          score,
          justification
        };
      });
      
      scoredCandidates.sort((a, b) => b.score - a.score);
      
      addLog(`✅ Scores calculados e ordenados`, 'success');
      addLog(`📊 Top ${scoredCandidates.length} candidatos:`, 'info');
      scoredCandidates.forEach((c, i) => {
        addLog(`   #${i+1} ${c.name} (${c.platform}): ${c.score}/100`, 'info');
      });
      
      setCandidates(scoredCandidates);
      
      // Etapa 4: Salvar no Airtable
      addLog('💾 Salvando candidatos no Airtable...', 'info');
      addLog(`🔗 Tool: SaveCandidatesToAirtable`, 'debug');
      
      const airtableInput = {
        candidates: scoredCandidates,
        jobData: analyzedJobData
      };
      addLog(`📥 Input Airtable: ${JSON.stringify(airtableInput, null, 2).substring(0, 500)}...`, 'debug');
      
      try {
        const saveStartTime = Date.now();
        const saveResult = await callTool({
          integrationId: 'i:self',
          toolName: 'SaveCandidatesToAirtable',
          input: airtableInput
        });
        const saveElapsed = Date.now() - saveStartTime;
        
        addLog(`✅ Salvamento concluído em ${saveElapsed}ms`, 'success');
        addLog(`📤 Response Airtable: ${JSON.stringify(saveResult, null, 2)}`, 'debug');
        addLog(`📊 ${saveResult.savedCount || scoredCandidates.length}/${scoredCandidates.length} candidatos salvos`, 'success');
        setSavedToAirtable(true);
        
      } catch (saveError) {
        addLog(`❌ Erro ao salvar no Airtable: ${saveError.message}`, 'error');
        addLog(`📛 Stack Airtable:\n${saveError.stack}`, 'debug');
        addLog('💡 Verifique as secrets: AIRTABLE_BASE_ID, AIRTABLE_TOKEN, AIRTABLE_TABLE_NAME', 'warning');
      }
      
      addLog('✅ Busca concluída com sucesso!', 'success');
      setLoading(false);

    } catch (err) {
      console.error('[IntelligentRecruitingHub] FATAL ERROR:', err);
      addLog(`❌ ERRO CRÍTICO: ${err.message}`, 'error');
      addLog(`📛 Error name: ${err.name}`, 'error');
      addLog(`📛 Error constructor: ${err.constructor.name}`, 'error');
      addLog(`📛 Stack completo:\n${err.stack}`, 'debug');
      
      // Tentar extrair mais info
      if (err.cause) {
        addLog(`📛 Error cause: ${JSON.stringify(err.cause)}`, 'error');
      }
      if (err.response) {
        addLog(`📛 Error response: ${JSON.stringify(err.response)}`, 'error');
      }
      
      setError(err.message || 'Erro ao processar busca');
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return '🌟 Excelente Match';
    if (score >= 60) return '✅ Bom Match';
    if (score >= 40) return '⚠️ Match Moderado';
    return '❌ Match Baixo';
  };
  
  const getLogIcon = (type) => {
    if (type === 'success') return '✅';
    if (type === 'error') return '❌';
    if (type === 'warning') return '⚠️';
    if (type === 'debug') return '🔍';
    return '💬';
  };
  
  const getLogColor = (type) => {
    if (type === 'success') return 'text-green-400';
    if (type === 'error') return 'text-red-400';
    if (type === 'warning') return 'text-yellow-400';
    if (type === 'debug') return 'text-gray-400';
    return 'text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            🎯 Intelligent Recruiting Hub
          </h1>
          <p className="text-gray-600 text-lg">
            Busca automática de candidatos com MockCandidateSearch, scoring e integração Airtable
          </p>
          <div className="mt-3 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
            🧪 MODO MOCK ATIVO - Dados simulados para testes
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <label className="block text-gray-700 font-semibold mb-3 text-lg">
            📝 Descreva a vaga ou requisitos do candidato:
          </label>
          <textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ex: Preciso de um desenvolvedor React sênior com experiência em TypeScript, testes automatizados e conhecimento em arquitetura de micro frontends..."
            className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none text-gray-700"
            disabled={loading}
          />
          
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            {loading ? '⏳ Processando...' : '🚀 Buscar Candidatos (MOCK)'}
          </button>
        </div>

        {/* Logs Section - MAIS VISÍVEL */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-2xl shadow-xl p-6 mb-8 text-white font-mono max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-900 pb-2">
              <h3 className="text-lg font-bold">📊 Logs Técnicos Detalhados</h3>
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                Limpar
              </button>
            </div>
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className={`${getLogColor(log.type)} text-xs leading-relaxed`}>
                  <span className="text-gray-500">[{log.timestamp}]</span> {getLogIcon(log.type)} {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analyzed Data Section */}
        {analyzedData && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">🔍 Requisitos Extraídos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6">
                <h4 className="font-semibold text-gray-700 mb-2">👔 Cargo</h4>
                <p className="text-lg text-purple-600 font-bold">{analyzedData.role}</p>
              </div>
              
              <div className="bg-white rounded-xl p-6">
                <h4 className="font-semibold text-gray-700 mb-2">📊 Senioridade</h4>
                <p className="text-lg text-blue-600 font-bold">{analyzedData.seniority}</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 md:col-span-2">
                <h4 className="font-semibold text-gray-700 mb-3">🔑 Keywords para Busca</h4>
                <div className="flex flex-wrap gap-2">
                  {analyzedData.keywords?.map((keyword, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-8">
            <p className="text-red-700 font-semibold">❌ {error}</p>
            <p className="text-red-600 text-sm mt-2">Verifique os logs acima para mais detalhes</p>
          </div>
        )}

        {/* Candidates Ranking */}
        {candidates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">🏆 Ranking de Candidatos (Top {candidates.length})</h3>
              {savedToAirtable && (
                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-semibold">
                  ✅ Salvo no Airtable
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {candidates.map((candidate, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="bg-gradient-to-br from-purple-500 to-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-800 mb-1">
                          {candidate.name || 'Nome não disponível'}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="px-3 py-1 bg-gray-100 rounded-full font-medium">
                            📍 {candidate.platform}
                          </span>
                          {candidate.profileUrl && candidate.profileUrl !== '#' && (
                            <a
                              href={candidate.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              🔗 Ver Perfil
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`px-6 py-3 rounded-xl font-bold text-lg ${getScoreColor(candidate.score)}`}>
                      {getScoreLabel(candidate.score)}
                      <div className="text-3xl mt-1">{candidate.score}/100</div>
                    </div>
                  </div>
                  
                  {candidate.bio && (
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{candidate.bio}</p>
                    </div>
                  )}
                  
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-gray-700 mb-2">🛠️ Skills:</h5>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-700 mb-2">💡 Justificativa do Score:</h5>
                    <p className="text-gray-600 text-sm leading-relaxed">{candidate.justification}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!loading && candidates.length === 0 && logs.length === 0 && (
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">📚 Como Usar (MODO MOCK)</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-3 text-2xl">1️⃣</span>
                <span>Descreva a vaga em linguagem natural no campo acima</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-2xl">2️⃣</span>
                <span>Use termos técnicos: react, python, javascript, typescript, etc.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-2xl">3️⃣</span>
                <span>O sistema usa MockCandidateSearch para retornar candidatos simulados</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-2xl">4️⃣</span>
                <span>Logs técnicos detalhados mostram cada etapa + requisições HTTP</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-2xl">5️⃣</span>
                <span>Candidatos são ranqueados e salvos automaticamente no Airtable</span>
              </li>
            </ul>
            
            <div className="mt-6 bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
              <p className="text-blue-800 font-semibold mb-2">🧪 Modo MOCK Ativado</p>
              <p className="text-blue-700 text-sm">
                Esta interface usa dados simulados para demonstração. Os candidatos retornados são exemplos fictícios gerados pelo MockCandidateSearch para testes da interface.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Metadata exports
export const name = "Intelligent Recruiting Hub";
export const description = "Busca inteligente de candidatos com análise de requisitos em linguagem natural, busca em múltiplas plataformas (GitHub, Reddit, Dev.to) e ranking automático com integração Airtable";