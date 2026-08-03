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
  { id: 's1',  label: '1. Introduction' },
  { id: 's2',  label: '2. Who We Are' },
  { id: 's3',  label: '3. Our Two Roles' },
  { id: 's4',  label: '4. Information We Collect' },
  { id: 's5',  label: '5. Where the Information Comes From' },
  { id: 's6',  label: '6. How We Use Information' },
  { id: 's7',  label: '7. Artificial Intelligence' },
  { id: 's8',  label: '8. Automated Calling and Messaging' },
  { id: 's9',  label: '9. Call Recording' },
  { id: 's10', label: '10. Skip Tracing and Lookups' },
  { id: 's11', label: '11. Who We Share Information With' },
  { id: 's12', label: '12. We Do Not Sell Your Information' },
  { id: 's13', label: '13. How Long We Keep Information' },
  { id: 's14', label: '14. Security' },
  { id: 's15', label: '15. If There Is a Breach' },
  { id: 's16', label: '16. Your Privacy Rights' },
  { id: 's17', label: '17. Florida Digital Bill of Rights' },
  { id: 's18', label: '18. Cookies and Tracking' },
  { id: 's19', label: '19. Links to Other Websites' },
  { id: 's20', label: '20. Children' },
  { id: 's21', label: '21. United States Only' },
  { id: 's22', label: '22. Changes' },
  { id: 's23', label: '23. Contact Us' },
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
      <span style={{ fontSize: 13, lineHeight: 1.7, color: C.muted, display: 'block' }}>
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
function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: C.white }}>
        {children}
      </table>
    </div>
  )
}
function TH({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '8px 12px', background: 'rgba(48,125,192,0.12)', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.blue, fontSize: 12, whiteSpace: 'nowrap' as const }}>{children}</th>
}
function TD({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, lineHeight: 1.6, verticalAlign: 'top' }}>{children}</td>
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

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
          <Link href="/terms-and-conditions" style={{ fontSize: 13, fontWeight: 500, color: C.muted, textDecoration: 'none' }}>Terms &amp; Conditions</Link>
          <Link href="/privacy_policy" style={{ fontSize: 13, fontWeight: 700, color: C.blue, textDecoration: 'none' }}>Privacy Policy</Link>
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
            <a key={item.id} href={`#${item.id}`} style={{
              display: 'block', fontSize: 12, color: C.muted, textDecoration: 'none',
              padding: '4px 0', lineHeight: 1.5,
              borderLeft: `2px solid transparent`, paddingLeft: 10,
            }}>
              {item.label}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Title block */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: C.white, marginBottom: 8 }}>Privacy Policy</h1>
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
          <H2 id="s1">1. Introduction</H2>
          <P>This Privacy Policy explains how <B>KPI DRIVER, LLC</B> ("KPI DRIVER," "we," "us," "our") collects, uses, discloses and protects information in connection with our websites and the KPI DRIVER platform (together, the "Platform").</P>
          <P>The Platform is a customer relationship management and business automation system for real estate investing businesses, combined with a suite of artificial intelligence applications:</P>
          <Table>
            <thead>
              <tr><TH>Feature</TH><TH>What It Does</TH></tr>
            </thead>
            <tbody>
              <tr><TD><B>CRM</B></TD><TD>Contact and pipeline management, calling and texting, email, appointment booking, workflow automation, funnels and reporting</TD></tr>
              <tr><TD><B>AI Dashboard</B></TD><TD>Answers questions and generates reports across the data in your account</TD></tr>
              <tr><TD><B>AI Agent</B></TD><TD>Answers inbound calls and messages, converses with leads, qualifies them and books appointments</TD></tr>
              <tr><TD><B>AI Sales Coach</B></TD><TD>Scores and coaches on live sales calls</TD></tr>
              <tr><TD><B>AI Training Coach</B></TD><TD>Scores practice calls conducted against AI voice agents</TD></tr>
              <tr><TD><B>AI Deal Underwriter</B></TD><TD>Produces property valuation and offer analysis</TD></tr>
              <tr><TD><B>Note Taker</B></TD><TD>Generates call summaries and structured notes</TD></tr>
              <tr><TD><B>Data Enrichment</B></TD><TD>Populates and enriches contact fields</TD></tr>
              <tr><TD><B>Skip Tracing</B></TD><TD>Performs parcel, Do-Not-Call and contact data lookups</TD></tr>
            </tbody>
          </Table>
          <P><B>Who this policy addresses.</B> The Platform is sold to businesses, for business use. Three groups are covered:</P>
          <UL>
            <LI><B>Visitors to our websites</B> — anyone browsing kpidriver.com or kpidriver.ai.</LI>
            <LI><B>Our customers and their users</B> — the businesses that subscribe and the individuals who log in. As to these people we are a <B>controller</B> (a "business" under California law).</LI>
            <LI><B>Individuals inside a customer's account</B> — sales leads, property owners, contacts, and anyone the AI Agent speaks with. As to these people we are a <B>processor</B> (a "service provider"). The business using the Platform controls that information and is responsible for it. Direct your requests to them. Section 16.6 explains how we help.</LI>
          </UL>
          <Divider />

          {/* Section 2 */}
          <H2 id="s2">2. Who We Are</H2>
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>KPI DRIVER, LLC</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>A Florida limited liability company</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>1858 NW 141st Ave, Pembroke Pines, FL 33028, United States</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}><B>Privacy contact:</B> Ahmed Ramy</p>
            <p style={{ fontSize: 13, color: C.muted }}>
              <a href="mailto:info@kpidriver.com" style={{ color: C.blue, textDecoration: 'none' }}>info@kpidriver.com</a>
              {' · '}
              <a href="tel:7868228188" style={{ color: C.blue, textDecoration: 'none' }}>(786) 822-8188</a>
            </p>
          </div>
          <Divider />

          {/* Section 3 */}
          <H2 id="s3">3. Our Two Roles</H2>
          <H3>3.1 Where We Are a Controller</H3>
          <P>We decide the purposes and means of processing for: account and identity information for people who log in; company records; billing, payment and wallet transaction records; usage, token consumption and cost records; authentication, session and security logs; support correspondence; and website analytics and cookie data.</P>
          <H3>3.2 Where We Are a Processor</H3>
          <P>We process the following only on our customer's instructions, to deliver the Platform. This is <B>"Customer Data."</B></P>
          <UL>
            <LI>Contact, lead and pipeline records, and all custom fields</LI>
            <LI>Call recordings, transcripts and call metadata</LI>
            <LI>Text message and email content sent or received through the Platform</LI>
            <LI>AI Agent conversation content</LI>
            <LI>Appointment and calendar records</LI>
            <LI>Consent, opt-out and Do-Not-Call records</LI>
            <LI>Property addresses, comparable sales data and underwriting inputs and outputs</LI>
            <LI>Enriched contact field data</LI>
            <LI>Contact data lookup results, including names, telephone numbers and email addresses</LI>
            <LI>Do-Not-Call registry status, litigator flags and phone type classifications</LI>
            <LI>AI-generated scores, evaluations, summaries, reports and recommendations</LI>
          </UL>
          <BQ>We do not control what our customers put into the Platform, and we do not independently verify that they have a lawful basis, notice or consent for it. That responsibility is theirs.</BQ>
          <Divider />

          {/* Section 4 */}
          <H2 id="s4">4. Information We Collect</H2>
          <H3>4.1 Account and Identity Information</H3>
          <P>Email address; full name; telephone number; profile picture; access role; agent type; and active status. Passwords are stored only as cryptographic hashes and are never visible to us.</P>
          <H3>4.2 Company Information</H3>
          <P>Company name, company logo, and the account identifier used to route incoming data to the correct organization.</P>
          <H3>4.3 Billing and Payment Information</H3>
          <P>Payment processor customer identifier; card brand, last four digits and expiry (held by our payment processor, not by us); payment identifiers; wallet balance; and transaction history. <B>We never receive, see or store full payment card numbers, security codes, or bank account credentials.</B></P>
          <H3>4.4 Usage and Consumption Logs</H3>
          <P>Feature name, record identifier and type, input and output token counts, computed cost, model used, call and message volume, and timestamps.</P>
          <H3>4.5 CRM Data</H3>
          <P>Contact and lead records, custom fields, pipeline and opportunity data, tags, communication history across calls, texts and email, appointment records, form submissions, and consent and opt-out records.</P>
          <H3>4.6 Communications Content</H3>
          <P><B>Call recordings and transcripts.</B> Audio recordings of calls made or received through the Platform, and transcripts of those calls.</P>
          <P><B>Text messages.</B> The full content of SMS and MMS messages sent and received, including messages composed by the AI Agent.</P>
          <P><B>Email.</B> The content of email sent and received through the Platform.</P>
          <H3>4.7 AI Dashboard Data</H3>
          <P>The AI Dashboard has read access across a customer's account. We collect the question, the records retrieved to answer it, the generated response, and associated token usage.</P>
          <H3>4.8 AI Agent Data</H3>
          <P>For each conversation: the telephone number involved; conversation direction; the <B>full content of every call and message</B>; recordings and transcripts; duration and turn count; qualification questions asked and answers given; the qualification outcome; any appointment booked; and opt-out requests and how they were handled.</P>
          <H3>4.9 Feature-Specific Data</H3>
          <P><B>Sales Coach and Training Coach.</B> Contact name and telephone number; agent telephone number; call direction, duration and result; full call transcript; a score from 0 to 100; and a structured evaluation containing category scores, penalties, bonuses and coaching actions. Training Coach additionally stores the identifier of the voice agent practiced against, and telephone numbers representatives register themselves.</P>
          <P><B>Deal Underwriter.</B> Property address; bedrooms, bathrooms, square footage and year built; AI-generated condition assessment; comparable property records; calculated ARV ranges, maximum offer ranges, repair cost estimates and projected profit; AI assessment; pursue/negotiate/pass recommendation; and risk flags.</P>
          <P><B>Note Taker.</B> Call direction; AI-generated summary; transcript summary; lead source; contact telephone number; and agent name.</P>
          <P><B>Skip Tracing.</B> For every lookup: contact identifier; flow type; whether a match was found; credits and cost; and the complete provider response. Parcel lookups store parcel identifier, county, address, city, state and ZIP. Do-Not-Call lookups store the telephone number, registry flags, <B>litigator flag</B>, and phone type. Contact data lookups store address, and <B>person records containing names, telephone numbers and email addresses of identified individuals.</B></P>
          <H3>4.10 Prospect and Website Visitor Information</H3>
          <P>When you visit our websites, submit a form, or contact us about our services, we collect what you provide — typically name, business name, email address, telephone number — together with how you found us and which pages you viewed.</P>
          <H3>4.11 Most Sensitive Categories</H3>
          <UL>
            <LI><B>Call recordings and transcripts</B> — verbatim records of conversations that may contain financial hardship, family circumstances, or health information.</LI>
            <LI><B>AI Agent conversations</B> — full transcripts of automated conversations, including anything a person volunteers to a system.</LI>
            <LI><B>Contact data lookup results</B> — names, telephone numbers and email addresses of property owners obtained without their knowledge.</LI>
            <LI><B>Do-Not-Call and litigator flags</B> — regulatory status of individual telephone numbers.</LI>
            <LI><B>Representative telephone numbers</B> — personal mobile numbers of our customers' employees.</LI>
          </UL>
          <Divider />

          {/* Section 5 */}
          <H2 id="s5">5. Where the Information Comes From</H2>
          <Table>
            <thead>
              <tr><TH>Source</TH><TH>What We Receive</TH></tr>
            </thead>
            <tbody>
              <tr><TD>Directly from you</TD><TD>Registration details, profile information, support messages, self-registered telephone numbers, website form submissions</TD></tr>
              <tr><TD>Your use of the Platform</TD><TD>Contacts, communications, appointments, pipeline and workflow data</TD></tr>
              <tr><TD>Leads and contacts</TD><TD>Form submissions, inbound calls and texts, survey responses, booking requests</TD></tr>
              <tr><TD>The AI Agent</TD><TD>Full conversation content from automated calls and messages</TD></tr>
              <tr><TD>Telephony and messaging providers</TD><TD>Call recordings, transcripts, delivery status, phone metadata</TD></tr>
              <tr><TD>Property data providers</TD><TD>Property characteristics, comparable sales, photographs</TD></tr>
              <tr><TD>Contact data lookup providers</TD><TD>Names, telephone numbers, email addresses, parcel records, Do-Not-Call status</TD></tr>
              <tr><TD>Third-party sign-in services</TD><TD>Email address and name, one time, if you choose to use them</TD></tr>
              <tr><TD>Automatically</TD><TD>Usage logs, token consumption, authentication events, cookies</TD></tr>
            </tbody>
          </Table>
          <Divider />

          {/* Section 6 */}
          <H2 id="s6">6. How We Use Information</H2>
          <H3>6.1 As a Controller</H3>
          <P>We use account, billing and usage information to create and administer accounts; authenticate users; process payments and wallet transactions; maintain a billing audit trail; send transactional messages; provide support; monitor security; comply with legal obligations; and analyze aggregate usage to improve the Platform.</P>
          <H3>6.2 As a Processor</H3>
          <P>We use Customer Data only to deliver the features our customer has enabled — routing records, transmitting content for AI processing, placing and receiving calls and messages, performing lookups, storing and displaying results, generating reports, and calculating usage cost.</P>
          <H3>6.3 We Do Not Use Customer Data for Our Own Purposes</H3>
          <P><B>We do not use Customer Data for our own purposes.</B> We do not use it to build or improve our own products, to market to the individuals it describes, or to create datasets independent of the customer relationship. We may generate aggregated and de-identified usage statistics that cannot reasonably identify any individual.</P>
          <H3>6.4 Marketing Our Own Services</H3>
          <P>We market our own services to businesses. We send marketing email only where you gave us your address for that purpose or have an existing business relationship with us. We send marketing text messages only where you have given prior express written consent. <B>We do not market to individuals inside a customer's account.</B></P>
          <H3>6.5 Text Messaging From Us — SMS Terms and Opt-In Policy</H3>
          <P>This subsection describes the text messaging programs <B>we</B> operate — not messages sent by our customers through the Platform.</P>
          <Table>
            <thead>
              <tr><TH>Program</TH><TH>Type</TH></tr>
            </thead>
            <tbody>
              <tr><TD>Account and service notifications — login verification, security alerts, billing notices</TD><TD>Transactional</TD></tr>
              <tr><TD>Support conversations — replies to enquiries you send us</TD><TD>Conversational</TD></tr>
              <tr><TD>Appointment reminders — confirmations and reminders for calls you book with us</TD><TD>Transactional</TD></tr>
              <tr><TD>Product and marketing updates</TD><TD>Marketing</TD></tr>
            </tbody>
          </Table>
          <P>We obtain consent when you submit a form on our website and tick an unticked box agreeing to receive text messages; book a call; text us first; give consent verbally on a recorded call; or create an account (for transactional messages).</P>
          <P>We collect <B>marketing and non-marketing consent separately</B>, using two unticked checkboxes. <B>Consenting to one does not consent to the other.</B></P>
          <P><B>Opting out.</B> Reply <B>STOP</B> to any message. We also honour END, QUIT, CANCEL, UNSUBSCRIBE and OPTOUT. You will receive one confirmation message, after which we send no further messages for that program.</P>
          <P><B>Help.</B> Reply HELP to any message, or text HELP to (786) 822-8188, or email info@kpidriver.com.</P>
          <P><B>Frequency.</B> Account, security and appointment messages are sent as needed. Marketing messages are sent no more than four times per month. <B>Message and data rates may apply.</B></P>
          <P><B>No mobile information is sold or shared with third parties or affiliates for marketing or promotional purposes.</B></P>
          <Divider />

          {/* Section 7 */}
          <H2 id="s7">7. Artificial Intelligence</H2>
          <H3>7.1 How AI Is Used</H3>
          <P>Generative AI processing is performed by third-party large language model providers under commercial agreements. <B>We do not build or train our own models.</B> Content transmitted for AI processing includes: call transcripts, AI Agent conversation content, records retrieved by the AI Dashboard, property addresses and characteristics, and contact field data. Skip Tracing does not use AI — it performs a direct database lookup.</P>
          <H3>7.2 Your Data Is Not Used to Train AI Models</H3>
          <P><B>We do not use Customer Data to train, fine-tune or develop artificial intelligence models.</B> Our large language model providers are contractually prohibited from doing so.</P>
          <P><B>One exception applies to the AI Agent.</B> The provider delivering that feature reserves broader rights over conversation content under its own terms. This applies only to AI Agent conversation content — not to any other data on the Platform.</P>
          <H3>7.3 Human Review</H3>
          <P><B>By us.</B> We do not routinely read recordings, transcripts, AI Agent conversations, AI outputs or lookup results. Authorized personnel access Customer Data only to diagnose a fault, investigate a security incident or suspected abuse, or comply with a legal obligation. Such access is restricted by role and logged.</P>
          <H3>7.4 Accuracy and Limitations</H3>
          <P>AI outputs are <B>statistical estimates generated by a language model. They can be incomplete, inaccurate, or confidently wrong.</B></P>
          <UL>
            <LI><B>Dashboard answers may be wrong.</B> Verify any number before relying on it.</LI>
            <LI><B>AI Agent conversations may contain errors.</B> The Agent may misunderstand someone, state something inaccurate, or book an inappropriate appointment.</LI>
            <LI><B>Call scores</B> reflect a rubric applied to a text transcript. They cannot capture tone, context or relationship history.</LI>
            <LI><B>Underwriting output is not an appraisal.</B> After-repair values and offer figures are automated estimates. They must not be represented to anyone as an appraisal, broker price opinion or professional valuation.</LI>
            <LI><B>Nothing produced by the Platform is legal, financial, tax, investment, real estate, employment or professional advice.</B></LI>
          </UL>
          <H3>7.5 Automated Evaluation of Individuals</H3>
          <P><B>Scoring of representatives.</B> The Sales Coach and Training Coach features assign numerical scores to identifiable employees. If a customer uses these scores to make or support employment decisions, that may trigger obligations under the Colorado AI Act, California's automated decision-making technology regulations, NYC Local Law 144 and comparable statutes.</P>
          <P><B>We have not performed a bias audit of our scoring rubrics, and we do not represent that scores are free from bias or suitable as the basis for any employment decision.</B></P>
          <Divider />

          {/* Section 8 */}
          <H2 id="s8">8. Automated Calling and Messaging</H2>
          <H3>8.1 What the AI Agent Does</H3>
          <P>The AI Agent converses with people by telephone using an artificial voice, and by text message. Outside a customer's configured business hours, it answers inbound calls only and does not place outbound calls. It replies to inbound text messages and may follow up with a lead during business hours where no human has responded.</P>
          <H3>8.2 If You Received a Call or Text from an AI Agent</H3>
          <P><B>The business that contacted you decided to contact you and supplied your telephone number.</B> KPI DRIVER provides the software. That business is responsible for having the legal right to contact you.</P>
          <P><B>To stop being contacted:</B> reply STOP to any text message, or tell the AI Agent during a call that you do not want to be contacted. Either is recorded as an opt-out and honored.</P>
          <P><B>If contact continues after you opted out</B>, or if you believe you were contacted unlawfully, email <B>info@kpidriver.com</B>. We will forward your request to the business and assist in resolving it.</P>
          <P><B>You are entitled to know you are speaking with an AI.</B> Our terms require customers to configure the Agent to disclose that it is an artificial intelligence system, and prohibit configuring it to claim to be human or to deny being an AI if asked.</P>
          <H3>8.3 Consent</H3>
          <P>Under a February 2024 FCC declaratory ruling, an AI-generated voice is an "artificial voice" under the Telephone Consumer Protection Act. Where the AI Agent initiates outbound contact, <B>our customer is solely responsible for having and documenting the required consent.</B> We do not obtain consent and cannot verify that our customer has it.</P>
          <Divider />

          {/* Section 9 */}
          <H2 id="s9">9. Call Recording</H2>
          <P><B>Calls made and received through the Platform are recorded and transcribed, including calls answered by the AI Agent. Recording law applies regardless of who placed the call.</B> Florida is an all-party consent state under Fla. Stat. § 934.03.</P>
          <P><B>Our customer is solely responsible</B> for obtaining all legally required consents, for delivering any required notice at the start of a call, and for configuring the Platform's recording settings consistently with its obligations. KPI DRIVER does not obtain consent and does not verify that it was obtained.</P>
          <P>If you were on a recorded call and were not told, that is a matter between you and the business that recorded it. Contact them directly; we will assist them in responding to you as described in Section 16.6.</P>
          <Divider />

          {/* Section 10 */}
          <H2 id="s10">10. Skip Tracing and Contact Data Lookups</H2>
          <P>This feature returns personal information about individuals — including property owners — who have not interacted with our customer and are generally unaware a lookup has occurred. It is the most sensitive processing on the Platform.</P>
          <P><B>What we do.</B> On our customer's instruction, we query a third-party contact data provider using an address, parcel identifier or telephone number, and return and store the results.</P>
          <P><B>What our customer must do.</B> Have a legitimate business purpose for each lookup; ensure it is permitted under applicable law; <B>not</B> use results for any FCRA-covered purpose; comply with all telemarketing law before contacting any number returned; and not use results for stalking, harassment or any unlawful purpose.</P>
          <P><B>Do-Not-Call and litigator flags</B> are informational signals from a third-party database. <B>We do not warrant their accuracy, currency or completeness, and they are not a substitute for a customer's own scrubbing.</B></P>
          <P><B>Accuracy.</B> This data is compiled from public and commercial sources and is frequently outdated or wrong. It may associate a telephone number or address with the wrong person.</P>
          <Divider />

          {/* Section 11 */}
          <H2 id="s11">11. Who We Share Information With</H2>
          <H3>11.1 Service Providers and Sub-Processors</H3>
          <P>We use third-party vendors to operate the Platform. Each is engaged under a written agreement requiring it to process information only to provide its service to us.</P>
          <Table>
            <thead>
              <tr><TH>Category</TH><TH>What They Receive</TH></tr>
            </thead>
            <tbody>
              <tr><TD>CRM and communications platform infrastructure</TD><TD>Contact records, communications, appointments, recordings, transcripts, message content</TD></tr>
              <tr><TD>Cloud hosting, database, storage and authentication</TD><TD>Application records, account data, uploaded files</TD></tr>
              <tr><TD>Artificial intelligence model providers</TD><TD>Transcripts, conversation content, records retrieved for analysis, property and field data</TD></tr>
              <tr><TD>Conversational AI providers</TD><TD>AI Agent voice and message conversation content, telephone numbers, recordings, transcripts</TD></tr>
              <tr><TD>Telephony and messaging carriers</TD><TD>Telephone numbers, call audio, message content, delivery and routing data</TD></tr>
              <tr><TD>Payment processing</TD><TD>Billing contact details and payment card data (held by the processor, not by us)</TD></tr>
              <tr><TD>Property data providers</TD><TD>Property addresses</TD></tr>
              <tr><TD>Contact data and Do-Not-Call lookup providers</TD><TD>Telephone numbers, addresses, parcel identifiers</TD></tr>
              <tr><TD>Transactional email delivery</TD><TD>Recipient email addresses</TD></tr>
            </tbody>
          </Table>
          <P>Business customers may request our current sub-processor list by emailing <B>info@kpidriver.com</B>.</P>
          <H3>11.2 AI Agent — Different Terms Apply</H3>
          <P>The AI Agent is delivered through a third-party conversational AI provider. <B>Unlike our other service providers, that provider's terms reserve broader rights to use content processed through its service, including for its own research, analytics and product development.</B></P>
          <P>This applies <B>only to AI Agent conversation content</B> — the calls and messages the Agent handles. It does not apply to any other data on the Platform. Customers who require that all conversation content be processed solely on a service-provider basis should not enable the AI Agent.</P>
          <H3>11.3 At Your Direction</H3>
          <P>Where you configure an integration, export data, or instruct us to transmit information, we do so.</P>
          <H3>11.4 For Legal Reasons</H3>
          <P>We may disclose information where we reasonably believe it is required to comply with law, legal process or a governmental request; to enforce our agreements; to investigate suspected fraud or security incidents; or to protect the rights, property or safety of any person.</P>
          <H3>11.5 Business Transfers</H3>
          <P>If we are involved in a merger, acquisition or sale of assets, information may be transferred as part of that transaction, subject to the acquirer's continued obligation to honor this policy.</P>
          <Divider />

          {/* Section 12 */}
          <H2 id="s12">12. We Do Not Sell Your Information</H2>
          <P><B>Our position:</B></P>
          <UL>
            <LI>We do <B>not</B> sell or share personal information for monetary payment, or for targeted advertising across sites.</LI>
            <LI>We do <B>not</B> share personal information for cross-context behavioral advertising or targeted advertising.</LI>
            <LI>We do <B>not</B> disclose Customer Data to advertisers, marketing networks or data brokers.</LI>
            <LI>Our disclosures to service providers are made under contracts that restrict them from retaining or using information for any other purpose, which excludes those disclosures from the statutory definition of "sale."</LI>
          </UL>
          <P><B>Contact data lookups.</B> We provide lookup results to our customers in a service-provider capacity, on their instruction. We do not compile, retain or monetize this data independently of the customer relationship.</P>
          <Divider />

          {/* Section 13 */}
          <H2 id="s13">13. How Long We Keep Information</H2>
          <H3>13.1 How Long We Keep Customer Data</H3>
          <P><B>We do not apply automatic expiry to Customer Data.</B> We retain it for as long as your account exists — including while it is paused or inactive — so you can stop using the Platform and resume later without losing your history.</P>
          <Table>
            <thead>
              <tr><TH>Category</TH><TH>Retention</TH></tr>
            </thead>
            <tbody>
              <tr><TD><B>Customer Data generally</B> — contacts, communications, transcripts, AI Agent conversations, deals, underwriting reports, enrichment and lookup records</TD><TD>For as long as your account exists and until deleted on request</TD></tr>
              <tr><TD><B>Storage-intensive AI Suite data</B> — derived media and generated files</TD><TD>For as long as your account is active. May be deleted when paused unless paid retention arranged</TD></tr>
              <tr><TD><B>Consent, opt-out and Do-Not-Call records</B></TD><TD><B>Retained indefinitely, including after account deletion</B></TD></tr>
              <tr><TD>Wallet and payment transaction records</TD><TD>7 years</TD></tr>
              <tr><TD>Prospect and marketing records</TD><TD>24 months from last interaction, or until you opt out</TD></tr>
              <tr><TD>Usage, cost and security logs</TD><TD>24 months</TD></tr>
              <tr><TD>Encrypted backups</TD><TD>Overwritten on a rolling 35-day cycle</TD></tr>
            </tbody>
          </Table>
          <H3>13.2 Deletion on Request</H3>
          <P><B>You may request deletion at any time.</B> On request we delete the company record and all associated Customer Data within <B>30 days</B>. Consent, opt-out and Do-Not-Call records are excepted.</P>
          <H3>13.3 Paused and Inactive Accounts</H3>
          <P>If you pause your subscription, core records are preserved. <B>Storage-intensive data in the AI Suite may be deleted unless you arrange paid retention. Deletion is permanent — export anything you may need before pausing.</B> This matters most for call recordings, which may be your only evidence that a person consented to be recorded.</P>
          <H3>13.4 Termination</H3>
          <P>On termination you have <B>30 days</B> to export. After that we retain your data in an inactive state until you request deletion.</P>
          <H3>13.5 Records We Keep Regardless</H3>
          <P><B>Consent, opt-out and Do-Not-Call records are retained indefinitely</B>, including after everything else is deleted. Financial transaction records are retained for seven years.</P>
          <H3>13.6 Backups</H3>
          <P>Information may persist in encrypted backups after deletion from live systems, and is removed when those backups are overwritten. We do not restore deleted data except in a disaster recovery event.</P>
          <Divider />

          {/* Section 14 */}
          <H2 id="s14">14. Security</H2>
          <P>We maintain administrative, technical and physical safeguards designed to protect information, including:</P>
          <UL>
            <LI><B>Encryption in transit</B> using TLS for all connections, and <B>encryption at rest</B> for stored data and files</LI>
            <LI><B>Role-based access control</B> with tiered permissions and logical isolation between customer organizations</LI>
            <LI><B>Managed authentication</B> through a specialist provider, with passwords stored only as hashes and never accessible to us</LI>
            <LI><B>Payment isolation</B> — card data is captured and stored by a PCI-DSS Level 1 compliant processor and never transits our systems</LI>
            <LI><B>Least-privilege internal access</B>, granted only where operationally required</LI>
            <LI><B>Audit logging</B> of authentication events, administrative access and feature usage</LI>
          </UL>
          <P><B>Certifications.</B> KPI DRIVER does not currently hold SOC 2, ISO 27001 or comparable independent certification. <B>No system is perfectly secure.</B> You are responsible for maintaining the confidentiality of your credentials and deactivating departing users promptly.</P>
          <Divider />

          {/* Section 15 */}
          <H2 id="s15">15. If There Is a Breach</H2>
          <P>If we determine that a security incident has resulted in unauthorized access to personal information, we will:</P>
          <UL>
            <LI><B>Notify affected customers without undue delay, and in any event within 72 hours</B>, by email to the account's designated contact;</LI>
            <LI>Provide the nature of the incident, the categories of data involved, the steps we have taken, and our recommended response;</LI>
            <LI>Cooperate with the customer's own notification obligations; and</LI>
            <LI>Notify individuals and the Florida Department of Legal Affairs directly where required under Fla. Stat. § 501.171.</LI>
          </UL>
          <P>Where we act as a processor, the <B>customer</B> determines whether notification to individuals or regulators is required and makes it. We provide the information they reasonably need.</P>
          <Divider />

          {/* Section 16 */}
          <H2 id="s16">16. Your Privacy Rights</H2>
          <H3>16.1 Rights</H3>
          <P>Depending on your state of residence, you may have the right to: know and access the categories and specific pieces of personal information we hold; correct inaccurate information; delete information; obtain a portable copy; opt out of sale, sharing, targeted advertising and certain profiling; limit use of sensitive personal information; appeal a refusal; and not be discriminated against for exercising these rights.</P>
          <P>These rights apply to residents of California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana, Delaware, Iowa, Nebraska, New Hampshire, New Jersey, Tennessee, Minnesota, Maryland, Indiana, Kentucky, Rhode Island and other states as their laws take effect.</P>
          <H3>16.2 How to Exercise Them</H3>
          <P>Email <B>info@kpidriver.com</B> with the subject line "Privacy Request," or write to us at the postal address in Section 2.</P>
          <H3>16.3 Verification</H3>
          <P>We take reasonable steps to verify your identity before acting. Information provided for verification is not used for any other purpose.</P>
          <H3>16.4 Timing</H3>
          <P>We respond within <B>45 days</B>, extendable once by a further 45 days where reasonably necessary.</P>
          <H3>16.5 Authorized Agents</H3>
          <P>You may use an authorized agent. We may require proof of authorization and may require you to verify your identity directly.</P>
          <H3>16.6 If Your Information Is in a Customer's Account</H3>
          <P><B>This is the most likely situation if you are a sales lead, a property owner, or someone an AI Agent spoke with.</B> In that case we hold your information as a service provider on behalf of a business, and that business — not KPI DRIVER — controls it.</P>
          <P>If you contact us, we will forward your request to the relevant customer. <B>If we cannot reach the customer within 30 days</B> — including where their account is paused, dormant or abandoned — <B>we will act on your request ourselves so far as we are able.</B></P>
          <P><B>Opt-out requests are different.</B> If you tell us you do not want to be contacted, we record and forward that immediately and suppress the contact ourselves without waiting for the customer to respond.</P>
          <H3>16.7 Notice at Collection</H3>
          <P>This policy serves as our notice at collection under California law. The categories of personal information we collect are in Section 4; the purposes are in Section 6; our position on sale and sharing is in Section 12; and retention periods are in Section 13. <B>We do not sell or share personal information.</B></P>
          <H3>16.8 Automated Decision-Making and Profiling</H3>
          <P>Two features produce automated evaluations of individuals: call scoring (of our customers' representatives) and lead qualification by the AI Agent. <B>If you are a customer's employee or lead, that customer controls the processing.</B> Direct any request to them. We assist as described in Section 16.6.</P>
          <H3>16.9 Appeals</H3>
          <P>If we decline your request, reply to our response with the word "Appeal." We respond within <B>45 days</B> with our decision and reasoning.</P>
          <Divider />

          {/* Section 17 */}
          <H2 id="s17">17. Florida Digital Bill of Rights</H2>
          <P>The Florida Digital Bill of Rights, Fla. Stat. § 501.701 et seq., imposes obligations on "controllers" exceeding <B>$1 billion in global gross annual revenue</B>.</P>
          <P><B>KPI DRIVER does not meet that threshold, and the FDBR's controller obligations therefore do not apply to us.</B></P>
          <P>We have nonetheless drafted this policy to meet the substantive standards of the stricter state privacy laws, and we honor the rights in Section 16 for all United States residents regardless of whether a statute compels it.</P>
          <Divider />

          {/* Section 18 */}
          <H2 id="s18">18. Cookies and Tracking</H2>
          <H3>18.1 What Cookies Are</H3>
          <P>Cookies are small text files placed on your device by a website. This section uses "cookies" to refer to all similar technologies including local storage, session storage and pixels.</P>
          <H3>18.2 What We Use</H3>
          <P><B>Strictly necessary cookies.</B> Required for the Platform to function. These maintain your authenticated session, keep you signed in, provide security, and handle load balancing. Cannot be switched off. Duration: session-only to 30 days.</P>
          <P><B>Functional cookies.</B> These remember your interface preferences and record your cookie consent choice. Duration: up to 12 months.</P>
          <P><B>Marketing website cookies.</B> Our public websites include an embedded appointment booking widget. These set cookies necessary for page delivery, form functionality and booking widget operation. Duration: session-only to 12 months.</P>
          <H3>18.3 What We Do Not Use</H3>
          <P><B>We do not use advertising cookies, retargeting pixels, or cross-site tracking technologies. We do not participate in advertising networks.</B></P>
          <H3>18.4 Managing Preferences</H3>
          <P>Most browsers let you block or delete cookies through their privacy settings. <B>Blocking strictly necessary cookies will prevent you from signing in.</B></P>
          <H3>18.5 Global Privacy Control</H3>
          <P>We honor the <B>Global Privacy Control (GPC)</B> signal. If your browser transmits GPC, we treat it as a valid request to opt out of any sale or sharing of personal information and of targeted advertising. Because we do not sell or share personal information or engage in targeted advertising, GPC does not change how we handle your data — but we recognize and record the signal.</P>
          <Divider />

          {/* Section 19 */}
          <H2 id="s19">19. Links to Other Websites</H2>
          <P>Our websites and the Platform contain links to third-party websites and services. <B>We are not responsible for the privacy practices, content or security of any third-party website or service</B>, and this policy does not apply to them. Review those policies before providing information.</P>
          <Divider />

          {/* Section 20 */}
          <H2 id="s20">20. Children</H2>
          <P>The Platform is a business tool and is not directed to children. We do not knowingly collect personal information from anyone under 18. If we learn that we have, we delete it. If you believe a child's information has reached us, contact us at <B>info@kpidriver.com</B>.</P>
          <Divider />

          {/* Section 21 */}
          <H2 id="s21">21. United States Only</H2>
          <P><B>The Platform is offered only to customers located in the United States, and is intended only for processing information about individuals located in the United States.</B> All data is stored and processed in the United States.</P>
          <P>We do not offer the Platform in the European Union, European Economic Area, United Kingdom or Switzerland. <B>Customers must not use the Platform to contact, record or process the personal data of individuals located outside the United States</B> without first contacting us.</P>
          <Divider />

          {/* Section 22 */}
          <H2 id="s22">22. Changes</H2>
          <P>We may update this policy. If a change materially affects how we handle personal information, we notify account administrators by email and post a notice in the Platform <B>at least 30 days before it takes effect</B>, except where a shorter period is required by law or necessary to address a security risk.</P>
          <P>Continued use after the effective date constitutes acceptance.</P>
          <Divider />

          {/* Section 23 */}
          <H2 id="s23">23. Contact Us</H2>
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
            <p style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>For privacy requests, use the subject line "Privacy Request."</p>
          </div>

          <div style={{ marginTop: 60, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 12, color: C.dim, textAlign: 'center' as const }}>
              © 2026 KPI DRIVER, LLC. All rights reserved. ·{' '}
              <Link href="/terms-and-conditions" style={{ color: C.blue, textDecoration: 'none' }}>Terms &amp; Conditions</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
