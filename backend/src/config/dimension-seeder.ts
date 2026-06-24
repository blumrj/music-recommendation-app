import { PrismaClient } from '@prisma/client';
import { EMOTIONAL_DIMENSIONS } from './emotional-dimensions';

const prisma = new PrismaClient();

export async function seedDimensions(): Promise<void> {
  try {
    for (const dim of Object.values(EMOTIONAL_DIMENSIONS)) {
      await prisma.dimension.upsert({
        where: { name: dim.name },
        update: {
          label: dim.label,
          description: dim.description,
          leftLabel: dim.leftLabel,
          rightLabel: dim.rightLabel,
        },
        create: {
          name: dim.name,
          label: dim.label,
          description: dim.description,
          leftLabel: dim.leftLabel,
          rightLabel: dim.rightLabel,
        },
      });
    }
    console.log('✅ Dimensions seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding dimensions:', error);
    throw error;
  }
}
