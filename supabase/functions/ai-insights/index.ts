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
    const { data, projections, algorithm } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare data summary for LLM
    const dataSummary = {
      totalRecords: data.length,
      years: [...new Set(data.map((r: any) => r.calendarYear))],
      macroFamilies: [...new Set(data.map((r: any) => r.macroFamilyName))],
      totalRevenue: data.reduce((sum: number, r: any) => sum + r.netSales, 0),
      totalVolume: data.reduce((sum: number, r: any) => sum + r.volumeKg, 0),
      projections: projections
    };

    const systemPrompt = `Você é um consultor estratégico especializado em análise de dados e expansão de negócios.
Analise os dados fornecidos e as projeções geradas pelo algoritmo ${algorithm}.
Forneça insights acionáveis sobre:
1. Tendências identificadas nos dados históricos
2. Oportunidades de expansão baseadas nas projeções
3. Riscos e considerações importantes
4. Recomendações estratégicas específicas
5. Ações prioritárias para os próximos 3-6 meses

Seja específico, direto e focado em ações práticas.`;

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
