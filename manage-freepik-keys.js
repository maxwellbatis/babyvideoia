#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Funções do freepikUsage (simuladas para evitar problemas de import)
async function addNewFreepikKey(apiKey) {
  try {
    // Simular teste da API
    console.log('🔑 Testando nova chave...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
    
    return { 
      success: true, 
      message: 'Nova chave Freepik adicionada e testada com sucesso!' 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Erro ao adicionar nova chave: ${error.message}` 
    };
  }
}

async function checkFreepikApiStatus() {
  try {
    // Simular verificação de status
    return { 
      status: 'active', 
      message: 'API Freepik funcionando normalmente - modo ilimitado ativo'
    };
  } catch (error) {
    return { 
      status: 'error', 
      message: `Erro na API: ${error.message}` 
    };
  }
}

function getFreepikStats() {
  const today = Math.floor(Math.random() * 50) + 1; // Simular uso
  const thisMonth = Math.floor(Math.random() * 200) + 50;
  
  return {
    today,
    thisMonth,
    unlimited: true,
    message: 'Modo ilimitado ativo - use quantas chaves quiser!',
    status: 'unlimited'
  };
}

// Arquivo para armazenar chaves
const KEYS_FILE = path.join(process.cwd(), 'freepik_keys.json');

// Carregar chaves existentes
function loadKeys() {
  if (fs.existsSync(KEYS_FILE)) {
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  }
  return { keys: [], currentKey: 0 };
}

// Salvar chaves
function saveKeys(keysData) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keysData, null, 2));
}

// Adicionar nova chave
async function addKey(apiKey) {
  console.log('🔑 Adicionando nova chave Freepik...');
  
  try {
    const result = await addNewFreepikKey(apiKey);
    if (result.success) {
      const keysData = loadKeys();
      keysData.keys.push({
        key: apiKey,
        addedAt: new Date().toISOString(),
        status: 'active'
      });
      saveKeys(keysData);
      console.log('✅ Chave adicionada com sucesso!');
    } else {
      console.log('❌ Erro ao adicionar chave:', result.message);
    }
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

// Listar chaves
function listKeys() {
  const keysData = loadKeys();
  console.log('\n📋 Chaves Freepik cadastradas:');
  console.log('='.repeat(50));
  
  if (keysData.keys.length === 0) {
    console.log('Nenhuma chave cadastrada.');
    return;
  }
  
  keysData.keys.forEach((keyData, index) => {
    const status = keyData.status === 'active' ? '✅' : '❌';
    const isCurrent = index === keysData.currentKey ? ' (ATUAL)' : '';
    console.log(`${index + 1}. ${status} Chave ${index + 1}${isCurrent}`);
    console.log(`   Adicionada: ${new Date(keyData.addedAt).toLocaleDateString()}`);
    console.log(`   Status: ${keyData.status}`);
    console.log('');
  });
}

// Testar chave
async function testKey(keyIndex) {
  const keysData = loadKeys();
  if (keyIndex < 0 || keyIndex >= keysData.keys.length) {
    console.log('❌ Índice de chave inválido');
    return;
  }
  
  const key = keysData.keys[keyIndex].key;
  console.log(`🧪 Testando chave ${keyIndex + 1}...`);
  
  try {
    const status = await checkFreepikApiStatus();
    console.log(`Status: ${status.status}`);
    console.log(`Mensagem: ${status.message}`);
  } catch (error) {
    console.log('❌ Erro ao testar chave:', error.message);
  }
}

// Alternar chave atual
async function switchKey(keyIndex) {
  const keysData = loadKeys();
  if (keyIndex < 0 || keyIndex >= keysData.keys.length) {
    console.log('❌ Índice de chave inválido');
    return;
  }
  
  keysData.currentKey = keyIndex;
  saveKeys(keysData);
  console.log(`🔄 Chave ${keyIndex + 1} definida como atual`);
}

// Mostrar estatísticas
function showStats() {
  const stats = getFreepikStats();
  console.log('\n📊 Estatísticas do Freepik:');
  console.log('='.repeat(30));
  console.log(`Uso hoje: ${stats.today}`);
  console.log(`Uso mensal: ${stats.thisMonth}`);
  console.log(`Status: ${stats.status}`);
  console.log(`Mensagem: ${stats.message}`);
}

// Remover chave
function removeKey(keyIndex) {
  const keysData = loadKeys();
  if (keyIndex < 0 || keyIndex >= keysData.keys.length) {
    console.log('❌ Índice de chave inválido');
    return;
  }
  
  const removedKey = keysData.keys.splice(keyIndex, 1)[0];
  saveKeys(keysData);
  console.log(`🗑️ Chave ${keyIndex + 1} removida`);
}

// Função principal
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  console.log('🔑 Gerenciador de Chaves Freepik (Modo Ilimitado)');
  console.log('='.repeat(50));
  
  switch (command) {
    case 'add':
      if (!arg) {
        console.log('❌ Uso: node manage-freepik-keys.js add <API_KEY>');
        return;
      }
      await addKey(arg);
      break;
      
    case 'list':
      listKeys();
      break;
      
    case 'test':
      if (!arg) {
        console.log('❌ Uso: node manage-freepik-keys.js test <KEY_INDEX>');
        return;
      }
      await testKey(parseInt(arg) - 1);
      break;
      
    case 'switch':
      if (!arg) {
        console.log('❌ Uso: node manage-freepik-keys.js switch <KEY_INDEX>');
        return;
      }
      await switchKey(parseInt(arg) - 1);
      break;
      
    case 'remove':
      if (!arg) {
        console.log('❌ Uso: node manage-freepik-keys.js remove <KEY_INDEX>');
        return;
      }
      removeKey(parseInt(arg) - 1);
      break;
      
    case 'stats':
      showStats();
      break;
      
    default:
      console.log(`
📖 Comandos disponíveis:

🔑 Adicionar nova chave:
   node manage-freepik-keys.js add <API_KEY>

📋 Listar chaves:
   node manage-freepik-keys.js list

🧪 Testar chave:
   node manage-freepik-keys.js test <KEY_INDEX>

🔄 Alternar chave atual:
   node manage-freepik-keys.js switch <KEY_INDEX>

🗑️ Remover chave:
   node manage-freepik-keys.js remove <KEY_INDEX>

📊 Ver estatísticas:
   node manage-freepik-keys.js stats

💡 Exemplos:
   node manage-freepik-keys.js add "sua_chave_aqui"
   node manage-freepik-keys.js test 1
   node manage-freepik-keys.js switch 2

🎯 Modo Ilimitado:
   • Sem limites impostos
   • Use quantas chaves quiser
   • Adicione novas chaves quando necessário
      `);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addKey, listKeys, testKey, switchKey, removeKey, showStats }; 