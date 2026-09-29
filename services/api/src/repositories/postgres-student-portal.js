import { certificateEligibility } from '../../../../packages/domain/src/step6e.js';

const day=value=>value?String(value).slice(0,10):null;
const certificateNames={main:'Main course','data-entry':'Data Entry','ms-office':'MS Office','accounting-tally':'Accounting with Tally Prime'};

export function createPostgresStudentPortal(pool,finance){
 return{
  async getStudentPortal(studentId){
   const [studentResult,ledger,noticeResult,certificateResult]=await Promise.all([
    pool.query('SELECT * FROM students WHERE id=$1',[studentId]),
    finance.financeStudent(studentId),
    pool.query('SELECT n.id,n.title,n.message,n.created_at,r.read_at FROM admin_notice_recipients r JOIN admin_notices n ON n.id=r.notice_id WHERE r.student_id=$1 AND n.status=$2 ORDER BY r.saved_at DESC,n.id DESC',[studentId,'saved']),
    pool.query('SELECT * FROM certificates WHERE student_id=$1 AND status=$2 ORDER BY issue_date DESC,created_at DESC',[studentId,'issued'])
   ]);
   if(!studentResult.rowCount||!ledger)return null;
   const row=studentResult.rows[0],details=row.admission_details||{},feeDetails=details.fee||{},issued=new Map(certificateResult.rows.map(item=>[item.certificate_type,item]));
   const issueDate=new Date().toISOString().slice(0,10),types=['main','data-entry','ms-office','accounting-tally'];
   const certificates=types.map(type=>{const record=issued.get(type),check=certificateEligibility({type,studentStatus:row.status,courseEndDate:day(row.course_end_date),issueDate,totalPaise:ledger.totalPaise,paidPaise:ledger.paidPaise});return{type:certificateNames[type],eligibility:record?'Issued':check.eligible?'Eligible for manual issue':'Not eligible',reason:record?'Certificate has been issued by an authorised user.':check.reason,issued:Boolean(record),number:record?.certificate_number||null,issueDate:day(record?.issue_date),thresholdPercent:check.thresholdPercent,paymentGateMet:ledger.totalPaise===0||ledger.paidPaise*100>=ledger.totalPaise*check.thresholdPercent};});
   const installments=ledger.installments.map(item=>({number:item.installmentNo,dueDate:item.dueDate,plannedPaise:item.amountPaise,cumulativePlannedPaise:item.cumulativePlannedPaise,cumulativePaidPaise:item.cumulativePaidPaise,remainingPaise:item.remainingPaise,status:item.status}));
   const notices=noticeResult.rows.map(item=>({id:item.id,title:item.title,date:day(item.created_at),description:item.message,readAt:item.read_at||null,attachmentUrl:null}));
   const next=ledger.due,asOf=issueDate;
   return{source:'postgres',asOf,profile:{mobile:row.mobile||null,email:row.email||null,address:row.address||null,photoUrl:details.photoUrl||null,session:row.session_name||details.session||null,courseStartDate:day(row.admission_date),courseEndDate:day(row.course_end_date)},course:{code:details.courseCode||details.code||null,group:details.courseGroup||null,session:row.session_name||details.session||null,duration:details.duration||null,batchTime:details.batchTime||null,batchStatus:row.status==='active'?'active':row.status,startDate:day(row.admission_date),endDate:day(row.course_end_date)},fee:{courseFeePaise:Number(feeDetails.courseFeePaise??row.total_fee_paise),addOnFeePaise:Number(feeDetails.addOnFeePaise??0),discountPaise:Number(feeDetails.discountPaise??0),paymentStatus:ledger.outstandingPaise===0?'Paid':ledger.paidPaise>0?'Partially paid':'Unpaid'},installments,payments:ledger.payments.map(item=>({...item,status:item.status==='posted'?'Posted':'Reversed'})),receipts:ledger.receipts.map(item=>({...item,documentStatus:'available'})),dues:{currentDuePaise:next?.amountPaise??(ledger.outstandingPaise||0),nextDueDate:next?.dueDate||null,nextCumulativeDuePaise:next?.amountPaise??null,overdue:next?next.status==='overdue':false,daysOverdue:next?.status==='overdue'?Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(next.dueDate))/86400000)):null,daysRemaining:next?.status!=='overdue'&&next?.dueDate?Math.max(0,Math.ceil((Date.parse(next.dueDate)-Date.parse(asOf))/86400000)):null,reminder:next?'Cumulative due includes any earlier installment shortage.':'No scheduled payment is currently due.'},notices,unreadNoticeCount:notices.filter(item=>!item.readAt).length,certificates,resources:[],credentials:{status:'protected',message:'Credentials are never exposed in the student portal. Use account recovery to reset access.'}};
  },
  async markStudentNoticeRead(studentId,noticeId){
   const result=await pool.query('WITH prior AS (SELECT read_at FROM admin_notice_recipients WHERE student_id=$1 AND notice_id=$2 FOR UPDATE) UPDATE admin_notice_recipients r SET read_at=COALESCE(r.read_at,now()) FROM prior WHERE r.student_id=$1 AND r.notice_id=$2 RETURNING r.read_at,(prior.read_at IS NULL) AS changed',[studentId,noticeId]);
   if(!result.rowCount)return null;
   const notice=await pool.query('SELECT n.id,n.title,n.message,n.created_at,r.read_at FROM admin_notice_recipients r JOIN admin_notices n ON n.id=r.notice_id WHERE r.student_id=$1 AND r.notice_id=$2',[studentId,noticeId]);
   const row=notice.rows[0];return{changed:Boolean(result.rows[0].changed),notice:{id:row.id,title:row.title,date:day(row.created_at),description:row.message,readAt:row.read_at,attachmentUrl:null}};
  }
 };
}
