/* Liberty Living Homecare — Staff Training Hub course content.
   Plain data module. Sets window.LLH_COURSES (catalog), window.LLH_PATHMAP
   (role pathways -> course ids + seeded completion) and window.LLH_STAFF
   (sample staff for the monitoring view). Grounded in Liberty's policies. */
(function () {
  // block helpers make the catalog terse: p=paragraph, l=list, tip, warn, step-list
  var P = function (t) { return { k: 't', t: t }; };
  var L = function (arr) { return { k: 'l', items: arr }; };
  var TIP = function (t) { return { k: 'tip', t: t }; };
  var WARN = function (t) { return { k: 'warn', t: t }; };
  var SCN = function (title, situation, action, why) { return { k: 'scn', title: title, situation: situation, action: action, why: why }; };
  var FLOW = function (steps) { return { k: 'flow', steps: steps }; };
  function C(o) { return o; } // identity, for readability

  var COURSES = {
    /* ================= HEALTHCARE ASSISTANT (front-line, in the home) ================= */
    carevisit: C({
      title: "Delivering a safe, person-centred care visit", cat: "Care delivery", policy: "CARE-08 · CARE-27 · SOP-017", duration: "30 min", format: "E-learning",
      summary: "The anatomy of a good home visit — arrive prepared, follow the care plan, enable rather than do-for, record what you did and leave the person safe.",
      objectives: ["Prepare for a visit and check the care plan", "Deliver care the plan way, at the person's pace", "Enable independence rather than take over", "Record contemporaneously and leave the home safe"],
      lessons: [
        { t: "Before you knock", b: [
          P("Every visit is built on the care plan (CARE-08). It tells you what this person needs, how they like it done, what they can do themselves and what to watch for. Read it — never assume."),
          L(["Check the visit on Careplanner and the tasks due.", "Bring your ID, PPE and anything the plan calls for.", "Clock in when you arrive so the office knows you are safe and on time (SOP-017)."]),
          TIP("If the plan and what you find don't match — the person seems more unwell, or a task no longer fits — that is a change worth reporting, not something to just work around.") ] },
        { t: "During the visit — enable, don't take over", b: [
          P("Person-centred enablement (CARE-27) means doing things WITH people, not FOR them. Support the person to do what they can, at their pace, the way they choose."),
          L(["Greet by name, explain what you are there to do and gain consent before each task.", "Follow the plan; work at the person's pace.", "Encourage them to do the steps they are able to.", "Watch for changes — skin, mood, appetite, mobility, environment."]),
          WARN("Never rush a person or do a task they haven't agreed to. Care given without consent or against the person's wishes is not care — it is a rights breach.") ] },
        { t: "Before you leave", b: [
          P("Leave the person safe, comfortable and able to reach what they need. Record what you actually did, factually and at the time — not from memory hours later."),
          L(["Check the person is safe: call bell/phone in reach, hazards cleared, heating/food as needed.", "Complete the care/record sheet contemporaneously.", "Report anything you were worried about to the office before you leave.", "Clock out."]),
          SCN("The plan says shower, but today she says no",
            "You arrive to help Mrs D shower as the plan states. Today she is adamant she does not want one. What do you do?",
            "Respect her choice — a person with capacity can decline any element of care (CARE-02/CARE-06). Offer an alternative (a wash), explain gently why a shower was planned, and never force it. Record that she declined and why, and report it to the office so the plan and any pattern can be reviewed.",
            "Consent is ongoing and specific. A signed care plan does not override a clear 'no' in the moment.") ] }
      ],
      quiz: [
        { q: "The care plan says one thing but the person seems more unwell than it describes. You should:", o: ["Follow the plan exactly — it is the authority", "Do what you think is best and say nothing", "Provide safe care and report the change to the office so the plan can be reviewed"], a: 2 },
        { q: "Person-centred enablement (CARE-27) means:", o: ["Doing everything for the person to save time", "Supporting the person to do what they can, their way, at their pace", "Only doing the tasks you personally think matter"], a: 1 },
        { q: "Records of what you did on a visit should be:", o: ["Written at the end of the week from memory", "Contemporaneous — factual and at the time", "Optional if the visit was routine"], a: 1 }
      ]
    }),
    consent: C({
      title: "Consent, choice & mental capacity", cat: "Rights", policy: "CARE-06 · CARE-02", duration: "25 min", format: "E-learning",
      summary: "Gain valid consent for every task, understand capacity, and know what to do when someone cannot decide or refuses care.",
      objectives: ["Gain valid, ongoing consent before care", "Understand capacity and that it is decision-specific", "Respond correctly to a refusal", "Know the difference between an unwise choice and a lack of capacity"],
      lessons: [
        { t: "What valid consent looks like", b: [
          P("Consent must be given freely, by a person who has the relevant information and the capacity to decide (CARE-06). It is specific to the task and it is ongoing — you seek it each time, not once."),
          L(["Explain what you are going to do and why, in plain words.", "Check the person agrees before you start.", "Watch for non-verbal signals — pulling away or distress is a withdrawal of consent.", "A person can change their mind at any point."]),
          TIP("Consent can be verbal or non-verbal (holding out an arm). What matters is that it is informed and freely given.") ] },
        { t: "Capacity and refusal", b: [
          P("Capacity is decision-specific and can change through the day. A person may be able to decide about a cup of tea but not a complex matter — and may be clearer in the morning than the evening. Assume capacity unless there is reason to doubt it (Assisted Decision-Making (Capacity) Act)."),
          L(["A person with capacity can make what looks like an unwise choice — that is their right (CARE-02).", "If someone refuses, stop, respect it, offer alternatives, and record and report it.", "If you doubt someone's capacity for a decision, do not proceed as if they consented — report to the coordinator/Clinical Lead."]),
          WARN("Never trick, pressure or 'just get on with it' when a person resists. That can be abuse. Step back and escalate.") ] }
      ],
      quiz: [
        { q: "A service user with capacity refuses a task in their care plan. You should:", o: ["Do it anyway — it is in the plan", "Respect the refusal, offer alternatives, record and report it", "Refuse to return until they comply"], a: 1 },
        { q: "Mental capacity is:", o: ["Fixed — someone either has it or never does", "Decision-specific and can change over time", "Decided by the carer on the day"], a: 1 },
        { q: "A person making a choice you think is unwise:", o: ["Means they lack capacity", "Is their right if they have capacity", "Should be overridden for their own good"], a: 1 }
      ]
    }),
    dignity: C({
      title: "Dignity, autonomy & service user rights", cat: "Rights", policy: "CARE-02 · CARE-27", duration: "20 min", format: "E-learning",
      summary: "Uphold privacy, dignity, choice and independence in someone's own home — the rights that sit underneath everything you do.",
      objectives: ["Protect privacy and dignity in personal care", "Support choice, control and independence", "Recognise and challenge undignified practice", "Treat the home as the person's own space"],
      lessons: [
        { t: "Their home, their rules", b: [
          P("You are a guest in someone's home. Autonomy and rights (CARE-02) mean the person stays in control of their own life, space and routine — you fit around them, not the other way round."),
          L(["Knock, wait, and be invited in.", "Ask how they like things done and follow it.", "Respect their belongings, culture, faith and routines.", "Offer choices at every step — what to wear, eat, the order of tasks."]) ] },
        { t: "Dignity in practice", b: [
          P("Dignity is mostly small things done consistently — closing the curtains, covering the person during personal care, not talking over them, using the name they prefer."),
          L(["Keep the person covered and doors/curtains closed during intimate care.", "Talk WITH the person, never about them as if they aren't there.", "Never rush, tut, or make someone feel a burden.", "Protect confidentiality — what you see and hear stays private."]),
          SCN("Two carers talking over someone",
            "On a double-up call your colleague chats to you about their weekend across the service user as you both provide care, ignoring her.",
            "Bring the person back into the room — talk to her, explain each step, involve her. Afterwards, quietly tell your colleague why it matters. If it continues, report it: being ignored in your own care is an affront to dignity.",
            "Dignity is protected by everyone present. Staying silent makes you part of the problem.") ] }
      ],
      quiz: [
        { q: "You are in a service user's home. You should treat the space as:", o: ["A workplace where staff set the rules", "The person's own home, where they stay in control", "Somewhere to get tasks done as fast as possible"], a: 1 },
        { q: "Which best protects dignity during personal care?", o: ["Working quickly with the door open to save time", "Keeping the person covered, doors closed, and explaining each step", "Chatting to a colleague while you work"], a: 1 },
        { q: "Confidentiality means what you see and hear in the home is:", o: ["Fine to share with friends if no names are used", "Kept private and only shared with the team on a need-to-know basis", "Something to post about if it's funny"], a: 1 }
      ]
    }),
    personalcare: C({
      title: "Personal & intimate care with dignity", cat: "Care delivery", policy: "CARE-33 · HS-34 · HS-15", duration: "30 min", format: "E-learning",
      summary: "Deliver personal and intimate care safely, hygienically and with the person's dignity and consent at the centre.",
      objectives: ["Prepare and consent before intimate care", "Protect privacy and dignity throughout", "Apply hand hygiene and infection control", "Observe skin and report concerns"],
      lessons: [
        { t: "Preparing for intimate care", b: [
          P("Personal and intimate care (CARE-33) is where dignity and consent matter most. Plan it, explain it, and gain agreement before you start."),
          L(["Gather everything you need first so the person is never left exposed or waiting.", "Explain what you will do and gain consent.", "Ensure privacy — doors closed, curtains drawn, person covered.", "Wash your hands and put on gloves/apron (HS-34, HS-15)."]) ] },
        { t: "During and after", b: [
          P("Work gently, at the person's pace, keeping them covered and involved. Personal care is a chance to observe skin and wellbeing — you are often the first to notice a problem."),
          L(["Keep the person covered except the area you are caring for.", "Watch skin for redness, breaks or pressure marks — report anything new.", "Encourage the person to do what they can.", "Dispose of waste, remove PPE and wash hands; help the person get comfortable."]),
          WARN("Any redness that doesn't fade, a skin break, or a bruise you can't explain must be reported the same day — it can be an early pressure injury or a safeguarding sign.") ] }
      ],
      quiz: [
        { q: "Before starting intimate care you should:", o: ["Begin quickly to reduce embarrassment", "Gather what you need, explain, gain consent and ensure privacy", "Wait for the person to ask"], a: 1 },
        { q: "You notice new redness that doesn't fade over a bony area. You should:", o: ["Ignore it if the person isn't complaining", "Report it the same day — it may be an early pressure injury", "Wait to see if it's still there next week"], a: 1 },
        { q: "During intimate care the person should be:", o: ["Fully uncovered for efficiency", "Kept covered except the area being cared for", "Left alone to manage"], a: 1 }
      ]
    }),
    medsupport: C({
      title: "Supporting medication safely", cat: "Care delivery", policy: "CARE-20 · SOP-003", duration: "30 min", format: "E-learning",
      summary: "Know your level of medication support, apply the rights of administration, and respond correctly to a missed dose, refusal or error.",
      objectives: ["Know the levels of medication support and your limits", "Apply the rights of medication support", "Record on the MAR contemporaneously", "Respond correctly to a refusal, missed dose or error"],
      lessons: [
        { t: "Your role and its limits", b: [
          P("Medication support (CARE-20) ranges from prompting, to assisting, to administering — and your care plan sets exactly which level applies for this person. Never work above your assessed level or competency."),
          L(["Prompt: remind and observe.", "Assist: help the person take their own medication.", "Administer: give the medication (only if trained and the plan says so).", "The MAR chart is the record and the instruction — follow it exactly."]),
          TIP("The rights: right person, right medication, right dose, right route, right time — and right to refuse. Check them every time.") ] },
        { t: "When something isn't right", b: [
          P("Refusals, missed doses and errors happen. What matters is that you never cover them up — you record and report immediately so the person stays safe."),
          L(["Refusal: never force it. Record it, and report so it can be followed up.", "Missed/wrong dose or a suspected error: report to the office/on-call at once and record it as an incident (QA-13).", "Never give medication you are unsure about, or that isn't clearly prescribed on the MAR."]),
          WARN("A medication error concealed is a safeguarding and safety matter. Reporting quickly protects the person; hiding it endangers them.") ] }
      ],
      quiz: [
        { q: "Your care plan says 'prompt' but the person can't manage today and asks you to give it. You should:", o: ["Administer it — they asked you to", "Only work to your assessed level; contact the office for guidance", "Leave without the medication being taken and say nothing"], a: 1 },
        { q: "A service user refuses their medication. You should:", o: ["Hide it in food so they take it", "Respect the refusal, record it and report for follow-up", "Insist until they take it"], a: 1 },
        { q: "You realise you gave the wrong dose. You should:", o: ["Wait and see if anything happens", "Report to the office/on-call at once and record an incident", "Correct the MAR so it looks right"], a: 1 }
      ]
    }),
    handling: C({
      title: "Moving & handling people safely", cat: "Health & safety", policy: "HS-18", duration: "30 min", format: "Practical + E-learning",
      summary: "Protect the person and your own back — follow the handling plan, use equipment correctly, and never improvise a risky lift.",
      objectives: ["Follow the moving & handling risk assessment", "Use hoists and aids correctly", "Protect your own back", "Know when to stop and call for help"],
      lessons: [
        { t: "The handling plan comes first", b: [
          P("Every person who needs support to move has a moving & handling risk assessment (HS-18). It states the method, the equipment and how many carers are needed. It exists to keep them and you safe."),
          L(["Read the handling plan before you move anyone.", "Use the stated equipment (hoist, slide sheet, belt) and the stated number of staff.", "Check equipment is serviced and slings are the right size and undamaged.", "Never freestyle a lift or 'drag' someone because you're in a hurry."]),
          WARN("Manual lifting of a person is not permitted where the plan requires equipment or a second carer. If you can't do it safely, stop and call the office.") ] },
        { t: "Protecting your own back", b: [
          P("Poor technique injures carers for life. Good technique and the right equipment protect you across a whole career."),
          L(["Stable base, bend the knees not the back, keep loads close, avoid twisting.", "Clear the space and plan the move before you start.", "Communicate with the person and any second carer — move on a clear count.", "Report faulty equipment and any near miss or strain."]) ] }
      ],
      quiz: [
        { q: "The handling plan says two carers and a hoist, but you are alone and running late. You should:", o: ["Do it yourself carefully this once", "Not attempt it — contact the office to arrange safe cover", "Ask the person to help take their own weight"], a: 1 },
        { q: "A safe lifting technique includes:", o: ["Bending from the back with straight legs", "A stable base, bending the knees, load close, no twisting", "Moving as fast as possible"], a: 1 },
        { q: "A sling looks frayed. You should:", o: ["Use it gently just for today", "Not use it — report it and use safe alternative arrangements", "Cut off the frayed part"], a: 1 }
      ]
    }),
    ipc: C({
      title: "Infection prevention & hand hygiene", cat: "Health & safety", policy: "HS-15 · HS-34", duration: "25 min", format: "E-learning",
      summary: "Break the chain of infection in the home — hand hygiene, PPE, and safe handling of waste and laundry.",
      objectives: ["Perform hand hygiene at the right moments", "Use PPE correctly", "Handle waste, spills and laundry safely", "Protect vulnerable people from infection"],
      lessons: [
        { t: "Hand hygiene — the single most important thing", b: [
          P("Most infections in home care are spread on hands. Hand hygiene (HS-34) at the right moments protects people who are often frail and vulnerable."),
          L(["Clean hands before and after every care task, after gloves, and after any contact with body fluids.", "Soap and water for visibly dirty hands or certain infections; alcohol gel otherwise.", "Cover cuts, keep nails short, bare below the elbow.", "Follow the technique — palms, backs, between fingers, thumbs, tips."]) ] },
        { t: "PPE, waste and outbreaks", b: [
          P("Gloves and aprons protect both of you; use them for the right tasks and dispose of them properly. In an outbreak (e.g. D&V or flu) follow the enhanced precautions in HS-15."),
          L(["Right PPE for the task; change between tasks and people.", "Bag and dispose of waste and soiled items per the plan; deal with spills promptly.", "If you or the person has symptoms of an infection, report it — you may need to protect other visits.", "Never go to a vulnerable person's home with a transmissible illness without reporting first."]),
          TIP("You visit several homes a day. Good IPC stops you carrying an infection from one vulnerable person to the next.") ] }
      ],
      quiz: [
        { q: "The most important action to prevent infection is:", o: ["Wearing gloves for everything", "Hand hygiene at the right moments", "Opening windows"], a: 1 },
        { q: "After removing gloves you should:", o: ["Move straight to the next task", "Clean your hands", "Reuse them if they look clean"], a: 1 },
        { q: "You have diarrhoea and vomiting the morning of your visits. You should:", o: ["Go in as normal", "Report it before visiting — you could infect vulnerable people", "Just wash your hands more"], a: 1 }
      ]
    }),
    fallsprev: C({
      title: "Falls prevention & responding to a fall", cat: "Health & safety", policy: "CARE-32 · SOP-004", duration: "30 min", format: "E-learning",
      summary: "Reduce the risk of falls in the home, and respond safely and correctly if someone falls on your visit.",
      objectives: ["Spot and reduce falls hazards", "Support safe mobility", "Respond correctly to a fall (never lift a fallen person unsafely)", "Report and record every fall"],
      lessons: [
        { t: "Preventing falls", b: [
          P("Falls are a leading cause of harm for the people you support (CARE-32). Much of prevention is noticing and acting on small things in the home."),
          L(["Clear trip hazards — rugs, trailing leads, clutter, spills.", "Make sure walking aids are within reach and used.", "Good lighting; footwear on; call aids reachable.", "Report new unsteadiness, dizziness or a near miss — it often comes before a serious fall."]) ] },
        { t: "If someone falls (SOP-004)", b: [
          P("If you arrive to, or witness, a fall — make safe first, do not rush to lift. The wrong move can cause serious harm."),
          FLOW([
            { n: "1", role: "HCA", tf: "Immediately", action: "Do not lift. Check for danger, response and injury. If serious injury, head injury, unconsciousness or severe pain — call 999/112." },
            { n: "2", role: "HCA", tf: "Straight after", action: "Reassure and keep the person warm and still. Only assist to move if you are trained, it is safe, and there is no sign of injury." },
            { n: "3", role: "HCA → Office/On-call", tf: "Same visit", action: "Ring the office or on-call. They log it and arrange any clinical help and follow-up (SOP-004)." },
            { n: "4", role: "HCA", tf: "Before leaving", action: "Complete an incident report (QA-13) and record what happened factually." }
          ]),
          WARN("Never haul a fallen person up quickly. A fracture or head injury can be made far worse. Make safe, assess, and get help.") ] }
      ],
      quiz: [
        { q: "You arrive and the person is on the floor, in pain and can't move a leg. You should:", o: ["Lift them into the chair quickly", "Not move them, call 999/112, reassure and ring the office", "Leave and come back later"], a: 1 },
        { q: "Which reduces falls risk on a visit?", o: ["Tucking the walking frame away to clear space", "Clearing trip hazards and keeping aids within reach", "Dimming the lights"], a: 1 },
        { q: "After any fall you must:", o: ["Only mention it if there's an injury", "Report and complete an incident record", "Tell the family and no one else"], a: 1 }
      ]
    }),
    dementiacare: C({
      title: "Dementia care & responsive behaviour", cat: "Care delivery", policy: "CARE-26 · HS-07", duration: "30 min", format: "E-learning",
      summary: "Support people living with dementia with patience and understanding, and respond safely and kindly to distress or responsive behaviour.",
      objectives: ["Communicate well with a person living with dementia", "See behaviour as communication", "De-escalate distress safely (HS-07)", "Keep the person and yourself safe and report concerns"],
      lessons: [
        { t: "Connecting, not correcting", b: [
          P("Dementia care (CARE-26) is about meeting the person where they are. Arguing with or 'correcting' someone's reality usually increases distress."),
          L(["Approach calmly from the front, make eye contact, use short simple sentences.", "Give time to respond; don't rush.", "Enter their reality rather than correcting it; validate the feeling.", "Use routine and familiar things to reassure."]) ] },
        { t: "Responsive behaviour is communication", b: [
          P("Behaviour that seems difficult — agitation, resistance, calling out — is usually an unmet need or distress being communicated (HS-07). Your job is to look for the why."),
          L(["Check for pain, hunger, thirst, needing the toilet, too hot/cold, noise, fear.", "Stay calm, lower your voice, give space, remove triggers.", "Never argue, restrain or force — step back and keep everyone safe.", "Report new or escalating behaviour so support and the plan can change."]),
          SCN("He thinks you're an intruder",
            "Mr F becomes frightened and shouts at you to get out, not recognising you today.",
            "Don't argue or insist. Step back, keep calm and non-threatening, give space and reassure gently from a distance. If he stays distressed or there's a risk to either of you, withdraw to safety and ring the office/on-call. Record it and report so his support can be reviewed.",
            "Safety and de-escalation come before completing tasks. Forcing care on a frightened person can cause harm and is never acceptable.") ] }
      ],
      quiz: [
        { q: "A person with dementia insists on something that isn't true. The best response is usually to:", o: ["Correct them firmly with the facts", "Validate the feeling and gently reassure, not argue", "Ignore them and carry on"], a: 1 },
        { q: "'Responsive behaviour' such as agitation is best understood as:", o: ["The person being deliberately difficult", "Communication of an unmet need or distress", "A reason to restrain them"], a: 1 },
        { q: "A service user becomes frightened and aggressive. You should:", o: ["Hold them still until they calm down", "Stay calm, give space, keep safe, withdraw if needed and report", "Raise your voice to take control"], a: 1 }
      ]
    }),
    loneworking: C({
      title: "Lone working & staying safe in the community", cat: "Health & safety", policy: "HS-16 · HS-24", duration: "25 min", format: "E-learning",
      summary: "Protect yourself as a lone worker — plan your visits, stay in contact, assess the home environment, and know how to raise the alarm.",
      objectives: ["Apply lone-worker precautions (HS-16)", "Assess environmental risk in the home (HS-24)", "Stay in contact and raise the alarm", "Know your right to withdraw from danger"],
      lessons: [
        { t: "Working alone, safely", b: [
          P("Most of your visits are alone in other people's homes. The Lone Worker Policy (HS-16) is there to make sure someone always knows where you are and that you can get help fast."),
          L(["Follow your schedule and clock in/out so the office knows your movements.", "Keep your phone charged and on you.", "Know how to raise the alarm and the on-call number (01-416-3717).", "Tell the office promptly if you can't get access or something feels wrong."]) ] },
        { t: "Environment and your right to be safe", b: [
          P("You also assess the environment (HS-24) — for the person's safety and your own. You are never required to put yourself in danger."),
          L(["Watch for hazards: faulty heating, aggressive animals, unsafe visitors, intimidation.", "If you feel unsafe, you may withdraw — leave and ring the office/on-call.", "Report environmental risks so they can be assessed and controlled.", "Trust your instincts; your safety is not negotiable."]),
          WARN("If you ever feel threatened in a home, you do not have to stay to finish the visit. Leave, get to safety, and report immediately.") ] }
      ],
      quiz: [
        { q: "Clocking in and out matters because:", o: ["It's just for pay", "It lets the office know where you are and that you're safe", "It's optional for experienced staff"], a: 1 },
        { q: "You feel genuinely threatened during a visit. You should:", o: ["Stay and finish the tasks", "Leave, get to safety and report to the office/on-call", "Argue your point"], a: 1 },
        { q: "You spot a serious environmental hazard in the home. You should:", o: ["Ignore it if it's not your job", "Report it so it can be assessed and controlled", "Fix the wiring yourself"], a: 1 }
      ]
    }),
    boundaries: C({
      title: "Professional boundaries & conduct", cat: "Rights", policy: "HR-38 · CARE-17 · CARE-09", duration: "25 min", format: "E-learning",
      summary: "Keep the caring relationship safe and professional — gifts and money, social contact, confidentiality, and knowing when a kindness crosses a line.",
      objectives: ["Understand professional boundaries (HR-38)", "Handle money, gifts and property correctly", "Keep social media and personal contact appropriate", "Recognise and report boundary and financial concerns"],
      lessons: [
        { t: "Where the line is", b: [
          P("A warm relationship is part of good care — but it must stay professional (HR-38). Boundaries protect the person (who is often vulnerable) and protect you."),
          L(["Don't give or accept gifts, tips or loans; explain kindly why you can't.", "Don't share your personal contact details or connect on social media.", "Don't do favours outside the care plan without agreement from the office.", "Keep everything you learn confidential."]) ] },
        { t: "Money, property and financial abuse", b: [
          P("Handling a person's money and property is tightly controlled (CARE-17) because it is where financial abuse (CARE-09) happens. Protect yourself with clear records."),
          L(["Only handle money if the plan says so, and always record it and keep receipts.", "Never use a person's bank card, PIN or accounts for anything outside the agreed task.", "Report any concern that someone (staff, family or other) may be financially exploiting a person.", "If you're ever unsure whether something is appropriate — ask your coordinator first."]),
          WARN("Borrowing money, accepting a valuable gift, or being added to a will are serious boundary breaches and can be financial abuse. Report, don't accept.") ] }
      ],
      quiz: [
        { q: "A service user offers you a generous cash tip. You should:", o: ["Accept it quietly", "Decline kindly, explain why, and record/report if pressed", "Accept it and split it with colleagues"], a: 1 },
        { q: "Handling a person's money is acceptable when:", o: ["Whenever it's convenient", "Only if the care plan says so, always recorded with receipts", "If the family says it's fine verbally"], a: 1 },
        { q: "A service user wants to add you as a friend on social media. You should:", o: ["Accept — it's friendly", "Politely decline to keep the relationship professional", "Accept but keep it private"], a: 1 }
      ]
    }),
    homerecords: C({
      title: "Confidentiality & records in the home", cat: "Rights", policy: "IM-05 · IM-30 · SOP-065", duration: "20 min", format: "E-learning",
      summary: "Keep personal information private and records accurate — what to write, how to protect data, and why it matters.",
      objectives: ["Apply confidentiality and data protection (IM-05)", "Keep accurate, contemporaneous records (IM-30)", "Store and share information safely", "Know what to do with a records or data concern"],
      lessons: [
        { t: "Confidentiality", b: [
          P("Everything you see and hear in someone's home is confidential (IM-05). Information is shared only with the team, on a need-to-know basis, to keep the person safe and well cared for."),
          L(["Don't discuss service users with family, friends or on social media.", "Don't leave paperwork or your phone where others can see personal data.", "Share concerns through the proper channel — the office, not the pub.", "A safeguarding disclosure is the one thing you never keep secret — you must pass it on."]) ] },
        { t: "Good records", b: [
          P("Your records (IM-30) are how the next carer, the nurse and the office know what happened. Write them at the time, factually, and only what is true."),
          L(["Contemporaneous — write it during or right after the visit.", "Factual and objective — what you saw and did, not opinion or guesswork.", "Legible, signed and dated; use the current controlled forms.", "Never alter a record to hide a mistake — correct it properly and openly."]),
          TIP("If it wasn't recorded, it effectively didn't happen. Good records protect the person and protect you.") ] }
      ],
      quiz: [
        { q: "You can discuss a service user's situation with:", o: ["Your family, as long as no name is used", "The care team, on a need-to-know basis", "Anyone who asks"], a: 1 },
        { q: "Care records should be written:", o: ["At the end of the week from memory", "Contemporaneously, factually, signed and dated", "Only when something goes wrong"], a: 1 },
        { q: "You made an error in a record. You should:", o: ["Erase it so no one sees", "Correct it properly and openly, never conceal it", "Leave the wrong information in"], a: 1 }
      ]
    }),

    /* ---------------- CARE COORDINATOR ---------------- */
    phonesupport: C({
      title: 'Answering the phone — the Care Coordinator call guide', cat: 'Operations', policy: 'QA-03 · QA-13 · HS-23 · SOP-011 · SOP-018', duration: '30 min', format: 'E-learning',
      summary: 'Answer every call warmly and safely — the phone manner that puts callers at ease, how to capture and route the call, and step-by-step for the calls a Care Coordinator takes most.',
      objectives: ['Answer with the manner that puts a caller at ease', 'Verify identity and protect confidentiality on the phone (GDPR)', 'Capture and log every call correctly in the CRM', 'Handle the most common calls — and know what to do when one is serious'],
      lessons: [
        { t: 'Your voice is the front door', b: [
          P('For most people, the phone is the service. Before they ever meet a carer, they meet you — your tone in the first ten seconds tells them whether they are in safe hands.'),
          L(['Answer within three rings, warmly: "Good morning, Liberty Living, Sarah speaking — how can I help?"', 'Listen first. Let them tell the whole story before you jump in; a short "I see… go on" does more than interrupting.', 'Stay calm, especially when they are not — meet upset with calm, never volume. It is not about you personally.', 'Read it back: "So, to make sure I have got this right…" Confirm what you understood and the next step.', 'Be honest about what happens next. Never promise what you cannot deliver — say who will act, and by when.']),
          TIP('You do not have to have every answer on the call. You do have to make the person feel heard, capture it accurately, and make sure the right person picks it up.') ] },
        { t: 'Check who you are speaking to (GDPR)', b: [
          P('A Service User\u2019s information is special-category personal data. You can only discuss it with people who are authorised on their file.'),
          L(['Get the caller\u2019s name and their relationship to the Service User before you share anything.', 'If they are authorised — share only what is relevant to the reason for the call.', 'If they are NOT authorised — politely decline: "I\u2019m not able to share that, but I can take a message and pass it on."', 'When in doubt, take a message and check before disclosing. It is never wrong to verify.']),
          WARN('Sharing a Service User\u2019s details with the wrong person is a personal data breach. If you realise it has happened, report it to the DPO immediately (SOP-015).') ] },
        { t: 'Capture the call, log the call', b: [
          P('If it is not written down, it did not happen. Every call is logged in the CRM the same shift with the right reason code.'),
          L(['Who called and their relationship to the Service User; the Service User\u2019s name.', 'Date and time of the call.', 'What was said — in the caller\u2019s own words where it matters (a complaint, a disclosure).', 'The action you took and who you routed it to.', 'What you committed to, and the timeframe you gave them.']),
          TIP('The reason code is what lets the office spot patterns — three "late visit" calls in one area this week is an early warning, not a coincidence.') ] },
        { t: 'The calls you take most', b: [
          P('Most of your day is a handful of call types. Each one has the same shape: say the right thing, do the right steps, capture it, route it.'),
          L(['A carer running late or unable to make a visit — establish how late (>30 min = late; >60 min or non-delivery = missed), reallocate or prioritise by risk, tell the Service User, and raise a missed visit as an incident.', 'A carer calling in sick — record it, reallocate every affected visit highest-risk first, keep the roster honest, and escalate anything you cannot cover.', 'A complaint — do not defend; "I\u2019m really sorry to hear that, thank you for telling me." Resolve at the point of contact if you can, log it (QA-03), and tell them the Complaints Officer will be in touch within 5 working days.', 'A new enquiry or referral — capture the details, do not promise hours, price or a start date, and route to the CSM / intake the same day.', 'A request for confidential information — verify identity and authority first (see GDPR above).']),
          SCN('Three late-visit calls in one area','By Thursday you have taken three separate calls about carers running late in the same town this week.','Handle each call properly — reassure, arrange cover, log it with the reason code. But also flag the cluster to the CSM and Operations: three in one area is a pattern, not bad luck.','Individual calls are the job; spotting the pattern across them is what stops a cluster becoming a serious incident or a complaint.') ] },
        { t: 'When the call is serious', b: [
          P('Some calls change everything the moment you hear them. Your first question decides the response.'),
          L(['Always ask first: "Is anyone in immediate danger right now?" If yes — 999/112 first. Do not put a life-safety call on hold.', 'A fall, injury or change in the Service User — get the facts, raise an incident (QA-13), and notify the CSM and Clinical Lead the same day. If the person was harmed, flag for Open Disclosure.', 'A medication error — check the person is not showing effects (999 if unwell), open an incident, and notify the Clinical Lead the same day.', 'A safeguarding disclosure — listen, reassure but never promise secrecy, record their exact words, do NOT investigate, and report to the DSO the same day.']),
          WARN('For a safeguarding disclosure, do not ask leading questions and do not investigate — your job is to receive it, record it in their own words, and get it to the DSO. Anything more can harm a future process.') ] }
      ],
      quiz: [
        { q: 'A caller asks for a Service User\u2019s visit schedule but you don\u2019t know who they are. You:', o: ['Give it — they clearly know the person', 'Check their name and whether they are authorised on the file before sharing anything', 'Refuse and hang up'], a: 1, why: 'A Service User\u2019s details are special-category data — verify identity and authority before disclosing (GDPR / SOP-015).' },
        { q: 'The very first thing to establish on a call reporting a fall is:', o: ['Which carer was on duty', 'Whether anyone is in immediate danger right now', 'Whether it will be a complaint'], a: 1, why: 'Danger never waits — if anyone is in immediate danger it is 999/112 first, then continue.' },
        { q: 'Someone rings in a complaint. Your opening should be:', o: ['To explain why it probably wasn\u2019t our fault', '"I\u2019m really sorry to hear that — thank you for telling me. Let me take the details."', 'To transfer them straight to a manager'], a: 1, why: 'Never defend at the point of contact. Acknowledge, apologise for the experience, and take the details (QA-03).' },
        { q: 'A Service User discloses possible abuse and asks you to keep it secret. You:', o: ['Promise secrecy so they keep trusting you', 'Reassure them, but explain you must pass it to the DSO to keep them safe — never promise secrecy', 'Investigate it yourself first'], a: 1, why: 'You cannot promise secrecy. Receive it, record their words, do not investigate, and report to the DSO the same day.' },
        { q: 'A carer is likely to be 40 minutes late to a visit. That visit is:', o: ['On time — 40 minutes is fine', 'Late (>30 min) — reassure the Service User and arrange cover; a non-delivery or >60 min becomes a missed visit', 'Automatically a missed visit'], a: 1, why: '>30 min = late; >60 min or non-delivery = a missed visit, which is raised as an incident (QA-13).' },
        { q: 'After every call you must:', o: ['Only log it if it was a complaint or incident', 'Log it in the CRM with the right reason code — who, when, what and the action taken', 'Remember the details in case you\u2019re asked'], a: 1, why: 'Every call is logged the same shift with the correct reason code — that record is what lets the office act and spot patterns.' }
      ]
    }),
    rostering: C({
      title: 'Rostering & visit allocation', cat: 'Operations', policy: 'HR-29 · SOP-017 · SOP-047', duration: '35 min', format: 'E-learning',
      summary: 'Build safe, continuous rosters that match carer competence to each service user\u2019s assessed need.',
      objectives: ['Match carer competence to each assessed need', 'Understand a compliant visit — Careplanner clock-in to record sheet', 'Reallocate a visit safely at short notice', 'Spot and escalate staffing risk early'],
      lessons: [
        { t: 'Safe allocation', b: [
          P('Rostering is a safety task, not just a scheduling one. Every visit you allocate must be delivered by a carer who is competent for that service user\u2019s assessed needs.'),
          L(['Only allocate HCAs trained for the required tasks \u2014 e.g. hoisting, dementia care, medication support.', 'Respect the care plan: gender preference, continuity, and any clinical requirement.', 'Honour the agreed minimum call length \u2014 never shorten a visit to fit the roster.']),
          TIP('Continuity of carer is one of the strongest drivers of service-user trust and safety. Keep a consistent carer or small team wherever possible.') ] },
        { t: 'What a compliant visit looks like (SOP-017)', b: [
          P('Knowing the shape of a good visit helps you roster realistically \u2014 the HCA needs time to do each step properly.'),
          L(['Before leaving: review the Care Plan & Schedule in the Careplanner app.', 'On arrival: clock in via the NFC tag, show photo ID and confirm identity.', 'Hand hygiene (HS-34 WHO Five Moments) and PPE from the Point-of-Care Risk Assessment (PCRA card) before any task.', 'Confirm consent for each task; deliver the authorised tasks; observe and report any change.', 'Complete the LibertyLiving Record Sheet, clock out, and submit the CRM diary note within the call.']) ] },
        { t: 'Reallocating at short notice (SOP-047)', b: [
          P('When a carer cannot make a visit, a fast, documented reallocation protects continuity of care.'),
          L(['Log the absence in the CRM with the time and reason; identify the visit priority (P1/P2/P3) and any critical tasks.', 'Within ~30 minutes find a competency-matched, geographically reachable replacement not at risk of breaching working-time limits.', 'Brief the replacement on the Care Plan and precautions; notify the Service User / family of the change, ideally 30+ minutes ahead.', 'Update the CRM roster with a reallocation reason code; if no cover can be found in the window, escalate to the On-Call Manager.']),
          WARN('A high-dependency or medication (P1) visit must never be left uncovered. Escalate until it is filled \u2014 CSMs review reallocations weekly for recurring gaps.') ] },
        { t: 'In practice', b: [
          SCN('A 7am call-out on a P1 round','At 6:50am an HCA texts in sick. Their first call is a P1 hoist-and-medication visit for a high-dependency Service User at 7:30am.','Log the absence in the CRM. Because it is P1 with a hoist and medication, immediately search for a hoist-competent replacement who is reachable and within working-time limits. Brief them on the Care Plan, phone the Service User / family about the change, and update the roster with a reason code. If no one is available in the window, escalate to the On-Call Manager who widens the search.','Priority and competence drive the response. A P1 hoist/medication visit can never be dropped \u2014 speed plus a competency match keeps the Service User safe.') ] }
      ],
      quiz: [
        { q: 'A carer calls out and the only free HCA is not hoist-trained, but the visit needs a hoist transfer. You:', o: ['Send them \u2014 a visit is better than none', 'Find a hoist-trained replacement or escalate until it is safely covered', 'Cancel and note it'], a: 1, why: 'Competence must match need \u2014 escalate until safe cover is found (SOP-047).' },
        { q: 'How does an HCA record arrival and departure at a visit?', o: ['A paper timesheet posted weekly', 'Clock in / out via the Careplanner NFC tag', 'A text to the office'], a: 1, why: 'SOP-017: the HCA clocks in and out by scanning the NFC tag in the Careplanner app.' },
        { q: 'Three late morning calls appear in the same area this week. This is:', o: ['Normal \u2014 lateness happens', 'An early warning of a cluster to escalate to the CSM & Operations', 'Only a problem if a complaint is made'], a: 1, why: 'Time-bound clustering is an automatic early-warning signal \u2014 escalate before any harm or complaint.' }
      ]
    }),
    referral: C({
      title: 'Referral intake & HSAS authorisation', cat: 'Operations', policy: 'GOV-25 \u00b7 SOP-001 \u00b7 SOP-002', duration: '35 min', format: 'E-learning',
      summary: 'Take a new referral from receipt through screening, assessment and consent to a signed care plan and safe first visit.',
      objectives: ['Receive, log and screen a referral in the CRM the same day', 'Acknowledge the HSE request and apply a priority indicator', 'Assess capacity, gain informed consent and complete the risk assessments', 'Produce a signed, Clinically approved Home Support Care Plan'],
      lessons: [
        { t: 'Receive & screen (SOP-001)', b: [
          P('Every new package \u2014 HSE, private or other \u2014 starts with a referral that must be logged and screened without delay.'),
          L(['Log the referral in the CRM the same working day: source, date, Service User details, HSE reference and presenting needs.', 'Confirm the route (HSE Approved Provider portal / CDHS selection / private) and acknowledge the HSE request within the HSE-specified response timeframe.', 'Make a preliminary call to the Service User / representative to introduce Liberty Living and arrange the home visit.', 'Desktop capacity screen: geography, HCA availability, skills match, language/cultural fit, and any safeguarding or complex-care flags.', 'Apply a priority indicator \u2014 P1 urgent, P2 standard, P3 routine.', 'Open the file per IM-30, access-locked to authorised staff.']),
          TIP('Where a referral cannot be accepted, confirm this to the HSE / referrer promptly in writing with reasons \u2014 a decline is still an auditable decision.') ] },
        { t: 'Assess & consent (SOP-002)', b: [
          P('The comprehensive assessment is scheduled within 7 working days of the HSE service request and is rights-based and consent-led.'),
          L(['Visit at home; introduce the Charter of Rights & Responsibilities and the Service User Guide in plain English.', 'Presume capacity; provide decision-making supports and check for any Decision Support Arrangement.', 'Gain informed consent for assessment and care; take written consent to share information (Appendix 3) and Consent to Prompt Medication (Appendix 4) where relevant.', 'Complete the Review checklist (Appendix 1) plus Environmental (App 8), Falls (App 9) and Medication (App 10) risk assessments \u2014 with a Risk Management Plan for each risk.', 'Complete Getting to Know Me (App 7), applying FREDA \u2014 Fairness, Respect, Equality, Dignity, Autonomy.']) ] },
        { t: 'Care plan & start', b: [
          P('The assessment produces a signed, person-centred Home Support Care Plan aligned to the HSE referral.'),
          L(['Develop the Care Plan (Appendix 6) with agreed goals, tasks, schedule and any medication prompting plan; sign the Care Agreement.', 'Submit to the Clinical Lead for clinical sign-off and incorporate amendments.', 'Communicate the plan to the allocated HCAs; place a copy in the home folder and the office file (IM-30).', 'Confirm service initiation to the HSE within 24 hours of the first care call (GOV-25).', 'Schedule reviews at 6 weeks, 6 months, then annually \u2014 earlier if needs change.']),
          WARN('Do not commence care until the needs assessment, environmental/home risk assessment and consent are all in place and the Clinical Lead has signed off the plan.') ] }
      ],
      quiz: [
        { q: 'A new referral should be logged in the CRM:', o: ['Within the week', 'The same working day', 'After the assessment'], a: 1, why: 'SOP-001: log the referral in the CRM the same working day, capturing source, HSE reference and presenting needs.' },
        { q: 'The comprehensive initial assessment must be scheduled within:', o: ['7 working days of the HSE service request', '30 days', 'Whenever a carer is free'], a: 0, why: 'SOP-001 hands over to SOP-002 with the assessment completed within 7 working days of the HSE service request.' },
        { q: 'Which pair are the correct consent forms to complete?', o: ['A single generic consent form', 'Consent to share information (Appendix 3) and Consent to Prompt Medication (Appendix 4)', 'No forms \u2014 verbal is enough'], a: 1, why: 'SOP-002 requires written consent to share information (App 3) and, where relevant, Consent to Prompt Medication (App 4).' },
        { q: 'After service starts, the first care-plan review is scheduled at:', o: ['12 months', '6 weeks', '3 months'], a: 1, why: 'SOP-002 schedules reviews at 6 weeks, then 6 months, then annually \u2014 earlier if needs change.' }
      ]
    }),
    comms: C({
      title: 'Change of carer & family communication', cat: 'Communication', policy: 'HS-04 \u00b7 SOP-018 \u00b7 SOP-048', duration: '30 min', format: 'E-learning',
      summary: 'Handle changes of carer or time, missed or shortened visits, and a Service User\u2019s refusal of care \u2014 protecting continuity, trust and the person\u2019s rights.',
      objectives: ['Communicate changes proactively and in advance', 'Respond correctly to a missed or cancelled visit (SOP-018)', 'Respect and record a refusal of care (SOP-048)', 'Spot patterns and escalate'],
      lessons: [
        { t: 'Plan & communicate', b: [
          P('Changes of carer or visit time are sometimes unavoidable \u2014 how you handle them protects trust.'),
          L(['Check the care plan and preferences before selecting a replacement carer.', 'Confirm the alternative HCA is trained for this service user\u2019s needs.', 'Notify the service user / family in advance and, where possible, introduce the new carer.', 'Brief the incoming carer with the care plan and key risks before the first visit.']),
          TIP('\u201cIn advance wherever possible\u201d is the standard \u2014 a proactive call prevents most complaints.') ] },
        { t: 'A missed or cancelled visit (SOP-018)', b: [
          P('If a scheduled visit is missed, late, shortened or cancelled, Service-User safety comes first.'),
          L(['Within 15 minutes confirm the facts \u2014 which Service User, time, HCA and priority (P1/P2/P3).', 'Phone the Service User to confirm welfare; if no answer and they are P1/P2, escalate a welfare check (next-of-kin, and G\u00e1rda\u00ed if genuine concern for life).', 'Dispatch a suitably qualified replacement where possible.', 'Where the visit could not be delivered, open an incident (QA-13) \u2014 a missed P1 visit is at least Category 2; notify the HSE Home Support Resource Manager without delay for HSE-funded Service Users.']),
          WARN('A missed visit that caused or could have caused harm triggers open disclosure within 24\u201348 hours \u2014 and the missed call is captured in the monthly HSE statement.') ] },
        { t: 'A refusal of care (SOP-048)', b: [
          P('Service Users have the right to refuse. Presume capacity and never coerce (FREDA principles / Assisted Decision-Making Act 2015).'),
          L(['Acknowledge the refusal calmly; explain the purpose and implications in plain language if they will engage.', 'If maintained, respect it \u2014 do not proceed; continue any care they do accept.', 'Phone the office (CSM or On-Call) before leaving the home; document the task refused, their reasons and supports offered on the record sheet / CRM.', 'The CSM risk-screens the same day; repeated refusals go to the Clinical Lead for a care-plan review.']) ] },
        { t: 'In practice', b: [
          SCN('\u201cI don\u2019t want a shower today\u201d',
            'A Service User declines their planned assisted shower for the third visit running. The carer is unsure whether to insist.',
            'Never insist or coerce. Acknowledge the choice, gently explain why it matters, and respect the refusal \u2014 delivering any care they do accept. Phone the office before leaving, and record the refusal, reasons and supports offered. Because it is now a repeated pattern, the CSM escalates to the Clinical Lead to review the care plan with the Service User and family.',
            'Autonomy is a right (FREDA). Your job is to respect, support and document \u2014 and to escalate a pattern so the plan can be reviewed, not to override the person.') ] }
      ],
      quiz: [
        { q: 'The best time to tell a family about a change of carer is:', o: ['After the new carer arrives', 'In advance, wherever possible', 'Only if they ask'], a: 1, why: 'Proactive, advance communication protects trust and prevents most complaints.' },
        { q: 'A P1 Service User misses a visit and does not answer the phone. You:', o: ['Leave a message and move on', 'Escalate a welfare check \u2014 next-of-kin, and G\u00e1rda\u00ed if there is genuine concern for life', 'Wait for the next scheduled visit'], a: 1, why: 'SOP-018: for P1/P2 with no contact, escalate a welfare check immediately \u2014 safety first.' },
        { q: 'A Service User with capacity refuses their planned care. You:', o: ['Insist \u2014 it is in the care plan', 'Respect the refusal, provide any care they accept, notify the office and document it', 'Complete the task quickly anyway'], a: 1, why: 'SOP-048: presume capacity, never coerce \u2014 respect, support, record and notify the office.' }
      ]
    }),
    /* ---------------- SHARED: QUALITY & SAFETY ---------------- */
    complaints: C({
      title: 'Receiving & logging a complaint', cat: 'Quality', policy: 'QA-03 \u00b7 SOP-011 \u00b7 QA-SOP-CMP-01', duration: '25 min', format: 'E-learning',
      summary: 'Listen to, resolve where possible, and log every verbal complaint the same shift \u2014 with acknowledgement within 5 working days and triggers screened.',
      objectives: ['Respond well at the point of contact', 'Attempt local resolution and confirm the outcome', 'Log on the Master Complaints Log the same shift', 'Screen for safeguarding and incident triggers'],
      lessons: [
        { t: 'At the point of contact (SOP-011)', b: [
          P('Most complaints reach us verbally at a care call. How the receiving staff member responds sets the tone.'),
          L(['Listen \u2014 do not interrupt, defend or argue.', 'Reassure the complainant that raising a concern will not adversely affect their care.', 'Apologise that they have had to raise it (an apology for the experience, not an admission of fault) and thank them.', 'Attempt local resolution where it is within scope \u2014 correct an arrangement, clear up a misunderstanding, or escalate to the Supervisor at once.', 'Confirm with the complainant whether they consider it resolved; if not, advise it will go to the Client Services Manager / Complaints Officer.']) ] },
        { t: 'Log it the same shift', b: [
          P('Record the complaint on the Master Complaints Log (QA-SOP-CMP-01) the same shift \u2014 nothing waits.'),
          L(['Capture: Complaint ID, Date Received, Quarter, Cluster/Area, Primary Theme, Severity Level, Safeguarding Concern Y/N, Incident Triggered Y/N, Clinical Review Required Y/N.', 'Forward a Complaint Form copy to the Complaints Officer (Leah O\u2019Brien \u00b7 complaints@libertyhomecare.ie).', 'If it cannot be resolved locally, the Complaints Officer issues a written acknowledgement within 5 working days of receipt.']),
          TIP('The resolution target is 30 working days. The Log auto-calculates Resolution Days and \u201cResolved within 30 days\u201d once closed.') ] },
        { t: 'Screen for triggers', b: [
          P('Before treating it as \u201cjust a complaint\u201d, screen for two triggers.'),
          L(['Safeguarding indicated \u2192 activate SOP-005 the same day (notify the DSO); do not wait.', 'Harm occurred or could have \u2192 raise an incident under SOP-008 (QA-13).', 'Flag both in the Complaints Log so nothing is lost.']),
          WARN('A serious (Level 3\u20134) or safeguarding-linked complaint must be reported to the HSE immediately \u2014 not at quarter end.') ] }
      ],
      quiz: [
        { q: 'A verbal complaint at a care call must be logged on the Master Complaints Log:', o: ['Within 30 days', 'The same shift', 'Only if unresolved'], a: 1, why: 'SOP-011: record every verbal complaint on the Master Complaints Log the same shift so no concern is lost.' },
        { q: 'Where a complaint cannot be resolved locally, written acknowledgement is issued within:', o: ['24 hours', '5 working days', '20 working days'], a: 1, why: 'The Complaints Officer issues written acknowledgement within 5 working days of receipt.' },
        { q: 'A complainant worries that complaining will affect their care. You should:', o: ['Say you cannot promise anything', 'Reassure them it will not adversely affect their care', 'Advise them to put it in writing first'], a: 1, why: 'SOP-011 step 1: reassure the complainant that raising a concern will not adversely affect their care.' }
      ]
    }),
    complaintsinv: C({
      title: 'Investigating a formal complaint', cat: 'Quality', policy: 'QA-03 \u00b7 SOP-012 \u00b7 Health Act 2004 Part 9', duration: '35 min', format: 'Workshop',
      summary: 'Investigate and respond to a formal complaint within Health Act 2004 timeframes \u2014 fairly, on evidence, with clear escalation rights.',
      objectives: ['Acknowledge and scope the complaint', 'Run an evidence-based investigation', 'Issue an outcome within 30 working days', 'Explain internal review and external escalation rights'],
      lessons: [
        { t: 'Acknowledge & plan (SOP-012)', b: [
          P('A formal complaint is one not resolved at the point of contact. It is handled by the Complaints Officer within statutory timeframes.'),
          L(['Acknowledge in writing within 5 working days \u2014 who is investigating, the indicative timeframe, and the complainant\u2019s rights.', 'Assess scope, urgency and any safeguarding / incident / clinical-review flags; where a matter is excluded, write within 5 working days with reasons.', 'Develop an investigation plan: documents to review, interviewees, timeframe \u2014 agreed with the Director of Quality if complex.']) ] },
        { t: 'Investigate & respond', b: [
          P('The investigation establishes the facts against Liberty\u2019s records and policy.'),
          L(['Review the CRM, Service User record, home folder, training & supervision records and rosters; interview staff and complainant; gather evidence.', 'Produce a findings document: facts established, analysis against policy, whether upheld in full / in part / not upheld, SMART recommendations and an apology where applicable.', 'Issue the outcome letter within 30 working days of receipt, including the recommendations and the complainant\u2019s escalation rights.']),
          WARN('If the 30-working-day target cannot be met, write to the complainant within 30 working days explaining the delay and the new date \u2014 then update every 20 working days.') ] },
        { t: 'Review & escalation', b: [
          P('Complainants have a right to challenge the outcome.'),
          L(['An internal review request (within 30 working days of the outcome letter) is acknowledged within 5 working days and commenced within 20 working days by the Complaints Review Officer.', 'The review is completed within 20 working days (extension only with written notice and a new date).', 'Where the complainant remains unsatisfied, advise external routes \u2014 Office of the Ombudsman, HSE, HIQA \u2014 with contact details.']),
          TIP('The Director of Operations implements agreed recommendations; the Complaints Officer confirms they are actually done.') ] }
      ],
      quiz: [
        { q: 'The outcome (response) letter for a formal complaint is issued within:', o: ['5 working days', '30 working days of receipt', '3 months'], a: 1, why: 'SOP-012: issue the written outcome within 30 working days of receipt.' },
        { q: 'If the 30-day timeframe cannot be met, you must:', o: ['Wait until it is finished', 'Write within 30 working days explaining the delay and new date, then update every 20 working days', 'Close the complaint'], a: 1, why: 'SOP-012 step 5: notify the delay within 30 working days and provide updates every 20 working days.' },
        { q: 'A complainant remains unsatisfied after the internal review. You signpost:', o: ['Nothing further', 'The Office of the Ombudsman, HSE and HIQA', 'A fresh complaint only'], a: 1, why: 'External escalation routes are the Office of the Ombudsman, HSE and HIQA.' }
      ]
    }),
    incident: C({
      title: 'Incident reporting & categorisation', cat: 'Quality', policy: 'QA-13 \u00b7 SOP-008 \u00b7 SOP-009', duration: '35 min', format: 'E-learning',
      summary: 'Contain, report, categorise and learn from every incident and near miss using QA-13 and the HSE Incident Management Framework.',
      objectives: ['Take immediate containment actions and report verbally at once', 'Record on the system within 3 working days', 'Categorise 1\u20133 using the QA-13 Impact Scoring Table', 'Apply the correct escalation, external reporting and review'],
      lessons: [
        { t: 'Contain & report (SOP-008)', b: [
          P('The staff member who identifies an incident acts first to make people safe, then reports.'),
          L(['Immediate containment: ensure safety/wellbeing, make the environment safe, assess need for medical attention, reassure the Service User, secure evidence.', 'Report verbally to the Client Services Manager immediately (out of hours: the on-call coordinator, with next-working-day review).', 'Write a factual, chronological account \u2014 objective, confined to your own involvement, no opinions.', 'Record on the electronic incident system as soon as possible and no later than 3 working days: Who, Who is aware, When, Where, What, immediate actions, How and initial Why.']) ] },
        { t: 'Categorise', b: [
          P('The Client Services Manager is the Incident Owner and sets the category.'),
          L(['Calculate the Risk Rating using the QA-13 Appendix 2 Impact Scoring Table: Negligible, Minor, Moderate, Major, Extreme.', 'Category 3 = Negligible / Minor; Category 2 = Moderate; Category 1 = Major / Extreme.', 'For Category 1 or 2, automatic notifications go to the Director of Quality, Director of Operations and CEO.']),
          TIP('When unsure between two categories, rate up. It is easier to de-escalate a review than to justify under-reporting.') ] },
        { t: 'Escalate & report externally', b: [
          P('Category 1 (Major/Extreme) triggers the most urgent response.'),
          L(['Inform the SAO (CEO) within 24 hours and notify the HSE within 24 hours.', 'Convene the Serious Incident Management Team (SIMT) within 5 days.', 'Consider external reporting: HSE (in writing without delay), An Garda S\u00edoch\u00e1na, HSA (IR1 for staff injury / dangerous occurrence), HPRA (adverse drug reactions), and HIQA under the Patient Safety Act 2023.', 'Initiate open disclosure within 24\u201348 hours where a Service User is affected (SOP-010).']),
          WARN('Every medication error is reportable \u2014 including near-misses where no harm occurred.') ] },
        { t: 'Learn \u2014 root cause (SOP-009)', b: [
          P('Learning is systems-focused, never blame-focused.'),
          L(['Category 2 and applicable Category 3 incidents get a proportionate root cause analysis \u2014 default target 28 days from the incident.', 'Category 1 gets an independent Systems Analysis Review \u2014 target 125 days from occurrence.', 'Tools: Fishbone, 5 Whys and the Yorkshire Contributory Factors Framework; findings written as Statements of Findings.', 'Agree SMART corrective actions and update the Risk Register / Individual Risk Management Plans (HS-31).']) ] },
        { t: 'In practice', b: [
          SCN('A missed medication prompt',
            'A carer realises at the end of a visit that they forgot to prompt the Service User\u2019s midday medication. The Service User seems fine.',
            'Check for harm first \u2014 seek medical/GP advice if there is any doubt. Report verbally to the CSM immediately and record on the incident system within 3 working days. The CSM categorises it (likely Category 3 if no harm) and a proportionate RCA follows; open disclosure applies if the Service User was affected.',
            'A missed dose is a reportable medication incident even when no harm results \u2014 \u201cseems fine\u201d is not the same as \u201cno harm\u201d, so it is always recorded and reviewed.'),
          SCN('Deciding between Category 2 and Category 1',
            'A Service User has a fall with a suspected fracture and is taken to hospital. You are unsure whether this is Category 2 or Category 1.',
            'Score it on the QA-13 Impact Table. A fracture is typically Major \u2014 Category 1. When genuinely unsure between two categories, rate up: inform the SAO and notify the HSE within 24 hours; it is easier to de-escalate later than to justify under-reporting.',
            'Correct categorisation drives the whole response. Rating up protects the Service User and keeps Liberty compliant with its 24-hour HSE notification duty.') ] }
      ],
      quiz: [
        { q: 'An incident must be recorded on the electronic system:', o: ['Within the hour', 'As soon as possible and no later than 3 working days', 'At the next audit'], a: 1, why: 'SOP-008: record on the electronic incident system as soon as possible and no later than 3 working days (verbal report is immediate).' },
        { q: 'A Major/Extreme (Category 1) incident requires the HSE to be notified within:', o: ['24 hours', '5 days', '28 days'], a: 0, why: 'Category 1: inform the SAO (CEO) and notify the HSE within 24 hours; the SIMT is convened within 5 days.' },
        { q: 'The default root cause analysis timeframe for a Category 2 incident is:', o: ['5 days', '28 days', '125 days'], a: 1, why: 'SOP-009: Category 2 and applicable Category 3 incidents get RCA at a default target of 28 days; 125 days is the Category 1 Systems Analysis target.' },
        { q: 'A near miss where no one was harmed should be:', o: ['Not recorded', 'Recorded and trended \u2014 it is still reportable', 'Only mentioned verbally'], a: 1, why: 'Near misses are recorded and trended; every medication error/near-miss is reportable.' }
      ]
    }),
    safeguarding: C({
      title: 'Safeguarding adults at risk', cat: 'Safety', policy: 'HS-23 \u00b7 HS-23.1 \u00b7 SOP-005/007/022', duration: '40 min', format: 'E-learning',
      summary: 'Recognise abuse, respond correctly to a disclosure, and follow the DSO screening and HSE notification process \u2014 zero tolerance.',
      objectives: ['Recognise the types and signs of abuse', 'Do the right things (and avoid the wrong ones) at disclosure', 'Escalate to the DSO and complete the Incident Report Form the same day', 'Understand DSO screening and HSE notification timeframes'],
      lessons: [
        { t: 'Recognise', b: [
          P('Safeguarding is everyone\u2019s responsibility and Liberty Living has zero tolerance for abuse.'),
          L(['Types: physical, sexual, psychological, financial, discriminatory and institutional abuse, neglect and acts of omission, and self-neglect.', 'Signs may be physical, behavioural, financial or environmental \u2014 take every concern seriously.', 'Child protection concerns follow SOP-006 / HS-28; allegations against a staff member also trigger the Trust in Care process (HS-23.1).']) ] },
        { t: 'In the moment (SOP-005)', b: [
          P('What you do in the first minutes protects the person and any future inquiry.'),
          L(['DO listen, take it seriously, believe them and use their own words.', 'DO take immediate safety action \u2014 999/112 for medical help, An Garda S\u00edoch\u00e1na if a crime may have occurred. Do not delay safety for paperwork.', 'DO preserve evidence \u2014 do not clean, wash or move things.', 'DO NOT promise confidentiality or secrecy \u2014 be honest that you must share it to keep them safe.', 'DO NOT investigate, interview witnesses, or confront the alleged abuser.']),
          WARN('Report to your Line Manager \u2192 DSO (Leah O\u2019Brien \u00b7 085 117 9884 \u00b7 safeguarding@libertyhomecare.ie) \u2192 CEO the same day, and complete the Incident Report Form (Microsoft Forms) the same day in the person\u2019s own words.') ] },
        { t: 'DSO screening & HSE notification (SOP-007 / 022)', b: [
          P('Once notified, the DSO leads a defined screening and reporting process \u2014 useful to understand even if you are not the DSO.'),
          L(['Log on the Safeguarding Log the same day with a unique reference; inform the CEO; complete an immediate risk assessment and protective measures.', 'Preliminary Screening (Form PSF1) with the Clinical Lead within 24 hours; outcome (Form PSF2) within 3 working days \u2014 no grounds / more information / reasonable grounds.', 'Notify the HSE Safeguarding & Protection Team within 3 working days (immediately if urgent), plus the HSE nominated point of contact as soon as possible.', 'Commence open disclosure within 24\u201348 hours where applicable; develop a Safeguarding Plan where reasonable grounds exist.']) ] },
        { t: 'In practice', b: [
          SCN('A financial concern at a care call',
            'A carer notices the same neighbour is collecting the Service User\u2019s pension each week and the Service User seems anxious and short of money for heating. The Service User says \u201cplease don\u2019t make a fuss.\u201d',
            'Reassure the Service User without promising secrecy. Do not confront the neighbour or investigate. Record exactly what was seen and said, and report to the Line Manager / DSO the same day, completing the Incident Report Form. The DSO logs it, screens it (PSF1) and notifies the HSE Safeguarding Team within 3 working days.',
            'Financial abuse is a safeguarding concern. Your job is to notice, not investigate \u2014 the DSO owns screening and HSE notification, and you must never promise to keep it quiet.'),
          SCN('A bruise the Service User can\u2019t explain',
            'On a personal-care visit you notice finger-shaped bruising on a Service User\u2019s upper arm. They are vague about how it happened.',
            'Take it seriously. Ensure they are safe and seek medical advice if needed. Record the observation factually (location, appearance, what was said), do not question other staff yourself, and report to the DSO the same day via the Incident Report Form.',
            'Unexplained injuries are potential physical abuse. Early, factual reporting protects the person and preserves the picture for the DSO\u2019s screening.') ] }
      ],
      quiz: [
        { q: 'A Service User discloses abuse and asks you to keep it secret. You:', o: ['Promise secrecy to keep their trust', 'Explain honestly that you must share it with the Line Manager / DSO to keep them safe', 'Agree, then tell the DSO anyway'], a: 1, why: 'SOP-005: never promise confidentiality or secrecy \u2014 be honest that the information must be shared to protect them.' },
        { q: 'After receiving a disclosure, you should:', o: ['Interview the alleged abuser to check the facts', 'Not investigate \u2014 report to the Line Manager / DSO and complete the Incident Report Form the same day', 'Wait until you have more detail'], a: 1, why: 'SOP-005: do NOT investigate or confront; report up the same day and complete the Incident Report Form (Microsoft Forms).' },
        { q: 'The DSO must notify the HSE Safeguarding & Protection Team within:', o: ['3 working days (immediately if urgent)', '30 days', 'The next quarter'], a: 0, why: 'SOP-022: notify the HSE Safeguarding & Protection Team within 3 working days of becoming aware \u2014 immediately if urgent.' },
        { q: 'At the scene of a possible sexual assault you should:', o: ['Clean up and help the person change', 'Preserve evidence \u2014 do not clean, wash or move things \u2014 and contact An Garda S\u00edoch\u00e1na', 'Wait for the DSO before doing anything'], a: 1, why: 'SOP-005: preserve physical evidence and contact An Garda S\u00edoch\u00e1na where a crime may have occurred; take immediate safety action first.' }
      ]
    }),
    escalation: C({
      title: 'Escalation & external reporting', cat: 'Quality', policy: 'QA-13 \u00b7 GOV-36 \u00b7 SOP-022/026', duration: '25 min', format: 'E-learning',
      summary: 'Know what to escalate, to whom, and within what timeframe \u2014 internally up the accountability line and externally to the right bodies.',
      objectives: ['Follow the internal escalation ladder', 'Meet external reporting timeframes', 'Recognise what needs escalating and keep the evidence trail'],
      lessons: [
        { t: 'The internal escalation ladder', b: [
          P('Escalation protects service users and the organisation. The golden rule: when in doubt, escalate up the line \u2014 never sideways, never \u201cwait and see\u201d.'),
          FLOW([
            {label: 'Front-line staff / HCA', who: 'Identifies the concern and acts to make safe'},
            {label: 'Client Service Manager', who: 'Operational issues \u2014 visits, staffing, day-to-day'},
            {label: 'Clinical Lead / DSO', who: 'Clinical concerns and all safeguarding'},
            {label: 'Director of Quality', who: 'Serious incidents, risk register, QIPs'},
            {label: 'CEO (Senior Accountable Officer)', who: 'Category 1 incidents & external notifications'},
            {label: 'Board Quality & Risk Committee', who: 'Board-level assurance and oversight'}
          ]),
          TIP('Out of hours, the ladder starts with the On-Call Manager (01-416-3717), who escalates to the DSO / CSM the next working day.') ] },
        { t: 'External reporting \u2014 who and when', b: [
          P('Some matters must be reported outside Liberty Living, and the clock starts when we become aware.'),
          FLOW([
            {label: 'HSE Safeguarding & Protection Team', who: 'Safeguarding concern \u2014 within 3 working days (immediately if urgent)'},
            {label: 'An Garda S\u00edoch\u00e1na', who: 'Where a criminal offence may have occurred \u2014 immediately'},
            {label: 'HSE (incident notification)', who: 'Category 1 incident \u2014 within 24 hours'},
            {label: 'Health & Safety Authority (IR1/IR3)', who: 'Staff injury / dangerous occurrence \u2014 5 or 10 working days'},
            {label: 'HIQA', who: 'Notifiable incidents under the Patient Safety Act 2023'}
          ]),
          WARN('Always keep a dated copy of every external submission \u2014 auditors and the HSE will look for the evidence trail.') ] },
        { t: 'In practice', b: [
          SCN('Out-of-hours fall with a head injury',
            'A carer rings the on-call line at 9pm: a Service User has fallen and hit their head, and seems confused. What is the escalation path?',
            'Make safe first \u2014 ensure 999/112 is called for the head injury. Then follow the incident pathway (SOP-008): the On-Call Manager logs it, and because a head injury with confusion is potentially Major, it is treated as a likely Category 1 \u2014 inform the CEO (SAO) within 24 hours, notify the HSE within 24 hours, and begin open disclosure with the family within 24\u201348 hours.',
            'Escalation is proportionate to harm. A potential Category 1 goes all the way up to the SAO and out to the HSE quickly \u2014 you never sit on it until the next working day.') ] }
      ],
      quiz: [
        { q: 'The guiding principle when unsure whether to escalate is:', o: ['Wait and see', 'Escalate up the line, not sideways', 'Ask a colleague informally'], a: 1, why: 'When in doubt, escalate up the accountability line promptly \u2014 never sideways or \u201cwait and see\u201d.' },
        { q: 'A safeguarding concern posing risk to wellbeing is reported to the HSE Safeguarding Team:', o: ['At quarter end', 'Within 3 working days (immediately if urgent)', 'Only if the family agrees'], a: 1, why: 'SOP-022: notify the HSE Safeguarding & Protection Team within 3 working days \u2014 immediately if urgent.' },
        { q: 'A Category 1 incident must be notified to the HSE within:', o: ['24 hours', '5 days', '28 days'], a: 0, why: 'Category 1 incidents are notified to the HSE within 24 hours (SOP-008).' }
      ]
    }),
    opendisclosure: C({
      title: 'Open disclosure conversations', cat: 'Quality', policy: 'QA-13 \u00b7 SOP-010 \u00b7 Patient Safety Act 2023', duration: '30 min', format: 'Workshop',
      summary: 'Communicate openly, honestly and on time with a Service User affected by a patient safety incident \u2014 including a sincere apology and a written record.',
      objectives: ['Initiate open disclosure within 24\u201348 hours', 'Run the meeting with empathy and a genuine apology', 'Produce the compliant written record'],
      lessons: [
        { t: 'Initiate & prepare (SOP-010)', b: [
          P('Open disclosure is led by the CEO and begins quickly \u2014 the window includes preparation.'),
          L(['Initiate within 24\u201348 hours of the service becoming aware of the incident.', 'The CEO appoints a Designated Liaison Person (the Service User\u2019s single point of contact) and an Open Disclosure Team.', 'Prepare: establish the facts available, decide to whom disclosure is made, and agree the apology and its wording.']) ] },
        { t: 'Hold the meeting', b: [
          P('The meeting is honest, unhurried and led by listening.'),
          L(['Introduce everyone and their role; explain that notes are taken.', 'Invite the Service User / relevant person to share their understanding, the impact on them, and their expectations.', 'Give a sincere and meaningful apology \u2014 say what is known, express regret, take responsibility for what is being investigated.', 'Describe the facts available, how the investigation will proceed, what to expect, and the support available including independent advocacy.']),
          TIP('An apology given in good faith is protected under the Civil Liability (Amendment) Act 2017 for non-notifiable incidents \u2014 saying sorry is right and safe.') ] },
        { t: 'Written follow-up', b: [
          P('Every open disclosure is confirmed in writing.'),
          L(['Produce a written record / letter: date of meeting, summary of information shared, the sincere apology, and the Designated Liaison Person\u2019s details \u2014 signed by the CEO.', 'For notifiable incidents, the record states it was made pursuant to Section 5(1) of the Patient Safety (Notifiable Incidents and Open Disclosure) Act 2023.', 'File the record with the incident report.']) ] }
      ],
      quiz: [
        { q: 'Open disclosure should be initiated within:', o: ['24\u201348 hours of becoming aware', '5 days', '28 days'], a: 0, why: 'SOP-010: initiate within 24\u201348 hours \u2014 the window includes preparation and planning.' },
        { q: 'A sincere apology given in good faith is:', o: ['An admission of legal liability', 'Protected under the Civil Liability (Amendment) Act 2017 for non-notifiable incidents', 'Best avoided until the investigation ends'], a: 1, why: 'SOP-010: apologies in good faith are protected under the Civil Liability (Amendment) Act 2017.' },
        { q: 'The written open disclosure record is signed by:', o: ['The carer involved', 'The CEO', 'The complainant'], a: 1, why: 'SOP-010: the written record / letter is signed by the CEO and filed with the incident report.' }
      ]
    }),
    /* ---------------- INFORMATION ---------------- */
    gdpr: C({
      title: 'Data protection & confidentiality', cat: 'Information', policy: 'IM-05 \u00b7 SOP-015 \u00b7 SOP-029', duration: '35 min', format: 'E-learning',
      summary: 'Handle personal data lawfully and securely, respond to a suspected breach within 72 hours, and process a Subject Access Request correctly.',
      objectives: ['Apply data-minimisation and need-to-know', 'Recognise and report a personal data breach (SOP-015)', 'Understand the Subject Access Request process (SOP-029)', 'Keep data secure and know the DPO route'],
      lessons: [
        { t: 'Handling data lawfully', b: [
          P('Service-user information is special-category personal data under GDPR \u2014 it needs strong protection.'),
          L(['Only collect and hold what is necessary (data minimisation).', 'Share on a strict need-to-know basis within the care team.', 'Never share information outside the care team without a lawful basis.']) ] },
        { t: 'Security & storage', b: [
          L(['Store paper securely and lock it away; keep digital data encrypted and access-controlled.', 'Anonymise Service-User and staff details in reports and audits.', 'Never share Service-User information outside the care team without a lawful basis.']) ] },
        { t: 'A data breach (SOP-015)', b: [
          P('A breach is any loss, theft or unauthorised disclosure of personal data \u2014 a lost phone, a misdirected email, a stolen file.'),
          L(['Report it to the DPO (dpo@libertyhomecare.ie) immediately on identification.', 'Take containment actions at once \u2014 recall the email, secure the device, change passwords.', 'The DPO assesses risk to the data subject; the Director of Care informs the HSE Key Contact within 24 hours where relevant.', 'The DPO notifies the Data Protection Commission within 72 hours where the breach is likely to risk people\u2019s rights.']),
          WARN('The 72-hour clock to notify the DPC starts the moment Liberty becomes aware \u2014 never sit on a suspected breach.') ] },
        { t: 'A Subject Access Request (SOP-029)', b: [
          P('Anyone can ask for a copy of the personal data Liberty holds about them (GDPR Article 15).'),
          L(['Route any SAR (verbal or written) to the DPO the same working day \u2014 never hand out personal data over the phone.', 'The DPO acknowledges within 5 working days and responds within 30 calendar days.', 'Third-party information is redacted before release.']),
          SCN('\u201cCan you email me Mum\u2019s file?\u201d',
            'A Service User\u2019s son phones asking you to email him his mother\u2019s full care records today.',
            'Do not release anything over the phone or by return email. Explain that this is a Subject Access Request and route it to the DPO the same day. The DPO verifies identity and the requester\u2019s standing, acknowledges within 5 working days, redacts third-party data, and responds within 30 calendar days.',
            'Even a well-meaning family request is a formal SAR. The DPO owns identity checks, redaction and the statutory timeframe \u2014 releasing data yourself risks an unlawful disclosure.') ] }
      ],
      quiz: [
        { q: 'You accidentally email a care plan to the wrong address. You:', o: ['Do nothing if you recall it', 'Report it to the DPO immediately and take containment action', 'Only worry if someone opens it'], a: 1, why: 'SOP-015: a misdirected email is a breach \u2014 report to the DPO at once and contain it.' },
        { q: 'Where a breach is likely to risk people\u2019s rights, the DPC must be notified within:', o: ['72 hours of becoming aware', '30 days', 'The next quarter'], a: 0, why: 'SOP-015: notify the Data Protection Commission within 72 hours of awareness.' },
        { q: 'A relative phones asking you to email a Service User\u2019s full records. You:', o: ['Send them since they are family', 'Route it to the DPO as a Subject Access Request \u2014 never release over the phone', 'Read the notes out instead'], a: 1, why: 'SOP-029: SARs go to the DPO, who verifies identity, redacts third-party data and responds within 30 days.' }
      ]
    }),
    records: C({
      title: 'Record keeping & documentation', cat: 'Information', policy: 'IM-30 \u00b7 SOP-065', duration: '30 min', format: 'E-learning',
      summary: 'Keep accurate, contemporaneous, audit-ready records on the correct controlled templates.',
      objectives: ['Record contemporaneously and factually', 'Use current controlled templates', 'Apply retention rules'],
      lessons: [
        { t: 'Accurate records', b: [
          P('Good records are the backbone of safe care and of every audit.'),
          L(['Record events at the time, factually and legibly.', 'Use only current, controlled templates \u2014 care plans, notes and forms.', 'Never backdate; correct errors transparently (single line, initial, date).']) ] },
        { t: 'Retention & destruction (SOP-065)', b: [
          P('Records are kept only as long as needed, then securely destroyed \u2014 and both ends are controlled.'),
          L(['Service User records are kept for a minimum of 8 years from the date of last contact (IM-30).', 'The Records Retention Schedule is the single source of truth for every record category.', 'Records due for destruction are identified quarterly and destroyed by secure shredding / certified deletion, then logged in the Register of Records Destroyed.', 'Records must reconcile with the complaints, incident and roster logs \u2014 auditors cross-check.']),
          TIP('If it isn\u2019t written down, it didn\u2019t happen \u2014 contemporaneous notes protect Service Users and staff alike.') ] },
        { t: 'In practice', b: [
          SCN('A Service User\u2019s package ends',
            'A Service User\u2019s care ends after they move into residential care. A colleague suggests shredding their file to free up space.',
            'Do not destroy it. Service User records must be retained for a minimum of 8 years from the date of last contact. The file is retained securely and only destroyed when the Records Retention Schedule shows it is due \u2014 via the approved quarterly secure-destruction process, logged in the Register of Records Destroyed.',
            'Early destruction breaches IM-30 and can undermine a future complaint, claim or audit. Retention is a rule, not a space-saving decision.') ] }
      ],
      quiz: [
        { q: 'The best time to write a care note is:', o: ['At the end of the week', 'Contemporaneously \u2014 at the time of the event', 'Whenever convenient'], a: 1, why: 'Contemporaneous recording is accurate and defensible.' },
        { q: 'To correct a written error you should:', o: ['Use correction fluid', 'Strike through with a single line, initial and date it', 'Rewrite the whole record'], a: 1, why: 'Transparent correction \u2014 single line, initial, date \u2014 preserves the audit trail.' },
        { q: 'How long are Service User records kept?', o: ['1 year', 'A minimum of 8 years from the date of last contact', 'Until the package ends'], a: 1, why: 'SOP-065 / IM-30: retain Service User records for a minimum of 8 years from last contact, then destroy securely.' }
      ]
    }),
    doccontrol: C({
      title: 'Document control & version management', cat: 'Information', policy: 'IM-30 \u00b7 SOP-066 \u00b7 SOP-067 \u00b7 SOP-068 \u00b7 SOP-069', duration: '25 min', format: 'E-learning',
      summary: 'Keep the policy library controlled \u2014 draft, review, issue for sign-off and retire documents so staff always use the current approved version.',
      objectives: ['Understand version control and the document lifecycle', 'Issue a policy to staff for sign-off', 'Withdraw and archive superseded versions', 'Keep the register current'],
      lessons: [
        { t: 'Version control basics', b: [
          P('Controlled documents carry an owner, reference, version, effective date and review date.'),
          L(['Only the current approved version may be in use.', 'Changes are approved before release (SOP-066 draft, SOP-067 review/revise), and the register is updated.', 'Superseded versions are withdrawn and archived promptly (SOP-069).']),
          WARN('An out-of-date form in use is an audit finding \u2014 always check the version before issuing.') ] },
        { t: 'Issuing for sign-off (SOP-068)', b: [
          P('A policy only \u201ccounts\u201d once staff have read and acknowledged it.'),
          L(['Issue the approved version to relevant staff with a read-by date.', 'Capture each acknowledgement on the Staff Policy Acknowledgement record.', 'Chase outstanding sign-offs; report completion to the Director of Quality.']),
          SCN('A revised medication policy is approved',
            'CARE-20 has just been updated to v4 and approved. What has to happen before it is \u201clive\u201d for staff?',
            'Update the document register (new version, effective/review dates), withdraw and archive v3 so no one uses it, then issue v4 to relevant staff for sign-off with a read-by date \u2014 recording each acknowledgement. Chase any outstanding sign-offs.',
            'Approval is not the finish line: control, issue, sign-off and archiving are what make the new version actually govern practice \u2014 and what an auditor checks.') ] },
        { t: 'Retiring & archiving a version (SOP-069)', b: [
          P('When a new version goes live, the old one must be taken out of circulation \u2014 not left sitting in folders or on the app where someone could pick it up and use it by mistake.'),
          L(['Mark the superseded version as archived in the document register, with the date it was withdrawn and who authorised it.', 'Remove it from every live location \u2014 shared drives, printed home folders, and the Care Planner app.', 'Retain one archived copy for the audit trail per the retention schedule (IM-30) \u2014 archive, never simply delete.', 'Confirm the current version is the only one reachable anywhere staff work.']),
          WARN('An archived version must never be reachable as if it were current \u2014 a stray old form in a service user\u2019s home is an audit finding.') ] }
      ],
      quiz: [
        { q: 'A coordinator is still using last year\u2019s consent form. You should:', o: ['Leave it \u2014 it\u2019s similar enough', 'Withdraw it and issue the current controlled version', 'Wait for the next audit'], a: 1, why: 'Only the current controlled version may be in use; withdraw superseded forms promptly (SOP-069).' },
        { q: 'A newly approved policy is \u201clive\u201d for staff once:', o: ['It is approved by the CEO', 'It is issued and staff have acknowledged it on the Staff Policy Acknowledgement (SOP-068)', 'It is saved to the shared drive'], a: 1, why: 'SOP-068: a policy governs practice once issued and acknowledged by staff \u2014 approval alone is not enough.' },
        { q: 'When a policy is superseded by a new version, the old version should be:', o: ['Deleted entirely so no one can find it', 'Marked archived in the register, removed from all live locations, with one copy retained for audit (SOP-069)', 'Left in the folder in case it is still needed'], a: 1, why: 'SOP-069: withdraw from circulation and archive with an audit copy \u2014 do not delete the record, and do not leave it usable.' }
      ]
    }),
    stafffile: C({
      title: 'Staff file, onboarding & competency', cat: 'Information', policy: 'HR-14 \u00b7 SOP-058 \u00b7 SOP-060', duration: '30 min', format: 'E-learning',
      summary: 'Keep staff files audit-ready, run a compliant Day-1 onboarding, and sign off competency on the basis of shadowing and the NCCA.',
      objectives: ['Know what a compliant staff file holds', 'Run the Day-1 onboarding (SOP-058)', 'Sign off competency correctly (SOP-060)', 'Keep the training matrix live'],
      lessons: [
        { t: 'A compliant staff file', b: [
          L(['Garda vetting cleared before commencement; two references verified.', 'Right to work, identity and medical fitness on file.', 'Induction, shadowing and mandatory training records current.', 'Annual NCCA and supervision records up to date.']) ] },
        { t: 'Day-1 onboarding (SOP-058)', b: [
          P('A standardised Day 1 gets new staff safe, equipped and signed up to the essentials.'),
          L(['Verify identity against the personnel file; issue photo ID badge, uniform and the Staff Handbook.', 'Walk through the Induction Schedule; brief mandatory policies and capture the Staff Policy Acknowledgement.', 'Cover statutory training awareness (Children First, Data Protection, Safeguarding, Capacity Act, Open Disclosure).', 'Set up the Care Planner app; introduce the CSM/Supervisor and book the first 8 hours of supervision/shadowing.']) ] },
        { t: 'Signing off competency (SOP-060)', b: [
          P('No one works unsupervised until they are assessed as competent.'),
          L(['A named Supervisor delivers a minimum 8 hours of shadowing over 2\u20135 days \u2014 the new HCA observes only at first.', 'Each session is recorded on the Shadowing Evaluation Form.', 'The CSM completes the National Carer Competency Assessment (NCCA) within 2 working days of shadowing.', 'Only when the NCCA shows competence across all domains does the CSM sign off unsupervised working; gaps mean more support, not sign-off.']),
          WARN('Garda vetting must be cleared before commencement, and competency signed off before any unsupervised care \u2014 no exceptions.') ] },
        { t: 'Keeping the matrix live', b: [
          P('The training matrix is only useful if it is current.'),
          L(['Update completion and refresh dates as training is done.', 'Flag items due soon or expired to the Director of HR.', 'Items below threshold feed the QIP automatically.']) ] }
      ],
      quiz: [
        { q: 'Garda vetting must be cleared:', o: ['Within the first month', 'Before the person commences work', 'Before their first review'], a: 1, why: 'Vetting must be cleared before commencement \u2014 no exceptions.' },
        { q: 'Before a new HCA can work unsupervised they must have:', o: ['Attended Day 1 only', 'Completed 8 hours shadowing and a passed NCCA, signed off by the CSM (SOP-060)', 'Been employed for a month'], a: 1, why: 'SOP-060: unsupervised working requires 8 hours shadowing plus a satisfactory NCCA signed off by the CSM.' },
        { q: 'An expired mandatory training record in the matrix should be:', o: ['Left until the annual review', 'Flagged to the Director of HR \u2014 it feeds the QIP', 'Deleted'], a: 1, why: 'Expired items are flagged and drive corrective action via the QIP.' }
      ]
    }),
    hsereturn: C({
      title: 'Monthly returns, KPI dashboard & EMT pack', cat: 'Operations', policy: 'HSAS App. 8 \u00b7 SOP-039 \u00b7 SOP-040', duration: '30 min', format: 'Workshop',
      summary: 'Produce the monthly HSE return, update the KPI dashboard from validated source data, and compile the EMT governance pack \u2014 all reconciling to the same records.',
      objectives: ['Gather and reconcile monthly activity', 'Update the KPI dashboard from validated data (SOP-039)', 'Compile the EMT monthly pack (SOP-040)', 'Get sign-off and file for audit'],
      lessons: [
        { t: 'Gather & reconcile', b: [
          L(['Pull hours delivered, active packages, starts and ends by lot.', 'Reconcile delivered hours against authorised hours; note variances.', 'Cross-check complaints and incident counts against the logs.']) ] },
        { t: 'Complete & submit', b: [
          L(['Populate every field \u2014 use 0 or N/A, never blanks.', 'Manager review and sign-off before submission.', 'Submit by the monthly deadline and retain a dated copy.']),
          WARN('Figures must reconcile with the complaints, incident and roster records \u2014 auditors cross-check them.') ] },
        { t: 'The KPI dashboard (SOP-039)', b: [
          P('The monthly KPI dashboard is how the EMT, CGC and Board see quality at a glance \u2014 so the data must be right.'),
          L(['Each data owner supplies raw counts early in the month (workforce, service delivery, complaints, incidents, audits/QIPs).', 'The Director of Quality validates each raw count against source documents (sample at least 3 entries per KPI).', 'Validated counts are entered; rates auto-calculate and RAG against target and baseline.']),
          TIP('A dashboard is only as trustworthy as its validation \u2014 never enter a figure you have not traced to source.') ] },
        { t: 'The EMT pack (SOP-040)', b: [
          P('The Executive Management Team pack pulls the month together into one governance view.'),
          L(['Sections: risk register, incidents & safeguarding, audits & QIPs, workforce, complaints, operations and finance.', 'Each section has a named owner and is due ~5 working days before the meeting.', 'The Director of Operations compiles and circulates the pack ~3 working days ahead and loads it to the QMS.']),
          SCN('The complaints figure doesn\u2019t match',
            'While validating the dashboard, the resolved-within-30-days rate from the return doesn\u2019t match the Master Complaints Log.',
            'Stop and reconcile before publishing. Trace both figures to source, find which is wrong (often a mis-dated closure), correct it, and only then enter the validated count. Note the anomaly so the return, dashboard and EMT pack all tell the same story.',
            'The return, KPI dashboard and EMT pack must reconcile \u2014 auditors and the HSE cross-check them. Validation catches errors before they reach the Board.') ] }
      ],
      quiz: [
        { q: 'A field on the return doesn\u2019t apply this month. You should:', o: ['Leave it blank', 'Enter 0 or N/A', 'Guess a number'], a: 1, why: 'Never leave blanks \u2014 enter 0 or N/A so the return is complete and auditable.' },
        { q: 'Before a KPI figure goes on the dashboard it must be:', o: ['Estimated from memory', 'Validated against source documents (sample at least 3 per KPI)', 'Copied from last month'], a: 1, why: 'SOP-039: the Director of Quality validates each raw count against source before entry.' },
        { q: 'The return, KPI dashboard and EMT pack must:', o: ['Be produced by different people who never compare', 'Reconcile to the same underlying records', 'Only match at year end'], a: 1, why: 'All three reconcile to the same complaints, incident and roster records \u2014 auditors cross-check them.' }
      ]
    }),
    /* ---------------- ON-CALL ---------------- */
    oncall: C({
      title: 'On-call protocol & handover', cat: 'On-call', policy: 'GOV-11 \u00b7 SOP-018 \u00b7 SOP-020', duration: '30 min', format: 'Workshop',
      summary: 'Run the on-call phone consistently \u2014 triage, follow the right pathway, log every call and hand over cleanly to the office.',
      objectives: ['Know on-call hours and the line', 'Triage a call for immediate risk', 'Follow the right pathway (missed visit, deterioration, safeguarding)', 'Log and hand over every call'],
      lessons: [
        { t: 'The on-call role', b: [
          P('On-call covers weekdays 17:00\u201308:30 and weekends 24 hours. The line is 01-416-3717.'),
          L(['Identify the caller and the issue: service user, family or carer? Clinical, safeguarding, staffing or environmental?', 'Check for immediate risk \u2014 life-threatening means 999/112 first.', 'Follow the right pathway for the issue type.']) ] },
        { t: 'Triage the call', b: [
          P('Every call is triaged the same way \u2014 make safe first, then route to the right pathway.'),
          L(['Life-threatening \u2192 999/112 first, then continue.', 'Missed / late visit \u2192 confirm welfare and arrange cover (SOP-018).', 'Deterioration in condition \u2192 follow SOP-020; get clinical advice, do not attempt a clinical assessment.', 'Safeguarding \u2192 follow HS-23; incident \u2192 begin QA-13.']) ] },
        { t: 'Log & hand over', b: [
          L(['Record time, caller, issue and action taken for every call.', 'Brief the coordinator / CSM at the start of the next working day.']),
          WARN('Every out-of-hours call must be logged and handed over \u2014 nothing waits silently until Monday.') ] },
        { t: 'In practice', b: [
          SCN('A worried daughter rings at 10pm',
            'A Service User\u2019s daughter calls the on-call line: her mother seems more confused than usual and is unsteady on her feet.',
            'Triage: is there immediate danger (a fall, unresponsiveness)? If life-threatening, ensure 999/112. Otherwise treat as a possible deterioration (SOP-020): advise safety steps, arrange clinical advice (GP/out-of-hours doctor), and consider whether a visit is needed. Log the call with time, caller, observations and action, and hand over to the CSM first thing next morning.',
            'On-call is structured triage, not diagnosis \u2014 make safe, route to the correct pathway, and never let a call go unlogged or un-handed-over.') ] }
      ],
      quiz: [
        { q: 'The on-call line (01-416-3717) operates at weekends for:', o: ['17:00\u201308:30 only', '24 hours', 'Office hours only'], a: 1, why: 'Weekends are covered 24 hours; weekdays 17:00\u201308:30.' },
        { q: 'A caller reports a Service User seems to be deteriorating. You:', o: ['Do a quick clinical assessment yourself', 'Make safe, follow SOP-020 \u2014 arrange clinical advice; do not attempt a clinical assessment', 'Tell them to call their GP in the morning'], a: 1, why: 'On-call staff are non-clinical: make safe and route to clinical advice under SOP-020.' },
        { q: 'After handling any out-of-hours call you must:', o: ['Only log serious ones', 'Log it and hand over to the office next working day', 'Tell the next on-call if you remember'], a: 1, why: 'Every call is logged and formally handed over \u2014 nothing waits until Monday.' }
      ]
    }),
    emergency: C({
      title: 'Out-of-hours emergency response', cat: 'On-call', policy: 'GOV-11 \u00b7 HS-16 \u00b7 SOP-004 \u00b7 SOP-020 \u00b7 SOP-021', duration: '35 min', format: 'Workshop',
      summary: 'Respond safely to the most common time-critical situations \u2014 a fall, a deterioration, a suspected infection \u2014 and protect lone workers.',
      objectives: ['Triage for immediate risk', 'Follow the fall / deterioration / infection pathways', 'Protect lone workers (HS-16)', 'Log and escalate correctly'],
      lessons: [
        { t: 'A fall (SOP-004)', b: [
          P('Falls are among the most common emergencies. Safety and \u201cdo not move\u201d come first.'),
          L(['Stay calm; do NOT move the Service User if injury is suspected (fracture, soft-tissue, head strike) or if they cannot get up.', 'Talk to them \u2014 ask what happened and whether they hit their head; reassure them.', 'If injury is suspected or they cannot get up, call 999/112 and keep them warm.', 'Notify the CSM / on-call by phone; inform the family; complete a QA-13 incident report within 3 working days.']) ] },
        { t: 'Deterioration & infection (SOP-020 / SOP-021)', b: [
          P('HCAs are non-clinical \u2014 the job is to observe, make safe, and get clinical help fast.'),
          L(['Deterioration: ensure safety, note objective observations (breathing, colour, responsiveness), phone the on-call/CSM within ~5 minutes; 112/999 if life-threatening; send the home folder & medication list if hospitalised.', 'Suspected infection: apply Standard Precautions and the Point-of-Care Risk Assessment (PCRA card); report to the CSM who arranges GP/PHN assessment; 2+ linked cases = possible outbreak \u2014 notify the Director of Quality within 24 hours.']),
          WARN('Deterioration leading to hospital admission is at minimum a Category 2 incident \u2014 open a QA-13 report.') ] },
        { t: 'Protect the lone worker & in practice', b: [
          P('Carers work alone in the community, often after hours \u2014 their safety matters too.'),
          L(['If a carer is at risk, follow the Lone Worker Policy (HS-16); keep contact until they are safe and escalate if you cannot reach them.']),
          SCN('An unwitnessed fall with a head strike',
            'A carer arrives to find the Service User on the floor; they say they \u201cbumped their head\u201d getting up and feel dizzy.',
            'Do not move them. Because a head strike and dizziness are present, ensure 999/112 is called and keep them warm and still. Phone the on-call/CSM, inform the family, and stay until help arrives. Complete the QA-13 incident report the same shift \u2014 an unwitnessed fall with a head injury is likely Category 1/2 and is reviewed.',
            'Head injury + unwitnessed fall = do not move, call emergency services, and report as an incident. Guessing they are \u201cfine\u201d is never the call to make.') ] }
      ],
      quiz: [
        { q: 'A Service User has fallen and may have hit their head. You:', o: ['Help them up quickly to a chair', 'Do not move them, call 999/112, keep them warm and report it', 'Wait to see if they feel better'], a: 1, why: 'SOP-004: if injury/head strike is suspected, do not move them \u2014 call emergency services and complete a QA-13 report.' },
        { q: 'A deterioration leads to hospital admission. The incident is at least:', o: ['Not an incident', 'Category 2', 'Category 4'], a: 1, why: 'SOP-020: deterioration leading to hospital admission is at minimum a Category 2 incident.' },
        { q: 'If a lone carer is at risk out of hours you follow:', o: ['The complaints policy', 'The Lone Worker Policy (HS-16)', 'Nothing until Monday'], a: 1, why: 'Lone-worker risk is managed under HS-16.' }
      ]
    }),
    continuity: C({
      title: 'Business continuity & call-down', cat: 'On-call', policy: 'GOV-11 \u00b7 SOP-030', duration: '25 min', format: 'Workshop',
      summary: 'Activate the Business Continuity Plan during disruption \u2014 weather, pandemic or staffing shortage \u2014 protecting critical care and communicating clearly.',
      objectives: ['Know when and how the BCP is activated', 'Understand the Crisis Command roles', 'Prioritise critical Service Users and run the call-down', 'Communicate with staff, families and the HSE'],
      lessons: [
        { t: 'Activate & command (SOP-030)', b: [
          P('The Business Continuity Plan addresses events such as Red Weather Warnings, pandemics and industrial action.'),
          L(['The CEO convenes Crisis Command: CEO as Incident Lead (strategy), Director of Operations coordinating the response.', 'Retrieve the Business Continuity Folder from the off-site secure location (Directory of Contacts, priority lists, call-down rota).', 'Prioritise continuity of care for high-priority / high-dependency Service Users first.', 'Deploy the skeleton-staff rota and reassign HCAs to priority calls.']) ] },
        { t: 'Communicate & log', b: [
          P('Clear, constant communication is what holds a continuity response together.'),
          L(['Keep in regular contact with Service Users and families throughout the event.', 'Cascade to on-duty staff (email/phone/group) and off-duty staff (SMS/phone).', 'The CEO notifies HSE Emergency Management and, where relevant, insurers.', 'Maintain the Emergency Event Log of actions and decisions throughout.']),
          TIP('The call-down list only works if it is current \u2014 it is checked as part of BCP readiness, not on the day of the crisis.') ] },
        { t: 'In practice', b: [
          SCN('A Status Red storm overnight',
            'A Status Red wind warning is issued for tomorrow morning; travel is unsafe until midday.',
            'The CEO activates the BCP and convenes Crisis Command. The Business Continuity Folder is retrieved and Service Users are prioritised \u2014 P1 medication and high-dependency calls first. A skeleton rota of reachable staff is deployed for essential visits; all affected Service Users and families are phoned proactively; HSE Emergency Management is notified; and every decision goes in the Emergency Event Log.',
            'Continuity planning protects the most dependent people first and keeps everyone informed \u2014 improvising without the plan is how vulnerable Service Users get missed.') ] },
        { t: 'Stand-down & recovery', b: [
          P('A continuity event is not over when the weather clears \u2014 there is a controlled return to normal and a learning step.'),
          L(['The CEO / Director of Operations formally stands the response down once it is safe to resume normal service.', 'Confirm every priority Service User has been seen or accounted for \u2014 chase any missed calls and log them as incidents where needed (QA-13).', 'Restore the normal roster and notify staff, Service Users and families that service has resumed.', 'Hold a short debrief and update the Business Continuity Folder and call-down list with anything that was out of date.']),
          TIP('The best time to fix a wrong number or a stale priority list is in the debrief \u2014 while the event is fresh.') ] }
      ],
      quiz: [
        { q: 'During a Red Weather Warning, you prioritise:', o: ['All visits equally', 'High-dependency and high-priority (P1) packages first', 'Only visits that are convenient'], a: 1, why: 'SOP-030: continuity protects the most dependent Service Users first.' },
        { q: 'Who leads the Crisis Command structure when the BCP is activated?', o: ['The on-call HCA', 'The CEO as Incident Lead, with the Director of Operations coordinating', 'Whoever is in the office'], a: 1, why: 'SOP-030: the CEO is Incident Lead; the Director of Operations coordinates the response.' },
        { q: 'Once the disruption passes, the continuity response is closed by:', o: ['Everyone just going back to normal', 'A formal stand-down: confirm every priority Service User was accounted for, restore the roster, and debrief to update the plan', 'Deleting the Emergency Event Log'], a: 1, why: 'SOP-030: there is a controlled stand-down \u2014 account for priority Service Users, resume normal service, and learn from the event.' }
      ]
    }),
    /* ---------------- CLIENT SERVICE MANAGER ---------------- */
    supervision: C({
      title: 'Staff supervision & support', cat: 'Leadership', policy: 'HR-14 \u00b7 SOP-014', duration: '30 min', format: 'Workshop',
      summary: 'Run planned, protected, confidential one-to-one supervision \u2014 at least quarterly \u2014 that monitors performance, closes competency gaps and supports wellbeing.',
      objectives: ['Know the supervision frequency and setup', 'Structure a supervision session', 'Record it and agree SMART actions', 'Link supervision to competence and wellbeing'],
      lessons: [
        { t: 'Effective supervision', b: [
          L(['Hold supervision on schedule \u2014 it is a safety and quality control, not a formality.', 'Balance support and accountability; listen as well as direct.', 'Link supervision to the NCCA and training plan.']) ] },
        { t: 'Running a session (SOP-014)', b: [
          P('Supervision is planned, protected and confidential \u2014 not a corridor chat.'),
          L(['New HCAs get one-to-one supervision across their first 8 hours; thereafter at least quarterly (more often for complex cases or concerns).', 'Hold it in private and uninterrupted; confirm confidentiality and its limits.', 'Review progress since last time, praise good practice, and work through problems and Service-User feedback.', 'Agree SMART actions, set the next date, and both sign and date the Supervision Record (stored securely in the staff file).']) ] },
        { t: 'Support & boundaries', b: [
          L(['Watch for signs of stress or burnout; offer support early.', 'Reinforce professional boundaries (HR-38).', 'Link actions to the NCCA and the individual training plan.']),
          SCN('A carer seems to be struggling',
            'In supervision an experienced HCA is quieter than usual and mentions they are finding one complex Service User \u201ca lot\u201d lately.',
            'Keep the session private and unhurried. Listen, acknowledge, and explore the pressure without judgement. Agree practical supports \u2014 additional training, a shadowing refresh, a case discussion with the Clinical Lead, or workload adjustment \u2014 as SMART actions with a review date, and record them. Offer wellbeing supports and reinforce boundaries.',
            'Supervision is a safety control as well as support: catching strain early protects both the carer and the Service User, and turns a worry into an owned action.') ] }
      ],
      quiz: [
        { q: 'Formal supervision is held at minimum:', o: ['Annually', 'Quarterly (more often for complex cases or concerns)', 'Only when there is a problem'], a: 1, why: 'SOP-014: at least quarterly, with new HCAs supervised across their first 8 hours.' },
        { q: 'A supervision session should be:', o: ['A quick corridor catch-up', 'Planned, private and confidential, with a signed Supervision Record', 'Recorded only if something is wrong'], a: 1, why: 'SOP-014: supervision is planned, protected and confidential, and both parties sign the record.' },
        { q: 'Supervision should be linked to:', o: ['Nothing else', 'The NCCA and the individual training plan', 'Only pay reviews'], a: 1, why: 'Supervision connects to competency (NCCA) and the training plan.' }
      ]
    }),
    careplan: C({
      title: 'Care plan oversight & review', cat: 'Leadership', policy: 'CARE-08 \u00b7 SOP-002 \u00b7 SOP-032', duration: '30 min', format: 'E-learning',
      summary: 'Assure care plans are person-centred, clinically signed off, current, and responsive to change \u2014 scheduled and triggered reviews.',
      objectives: ['Assure person-centred, consent-led planning', 'Keep scheduled reviews on time', 'Run a triggered review within timeframe'],
      lessons: [
        { t: 'A person-centred plan (SOP-002)', b: [
          P('The care plan is built with the Service User and reflects their goals, not just their tasks.'),
          L(['Developed with the Service User / family; presume capacity and provide decision-making supports; apply FREDA.', 'Environmental (App 8), Falls (App 9) and Medication (App 10) risk assessments in place, each with a Risk Management Plan.', 'Getting to Know Me (App 7) captured; the Care Plan (App 6) signed off by the Clinical Lead.', 'A copy in the home folder and the office file (IM-30), accessible to all staff delivering care.']) ] },
        { t: 'Scheduled reviews', b: [
          P('Reviews keep the plan honest and current.'),
          L(['Review at 6 weeks, 6 months, then annually \u2014 earlier if needs change.', 'Evidence Service User involvement in every review.', 'Confirm visits are actually delivered in line with the plan, including the minimum call length.']) ] },
        { t: 'Triggered review (SOP-032)', b: [
          P('An unscheduled review is required when something changes \u2014 a fall, hospital discharge, deterioration or safeguarding pattern.'),
          L(['Capture the trigger in the CRM the same working day; involve the Clinical Lead for any clinical risk.', 'Initiate the review within 48 hours and complete it within 10 working days.', 'Update the risk assessments and Risk Management Plan; amend the plan only with consent and Clinical Lead sign-off.', 'Issue written notification of the outcome to the Service User / representative within 10 working days; raise a QIP (SOP-037) or add a risk (SOP-043) where a pattern emerges.']),
          TIP('For HSE-funded Service Users, any change to the level or type of support goes to the HSE for review and decision.') ] }
      ],
      quiz: [
        { q: 'Scheduled care-plan reviews happen at:', o: ['Annually only', '6 weeks, then 6 months, then annually', 'Every 2 years'], a: 1, why: 'SOP-002: reviews at 6 weeks, 6 months and annually \u2014 earlier if needs change.' },
        { q: 'A triggered (unscheduled) review must be initiated within 48 hours and completed within:', o: ['10 working days', '28 days', '3 months'], a: 0, why: 'SOP-032: initiate within 48 hours of the trigger and complete within 10 working days.' },
        { q: 'Changes to a care plan are signed off by:', o: ['The coordinator alone', 'The Clinical Lead', 'The HCA on the next visit'], a: 1, why: 'SOP-002 / SOP-032: care-plan changes require Clinical Lead sign-off, with Service User consent.' }
      ]
    }),
    audit: C({
      title: 'Participating in quality audits', cat: 'Quality', policy: 'QA-22.1 \u00b7 SOP-034 \u00b7 SOP-035', duration: '30 min', format: 'E-learning',
      summary: 'Understand how audits are planned and conducted, how to take part constructively, and how findings turn into improvement.',
      objectives: ['Understand the audit lifecycle', 'Know how an audit is planned & scheduled (SOP-034)', 'Know how an audit is conducted (SOP-035)', 'Act on findings'],
      lessons: [
        { t: 'The audit cycle', b: [
          P('Audits follow a standard lifecycle: plan \u2192 scope \u2192 sample \u2192 conduct \u2192 report \u2192 QIP \u2192 close-out / re-audit \u2192 share learning.'),
          L(['Audits are evidence-based and anonymised in reporting.', 'Sampling reflects high and low levels of support.', 'Findings drive Quality Improvement Plans, not blame.']) ] },
        { t: 'How audits are planned (SOP-034)', b: [
          P('The annual Quality Audit Schedule is risk-based and approved before the year starts.'),
          L(['The Director of Quality maps the audit universe to HSE Specs, KPIs, the National Standards themes and risk.', 'The schedule is drafted on the LLH Audit Calendar, with auditors independent of the area they audit.', 'It is approved by the Director of Operations and submitted to the HSE by end of January.']) ] },
        { t: 'How an audit is conducted (SOP-035)', b: [
          P('Every audit uses the Audit Working Pack so it is consistent, evidence-based and fair.'),
          L(['The auditor agrees an Audit Plan and does a pre-audit document review.', 'An opening meeting, a walk-around, staff interviews and a random record sample follow.', 'Everything is captured on the Audit Trail Record; findings are good practice, non-conformances or observations.']),
          SCN('Your area is being audited next week',
            'As a CSM you are the Audit Owner for a clinical audit and feel nervous about \u201cbeing caught out.\u201d',
            'Engage with it: the auditor agrees a plan and scope with you in advance, reviews documents, and samples records anonymously. Your job is to give honest access and evidence \u2014 not to prepare a perfect show. Findings (including good practice) feed a QIP, not blame, and you help shape the corrective actions.',
            'Audit is assurance and improvement, not inspection theatre. Independence, evidence and a no-blame culture are exactly what make findings trustworthy and useful.') ] }
      ],
      quiz: [
        { q: 'Audit findings are used primarily to:', o: ['Blame individuals', 'Drive Quality Improvement Plans and shared learning', 'Satisfy paperwork only'], a: 1, why: 'Audits are improvement-focused and systems-based, not about blame.' },
        { q: 'An auditor should be:', o: ['The manager of the area being audited', 'Independent of the activity being audited (SOP-034)', 'Any available HCA'], a: 1, why: 'SOP-034: auditors are allocated to ensure independence from the activity being audited.' },
        { q: 'Service-user details in an audit report are:', o: ['Named in full', 'Anonymised', 'Left to the auditor'], a: 1, why: 'All details are anonymised in the Quality Audit Report.' }
      ]
    }),
    qip: C({
      title: 'Managing QIP actions', cat: 'Quality', policy: 'QA-22 \u00b7 SOP-037 \u00b7 SOP-038', duration: '30 min', format: 'E-learning',
      summary: 'Open a Quality Improvement Plan from a finding, drive SMART actions to completion, and close it out on evidence \u2014 with the right governance visibility.',
      objectives: ['Open and scope a QIP (SOP-037)', 'Write SMART, owned, risk-scored actions', 'Track and close on evidence (SOP-038)', 'Understand the governance reporting route'],
      lessons: [
        { t: 'Opening a QIP (SOP-037)', b: [
          P('A QIP can start from an audit finding, an inspection, a complaint, feedback or an incident trend.'),
          L(['The Director of Quality allocates a unique QIP number and creates the record within 2 working days of the trigger.', 'A QIP Owner is assigned \u2014 by default the Audit Owner where it arose from an audit.', 'The QIP Owner risk-scores it (HSE matrix) as High/Medium/Low; High auto-notifies the Director of Operations.', 'Corrective actions are defined within 10 working days \u2014 each SMART with a named owner and target date.']),
          TIP('An action without an owner and a date is a wish, not a plan.') ] },
        { t: 'Track & close on evidence (SOP-038)', b: [
          P('QIPs are only closed when the action is done AND shown to have worked.'),
          L(['The QIP Log is the single source of truth (status, severity, due date, owner).', 'The Director of Quality issues a fortnightly prompt to owners with overdue or imminent actions.', 'The owner submits evidence of completion; High-risk QIPs may trigger a re-audit to confirm effectiveness.', 'Closure is recorded with the evidence reference and an effectiveness note; open QIPs are reported in the EMT & CGC packs.']),
          SCN('An overdue medication QIP',
            'A QIP to roll out a revised medication record is two weeks past its target date and the owner has gone quiet.',
            'The Director of Quality\u2019s fortnightly prompt flags it as overdue. Contact the owner for a status and blocker, re-agree a realistic date (recording the change), and escalate to the Director of Operations because it is a High-risk clinical action. It stays Open until evidence of completion \u2014 and, given the risk, a re-audit \u2014 confirms it worked.',
            'A QIP is not closed by good intentions or a passed deadline. Tracking, escalation and evidence of effectiveness are what turn a finding into real, lasting change.') ] }
      ],
      quiz: [
        { q: 'A QIP action should always be:', o: ['A general aim', 'SMART with a named owner and a target date', 'Owned by everyone'], a: 1, why: 'SOP-037: each corrective action is SMART with a named owner and target completion date.' },
        { q: 'Before a QIP is closed, the Director of Quality must:', o: ['Assume it worked once the date passes', 'Review evidence of completion and effectiveness (re-audit if High-risk)', 'Wait for the annual review'], a: 1, why: 'SOP-038: QIPs close on evidence of completion and effectiveness, not on the deadline passing.' },
        { q: 'Open QIPs are reported to governance via:', o: ['Nowhere \u2014 they are internal', 'The monthly EMT pack and quarterly CGC pack', 'Only the annual report'], a: 1, why: 'SOP-038: open QIP status is reported in the EMT (monthly) and CGC (quarterly) packs for Board oversight.' }
      ]
    }),

    /* ---- CARE COORDINATOR DEEP-DIVE (remote support) ---- */
    triage: C({
      title: 'Remote triage & prioritisation', cat: 'Operations', policy: 'QA-13 · GOV-25 · SOP-018 · SOP-004', duration: '30 min', format: 'E-learning',
      summary: 'The decision framework for everything that comes in by phone — how to work out what it is, how urgent it is, who owns it, and when to escalate immediately.',
      objectives: ['Ask the one question that comes before all others', 'Sort a call into safety, clinical or operational — and by urgency', 'Route each call to the right owner the first time', 'Recognise the calls that must be escalated immediately, not queued'],
      lessons: [
        { t: 'Triage starts with safety', b: [
          P('Triage is deciding, quickly and calmly, what a call actually is and what has to happen next. Before anything else you establish whether anyone is at risk right now.'),
          L(['Always open with the safety question: “Is anyone in immediate danger or hurt right now?”', 'If yes — 999/112 first, stay on the line, and only then continue. A life-safety call is never put on hold or queued.', 'If no — you have time to gather the facts calmly and decide the right route.']),
          WARN('Never let uncertainty delay a safety response. If you are unsure whether someone is at risk, treat it as if they are until you know otherwise.') ] },
        { t: 'Sort it: what kind of call is this?', b: [
          P('Once safety is established, every call sorts into one of three lanes. The lane decides who owns it.'),
          L(['Safety / safeguarding — a disclosure, suspected abuse, a fall, an injury, a medication error. Owner: DSO (safeguarding) or Clinical Lead / CSM (clinical), the same day.', 'Clinical — a change in the person, a care concern, a medication query. Owner: Clinical Lead / CSM.', 'Operational — a late or missed visit, a carer off sick, a roster change, a general query. Owner: you and the coordinator team, with the CSM for anything you cannot cover.']),
          TIP('Write the lane down as you decide it — it becomes the reason code and lets the office see patterns across calls.') ] },
        { t: 'Then rate the urgency', b: [
          P('Within each lane, urgency decides the timeframe. Use a simple three-level scale.'),
          FLOW(['Immediate — danger, serious harm, a safeguarding disclosure or a Category 1 incident. Act now; escalate before you hang up.', 'Same day — a missed visit, a fall with no obvious injury, a complaint, a clinical change. Log, act and notify the owner today.', 'Routine — a future roster change, a general enquiry, non-urgent feedback. Log and route; no same-day pressure.']),
          TIP('When two things compete, protect the highest-risk service user first — continuity and safety beat convenience every time.') ] },
        { t: 'Route it — and don’t drop it', b: [
          P('A call is only triaged when it has an owner and a next step. Your job is to make sure nothing sits silently.'),
          L(['Name the owner and the timeframe out loud to the caller: who will act, and by when.', 'Log it the same shift with the reason code and the action you took.', 'If it is out of hours, follow the on-call route — don’t leave it for Monday.', 'Close the loop: if you promised a call back, make sure it happens or is handed over.']),
          SCN('Two calls at once', 'A family rings about a carer running 40 minutes late, and on the other line a carer reports the service user has had a fall.', 'Take the fall first — ask the safety question, arrange the clinical response and raise the incident. Reassure the late-visit caller you’ll call straight back, arrange cover, and log both.', 'Urgency and risk decide order, not who called first. The fall is a same-day clinical/safety event; the late visit is important but lower-risk.') ] }
      ],
      quiz: [
        { q: 'The first thing to establish on any incoming call is:', o: ['Which carer is involved', 'Whether anyone is in immediate danger right now', 'Whether it needs a reason code'], a: 1, why: 'Safety comes before everything. If anyone is at risk it is 999/112 first, then continue.' },
        { q: 'A service user has had a fall with no obvious injury. This is:', o: ['Routine — log it for the weekly review', 'Same day — log, act and notify the Clinical Lead/CSM today, and raise an incident', 'Immediate only if they ask for an ambulance'], a: 1, why: 'A fall is a same-day clinical/safety event: incident raised (QA-13) and the owner notified the same day, even with no visible injury.' },
        { q: 'A call is properly triaged only when:', o: ['You have written down what was said', 'It has a named owner and a next step with a timeframe', 'You have reassured the caller'], a: 1, why: 'Triage means routed and owned — nothing is triaged until someone owns it with a clear next step and timeframe.' },
        { q: 'Two calls come at once: a late visit and a reported fall. You:', o: ['Take them in the order they rang', 'Handle the fall first, then call the late-visit caller straight back', 'Put both on hold and ask the CSM'], a: 1, why: 'Risk decides order. The fall is a same-day safety/clinical event; reassure and call the lower-risk caller straight back.' }
      ]
    }),
    difficultcalls: C({
      title: 'Handling difficult & high-emotion calls', cat: 'Communication', policy: 'QA-03 · HS-07 · HR-38 · SOP-011', duration: '30 min', format: 'E-learning',
      summary: 'Stay calm and in control when a caller is angry, distressed, grieving or disclosing something serious — de-escalate, keep everyone safe, and still capture what matters.',
      objectives: ['Steady a heated or distressed call with a clear technique', 'Take a complaint or a safeguarding disclosure by phone correctly', 'Hold professional boundaries and end an abusive call safely', 'Look after yourself after a hard call'],
      lessons: [
        { t: 'Meet emotion with calm', b: [
          P('People ring at their worst moments — frightened, angry, grieving. Your calm is the most useful thing in the conversation. It is almost never about you personally.'),
          L(['Lower your pace and your volume — do not match their heat.', 'Let them finish before you respond; interrupting adds fuel.', 'Name what you hear: “I can hear how worried you are — let’s sort this together.”', 'Focus on the next concrete step you can take, not on winning the point.']),
          TIP('A simple sequence: Listen → Acknowledge → Apologise for the experience → Act. You can acknowledge someone’s upset without admitting fault.') ] },
        { t: 'A complaint on the phone', b: [
          P('A complaint is a gift — it tells you where the service fell short. Never defend at the point of contact.'),
          L(['Open with: “I’m really sorry to hear that — thank you for telling me.”', 'Resolve it there if you genuinely can; otherwise take the full details.', 'Explain the next step honestly: the Complaints Officer will be in touch within 5 working days.', 'Log it on the Master Complaints Log (QA-03) with a verbatim record where it matters.']),
          WARN('Never argue, minimise or promise an outcome you can’t guarantee. If a complaint hints at abuse or neglect, treat it as safeguarding and route to the DSO the same day.') ] },
        { t: 'A safeguarding disclosure by phone', b: [
          P('Sometimes the hardest calls are the quietest — someone telling you something is wrong at home. How you respond in the first minute matters enormously.'),
          L(['Listen, stay calm, take it seriously and use their own words.', 'Reassure them — but never promise to keep it secret.', 'Do not investigate, do not ask leading questions, do not contact the alleged person.', 'Record exactly what was said and report to the DSO the same day.']),
          WARN('You receive and route a disclosure — you never investigate it. Anything more than listening and recording can damage a future safeguarding process.') ] },
        { t: 'Boundaries, safety and after the call', b: [
          P('You can be kind and firm at the same time. You do not have to accept abuse, and you should not carry a hard call alone.'),
          L(['If a caller becomes abusive: stay calm and set one clear boundary — “I want to help, but I can’t continue if the language continues.”', 'If it continues, tell them you are ending the call and that someone will follow up, then end it and log it.', 'Never give personal contact details or take on something outside your role (professional boundaries, HR-38).', 'After a distressing call, tell your supervisor — debrief, record it, and take a moment. This is support, not weakness.']),
          SCN('An angry son on the line', 'A service user’s son is shouting that the morning carer never showed and threatens to “report you all”.', 'Let him finish, acknowledge the failure and apologise for the experience, establish the missed visit and arrange cover now, log it as a complaint and a missed-visit incident, and tell him the Complaints Officer will be in touch within 5 working days.', 'Meeting anger with calm and concrete action de-escalates it and turns a threat into a logged, owned complaint the service can actually put right.') ] }
      ],
      quiz: [
        { q: 'A caller is shouting and upset. Your first move is to:', o: ['Match their urgency so they know you care', 'Lower your pace and volume, let them finish, and acknowledge their feeling', 'Tell them to calm down or you’ll end the call'], a: 1, why: 'Calm de-escalates; matching their heat escalates. Listen, acknowledge, then move to the next concrete step.' },
        { q: 'Someone discloses possible abuse and asks you to keep it secret. You:', o: ['Agree, so they keep trusting you', 'Reassure them but explain you must pass it to the DSO to keep them safe', 'Ask them who did it and exactly what happened'], a: 1, why: 'Never promise secrecy and never investigate. Receive it, record their words, and report to the DSO the same day.' },
        { q: 'The right opening for a complaint on the phone is:', o: ['To explain the likely reason it wasn’t our fault', '“I’m really sorry to hear that — thank you for telling me.”', 'To transfer them to a manager immediately'], a: 1, why: 'Acknowledge and apologise for the experience, take the details, and log it (QA-03) — never defend at the point of contact.' },
        { q: 'A caller becomes abusive and won’t stop after you set a boundary. You should:', o: ['Keep taking it — the customer is always right', 'Tell them you’re ending the call, that someone will follow up, then end it and log it', 'Hang up without a word'], a: 1, why: 'You don’t have to accept abuse. Set one clear boundary, and if it continues, end the call safely, explain follow-up, and record it.' }
      ]
    }),
    crmlogging: C({
      title: 'Logging it right in the CRM', cat: 'Communication', policy: 'IM-30 · IM-05 · QA-13', duration: '25 min', format: 'E-learning',
      summary: 'The record discipline behind every call — what to capture, in whose words, with the right reason code, protecting personal data, and handing over so nothing is lost.',
      objectives: ['Capture the six things every call record needs', 'Use reason codes so the office can see patterns', 'Protect personal data on the phone and in the record', 'Hand over cleanly so nothing waits silently'],
      lessons: [
        { t: 'If it isn’t written down, it didn’t happen', b: [
          P('The record is the service’s memory. A good log lets the next person act without ringing the caller back, and stands up months later in an audit or a complaint.'),
          L(['Log every call the same shift — not from memory at the end of the week.', 'Capture: who called and their relationship to the service user; the service user’s name; date and time; what was said; the action you took and who you routed it to; and what you committed to, with the timeframe.', 'Record facts, not opinions. For a complaint or a disclosure, use the caller’s own words in quotation marks.']),
          TIP('Write the record as if the person you’re handing to has never heard the story — because often they haven’t.') ] },
        { t: 'Reason codes turn calls into patterns', b: [
          P('The reason code is what lets the office see the signal in the noise — three “late visit” calls in one area this week is an early warning, not a coincidence.'),
          L(['Always set the reason code that matches the lane — safety, clinical or operational, and the specific type.', 'Be consistent: the same kind of call gets the same code every time.', 'Flag clusters to the CSM — a pattern across calls is a risk the individual calls don’t show.']),
          SCN('The cluster hiding in plain sight', 'By Thursday you’ve logged three separate “carer running late” calls in the same town.', 'Handle each properly, but because you coded them consistently you can see the pattern — flag the cluster to the CSM and Operations as an emerging risk.', 'Consistent coding turns a pile of individual calls into a pattern the service can act on before it becomes a serious incident or a complaint.') ] },
        { t: 'Protect the data (GDPR on the phone)', b: [
          P('A service user’s information is special-category personal data. The record must be accurate, relevant and shared only with people who are authorised.'),
          L(['Verify the caller’s identity and authority before discussing or recording anything sensitive.', 'Keep the record factual and relevant — don’t write things that aren’t needed.', 'Keep safeguarding detail out of the open CRM — file it to the restricted safeguarding record only.', 'If you disclose to the wrong person, report it to the DPO immediately as a personal-data breach.']),
          WARN('Sharing a service user’s details with someone not authorised on the file is a data breach — report it to the DPO the same day (dpo@libertyhomecare.ie).') ] },
        { t: 'Hand over so nothing is lost', b: [
          P('Your shift ends; the service user’s needs don’t. A clean handover is the difference between continuity and a dropped ball.'),
          L(['At end of shift, brief the incoming coordinator / CSM on anything open or promised.', 'For out-of-hours calls, hand over to the office at the start of the next working day.', 'Make sure every promised call-back has an owner — don’t assume someone else saw it.', 'Check nothing you took today is sitting unrouted.']),
          TIP('“Nothing waits silently” is the whole job — an open item with no owner is how things go wrong.') ] }
      ],
      quiz: [
        { q: 'Every call record must include:', o: ['Only complaints and incidents', 'Who, when, what was said, the action taken and who it was routed to, and what you committed to', 'A summary written up at the end of the week'], a: 1, why: 'Log every call the same shift with who / when / what / action / owner / commitment — that record is what lets the office act and see patterns.' },
        { q: 'Why do reason codes matter?', o: ['They’re required by the software', 'They let the office see patterns across calls — a cluster is a risk a single call doesn’t show', 'They speed up typing'], a: 1, why: 'Consistent codes turn individual calls into patterns (e.g. a late-visit cluster) that can be acted on early.' },
        { q: 'A caller you can’t verify asks for a service user’s details. You:', o: ['Share it — they clearly know the person', 'Verify identity and authority first; if you can’t, take a message and check before disclosing', 'Refuse and hang up'], a: 1, why: 'Special-category data is only shared with authorised people. Verify first; a wrong disclosure is a breach reportable to the DPO.' },
        { q: 'At the end of your shift you have an open call-back you promised. You:', o: ['Leave it — someone will pick it up', 'Hand it over to the incoming coordinator / CSM with a clear owner', 'Only note it if it was urgent'], a: 1, why: 'Nothing waits silently — every open or promised item is handed over with a named owner so continuity holds.' }
      ]
    }),
    oncalldecision: C({
      title: 'When to wake the on-call manager', cat: 'On-call', policy: 'GOV-11 · HS-16 · On-Call SOP · QA-13', duration: '20 min', format: 'E-learning',
      summary: 'A clear decision aid for out-of-hours — what always warrants calling the on-call manager, what can safely wait until morning, and how to brief them fast.',
      objectives: ['Know what must reach the on-call manager immediately', 'Judge what can safely wait for the next working day', 'Brief the on-call manager in under a minute', 'Keep lone workers safe out of hours'],
      lessons: [
        { t: 'The golden rule out of hours', b: [
          P('Out of hours there is no office to fall back on — the on-call manager is the safety net. When in doubt, call: it is always better to wake someone than to sit on a risk.'),
          L(['On-call line: 01-416-3717 — weekdays 17:00–08:30 and 24h at weekends.', 'If anyone is in immediate danger, 999/112 comes first, then the on-call manager.', 'Every out-of-hours call you take is logged and handed over — nothing waits silently until Monday.']),
          WARN('If you are unsure whether something warrants waking on-call, it does. Escalate first and stand it down later — never the other way round.') ] },
        { t: 'Call on-call now for…', b: [
          P('These always warrant an immediate call to the on-call manager.'),
          L(['A safeguarding disclosure or suspected abuse.', 'A fall, injury, or a marked change in a service user.', 'A medication error, or a service user who is unwell.', 'A missed visit or an uncovered high-risk call with no cover.', 'A lone worker who is in trouble, threatened, or out of contact.', 'The death of a service user.', 'Any incident that looks Category 1 / serious.']),
          TIP('Category 1 or safeguarding out of hours = call immediately, then follow the right pathway (QA-13 / HS-23).') ] },
        { t: 'These can usually wait for morning', b: [
          P('Lower-risk items can be logged and handed to the office at the start of the next working day — no need to wake anyone.'),
          L(['A routine roster change for a future date.', 'A general enquiry with no safety element.', 'Non-urgent feedback or a compliment.', 'A supply or admin query that isn’t time-critical.']),
          TIP('Log it clearly tonight so the morning team picks it up — “handed over” only counts if it’s written down.') ] },
        { t: 'Brief the on-call manager fast', b: [
          P('When you do call, give them what they need to decide in one clear minute.'),
          FLOW(['Who and where — service user name, location, who else is involved.', 'What has happened — the facts, briefly, no opinions.', 'What you’ve done — 999? cover arranged? incident started?', 'What you need — a decision, or for them to take it on.']),
          SCN('A carer can’t reach a service user at 8pm', 'A carer rings: no answer at the door, curtains drawn, and the service user isn’t picking up the phone.', 'Treat it as a welfare concern — keep the carer safe (don’t force entry alone), call the on-call manager immediately, and be ready to call 999 / next of kin as they direct.', 'A possible collapse behind a locked door is a time-critical safety risk — it always warrants waking on-call, and the carer should never put themselves at risk.') ] }
      ],
      quiz: [
        { q: 'You’re unsure whether something is serious enough to call on-call. You:', o: ['Wait until morning to be safe', 'Call — if you’re unsure it warrants a call; stand it down later if needed', 'Ask another coordinator first'], a: 1, why: 'When in doubt, escalate first and downgrade later — never sit on a possible risk out of hours.' },
        { q: 'Which of these can usually wait until the next working day?', o: ['A fall with no obvious injury', 'A routine roster change for next week', 'A carer who is out of contact'], a: 1, why: 'A future roster change is low-risk and handed over; a fall or a lost lone worker warrant an immediate call.' },
        { q: 'The on-call line and hours are:', o: ['The office mobile, 9–5', '01-416-3717 — weekdays 17:00–08:30 and 24h weekends', 'Whoever answers first'], a: 1, why: 'On-call: 01-416-3717, covering weekday evenings/nights and full weekends.' },
        { q: 'A carer can’t get a response from a service user behind a locked door. You:', o: ['Tell the carer to force entry', 'Keep the carer safe, call on-call immediately, be ready for 999 / next of kin', 'Log it for the morning'], a: 1, why: 'A possible collapse behind a locked door is time-critical — wake on-call now and never ask a lone worker to put themselves at risk.' }
      ]
    }),
    coordinatorshift: C({
      title: 'The coordinator’s day: start to handover', cat: 'Operations', policy: 'HR-29 · GOV-25 · IM-30 · QA-13', duration: '25 min', format: 'E-learning',
      summary: 'The rhythm of a safe coordinator shift — the checks that open it, the sweeps that keep it safe through the day, and the handover that closes it so nothing is dropped.',
      objectives: ['Open the shift with the right checks', 'Run the sweeps that catch problems early', 'Keep the roster and the log honest all day', 'Hand over so nothing waits silently'],
      lessons: [
        { t: 'Open the shift', b: [
          P('The first half hour sets up a safe day. Before the calls build, know where the risks are.'),
          L(['Read the handover from the previous shift / on-call — pick up anything open or promised.', 'Scan today’s roster for gaps, unallocated visits and high-risk calls.', 'Check for carer call-outs and sort cover for the highest-risk service users first.', 'Note anything the office flagged — new referrals, service users of concern.']),
          TIP('Five minutes reading the handover saves an hour of firefighting later.') ] },
        { t: 'Sweeps through the day', b: [
          P('Problems are cheap to fix early and expensive late. Build in regular sweeps rather than waiting for the phone to ring.'),
          L(['Missed-visit sweep — check the clock-ins; chase anything showing late (>30 min) before it becomes a missed visit (>60 min / non-delivery).', 'Message triage — clear voicemails, texts and emails so nothing sits unseen.', 'Roster integrity — keep continuity of carer where you can; never shorten a visit to fit.', 'Reason-code your calls as you go, and flag any cluster to the CSM.']),
          WARN('A visit passing 60 minutes late, or not delivered, is a missed visit — reallocate by risk, tell the service user, and raise an incident (QA-13).') ] },
        { t: 'Close the shift', b: [
          P('The service user’s needs don’t clock off with you. A clean handover is the whole point of the shift ending well.'),
          L(['List everything open or promised, with a named owner for each.', 'Brief the incoming coordinator / CSM — or the on-call manager if it’s out of hours.', 'Confirm every high-risk visit for the evening / next morning is covered.', 'Make sure nothing you took today is sitting unrouted or unlogged.']),
          SCN('The half-finished callback', 'It’s 5pm, you promised a family a call back about tomorrow’s carer, and you’ve run out of time.', 'Don’t leave it in your head — log it, and hand it explicitly to the incoming coordinator or on-call with the family’s number and what was promised.', 'A promise held only in your memory is a dropped ball waiting to happen; handed over with an owner, it’s continuity.') ] }
      ],
      quiz: [
        { q: 'The first thing to do when you open a coordinator shift is:', o: ['Start answering the phone', 'Read the handover and scan the roster for gaps and high-risk calls', 'Make a coffee and wait for calls'], a: 1, why: 'Reading the handover and scanning the roster tells you where the risks are before the day builds.' },
        { q: 'A visit is now 65 minutes late with no delivery. This is:', o: ['Still just “late”', 'A missed visit — reallocate by risk, tell the service user, raise an incident', 'Only a problem if the family complains'], a: 1, why: '>60 minutes or non-delivery = a missed visit, raised as an incident (QA-13) and covered by risk.' },
        { q: 'The point of the end-of-shift handover is:', o: ['To finish your notes', 'To pass every open or promised item to a named owner so nothing is dropped', 'To tell the manager you’re leaving'], a: 1, why: 'Handover exists so nothing waits silently — every open item leaves your shift with an owner.' },
        { q: 'You promised a callback but ran out of time. You:', o: ['Hope you remember tomorrow', 'Log it and hand it over with the number and what was promised', 'Leave a sticky note on your desk'], a: 1, why: 'A promise held only in memory gets dropped; logged and handed to a named owner, it holds.' }
      ]
    })
  };

  // role pathways -> ordered course ids + seeded completion (C=complete, P=in progress, N=not started)
  var PATHMAP = [
    { role: 'Healthcare Assistant', icon: 'health_and_safety', people: 68, focus: 'Safe, person-centred personal care in the home — rights, safety and knowing when to escalate',
      modules: [['carevisit','C'],['consent','C'],['dignity','C'],['personalcare','P'],['medsupport','P'],['handling','C'],['ipc','C'],['fallsprev','N'],['dementiacare','N'],['loneworking','C'],['boundaries','P'],['homerecords','N'],['safeguarding','P'],['incident','N'],['emergency','N']] },
    { role: 'Care Coordinator', icon: 'hub', people: 12, focus: 'Scheduling, allocation, referral intake & family communication',
      modules: [['phonesupport','C'],['rostering','C'],['referral','C'],['comms','C'],['triage','P'],['difficultcalls','N'],['crmlogging','N'],['oncalldecision','N'],['coordinatorshift','N'],['complaints','C'],['incident','P'],['gdpr','C'],['records','P']] },
    { role: 'Office Administrator', icon: 'desktop_windows', people: 9, focus: 'Records, data entry, document control & HSE returns',
      modules: [['records','C'],['gdpr','C'],['complaints','C'],['hsereturn','P'],['stafffile','C'],['doccontrol','C']] },
    { role: 'On-Call Manager', icon: 'support_agent', people: 8, focus: 'Out-of-hours response, triage, escalation & safeguarding',
      modules: [['oncall','C'],['emergency','C'],['safeguarding','P'],['incident','P'],['escalation','N'],['continuity','C']] },
    { role: 'Client Service Manager', icon: 'manage_accounts', people: 9, focus: 'Supervision, care oversight, complaints investigation & audit',
      modules: [['supervision','C'],['careplan','C'],['complaintsinv','C'],['audit','P'],['qip','C'],['opendisclosure','C']] }
  ];

  // sample staff for the monitoring view (name, role key index into PATHMAP, completion overrides)
  var STAFF = [
    { name: 'Mary James', role: 'Care Coordinator', area: 'Offaly', pct: 100 },
    { name: 'John Mathias', role: 'Care Coordinator', area: 'Offaly', pct: 86 },
    { name: 'Alison Carroll', role: 'Client Service Manager', area: 'Dublin', pct: 100 },
    { name: 'Tina Zambra', role: 'Client Service Manager', area: 'Dublin', pct: 83 },
    { name: 'Kelsie Leavy', role: 'Client Service Manager', area: 'Laois', pct: 67 },
    { name: 'Karen McLoughlin', role: 'Office Administrator', area: 'Head office', pct: 100 },
    { name: 'Sinead Byrne', role: 'Office Administrator', area: 'Head office', pct: 83 },
    { name: 'Leah O\u2019Brien', role: 'On-Call Manager', area: 'All lots', pct: 100 },
    { name: 'David Nolan', role: 'On-Call Manager', area: 'All lots', pct: 67 },
    { name: 'Grace Okafor', role: 'On-Call Manager', area: 'Dublin', pct: 50 },
    { name: 'Patrick Doyle', role: 'Care Coordinator', area: 'Laois', pct: 71 },
    { name: 'Aoife Kelly', role: 'Care Coordinator', area: 'Dublin', pct: 100 }
  ];

  window.LLH_COURSES = COURSES;
  window.LLH_PATHMAP = PATHMAP;
  window.LLH_STAFF = STAFF;
})();
