import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing demo data
  await prisma.emailVerification.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.rebate.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.studentProfile.deleteMany({
    where: { user: { email: { in: ['student@demo.com', 'committee@demo.com', 'admin@demo.com', 'warden@demo.com'] } } }
  });
  await prisma.user.deleteMany({
    where: { email: { in: ['student@demo.com', 'committee@demo.com', 'admin@demo.com', 'warden@demo.com'] } }
  });

  // Create hostel block
  const block = await prisma.hostelBlock.upsert({
    where: { name: 'Block A' },
    update: {},
    create: {
      name: 'Block A',
      capacity: 100,
      currentOccupancy: 1,
    },
  });

  console.log('✅ Created hostel block:', block.name);

  // Hash passwords
  const studentPassword = await bcrypt.hash('Student@123', 10);
  const committeePassword = await bcrypt.hash('Committee@123', 10);
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const wardenPassword = await bcrypt.hash('Warden@123', 10);

  // Create Student User
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@demo.com',
      passwordHash: studentPassword,
      role: 'STUDENT',
      isEmailVerified: true,
      isActive: true,
      studentProfile: {
        create: {
          name: 'Demo Student',
          rollNumber: 'CS2024001',
          department: 'Computer Science',
          year: 3,
          gender: 'MALE',
          phone: '9876543210',
          blockId: block.id,
          roomNumber: 'A-101',
        },
      },
    },
  });
  console.log('✅ Created student:', studentUser.email);

  // Create Committee User
  const committeeUser = await prisma.user.create({
    data: {
      email: 'committee@demo.com',
      passwordHash: committeePassword,
      role: 'COMMITTEE',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Created committee:', committeeUser.email);

  // Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Created admin:', adminUser.email);

  // Create Warden User
  const wardenUser = await prisma.user.create({
    data: {
      email: 'warden@demo.com',
      passwordHash: wardenPassword,
      role: 'WARDEN',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Created warden:', wardenUser.email);

  // Create a default menu
  const menu = await prisma.menu.upsert({
    where: { id: 'default-menu-id' },
    update: {},
    create: {
      id: 'default-menu-id',
      name: 'Weekly Standard Menu',
      description: 'Regular hostel mess menu',
      isActive: true,
    },
  });

  // Seed meal items (MealItem has: name, description, category, isVeg, calories)
  const mealItemNames = [
    { name: 'Idli Sambar', category: 'BREAKFAST', isVeg: true, calories: 280 },
    { name: 'Poha', category: 'BREAKFAST', isVeg: true, calories: 200 },
    { name: 'Tea & Bread', category: 'BREAKFAST', isVeg: true, calories: 150 },
    { name: 'Rice & Dal', category: 'LUNCH', isVeg: true, calories: 450 },
    { name: 'Chapati Sabzi', category: 'LUNCH', isVeg: true, calories: 380 },
    { name: 'Chicken Curry', category: 'LUNCH', isVeg: false, calories: 420 },
    { name: 'Biscuits & Tea', category: 'SNACKS', isVeg: true, calories: 180 },
    { name: 'Rice & Sambar', category: 'DINNER', isVeg: true, calories: 400 },
    { name: 'Roti Paneer', category: 'DINNER', isVeg: true, calories: 360 },
  ];
  for (const item of mealItemNames) {
    const existing = await prisma.mealItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.mealItem.create({ data: item });
    }
  }
  console.log('✅ Created meal items');

  // Seed today's menu schedules (MealSchedule uses dayOfWeek: Int 0=Sun..6=Sat)
  const todayDayOfWeek = new Date().getDay(); // 0=Sunday
  const mealSchedules = [
    { mealType: 'BREAKFAST' as const, startTime: '07:30', endTime: '09:00' },
    { mealType: 'LUNCH' as const, startTime: '12:00', endTime: '14:00' },
    { mealType: 'SNACKS' as const, startTime: '16:30', endTime: '17:30' },
    { mealType: 'DINNER' as const, startTime: '19:30', endTime: '21:00' },
  ];
  for (const sch of mealSchedules) {
    const existing = await prisma.mealSchedule.findFirst({
      where: { menuId: menu.id, dayOfWeek: todayDayOfWeek, mealType: sch.mealType },
    });
    if (!existing) {
      await prisma.mealSchedule.create({
        data: { menuId: menu.id, dayOfWeek: todayDayOfWeek, mealType: sch.mealType, startTime: sch.startTime, endTime: sch.endTime },
      });
    }
  }
  console.log(`✅ Created today's menu schedules (dayOfWeek: ${todayDayOfWeek})`);

  // Create some sample notifications for student
  await prisma.notification.createMany({
    data: [
      {
        userId: studentUser.id,
        title: 'Welcome to SmartHostel!',
        message: 'Your account has been set up. Explore your dashboard to get started.',
        type: 'ANNOUNCEMENT',
        isRead: false,
      },
      {
        userId: studentUser.id,
        title: 'Mess Menu Updated',
        message: 'This week\'s menu has been updated. Check the menu section for details.',
        type: 'MEAL_REMINDER',
        isRead: false,
      },
    ],
  });

  // Sample payment record
  await prisma.payment.create({
    data: {
      userId: studentUser.id,
      amount: 2500,
      type: 'MESS_FEE',
      status: 'PENDING',
      description: 'May 2026 Mess Fee',
      month: 5,
      year: 2026,
      dueDate: new Date('2026-05-31'),
    },
  });

  // Sample complaint
  await prisma.complaint.create({
    data: {
      userId: studentUser.id,
      title: 'Food quality issue in dinner',
      description: 'The dal served in dinner was undercooked yesterday.',
      category: 'FOOD_QUALITY',
      status: 'OPEN',
    },
  });

  // Sample rebate
  await prisma.rebate.create({
    data: {
      userId: studentUser.id,
      fromDate: new Date('2026-05-25'),
      toDate: new Date('2026-05-28'),
      reason: 'Going home for a family function',
      status: 'PENDING',
    },
  });

  // Inventory items
  await prisma.inventoryItem.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Rice', unit: 'kg', currentStock: 150, minimumStock: 50, maximumCapacity: 500, pricePerUnit: 42, category: 'Grains', supplier: 'Local Supplier' },
      { name: 'Dal (Toor)', unit: 'kg', currentStock: 80, minimumStock: 30, maximumCapacity: 200, pricePerUnit: 95, category: 'Pulses', supplier: 'Local Supplier' },
      { name: 'Cooking Oil', unit: 'litre', currentStock: 25, minimumStock: 20, maximumCapacity: 100, pricePerUnit: 130, category: 'Oil & Fats', supplier: 'Oil Depot' },
      { name: 'Wheat Flour', unit: 'kg', currentStock: 100, minimumStock: 40, maximumCapacity: 300, pricePerUnit: 32, category: 'Grains', supplier: 'Local Supplier' },
      { name: 'Sugar', unit: 'kg', currentStock: 40, minimumStock: 20, maximumCapacity: 150, pricePerUnit: 45, category: 'Sweeteners', supplier: 'Local Supplier' },
    ],
  });

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Student:   student@demo.com   / Student@123');
  console.log('  Committee: committee@demo.com / Committee@123');
  console.log('  Admin:     admin@demo.com     / Admin@123');
  console.log('  Warden:    warden@demo.com    / Warden@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
