export const netPayable = ({courseFeePaise=0,addonFeePaise=0,discountPaise=0}) => courseFeePaise+addonFeePaise-discountPaise;
export function financialSnapshot(student,installments,payments,asOf=new Date().toISOString().slice(0,10)){
 const posted=payments.filter(p=>p.status==='posted'),paidPaise=posted.reduce((n,p)=>n+p.amountPaise,0),totalPaise=student.fee.totalPaise,outstandingPaise=Math.max(0,totalPaise-paidPaise);let cumulative=0;
 const plan=installments.map(p=>{cumulative+=p.amountPaise;const remainingPaise=Math.max(0,cumulative-paidPaise),overdue=p.dueDate<asOf&&remainingPaise>0,reminder=p.dueDate<=new Date(Date.parse(asOf+'T00:00:00Z')+7*86400000).toISOString().slice(0,10)&&remainingPaise>0;return{...p,cumulativePlannedPaise:cumulative,cumulativePaidPaise:Math.min(paidPaise,cumulative),remainingPaise,status:overdue?'overdue':remainingPaise===0?'paid':reminder?'due-soon':'upcoming'};});
 const due=outstandingPaise?plan.find(p=>p.remainingPaise>0&&p.status!=='upcoming')||plan.find(p=>p.remainingPaise>0):null;
 return{totalPaise,paidPaise,outstandingPaise,installments:plan,due:due?{dueDate:due.dueDate,amountPaise:due.remainingPaise,status:due.status}:null};
}
