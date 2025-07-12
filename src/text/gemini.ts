// Geração de roteiro com Gemini 1.5 Flash
import axios from 'axios';

export async function generateScript(prompt: string, apiKey: string): Promise<string> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }]
  });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Texto não gerado.';
}

// Funções específicas para Baby Diary
export async function generateBabyDiaryPost(tema: string, tipo: 'dica' | 'desenvolvimento' | 'cuidados' | 'alimentacao' | 'brincadeiras', apiKey: string): Promise<string> {
  const prompts = {
    dica: `Crie um post criativo e útil para o Baby Diary sobre: "${tema}". 
    Formato: 3-4 frases curtas e objetivas, cada uma com máximo 15 palavras.
    Tom: carinhoso, profissional e motivacional.
    Foco: dicas práticas que pais podem aplicar imediatamente.
    Exemplo: "Amamentação é um momento especial de conexão. Respire fundo e relaxe. Seu bebê sente sua calma. Cada mamada é única e especial."`,
    
    desenvolvimento: `Crie um post sobre desenvolvimento infantil: "${tema}".
    Formato: 3-4 frases curtas, máximo 15 palavras cada.
    Tom: educativo, empático e encorajador.
    Foco: marcos do desenvolvimento e como os pais podem apoiar.
    Exemplo: "Seu bebê está descobrindo o mundo. Cada sorriso é um marco importante. Acompanhe cada conquista com carinho. O desenvolvimento é único para cada criança."`,
    
    cuidados: `Crie um post sobre cuidados com o bebê: "${tema}".
    Formato: 3-4 frases curtas, máximo 15 palavras cada.
    Tom: cuidadoso, informativo e tranquilizador.
    Foco: cuidados essenciais e segurança.
    Exemplo: "A segurança do seu bebê é prioridade. Sempre verifique a temperatura do banho. Mantenha objetos pequenos longe do alcance. Supervisione sempre os momentos de brincadeira."`,
    
    alimentacao: `Crie um post sobre alimentação infantil: "${tema}".
    Formato: 3-4 frases curtas, máximo 15 palavras cada.
    Tom: nutritivo, prático e positivo.
    Foco: alimentação saudável e introdução de novos alimentos.
    Exemplo: "A alimentação é fundamental para o crescimento. Introduza novos sabores gradualmente. Cada refeição é uma aventura culinária. Celebre as preferências do seu bebê."`,
    
    brincadeiras: `Crie um post sobre brincadeiras e estimulação: "${tema}".
    Formato: 3-4 frases curtas, máximo 15 palavras cada.
    Tom: divertido, estimulante e afetivo.
    Foco: brincadeiras que desenvolvem habilidades.
    Exemplo: "Brincar é aprender de forma divertida. Cada brincadeira desenvolve uma habilidade. O tempo junto é o melhor presente. Divirta-se com seu pequeno explorador."`
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompts[tipo] }] }]
  });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Post não gerado.';
}

export async function generateVideoScript(tema: string, cenas: number = 5, apiKey: string): Promise<string> {
  const prompt = `Crie um roteiro para vídeo sobre: "${tema}". 
  Divida em ${cenas} cenas/frases curtas, cada uma com máximo 20 palavras, separadas por ponto final.
  Tom: educativo, carinhoso e prático.
  Foco: conteúdo útil para pais de bebês.
  Seja objetivo e direto.`;

  return generateScript(prompt, apiKey);
}

export async function generateSocialMediaCaption(tema: string, plataforma: 'instagram' | 'facebook' | 'tiktok', apiKey: string): Promise<string> {
  const prompts = {
    instagram: `Crie uma legenda para Instagram sobre: "${tema}".
    Formato: 2-3 frases + 3-5 hashtags relevantes.
    Tom: inspirador, autêntico e visual.
    Foco: conexão emocional e engajamento.
    Exemplo: "Cada momento com o bebê é um tesouro precioso. Aproveite cada sorriso, cada descoberta. O tempo passa rápido demais! 👶💕 #BabyDiary #Maternidade #AmorDeMae #DesenvolvimentoInfantil #Crescimento"`,
    
    facebook: `Crie um post para Facebook sobre: "${tema}".
    Formato: 3-4 frases + pergunta para engajamento.
    Tom: comunitário, informativo e acolhedor.
    Foco: compartilhamento de experiências.
    Exemplo: "A jornada da maternidade é cheia de aprendizados. Cada dia traz novos desafios e conquistas. Como vocês lidam com os momentos difíceis? Compartilhem suas experiências nos comentários!"`,
    
    tiktok: `Crie uma descrição para TikTok sobre: "${tema}".
    Formato: 1-2 frases + 3-4 hashtags trending.
    Tom: divertido, dinâmico e viral.
    Foco: tendências e engajamento rápido.
    Exemplo: "Dica rápida que vai mudar sua vida! 👶✨ #BabyHack #Maternidade #TikTokBrasil #DicaDoDia"`
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompts[plataforma] }] }]
  });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Legenda não gerada.';
}

// ===== NOVAS FUNÇÕES PARA MARKETING DO BABY DIARY SAAS =====

export async function generateBabyDiaryMarketingContent(
  tipo: 'influenciadora' | 'parceiro' | 'mae' | 'vendas',
  plataforma: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'email',
  apiKey: string
): Promise<string> {
  const prompts = {
    influenciadora: {
      instagram: `Crie um post para influenciadoras digitais do nicho materno sobre o Baby Diary SaaS white-label.
      Foco: oportunidade de negócio, comissões recorrentes, produto pronto.
      Formato: 3-4 frases + 5 hashtags estratégicas.
      Tom: empreendedor, motivacional, oportunidade.
      Inclua: benefícios financeiros, facilidade de implementação, suporte.
      Exemplo: "Transforme sua audiência em renda recorrente! O Baby Diary é o app definitivo para mães que querem documentar cada momento especial. Produto 100% pronto, comissões recorrentes e suporte completo. Quer saber como? Comenta aqui! 💰👶 #BabyDiary #Empreendedorismo #Maternidade #RendaRecorrente #WhiteLabel"`,
      
      facebook: `Crie um post para Facebook direcionado a influenciadoras sobre o Baby Diary.
      Foco: oportunidade de negócio, parceria, produto white-label.
      Formato: 4-5 frases + pergunta para engajamento.
      Tom: profissional, oportunidade, parceria.
      Inclua: benefícios, facilidade, suporte, comissões.
      Exemplo: "Para influenciadoras do nicho materno: imagine ter um produto que se vende sozinho? O Baby Diary é um app completo para mães documentarem cada momento especial. Produto 100% pronto, comissões recorrentes e suporte total. Já pensou em ter sua própria versão white-label? Como você aproveitaria essa oportunidade? Compartilhe nos comentários!"`,
      
      tiktok: `Crie uma descrição para TikTok sobre oportunidade de negócio para influenciadoras.
      Foco: renda recorrente, produto pronto, nicho materno.
      Formato: 1-2 frases + 4 hashtags trending.
      Tom: dinâmico, oportunidade, viral.
      Exemplo: "Oportunidade para influenciadoras! Produto que se vende sozinho no nicho materno 💰👶 #Empreendedorismo #Maternidade #RendaRecorrente #Oportunidade"`,
      
      youtube: `Crie uma descrição para YouTube sobre oportunidade de negócio para influenciadoras.
      Foco: renda recorrente, produto pronto, nicho materno.
      Formato: 2-3 frases + 5 hashtags estratégicas.
      Tom: profissional, oportunidade, parceria.
      Exemplo: "Transforme sua audiência em renda recorrente! O Baby Diary é o app definitivo para mães que querem documentar cada momento especial. Produto 100% pronto, comissões recorrentes e suporte completo. #BabyDiary #Empreendedorismo #Maternidade #RendaRecorrente #WhiteLabel"`,
      
      email: `Crie um email para influenciadoras sobre o Baby Diary SaaS white-label.
      Foco: oportunidade de negócio, comissões recorrentes, produto pronto.
      Formato: 3-4 parágrafos curtos.
      Tom: profissional, oportunidade, parceria.
      Inclua: mercado, produto, benefícios financeiros, facilidade, suporte.
      Exemplo: "Olá [Nome], Como influenciadora do nicho materno, você sabe que as mães são ávidas por produtos que facilitem suas vidas e preservem memórias preciosas. O mercado materno brasileiro movimenta mais de R$ 50 bilhões anualmente. O Baby Diary é um SaaS completo que captura essa oportunidade. Como parceira, você recebe comissões recorrentes de até 40% em cada assinatura. O produto é 100% pronto, com suporte técnico incluído. Quer conhecer os detalhes? Agende uma conversa e receba uma proposta personalizada."`
    },
    
    parceiro: {
      instagram: `Crie um post para atrair parceiros/investidores para o Baby Diary SaaS.
      Foco: oportunidade de negócio, mercado em crescimento, produto pronto.
      Formato: 3-4 frases + 5 hashtags estratégicas.
      Tom: profissional, oportunidade, investimento.
      Inclua: mercado, escalabilidade, lucro.
      Exemplo: "Construa seu império digital materno! O Baby Diary é um SaaS completo para mães documentarem momentos especiais. Mercado de 2.5 milhões de bebês/ano, margem de até 90% e automação total. Produto pronto para vender! Quer ser parceiro? 💼📈 #SaaS #Empreendedorismo #Maternidade #Investimento #WhiteLabel"`,
      
      facebook: `Crie um post para Facebook sobre oportunidade de parceria no Baby Diary.
      Foco: negócio lucrativo, mercado em crescimento, produto white-label.
      Formato: 4-5 frases + call-to-action.
      Tom: profissional, oportunidade, parceria.
      Inclua: dados do mercado, benefícios, contato.
      Exemplo: "Para empreendedores e investidores: o mercado materno movimenta bilhões anualmente. O Baby Diary é um SaaS completo que conecta tecnologia, emoção e negócios. Produto 100% pronto, automação total e escalabilidade infinita. Margem de até 90% e receita recorrente garantida. Quer conhecer os detalhes? Entre em contato e receba uma proposta personalizada!"`,
      
      tiktok: `Crie uma descrição para TikTok sobre oportunidade de parceria no Baby Diary.
      Foco: negócio lucrativo, mercado materno, produto white-label.
      Formato: 1-2 frases + 4 hashtags trending.
      Tom: dinâmico, oportunidade, viral.
      Exemplo: "Oportunidade de negócio no nicho materno! 💰👶 #Empreendedorismo #Maternidade #SaaS #Oportunidade"`,
      
      youtube: `Crie uma descrição para YouTube sobre oportunidade de parceria no Baby Diary.
      Foco: negócio lucrativo, mercado em crescimento, produto white-label.
      Formato: 2-3 frases + 5 hashtags estratégicas.
      Tom: profissional, oportunidade, investimento.
      Exemplo: "Construa seu império digital materno! O Baby Diary é um SaaS completo para mães documentarem momentos especiais. Mercado de 2.5 milhões de bebês/ano, margem de até 90% e automação total. #SaaS #Empreendedorismo #Maternidade #Investimento #WhiteLabel"`,
      
      email: `Crie um email de prospecção para potenciais parceiros do Baby Diary.
      Foco: oportunidade de negócio, dados do mercado, produto pronto.
      Formato: 3-4 parágrafos curtos.
      Tom: profissional, direto, oportunidade.
      Inclua: problema, solução, mercado, benefícios, call-to-action.
      Exemplo: "Olá [Nome], O mercado materno brasileiro movimenta mais de R$ 50 bilhões anualmente, com 2.5 milhões de novos bebês por ano. As mães passam 4+ horas por dia no celular e naturalmente compartilham experiências. O Baby Diary é um SaaS completo que captura essa oportunidade: um app para mães documentarem cada momento especial do bebê. Produto 100% pronto, automação total, margem de até 90% e receita recorrente. Quer conhecer os detalhes? Agende uma conversa e receba uma proposta personalizada."`
    },
    
    mae: {
      instagram: `Crie um post para mães sobre o Baby Diary app.
      Foco: benefícios emocionais, funcionalidades, valor.
      Formato: 3-4 frases + 5 hashtags relevantes.
      Tom: carinhoso, emocional, benefício.
      Inclua: memórias, tranquilidade, funcionalidades.
      Exemplo: "Nunca mais perca um momento especial do seu bebê! O Baby Diary captura cada sorriso, cada conquista, cada marco importante. Organize fotos, acompanhe desenvolvimento e compartilhe com a família em tempo real. Porque cada momento é único e merece ser eternizado! 👶💕 #BabyDiary #Maternidade #Memórias #DesenvolvimentoInfantil #Família"`,
      
      facebook: `Crie um post para Facebook direcionado a mães sobre o Baby Diary.
      Foco: benefícios práticos e emocionais.
      Formato: 4-5 frases + pergunta para engajamento.
      Tom: acolhedor, benefício, comunidade.
      Inclua: funcionalidades, benefícios, comunidade.
      Exemplo: "Mães, vocês sabem como é difícil organizar todas as fotos e memórias do bebê? O Baby Diary resolve isso! Diário digital, marcos de desenvolvimento, calendário médico, gamificação e muito mais. Tudo em um só lugar, organizado e compartilhável. Como vocês organizam as memórias dos seus pequenos? Compartilhem nos comentários!"`,
      
      tiktok: `Crie uma descrição para TikTok sobre o Baby Diary para mães.
      Foco: benefício rápido, funcionalidade principal.
      Formato: 1-2 frases + 4 hashtags trending.
      Tom: divertido, benefício, viral.
      Exemplo: "App que organiza todas as memórias do bebê! 👶✨ #BabyDiary #Maternidade #Organização #App"`,
      
      youtube: `Crie uma descrição para YouTube sobre o Baby Diary para mães.
      Foco: benefícios emocionais, funcionalidades, valor.
      Formato: 2-3 frases + 5 hashtags relevantes.
      Tom: carinhoso, emocional, benefício.
      Exemplo: "Nunca mais perca um momento especial do seu bebê! O Baby Diary captura cada sorriso, cada conquista, cada marco importante. Organize fotos, acompanhe desenvolvimento e compartilhe com a família em tempo real. #BabyDiary #Maternidade #Memórias #DesenvolvimentoInfantil #Família"`,
      
      email: `Crie um email para mães sobre o Baby Diary app.
      Foco: benefícios emocionais e práticos, valor.
      Formato: 3-4 parágrafos curtos.
      Tom: carinhoso, benefício, valor.
      Inclua: problema, solução, benefícios, valor, call-to-action.
      Exemplo: "Olá [Nome], Você já se perguntou quantos momentos especiais do seu bebê você pode estar perdendo? Entre o sono, as tarefas domésticas e o trabalho, é fácil deixar passar pequenas conquistas que nunca mais voltarão. O Baby Diary é a solução: um app completo que captura, organiza e eterniza cada momento especial do seu bebê. Diário digital, marcos de desenvolvimento, gamificação e muito mais. Por apenas R$ 47/mês, você garante que cada sorriso, cada conquista, cada marco importante seja preservado para sempre. Clique aqui e garanta sua vaga agora!"`
    },
    
    vendas: {
      instagram: `Crie um post de vendas para o Baby Diary.
      Foco: urgência, benefícios, call-to-action.
      Formato: 3-4 frases + 5 hashtags + CTA.
      Tom: urgente, benefício, vendas.
      Inclua: oferta, benefícios, urgência.
      Exemplo: "🚨 OFERTA LIMITADA! O Baby Diary - o app definitivo para mães documentarem cada momento especial. Diário digital, marcos de desenvolvimento, gamificação e muito mais! Por apenas R$ 47/mês. Garanta sua vaga antes que acabe! Link na bio 👆 #BabyDiary #Oferta #Maternidade #App #Promoção"`,
      
      facebook: `Crie um post de vendas para Facebook sobre o Baby Diary.
      Foco: benefícios, oferta, call-to-action.
      Formato: 4-5 frases + CTA.
      Tom: vendas, benefício, urgência.
      Inclua: problema, solução, oferta, CTA.
      Exemplo: "Mães, vocês sabem que o tempo passa rápido demais, não é? Um dia o bebê está dando o primeiro sorriso, no outro já está dando os primeiros passos. O Baby Diary garante que nenhum momento especial seja perdido! Diário digital, marcos de desenvolvimento, gamificação e muito mais. Por apenas R$ 47/mês. Clique aqui e garanta sua vaga agora!"`,
      
      tiktok: `Crie uma descrição para TikTok de vendas do Baby Diary.
      Foco: urgência, benefícios principais, call-to-action.
      Formato: 1-2 frases + 4 hashtags trending.
      Tom: urgente, benefício, viral.
      Exemplo: "Oferta limitada! App completo para mães por R$ 47/mês! 👶💰 #BabyDiary #Oferta #Maternidade #Promoção"`,
      
      youtube: `Crie uma descrição para YouTube de vendas do Baby Diary.
      Foco: urgência, benefícios, call-to-action.
      Formato: 2-3 frases + 5 hashtags + CTA.
      Tom: urgente, benefício, vendas.
      Exemplo: "🚨 OFERTA LIMITADA! O Baby Diary - o app definitivo para mães documentarem cada momento especial. Diário digital, marcos de desenvolvimento, gamificação e muito mais! Por apenas R$ 47/mês. Garanta sua vaga antes que acabe! #BabyDiary #Oferta #Maternidade #App #Promoção"`,
      
      email: `Crie um email de vendas para o Baby Diary.
      Foco: problema, solução, benefícios, oferta.
      Formato: 4-5 parágrafos curtos.
      Tom: vendas, benefício, urgência.
      Inclua: problema, solução, benefícios, oferta, CTA.
      Exemplo: "Olá [Nome], Você já se perguntou quantos momentos especiais do seu bebê você pode estar perdendo? Entre o sono, as tarefas domésticas e o trabalho, é fácil deixar passar pequenas conquistas que nunca mais voltarão. O Baby Diary é a solução: um app completo que captura, organiza e eterniza cada momento especial do seu bebê. Diário digital, marcos de desenvolvimento, gamificação e muito mais. Por apenas R$ 47/mês. Clique aqui e garanta sua vaga agora!"`
    }
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompts[tipo][plataforma] }] }]
  });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Conteúdo não gerado.';
}

export async function generateVideoMarketingScript(
  publico: 'influenciadoras' | 'parceiros' | 'maes' | 'vendas',
  duracao: 'curto' | 'medio' | 'longo' = 'medio',
  apiKey: string
): Promise<string> {
  const prompts = {
    influenciadoras: {
      curto: `Crie um roteiro para vídeo curto (30-60s) para influenciadoras sobre o Baby Diary SaaS white-label.
      Foco: oportunidade de negócio, comissões recorrentes, produto pronto.
      Divida em 3-4 cenas curtas, máximo 15 palavras cada.
      Tom: empreendedor, motivacional, oportunidade.
      Inclua: benefícios financeiros, facilidade, suporte.
      Exemplo: "Transforme sua audiência em renda! Baby Diary: app completo para mães. Produto pronto, comissões recorrentes. Suporte total incluído."`,
      
      medio: `Crie um roteiro para vídeo médio (2-3 min) para influenciadoras sobre o Baby Diary.
      Foco: oportunidade de negócio, mercado, benefícios.
      Divida em 5-6 cenas, máximo 20 palavras cada.
      Tom: profissional, oportunidade, parceria.
      Inclua: mercado materno, produto white-label, comissões, suporte.
      Exemplo: "Mercado materno: 2.5 milhões de bebês por ano. Baby Diary: app completo para mães documentarem momentos. Produto 100% pronto para vender. Comissões recorrentes garantidas. Suporte técnico incluído. Transforme sua audiência em renda!"`,
      
      longo: `Crie um roteiro para vídeo longo (5-7 min) para influenciadoras sobre o Baby Diary.
      Foco: oportunidade completa, mercado, produto, benefícios, implementação.
      Divida em 8-10 cenas, máximo 25 palavras cada.
      Tom: detalhado, profissional, oportunidade.
      Inclua: mercado, produto, funcionalidades, comissões, suporte, implementação.
      Exemplo: "Mercado materno brasileiro: 2.5 milhões de bebês por ano, poder aquisitivo alto. Baby Diary: app completo com IA, gamificação, diário digital. Produto white-label 100% pronto. Comissões recorrentes de até 40%. Suporte técnico e marketing incluídos. Implementação em 24 horas. Transforme sua audiência em império digital!"`
    },
    
    parceiros: {
      curto: `Crie um roteiro para vídeo curto (30-60s) para parceiros/investidores sobre o Baby Diary.
      Foco: oportunidade de negócio, mercado, lucro.
      Divida em 3-4 cenas curtas, máximo 15 palavras cada.
      Tom: profissional, oportunidade, investimento.
      Inclua: mercado, produto, lucro.
      Exemplo: "Mercado materno: R$ 50 bilhões anuais. Baby Diary: SaaS completo para mães. Margem de até 90%. Produto pronto para vender."`,
      
      medio: `Crie um roteiro para vídeo médio (2-3 min) para parceiros sobre o Baby Diary.
      Foco: oportunidade de negócio, dados do mercado, produto.
      Divida em 5-6 cenas, máximo 20 palavras cada.
      Tom: profissional, dados, oportunidade.
      Inclua: mercado, produto, funcionalidades, lucro, escalabilidade.
      Exemplo: "Mercado materno brasileiro: 2.5 milhões de bebês por ano. Baby Diary: SaaS com IA, gamificação, diário digital. Margem de até 90%, receita recorrente. Automação total, escalabilidade infinita. Produto 100% pronto para vender!"`,
      
      longo: `Crie um roteiro para vídeo longo (5-7 min) para parceiros sobre o Baby Diary.
      Foco: oportunidade completa, mercado, produto, números, implementação.
      Divida em 8-10 cenas, máximo 25 palavras cada.
      Tom: detalhado, profissional, dados.
      Inclua: mercado, produto, funcionalidades, números, implementação, suporte.
      Exemplo: "Mercado materno brasileiro: 2.5 milhões de bebês por ano, R$ 50 bilhões movimentados. Baby Diary: SaaS completo com IA personalizada, gamificação avançada, diário digital. Margem de até 90%, receita recorrente mensal. Automação total, escalabilidade infinita. Produto white-label 100% pronto. Implementação em 24 horas, suporte completo incluído."`
    },
    
    maes: {
      curto: `Crie um roteiro para vídeo curto (30-60s) para mães sobre o Baby Diary app.
      Foco: benefícios emocionais, funcionalidades principais.
      Divida em 3-4 cenas curtas, máximo 15 palavras cada.
      Tom: carinhoso, emocional, benefício.
      Inclua: memórias, funcionalidades, valor.
      Exemplo: "Nunca perca um momento especial! Baby Diary: diário digital para seu bebê. Organize fotos, marcos, desenvolvimento. Compartilhe com a família."`,
      
      medio: `Crie um roteiro para vídeo médio (2-3 min) para mães sobre o Baby Diary.
      Foco: benefícios práticos e emocionais, funcionalidades.
      Divida em 5-6 cenas, máximo 20 palavras cada.
      Tom: acolhedor, benefício, funcional.
      Inclua: problema, solução, funcionalidades, benefícios.
      Exemplo: "Organizar memórias do bebê é difícil? Baby Diary resolve! Diário digital, marcos de desenvolvimento, calendário médico. Gamificação torna divertido. Compartilhamento familiar integrado. Nunca mais perca um momento especial!"`,
      
      longo: `Crie um roteiro para vídeo longo (5-7 min) para mães sobre o Baby Diary.
      Foco: benefícios completos, funcionalidades detalhadas, valor.
      Divida em 8-10 cenas, máximo 25 palavras cada.
      Tom: detalhado, acolhedor, benefício.
      Inclua: problema, solução, funcionalidades, benefícios, comunidade.
      Exemplo: "Mães, vocês sabem como é difícil organizar todas as memórias do bebê? Baby Diary é a solução completa! Diário digital com IA, marcos de desenvolvimento, calendário médico integrado. Gamificação torna divertido e motivador. Compartilhamento familiar em tempo real. Comunidade de mães integrada. Exportação de memórias em PDF. Nunca mais perca um momento especial do seu bebê!"`
    },
    
    vendas: {
      curto: `Crie um roteiro para vídeo curto (30-60s) de vendas do Baby Diary.
      Foco: urgência, benefícios principais, call-to-action.
      Divida em 3-4 cenas curtas, máximo 15 palavras cada.
      Tom: urgente, benefício, vendas.
      Inclua: oferta, benefícios, CTA.
      Exemplo: "Oferta limitada! Baby Diary: app completo para mães. Por apenas R$ 47/mês. Garanta sua vaga agora! Link na descrição."`,
      
      medio: `Crie um roteiro para vídeo médio (2-3 min) de vendas do Baby Diary.
      Foco: problema, solução, benefícios, oferta, call-to-action.
      Divida em 5-6 cenas, máximo 20 palavras cada.
      Tom: vendas, benefício, urgência.
      Inclua: problema, solução, benefícios, oferta, CTA.
      Exemplo: "Mães, vocês sabem que o tempo passa rápido? Baby Diary captura cada momento especial. Diário digital, marcos, gamificação. Por apenas R$ 47/mês. Oferta limitada! Clique no link e garanta sua vaga!"`,
      
      longo: `Crie um roteiro para vídeo longo (5-7 min) de vendas do Baby Diary.
      Foco: problema detalhado, solução completa, benefícios, oferta, call-to-action.
      Divida em 8-10 cenas, máximo 25 palavras cada.
      Tom: vendas detalhado, benefício, urgência.
      Inclua: problema, solução, funcionalidades, benefícios, oferta, garantia, CTA.
      Exemplo: "Mães, vocês já se perguntaram quantos momentos especiais estão perdendo? Entre o sono e as tarefas, é fácil deixar passar conquistas. Baby Diary resolve isso! Diário digital com IA, marcos de desenvolvimento, gamificação. Compartilhamento familiar, exportação PDF. Por apenas R$ 47/mês. Garantia de 30 dias. Oferta limitada! Clique no link e garanta sua vaga agora!"`
    }
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompts[publico][duracao] }] }]
  });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Roteiro não gerado.';
}

export async function generateArgumentoVenda(
  tipo: 'influenciadora' | 'parceiro' | 'mae',
  apiKey: string
): Promise<string> {
  const prompts = {
    influenciadora: `Crie um argumento de venda para influenciadoras sobre o Baby Diary SaaS white-label.
    Foco: oportunidade de negócio, comissões recorrentes, produto pronto.
    Formato: 4-5 parágrafos curtos.
    Tom: empreendedor, oportunidade, parceria.
    Inclua: mercado, produto, benefícios financeiros, facilidade, suporte.
    Estrutura: Problema (mercado), Solução (produto), Benefícios (comissões), Facilidade (pronto), Call-to-action.
    Exemplo: "Como influenciadora do nicho materno, você sabe que as mães são ávidas por produtos que facilitem suas vidas e preservem memórias preciosas. O mercado materno brasileiro movimenta mais de R$ 50 bilhões anualmente, com 2.5 milhões de novos bebês por ano. O Baby Diary é um SaaS completo que captura essa oportunidade: um app para mães documentarem cada momento especial do bebê. Como parceira, você recebe comissões recorrentes de até 40% em cada assinatura, sem precisar se preocupar com desenvolvimento, suporte ou infraestrutura. O produto é 100% pronto, com suporte técnico incluído e implementação em 24 horas. Transforme sua audiência em uma fonte de renda recorrente e crescente!"`,
    
    parceiro: `Crie um argumento de venda para parceiros/investidores sobre o Baby Diary SaaS.
    Foco: oportunidade de negócio, mercado em crescimento, produto white-label.
    Formato: 4-5 parágrafos curtos.
    Tom: profissional, oportunidade, investimento.
    Inclua: mercado, produto, números, escalabilidade, lucro.
    Estrutura: Mercado (oportunidade), Produto (solução), Números (lucro), Escalabilidade (crescimento), Call-to-action.
    Exemplo: "O mercado materno brasileiro representa uma oportunidade única: 2.5 milhões de novos bebês por ano, com poder aquisitivo alto e tempo significativo no celular. As mães naturalmente compartilham experiências e são influenciadoras orgânicas. O Baby Diary é um SaaS completo que conecta tecnologia, emoção e negócios: um app para mães documentarem cada momento especial do bebê. Com margem de até 90%, receita recorrente mensal e automação total, o produto oferece escalabilidade infinita. Cada novo usuário aumenta a receita sem aumentar o trabalho. O produto é 100% pronto, com infraestrutura robusta e suporte completo. Construa seu império digital materno com zero risco e máximo potencial de retorno!"`,
    
    mae: `Crie um argumento de venda para mães sobre o Baby Diary app.
    Foco: benefícios emocionais e práticos, valor, urgência.
    Formato: 4-5 parágrafos curtos.
    Tom: carinhoso, benefício, urgência.
    Inclua: problema, solução, benefícios, valor, call-to-action.
    Estrutura: Problema (tempo passa), Solução (app), Benefícios (funcionalidades), Valor (preço), Call-to-action.
    Exemplo: "Mães, vocês sabem que o tempo passa rápido demais, não é? Um dia o bebê está dando o primeiro sorriso, no outro já está dando os primeiros passos. Entre o sono, as tarefas domésticas e o trabalho, é fácil deixar passar pequenas conquistas que nunca mais voltarão. O Baby Diary é a solução: um app completo que captura, organiza e eterniza cada momento especial do seu bebê. Com diário digital, marcos de desenvolvimento, gamificação e compartilhamento familiar, você nunca mais perderá um momento precioso. Por apenas R$ 47/mês, você garante que cada sorriso, cada conquista, cada marco importante seja preservado para sempre. O tempo não volta, mas as memórias ficam. Garanta sua vaga agora e comece a documentar os momentos especiais do seu bebê!"`
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompts[tipo] }] }]
  });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Argumento não gerado.';
}
