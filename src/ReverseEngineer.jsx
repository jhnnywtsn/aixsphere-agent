import React, { useMemo, useState } from 'react';

const STOP_WORDS = new Set([
  'the',
  'and',
  'that',
  'with',
  'this',
  'from',
  'your',
  'have',
  'will',
  'should',
  'please',
  'about',
  'there',
  'their',
  'also',
  'into',
  'while',
  'where',
  'which',
  'when',
  'what',
  'how',
  'these',
  'those',
  'because',
  'could',
  'would',
  'must',
  'might',
  'they',
  'them',
  'then',
  'than',
  'been',
]);

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

const rankKeywords = (text) => {
  const counts = tokenize(text).reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));
};

const detectStructure = (text) => {
  const hasBullets = /(^|\n)\s*[-*]/m.test(text);
  const hasNumbers = /(^|\n)\s*\d+\./m.test(text);
  const hasCode = /```/.test(text) || /`[^`]+`/.test(text);
  const hasHeadings = /^#+\s/m.test(text);
  const hasCitations = /\[[^\]]+\]\([^\)]+\)/.test(text) || /\[[0-9]+\]/.test(text);

  const tone = (() => {
    const lower = text.toLowerCase();
    if (lower.includes('please') || lower.includes('thank')) return 'Polite, collaborative';
    if (lower.includes('must') || lower.includes('strictly')) return 'Directive, constraint-heavy';
    if (lower.includes('consider') || lower.includes('might')) return 'Exploratory, advisory';
    return 'Neutral assistant voice';
  })();

  return {
    hasBullets,
    hasNumbers,
    hasCode,
    hasHeadings,
    hasCitations,
    tone,
  };
};

const detectConstraints = (text) => {
  const lower = text.toLowerCase();
  const phrases = [
    'do not',
    'avoid',
    'without',
    'never',
    'must',
    'should',
    'exactly',
    'limit',
    'cite',
  ];

  return phrases
    .filter((phrase) => lower.includes(phrase))
    .map((phrase) => `Contains constraint hint: "${phrase}"`);
};

const buildPromptSkeleton = (structure, keywords) => {
  const topKeywords = keywords.slice(0, 3).map((entry) => entry.word).join(', ');
  const listHint = structure.hasNumbers ? 'Use a numbered list for steps.' : structure.hasBullets ? 'Use concise bullet points.' : 'Respond in a short paragraph.';
  const citationHint = structure.hasCitations ? 'Include citations or reference markers when applicable.' : 'No citations needed.';
  const codeHint = structure.hasCode ? 'Include code fences for any snippets.' : 'Plain text is fine.';

  return [
    'You are an analytical prompt engineer assisting with reconstruction of instructions.',
    `Focus on: ${topKeywords || 'the key ideas in the user message'}.`,
    listHint,
    citationHint,
    codeHint,
    'Keep tone: ' + structure.tone + '.',
  ].join(' ');
};

const InsightCard = ({ title, children }) => (
  <div style={styles.card}>
    <h3 style={styles.cardTitle}>{title}</h3>
    <div>{children}</div>
  </div>
);

const ReverseEngineer = () => {
  const [outputText, setOutputText] = useState('');

  const analysis = useMemo(() => {
    const keywordRanks = rankKeywords(outputText);
    const structure = detectStructure(outputText);
    const constraints = detectConstraints(outputText);
    const wordCount = tokenize(outputText).length;
    const lines = outputText.trim() ? outputText.trim().split(/\n+/).length : 0;
    const promptSkeleton = buildPromptSkeleton(structure, keywordRanks);

    return {
      keywordRanks,
      structure,
      constraints,
      wordCount,
      lines,
      promptSkeleton,
    };
  }, [outputText]);

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Prompt deconstruction</p>
          <h2 style={styles.heading}>Reverse engineer a model output</h2>
          <p style={styles.subheading}>
            Paste an AI response to infer the likely prompt structure, formatting constraints, and tone.
          </p>
        </div>
      </header>

      <textarea
        style={styles.textarea}
        value={outputText}
        onChange={(event) => setOutputText(event.target.value)}
        placeholder="Paste a model response to unpack its implied prompt..."
        rows={6}
      />

      <div style={styles.grid}>
        <InsightCard title="Signal map">
          <ul style={styles.list}>
            <li>Detected tone: <strong>{analysis.structure.tone}</strong></li>
            <li>Formatting: {analysis.structure.hasHeadings ? 'Headings, ' : ''}{analysis.structure.hasBullets ? 'bullets, ' : ''}{analysis.structure.hasNumbers ? 'numbered steps, ' : ''}{analysis.structure.hasCode ? 'code fences, ' : ''}{analysis.structure.hasCitations ? 'citations' : ''}</li>
            <li>Length: ~{analysis.wordCount} key words across {analysis.lines || 1} block(s)</li>
          </ul>
        </InsightCard>

        <InsightCard title="Likely constraints">
          {analysis.constraints.length > 0 ? (
            <ul style={styles.list}>
              {analysis.constraints.map((constraint) => (
                <li key={constraint}>{constraint}</li>
              ))}
            </ul>
          ) : (
            <p style={styles.muted}>No explicit constraint phrases detected.</p>
          )}
        </InsightCard>

        <InsightCard title="Keyword anchors">
          {analysis.keywordRanks.length > 0 ? (
            <ul style={styles.pillList}>
              {analysis.keywordRanks.map((entry) => (
                <li key={entry.word} style={styles.pill}>
                  {entry.word} <span style={styles.pillCount}>×{entry.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.muted}>Add more text to extract recurring topics.</p>
          )}
        </InsightCard>

        <InsightCard title="Prompt skeleton">
          <p style={styles.promptBox}>{analysis.promptSkeleton}</p>
        </InsightCard>
      </div>
    </section>
  );
};

const styles = {
  panel: {
    background: '#0b1021',
    color: '#e5e7eb',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid #1f2937',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '12px',
    color: '#60a5fa',
    margin: 0,
  },
  heading: {
    margin: '6px 0',
    fontSize: '22px',
  },
  subheading: {
    margin: 0,
    color: '#9ca3af',
  },
  textarea: {
    width: '100%',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #374151',
    background: '#111827',
    color: '#f3f4f6',
    minHeight: '140px',
    resize: 'vertical',
    outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  card: {
    background: '#111827',
    borderRadius: '12px',
    padding: '12px',
    border: '1px solid #1f2937',
    minHeight: '130px',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    color: '#bfdbfe',
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    color: '#d1d5db',
  },
  pillList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  pill: {
    background: '#1f2937',
    borderRadius: '999px',
    padding: '6px 10px',
    color: '#e5e7eb',
    fontSize: '13px',
    border: '1px solid #374151',
  },
  pillCount: {
    color: '#9ca3af',
  },
  muted: {
    color: '#6b7280',
    margin: 0,
  },
  promptBox: {
    background: '#0f172a',
    border: '1px dashed #374151',
    borderRadius: '10px',
    padding: '12px',
    color: '#e5e7eb',
  },
};

export default ReverseEngineer;
