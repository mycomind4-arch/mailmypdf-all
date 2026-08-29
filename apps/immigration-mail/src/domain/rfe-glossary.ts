/**
 * RFE "Explain This" — Glossary system for plain-language term explanations
 *
 * Every complex term supports: What does this mean? Why does it matter?
 * What should I do? What happens if I don't? Tell me more.
 *
 * Progressive disclosure: initial explanation is simple, expandable.
 */

export interface GlossaryTerm {
  term: string;
  aliases: string[];
  shortDefinition: string;
  shortDefinitionEs?: string;
  whyItMatters: string;
  whyItMattersEs?: string;
  whatToDo: string;
  whatToDoEs?: string;
  whatHappensIfNot: string;
  whatHappensIfNotEs?: string;
  moreDetail?: string;
  moreDetailEs?: string;
}

export const RFE_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'RFE',
    aliases: ['Request for Evidence', 'request for additional evidence'],
    shortDefinition: 'A letter from USCIS asking you to send more documents or information to support your application.',
    shortDefinitionEs: 'Una carta de USCIS pidiéndole que envíe más documentos o información para respaldar su solicitud.',
    whyItMatters: 'An RFE means USCIS is still reviewing your case and needs more information to make a decision. It is not a denial.',
    whyItMattersEs: 'Un RFE significa que USCIS aún está revisando su caso y necesita más información para tomar una decisión. No es una denegación.',
    whatToDo: 'Read the RFE carefully, identify what USCIS is asking for, gather the requested documents, and respond before the deadline.',
    whatToDoEs: 'Lea el RFE cuidadosamente, identifique lo que USCIS está pidiendo, reúna los documentos solicitados y responda antes de la fecha límite.',
    whatHappensIfNot: 'If you do not respond by the deadline, USCIS may deny your application based on the evidence they already have.',
    whatHappensIfNotEs: 'Si no responde antes de la fecha límite, USCIS puede denegar su solicitud basándose en la evidencia que ya tienen.',
    moreDetail: 'An RFE is issued under 8 CFR 103.2(b)(8). It gives you a specific deadline (usually 30-90 days) to submit the requested evidence. The notice will list exactly what documents or information USCIS needs.',
    moreDetailEs: 'Un RFE se emite bajo 8 CFR 103.2(b)(8). Le da una fecha límite específica (generalmente 30-90 días) para presentar la evidencia solicitada. El aviso enumerará exactamente qué documentos o información necesita USCIS.',
  },
  {
    term: 'deadline',
    aliases: ['response deadline', 'due date', 'fecha límite'],
    shortDefinition: 'The date by which USCIS must receive your response. It is printed on your RFE.',
    shortDefinitionEs: 'La fecha límite en la que USCIS debe recibir su respuesta. Está impresa en su RFE.',
    whyItMatters: 'Missing the deadline can result in automatic denial of your application. USCIS will not extend it automatically.',
    whyItMattersEs: 'Perder la fecha límite puede resultar en la denegación automática de su solicitud. USCIS no la extenderá automáticamente.',
    whatToDo: 'Find the deadline on your RFE (usually near the top or in a highlighted section). Plan to mail your response at least a week before it.',
    whatToDoEs: 'Encuentre la fecha límite en su RFE (generalmente cerca de la parte superior o en una sección destacada). Planee enviar su respuesta por correo al menos una semana antes.',
    whatHappensIfNot: 'If USCIS does not receive your response by the deadline, they may deny your application. You would then need to file a motion or appeal, which is more difficult and costly.',
    whatHappensIfNotEs: 'Si USCIS no recibe su respuesta antes de la fecha límite, pueden denegar su solicitud. Luego tendría que presentar una moción o apelación, lo cual es más difícil y costoso.',
    moreDetail: 'The deadline is typically 30, 60, or 87 days from the date of the RFE. The exact number of days will be stated in the notice. Do not calculate it yourself — the RFE will state the actual date.',
    moreDetailEs: 'La fecha límite suele ser de 30, 60 u 87 días desde la fecha del RFE. El número exacto de días se indicará en el aviso. No lo calcule usted mismo — el RFE indicará la fecha real.',
  },
  {
    term: 'beneficiary',
    aliases: ['principal beneficiary', 'beneficiario'],
    shortDefinition: 'The person whose immigration application is being decided. If you filed for a family member, they are the beneficiary.',
    shortDefinitionEs: 'La persona cuya solicitud de inmigración está siendo decidida. Si presentó una solicitud para un familiar, esa persona es el beneficiario.',
    whyItMatters: 'The RFE may ask for evidence specifically about the beneficiary, such as their identity documents, medical exam, or relationship evidence.',
    whyItMattersEs: 'El RFE puede pedir evidencia específicamente sobre el beneficiario, como sus documentos de identidad, examen médico o evidencia de relación.',
    whatToDo: 'Make sure you know who the beneficiary is on your case. Provide documents that directly relate to them.',
    whatToDoEs: 'Asegúrese de saber quién es el beneficiario en su caso. Proporcione documentos que se relacionen directamente con ellos.',
    whatHappensIfNot: 'Submitting documents about the wrong person can delay your case or lead to a denial.',
    whatHappensIfNotEs: 'Presentar documentos sobre la persona equivocada puede retrasar su caso o llevar a una denegación.',
  },
  {
    term: 'petitioner',
    aliases: ['sponsor', 'peticionario'],
    shortDefinition: 'The person or employer who filed the immigration application on behalf of the beneficiary.',
    shortDefinitionEs: 'La persona o empleador que presentó la solicitud de inmigración en nombre del beneficiario.',
    whyItMatters: 'The RFE may ask for evidence about the petitioner, such as their financial ability to sponsor, employment, or citizenship status.',
    whyItMattersEs: 'El RFE puede pedir evidencia sobre el peticionario, como su capacidad financiera para patrocinar, empleo o estatus de ciudadanía.',
    whatToDo: 'If you are the petitioner, gather your own documents (tax returns, employment letters, proof of status) as requested.',
    whatToDoEs: 'Si usted es el peticionario, reúna sus propios documentos (declaraciones de impuestos, cartas de empleo, prueba de estatus) según lo solicitado.',
    whatHappensIfNot: 'Missing petitioner evidence can result in denial of the petition.',
    whatHappensIfNotEs: 'La falta de evidencia del peticionario puede resultar en la denegación de la petición.',
  },
  {
    term: 'evidence',
    aliases: ['supporting documents', 'documentos', 'prueba'],
    shortDefinition: 'Documents that prove what you are claiming in your application. This can include passports, birth certificates, tax returns, photos, and more.',
    shortDefinitionEs: 'Documentos que prueban lo que está afirmando en su solicitud. Pueden incluir pasaportes, certificados de nacimiento, declaraciones de impuestos, fotos y más.',
    whyItMatters: 'USCIS makes decisions based on the evidence you submit. Strong, well-organized evidence gives your case the best chance.',
    whyItMattersEs: 'USCIS toma decisiones basándose en la evidencia que presenta. Una evidencia sólida y bien organizada le da a su caso la mejor oportunidad.',
    whatToDo: 'Read your RFE to see exactly what evidence is requested. Gather original or certified copies. Organize them clearly.',
    whatToDoEs: 'Lea su RFE para ver exactamente qué evidencia se solicita. Reúna copias originales o certificadas. Organícelas claramente.',
    whatHappensIfNot: 'Without sufficient evidence, USCIS may deny your application even if you have a valid claim.',
    whatHappensIfNotEs: 'Sin evidencia suficiente, USCIS puede denegar su solicitud incluso si tiene un reclamo válido.',
  },
  {
    term: 'affidavit',
    aliases: ['affidavit of support', 'Form I-864', 'declaración jurada'],
    shortDefinition: 'A sworn, written statement that serves as evidence. In immigration, often refers to the Affidavit of Support (Form I-864).',
    shortDefinitionEs: 'Una declaración escrita bajo juramento que sirve como evidencia. En inmigración, a menudo se refiere a la Declaración de Patrocinio (Formulario I-864).',
    whyItMatters: 'An Affidavit of Support shows that the petitioner has enough income to financially support the beneficiary so they do not become a public charge.',
    whyItMattersEs: 'Una Declaración de Patrocinio muestra que el peticionario tiene suficientes ingresos para apoyar financieramente al beneficiario para que no se convierta en una carga pública.',
    whatToDo: 'If the RFE asks for an affidavit, complete Form I-864 and include supporting financial documents (tax returns, pay stubs, employment letter).',
    whatToDoEs: 'Si el RFE pide una declaración jurada, complete el Formulario I-864 e incluya documentos financieros de respaldo (declaraciones de impuestos, recibos de pago, carta de empleo).',
    whatHappensIfNot: 'Without a proper affidavit, the application may be denied for insufficient financial sponsorship.',
    whatHappensIfNotEs: 'Sin una declaración jurada adecuada, la solicitud puede ser denegada por patrocinio financiero insuficiente.',
  },
  {
    term: 'USCIS',
    aliases: ['U.S. Citizenship and Immigration Services', 'immigration office'],
    shortDefinition: 'The government agency that processes immigration applications, including green cards, citizenship, and work permits.',
    shortDefinitionEs: 'La agencia gubernamental que procesa solicitudes de inmigración, incluidas tarjetas verdes, ciudadanía y permisos de trabajo.',
    whyItMatters: 'USCIS is who sent your RFE and who will receive your response. All correspondence should be directed to them.',
    whyItMattersEs: 'USCIS es quien envió su RFE y quien recibirá su respuesta. Toda la correspondencia debe dirigirse a ellos.',
    whatToDo: 'Follow the instructions in the RFE for where to send your response. The address will be listed on the notice.',
    whatToDoEs: 'Siga las instrucciones en el RFE sobre dónde enviar su respuesta. La dirección aparecerá en el aviso.',
    whatHappensIfNot: 'Sending your response to the wrong USCIS office can delay processing or result in a denial.',
    whatHappensIfNotEs: 'Enviar su respuesta a la oficina equivocada de USCIS puede retrasar el procesamiento o resultar en una denegación.',
  },
  {
    term: 'receipt number',
    aliases: ['case number', 'MSC number', 'número de recibo'],
    shortDefinition: 'A 13-character code (3 letters + 10 digits) that identifies your case at USCIS. It is printed on your RFE.',
    shortDefinitionEs: 'Un código de 13 caracteres (3 letras + 10 dígitos) que identifica su caso en USCIS. Está impreso en su RFE.',
    whyItMatters: 'Your receipt number lets you track your case online and helps USCIS match your response to your file.',
    whyItMattersEs: 'Su número de recibo le permite rastrear su caso en línea y ayuda a USCIS a emparejar su respuesta con su expediente.',
    whatToDo: 'Find the receipt number on your RFE (usually at the top). Include it on your cover letter and all correspondence.',
    whatToDoEs: 'Encuentre el número de recibo en su RFE (generalmente en la parte superior). Inclúyalo en su carta de presentación y toda la correspondencia.',
    whatHappensIfNot: 'Without the receipt number, USCIS may not be able to match your response to your case, causing delays.',
    whatHappensIfNotEs: 'Sin el número de recibo, USCIS puede no poder emparejar su respuesta con su caso, causando retrasos.',
  },
  {
    term: 'priority date',
    aliases: ['fecha de prioridad'],
    shortDefinition: 'The date your immigration petition was filed. It determines your place in line for visa availability.',
    shortDefinitionEs: 'La fecha en que se presentó su petición de inmigración. Determina su lugar en la fila para la disponibilidad de visas.',
    whyItMatters: 'Some categories have long wait times. Your priority date determines when you can proceed with your application.',
    whyItMattersEs: 'Algunas categorías tienen tiempos de espera largos. Su fecha de prioridad determina cuándo puede proceder con su solicitud.',
    whatToDo: 'Check the current visa bulletin to see if your priority date is current. Include proof of your priority date if requested.',
    whatToDoEs: 'Revise el boletín de visas actual para ver si su fecha de prioridad está vigente. Incluya prueba de su fecha de prioridad si se solicita.',
    whatHappensIfNot: 'If your priority date is not current, your application cannot be approved even if all other evidence is perfect.',
    whatHappensIfNotEs: 'Si su fecha de prioridad no está vigente, su solicitud no puede ser aprobada incluso si toda la demás evidencia es perfecta.',
  },
  {
    term: 'biometrics',
    aliases: ['fingerprint', 'biometrics appointment', 'huellas'],
    shortDefinition: 'The process of collecting fingerprints, photos, and signatures at a USCIS Application Support Center.',
    shortDefinitionEs: 'El proceso de recopilar huellas dactilares, fotos y firmas en un Centro de Soporte de Aplicaciones de USCIS.',
    whyItMatters: 'Biometrics are required for most immigration applications. Missing the appointment can delay or deny your case.',
    whyItMattersEs: 'Las biometrías son obligatorias para la mayoría de las solicitudes de inmigración. Perder la cita puede retrasar o denegar su caso.',
    whatToDo: 'Attend your biometrics appointment on the scheduled date. Bring the appointment notice and a valid photo ID.',
    whatToDoEs: 'Asista a su cita de biometría en la fecha programada. Lleve el aviso de cita y una identificación con foto válida.',
    whatHappensIfNot: 'Missing biometrics without rescheduling can result in application denial.',
    whatHappensIfNotEs: 'Perder las biometrías sin reprogramar puede resultar en la denegación de la solicitud.',
  },
  {
    term: 'NOID',
    aliases: ['Notice of Intent to Deny', 'aviso de intención de denegar'],
    shortDefinition: 'A notice from USCIS saying they intend to deny your application, giving you a final chance to respond.',
    shortDefinitionEs: 'Un aviso de USCIS diciendo que tienen la intención de denegar su solicitud, dándole una última oportunidad para responder.',
    whyItMatters: 'A NOID is more serious than an RFE. It means USCIS has reviewed your evidence and found it insufficient.',
    whyItMattersEs: 'Un NOID es más grave que un RFE. Significa que USCIS ha revisado su evidencia y la ha encontrado insuficiente.',
    whatToDo: 'Respond immediately with strong evidence. Consider consulting an immigration attorney.',
    whatToDoEs: 'Responda inmediatamente con evidencia sólida. Considere consultar a un abogado de inmigración.',
    whatHappensIfNot: 'If you do not respond to a NOID, USCIS will deny your application.',
    whatHappensIfNotEs: 'Si no responde a un NOID, USCIS denegará su solicitud.',
  },
  {
    term: 'certified translation',
    aliases: ['certified English translation', 'traducción certificada'],
    shortDefinition: 'A translation of a foreign-language document accompanied by a signed statement from the translator.',
    shortDefinitionEs: 'Una traducción de un documento en idioma extranjero acompañada de una declaración firmada del traductor.',
    whyItMatters: 'USCIS requires all foreign-language documents to include a certified English translation. Untranslated documents may not be considered.',
    whyItmattersEs: 'USCIS requiere que todos los documentos en idioma extranjero incluyan una traducción certificada al inglés. Los documentos no traducidos pueden no ser considerados.',
    whyItMattersEs: 'USCIS requiere que todos los documentos en idioma extranjero incluyan una traducción certificada al inglés. Los documentos no traducidos pueden no ser considerados.',
    whatToDo: 'Have a competent translator translate the document and sign a certification statement. You do NOT need a professional translator.',
    whatToDoEs: 'Haga que un traductor competente traduzca el documento y firme una declaración de certificación. NO necesita un traductor profesional.',
    whatHappensIfNot: 'Documents without certified translations may be ignored by USCIS, weakening your case.',
    whatHappensIfNotEs: 'Los documentos sin traducciones certificadas pueden ser ignorados por USCIS, debilitando su caso.',
  },
];

// ─── Lookup ──────────────────────────────────────────────────────────────────

export function findGlossaryTerm(query: string): GlossaryTerm | undefined {
  const lower = query.toLowerCase().trim();
  return RFE_GLOSSARY.find(t =>
    t.term.toLowerCase() === lower ||
    t.aliases.some(a => a.toLowerCase() === lower) ||
    t.term.toLowerCase().includes(lower) ||
    lower.includes(t.term.toLowerCase())
  );
}

export function explainTerm(term: string, language: 'en' | 'es' = 'en'): {
  found: boolean;
  explanation: string;
  detail?: GlossaryTerm;
} {
  const entry = findGlossaryTerm(term);
  if (!entry) return { found: false, explanation: `I don't have a specific explanation for "${term}" yet, but I can help you understand it in context.` };
  const isEs = language === 'es';
  return {
    found: true,
    explanation: isEs
      ? `${entry.shortDefinitionEs ?? entry.shortDefinition} ${entry.whyItMattersEs ?? entry.whyItMatters}`
      : `${entry.shortDefinition} ${entry.whyItMatters}`,
    detail: entry,
  };
}
