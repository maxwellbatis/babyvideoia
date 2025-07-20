import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const credCache: Record<string, string> = {};

export async function getCredential(name: string, forceRefresh: boolean = false): Promise<string | undefined> {
  if (!forceRefresh && credCache[name]) return credCache[name];
  const cred = await prisma.credential.findUnique({ where: { name } });
  if (cred) credCache[name] = cred.value;
  return cred?.value;
}

export function clearCredentialCache(name?: string) {
  if (name) {
    if (credCache[name]) delete credCache[name];
  } else {
    Object.keys(credCache).forEach(k => delete credCache[k]);
  }
}

// Função para forçar atualização de uma credencial específica
export async function refreshCredential(name: string): Promise<string | undefined> {
  delete credCache[name];
  return await getCredential(name, true);
} 