import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {certificateDocument,idCardDocument} from '../services/api/src/step6e-documents.js';
const out=new URL('../tmp/print-layout-qa/',import.meta.url);await mkdir(out,{recursive:true});
const css=`${await readFile(new URL('../apps/admin-web/document-print.css',import.meta.url),'utf8')}\n${await readFile(new URL('../apps/admin-web/document-page.css',import.meta.url),'utf8')}`;
const model={studentName:'Sample Student',studentId:'CC-1063',course:'Hindi Typing',batch:'Morning 08:00',mobile:'9876543210',guardian:'Sample Guardian',issueDate:'2026-09-11',validTill:'2027-06-30',trainingStart:'2026-08-01',trainingEnd:'2026-09-01',duration:'1 Month',modules:'Hindi Typing · Speed & Accuracy',certificateNumber:'CERT-0002',institute:{name:'Create Computer',address:'Govt. Digvijay College Road, Near Durga Mandir, Kilapara, Rajnandgaon (C.G.)',phone:'+91 7000492856'}};
const standalone=html=>html.replace(/<link rel="stylesheet"[^>]+>/g,'').replace('</head>',`<style>${css}</style></head>`).replace(/<script[^>]+><\/script>/g,'');
await writeFile(new URL('certificate.html',out),standalone(certificateDocument(model)));
await writeFile(new URL('id-card.html',out),standalone(idCardDocument(model)));
