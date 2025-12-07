const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
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
            }
        });
    }
} catch (err) {
    console.error('Error loading .env.local', err);
}

const prisma = new PrismaClient();

async function main() {
    console.log('Migrating Experts...');
    const experts = await prisma.expert.findMany({
        where: { OR: [{ email: null }, { password: null }] }
    });

    console.log(`Found ${experts.length} experts needing migration.`);

    for (const exp of experts) {
        // Generate a default email if missing? 
        // Or just set to admin@habit.next if there is only one?
        // Let's use a pattern: `expert_${id}@habit.next` to avoid collisions, or specific one.

        let email = exp.email;
        if (!email) {
            email = `expert_${exp.id.substring(0, 5)}@habit.next`;
            // If name suggests admin, maybe use admin?
            if (exp.name === 'Johnson' || exp.name === 'Admin') email = 'admin@habit.next';
        }

        const hashedPassword = await bcrypt.hash('123456', 10);

        console.log(`Updating ${exp.name} (${exp.id}) -> Email: ${email}`);

        await prisma.expert.update({
            where: { id: exp.id },
            data: {
                email: email,
                password: hashedPassword,
                isApproved: true // Auto approve existing experts
            }
        });
    }
    console.log('Migration complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
