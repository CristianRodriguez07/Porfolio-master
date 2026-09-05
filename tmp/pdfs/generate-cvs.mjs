import fs from 'node:fs';
import path from 'node:path';

const page = { width: 595.28, height: 841.89, left: 45, right: 550, top: 798, bottom: 42 };
const esc = (value) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function wrap(text, max = 105) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function makePdf(data, output) {
  const c = [];
  let y = page.top;
  const text = (value, { x = page.left, size = 8.9, bold = false, color = '0.09 0.13 0.20', leading = 11.4 } = {}) => {
    c.push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(value)}) Tj ET`);
    y -= leading;
  };
  const rule = () => { c.push(`0.04 0.43 0.60 RG 1.2 w ${page.left} ${y + 5} m ${page.right} ${y + 5} l S`); y -= 7; };
  const heading = (value) => { y -= 3; text(value.toUpperCase(), { size: 8.6, bold: true, color: '0.04 0.43 0.60', leading: 10.5 }); rule(); };
  const paragraph = (value, options = {}) => wrap(value, options.max ?? 107).forEach((line) => text(line, options));
  const bullet = (value) => {
    const lines = wrap(value, 99);
    lines.forEach((line, i) => text(`${i === 0 ? '- ' : '  '}${line}`, { x: page.left + 4, size: 8.65, leading: 10.8 }));
    y -= 1;
  };
  const job = (title, date, location, bullets) => {
    text(title, { size: 9.4, bold: true, leading: 10.5 });
    text(`${location} | ${date}`, { size: 8.3, color: '0.30 0.35 0.42', leading: 10 });
    bullets.forEach(bullet);
    y -= 1;
  };

  text('Cristian Rodríguez', { size: 22, bold: true, color: '0.06 0.17 0.28', leading: 25 });
  text(data.role.toUpperCase(), { size: 10.6, bold: true, color: '0.04 0.43 0.60', leading: 14 });
  text(data.contact, { size: 8.2, color: '0.30 0.35 0.42', leading: 12 });
  c.push(`0.04 0.43 0.60 RG 1.6 w ${page.left} ${y + 5} m ${page.right} ${y + 5} l S`);
  y -= 4;

  heading(data.profileTitle); paragraph(data.summary, { size: 8.8, leading: 11.2 });
  y -= 2; c.push(`0.93 0.97 0.98 rg ${page.left} ${y - 25} ${page.right - page.left} 27 re f`); y -= 6;
  paragraph(data.impact, { x: page.left + 7, size: 8.5, leading: 10.2, max: 103 }); y -= 2;

  heading(data.experienceTitle);
  for (const item of data.jobs) job(item.title, item.date, item.location, item.bullets);
  heading(data.skillsTitle);
  data.skills.forEach((skill) => paragraph(skill, { size: 8.55, leading: 10.6, max: 107 })); y -= 1;
  heading(data.certificationsTitle); paragraph(data.certifications, { size: 8.4, leading: 10.3, max: 108 }); y -= 1;
  heading(data.educationTitle);
  data.education.forEach((entry) => text(entry, { size: 8.45, leading: 10.3 }));
  text(data.languages, { size: 8.45, leading: 10.3 });
  if (y < page.bottom) throw new Error(`Content overflow for ${output}: final y=${y}`);

  const stream = c.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(output, Buffer.from(pdf, 'latin1'));
  console.log(`${path.basename(output)}: 1 page, final y=${y.toFixed(1)}`);
}

const commonContact = 'Madrid, España | +34 675 648 371 | cr113022@gmail.com | linkedin.com/in/cristian-rodriguez-cervantes | crisrcportfolio.netlify.app';
const spanish = {
  role: 'Consultor de Process Mining | Celonis', contact: commonContact,
  profileTitle: 'Perfil profesional',
  summary: 'Consultor de Process Mining con más de 2,5 años de experiencia en Celonis, SQL y Python. Transformo datos operativos en análisis accionables para identificar ineficiencias, definir KPIs y priorizar mejoras y automatizaciones. Combino modelado y transformación de datos con comunicación directa con cliente, toma de requisitos y desarrollo de dashboards en Celonis Studio.',
  impact: 'IMPACTO DESTACADO: Más de 12 cuellos de botella identificados o resueltos y más de 70 KPIs, dashboards, gráficos y tablas generados en iniciativas de Process Mining.',
  experienceTitle: 'Experiencia profesional',
  jobs: [
    { title: 'Analista Consultor - Process Mining / Celonis | Inetum', date: '2025 - Actualidad', location: 'Madrid, España', bullets: [
      'Participo en un proyecto para la Generalitat de Catalunya orientado a mejorar el análisis del proceso de ayudas al alquiler mediante Process Mining.',
      'Gestiono comunicación directa con cliente y toma de requisitos; realizo extracción, transformación y modelado de datos para alinear la solución con necesidades de negocio.',
      'Defino KPIs y desarrollo dashboards en Celonis Studio para visualizar el proceso y detectar retrasos, inconsistencias y cuellos de botella.',
      'Generé aproximadamente 30 KPIs y visualizaciones y contribuí a resolver más de 2 cuellos de botella en el proyecto.',
      'Tecnologías: Celonis EMS / Process Intelligence Platform, Celonis Studio, PQL, PyCelonis, SQL y Python.' ] },
    { title: 'Desarrollador de Software / Full Stack | Getronics', date: '2023 - 2025', location: 'Madrid, España', bullets: [
      'Desarrollé y mantuve aplicaciones, conectando necesidades de negocio con soluciones de software y análisis de procesos.',
      'Participé en POCs, evaluando alternativas técnicas, preparando demos y validando propuestas antes de su paso a desarrollo.',
      'Colaboré con perfiles técnicos y de negocio en iniciativas de optimización de procesos y automatización.',
      'Tecnologías: Spring Boot, Angular, Node.js, Celonis, SQL y Python.' ] }
  ],
  skillsTitle: 'Competencias técnicas', skills: [
    'Process Mining: Celonis, Process Intelligence, análisis de procesos, KPIs, dashboards, identificación de cuellos de botella y automatización.',
    'Celonis: EMS, Studio, PQL, PyCelonis, Action Flows, demos y POCs.',
    'Datos y desarrollo: SQL, Python, extracción, transformación, validación y modelado de datos; Java, Spring Boot, Angular, Node.js, JavaScript, MySQL y Git.' ],
  certificationsTitle: 'Certificaciones Celonis', certifications: 'Qualified Value Realization Expert | Qualified Value Assessment Expert | Qualified Technical Expert | Qualified Solution Creation Expert | Qualified to Build Action Flows | Qualified to Create and Deliver Demos',
  educationTitle: 'Formación e idiomas', education: [
    'Postgrado en Desarrollo de Aplicaciones Web y Blockchain - Cesur Plaza Elíptica | 2024 - 2026',
    'Grado Superior en Desarrollo de Aplicaciones Multiplataforma - Cesur Plaza Elíptica | 2022 - 2024',
    'Bachillerato de Ciencias Tecnológicas - IES Gran Capitán | 2020 - 2022' ], languages: 'Idiomas: Español nativo | Inglés profesional'
};
const english = {
  role: 'Process Mining Consultant | Celonis', contact: commonContact.replace('España', 'Spain'),
  profileTitle: 'Professional summary',
  summary: 'Process Mining Consultant with 2.5+ years of experience in Celonis, SQL, and Python. I turn operational data into actionable insights to identify inefficiencies, define KPIs, and prioritize improvements and automation. I combine data modeling and transformation skills with direct client communication, requirements gathering, and Celonis Studio dashboard development.',
  impact: 'SELECTED IMPACT: Identified or resolved 12+ process bottlenecks and delivered 70+ KPIs, dashboards, charts, and tables across Process Mining initiatives.',
  experienceTitle: 'Professional experience',
  jobs: [
    { title: 'Consultant Analyst - Process Mining / Celonis | Inetum', date: '2025 - Present', location: 'Madrid, Spain', bullets: [
      'Contribute to a project for the Generalitat de Catalunya focused on improving analysis of the housing assistance process through Process Mining.',
      'Manage direct client communication and requirements gathering; perform data extraction, transformation, and modeling to align the solution with business needs.',
      'Define KPIs and develop Celonis Studio dashboards to visualize process status and identify delays, inconsistencies, and bottlenecks.',
      'Delivered approximately 30 KPIs and visualizations and contributed to resolving more than 2 bottlenecks within the project.',
      'Technologies: Celonis EMS / Process Intelligence Platform, Celonis Studio, PQL, PyCelonis, SQL, and Python.' ] },
    { title: 'Software Developer / Full Stack Developer | Getronics', date: '2023 - 2025', location: 'Madrid, Spain', bullets: [
      'Developed and maintained applications, connecting business needs with software solutions and process analysis.',
      'Contributed to POCs by evaluating technical alternatives, preparing demos, and validating proposals before development.',
      'Collaborated with technical and business stakeholders on process optimization and automation initiatives.',
      'Technologies: Spring Boot, Angular, Node.js, Celonis, SQL, and Python.' ] }
  ],
  skillsTitle: 'Technical skills', skills: [
    'Process Mining: Celonis, Process Intelligence, process analysis, KPIs, dashboards, bottleneck identification, and automation.',
    'Celonis: EMS, Studio, PQL, PyCelonis, Action Flows, demos, and POCs.',
    'Data and software development: SQL, Python, data extraction, transformation, validation, and modeling; Java, Spring Boot, Angular, Node.js, JavaScript, MySQL, and Git.' ],
  certificationsTitle: 'Celonis certifications', certifications: 'Qualified Value Realization Expert | Qualified Value Assessment Expert | Qualified Technical Expert | Qualified Solution Creation Expert | Qualified to Build Action Flows | Qualified to Create and Deliver Demos',
  educationTitle: 'Education & languages', education: [
    'Postgraduate Program in Web Application Development and Blockchain - Cesur Plaza Elíptica | 2024 - 2026',
    'Higher Degree in Multiplatform Application Development - Cesur Plaza Elíptica | 2022 - 2024',
    'High School Diploma, Technology Sciences - IES Gran Capitán | 2020 - 2022' ], languages: 'Languages: Spanish (native) | English (professional working proficiency)'
};

const outputDir = path.resolve('output/pdf');
makePdf(spanish, path.join(outputDir, 'Cristian_Rodriguez_Process_Mining_Consultant_ES.pdf'));
makePdf(english, path.join(outputDir, 'Cristian_Rodriguez_Process_Mining_Consultant_EN.pdf'));
fs.copyFileSync(
  path.join(outputDir, 'Cristian_Rodriguez_Process_Mining_Consultant_ES.pdf'),
  path.resolve('public/Cristian_Rodriguez_Process_Mining_Consultant_ES.pdf'),
);
fs.copyFileSync(
  path.join(outputDir, 'Cristian_Rodriguez_Process_Mining_Consultant_EN.pdf'),
  path.resolve('public/Cristian_Rodriguez_Process_Mining_Consultant_EN.pdf'),
);
