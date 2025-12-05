const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    // Update johnson to admin role
    const result = await prisma.expert.updateMany({
        where: { name: 'johnson' },
        data: { role: 'admin' }
    });

    console.log('✅ Johnson 帳號已更新為最高管理員');
    console.log('更新筆數:', result.count);

    // Show updated expert
    const expert = await prisma.expert.findFirst({
        where: { name: 'johnson' }
    });
    if (expert) {
        console.log('姓名:', expert.name);
        console.log('角色:', expert.role);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
