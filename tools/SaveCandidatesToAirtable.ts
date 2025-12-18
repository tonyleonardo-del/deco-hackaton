export default async function SaveCandidatesToAirtable(props, ctx) {
  const { jobTitle, candidates } = props;
  
  console.log('🚀 [SaveCandidatesToAirtable] Iniciando...');
  console.log('📋 Job Title:', jobTitle);
  console.log('👥 Candidatos:', candidates.length);
  
  try {
    // 1️⃣ Ler secrets do Airtable
    console.log('🔑 Lendo secrets...');
    
    const baseIdResult = await ctx.env['i:secrets-management'].SECRETS_READ({ name: 'AIRTABLE_BASE_ID' });
    const tokenResult = await ctx.env['i:secrets-management'].SECRETS_READ({ name: 'AIRTABLE_TOKEN' });
    const tableNameResult = await ctx.env['i:secrets-management'].SECRETS_READ({ name: 'AIRTABLE_TABLE_NAME' });
    
    const baseId = baseIdResult.value;
    const token = tokenResult.value;
    const tableName = tableNameResult.value;
    
    if (!baseId || !token || !tableName) {
      throw new Error('❌ Secrets não configuradas. Configure AIRTABLE_BASE_ID, AIRTABLE_TOKEN e AIRTABLE_TABLE_NAME');
    }
    
    console.log('✅ Secrets carregadas');
    console.log('📊 Base ID:', baseId.substring(0, 8) + '...');
    console.log('📁 Tabela:', tableName);
    
    // 2️⃣ Preparar records - APENAS OS 6 CAMPOS
    const records = candidates.map(candidate => ({
      fields: {
        jobTitle: jobTitle,
        name: candidate.name,
        platform: candidate.platform,
        profileUrl: candidate.profileUrl,
        score: candidate.score,
        rationale: candidate.rationale
      }
    }));
    
    console.log('📦 Records preparados:', records.length);
    console.log('🔍 Exemplo:', JSON.stringify(records[0], null, 2));
    
    // 3️⃣ Enviar para Airtable
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
    console.log('🌐 URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records })
    });
    
    console.log('📡 Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro API:', errorText);
      throw new Error(`Airtable API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    const savedCount = result.records?.length || 0;
    
    console.log('✅ Salvos:', savedCount, 'candidatos');
    
    return {
      success: true,
      savedCount: savedCount,
      message: `✅ ${savedCount} candidatos salvos no Airtable!`,
      records: result.records
    };
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return {
      success: false,
      savedCount: 0,
      message: `Erro: ${error.message}`,
      error: error.message
    };
  }
}

// Metadata exports
export const name = "SaveCandidatesToAirtable";
export const description = "Salva candidatos ranqueados no Airtable com os campos: jobTitle, name, platform, profileUrl, score, rationale";
export const inputSchema = {
  "type": "object",
  "properties": {
    "jobTitle": {
      "type": "string",
      "description": "Título da vaga (ex: 'Developer Senior', 'Designer Junior')"
    },
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
          "profileUrl": {
            "type": "string"
          },
          "score": {
            "type": "number"
          },
          "rationale": {
            "type": "string"
          }
        },
        "required": [
          "name",
          "platform",
          "profileUrl",
          "score",
          "rationale"
        ]
      }
    }
  },
  "required": [
    "jobTitle",
    "candidates"
  ]
};
export const outputSchema = {
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "savedCount": {
      "type": "number"
    },
    "message": {
      "type": "string"
    },
    "records": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "error": {
      "type": "string"
    }
  }
};
export const dependencies = [
  {
    "integrationId": "i:secrets-management",
    "toolNames": [
      "SECRETS_READ"
    ]
  }
];