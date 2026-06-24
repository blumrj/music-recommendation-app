"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDimensions = seedDimensions;
const client_1 = require("@prisma/client");
const emotional_dimensions_1 = require("./emotional-dimensions");
const prisma = new client_1.PrismaClient();
async function seedDimensions() {
    try {
        for (const dim of Object.values(emotional_dimensions_1.EMOTIONAL_DIMENSIONS)) {
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
    }
    catch (error) {
        console.error('❌ Error seeding dimensions:', error);
        throw error;
    }
}
//# sourceMappingURL=dimension-seeder.js.map