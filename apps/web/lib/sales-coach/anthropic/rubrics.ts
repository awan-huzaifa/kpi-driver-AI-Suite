export const RUBRIC_FUS = `
FOLLOW-UP SPECIALIST RUBRIC (100 POINTS)

Purpose of Role:
- Qualify the lead
- Extract structured data
- Build trust
- Identify motivation
- Move to scheduling or next step
- Maintain compliance

1. Rapport & Communication Quality — 15 pts
15: natural, empathetic, confident, smooth
10-14: good but slightly robotic or missed empathy
5-9: transactional, low engagement
0-4: awkward, pushy, or unprofessional
Key signals: tone matching, acknowledging seller statements, no robotic script reading

2. Qualification Completeness — 25 pts (MOST IMPORTANT)
Address confirmed: 3pts
Ownership: 2pts
Occupancy: 3pts
Condition: 4pts
Timeline: 4pts
Reason for selling: 4pts
Price expectation: 3pts
Listing status: 2pts

3. Motivation Discovery Depth — 15 pts
15: uncovered real WHY + urgency + consequence
10-14: decent but shallow
5-9: surface-level only
0-4: missed entirely
We want: emotional + logical driver, "why now", "what happens if not solved"

4. Conversation Control & Structure — 10 pts
10: structured, one question at a time, guided flow
7-9: mostly controlled
4-6: scattered
0-3: chaotic

5. Objection Handling — 15 pts
Focus = keeping conversation alive, not closing.
10-15: calm, curious, keeps engagement
7-9: acceptable
4-6: weak recovery
0-3: collapses or avoids

6. Scheduling / Next Step Execution — 15 pts
15: Live Transfer
10-14: Appointment Booked
5-9: Tried but did not book
0-4: Did not try, did not book

7. Compliance & Guardrails — 5 pts
Giving a range: 5pts
Not giving a range: 5pts
Giving a specific number: 0pts

PENALTIES:
- Gave offer: -10pts
- Missed scheduling cue: -10pts

SUCCESS DEFINITION:
A perfect call = fully qualified + clear motivation + smooth experience + clean handoff or booked call.
FUS should NEVER negotiate or give offers. Do NOT score on whether a deal was closed.
`;

export const RUBRIC_ACQ = `
ACQUISITION SPECIALIST RUBRIC (100 POINTS)

Purpose of Role:
- Understand deal deeply
- Identify true seller motivation
- Evaluate opportunity
- Guide seller decision
- Negotiate effectively
- Advance deal appropriately (not always close)

1. Rapport, Trust & Authority — 5 pts
5: trusted advisor, confident, credible
4: good but not authoritative
2-3: neutral
0-1: weak or untrustworthy
This is NOT friendliness — this is credibility.

2. Strategic Discovery & Deal Understanding — 20 pts
Not just asking questions — understanding the deal.
Must cover: condition depth, repairs, timeline, motivation, financial context, flexibility, decision-maker clarity
20: full picture built
15-19: strong
10-14: partial
0-9: weak

3. Motivation & Pain Extraction — 20 pts (CRITICAL)
This is the core of acquisitions.
20: deep emotional + financial pain uncovered
15-19: strong
10-14: surface
0-9: weak
This directly affects negotiation power.

4. Deal Control & Framing — 10 pts
10: rep leads, frames conversation like a buyer
7-9: mostly in control
4-6: reactive
0-3: lost control

5. Offer Strategy & Positioning — 15 pts
Score based on: did they set up the offer? justify it logically? test expectations first? protect margin?
15: strong positioning
10-14: decent
5-9: weak
0-4: poor or premature

6. Objection Handling (Advanced) — 10 pts
Includes: price resistance, hesitation, competing offers, distrust
10: isolates + resolves
7-9: good
4-6: weak
0-3: fails

7. Deal Advancement Decision Quality — 10 pts
We measure: did they choose the RIGHT next step?
Examples: push to contract, schedule follow-up, disqualify, nurture, escalate
10: optimal decision
7-9: good
4-6: questionable
0-3: wrong move

8. Closing / Commitment Execution — 15 pts
ONLY when appropriate.
10-15: clear ask for commitment
5-9: attempted
1-4: weak
0: avoided when appropriate

PENALTIES:
- No offer made when appropriate: -5pts
- Lost control of call: -5pts

SUCCESS DEFINITION:
A perfect call = deep seller understanding + strong leverage built + correct decision made + seller moved forward appropriately.
Do NOT force a one-call close. Do NOT score negatively for not closing when context did not support it.
`;

export const CALL_STAGE_MAP: Record<string, string> = {
  "Nurture Pipeline": "Nurture",
  "New Lead": "First Touch",
  "Responded": "Ongoing",
  "Attempted Contact": "Follow Up",
  "Perseverant": "Follow Up",
  "Contacted - Follow Up": "Follow Up",
  "Skip Trace Completed": "Follow Up",
  "Negotiating": "Negotiating",
  "Offer Made": "Negotiating",
  "Appointment Set": "Discovery",
  "No-Show": "Discovery",
  "Contract Sent": "Closing",
  "Contract Signed": "Closing",
  "Closed Deal": "Final Touch",
};