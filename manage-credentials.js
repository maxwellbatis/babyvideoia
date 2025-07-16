const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function showCredentials() {
  console.log('\n📋 Credenciais atuais:\n');
  
  const credentials = await prisma.credential.findMany();
  
  if (credentials.length === 0) {
    console.log('❌ Nenhuma credencial encontrada no banco.');
    return;
  }
  
  credentials.forEach(cred => {
    const isTest = cred.value.includes('sua_chave') || cred.value.includes('seu_') || cred.value.includes('https://seu_');
    const status = isTest ? '❌ TESTE' : '✅ REAL';
    console.log(`${status} ${cred.name}: ${cred.value.substring(0, 30)}...`);
  });
}

async function updateCredential() {
  console.log('\n🔧 Atualizar credencial:\n');
  
  const credentials = await prisma.credential.findMany();
  
  if (credentials.length === 0) {
    console.log('❌ Nenhuma credencial encontrada.');
    return;
  }
  
  console.log('Credenciais disponíveis:');
  credentials.forEach((cred, index) => {
    console.log(`${index + 1}. ${cred.name}`);
  });
  
  const choice = await question('\nEscolha o número da credencial (ou 0 para cancelar): ');
  const choiceNum = parseInt(choice);
  
  if (choiceNum === 0 || choiceNum > credentials.length) {
    console.log('❌ Operação cancelada.');
    return;
  }
  
  const selectedCred = credentials[choiceNum - 1];
  const newValue = await question(`\nNovo valor para ${selectedCred.name}: `);
  
  if (newValue.trim()) {
    await prisma.credential.update({
      where: { id: selectedCred.id },
      data: { value: newValue.trim() }
    });
    console.log(`✅ ${selectedCred.name} atualizada com sucesso!`);
  } else {
    console.log('❌ Valor não pode estar vazio.');
  }
}

async function insertRealCredentials() {
  console.log('\n🚀 Inserir credenciais reais:\n');
  
  const credentials = [
    { name: 'GEMINI_KEY', prompt: 'Chave da API do Gemini: ' },
    { name: 'GROQ_API_KEY', prompt: 'Chave da API do Groq: ' },
    { name: 'ELEVENLABS_API_KEY', prompt: 'Chave da API do ElevenLabs: ' },
    { name: 'CLOUDINARY_CLOUD_NAME', prompt: 'Cloud Name do Cloudinary: ' },
    { name: 'CLOUDINARY_API_KEY', prompt: 'API Key do Cloudinary: ' },
    { name: 'CLOUDINARY_API_SECRET', prompt: 'API Secret do Cloudinary: ' },
    { name: 'FREEPIK_API_KEY', prompt: 'Chave da API do Freepik: ' },
    { name: 'COLAB_SD_URL', prompt: 'URL do Colab Stable Diffusion: ' }
  ];
  
  for (const cred of credentials) {
    const value = await question(cred.prompt);
    if (value.trim()) {
      await prisma.credential.upsert({
        where: { name: cred.name },
        update: { value: value.trim() },
        create: { name: cred.name, value: value.trim() }
      });
      console.log(`✅ ${cred.name} salva!`);
    } else {
      console.log(`⚠️ ${cred.name} ignorada (valor vazio).`);
    }
  }
  
  console.log('\n✅ Todas as credenciais foram processadas!');
}

async function testConnections() {
  console.log('\n🧪 Testando conexões...\n');
  
  const credentials = await prisma.credential.findMany();
  const credMap = credentials.reduce((acc, cred) => {
    acc[cred.name] = cred.value;
    return acc;
  }, {});
  
  const tests = [
    { name: 'Gemini', key: credMap.GEMINI_KEY, test: (key) => key && !key.includes('sua_chave') },
    { name: 'Groq', key: credMap.GROQ_API_KEY, test: (key) => key && !key.includes('sua_chave') },
    { name: 'ElevenLabs', key: credMap.ELEVENLABS_API_KEY, test: (key) => key && !key.includes('sua_chave') },
    { name: 'Cloudinary', key: credMap.CLOUDINARY_CLOUD_NAME, test: (key) => key && !key.includes('seu_cloud') },
    { name: 'Freepik', key: credMap.FREEPIK_API_KEY, test: (key) => key && !key.includes('sua_chave') },
    { name: 'Colab SD', key: credMap.COLAB_SD_URL, test: (key) => key && !key.includes('seu_colab') }
  ];
  
  tests.forEach(test => {
    const status = test.test(test.key) ? '✅ CONECTADO' : '❌ DESCONECTADO';
    console.log(`${status} ${test.name}`);
  });
}

async function main() {
  console.log('🔐 Gerenciador de Credenciais - BabyVideoIA\n');
  
  while (true) {
    console.log('\nEscolha uma opção:');
    console.log('1. Ver credenciais atuais');
    console.log('2. Atualizar credencial específica');
    console.log('3. Inserir credenciais reais');
    console.log('4. Testar conexões');
    console.log('5. Sair');
    
    const choice = await question('\nOpção: ');
    
    switch (choice) {
      case '1':
        await showCredentials();
        break;
      case '2':
        await updateCredential();
        break;
      case '3':
        await insertRealCredentials();
        break;
      case '4':
        await testConnections();
        break;
      case '5':
        console.log('\n👋 Até logo!');
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
        break;
      default:
        console.log('❌ Opção inválida.');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  showCredentials,
  updateCredential,
  insertRealCredentials,
  testConnections
}; 