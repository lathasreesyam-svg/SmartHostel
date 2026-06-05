#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx prisma db push --accept-data-loss

echo "🌱 Seeding demo users..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function seed() {
  // ── Users (upsert so always up to date) ──────────────────
  const block = await prisma.hostelBlock.upsert({ where: { name: 'Block A' }, update: {}, create: { name: 'Block A', capacity: 100, currentOccupancy: 1 } });

  const studentExists = await prisma.user.findUnique({ where: { email: 'student@demo.com' } });
  if (!studentExists) {
    await prisma.user.create({ data: { email: 'student@demo.com', passwordHash: await bcrypt.hash('Student@123', 10), role: 'STUDENT', isEmailVerified: true, isActive: true, studentProfile: { create: { name: 'Demo Student', rollNumber: 'CS2024001', department: 'Computer Science', year: 3, gender: 'MALE', phone: '9876543210', blockId: block.id, roomNumber: 'A-101' } } } });
    await prisma.user.create({ data: { email: 'committee@demo.com', passwordHash: await bcrypt.hash('Committee@123', 10), role: 'COMMITTEE', isEmailVerified: true, isActive: true } });
    await prisma.user.create({ data: { email: 'warden@demo.com', passwordHash: await bcrypt.hash('Warden@123', 10), role: 'WARDEN', isEmailVerified: true, isActive: true } });
    console.log('Demo users seeded!');
  }

  // ── Admin (always upsert) ─────────────────────────────────
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } });
  if (!adminExists) {
    await prisma.user.create({ data: { email: 'admin@demo.com', passwordHash: await bcrypt.hash('Admin@123', 10), role: 'ADMIN', isEmailVerified: true, isActive: true } });
    console.log('Admin user seeded!');
  }

  // ── Default Menu ──────────────────────────────────────────
  const menu = await prisma.menu.upsert({ where: { id: 'default-menu-id' }, update: {}, create: { id: 'default-menu-id', name: 'Weekly Standard Menu', description: 'Regular hostel mess menu', isActive: true } });

  // ── Meal Items ─────────────────────────────────────────────
  const mealItems = [
    { name: 'Idli Sambar', category: 'BREAKFAST', isVeg: true, calories: 280 },
    { name: 'Poha', category: 'BREAKFAST', isVeg: true, calories: 200 },
    { name: 'Tea & Bread', category: 'BREAKFAST', isVeg: true, calories: 150 },
    { name: 'Rice & Dal', category: 'LUNCH', isVeg: true, calories: 450 },
    { name: 'Chapati Sabzi', category: 'LUNCH', isVeg: true, calories: 380 },
    { name: 'Chicken Curry', category: 'LUNCH', isVeg: false, calories: 420 },
    { name: 'Biscuits & Tea', category: 'SNACKS', isVeg: true, calories: 180 },
    { name: 'Samosa', category: 'SNACKS', isVeg: true, calories: 220 },
    { name: 'Rice & Sambar', category: 'DINNER', isVeg: true, calories: 400 },
    { name: 'Roti Paneer', category: 'DINNER', isVeg: true, calories: 360 },
  ];
  const createdItems = [];
  for (const item of mealItems) {
    let existing = await prisma.mealItem.findFirst({ where: { name: item.name } });
    if (!existing) existing = await prisma.mealItem.create({ data: item });
    createdItems.push(existing);
  }

  // ── MealSchedules for ALL 7 days (upsert by dayOfWeek+mealType) ──────
  const schedules = [
    { mealType: 'BREAKFAST', startTime: '07:30', endTime: '09:00' },
    { mealType: 'LUNCH',     startTime: '12:00', endTime: '14:00' },
    { mealType: 'SNACKS',    startTime: '16:30', endTime: '17:30' },
    { mealType: 'DINNER',    startTime: '19:30', endTime: '21:00' },
  ];
  const itemIds = createdItems.map(i => ({ id: i.id }));
  for (let day = 0; day < 7; day++) {
    for (const sch of schedules) {
      const existing = await prisma.mealSchedule.findFirst({ where: { menuId: menu.id, dayOfWeek: day, mealType: sch.mealType } });
      if (!existing) {
        await prisma.mealSchedule.create({
          data: { menuId: menu.id, dayOfWeek: day, mealType: sch.mealType, startTime: sch.startTime, endTime: sch.endTime, items: { connect: itemIds } },
        });
      }
    }
  }
  console.log('MealSchedules seeded for all 7 days!');

  // ── Pending payment for student ───────────────────────────
  const student = await prisma.user.findUnique({ where: { email: 'student@demo.com' } });
  if (student) {
    const now = new Date();
    const existingPayment = await prisma.payment.findFirst({ where: { userId: student.id, month: now.getMonth() + 1, year: now.getFullYear() } });
    if (!existingPayment) {
      await prisma.payment.create({ data: { userId: student.id, amount: 3500, type: 'MESS_FEE', status: 'PENDING', description: 'Mess fee - ' + now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear(), month: now.getMonth() + 1, year: now.getFullYear(), dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5) } });
      console.log('Demo payment seeded!');
    }
  }

  // ── Demo Workers ──────────────────────────────────────────
  const workerExists = await prisma.worker.findFirst();
  if (!workerExists) {
    await prisma.worker.createMany({ data: [
      { name: 'Ramesh Kumar', phone: '9876543001', designation: 'Head Cook', shift: 'MORNING', salary: 18000, email: 'ramesh@mess.com' },
      { name: 'Suresh Babu', phone: '9876543002', designation: 'Cook', shift: 'AFTERNOON', salary: 14000 },
      { name: 'Priya Devi', phone: '9876543003', designation: 'Cleaner', shift: 'MORNING', salary: 10000 },
      { name: 'Anbu Raj', phone: '9876543004', designation: 'Helper', shift: 'EVENING', salary: 9000 },
      { name: 'Muthu', phone: '9876543005', designation: 'Night Watchman', shift: 'NIGHT', salary: 11000 },
    ]});
    console.log('Demo workers seeded!');
  }
}
seed().catch(console.error).finally(() => prisma.\$disconnect());
" 2>/dev/null || echo "Seed error (non-fatal)"

echo "🚀 Starting server on port 5000..."
exec node dist/app.js
