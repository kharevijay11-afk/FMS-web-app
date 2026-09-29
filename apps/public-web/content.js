export const site = {
  name: 'CREATE COMPUTER', phone: '7000492856', alternatePhone: '07744355128', email: 'info@createcomputer.in',
  address: 'Govt. Digvijay College Road, Near Durga Mandir, Kilapara, Rajnandgaon (C.G.)',
  timings: 'Please call to confirm office timings.',
  announcement: 'Explore learning opportunities. Contact the institute for current admission dates and available batches.',
  popup: null, socialLinks: [],
  about: { introduction: 'Explore computer learning at CREATE COMPUTER in Rajnandgaon. Contact our team to discuss your learning goals and the right course for you.', history: 'CREATE COMPUTER serves learners from its Kilapara, Rajnandgaon centre.', mission: 'Support approachable, practical computer learning.', vision: 'Help learners build confidence with useful digital tools.' }
};
// Public catalogue names mirror the institute website. Fees, dates and admission
// availability remain intentionally unpublished until an approved CMS projection exists.
export const courses = [
  { id: 'ms-office', name: 'MS Office', code: 'MS-OFFICE', category: 'Productivity', description: 'Build practical skills for documents, spreadsheets and presentations.', icon: '01' },
  { id: 'tally', name: 'Tally', code: 'TALLY', category: 'Accounting', description: 'Learn computerised accounting workflows and business records.', icon: '02' },
  { id: 'photoshop', name: 'Photoshop', code: 'PHOTOSHOP', category: 'Design', description: 'Explore image editing and practical visual-design workflows.', icon: '03' },
  { id: 'graphic-design', name: 'Graphic Design', code: 'GRAPHIC-DESIGN', category: 'Design', description: 'Develop practical visual communication and design skills.', icon: '04' },
  { id: 'copa', name: 'COPA', code: 'COPA', category: 'Vocational', description: 'Ask the institute about the current COPA programme and batch.', icon: '05' }
].map(course => ({ ...course, duration: 'Confirm with institute', eligibility: 'Confirm with institute', admissionStatus: 'Enquire for availability', fixture: false }));
export const slides = [
  { heading: 'Your next chapter starts with a digital skill.', description: 'Explore computer learning, discover your interests, and take the first step with CREATE COMPUTER.', buttonText: 'Explore learning paths', buttonLink: '#/courses', image: illustration('LEARN. PRACTISE. GROW.', '#175cd3'), alt: 'Illustration of a computer screen with learning materials' },
  { heading: 'Make room for practical learning.', description: 'Talk to our team about course content, practical work and current batch availability.', buttonText: 'Make an inquiry', buttonLink: '#/registration', image: illustration('BUILD YOUR CONFIDENCE', '#17456f'), alt: 'Illustrated computer workspace representing practical learning' }
];
export const notices = [{ title: 'Welcome to the public notice board', date: '2026-09-11', description: 'Sample notice. Confirm current admissions, schedules and notices directly with the institute.', important: true, isNew: true, href: null, fixture: true }];
export const studentLinks = [
  ['Student Login', '/student', 'Access your existing student portal.'], ['Registration', '#/registration', 'Send an inquiry to the institute.'],
  ['Certificate Verification', '#/verify', 'Check integration availability.'], ['Marksheet / Certificate', '/student', 'Sign in for your student services.'],
  ['Assignment', '#/assignments', 'Assignment information and resources.'], ['Project Topic', '#/projects', 'Explore project resource information.'],
  ['Practical Work', '#/practical', 'Practical learning resources.'], ['CVRU Result', '#/results', 'Result link availability.'], ['Notices', '#/notices', 'Read public updates.']
];
export const categories = ['Computer Lab', 'Students', 'Events', 'Certificates', 'Training', 'Other Activities'];
export const gallery = categories.map((category, index) => ({ id: `gallery-${index}`, category, title: `${category} preview`, image: illustration(category.toUpperCase(), index % 2 ? '#17456f' : '#175cd3'), alt: `Sample illustration for ${category}; not an institute photograph`, fixture: true }));
export const testimonials = [{ name: 'Sample learner', course: 'Computer Foundations · sample', review: 'This card previews where an approved student review will appear.', rating: 5, photo: illustration('SAMPLE PROFILE', '#17456f'), active: true, fixture: true }];
export const resources = ['assignments', 'projects', 'practical'].map(type => ({ type, title: type === 'projects' ? 'Project topic guide' : type === 'practical' ? 'Practical work guide' : 'Assignment guide', course: 'Sample course', session: 'Sample session', description: 'Preview entry only. Approved learning materials will appear here when available.', date: '2026-09-11', href: null, fixture: true }));
function illustration(label, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><rect width="900" height="650" fill="#edf4ff"/><circle cx="705" cy="130" r="170" fill="#d5e5ff"/><rect x="130" y="115" width="640" height="365" rx="24" fill="${color}"/><rect x="152" y="138" width="596" height="310" rx="10" fill="#fff"/><rect x="195" y="185" width="190" height="210" rx="12" fill="#e8f0fd"/><path d="m240 268 30 30 65-70" fill="none" stroke="${color}" stroke-width="16"/><path d="M425 207h270M425 247h210M425 287h250M425 327h160" stroke="#c7d8ef" stroke-width="15"/><path d="M400 481v50h100v-50M330 535h240" fill="none" stroke="${color}" stroke-width="22"/><text x="450" y="599" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="${color}" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
