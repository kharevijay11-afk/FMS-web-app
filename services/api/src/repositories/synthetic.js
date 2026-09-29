import { makePasswordRecord } from "../lib/security.js";

export function createSyntheticRepository() {
  const users = [
    { id: "usr-super", userId: "superadmin@example.test", name: "Demo Admin (migrated)", role: "admin", password: makePasswordRecord("ChangeMe!123") },
    { id: "usr-admin", userId: "admin@example.test", name: "Demo Admin", role: "admin", password: makePasswordRecord("ChangeMe!123") },
    { id: "usr-staff", userId: "staff@example.test", name: "Demo Staff", role: "staff", password: makePasswordRecord("ChangeMe!123") },
    { id: "usr-student", userId: "STU-DEMO-001", name: "Aarav Demo", role: "student", studentRecordId: "student-demo-001", password: makePasswordRecord("Student!123") }
  ];
  const students = [{
    id: "student-demo-001", studentId: "STU-DEMO-001", name: "Aarav Demo", course: "Diploma in Computer Applications",
    batch: "Morning 08:00", status: "Active", admissionDate: "2026-07-01", fee: { currency: "INR", totalPaise: 1800000, paidPaise: 750000, duePaise: 1050000 },
    nextInstallment: { dueDate: "2026-10-01", amountPaise: 300000 }, notices: [{ id: "notice-demo-1", title: "Synthetic practical schedule", sentAt: "2026-09-05T09:00:00.000Z" }]
  }];
  const inquiries = [];
  const idempotency = new Map();
  return {
    findUser(userId) { return users.find((user) => user.userId.toLowerCase() === userId.toLowerCase()); },
    findUserById(id) { return users.find((user) => user.id === id); },
    findStudent(id) { return students.find((student) => student.id === id); },
    addInquiry(inquiry, key) { inquiries.push(inquiry); if (key) idempotency.set(key, inquiry); return inquiry; },
    inquiryByKey(key) { return key ? idempotency.get(key) : undefined; },
    listInquiries() { return [...inquiries]; }
  };
}
