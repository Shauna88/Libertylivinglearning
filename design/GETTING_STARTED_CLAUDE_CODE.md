# Getting Started with Claude Code — Liberty Living Operations Platform

This is a plain-language guide to turning the design in this folder into a real, working web app using **Claude Code**. You do not need to know how to program — but you (or a colleague) should be comfortable installing software and following steps. If that's not you, hand this whole folder to a developer instead; it's written so they can start immediately.

> **Scope note:** this is a full home-care operations platform — a client CRM, quality/compliance registers, staff training, finance and HR — not a single tool. It's a real, phased software build. The README lists suggested phases; you do not have to build everything at once. Decide with your developer which domain ships first (the CRM and the Complaints/Incidents/Safeguarding registers are the usual starting points).

---

## What Claude Code is (in one line)
It's a tool that writes and runs real application code for you, from plain-English instructions — like having a developer you talk to in a chat window, working directly on your project files.

---

## Before you start — a few decisions to make
You don't need answers to these to *begin*, but you'll be asked, so it helps to have thought about them:

1. **Where will it live?** The app and its database should be hosted **in the EU** (this holds service-user health data *and* staff personal data — GDPR). Good beginner-friendly options: **Vercel** (hosting) + **Supabase** (database + logins), both with EU regions.
2. **Who is your DPO / data-protection contact?** You already have `dpo@libertyhomecare.ie`. Loop them in early — this app holds special-category (health) data about clients.
3. **Who needs logins, and what role each?** Executives/PIC, Directors (Quality, HR, Finance), Client Service Managers, Recruitment, Care Coordinators, HCAs — and optionally a read-only client/family portal. (The README's "Roles & access" explains each.)
4. **Which domain ships first?** CRM, the risk registers, training, finance — you don't need all at once.

You do **not** need to buy anything to start experimenting locally — costs come when you go live.

---

## Step 1 — Install the tools
On the computer you'll use:

1. Install **Node.js** (the runtime the app needs) — download the "LTS" version from nodejs.org.
2. Install **Claude Code** — follow the official install instructions at the Anthropic docs (search "install Claude Code"). It runs in your computer's Terminal / command line.
3. Put **this handoff folder** somewhere easy to find (e.g. your Desktop).

If any of this feels unfamiliar, this is the natural point to bring in a technical person — everything after here is smoother with one.

---

## Step 2 — Open the project in Claude Code
1. Open your Terminal.
2. Navigate into this handoff folder.
3. Start Claude Code in that folder.

It will now be able to "see" the files here: the README (the full spec), the QMS design, and the course/SOP content.

---

## Step 3 — Your first prompts
Give Claude Code these one at a time. Wait for it to finish and read back what it did before sending the next.

**Prompt 1 — orient it:**
> Read README.md in this folder. It's the spec for a home-care operations platform (client CRM, quality/compliance registers, staff training, finance and HR) that I want to build as a real, role-based web app with individual logins and server-side records. Summarise back to me the recommended stack, the roles, the data model, and the build phases so I know you understand it.

**Prompt 2 — set up the foundation (Phase 1):**
> Let's do Phase 1 from the README. Set up the recommended stack with authentication and a Postgres database, hosted-ready for an EU region. Create the role-based auth for the roles in the README, and the core database tables. Then seed the reference data — courses and pathways from training-content.js, the 70 SOPs from training-sops.js, and the rate schemes from the prototype. Explain each step in plain English, and tell me anything you need me to decide or sign up for.

**Prompt 3 — the first domain (Phase 2 — CRM):**
> Now build the CRM core from the README: the client register with status chips, a client profile (schedule, care plan tasks, care notes, documents), scheduling and rosters, the live monitor, and the "reveal identifiable data" gate with an access log. Match the look of "Liberty Living QMS.dc.html" — same colours, fonts and layout.

**Prompt 4 — registers + improvement (Phase 3):**
> Build the Complaints, Incidents and Safeguarding registers with staff-lodged intake, plus the Improvement & Training hub: review an issue, sign it off with an outcome, route it to another department to own the fix, and push a refresher course or SOP to a team or named individuals. Make the department routing actually move the issue into the target department's dashboard inbox.

From there, keep following the phases in the README (reference modules, then live registers, then GDPR hardening).

---

## Step 4 — Look at it as you go
Claude Code can run the app locally so you can open it in your browser and click around. Ask it:
> Run the app locally and give me the address to open in my browser.

Try it as if you were a staff member. Tell Claude Code what feels wrong in plain words ("the pass mark should be 80%", "add the logo here") — it will change it.

---

## Step 5 — Going live (do this with a technical person / your DPO)
Before real staff use it:
- Host it in an **EU region** (data residency).
- Turn on secure logins (passwords + ideally 2-factor for managers).
- Confirm **retention, backups, an audit log, and data-subject access** with your DPO.
- Do a short test with 2–3 friendly staff before rolling out widely.

Ask Claude Code:
> Walk me through deploying this to an EU region and the security and GDPR steps I should complete before real staff log in.

---

## Good habits
- **One thing at a time.** Small, clear requests beat one giant one.
- **Ask it to explain.** "Explain that in plain English" always works.
- **Say when something looks wrong.** It expects that and will fix it.
- **Keep this README open.** It's the source of truth for what to build — point Claude Code back to it whenever it drifts.

---

## If this is too technical
That's completely normal — it's a real software build. Two fallbacks:
1. **Hand this whole folder to a developer.** The README lets them start without a long briefing.
2. **Use an off-the-shelf LMS** (TalentLMS, iSpring, Thinkific, Moodle). You get staff logins and tracked completions with **no code at all** — you'd re-enter the course content, which I can format for you.

Either way, the thinking and content are already done — this folder is the hard part, finished.
