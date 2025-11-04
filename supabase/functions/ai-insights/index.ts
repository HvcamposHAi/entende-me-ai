import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, projections, algorithm, store, product } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare data summary for LLM
    const dataSummary = {
      totalRecords: data.length,
      store: store === "all" ? "Todas as lojas" : store,
      product: product === "all" ? "Todas as linhas de produto" : product,
      years: [...new Set(data.map((r: any) => r.calendarYear))],
      macroFamilies: [...new Set(data.map((r: any) => r.macroFamilyName))],
      stores: [...new Set(data.map((r: any) => r.nom))],
      totalRevenue: data.reduce((sum: number, r: any) => sum + r.netSales, 0),
      totalVolume: data.reduce((sum: number, r: any) => sum + r.volumeKg, 0),
      avgMargin: data.reduce((sum: number, r: any) => sum + r.margin, 0) / data.length,
      projections: projections
    };

    const systemPrompt = `Você é um consultor estratégico especializado em operações comerciais e expansão de negócios.

Analise os dados fornecidos para ${dataSummary.store} e ${dataSummary.product}, e as projeções geradas pelo algoritmo ${algorithm}.

Forneça uma INSTRUÇÃO DE TRABALHO detalhada no seguinte formato:

## CONTEXTO DA ANÁLISE
- Período analisado
- Escopo (loja e linha de produto)
- Algoritmo utilizado

## TENDÊNCIAS IDENTIFICADAS
- Liste as principais tendências observadas nos dados históricos com números específicos

## INSTRUÇÕES DE TRABALHO

### 1. AÇÕES IMEDIATAS (Próximos 30 dias)
- [ ] Ação específica 1 com responsável sugerido
- [ ] Ação específica 2 com responsável sugerido
- [ ] Ação específica 3 com responsável sugerido

### 2. AÇÕES DE CURTO PRAZO (1-3 meses)
- [ ] Ação específica 1 com métrica de sucesso
- [ ] Ação específica 2 com métrica de sucesso
- [ ] Ação específica 3 com métrica de sucesso

### 3. AÇÕES DE MÉDIO PRAZO (3-6 meses)
- [ ] Ação estratégica 1 com resultado esperado
- [ ] Ação estratégica 2 com resultado esperado
- [ ] Ação estratégica 3 com resultado esperado

## INDICADORES DE ACOMPANHAMENTO
- KPI 1: [nome] - Meta: [valor]
- KPI 2: [nome] - Meta: [valor]
- KPI 3: [nome] - Meta: [valor]

## RISCOS E MITIGAÇÕES
- Risco 1: [descrição] → Mitigação: [ação]
- Risco 2: [descrição] → Mitigação: [ação]

## RECURSOS NECESSÁRIOS
- Investimento estimado
- Equipe necessária
- Tecnologia/ferramentas

Seja específico, quantitativo e focado em ações executáveis.`;

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
            content: `Analise estes dados e projeções:\n\n${JSON.stringify(dataSummary, null, 2)}` 
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
