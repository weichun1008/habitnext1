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
                let val = parts.slice(1).join('=').trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                process.env.POSTGRES_URL = val;
                console.log('Loaded POSTGRES_URL');
            }
        });
    }
} catch (err) {
    console.error('Error loading .env.local', err);
}

const prisma = new PrismaClient();

async function main() {
    // Helper ID from user report
    // "userId=cmiritq9s0000ovbdlevoappj" (assuming :1 was line num)
    // Testing the suspicious ID from user report
    const userId = 'cmiritq9s0000ovbdlevoappj:1';

    console.log(`Checking assignments for user: ${userId}`);

    try {
        const assignments = await prisma.assignment.findMany({
            where: { userId: userId },
            include: {
                template: true,
                expert: {
                    select: { name: true, title: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Success! Found ${assignments.length} assignments.`);
        assignments.forEach(a => console.log(` - Assignment ${a.id} (Template: ${a.template?.name})`));
    } catch (e) {
        console.error('CRITICAL ERROR in findMany:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
