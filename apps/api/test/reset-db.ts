import type { PrismaService } from '../src/prisma/prisma.service';

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
