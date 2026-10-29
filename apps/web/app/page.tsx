"use client";

import { useMemo, useState } from "react";

type View = "arena" | "leaderboard" | "profile" | "sign-in";
type QuestionType = "A/B" | "Multi";
type Status = "Open" | "Soon" | "Resolved";

type Question = {
  id: string;
  title: string;
  category: string;
  deadline: string;
  status: Status;
  type: QuestionType;
  total: number;
  answers: { label: string; value: number; color?: "yes" | "no" }[];
  source: string;
  criteria: string;
};

const questions: Question[] = [
  {
    id: "weather",
    title: "Will it rain in Boston this weekend?",
    category: "Everyday",
    deadline: "Sat, Nov 1 · 8:00 AM PT",
    status: "Open",
    type: "A/B",
    total: 1240,
    answers: [
      { label: "Yes", value: 62, color: "yes" },
      { label: "No", value: 38, color: "no" },
    ],
    source: "National Weather Service forecast",
    criteria: "Rainfall of at least 0.01 inches in Boston on Saturday or Sunday.",
  },
  {
    id: "world-series",
    title: "Who will win the 2026 World Series?",
    category: "Sports",
    deadline: "Tue, Oct 27 · 5:00 PM PT",
    status: "Soon",
    type: "Multi",
    total: 4820,
    answers: [
      { label: "Los Angeles Dodgers", value: 44 },
      { label: "New York Yankees", value: 27 },
      { label: "Atlanta Braves", value: 16 },
      { label: "Other", value: 13 },
    ],
    source: "MLB official results",
    criteria: "The team that wins the 2026 World Series championship.",
  },
  {
    id: "gas",
    title: "Will California gas average above $6.00?",
    category: "Economy",
    deadline: "Mon, Dec 1 · 9:00 AM PT",
    status: "Open",
    type: "A/B",
    total: 860,
    answers: [
      { label: "Above $6.00", value: 31, color: "yes" },
      { label: "$6.00 or below", value: 69, color: "no" },
    ],
    source: "AAA Fuel Prices",
    criteria: "The statewide regular gasoline average published by AAA is above $6.00.",
  },
  {
    id: "panel",
    title: "How many people will attend the industry panel?",
    category: "Campus",
    deadline: "Mon, Nov 10 · 12:00 PM PT",
    status: "Resolved",
    type: "Multi",
    total: 2100,
    answers: [
      { label: "Under 50", value: 12 },
      { label: "50–100", value: 38 },
      { label: "101–150", value: 36 },
      { label: "Over 150", value: 14 },
    ],
    source: "Event check-in count",
    criteria: "The final check-in count recorded by the event organizer.",
  },
];

const leaderboard = [
  { rank: 1, username: "forecastfox", scored: 42, success: "78%" },
  { rank: 2, username: "northstar", scored: 39, success: "74%" },
  { rank: 3, username: "qiongwu", scored: 31, success: "71%" },
  { rank: 4, username: "signalhouse", scored: 28, success: "68%" },
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" className="icon">{children}</span>;
}

function Button({
  children,
  primary = false,
  onClick,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button className={`button ${primary ? "button-primary" : ""}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function QuestionCard({ question, onOpen }: { question: Question; onOpen: () => void }) {
  const firstAnswer = question.answers[0];
  return (
    <article className={`question-card ${question.status === "Resolved" ? "question-card-past" : ""}`}>
      <div className="card-meta">
        <span><Icon>◈</Icon> {question.category}</span>
        {question.status === "Soon" && <span className="hot">● Closing soon</span>}
        <span className="tag">{question.status}</span>
      </div>
      <button className="question-title" onClick={onOpen}>{question.title}</button>
      {question.type === "A/B" ? (
        <>
          <div className="answer-grid">
            {question.answers.map((answer) => (
              <button className={`answer ${answer.color}`} key={answer.label} onClick={onOpen}>
                <span>{answer.label}</span><strong>{answer.value}</strong>
              </button>
            ))}
          </div>
          <div className="split-bar"><span style={{ width: `${firstAnswer?.value ?? 0}%` }} /></div>
        </>
      ) : (
        <div className="pool-list">
          {question.answers.map((answer) => (
            <button className="pool-option" key={answer.label} onClick={onOpen}>
              <span className="pool-fill" style={{ width: `${answer.value}%` }} />
              <span>{answer.label}</span><strong>{answer.value}%</strong>
            </button>
          ))}
        </div>
      )}
      <div className="card-footer">
        <span>{question.deadline}</span><strong>{question.total.toLocaleString()} credits</strong>
      </div>
    </article>
  );
}

function AppShell({
  view,
  onNavigate,
  children,
}: {
  view: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate("arena")}><span className="brand-mark">↗</span> ForecastHub</button>
        <nav aria-label="Primary navigation" className="nav-links">
          <button className={view === "arena" ? "active" : ""} onClick={() => onNavigate("arena")}><Icon>⌂</Icon> Arena</button>
          <button className={view === "leaderboard" ? "active" : ""} onClick={() => onNavigate("leaderboard")}><Icon>♜</Icon> Leaderboard</button>
          <a href="/api/docs"><Icon>⌁</Icon> API docs</a>
        </nav>
        <div className="sidebar-bottom">
          <p>Credits are virtual and free.</p>
          <Button onClick={() => onNavigate("sign-in")}>Sign in</Button>
          <Button primary onClick={() => onNavigate("sign-in")}>Register</Button>
        </div>
      </aside>
      <div className="mobile-bar">
        <button className="brand" onClick={() => onNavigate("arena")}><span className="brand-mark">↗</span> ForecastHub</button>
        <button className="mobile-menu" aria-label="Open navigation" onClick={() => onNavigate("leaderboard")}>☰</button>
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}

function Arena({ onOpen }: { onOpen: (question: Question) => void }) {
  const [status, setStatus] = useState<"All" | Status>("All");
  const [category, setCategory] = useState("All topics");
  const filtered = questions.filter((question) => (status === "All" || question.status === status) && (category === "All topics" || question.category === category));

  return (
    <>
      <div className="breadcrumbs">ForecastHub <span>›</span> <b>Open</b></div>
      <div className="page-heading">
        <div><p className="eyebrow">The Arena</p><h1>Questions worth thinking about.</h1></div>
        <div className="status-filters" aria-label="Question status">
          {(["All", "Open", "Soon", "Resolved"] as const).map((value) => <button aria-pressed={status === value} key={value} onClick={() => setStatus(value)}>{value}</button>)}
        </div>
      </div>
      <div className="topic-tabs" aria-label="Question topics">
        {["All topics", "Sports", "Everyday", "Economy", "Campus"].map((value) => <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)}>{value}</button>)}
      </div>
      <div className="question-grid">
        {filtered.map((question) => <QuestionCard key={question.id} onOpen={() => onOpen(question)} question={question} />)}
      </div>
      {filtered.length === 0 && <div className="empty-state"><strong>No questions here yet.</strong><span>Try another topic or status.</span></div>}
      <p className="privacy-note">All times are Pacific Time. Credits are virtual only and cannot be bought, sold, or exchanged for money.</p>
    </>
  );
}

function Detail({ question, onBack, onSignIn }: { question: Question; onBack: () => void; onSignIn: () => void }) {
  const [amount, setAmount] = useState("100");
  const [selected, setSelected] = useState(question.answers[0]?.label ?? "");
  const [preview, setPreview] = useState(false);
  return (
    <>
      <button className="back-link" onClick={onBack}>← Back to Arena</button>
      <div className="detail-heading"><p className="eyebrow">{question.category} · {question.status}</p><h1>{question.title}</h1><p className="muted">{question.deadline} · {question.total.toLocaleString()} credits in this question</p></div>
      <div className="detail-grid">
        <section className="detail-main">
          <div className="panel crowd-panel"><div className="panel-heading"><h2>What the crowd thinks</h2><span className="live"><i /> Live</span></div>
            {question.type === "A/B" ? <div className="big-answers">{question.answers.map((answer) => <div className={`big-answer ${answer.color}`} key={answer.label}><span>{answer.label}</span><strong>{answer.value}%</strong></div>)}</div> : <div className="pool-list large">{question.answers.map((answer) => <div className="pool-option" key={answer.label}><span className="pool-fill" style={{ width: `${answer.value}%` }} /><span>{answer.label}</span><strong>{answer.value}%</strong></div>)}</div>}
            <div className="chart-placeholder" role="img" aria-label="Forecast history chart"><span className="chart-line" /><span className="chart-axis">7 days ago <b>Today</b></span></div>
          </div>
          <div className="panel"><h2>About this question</h2><dl className="facts"><div><dt>How it resolves</dt><dd>{question.criteria}</dd></div><div><dt>Trusted source</dt><dd>{question.source}</dd></div><div><dt>Deadline</dt><dd>{question.deadline} (Pacific Time)</dd></div></dl></div>
        </section>
        <aside className="panel prediction-panel">
          <h2>Make a prediction</h2>
          <p className="balance">Sign in to see your balance. New accounts start with 1,000 free credits.</p>
          <fieldset><legend>Choose an answer</legend>{question.answers.map((answer) => <label className={`choice ${selected === answer.label ? "selected" : ""}`} key={answer.label}><input checked={selected === answer.label} name="answer" onChange={() => setSelected(answer.label)} type="radio" /> <span>{answer.label}</span><b>{answer.value}%</b></label>)}</fieldset>
          <label className="field-label" htmlFor="amount">Credits to put on this answer</label>
          <div className="amount-input"><input id="amount" min="1" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} /><span>credits</span></div>
          <div className="quick-amounts">{["25", "100", "250"].map((value) => <button key={value} onClick={() => setAmount(value)}>{value}</button>)}</div>
          {preview && <div className="preview-box" role="status"><strong>Preview prepared</strong><span>{amount} credits on {selected}. The server will confirm the final charge and outcome.</span></div>}
          {question.status === "Resolved" ? <p className="closed">This question is closed.</p> : <Button primary onClick={() => { setPreview(true); onSignIn(); }}>Sign in to predict</Button>}
          <p className="fine-print">Predictions are timestamped and cannot be changed or withdrawn.</p>
        </aside>
      </div>
    </>
  );
}

function SignIn({ onBack }: { onBack: () => void }) {
  return <div className="auth-view"><button className="brand auth-brand" onClick={onBack}><span className="brand-mark">↗</span> ForecastHub</button><form className="auth-card" onSubmit={(event) => event.preventDefault()}><h1>Sign in</h1><p className="muted">Make predictions, track your credits, and climb the leaderboard.</p><label className="field-label" htmlFor="email">Email address</label><input className="text-input" id="email" type="email" /><label className="field-label" htmlFor="password">Password</label><input className="text-input" id="password" type="password" /><Button primary type="submit">Sign in</Button><p className="auth-foot">New to ForecastHub? <button type="button">Create an account</button></p><p className="prototype-warning">Use your own account. Prototype credentials are not used in production.</p></form></div>;
}

function Leaderboard() {
  return <><div className="breadcrumbs">ForecastHub <span>›</span> <b>Leaderboard</b></div><div className="page-heading"><div><p className="eyebrow">All time</p><h1>Forecast well. Learn publicly.</h1></div></div><div className="panel leaderboard-panel"><table><caption className="sr-only">ForecastHub leaderboard</caption><thead><tr><th>Rank</th><th>Username</th><th>Scored questions</th><th>Success rate</th></tr></thead><tbody>{leaderboard.map((row) => <tr key={row.username}><td>{row.rank}</td><td><strong>{row.username}</strong></td><td>{row.scored}</td><td>{row.success}</td></tr>)}</tbody></table></div></>;
}

export default function HomePage() {
  const [view, setView] = useState<View>("arena");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const openQuestion = (question: Question) => { setSelectedQuestion(question); setView("arena"); };
  const content = useMemo(() => {
    if (view === "sign-in") return <SignIn onBack={() => setView("arena")} />;
    if (view === "leaderboard") return <Leaderboard />;
    if (selectedQuestion) return <Detail onBack={() => setSelectedQuestion(null)} onSignIn={() => setView("sign-in")} question={selectedQuestion} />;
    return <Arena onOpen={openQuestion} />;
  }, [selectedQuestion, view]);
  if (view === "sign-in") return content;
  return <AppShell onNavigate={(next) => { setSelectedQuestion(null); setView(next); }} view={view}>{content}</AppShell>;
}
