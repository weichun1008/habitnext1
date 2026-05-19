// scripts/spike-template-rollover.js
// One-shot diagnostic: how does the existing system handle phase rollover?
// Creates a test template + assignment, inspects Task records that get created.
// Cleans up afterwards.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  console.log('=== Spike: Template phase rollover ===\n');

  // 1. Find any existing expert (or create a throwaway one)
  let expert = await prisma.expert.findFirst();
  let createdExpert = false;
  if (!expert) {
    expert = await prisma.expert.create({
      data: {
        name: 'SPIKE Test Expert',
        email: 'spike-test@example.com',
        password: 'unused',
        isActive: true,
        isApproved: true,
      },
    });
    createdExpert = true;
    console.log('Created throwaway expert:', expert.id);
  } else {
    console.log('Using existing expert:', expert.id, expert.name);
  }

  // 2. Find or create test user
  const userPhone = '0900000099';
  const user = await prisma.user.upsert({
    where: { phone: userPhone },
    update: { isActive: true },
    create: { nickname: 'SPIKE Test User', phone: userPhone, isActive: true },
  });
  console.log('Test user:', user.id);

  // 3. Create test template with 2 phases (3 days each)
  const template = await prisma.template.create({
    data: {
      expertId: expert.id,
      name: 'SPIKE Rollover Test',
      description: 'diagnostic only',
      category: 'spike',
      isPublic: false,
      startDateType: 'user_choice',
      tasks: {
        version: '2.0',
        phases: [
          {
            id: 'phase1',
            name: 'Phase 1',
            days: 3,
            tasks: [{ title: 'SPIKE Task A (phase 1)', type: 'binary' }],
          },
          {
            id: 'phase2',
            name: 'Phase 2',
            days: 3,
            tasks: [{ title: 'SPIKE Task B (phase 2)', type: 'binary' }],
          },
        ],
      },
    },
  });
  console.log('Test template:', template.id);

  // 4. Simulate user joining via the existing API
  const baseUrl = process.env.SPIKE_BASE_URL || 'http://localhost:3000';
  let assignment = null;
  let tasksCreated = [];
  try {
    const res = await fetch(`${baseUrl}/api/user/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        templateId: template.id,
        startDate: new Date().toISOString().slice(0, 10),
      }),
    });
    console.log('POST /api/user/assignments:', res.status);
    if (res.ok) {
      const body = await res.json();
      console.log('Response keys:', Object.keys(body));
      assignment = await prisma.assignment.findFirst({
        where: { userId: user.id, templateId: template.id },
        orderBy: { createdAt: 'desc' },
      });
      console.log('\nAssignment created:', assignment?.id);
      tasksCreated = await prisma.task.findMany({
        where: { userId: user.id, assignmentId: assignment?.id },
      });
      console.log(`Tasks created (n=${tasksCreated.length}):`);
      tasksCreated.forEach(t => console.log(`  - "${t.title}" (date=${t.date || 'none'}, metadata=${JSON.stringify(t.metadata)})`));
    } else {
      console.log('Response body:', await res.text());
    }
  } catch (e) {
    console.error('API call failed (is dev server running?):', e.message);
  }

  // 5. Verdict
  console.log('\n=== VERDICT ===');
  if (tasksCreated.length === 0) {
    console.log('No tasks created — API did not expand template tasks. Either dev server is off OR the endpoint does not auto-expand. Check the response status above.');
  } else {
    const hasPhase1 = tasksCreated.some(t => t.title.includes('phase 1'));
    const hasPhase2 = tasksCreated.some(t => t.title.includes('phase 2'));
    if (hasPhase1 && hasPhase2) {
      console.log('!! All phase tasks created at once (NO ROLLOVER).');
      console.log('   → Need phase-rollover remediation: filter active tasks by (today - assignment.startDate) >= cumulative phase.days');
    } else if (hasPhase1 && !hasPhase2) {
      console.log('Only phase 1 tasks created — system already does rollover by phase.days.');
    } else {
      console.log('Unexpected: only phase 2 tasks created. Investigate.');
    }
  }

  // 6. Cleanup
  console.log('\n=== Cleanup ===');
  if (tasksCreated.length) {
    await prisma.task.deleteMany({ where: { id: { in: tasksCreated.map(t => t.id) } } });
    console.log('Deleted', tasksCreated.length, 'test tasks');
  }
  if (assignment) {
    await prisma.assignment.delete({ where: { id: assignment.id } });
    console.log('Deleted test assignment');
  }
  await prisma.template.delete({ where: { id: template.id } });
  console.log('Deleted test template');
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Deleted test user');
  if (createdExpert) {
    await prisma.expert.delete({ where: { id: expert.id } });
    console.log('Deleted throwaway expert');
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
