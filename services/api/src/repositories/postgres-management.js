import {HttpError} from '../lib/http.js';
const inquiry=r=>({...r,id:r.id,inquiryNo:r.inquiry_no,studentRecordId:r.student_record_id,createdAt:r.created_at,updatedAt:r.updated_at});
const student=r=>({...r.admission_details,id:r.id,studentId:r.student_id,name:r.display_name,mobile:r.mobile,email:r.email,address:r.address,course:r.course_name,session:r.session_name,batch:r.batch_name,status:r.status,admissionDate:r.admission_date,courseEndDate:r.course_end_date,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at,fee:{currency:'INR',totalPaise:Number(r.total_fee_paise),paidPaise:Number(r.paid_paise),duePaise:Number(r.total_fee_paise)-Number(r.paid_paise)}});
export function createPostgresManagement(pool){
  const meta=type=>type==='inquiries'?{table:'inquiries',name:'name',number:'inquiry_no',course:'course',date:'created_at',map:inquiry}:{table:'students',name:'display_name',number:'student_id',course:'course_name',date:'admission_date',map:student};
  return{
    async managementList(type,o){
      const m=meta(type),conditions=[],values=[];
      const add=(sql,value)=>{values.push(value);conditions.push(sql.replaceAll('?',`$${values.length}`));};
      if(o.query)add(`position(lower(?) in lower(concat_ws(' ',${m.number},${m.name},mobile,${m.course})))>0`,o.query);
      if(o.course)add(`${m.course}=?`,o.course);
      if(o.status==='pending')conditions.push("status IN ('new','contacted')");else if(o.status)add('status::text=?',o.status);
      if(o.from)add(`${m.date}>=?::date`,o.from);
      if(o.to)add(`${m.date}<?::date+interval '1 day'`,o.to);
      if(type==='students'){if(o.session)add('session_name=?',o.session);if(o.batch)add('batch_name=?',o.batch);}else if(o.session||o.batch)conditions.push('false');
      const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
      const total=await pool.query(`SELECT count(*)::integer AS total FROM ${m.table}${where}`,values);
      const data=await pool.query(`SELECT * FROM ${m.table}${where} ORDER BY ${m.date} ${o.sort==='oldest'?'ASC':'DESC'},id ${o.sort==='oldest'?'ASC':'DESC'} LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,o.pageSize,(o.page-1)*o.pageSize]);
      const filters={};for(const [key,column] of [['course',m.course],...(type==='students'?[['session','session_name'],['batch','batch_name']]:[])]){const result=await pool.query(`SELECT DISTINCT ${column} AS value FROM ${m.table} WHERE ${column} IS NOT NULL AND ${column}<>'' ORDER BY value LIMIT 200`);filters[key]=result.rows.map(r=>r.value);}
      return{items:data.rows.map(m.map),total:total.rows[0].total,page:o.page,pageSize:o.pageSize,filters};
    },
    async managementGet(type,id){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;const m=meta(type),r=await pool.query(`SELECT * FROM ${m.table} WHERE id=$1`,[id]);return r.rows[0]?m.map(r.rows[0]):null;},
    async managementUpdate(type,id,patch,version,event){
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new HttpError(404,'NOT_FOUND','Record was not found.');
      const m=meta(type),columns=type==='inquiries'?{name:'name',mobile:'mobile',course:'course',message:'message',status:'status'}:{name:'display_name',mobile:'mobile',email:'email',address:'address',status:'status'};
      const entries=Object.entries(patch);if(entries.some(([k])=>!columns[k]))throw new Error('Unsupported patch column');
      const client=await pool.connect();try{
        await client.query('BEGIN');const before=await client.query(`SELECT status,version FROM ${m.table} WHERE id=$1 FOR UPDATE`,[id]);
        if(!before.rowCount)throw new HttpError(404,'NOT_FOUND','Record was not found.');
        if(before.rows[0].version!==version)throw new HttpError(409,'VERSION_CONFLICT','This record changed. Reload it before saving.');
        const result=await client.query(`UPDATE ${m.table} SET ${entries.map(([k],i)=>`${columns[k]}=$${i+1}`).join(',')},version=version+1,updated_at=now() WHERE id=$${entries.length+1} RETURNING *`,[...entries.map(([,v])=>v),id]);
        await client.query('INSERT INTO audit_events(actor_user_id,actor_role,action,entity_type,entity_id,request_id,ip_hash,outcome,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[event.actorUserId,event.actorRole,event.action,event.entityType,id,event.requestId,event.ipHash,event.outcome,{fields:entries.map(([k])=>k),fromStatus:before.rows[0].status,toStatus:result.rows[0].status}]);
        await client.query('COMMIT');return m.map(result.rows[0]);
      }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    },
    async managementHistory(type,id){const r=await pool.query('SELECT action,occurred_at,actor_role,outcome FROM audit_events WHERE entity_type=$1 AND entity_id=$2 ORDER BY occurred_at DESC,id DESC LIMIT 20',[type==='inquiries'?'inquiry':'student',id]);return r.rows.map(e=>({action:e.action,occurredAt:e.occurred_at,actorRole:e.actor_role,outcome:e.outcome}));}
  };
}
