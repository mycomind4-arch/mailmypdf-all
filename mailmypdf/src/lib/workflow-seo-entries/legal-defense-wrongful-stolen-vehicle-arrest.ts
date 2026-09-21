import type { AuthoredWorkflowSeoEntry } from ".";

const REVIEWED = "2026-09-21";

/**
 * Authority content for the Legal Defense vertical's first executable
 * workflow. Scope and boundaries follow apps/verticals/legal-defense:
 * the workflow reconstructs the record and prepares a packet for counsel.
 * It does not give legal advice, predict suppression, or contact anyone.
 */
const entry: AuthoredWorkflowSeoEntry = {
  id: "legal-defense/wrongful-stolen-vehicle-arrest",
  execution: {
    href: "/legal-defense/workflows/wrongful-stolen-vehicle-arrest/start",
    verified: true,
  },
  content: {
    primaryKeyword: "wrongful stolen vehicle arrest",
    primaryIntent:
      "Someone was arrested after police ran the car they had bought and got a stolen-vehicle hit, and now wants to reconstruct exactly what happened and preserve the purchase record before details and video disappear.",
    secondaryKeywords: [
      "arrested for a car I bought",
      "stolen vehicle hit bill of sale",
      "VIN mismatch police report",
      "vehicle still reported stolen after sale",
      "defense timeline stop arrest search",
    ],
    seoTitle: "Wrongful Stolen-Vehicle Arrest Defense Prep | MailMyPDF",
    h1: "Wrongful stolen-vehicle arrest and search defense preparation",
    metaDescription:
      "Arrested after a stolen-vehicle hit on a car you bought? Reconstruct the stop, compare VIN identifiers, preserve purchase proof, and build an attorney-ready packet.",
    overview:
      "This workflow is for the specific situation where someone bought a vehicle, was stopped by police, and was arrested because a database query returned an active stolen-vehicle record for that car. The chain it reconstructs runs from the traffic stop, through the announced stolen-vehicle basis, to the arrest, the search that followed, and any items police say they recovered during that search. Each of those links depends on the one before it, so the workflow captures them in order and in their own words rather than as a single narrative. It separates what the purchaser can document, such as the bill of sale, payment trail, keys, and transfer attempts, from what only police records can establish, such as who entered the stolen report, when it was entered, whether it was ever cancelled, and what identifiers the officers actually compared. The result is a structured record and an attorney-ready packet, not a legal opinion about the outcome.",
    issuerContext:
      "A stolen-vehicle stop typically begins with an automated or dispatch-run query against state and federal hot files rather than with an officer's independent observation. In California those queries move through CLETS, which relays to the FBI-operated National Crime Information Center vehicle file. An entry stays active until the agency that made it cancels it, so a car recovered, sold, or never actually stolen can still return a live hit months later. The agency that entered the record, the agency that ran the query, and the agency that made the arrest are frequently three different organizations, and each keeps its own records on its own retention schedule.",
    documentIdentification: [
      "Arrest report or incident report naming the arresting agency, report number, and the offense the officers booked.",
      "Vehicle hot-file return, often labeled a CLETS or NCIC response, showing the stolen entry the officers relied on.",
      "Booking or property record listing every item taken from the person and the vehicle at the time of arrest.",
      "Tow sheet and impound inventory, which record the vehicle's condition and contents independently of the arrest narrative.",
      "Citation, complaint, or charging document showing what the prosecutor actually filed, which often differs from the booking offense.",
    ],
    whenToUse: [
      "You bought the vehicle and can point to a sale, even if the paperwork is incomplete or the seller has stopped responding.",
      "Officers announced a stolen-vehicle hit during the stop and the arrest followed from that hit rather than from independent observations.",
      "A search happened after the arrest and police say they recovered an item you dispute owning, knowing about, or possessing.",
      "You want the purchase record, video, and dispatch material preserved before agency retention windows close.",
    ],
    whenNotToUse: [
      "You are the registered owner reporting the vehicle stolen; that is a police report, not a defense preparation workflow.",
      "You want an assessment of whether evidence will be suppressed or charges dismissed, which only your attorney can evaluate.",
      "You knowingly took the vehicle or have been told the paperwork was fabricated, where the workflow would be recording claims rather than facts.",
      "You need someone to contact the seller, the witnesses, or the investigating agency on your behalf.",
    ],
    inspectOnDocument: [
      "Compare the VIN on the report against the VIN on the bill of sale and the VIN physically on the dashboard and door jamb.",
      "Check whether the license plate on the stolen entry matches the plate that was on the car when it was stopped.",
      "Look for the date and time the stolen report was entered and whether any cancellation or recovery date appears.",
      "Identify which agency entered the stolen record, which may not be the agency that stopped or arrested you.",
      "Read the stated reason for the stop itself, separately from the stolen hit, because the two are distinct justifications.",
      "Note the exact sequence and timestamps for when the hit was announced, when the bill of sale was shown, and when handcuffs went on.",
    ],
    timingGuidance: [
      "Body-worn and dash camera video is usually the first thing to disappear. Many agencies overwrite non-flagged footage on a fixed cycle measured in weeks or months, so a written preservation request identifying the date, time, location, and unit numbers should go out as early as possible.",
      "Computer-aided dispatch logs and radio audio are held on their own schedule, separate from video, and are often controlled by a different agency than the one that made the arrest, so preservation has to be requested from each agency involved.",
      "Court dates arrive on the court's schedule regardless of how complete the record is. The packet is built to be useful at whatever stage the case is in, and the workflow does not calculate filing deadlines or tell anyone when a motion is due.",
      "Private-party sellers become harder to locate as time passes. Contact details, marketplace listings, and message threads should be captured while they still exist, even if nobody intends to contact the seller directly.",
    ],
    informationChecklist: [
      "Full name as it appears on the booking paperwork, the arresting agency, and the report or case number.",
      "Court, county, case number, charged offenses, custody status, and the next scheduled court date.",
      "Whether an attorney is already appointed or retained, and that attorney's name and contact information.",
      "Date, time, and location of the stop, and the reason the officer gave for making it.",
      "Year, make, model, VIN, and plate of the vehicle, exactly as shown on the car itself.",
      "Purchase date, price, payment method, and the seller's name and contact details as they were given to you.",
    ],
    evidenceChecklist: [
      "The original bill of sale, including any handwritten version, with the VIN and signatures legible.",
      "Title, pink slip, or any transfer paperwork the seller handed over, even if it was never submitted to the department of motor vehicles.",
      "Proof of payment such as a bank transfer, cash-app record, receipt, or withdrawal slip matching the purchase amount and date.",
      "The marketplace listing or advertisement the vehicle was offered through, captured as a screenshot with its URL and date.",
      "Complete text and email threads with the seller, exported rather than retyped, so timestamps and phone numbers stay attached.",
      "Photographs taken at the time of purchase showing the vehicle, the keys, the odometer, and the VIN plate.",
      "Any receipt for smog certification, insurance, registration, or a transfer appointment attempted after the purchase.",
    ],
    processSteps: [
      {
        title: "Capture the case and counsel posture",
        guidance:
          "Record the court, charges, custody status, next court date, and whether counsel is appointed or retained. This determines who receives the packet and how quickly the preservation material needs to move.",
      },
      {
        title: "Reconstruct the stop, arrest, and search in order",
        guidance:
          "Place each event on a single timeline with times where they are known and explicit gaps where they are not. The order in which the hit, the bill of sale, and the handcuffs occurred is frequently the disputed point.",
      },
      {
        title: "Document the purchase provenance",
        guidance:
          "Build the ownership chain from the advertisement through payment, key handover, and any transfer attempt, attaching the underlying records rather than summarizing them. Unknowns stay marked as unknown instead of being filled in.",
      },
      {
        title: "Record the stated police basis and compare identifiers",
        guidance:
          "Capture what officers said they relied on, then compare the VIN and plate across the vehicle, the bill of sale, and the report. Identifier mismatches are recorded as differences observed, not as conclusions about the arrest.",
      },
      {
        title: "Trace the search and examine the recovered-item allegation",
        guidance:
          "Note the type of search, where the item was reportedly found, who it is attributed to, and whether it was photographed, tested, or logged. Each answer is stored with its own certainty level.",
      },
      {
        title: "Inventory evidence and map what must be preserved",
        guidance:
          "Mark which records are already in hand and which exist only in agency custody, producing a preservation and discovery matrix that names the holder of each item so requests can be directed correctly.",
      },
      {
        title: "Assess the seller scenarios the record actually supports",
        guidance:
          "Weigh explanations such as a legitimate sale, a broken title chain, a fraudulent seller, upstream theft, or a report filed after the sale, and identify which are consistent with the documented facts.",
      },
      {
        title: "Review contradictions and generate the packet",
        guidance:
          "Surface internal contradictions, unanswered questions, and gaps for counsel, then produce the defense intelligence packet with its exhibits, timeline, and provenance graph attached.",
      },
    ],
    issuesChecked: [
      "Whether the VIN or plate on the stolen entry actually matches the vehicle that was stopped.",
      "Whether the stolen report was entered before or after the documented purchase date.",
      "Whether officers reviewed the bill of sale before the arrest, after it, or not at all.",
      "Whether the stated reason for the stop is independent of the stolen-vehicle hit.",
      "Whether the search is described consistently across the report, the property log, and the impound inventory.",
      "Whether the disputed item is attributed to a person or only to a location in the vehicle.",
      "Whether dispatch confirmed the hit with the entering agency before the arrest was made.",
    ],
    commonMistakes: [
      "Retyping text messages instead of exporting them, which strips the timestamps and phone numbers that make the thread verifiable.",
      "Waiting for the next court date before requesting video preservation, by which point routine overwrite cycles may already have run.",
      "Filling in an approximate time for the arrest or the search because the exact time is not remembered, which creates a contradiction with the report later.",
      "Assuming the agency that entered the stolen record is the same agency that made the arrest, and sending every request to the wrong place.",
      "Treating a VIN mismatch as proof that the case is over rather than as one documented difference among several that counsel needs to evaluate.",
      "Discarding the tow sheet or impound inventory as paperwork, when it independently records the vehicle's contents and condition.",
      "Contacting the seller directly to demand an explanation, which can complicate the case and is outside what this workflow does.",
    ],
    scenarios: [
      {
        title: "Private sale never transferred at the department of motor vehicles",
        situation:
          "A buyer paid cash for a car through an online marketplace, received the keys and a signed bill of sale, but had not completed the title transfer when the stop occurred several weeks later.",
        responsePath:
          "The workflow preserves the listing, the payment trail, the message thread, and the purchase photographs, records that no transfer was completed and why, and flags the registration gap as an issue for counsel rather than treating it as evidence of theft.",
      },
      {
        title: "Stolen report never cancelled after the vehicle was recovered",
        situation:
          "The vehicle had been reported stolen a year earlier, was recovered and returned to its owner, and was later sold, but the original hot-file entry was never cancelled by the entering agency.",
        responsePath:
          "The workflow records the entry and any recovery date from the return, identifies the entering agency as distinct from the arresting agency, and builds a preservation request aimed at the records that would show when the entry was made and whether it was ever updated.",
      },
      {
        title: "Identifier mismatch between the report and the vehicle",
        situation:
          "The VIN printed on the arrest report differs in several characters from the VIN on the dashboard and the bill of sale, and the plate on the stolen entry belongs to a different vehicle entirely.",
        responsePath:
          "The workflow captures all three identifier sources side by side with photographs of the physical plate, documents the differences without characterizing their legal effect, and routes the comparison into the packet for the attorney to evaluate.",
      },
      {
        title: "Item recovered during the post-arrest search",
        situation:
          "After the arrest, officers searched the car and reported finding a pipe in a location the driver says they never used, in a vehicle that had been in the seller's possession days earlier.",
        responsePath:
          "The workflow records where the item was reportedly found, whether it was photographed, whether residue was tested, and whether the chain of custody is documented, and preserves the prior-possession timeline without asserting whose item it was.",
      },
    ],
    responsePaths: [
      "Deliver the packet to appointed or retained counsel as background material for the defense, which is the primary intended path.",
      "Use the preservation and discovery matrix to direct written record requests to each agency that actually holds the material.",
      "Hold the packet as a personal record of the purchase and the stop while the case proceeds, without sending it anywhere.",
      "Return to the workflow as new records arrive, updating the timeline and provenance graph so the packet reflects the current record.",
    ],
    packetContents: [
      "A stop, arrest, and search timeline showing sequence, known times, and explicitly marked gaps.",
      "A vehicle provenance graph tracing the ownership chain from the advertisement through payment and key handover.",
      "An identifier comparison table placing the vehicle, bill of sale, and report VIN and plate values side by side.",
      "An evidence dependency tree showing which conclusions rest on which underlying records.",
      "A preservation and discovery matrix naming each item, its likely holder, and whether it is already in hand.",
      "A seller-scenario assessment listing the explanations the documented record supports and those it does not.",
      "A contradictions and open-questions section written for counsel review rather than for filing.",
    ],
    submissionGuidance: [
      "The packet is prepared for delivery to an attorney and is not filed with the court by this workflow. Nothing in it is submitted, served, or sent to an agency automatically, and no motion is drafted or filed on anyone's behalf.",
      "When records need to be requested from an agency, the preservation matrix identifies the holder so the request can be addressed correctly. Requests to separate agencies generally have to be made separately even when they concern the same incident.",
      "If the packet is mailed to counsel, the mailing record and any available tracking are retained alongside the document so the delivery is evidenced, and the approved packet is stored exactly as it was reviewed.",
    ],
    practicalChecklist: [
      "Photograph the VIN plate on the dashboard and the sticker in the door jamb before the vehicle is released or sold.",
      "Export the seller message thread to a file rather than screenshotting individual messages out of order.",
      "Write down the arresting agency, report number, and tow company from the paperwork received at release.",
      "Note the unit numbers or officer names visible on the citation, since preservation requests reference specific units.",
      "Record what is genuinely not remembered as unknown, because an invented time is worse than an acknowledged gap.",
      "Give counsel the packet and the underlying files together, so exhibits can be traced back to their sources.",
    ],
    templatesAndTools: [
      "A guided nine-step intake covering case posture, timeline, purchase provenance, police basis, search, evidence, seller scenarios, issue review, and packet generation.",
      "An evidence inventory listing the records this fact pattern commonly depends on, from bill of sale and payment trail through dispatch audio, body-camera video, and impound inventory.",
      "A defense intelligence packet generator that assembles the timeline, provenance graph, identifier comparison, and preservation matrix into a single reviewable document.",
    ],
    faqs: [
      {
        question: "Does a bill of sale mean the arrest was unlawful?",
        answer:
          "Not on its own. A bill of sale is evidence about the purchase, but whether an arrest was lawful depends on what the officers knew at the time and how a court evaluates it. This workflow documents the purchase and the sequence; your attorney evaluates the legal consequence.",
      },
      {
        question: "Why is the car still showing as stolen if I bought it legitimately?",
        answer:
          "A hot-file entry stays active until the agency that created it cancels it. A vehicle that was recovered, returned, or never actually stolen can still return a live hit if nobody updated the record, which is why the workflow separates the entering agency from the arresting agency.",
      },
      {
        question: "What should I preserve first?",
        answer:
          "Video is usually the most perishable. Body-worn and dash camera footage is frequently overwritten on a fixed cycle unless it has been flagged, so a written preservation request identifying the date, time, location, and units involved is the most time-sensitive step.",
      },
      {
        question: "Will this workflow file a motion or contact the seller for me?",
        answer:
          "No. It does not file anything, does not contact sellers, witnesses, or law enforcement, and does not draft motions. It reconstructs the record and produces a packet for a licensed attorney to review and act on.",
      },
      {
        question: "Does this work outside California?",
        answer:
          "The reviewed authority pack is California-specific. The timeline, provenance, and preservation structure applies generally, but the workflow warns when another jurisdiction is selected and will not supply that state's deadlines, procedures, or citations.",
      },
      {
        question: "What if I do not remember the exact times?",
        answer:
          "Record them as unknown. The workflow is built to carry explicit gaps, and an acknowledged gap is more useful to counsel than an approximate time that later contradicts the report, the dispatch log, or the video.",
      },
      {
        question: "Can this tell me whether the search will be thrown out?",
        answer:
          "No. It identifies the facts and the contradictions in the record around the search, including sequence and attribution, but it does not predict suppression, assess the strength of any motion, or offer a conclusion about the outcome.",
      },
    ],
    glossary: [
      {
        term: "CLETS",
        definition:
          "The California Law Enforcement Telecommunications System, the state network officers use to run vehicle and person queries and which relays to federal databases.",
      },
      {
        term: "NCIC vehicle file",
        definition:
          "The FBI-operated National Crime Information Center file that holds stolen-vehicle entries made by local agencies and returns them nationwide until cancelled.",
      },
      {
        term: "Hot-file hit",
        definition:
          "A positive return from a stolen-vehicle or wanted-person database query, which is a database result rather than an independent confirmation that the entry is current.",
      },
      {
        term: "ALPR",
        definition:
          "Automated license plate recognition, camera systems that read plates and can generate an alert before any officer has observed the vehicle directly.",
      },
      {
        term: "CAD log",
        definition:
          "The computer-aided dispatch record of a call, holding the timestamps, unit assignments, and query results generated during the stop.",
      },
      {
        term: "Provenance chain",
        definition:
          "The documented sequence of how the vehicle moved from the seller to the buyer, including advertisement, payment, key handover, and any transfer attempt.",
      },
    ],
    sources: [
      {
        title: "Vehicle Titles",
        publisher: "California Department of Motor Vehicles",
        url: "https://www.dmv.ca.gov/portal/vehicle-registration/titles/",
        reviewedAt: REVIEWED,
        kind: "regulator",
      },
      {
        title: "Title Transfers",
        publisher: "California Department of Motor Vehicles",
        url: "https://www.dmv.ca.gov/portal/vehicle-registration/title-transfers/",
        reviewedAt: REVIEWED,
        kind: "regulator",
      },
      {
        title: "Vehicle Code Section 10851, Unlawful Taking or Driving of a Vehicle",
        publisher: "California Legislative Information",
        url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=10851",
        reviewedAt: REVIEWED,
        kind: "primary",
      },
      {
        title: "Criminal Law Self-Help",
        publisher: "Judicial Council of California",
        url: "https://selfhelp.courts.ca.gov/criminal-law",
        reviewedAt: REVIEWED,
        kind: "official",
      },
    ],
    relatedWorkflowIds: [
      "records/public-records-request",
      "records/agency-records-request",
      "records/records-request",
      "records/follow-up",
    ],
    reviewedAt: REVIEWED,
    disclaimer:
      "MailMyPDF is not a law firm and does not provide legal advice or representation. This workflow organizes facts and records you supply into a packet for review by a licensed attorney. It does not predict case outcomes, evaluate whether evidence will be suppressed, or file anything with a court.",
  },
};

export default entry;
