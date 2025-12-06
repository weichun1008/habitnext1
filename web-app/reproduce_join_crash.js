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
const { getTodayStr } = require('./src/lib/utils'); // Attempt to use utils if possible, or mock it

// Mock utils if generic import fails (node vs module issue)
function mockGetTodayStr() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

async function main() {
    const userId = 'cmiritq9s0000ovbdlevoappj'; // Known existing user
    // const templateId = 'cmiu6yj260001co3fgy3jc0qj'; // Known existing template

    // Fetch a template first to be sure
    const template = await prisma.template.findFirst({ where: { isPublic: true }, include: { expert: true } });
    if (!template) {
        console.error('No public template found to test');
        return;
    }
    console.log(`Testing with Template: ${template.name} (${template.id})`);

    const tasksData = template.tasks || [];
    console.log(`Template has ${tasksData.length} tasks`);

    try {
        const result = await prisma.$transaction(async (tx) => {
            console.log('1. Creating Assignment...');
            const assignment = await tx.assignment.create({
                data: {
                    userId,
                    templateId: template.id,
                    expertId: template.expertId,
                    status: 'active',
                    startDate: new Date(),
                }
            });
            console.log(`   -> Assignment ID: ${assignment.id}`);

            if (tasksData.length > 0) {
                console.log('2. Creating Tasks...');
                const tasksPayload = tasksData.map(t => ({
                    userId,
                    title: t.title,
                    type: t.type,
                    frequency: t.frequency,
                    time: '09:00',
                    category: t.category || 'star',
                    dailyTarget: t.dailyTarget || 1,
                    unit: t.unit || '次',
                    stepValue: t.stepValue || 1,
                    subtasks: t.subtasks || [],
                    recurrence: t.recurrence || {},
                    reminder: {},
                    createdAt: new Date(),
                    date: mockGetTodayStr(),
                    assignmentId: assignment.id,
                    expertName: template.expert.name,
                    isLocked: false
                }));

                // console.log('Payload sample:', tasksPayload[0]);

                await tx.task.createMany({
                    data: tasksPayload
                });
                console.log('   -> Tasks created successfully');
            }
            return assignment;
        });
        console.log('SUCCESS! Transaction completed.');
    } catch (error) {
        console.error('FAILED! Transaction failed.');
        console.error(error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
