// Server-only synthetic snapshots. These are not a replacement FMS calculation engine.
// Snapshot date is explicit so fixtures never pretend to be a live operational ledger.
export function createStudentPortalFixtures() {
 const first = {
  source:'synthetic', asOf:'2026-09-11',
  profile:{mobile:'9999999999',email:'aarav@example.test',address:'Synthetic address, Rajnandgaon',photoUrl:null,session:'2026–27',courseStartDate:'2026-07-01',courseEndDate:'2027-06-30'},
  course:{code:'DCA-DEMO',group:'Synthetic CVRU example',session:'2026–27',duration:'12 months',batchTime:'08:00–09:00',batchStatus:'active',startDate:'2026-07-01',endDate:'2027-06-30'},
  fee:{courseFeePaise:1700000,addOnFeePaise:200000,discountPaise:100000,paymentStatus:'Partially paid'},
  installments:[
   {number:1,dueDate:'2026-07-01',plannedPaise:600000,cumulativePlannedPaise:600000,cumulativePaidPaise:600000,remainingPaise:0,status:'Paid'},
   {number:2,dueDate:'2026-09-01',plannedPaise:450000,cumulativePlannedPaise:1050000,cumulativePaidPaise:750000,remainingPaise:300000,status:'Overdue · partial payment'},
   {number:3,dueDate:'2026-10-01',plannedPaise:300000,cumulativePlannedPaise:1350000,cumulativePaidPaise:750000,remainingPaise:600000,status:'Upcoming · includes carry-forward'},
   {number:4,dueDate:'2026-12-01',plannedPaise:450000,cumulativePlannedPaise:1800000,cumulativePaidPaise:750000,remainingPaise:1050000,status:'Upcoming · cumulative balance'}
  ],
  payments:[{id:'pay-a-1',receiptNumber:'SYN-2026-001',date:'2026-07-01',amountPaise:600000,mode:'Cash',reference:null,status:'Posted',documentId:'receipt-a-1'},{id:'pay-a-2',receiptNumber:'SYN-2026-002',date:'2026-08-20',amountPaise:150000,mode:'UPI',reference:'SYNTHETIC-REF',status:'Posted',documentId:'receipt-a-2'}],
  receipts:[{id:'receipt-a-1',receiptNumber:'SYN-2026-001',date:'2026-07-01',amountPaise:600000,documentStatus:'pending'},{id:'receipt-a-2',receiptNumber:'SYN-2026-002',date:'2026-08-20',amountPaise:150000,documentStatus:'pending'}],
  dues:{currentDuePaise:300000,nextDueDate:'2026-10-01',nextCumulativeDuePaise:600000,overdue:true,daysOverdue:10,daysRemaining:20,reminder:'The September shortage carries into the October cumulative due. Reminders begin seven days before a due date and continue while overdue.'},
  notices:[{id:'notice-a-1',title:'Practical session preparation',date:'2026-09-10',description:'Synthetic notice: review your assigned exercises before the next practical session.',readAt:null,attachmentUrl:null}],
  certificates:[
   {type:'Main course',eligibility:'Not eligible',reason:'Course completion and full payment are pending.',issued:false,number:null,issueDate:null,thresholdPercent:null,paymentGateMet:false},
   {type:'Data Entry',eligibility:'Pending required checks',reason:'40% payment threshold met. Course-end and manual issuance checks remain; no certificate is issued.',issued:false,number:null,issueDate:null,thresholdPercent:40,paymentGateMet:true},
   {type:'MS Office',eligibility:'Not eligible',reason:'50% payment threshold not met. Course-end and manual issuance checks also apply.',issued:false,number:null,issueDate:null,thresholdPercent:50,paymentGateMet:false},
   {type:'Accounting with Tally Prime',eligibility:'Not eligible',reason:'60% payment threshold not met. Course-end and manual issuance checks also apply.',issued:false,number:null,issueDate:null,thresholdPercent:60,paymentGateMet:false}
  ],
  resources:['assignment','project','practical'].map((type,index)=>({id:`resource-a-${index}`,type,title:`Synthetic ${type} resource`,courseCode:'DCA-DEMO',session:'2026–27',date:'2026-09-10',description:'Course-scoped preview. Approved learning material and secure download integration are pending.',downloadUrl:null})),
  credentials:{status:'pending',message:'Secure re-authentication and audited credential reveal are not available. No credential values are returned.'}
 };
 const second={source:'synthetic',asOf:'2026-09-11',profile:{mobile:null,email:null,address:null,photoUrl:null,session:'2026–27',courseStartDate:'2026-08-01',courseEndDate:null},course:{code:'OFFICE-DEMO',group:'Office skills',session:'2026–27',duration:null,batchTime:'14:00',batchStatus:'active',startDate:'2026-08-01',endDate:null},fee:{courseFeePaise:1200000,addOnFeePaise:0,discountPaise:0,paymentStatus:'Unpaid'},installments:[],payments:[],receipts:[],dues:{currentDuePaise:null,nextDueDate:'2026-10-15',nextCumulativeDuePaise:null,overdue:null,daysOverdue:null,daysRemaining:null,reminder:'Detailed custom plan integration pending.'},notices:[{id:'notice-b-1',title:'Welcome to your course',date:'2026-09-09',description:'Synthetic notice for the second student only.',readAt:null,attachmentUrl:null}],certificates:[],resources:[{id:'resource-b-1',type:'assignment',title:'Office skills sample assignment',courseCode:'OFFICE-DEMO',session:'2026–27',date:'2026-09-09',description:'Second course only. Download pending.',downloadUrl:null}],credentials:{status:'pending',message:'Secure credential reveal integration pending.'}};
 return new Map([['student-demo-001',first],['student-demo-002',second]]);
}
// Separate fixture scenario for acceptance tests; it does not alter either existing account.
export const fullyPaidScenario = Object.freeze({courseFeePaise:1700000,addOnFeePaise:200000,discountPaise:100000,totalPaise:1800000,paidPaise:1800000,duePaise:0,currentDuePaise:0,dueList:[],courseCompleted:true,certificateIssued:false});
