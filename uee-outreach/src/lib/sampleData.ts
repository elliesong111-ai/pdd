// All people and companies below are fictional, created for the public demo.
export const SAMPLE_CSV = `Name,Email,Company,Title,Industry,LinkedIn,Source,Notes,Status
Maya Patel,maya.patel@example.com,Northwind Logistics,VP of Operations,Logistics,,Babson alumni network,She posted about piloting AI route-planning tools with dispatchers.,not_contacted
Jordan Lee,jordan.lee@example.com,Brightpath Health,Director of People & Learning,Healthcare,,Met at the Babson AI in Business panel,Leads an internal AI literacy program for 2000 staff.,contacted
Sofia Martinez,sofia.m@example.com,Cobalt Analytics,Senior Data Scientist,Software,,Referred by Prof. Kim,Wrote a blog post on why analysts don't trust model outputs.,replied
Daniel Okafor,d.okafor@example.com,Harborline Bank,Head of Process Transformation,Financial Services,,LinkedIn search,Runs the bank's GenAI governance working group.,scheduled
Priya Shah,priya@example.com,Lumen Studio,Product Lead,Design & Media,,Startup founder Slack group,Building AI-assisted design workflows for a 15-person agency.,done
Ethan Brooks,ethan.brooks@example.com,Granite Manufacturing,Plant Operations Manager,Manufacturing,,Family friend intro,Rolled out AI quality inspection on two production lines.,not_contacted
Hannah Kim,hannah.kim@example.com,Evergreen Consulting,Strategy Consultant,Consulting,,Babson classmate's manager,Advises mid-size firms on AI adoption roadmaps.,not_contacted
Marcus Chen,m.chen@example.com,Atlas Retail Group,Chief Information Officer,Retail,,Conference speaker list,Spoke about rolling out Copilot to 5000 store employees.,contacted
Aisha Rahman,aisha.r@example.com,Willow Legal,Knowledge Management Lead,Legal Services,,Women in AI Boston meetup,Is evaluating AI contract review tools and worries about confidentiality.,not_contacted
Tom Becker,tom.becker@example.com,Summit Marketing Co,Marketing Coordinator,Marketing,,Cold outreach,Uses ChatGPT daily for campaign copy.,not_contacted`;

export const SAMPLE_INTERVIEWS: { title: string; contactName?: string; text: string }[] = [
  { title: "Priya Shah, Lumen Studio", contactName: "Priya Shah", text:
`- Team uses Midjourney and ChatGPT for first drafts of concepts, saves maybe 6 hours a week per designer.
- Biggest frustration: outputs feel generic, the human taste and judgment is still what clients pay for.
- Junior designers worry their role is changing faster than they can learn. "Am I a designer or a prompt writer?"
- No formal training; people figure it out from YouTube tutorials and each other.
- Hard to measure ROI for clients, they just see faster turnaround.
- Workflow is messy: lots of copy-pasting between tools, nothing integrated with Figma yet.` },
  { title: "Daniel Okafor, Harborline Bank", contactName: "Daniel Okafor", text:
`Governance working group meets biweekly. Policy: only the approved enterprise Copilot, ChatGPT is blocked on the network.
Main concern is confidential client data leaking into prompts. Compliance and legal review every new use case.
Staff are anxious about layoffs; leadership has to keep saying AI is augmentation, not replacement.
Accuracy matters a lot in banking. Every AI-generated summary must be double-checked by an analyst, human in the loop is mandatory.
Pilots in loan document review save time, but measuring the business case has been hard.
Training is mandatory now: a 2-hour workshop on prompting and on what data you can't paste.` },
  { title: "Sofia Martinez, Cobalt Analytics", contactName: "Sofia Martinez", text:
`Analysts don't trust model outputs when they can't see the reasoning. One hallucinated number in a client report destroyed confidence for weeks.
We now verify every figure, which eats into the time savings.
Engineers love Copilot for boilerplate, it's genuinely faster.
Leadership pushed a top-down mandate to "use AI more" without clear guidance, which created confusion.
Too many tools: some teams use Claude, some ChatGPT, some the internal tool. No shared workflow.
Over-reliance worries me: junior analysts skip the critical thinking step.` },
  { title: "Jordan Lee, Brightpath Health", contactName: "Jordan Lee", text:
`Running an AI literacy program for 2000 staff. Biggest gap is basic training: people don't know how to write a good prompt.
Nurses and admin staff fear being replaced, so the program frames AI as removing tedious paperwork.
HIPAA means strict policy on which tools touch patient data. IT approval takes months.
Champions in each department help adoption more than any email from the CEO.
Measuring impact: we track hours saved on documentation, early results are encouraging, about 3 hours a week.
Clinicians insist on final accountability, AI drafts but humans sign off.` },
  { title: "Marcus Chen, Atlas Retail Group", contactName: "Marcus Chen", text:
`Rolled out Copilot licenses to corporate staff first; store employees get a simpler assistant.
License cost is significant, CFO wants a clear ROI story by Q3.
Adoption is uneven: some managers encourage experimentation, others ignore it. Culture matters more than the tool.
Integration with our inventory and scheduling systems is the real unlock, standalone chat is a novelty.
Data privacy review slowed down the rollout by two months.
Employees are excited about saving time on scheduling, but worry about errors in the AI-generated shift plans.` },
];
