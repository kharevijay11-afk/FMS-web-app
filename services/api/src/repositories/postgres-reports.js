export function createPostgresReports(pool, finance) {
  return {
    async report(kind, { from = '', to = '', asOf = '', query = '' } = {}) {
      if (kind === 'daily') {
        const result = await pool.query(
          `SELECT payment_date::text date,count(*)::int payment_count,sum(amount_paise)::bigint amount_paise
           FROM payments WHERE status='posted' AND ($1='' OR payment_date>=$1::date) AND ($2='' OR payment_date<=$2::date)
           GROUP BY payment_date ORDER BY payment_date DESC`, [from, to]);
        const items = result.rows.map((x) => ({ date: x.date, paymentCount: x.payment_count, amountPaise: Number(x.amount_paise) }));
        return { kind, items, summary: { count: items.reduce((n, x) => n + x.paymentCount, 0), amountPaise: items.reduce((n, x) => n + x.amountPaise, 0) } };
      }
      if (kind === 'monthly') {
        const result = await pool.query(
          `SELECT to_char(payment_date,'YYYY-MM') AS month,count(*)::int payment_count,sum(amount_paise)::bigint amount_paise
           FROM payments WHERE status='posted' AND ($1='' OR payment_date>=$1::date) AND ($2='' OR payment_date<=$2::date)
           GROUP BY 1 ORDER BY 1 DESC`, [from, to]);
        const items = result.rows.map((x) => ({ month: x.month, paymentCount: x.payment_count, amountPaise: Number(x.amount_paise) }));
        return { kind, items, summary: { count: items.reduce((n, x) => n + x.paymentCount, 0), amountPaise: items.reduce((n, x) => n + x.amountPaise, 0) } };
      }
      if (kind === 'course-wise') {
        const result = await pool.query(
          `WITH paid AS (
             SELECT student_id,sum(amount_paise)::bigint amount_paise FROM payments
             WHERE status='posted' AND ($1='' OR payment_date>=$1::date) AND ($2='' OR payment_date<=$2::date)
             GROUP BY student_id
           )
           SELECT s.course_name course,count(*)::int student_count,coalesce(sum(p.amount_paise),0)::bigint collection_paise,
                  sum(s.total_fee_paise)::bigint total_paise
           FROM students s LEFT JOIN paid p ON p.student_id=s.id GROUP BY s.course_name ORDER BY s.course_name`, [from, to]);
        const items = result.rows.map((x) => ({ course: x.course, studentCount: x.student_count, collectionPaise: Number(x.collection_paise), outstandingPaise: Math.max(0, Number(x.total_paise) - Number(x.collection_paise)) }));
        return { kind, items, summary: { courseCount: items.length, collectionPaise: items.reduce((n, x) => n + x.collectionPaise, 0), outstandingPaise: items.reduce((n, x) => n + x.outstandingPaise, 0) } };
      }
      if (kind === 'dues') {
        const snapshots = await finance.financeList('dues', { asOf: asOf || to || undefined });
        const items = snapshots.filter((x) => x.outstandingPaise > 0).map((x) => ({ studentRecordId: x.student.id, studentId: x.student.studentId, studentName: x.student.name, course: x.student.course, outstandingPaise: x.outstandingPaise, dueDate: x.due?.dueDate || null, duePaise: x.due?.amountPaise || null, status: x.due?.status || 'upcoming' }));
        return { kind, items, summary: { studentCount: items.length, outstandingPaise: items.reduce((n, x) => n + x.outstandingPaise, 0) }, asOf: asOf || to };
      }
      const result = await pool.query(
        `SELECT student_id,display_name name,course_name course,batch_name batch,status,admission_date
         FROM students WHERE $1='' OR concat_ws(' ',student_id,display_name,course_name,batch_name) ILIKE '%'||$1||'%'
         ORDER BY display_name LIMIT 1000`, [query]);
      return { kind: 'students', items: result.rows.map((x) => ({ studentId: x.student_id, name: x.name, course: x.course, batch: x.batch || '', status: x.status, admissionDate: String(x.admission_date).slice(0, 10) })), summary: { studentCount: result.rowCount } };
    },
  };
}
