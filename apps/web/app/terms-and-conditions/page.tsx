import Image from 'next/image'
import Link from 'next/link'

const C = {
  bg:       '#0D1C2A',
  sidebar:  '#0a1520',
  border:   'rgba(255,255,255,0.07)',
  blue:     '#307DC0',
  green:    '#43B749',
  white:    '#e2e8f0',
  muted:    '#94a3b8',
  dim:      '#64748b',
  card:     'rgba(255,255,255,0.03)',
  blockquote: 'rgba(48,125,192,0.12)',
}

const TOC = [
  { id: 's1',  label: '1. Acceptance' },
  { id: 's2',  label: '2. Eligibility' },
  { id: 's3',  label: '3. Definitions' },
  { id: 's4',  label: '4. The Platform' },
  { id: 's5',  label: '5. Accounts and Users' },
  { id: 's6',  label: '6. Fees, Wallet and Billing' },
  { id: 's7',  label: '7. Your Data and Our Role' },
  { id: 's8',  label: '8. Acceptable Use' },
  { id: 's9',  label: '9. Calling, Messaging and Recording' },
  { id: 's10', label: '10. Contact Data Lookups' },
  { id: 's11', label: '11. Artificial Intelligence' },
  { id: 's12', label: '12. Third-Party Dependencies' },
  { id: 's13', label: '13. Intellectual Property' },
  { id: 's14', label: '14. Confidentiality' },
  { id: 's15', label: '15. Security' },
  { id: 's16', label: '16. Availability and Support' },
  { id: 's17', label: '17. Suspension' },
  { id: 's18', label: '18. Term and Termination' },
  { id: 's19', label: '19. Warranties and Disclaimers' },
  { id: 's20', label: '20. Limitation of Liability' },
  { id: 's21', label: '21. Indemnification' },
  { id: 's22', label: '22. Dispute Resolution' },
  { id: 's23', label: '23. Governing Law' },
  { id: 's24', label: '24. Changes to These Terms' },
  { id: 's25', label: '25. General' },
  { id: 's26', label: '26. Accessibility' },
  { id: 's27', label: '27. Contact' },
]

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} style={{ fontSize: 20, fontWeight: 700, color: C.blue, marginTop: 40, marginBottom: 12, scrollMarginTop: 80 }}>
      {children}
    </h2>
  )
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 15, fontWeight: 700, color: C.white, marginTop: 24, marginBottom: 8 }}>{children}</h3>
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, lineHeight: 1.8, color: C.white, marginBottom: 12 }}>{children}</p>
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ paddingLeft: 22, marginBottom: 12 }}>{children}</ul>
}
function LI({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 14, lineHeight: 1.8, color: C.white, marginBottom: 4 }}>{children}</li>
}
function BQ({ children }: { children: React.ReactNode }) {
  return (
    <blockquote style={{
      borderLeft: `3px solid ${C.blue}`, paddingLeft: 16, margin: '16px 0',
      background: C.blockquote, borderRadius: '0 8px 8px 0', padding: '12px 16px',
    }}>
      <span style={{ fontSize: 13, lineHeight: 1.7, color: C.muted, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.02em' }}>
        {children}
      </span>
    </blockquote>
  )
}
function Divider() {
  return <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '32px 0' }} />
}
function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: C.white, fontWeight: 700 }}>{children}</strong>
}

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .toc-link {
          display: block; font-size: 12px; color: #94a3b8; text-decoration: none;
          padding: 4px 0 4px 10px; line-height: 1.5;
          border-left: 2px solid transparent; transition: color 0.15s;
        }
        .toc-link:hover { color: #307DC0; }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.sidebar, borderBottom: `1px solid ${C.border}`,
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <Image src="/logo3.png" alt="KPI DRIVER" width={120} height={40} style={{ objectFit: 'contain' }} />
        </Link>
        <nav style={{ display: 'flex', gap: 24 }}>
          <Link href="/terms-and-conditions" style={{ fontSize: 13, fontWeight: 700, color: C.blue, textDecoration: 'none' }}>Terms &amp; Conditions</Link>
          <Link href="/privacy_policy" style={{ fontSize: 13, fontWeight: 500, color: C.muted, textDecoration: 'none' }}>Privacy Policy</Link>
        </nav>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', display: 'flex', gap: 48, alignItems: 'flex-start' }}>

        {/* TOC sidebar */}
        <aside style={{
          width: 240, flexShrink: 0, position: 'sticky', top: 80,
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Table of Contents</p>
          {TOC.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="toc-link">
              {item.label}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Title block */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: C.white, marginBottom: 8 }}>Terms and Conditions</h1>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 13, color: C.muted }}><B>Company:</B> KPI DRIVER, LLC</span>
              <span style={{ fontSize: 13, color: C.muted }}><B>Version:</B> 3.0</span>
              <span style={{ fontSize: 13, color: C.muted }}><B>Last updated:</B> July 30, 2026</span>
              <span style={{ fontSize: 13, color: C.muted }}><B>Effective date:</B> August 1, 2026</span>
            </div>
            <p style={{ fontSize: 13, color: C.dim, marginTop: 8, fontStyle: 'italic' }}>Applies to kpidriver.com, kpidriver.ai, and the KPI DRIVER platform.</p>
          </div>

          <Divider />

          {/* Section 1 */}
          <H2 id="s1">1. Acceptance</H2>
          <P>These Terms and Conditions (the <B>"Terms"</B>) form a binding agreement between <B>KPI DRIVER, LLC</B>, a Florida limited liability company with its principal place of business at 1858 NW 141st Ave, Pembroke Pines, FL 33028 (<B>"KPI DRIVER," "we," "us"</B>) and you (<B>"Customer," "you"</B>).</P>
          <P><B>By accessing our websites, creating an account, or using the Platform, you agree to these Terms and to our Privacy Policy, which is incorporated by reference.</B> If you do not agree, do not use the Platform.</P>
          <P><B>If you are accepting on behalf of an entity, you represent that you have authority to bind that entity.</B></P>
          <P><B>Separate agreement.</B> Where you and KPI DRIVER have executed a separate written subscription agreement, order form or master services agreement, that agreement governs and controls over these Terms to the extent of any conflict. These Terms govern in all other cases, and govern use of our websites in every case.</P>
          <Divider />

          {/* Section 2 */}
          <H2 id="s2">2. Eligibility</H2>
          <P><B>The Platform is offered only to businesses, only for business purposes, and only to businesses located in the United States.</B> It is not offered to consumers for personal, family or household use.</P>
          <P>You represent that you are entering into this agreement in the course of a business, that you are at least 18 years old, and that you are located in the United States.</P>
          <Divider />

          {/* Section 3 */}
          <H2 id="s3">3. Definitions</H2>
          <P><B>"AI Agent"</B> means the automated conversational feature that answers calls and messages, converses using an artificial voice and automated messaging, qualifies leads and books appointments.</P>
          <P><B>"AI Output"</B> means content generated by the Platform using artificial intelligence, including dashboard answers and reports, AI Agent conversation content, call scores, evaluations, coaching recommendations, summaries, property assessments, valuation estimates, offer recommendations, risk flags and enriched field values.</P>
          <P><B>"Authorized User"</B> means an individual you authorize to access the Platform under your account.</P>
          <P><B>"Customer Data"</B> means all data, content and information you or your Authorized Users submit to the Platform, that is generated through your use of it, or that is transmitted to it on your behalf, together with AI Output derived from it. It includes contact records, call recordings and transcripts, text and email content, AI Agent conversations, appointment records, consent and opt-out records, property data, enrichment records and lookup results.</P>
          <P><B>"Platform"</B> means the KPI DRIVER customer relationship management and business automation system together with the KPI DRIVER AI Suite, and our websites.</P>
          <P><B>"Wallet"</B> means the prepaid balance held against your account from which usage charges are deducted.</P>
          <Divider />

          {/* Section 4 */}
          <H2 id="s4">4. The Platform</H2>
          <H3>4.1 Access</H3>
          <P>Subject to these Terms and payment of applicable fees, we grant you a non-exclusive, non-transferable, non-sublicensable right to access and use the Platform during your subscription term, for your internal business purposes, through the features included in your plan.</P>
          <H3>4.2 What It Does</H3>
          <P>The Platform combines a customer relationship management and business automation system with a suite of artificial intelligence applications, including an AI Dashboard, an AI Agent, call scoring and coaching, call summarization, property underwriting analysis, data enrichment, and contact data lookups.</P>
          <P><B>The Platform is delivered in part using third-party infrastructure and services operating under the KPI DRIVER brand.</B> See Section 12.</P>
          <H3>4.3 Reservation of Rights</H3>
          <P>We reserve all rights not expressly granted. Nothing transfers ownership of the Platform or any component of it.</P>
          <H3>4.4 Changes</H3>
          <P>We may modify, add to or discontinue features. We will not materially degrade the core functionality of a feature you are paying for during a paid term without 30 days' notice. If we discontinue a feature you are actively using, you may terminate the affected portion and receive a pro-rata refund of prepaid fees for it.</P>
          <P>Because parts of the Platform run on third-party infrastructure, features may change as those providers change their services. We pass through notice of material changes where we receive it.</P>
          <H3>4.5 Trials and Pilots</H3>
          <P>We may offer free trials, pilots, proofs of concept or discounted evaluation periods. Unless we agree otherwise in writing:</P>
          <UL>
            <LI>trial access is provided <B>as-is</B>, with no warranties, no availability commitment and no support commitment;</LI>
            <LI>we may modify, suspend or end a trial at any time;</LI>
            <LI><B>usage charges are still incurred and deducted from your Wallet during a trial.</B> A free trial covers subscription fees only, not consumption costs such as calls, messages, AI processing or lookups;</LI>
            <LI>at the end of a trial your subscription converts to the paid plan you selected unless you cancel before the trial ends; and</LI>
            <LI>if you do not convert, we retain Customer Data for <B>30 days</B> so you can export it, then delete it in accordance with our Privacy Policy.</LI>
          </UL>
          <P><B>Sections 8, 9 and 10 apply in full during any trial.</B></P>
          <H3>4.6 Beta Features</H3>
          <P>Features designated as beta, preview or experimental are provided <B>as-is</B>, may be withdrawn at any time, and are excluded from the warranties in Section 19.</P>
          <H3>4.7 Documents and Agreements Executed Through the Platform</H3>
          <P>The Platform includes functionality allowing you and third parties to prepare, send and electronically sign documents. <B>You are solely responsible for the content, legality and enforceability of every document you create, send or execute through the Platform.</B> We do not draft, review or approve them, and nothing in the Platform is legal advice.</P>
          <P><B>We do not warrant that any document created or executed through the Platform is valid, enforceable or admissible</B>, and we are not liable for any dispute arising from one.</P>
          <H3>4.8 API Access</H3>
          <P>Where we make API access available, it is provided through the underlying platform providers. <B>The AI Suite does not expose an API.</B></P>
          <P>You are responsible for: the security of your API keys and credentials; all activity conducted using your credentials; ensuring any application or integration complies with these Terms; and any third-party developer you engage.</P>
          <P><B>We do not warrant the availability, stability or backward compatibility of any API.</B> We may suspend or revoke your API access at any time where we reasonably believe it is being misused.</P>
          <Divider />

          {/* Section 5 */}
          <H2 id="s5">5. Accounts and Users</H2>
          <H3>5.1 Account Security</H3>
          <P>You are responsible for all activity under your account. You must keep credentials confidential, require Authorized Users to do the same, promptly deactivate departing personnel, and notify us immediately at <B>info@kpidriver.com</B> of any suspected unauthorized access.</P>
          <H3>5.2 Roles</H3>
          <P>The Platform provides tiered access roles. You are responsible for assigning them correctly. <B>We are not responsible for a user seeing data that your own role configuration permitted them to see.</B></P>
          <H3>5.3 Authorized Users</H3>
          <P>You are responsible for your Authorized Users' compliance with these Terms. Any act or omission of an Authorized User is treated as your own.</P>
          <H3>5.4 Representative Telephone Numbers</H3>
          <P>Certain features require Authorized Users to register their own telephone numbers. <B>You are responsible for obtaining each individual's informed agreement to register a personal telephone number and to have their calls recorded, transcribed and scored.</B></P>
          <H3>5.5 Account Ownership and Competing Claims</H3>
          <P>If we receive competing claims to control of an account, we are not able to determine who is entitled to it. We may take no action, suspend the account, or require a joint written instruction or court order before making any change. <B>We are not liable for any action we take, or decline to take, in response to competing claims.</B></P>
          <H3>5.6 Accuracy</H3>
          <P>You must provide accurate account, billing and contact information and keep it current.</P>
          <Divider />

          {/* Section 6 */}
          <H2 id="s6">6. Fees, Wallet and Billing</H2>
          <H3>6.1 Structure</H3>
          <P>The Platform is billed as a combination of <B>subscription fees</B>, billed in advance each billing period, and <B>usage charges</B>, deducted from the Wallet as incurred, covering AI processing, telephony and messaging, lookups and other consumption-based services.</P>
          <H3>6.2 Wallet</H3>
          <P>You fund a Wallet by making a payment. Usage charges are deducted as work is performed. Every deduction is recorded in your transaction history. <B>Our records of usage are the authoritative basis for charges</B>, absent manifest error.</P>
          <H3>6.3 Insufficient Balance</H3>
          <P>If the Wallet balance is insufficient, affected features will not execute. <B>We are not liable for calls not answered or placed, messages not sent, data not processed or lookups not performed because the Wallet was unfunded.</B></P>
          <H3>6.4 Auto-Renewal</H3>
          <P><B>Subscriptions renew automatically</B> for successive periods equal to the initial term unless either party gives written notice of non-renewal at least <B>30 days</B> before the end of the then-current term.</P>
          <H3>6.5 Price Changes</H3>
          <P>We may change subscription pricing effective on renewal, on at least <B>60 days' notice</B>. Usage rates may change on at least 30 days' notice. If you do not accept a usage rate change, you may terminate and receive a refund of your unused Wallet balance.</P>
          <H3>6.6 Refunds</H3>
          <P><B>Subscription fees are non-refundable</B> except as expressly provided in these Terms. <B>Unused Wallet balance is refundable</B> on termination as set out in Section 18.5.</P>
          <H3>6.7 Taxes</H3>
          <P>Fees exclude taxes. You are responsible for all sales, use, and comparable taxes, excluding taxes on our income.</P>
          <H3>6.8 Late Payment</H3>
          <P>Undisputed amounts not paid when due may accrue interest at the lesser of 1.5% per month or the maximum rate permitted by Florida law.</P>
          <H3>6.9 Disputes</H3>
          <P>You must notify us of any billing dispute within <B>30 days</B> of the charge. Undisputed amounts remain payable.</P>
          <H3>6.10 Chargebacks</H3>
          <P>If you initiate a chargeback in respect of an amount you owe under these Terms, <B>you are in material breach.</B> We may suspend your access immediately and you remain liable for the disputed amount plus any processor fees.</P>
          <H3>6.11 Dormant Accounts</H3>
          <P>If your account has no activity for <B>twelve consecutive months</B>, we may treat it as dormant, with at least <B>30 days'</B> written notice and opportunity to export before deactivating. <B>Your Wallet balance remains yours.</B> We do not expire or apply dormancy charges to Wallet balances.</P>
          <H3>6.12 Paused Subscriptions</H3>
          <P>Where we make a pause option available, your core records are preserved. <B>Pausing is not neutral — read this carefully:</B></P>
          <UL>
            <LI><B>You lose access</B> while paused.</LI>
            <LI><B>Telephone numbers and A2P registration are deleted</B> by the underlying telephony provider approximately 14 days after a pause begins. These cannot be recovered.</LI>
            <LI><B>Add-on subscriptions are cancelled</B>, including the AI Agent. Configuration may not survive a pause.</LI>
            <LI><B>Published assets revert to draft.</B> Live funnels, automations and scheduled campaigns stop running.</LI>
          </UL>
          <BQ>Before you pause: port or record your telephone numbers, and export anything you may need. We are not liable for any loss arising from a pause.</BQ>
          <Divider />

          {/* Section 7 */}
          <H2 id="s7">7. Your Data and Our Role</H2>
          <H3>7.1 Ownership</H3>
          <P><B>As between the parties, you own all Customer Data.</B> We claim no ownership.</P>
          <H3>7.2 License to Us</H3>
          <P>You grant us a non-exclusive, worldwide, royalty-free license to host, copy, transmit, process, display and otherwise use Customer Data solely to provide, maintain, secure and support the Platform. This license terminates on deletion of the Customer Data.</P>
          <H3>7.3 Our Role</H3>
          <P>We process Customer Data as a <B>processor / service provider</B> on your documented instructions. You are the <B>controller / business</B>.</P>
          <H3>7.4 We Do Not Use Your Data for Our Own Purposes</H3>
          <P><B>We do not use Customer Data to train, fine-tune or develop artificial intelligence models.</B> Our large language model providers are contractually prohibited from doing so. We do not use Customer Data to market to the individuals it describes, and we do not sell it.</P>
          <H3>7.5 Your Responsibility for Your Data</H3>
          <P>You represent and warrant that you have all rights, consents, permissions and lawful bases necessary for us to process Customer Data as contemplated.</P>
          <H3>7.6 Data We Do Not Accept</H3>
          <P>You must not submit: Social Security numbers; payment card numbers; protected health information subject to HIPAA; biometric identifiers; information about individuals under 18; personal data of individuals outside the United States; or classified information. <B>The Platform is not designed or certified for any of these categories.</B></P>
          <H3>7.7 Backup</H3>
          <P><B>You are responsible for maintaining your own copies of business-critical data.</B> Export regularly.</P>
          <H3>7.8 Retention and Deletion</H3>
          <P>We retain and delete Customer Data in accordance with the schedule in our Privacy Policy. <B>Consent, opt-out and Do-Not-Call records are retained for five years and survive termination.</B></P>
          <Divider />

          {/* Section 8 */}
          <H2 id="s8">8. Acceptable Use</H2>
          <H3>8.1 Compliance is Your Responsibility</H3>
          <P>You acknowledge that: <B>We do not provide legal, compliance, real estate, appraisal, investment, financial, tax or employment advice.</B> We do not verify that you have consent to call, text or record, or that you have a permissible purpose for a lookup. <B>You must independently determine whether your use complies with applicable law.</B></P>
          <H3>8.2 Prohibited Uses</H3>
          <P>You must not use the Platform or AI Output:</P>
          <UL>
            <LI>as a factor in determining any individual's eligibility for credit, insurance, employment or housing governed by the Fair Credit Reporting Act;</LI>
            <LI>as the <B>sole basis</B> for any employment decision;</LI>
            <LI>to infer or act upon sensitive personal characteristics (race, health, religion, sexual orientation, etc.);</LI>
            <LI>to discriminate against any individual or group;</LI>
            <LI>to stalk, harass, threaten, defraud or intimidate any person;</LI>
            <LI>to make calls, send texts or email in violation of the TCPA, Florida Telephone Solicitation Act, CAN-SPAM Act, or Do-Not-Call requirements;</LI>
            <LI>to record any communication without the consent required by law;</LI>
            <LI>to represent AI Output as a licensed appraisal, broker price opinion or professional valuation;</LI>
            <LI>to reverse engineer, decompile or derive source code, model weights, prompts or scoring logic;</LI>
            <LI>to circumvent rate limits, usage metering, access controls or security measures;</LI>
            <LI>to build a competing product, or benchmark for publication without written consent; or</LI>
            <LI>in violation of any applicable law.</LI>
          </UL>
          <H3>8.3 Employee Evaluation</H3>
          <P>Where you use call scores to inform decisions about employees, you must inform every representative in advance that their calls are recorded, transcribed, analyzed by AI and scored; obtain required consent; ensure a human reviews every such decision; and comply with applicable employment and AI law.</P>
          <P><B>We have not conducted a bias audit of the scoring rubrics and make no representation that scores are free from bias or fit for use in employment decisions.</B></P>
          <H3>8.4 Reporting</H3>
          <P>Report suspected violations and security vulnerabilities to <B>info@kpidriver.com</B>. <B>You must notify us within five business days</B> of receiving any demand letter, class action complaint, or regulatory inquiry relating to your use of the Platform.</P>
          <H3>8.5 Licensing and Professional Qualifications</H3>
          <P>You represent and warrant that you and your Authorized Users hold all licences required for your business activities in every jurisdiction in which you operate. <B>We do not verify licensing status.</B></P>
          <Divider />

          {/* Section 9 */}
          <H2 id="s9">9. Calling, Messaging and Recording</H2>
          <BQ>This Section allocates the most significant regulatory risk in this agreement. Read it carefully.</BQ>
          <H3>9.1 How the AI Agent Operates</H3>
          <P>The AI Agent converses using an artificial voice for calls and automated messaging for texts. Outside configured business hours it answers inbound calls only and does not place outbound calls; it replies to inbound text messages; and during business hours it may follow up where no human has responded.</P>
          <H3>9.2 Recording — Applies to Everything</H3>
          <P><B>All calls made and received through the Platform are recorded and transcribed, including calls answered by the AI Agent. Recording law applies regardless of who placed the call.</B></P>
          <P><B>Florida is an all-party consent state under Fla. Stat. § 934.03.</B> Violations carry criminal penalties and a private right of action.</P>
          <P>You represent, warrant and covenant that you: configure the AI Agent to deliver a clear recording notice at the very start of every call; provide equivalent notice on human-handled calls; obtain consent from every party to every recorded call; stop recording if a participant declines; and never submit a recording obtained unlawfully.</P>
          <H3>9.3 AI Disclosure</H3>
          <P>You must ensure that every person who interacts with the AI Agent is told <B>at the beginning of the interaction</B> that they are speaking with an artificial intelligence system. You must not configure the Agent to claim to be human or to deny being an AI if asked.</P>
          <H3>9.4 Consent, Hours and Do-Not-Call — Outbound Contact</H3>
          <P>Where you or the AI Agent <B>initiate</B> outbound contact, you represent and warrant that you have obtained and documented all required consents; configure outbound contact only within lawful hours (Florida restricts solicitations to 8:00 a.m. – 8:00 p.m., prohibits them on Sundays, and limits calls to three per number per day); scrub against the National Do-Not-Call Registry and re-scrub at least every 31 days; and do not load contact data lookup results into any outbound campaign without independently obtained consent.</P>
          <H3>9.5 Opt-Outs</H3>
          <P><B>A person may revoke consent at any time, by any reasonable method.</B> You must configure the AI Agent to recognize and honor opt-out requests immediately, in any phrasing. Revocation must suppress the number across every channel and campaign.</P>
          <H3>9.6 Platform Controls are Tools, Not Compliance</H3>
          <P>Any controls the Platform provides are <B>tools you must configure, test and verify. They are not a compliance service, are not warranted to produce a lawful result, and are not a defense to any claim.</B></P>
          <H3>9.7 Recordkeeping</H3>
          <P>Maintain, for at least <B>five years</B>, auditable records sufficient to demonstrate compliance, including consent evidence, call source, Do-Not-Call scrub records, opt-out requests and AI Agent configuration history. <B>Do not rely solely on the Platform for compliance recordkeeping.</B></P>
          <H3>9.8 Email</H3>
          <P>For email you must comply with the CAN-SPAM Act, including accurate headers, a valid physical address, a functioning opt-out mechanism, and honoring opt-outs within ten business days.</P>
          <H3>9.9 Our Right to Intervene</H3>
          <P>We may immediately restrict or suspend your calling and messaging where we reasonably believe you are recording without required notice, contacting without required consent, operating outside lawful hours, disregarding opt-outs, or misrepresenting the AI Agent as human.</P>
          <H3>9.10 Indemnity</H3>
          <P><B>Your indemnity in Section 21.2 expressly covers all claims arising from calling, messaging, recording and AI Agent conversation content, and is not subject to the cap in Section 20.</B></P>
          <Divider />

          {/* Section 10 */}
          <H2 id="s10">10. Contact Data Lookups</H2>
          <H3>10.1 Permissible Purpose</H3>
          <P><B>You must have a legitimate, lawful business purpose for every lookup</B>, must be able to articulate it, and must maintain records demonstrating it.</P>
          <H3>10.2 Not a Consumer Reporting Agency</H3>
          <P><B>KPI DRIVER is not a consumer reporting agency, and the Platform does not provide consumer reports as defined by the Fair Credit Reporting Act.</B> You must not use results for any FCRA-covered purpose.</P>
          <H3>10.3 No Warranty of Accuracy</H3>
          <P>Lookup data is compiled by a third party from public and commercial sources. <B>We do not warrant its accuracy, currency or completeness.</B> A Do-Not-Call flag or litigator flag returned by the Platform is informational only, <B>is not a compliance determination, and is not a substitute for your own scrubbing.</B></P>
          <H3>10.4 Prohibited Uses</H3>
          <P>Never use lookup results for any FCRA-covered purpose; to stalk, harass or locate an individual unlawfully; as a calling or texting list without independently obtained consent; or to build, sell or distribute a database of personal information.</P>
          <H3>10.5 Charges</H3>
          <P>Lookup charges are incurred whether or not a match is found, and are non-refundable.</P>
          <H3>10.6 Indemnity</H3>
          <P><B>Your indemnity in Section 21.2 expressly covers all claims arising from use of lookup, parcel and Do-Not-Call data, and is not subject to the cap in Section 20.</B></P>
          <Divider />

          {/* Section 11 */}
          <H2 id="s11">11. Artificial Intelligence</H2>
          <H3>11.1 How It Works</H3>
          <P>Most AI features use large language models supplied by third-party providers. Customer Data — including full call transcripts, AI Agent conversation content, records retrieved by the AI Dashboard, and property information — is transmitted to those providers for processing.</P>
          <H3>11.2 No Training on Your Data</H3>
          <P><B>We do not use Customer Data to train or improve artificial intelligence models, and our large language model providers are contractually prohibited from doing so.</B> Section 11.7 sets out an exception applicable to the AI Agent.</P>
          <H3>11.3 Ownership of AI Output</H3>
          <P><B>As between the parties, you own AI Output generated from your Customer Data</B>, subject to our underlying rights in the Platform. You acknowledge that AI Output may not be eligible for copyright protection; that it may not be unique; and that your ownership does not extend to the models, prompts, rubrics or scoring logic used to generate it.</P>
          <H3>11.4 Accuracy</H3>
          <BQ>AI OUTPUT IS PROBABILISTIC AND MAY BE INACCURATE, INCOMPLETE, OUTDATED OR ENTIRELY FABRICATED. Language models produce fluent output regardless of whether it is correct.</BQ>
          <P>Specifically: AI Dashboard answers may be wrong. AI Agent conversations may contain errors. Call scores reflect a rubric applied to a text transcript and cannot assess tone or context. <B>Underwriting output is not an appraisal</B> — it must not be represented to any person as an appraisal, broker price opinion or professional valuation. Condition assessments are inferred, not observed.</P>
          <H3>11.5 You Must Verify</H3>
          <P><B>You are solely responsible for reviewing AI Output before relying on it, acting on it, transmitting it to any third party, or making any decision based on it.</B></P>
          <H3>11.6 You Own What the AI Agent Says</H3>
          <P><B>You are solely responsible for the content of every AI Agent conversation conducted on your behalf</B>, including any representation, promise, price, term or commitment it states.</P>
          <H3>11.7 AI Agent Third-Party Terms</H3>
          <P>The AI Agent is delivered through a third-party provider whose terms reserve rights to use conversation content for its own purposes, including research, analytics and product development. <B>By enabling the AI Agent, you instruct us to transmit conversation content to that provider on those terms.</B> If you cannot accept those terms, do not enable the AI Agent.</P>
          <H3>11.8 The AI Agent Has No Authority to Bind</H3>
          <P><B>The AI Agent has no authority to make any offer, promise, commitment, representation or agreement on behalf of KPI DRIVER.</B> You configure the Agent's instructions and are responsible for everything it says on your behalf.</P>
          <Divider />

          {/* Section 12 */}
          <H2 id="s12">12. Third-Party Dependencies</H2>
          <H3>12.1 The Platform is a Bundled System</H3>
          <P>The Platform is delivered using third-party infrastructure including CRM and communications platform infrastructure, cloud hosting, AI model providers, conversational AI providers, telephony and messaging carriers, payment processing, property data providers, and contact data lookup providers. These operate under the KPI DRIVER brand as part of an integrated service.</P>
          <H3>12.2 No Control</H3>
          <P><B>We do not control third-party services and are not responsible for their availability, performance, accuracy, security, pricing or terms.</B> Interruption or data quality issues in a third-party service are excluded from any commitment we make.</P>
          <H3>12.3 Carrier Action</H3>
          <P>Telephony and messaging are subject to carrier rules outside our control. <B>Carriers may block, filter, throttle or suspend your numbers or messages based on complaint rates, content or reputation. We are not liable for carrier action.</B></P>
          <H3>12.4 Third-Party Terms</H3>
          <P>Certain data and functionality is subject to the terms of the provider that supplied it. You will comply with those terms as we make them known to you.</P>
          <H3>12.5 Telephone Numbers</H3>
          <P>Numbers you provision are yours. <B>Telephone numbers and A2P registration are deleted by the underlying telephony provider approximately 14 days after an account is paused — and cannot be recovered.</B> Initiate any port with the underlying provider before you terminate, and complete it while your account remains active.</P>
          <H3>12.6 Sub-Processor Information</H3>
          <P>Business customers may request our current list of service providers, provided under confidentiality obligations. Email <B>info@kpidriver.com</B>.</P>
          <Divider />

          {/* Section 13 */}
          <H2 id="s13">13. Intellectual Property</H2>
          <H3>13.1 Ours</H3>
          <P>We and our licensors own the Platform, including all software, models, prompts, scoring rubrics, evaluation logic, agent configurations, report templates, interfaces, documentation and branding.</P>
          <H3>13.2 Yours</H3>
          <P>You and your licensors own Customer Data and your own trademarks and content.</P>
          <H3>13.3 Feedback</H3>
          <P>If you provide suggestions or feedback, you grant us a perpetual, irrevocable, worldwide, royalty-free right to use it without restriction or compensation.</P>
          <H3>13.4 Aggregate Data</H3>
          <P>We may compile aggregated, de-identified data about use of the Platform and use it to operate, improve, benchmark and market the Platform, provided it cannot reasonably identify you or any individual.</P>
          <H3>13.5 Publicity</H3>
          <P>Neither party may use the other's name or marks without prior written consent, except that we may identify you by name and logo in a customer list, which you may withdraw at any time.</P>
          <H3>13.6 Copyright and Content Complaints</H3>
          <P>If you believe content on the Platform infringes your copyright, email <B>info@kpidriver.com</B> with the subject "Copyright Complaint" including identification of the work, location on the Platform, your contact details, and good-faith statements as required. We may remove material we reasonably believe to be infringing. We terminate accounts of customers who repeatedly infringe intellectual property rights.</P>
          <Divider />

          {/* Section 14 */}
          <H2 id="s14">14. Confidentiality</H2>
          <P><B>"Confidential Information"</B> means non-public information disclosed by one party that is designated confidential or that a reasonable person would understand to be confidential. Customer Data is your Confidential Information. The Platform and our pricing, roadmap, service provider list, and technical information are ours.</P>
          <P>Each party will use the other's Confidential Information only to perform under these Terms; protect it with at least reasonable care; and disclose it only to personnel who need it and are bound by comparable obligations.</P>
          <P>Obligations survive for <B>three years</B> after termination, and <B>indefinitely</B> for Customer Data and trade secrets.</P>
          <Divider />

          {/* Section 15 */}
          <H2 id="s15">15. Security</H2>
          <P>We maintain administrative, technical and physical safeguards designed to protect Customer Data. We will notify you within <B>72 hours</B> of becoming aware of a security incident affecting your Customer Data.</P>
          <P>On written request we will provide our then-current security documentation and a completed standard security questionnaire. Independent on-site audit requires our prior written consent.</P>
          <P><B>You are responsible for the security of your own systems, credentials, integrations and access role configuration.</B></P>
          <Divider />

          {/* Section 16 */}
          <H2 id="s16">16. Availability and Support</H2>
          <H3>16.1 No Uptime Commitment</H3>
          <P><B>The Platform is provided without any guaranteed level of availability.</B> We use commercially reasonable efforts to keep it available, but do not commit to any uptime percentage and provide no service credits.</P>
          <H3>16.2 Maintenance</H3>
          <P>We may perform scheduled maintenance with advance notice where practicable, and emergency maintenance without notice.</P>
          <H3>16.3 Support</H3>
          <P>Support is provided by email at <B>info@kpidriver.com</B> during business hours, Monday through Friday, 9:00 a.m. to 5:00 p.m. Eastern Time, excluding US federal holidays.</P>
          <H3>16.4 Capacity and Throughput Limits</H3>
          <P>Calling and messaging capacity is determined by your A2P 10DLC registration and your telephony provider. <B>We do not set independent limits and do not warrant any particular throughput.</B></P>
          <H3>16.5 Dependencies</H3>
          <P>Availability depends on third-party services outside our control. Downtime caused by a third-party provider, your own systems, carrier action, force majeure, or failure to fund your Wallet is excluded.</P>
          <Divider />

          {/* Section 17 */}
          <H2 id="s17">17. Suspension</H2>
          <P>We may suspend your access, in whole or in part, immediately on notice where: your account is past due beyond <B>10 days</B>; we reasonably believe you are in material breach; your use poses a security risk or exposes us to legal liability; we reasonably believe you are recording or contacting people unlawfully; or suspension is required by law.</P>
          <P>We will use reasonable efforts to give advance notice and limit suspension to the affected portion, except where immediate suspension is necessary. <B>Suspension does not relieve you of payment obligations.</B></P>
          <Divider />

          {/* Section 18 */}
          <H2 id="s18">18. Term and Termination</H2>
          <H3>18.1 Term</H3>
          <P>These Terms begin on the earlier of account creation or first use and continue for your subscription term, renewing under Section 6.4 until terminated.</P>
          <H3>18.2 Non-Renewal</H3>
          <P>Either party may decline renewal on the notice period in Section 6.4. <B>Mid-term termination for convenience is not permitted</B>, and fees for the remaining term remain payable.</P>
          <H3>18.3 Termination for Cause</H3>
          <P>Either party may terminate immediately on written notice if the other materially breaches and fails to cure within <B>30 days</B> of written notice, or becomes insolvent. We may terminate immediately, without a cure period, for breach of Sections 8.2, 9 or 10.1.</P>
          <H3>18.4 Effect</H3>
          <P>On termination all rights of access cease; you must stop using the Platform; each party returns or destroys the other's Confidential Information; and all accrued fees become immediately due.</P>
          <H3>18.5 Export and Deletion</H3>
          <P>For <B>30 days</B> after termination you may export Customer Data. After that window we retain Customer Data in an inactive state unless you ask us to delete it — you may request deletion at any time and we delete within 30 days. <B>Consent and opt-out records are retained</B> as described. <B>Unused Wallet balance is refunded within 30 days of termination</B>, less any amounts owed.</P>
          <H3>18.6 Survival</H3>
          <P>Sections 3, 6 (accrued amounts), 7.1, 7.5–7.8, 8.1, 8.5, <B>9 and 10 in full</B>, 11.3, 11.4, 11.6, 11.7, 13, 14, 18.4–18.6, 19, 20, 21, 22, 23 and 25 survive termination.</P>
          <Divider />

          {/* Section 19 */}
          <H2 id="s19">19. Warranties and Disclaimers</H2>
          <H3>19.1 Mutual</H3>
          <P>Each party represents that it has full power and authority to enter into these Terms.</P>
          <H3>19.2 Our Limited Warranty</H3>
          <P>We warrant that we will provide the Platform in a professional and workmanlike manner consistent with generally accepted industry practice. Your exclusive remedy for breach is for us to re-perform the affected service or, if we cannot within a reasonable time, refund fees paid for the affected portion.</P>
          <H3>19.3 Your Warranties</H3>
          <P>You represent and warrant that you have all rights and consents necessary for us to process Customer Data; that Customer Data is lawfully obtained; that you comply with Sections 7, 8, 9 and 10; and that your use of the Platform and AI Output complies with all applicable law.</P>
          <H3>19.4 Disclaimer</H3>
          <BQ>EXCEPT AS EXPRESSLY STATED IN SECTION 19.2, THE PLATFORM, INCLUDING ALL AI OUTPUT AND ALL THIRD-PARTY DATA, IS PROVIDED "AS IS" AND "AS AVAILABLE," AND KPI DRIVER DISCLAIMS ALL WARRANTIES, EXPRESS, IMPLIED AND STATUTORY, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. KPI DRIVER DOES NOT WARRANT THAT: THE PLATFORM WILL BE UNINTERRUPTED OR ERROR-FREE; AI OUTPUT WILL BE ACCURATE OR RELIABLE; CALLS OR MESSAGES WILL BE DELIVERED; PROPERTY VALUATIONS OR OFFER RECOMMENDATIONS WILL BE ACCURATE; CALL SCORES WILL BE UNBIASED OR SUITABLE FOR EMPLOYMENT PURPOSES; LOOKUP OR DO-NOT-CALL DATA WILL BE ACCURATE; OR THAT USE OF THE PLATFORM WILL RESULT IN ANY PARTICULAR BUSINESS OUTCOME.</BQ>
          <H3>19.5 No Professional Advice</H3>
          <P><B>The Platform does not provide legal, compliance, financial, investment, tax, accounting, real estate brokerage, appraisal or employment advice. AI Output is not professional advice.</B></P>
          <Divider />

          {/* Section 20 */}
          <H2 id="s20">20. Limitation of Liability</H2>
          <H3>20.1 Exclusion of Indirect Damages</H3>
          <BQ>TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, BUSINESS, GOODWILL, DATA OR BUSINESS OPPORTUNITY, HOWEVER CAUSED AND UNDER ANY THEORY OF LIABILITY.</BQ>
          <H3>20.2 Cap</H3>
          <BQ>TO THE MAXIMUM EXTENT PERMITTED BY LAW, EACH PARTY'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS WILL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU TO KPI DRIVER IN THE TWELVE MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED US DOLLARS ($100).</BQ>
          <H3>20.3 Security Super-Cap</H3>
          <P>Notwithstanding Section 20.2, our aggregate liability for a security incident caused by our breach of Section 15 will not exceed <B>two times</B> the total fees you paid in the twelve months immediately preceding the incident.</P>
          <H3>20.4 Exclusions</H3>
          <P>The caps do <B>not</B> apply to: your payment obligations; <B>your indemnification obligations under Section 21.2</B>; either party's breach of Section 14; your breach of Sections 8.2, 9 or 10.1; either party's infringement of the other's intellectual property; or either party's gross negligence, willful misconduct or fraud.</P>
          <Divider />

          {/* Section 21 */}
          <H2 id="s21">21. Indemnification</H2>
          <H3>21.1 By Us</H3>
          <P>We will defend you against any third-party claim alleging that the Platform, used as permitted, infringes that third party's US patent, copyright or trademark, and will pay damages finally awarded or amounts in settlement we approve. If the Platform becomes subject to such a claim, we may procure the right to continue, modify it, or terminate and refund prepaid unused fees. <B>This is our sole liability and your exclusive remedy for intellectual property infringement.</B></P>
          <H3>21.2 By You</H3>
          <P><B>You will defend, indemnify and hold harmless KPI DRIVER, its affiliates, officers, directors, employees and agents from and against any claim, demand, action, proceeding, loss, liability, damage, fine, penalty, cost and expense (including reasonable attorneys' fees) arising out of or relating to:</B></P>
          <UL>
            <LI>Customer Data, including any claim that it was unlawfully collected or that you lacked required consent;</LI>
            <LI>any call, text message or email placed or sent through the Platform on your behalf, whether by a human or the AI Agent, including claims under the TCPA, Florida Telephone Solicitation Act, or Do-Not-Call requirements;</LI>
            <LI>the content of any AI Agent conversation, including any representation, promise or commitment it states;</LI>
            <LI>the recording, interception or transcription of any communication, including claims under Fla. Stat. § 934.03;</LI>
            <LI>contact data, parcel and Do-Not-Call lookups, including claims under FCRA or DPPA;</LI>
            <LI>your use of AI Output, including any employment decision informed by a call score or any representation of underwriting output as an appraisal;</LI>
            <LI>any employment claim by an Authorized User relating to recording, monitoring, scoring or evaluation; and</LI>
            <LI>your violation of any law.</LI>
          </UL>
          <H3>21.3 Procedure</H3>
          <P>The indemnified party will promptly notify the indemnifying party, give it sole control of the defense (provided it may not settle in a way that imposes an obligation on the indemnified party without consent), and reasonably cooperate at the indemnitor's expense.</P>
          <Divider />

          {/* Section 22 */}
          <H2 id="s22">22. Dispute Resolution and Arbitration</H2>
          <H3>22.1 Informal Resolution</H3>
          <P>Before starting formal proceedings, the parties will attempt to resolve the dispute through good-faith discussion between senior representatives for <B>30 days</B> after written notice.</P>
          <H3>22.2 Binding Arbitration</H3>
          <BQ>PLEASE READ — THIS SECTION AFFECTS YOUR LEGAL RIGHTS. Any dispute not resolved under Section 22.1 will be resolved by final and binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, before a single arbitrator, seated in Broward County, Florida, conducted in English.</BQ>
          <H3>22.3 Class Action Waiver</H3>
          <BQ>EACH PARTY WAIVES ANY RIGHT TO BRING OR PARTICIPATE IN A CLASS, COLLECTIVE, CONSOLIDATED OR REPRESENTATIVE ACTION. THE ARBITRATOR MAY NOT CONSOLIDATE CLAIMS OR PRESIDE OVER ANY FORM OF REPRESENTATIVE PROCEEDING.</BQ>
          <H3>22.4 Exceptions</H3>
          <P>Either party may bring an action in court for injunctive or equitable relief to protect intellectual property or Confidential Information, and either party may bring a claim in small claims court.</P>
          <H3>22.5 Fees</H3>
          <P>Each party bears its own attorneys' fees and its share of arbitration fees, except that <B>the prevailing party is entitled to recover reasonable attorneys' fees and costs</B> to the extent permitted by law.</P>
          <H3>22.6 Jury Trial Waiver</H3>
          <BQ>TO THE EXTENT ANY DISPUTE PROCEEDS IN COURT RATHER THAN ARBITRATION, EACH PARTY KNOWINGLY, VOLUNTARILY AND IRREVOCABLY WAIVES ITS RIGHT TO A TRIAL BY JURY.</BQ>
          <H3>22.7 Limitation Period</H3>
          <P>Any claim must be brought within <B>one year</B> after it accrues, or it is permanently barred, except where a longer period is required by law.</P>
          <Divider />

          {/* Section 23 */}
          <H2 id="s23">23. Governing Law and Venue</H2>
          <P>These Terms and any dispute arising from them are governed by the laws of the <B>State of Florida</B>, without regard to its conflict of laws principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply.</P>
          <P>Subject to Section 22, the state and federal courts located in <B>Broward County, Florida</B> have exclusive jurisdiction.</P>
          <Divider />

          {/* Section 24 */}
          <H2 id="s24">24. Changes to These Terms</H2>
          <P>We may modify these Terms. We will post the updated version and — for any material change — notify account administrators by email and in-product <B>at least 30 days before the change takes effect</B>.</P>
          <P><B>If you do not accept a material change, you may terminate before the effective date and receive a pro-rata refund of prepaid unused fees and your unused Wallet balance.</B> Continued use after the effective date constitutes acceptance.</P>
          <Divider />

          {/* Section 25 */}
          <H2 id="s25">25. General</H2>
          <P><B>25.1 Entire agreement.</B> These Terms and the Privacy Policy are the entire agreement and supersede all prior proposals, representations and understandings.</P>
          <P><B>25.2 Assignment.</B> Neither party may assign without the other's written consent, except to a successor in a merger, acquisition or sale of substantially all assets on written notice.</P>
          <P><B>25.3 Notices.</B> Notices to us: info@kpidriver.com, with a copy to KPI DRIVER, LLC, Attn: Ahmed Ramy, 1858 NW 141st Ave, Pembroke Pines, FL 33028. Notices to you: the email address on your account.</P>
          <P><B>25.4 Force majeure.</B> Neither party is liable for delay or failure caused by events beyond its reasonable control. <B>This does not excuse payment obligations.</B></P>
          <P><B>25.5 Waiver.</B> No waiver is effective unless in writing. Failure to enforce is not a waiver.</P>
          <P><B>25.6 Severability.</B> If any provision is held unenforceable, it is modified to the minimum extent necessary or severed.</P>
          <P><B>25.7 Independent contractors.</B> The parties are independent contractors. Nothing creates a partnership, joint venture, agency or employment relationship.</P>
          <P><B>25.8 No third-party beneficiaries.</B> Except for the indemnified parties in Section 21.2, there are no third-party beneficiaries.</P>
          <P><B>25.9 Export and sanctions.</B> You represent that you are located in the United States and will not make the Platform available to any person or country subject to US sanctions.</P>
          <P><B>25.10 US Government.</B> The Platform is "commercial computer software" under FAR 12.212 and DFARS 227.7202. Government use is subject to these Terms.</P>
          <P><B>25.11–25.14.</B> Headings are for convenience only. "Including" means "including without limitation." These Terms may be accepted electronically. You consent to receive all notices and communications from us electronically.</P>
          <Divider />

          {/* Section 26 */}
          <H2 id="s26">26. Accessibility</H2>
          <P>We are working to make our websites and the Platform usable by as many people as possible, including people using assistive technology.</P>
          <P><B>Standard.</B> We are working toward conformance with WCAG 2.1, Level AA. <B>We do not currently claim full conformance.</B> Our websites and Platform have not been independently audited.</P>
          <P><B>Known limitations.</B> Parts of the Platform supplied by third-party providers may not be fully accessible. Dense tabular output and generated reports may not be fully navigable by screen reader. Call recordings are not captioned, though transcripts are available where transcription is enabled.</P>
          <P><B>If you have difficulty:</B> Email <B>info@kpidriver.com</B> with the subject "Accessibility," or call (786) 822-8188. We aim to respond within five business days.</P>
          <Divider />

          {/* Section 27 */}
          <H2 id="s27">27. Contact</H2>
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 24, display: 'inline-block',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>KPI DRIVER, LLC</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>Attn: Ahmed Ramy</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>1858 NW 141st Ave, Pembroke Pines, FL 33028, United States</p>
            <p style={{ fontSize: 13, color: C.muted }}>
              <a href="mailto:info@kpidriver.com" style={{ color: C.blue, textDecoration: 'none' }}>info@kpidriver.com</a>
              {' · '}
              <a href="tel:7868228188" style={{ color: C.blue, textDecoration: 'none' }}>(786) 822-8188</a>
            </p>
          </div>

          <div style={{ marginTop: 60, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 12, color: C.dim, textAlign: 'center' as const }}>
              © 2026 KPI DRIVER, LLC. All rights reserved. ·{' '}
              <Link href="/privacy_policy" style={{ color: C.blue, textDecoration: 'none' }}>Privacy Policy</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
