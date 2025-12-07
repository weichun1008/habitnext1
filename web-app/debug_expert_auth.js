const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Expert Table ---');
    const experts = await prisma.expert.findMany();
    console.log(`Found ${experts.length} experts.`);

    for (const expert of experts) {
        console.log(`\nExpert: ${expert.name} (${expert.email})`);
        console.log(`ID: ${expert.id}`);
        console.log(`IsApproved: ${expert.isApproved}`);
        console.log(`Password Hash: ${expert.password ? expert.password.substring(0, 20) + '...' : 'NULL'}`);

        // Test "123456"
        if (expert.password) {
            const isMatchDefault = await bcrypt.compare('123456', expert.password);
            console.log(`Password '123456' matches? ${isMatchDefault}`);
        }
    }

    // Fix Admin Email
    if (experts.length > 0) {
        const admin = experts[0];
        console.log(`\n--- Updating Admin Email to 'admin@habit.next' ---`);
        const updated = await prisma.expert.update({
            where: { id: admin.id },
            data: { email: 'admin@habit.next' }
        });
        console.log(`Updated Admin: ${updated.email}`);
    }

    // Test Registration
    console.log('\n--- Simulating Registration ---');
    try {
        const testEmail = 'test_reg@habit.next';

        // Cleanup if exists
        const existing = await prisma.expert.findUnique({ where: { email: testEmail } });
        if (existing) {
            await prisma.expert.delete({ where: { email: testEmail } });
        }

        const hashedPassword = await bcrypt.hash('123456', 10);
        const newExpert = await prisma.expert.create({
            data: {
                name: 'Test Expert',
                title: 'Debugger',
                email: testEmail,
                password: hashedPassword,
                isApproved: false,
                role: 'expert'
            }
        });
        console.log(`Registration Success: ${newExpert.email} (ID: ${newExpert.id})`);

        // Clean up
        await prisma.expert.delete({ where: { id: newExpert.id } });
        console.log('Test expert deleted.');

    } catch (e) {
        console.error('Registration Simulation Failed:', e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
