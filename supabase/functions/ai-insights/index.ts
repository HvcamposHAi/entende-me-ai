import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getContextPrompt = (context: string) => {
  const prompts: Record<string, string> = {
    overview: `Analise os indicadores gerais de performance (KPIs). Foque em:
- Volume, Receita, COGS e Margem comparando anos
- Tendências mensais e sazonalidade
- Top macro-famílias por performance`,
    
    pl: `Analise a Demonstração de Resultados (P&L). Foque em:
- Estrutura de custos e margens
- Evolução de COGS e despesas operacionais
- Comparativo de períodos e variações significativas`,
    
    eva: `Analise o EVA (Economic Value Added) por macro-família. Foque em:
- Contribuição de cada categoria para volume e receita
- Categorias com maior/menor performance vs ano anterior
- Oportunidades de otimização de mix`,
    
    branch: `Analise a performance por loja/filial. Foque em:
- Ranking de lojas por receita e margem
- Lojas com crescimento acima/abaixo da média
- Oportunidades de replicar boas práticas`,
    
    expenses: `Analise as despesas operacionais. Foque em:
- Categorias com maior peso no orçamento
- Tendências de custos mês a mês
- Oportunidades de redução de despesas`,
    
    evolution: `Analise a evolução temporal dos indicadores. Foque em:
- Tendências de crescimento
- Sazonalidade e padrões
- Projeções de curto prazo`,
    
    forecast: `Analise as projeções e cenários futuros. Foque em:
- Validação das projeções vs histórico
- Riscos e oportunidades identificados
- Recomendações para atingir metas`
  };
  
  return prompts[context] || prompts.overview;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, projections, algorithm, store, product, context = 'overview', filters, analysisType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare data summary for LLM
    const dataSummary = {
      totalRecords: data.length,
      store: store === "all" ? "Todas as lojas" : (store || filters?.store || "Todas as lojas"),
      product: product === "all" ? "Todas as linhas de produto" : (product || filters?.product || "Todas as linhas"),
      years: [...new Set(data.map((r: any) => r.calendarYear))],
      macroFamilies: [...new Set(data.map((r: any) => r.macroFamilyName))],
      stores: [...new Set(data.map((r: any) => r.nom))],
      totalRevenue: data.reduce((sum: number, r: any) => sum + (r.netSales || 0), 0),
      totalVolume: data.reduce((sum: number, r: any) => sum + (r.volumeKg || 0), 0),
      totalCOGS: data.reduce((sum: number, r: any) => sum + (r.cogs || 0), 0),
      totalMargin: data.reduce((sum: number, r: any) => sum + (r.margin || 0), 0),
      avgMargin: data.length > 0 ? data.reduce((sum: number, r: any) => sum + (r.margin || 0), 0) / data.length : 0,
      projections: projections,
      context: context
    };

    const contextPrompt = getContextPrompt(context);

    const systemPrompt = `Você é um consultor prático especializado em análise financeira e operacional. ${contextPrompt}

Contexto: ${dataSummary.store} | ${dataSummary.product}

## ESTRUTURA DO RELATÓRIO

### 📊 DESVIOS DETECTADOS
Liste 3-5 desvios operacionais/financeiros identificados:
- ✅ **Desvio Positivo**: Métrica + valor + impacto
- ❌ **Desvio Negativo**: Métrica + valor + ação corretiva

### ⚠️ ALERTAS DE RISCO
Classifique por criticidade (ALTO/MÉDIO/BAIXO):
- 🔴 **ALTO**: Riscos que requerem ação imediata
- 🟡 **MÉDIO**: Riscos a monitorar nas próximas semanas
- 🟢 **BAIXO**: Pontos de atenção para médio prazo

### 🎯 PLANO DE AÇÃO ESTRUTURADO

**AÇÕES IMEDIATAS (Esta Semana)**
- [ ] **Ação 1**: Descrição + resultado esperado quantificado
- [ ] **Ação 2**: Descrição + resultado esperado quantificado

**CURTO PRAZO (Próximos 30 dias)**
- [ ] **Ação 1**: Descrição + meta quantificada
- [ ] **Ação 2**: Descrição + meta quantificada

**MÉDIO PRAZO (60-90 dias)**
- [ ] **Oportunidade 1**: Descrição + impacto estimado em R$ ou %
- [ ] **Oportunidade 2**: Descrição + impacto estimado em R$ ou %

### 💡 RECOMENDAÇÃO PRINCIPAL
Uma frase direta com a ação mais importante a tomar.

**IMPORTANTE**: Seja direto, use números reais dos dados, sem jargões. Cada ação deve ter resultado mensurável.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analise estes dados e gere o relatório estruturado:\n\n${JSON.stringify(dataSummary, null, 2)}` 
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const insights = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-insights function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
