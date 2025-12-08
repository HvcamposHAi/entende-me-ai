import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ruleText, ruleName, ruleType, sampleData } = await req.json();

    if (!ruleText) {
      return new Response(
        JSON.stringify({ error: 'ruleText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Interpreting rule:', { ruleName, ruleType, ruleText });

    const systemPrompt = `Você é um especialista em regras de negócio financeiras para análise de dados da Dengo Chocolates França.

Sua tarefa é interpretar regras de negócio escritas em linguagem natural e gerar uma lógica de cálculo estruturada em JSON que pode ser aplicada a dados financeiros.

Os dados disponíveis têm os seguintes campos:
- calendarYear: número do ano (ex: 2024, 2025)
- calendarMonth: mês no formato "01.Jan", "02.Feb", etc.
- nom: nome da loja
- macroFamilyName: nome da macro-família de produtos
- familyName: nome da família de produtos
- netSales: vendas líquidas (número)
- cogs: custo dos produtos vendidos (número)
- margin: margem (número)
- volumeKg: volume em kg (número)
- quantitySoldTotal: quantidade vendida total (número)

Você deve retornar um JSON com a seguinte estrutura:
{
  "operation": "calculate" | "classify" | "filter" | "aggregate",
  "outputField": "nome do campo de saída",
  "formula": "descrição da fórmula em pseudocódigo",
  "jsExpression": "expressão JavaScript válida que pode ser avaliada",
  "appliesTo": ["lista de campos usados"],
  "conditions": [{"field": "campo", "operator": "==|!=|>|<|>=|<=|contains", "value": "valor"}],
  "description": "descrição clara do que a regra faz",
  "validationMessage": "mensagem de validação ou null se válida"
}

IMPORTANTE:
- A expressão JavaScript deve ser segura e usar apenas os campos disponíveis
- Use "row.fieldName" para acessar campos do registro
- Para agregações, use "sum", "avg", "count", "min", "max" como operation
- Valide se a regra faz sentido financeiramente`;

    const userPrompt = `Interprete a seguinte regra de negócio e gere a lógica de cálculo:

Nome da Regra: ${ruleName || 'Sem nome'}
Tipo: ${ruleType || 'calculation'}
Regra em linguagem natural: "${ruleText}"

${sampleData ? `Amostra de dados para referência: ${JSON.stringify(sampleData.slice(0, 3))}` : ''}

Retorne APENAS o JSON estruturado, sem markdown ou explicações adicionais.`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao processar regra com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty AI response');
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content);

    // Parse the JSON from the response
    let generatedLogic;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedLogic = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao interpretar resposta da IA',
          rawContent: content 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the generated logic structure
    if (!generatedLogic.operation || !generatedLogic.description) {
      console.error('Invalid generated logic structure:', generatedLogic);
      return new Response(
        JSON.stringify({ 
          error: 'Estrutura de regra inválida gerada pela IA',
          generatedLogic 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated logic:', generatedLogic);

    return new Response(
      JSON.stringify({ 
        success: true,
        generatedLogic,
        ruleName,
        ruleType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Error in interpret-rule function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});