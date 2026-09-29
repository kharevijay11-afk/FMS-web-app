// Shared by the browser and API. Permissions are enforced again at every API.
const groups = [
  ['Dashboard', [['dashboard','Dashboard','admin:dashboard:read','◫']]],
  ['Admissions & Students', [['inquiries','Inquiries','inquiry:read','◌'],['admissions','Admissions','system:admin','+'],['students','Students','student:summary:read:any','♙'],['left-students','Left Students','student:summary:read:any','↗']]],
  ['Academic', [['courses','Courses','system:admin','▤'],['sessions','Sessions','system:admin','▦'],['batches','Batches','system:admin','◷']]],
  ['Fees & Payments', [['fees','Fee Collection','system:admin','₹'],['installments','Installments','system:admin','≡'],['payments','Payments','system:admin','↔'],['dues','Due List','system:admin','◴'],['receipts','Receipts','system:admin','▧']]],
  ['Communication', [['notices','Notices','system:admin','◇'],['reminders','Due Reminders','system:admin','◷']]],
  ['Certificates & Documents', [['certificates','Certificates','system:admin','✧'],['id-cards','ID Cards','system:admin','▣']]],
  ['Finance', [['expenses','Expenses','system:admin','−'],['profit-loss','Profit / Loss','system:admin','↗'],['salary','Staff Salary','system:admin','₹']]],
  ['Reports', [['reports/daily','Daily Collection','system:admin','▥'],['reports/monthly','Monthly Collection','system:admin','▥'],['reports/course-wise','Course-wise Collection','system:admin','▥'],['reports/dues','Due Reports','system:admin','▥'],['reports/students','Student Reports','student:summary:read:any','▥']]],
  ['Administration', [['users','Users','system:admin','♙'],['audit','Audit Log','audit:read','≡'],['settings','Institute Settings','system:admin','⚙'],['backup','Backup / Restore','system:admin','↥']]],
  ['Account', [['account','My Account','admin:dashboard:read','○']]]
];
export const ADMIN_NAVIGATION = Object.freeze(groups.flatMap(([group, items]) => items.map(([id,label,permission,icon]) => Object.freeze({id, label, permission, icon, group, path:id==='dashboard'?'/admin':`/admin/${id}`}))));
export const visibleNavigation = permissions => ADMIN_NAVIGATION.filter(item => permissions?.includes(item.permission));
