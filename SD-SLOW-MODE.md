# Modo Lento do Stable Diffusion - BabyVideoIA

## 🐌 O que é o Modo Lento?

O **Modo Lento** do Stable Diffusion foi implementado para dar mais controle sobre a geração de imagens, permitindo:

- **Melhor qualidade** de imagem
- **Mais tempo** para o Colab processar
- **Logs detalhados** do processo
- **Controle de velocidade** granular
- **Delays automáticos** para não sobrecarregar

## ⚙️ Configurações do Modo Lento

### Parâmetros Ajustados:

| Parâmetro | Normal | Lento | Efeito |
|-----------|--------|-------|--------|
| **Steps** | 60 | 100 | Mais steps = melhor qualidade |
| **CFG Scale** | 7 | 8 | Maior CFG = mais preciso |
| **Sampler** | Euler a | DPM++ 2M Karras | Sampler mais lento mas melhor |
| **Denoising** | 0.75 | 0.7 | Menor denoising = mais lento |
| **Timeout** | 2 min | 5 min | Mais tempo para processar |
| **Delay** | 0s | 3s + 2s | Delays para estabilizar |

### Configurações de Velocidade Disponíveis:

1. **Ultra Rápido** (20 steps, 1 min)
2. **Rápido** (40 steps, 2 min)
3. **Normal** (60 steps, 3 min)
4. **Lento** (80 steps, 4 min)
5. **Ultra Lento** (100 steps, 5 min)

## 🚀 Como Usar

### 1. **No Orquestrador (Automático)**
O modo lento já está ativado automaticamente quando `useStableDiffusion: true`:

```typescript
const imgPath = await gerarImagemColabSD(prompt, outputPath, { 
  resolution: 'vertical',
  slowMode: true // Ativado automaticamente
});
```

### 2. **Teste Individual**
```bash
# Teste completo de velocidade
node sd-speed-control.js

# Geração única
node sd-speed-control.js single "mãe com bebê" slow

# Com nome específico
node sd-speed-control.js single "família feliz" ultra_slow "familia.png"
```

### 3. **Teste do Modo Lento**
```bash
# Teste específico do modo lento
node test-sd-slow.js
```

## 📊 Logs Detalhados

O modo lento fornece logs detalhados:

```
🔄 Traduzindo prompt para inglês: "mãe sorrindo com bebê no colo, ambiente acolhedor..."
✅ Tradução concluída: "mother smiling with baby in arms, welcoming environment..."
🎨 Configurações SD: 100 steps, CFG 8, 576x1024
🐌 Modo lento ativado - aguarde mais tempo para melhor qualidade
⏳ Aguardando 3 segundos para estabilizar o Colab...
🚀 Enviando requisição para Colab: https://seu-colab.com/sdapi/v1/txt2img
⏱️ Tempo de geração: 245s
✅ Imagem 576x1024 salva em output/test.png (248KB)
⏳ Aguardando 2 segundos antes da próxima geração...
```

## 🎯 Vantagens do Modo Lento

### ✅ **Qualidade Superior**
- Mais steps = mais detalhes
- Sampler melhor = menos artefatos
- CFG maior = mais fidelidade ao prompt

### ✅ **Estabilidade**
- Delays evitam sobrecarga
- Timeout maior = menos timeouts
- Logs detalhados = melhor debug

### ✅ **Controle**
- Configurações granulares
- Testes de velocidade
- Monitoramento de tempo

## 🔧 Configuração do Colab

Para usar o modo lento, certifique-se de que seu Colab está configurado:

1. **Modelo Realistic** carregado
2. **VAE** configurado
3. **Samplers** disponíveis (DPM++ 2M Karras)
4. **Memória** suficiente (8GB+)

## 📈 Comparação de Tempos

| Modo | Steps | Tempo Estimado | Qualidade |
|------|-------|----------------|-----------|
| Ultra Rápido | 20 | ~30s | Básica |
| Rápido | 40 | ~60s | Boa |
| Normal | 60 | ~90s | Muito Boa |
| Lento | 80 | ~120s | Excelente |
| Ultra Lento | 100 | ~180s | Premium |

## 🛠️ Troubleshooting

### Problema: Timeout
```
❌ Erro: timeout of 300000ms exceeded
```
**Solução:** Aumentar timeout ou usar modo mais rápido

### Problema: Colab Instável
```
❌ Erro: connection refused
```
**Solução:** Aguardar mais tempo entre gerações

### Problema: Imagem Ruim
```
❌ Imagem com artefatos ou distorções
```
**Solução:** Usar modo mais lento ou ajustar negative prompt

## 📝 Exemplos de Uso

### Geração com Qualidade Premium:
```bash
node sd-speed-control.js single "mãe sorrindo com bebê no colo, ambiente acolhedor, luz suave, alta qualidade, fotografia profissional" ultra_slow "mae_bebe_premium.png"
```

### Teste de Velocidade:
```bash
node sd-speed-control.js
```

### Geração Rápida para Teste:
```bash
node sd-speed-control.js single "mãe com bebê" ultra_fast "teste_rapido.png"
```

## 🎉 Resultado

Com o modo lento, você terá:
- ✅ **Imagens de qualidade superior**
- ✅ **Processo controlado e estável**
- ✅ **Logs detalhados para debug**
- ✅ **Flexibilidade de configuração**
- ✅ **Menos erros e timeouts**

O sistema agora está otimizado para gerar imagens de alta qualidade de forma controlada e confiável! 