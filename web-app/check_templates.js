const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Manually load env
try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2 && parts[0].trim() === 'POSTGRES_URL') {
                // Handle standard format and potential quotes
                let val = parts.slice(1).join('=').trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                process.env.POSTGRES_URL = val;
                console.log('Loaded POSTGRES_URL from .env.local');
            }
        });
    }
} catch (err) {
    console.error('Error loading .env.local', err);
}

const prisma = new PrismaClient();

async function main() {
    console.log('--- 1. Checking Database directly ---');
    try {
        const templates = await prisma.template.findMany({
            where: { isPublic: true },
            select: { id: true, name: true, isPublic: true, expertId: true }
        });
        console.log(`Found ${templates.length} public templates in DB:`);
        templates.forEach(t => console.log(` - [${t.id}] ${t.name} (Public: ${t.isPublic})`));

        if (templates.length === 0) {
            console.log('WARN: No public templates found in DB. Checking ALL templates...');
            const all = await prisma.template.findMany({ select: { id: true, name: true, isPublic: true } });
            console.log(`Total templates: ${all.length}`);
            all.forEach(t => console.log(`   - ${t.name} isPublic=${t.isPublic}`));
        }

    } catch (e) {
        console.error('DB Error:', e);
    }

    console.log('\n--- 2. Checking API (Simulation) ---');
    try {
        // Simulate what the API does
        const templatesRaw = await prisma.template.findMany({
            where: { isPublic: true },
            include: {
                expert: {
                    select: { name: true, title: true, avatar: true }
                },
                _count: {
                    select: { assignments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`API Logic found ${templatesRaw.length} items`);
    } catch (e) {
        console.error('API Logic Error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
